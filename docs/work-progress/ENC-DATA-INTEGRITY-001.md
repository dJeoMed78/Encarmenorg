# ENC-DATA-INTEGRITY-001 — pérdida, resurrección y sobrescritura de datos empresariales

Rama `work/enc-data-integrity-001`, base `ia-desarrollo` (`0d231cb`). Sin cambios en main, ia-desarrollo, Staging real, Hostinger ni bases reales; sin migraciones ni SQL ejecutado contra bases reales. No se tocó GAS ni el módulo de registro público.

## Defectos confirmados (lectura del código de ia-desarrollo y de main)

1. **Resurrección en el arranque** (`server.ts`, bloque "1. Businesses"): `businessesCache` se carga primero desde `businesses_seed.json`; si MariaDB tiene filas, las empresas de la semilla ausentes en la base ("missingInDb") se reinsertan con `dbSaveBusiness` en cada arranque. Una empresa eliminada vuelve a aparecer.
2. **Fallo SQL = tabla vacía**: `dbLoadAllBusinesses` captura el error y devuelve `[]`; el arranque lo interpreta como "base vacía" (rama que no se pudo leer completa) y el sondeo de 20 s puede hacer lo mismo.
3. **Sobrescritura de contactos**: `dbSaveBusiness` hace `phone = VALUES(phone)` y `whatsapp = VALUES(whatsapp)` en el upsert, así que una semilla o una edición incompleta con contactos vacíos borra los guardados. Además `dbLoadAllBusinesses` daba prioridad a `raw_data` sobre las columnas (`extra.phone || r.phone`): un JSON antiguo pisa una corrección directa en la columna.
4. **Firma de caché débil**: `MAX(updated_at)` + `COUNT(*)` no detecta una baja y un alta (o dos ediciones) con el mismo conteo y el mismo segundo.
5. `dbSaveBusiness` devuelve `false` ante error; quien ignore el booleano presenta un guardado inexistente como exitoso.

## Qué contiene esta rama

- `scripts/apply-data-integrity-patch.mjs`: parche exacto, idempotente y verificable para `src/db/mariadb.ts` (8 pasos) y `server.ts` (1 paso). Cada ancla debe aparecer exactamente una vez; si falla algún archivo no se escribe ninguno. Revertir los reemplazos devuelve el original byte a byte (probado).
  - `dbLoadAllBusinesses(strict = false)`: en modo estricto un fallo SQL o la ausencia de conexión lanza `BUSINESSES_SOURCE_UNAVAILABLE` (el modo normal conserva su contrato).
  - Contactos al leer: la columna manda; `raw_data` solo completa filas heredadas con la columna vacía.
  - `dbSaveBusiness(biz, { clearContacts })`: un teléfono/WhatsApp vacío nunca borra el dato guardado (`IF(?, '', COALESCE(NULLIF(TRIM(VALUES(col)), ''), col))`); el retiro es explícito.
  - `dbSaveBusinessChecked`: guarda y confirma con una lectura SQL posterior; cualquier fallo lanza `BusinessSaveError` (nunca éxito falso).
  - `dbGetBusinessesSignature`: añade `SUM(CRC32(CONCAT(id,'|',updated_at)))` y lo agrega a `lastUpdate` (el tipo `{lastUpdate,total}` no cambia, el sondeo sigue funcionando).
  - Arranque: lectura estricta; si falla, no se escribe ni se siembra nada y se registra un error; con la base legible la semilla ausente NO se reinserta (solo se avisa); con la tabla vacía tampoco se siembra (`seedInitRequestedAtBoot = false`).
- `scripts/catalog-seed-init.mjs`: única ruta de inicialización desde la semilla. Manual (no la importa ningún módulo), dry-run por defecto, `--apply` exige la frase exacta `INSERTAR-SEMILLA:<base>:<modo>:<n>` generada por el plan, rechaza la base de producción, modo `empty` solo con la tabla vacía, modo `ids` solo los ids pedidos que no existan, INSERT simple en una transacción (nunca ON DUPLICATE), lectura de confirmación y fallo real si algo no coincide. Credenciales solo desde el entorno del operador.

## Cómo aplicar

    node scripts/apply-data-integrity-patch.mjs --mariadb src/db/mariadb.ts --server server.ts --check
    node scripts/apply-data-integrity-patch.mjs --mariadb src/db/mariadb.ts --server server.ts
    npx tsc --noEmit && npx vite build

Las anclas de `mariadb.ts` son el texto exacto de ia-desarrollo (SHA `f8cadbf4…`). Las de `server.ts` salen del bloque de arranque visible en `main`; ia-desarrollo tiene otro SHA de `server.ts`, así que `--check` puede abortar si el bloque difiere (no escribe nada). Si R3 (`work/enc-f008-r3-recuperacion`) se integra antes, sus cambios equivalentes en `mariadb.ts` harán que esos pasos reporten ancla no válida: omitir esos pasos.

## Pruebas (`tests/data-integrity.test.mjs`, 17)

Ejecutadas en Node 20 contra simuladores en memoria: aplican los parches a los fragmentos exactos y ejecutan el código resultante. Cubren control del defecto original, lectura estricta, contactos (columna primero, edición parcial, retiro explícito), `dbSaveBusinessChecked`, firma de caché, tres reinicios sin resurrección, reinicio con MariaDB caída y con tabla vacía, y la herramienta manual (dry-run, frase, producción, tabla no vacía, ids, rollback, lectura posterior). 11 mutaciones del código fueron detectadas. Complemento fuera del repositorio: la cláusula de contactos se verificó contra SQLite (dialecto distinto, `iif` en lugar de `IF`) en 16 combinaciones, todas iguales a la semántica esperada.

## Límites declarados

- No había MariaDB desechable: las pruebas no demuestran persistencia ni la sintaxis de MariaDB real. Ejecutar el parche y la suite en una instancia desechable antes de integrar.
- El arranque se probó sobre un fragmento reconstruido (la continuación del bloque y la rama "tabla vacía" no eran visibles; se sustituyeron por equivalentes). No se verificó el resto de `server.ts`.
- Sin verificar por no ser visible: el sondeo `refreshBusinessesFromDbIfNeeded` (debería usar `dbLoadAllBusinesses(true)` y conservar la caché si falla), y las rutas de alta, edición y baja (deberían usar `dbSaveBusinessChecked`, actualizar `businessesCache` y poner `cachedDbSignature = null`, y conservar la caché si el SQL falla). Con la tabla vacía la caché queda con la semilla en memoria.
- No se ejecutaron `tsc` ni `vite build`.
