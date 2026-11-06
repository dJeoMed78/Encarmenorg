# ENC-RADAR-CLASIFICADOS-041 — Informe técnico de Coordinación 01

Fecha: 2026-11-05. Issue: https://github.com/dJeoMed78/Encarmenorg/issues/41
PR: https://github.com/dJeoMed78/Encarmenorg/pull/54
Rama: `work/enc-radar-clasificados-041-nia`
Base de `ia-desarrollo`: `9bd1eaba965f82805fa8ba8f74bc6d04b1f7f9e9`.

## Comprobaciones y evidencias

- Se cotejó el informe de Perplexity con los archivos completos de la rama: `server.ts`, `src/services/api.ts`, `src/components/AdminClassifiedsTab.tsx` y `src/db/mariadb.ts`. A diferencia de la auditoría parcial de Perplexity, se inspeccionaron las rutas de aprobación reales.
- Defectos confirmados: búsqueda POST bloqueada por el guard de Staging, envío `useAi:true` forzado desde cliente, errores HTTP ocultados, UI con confirmación antes de respuesta, backend que ignoraba `false` de `dbSaveClassified`, caché actualizada antes de SQL.
- Correcciones preparadas en esta rama: selección Sin IA, tratamiento de errores; confirmación administrativa y SQL con relectura antes de éxito; reporte parcial por lote; búsqueda read-only autenticada en Staging; retiro de UI optimista.
- Prueba estructural manual sobre código vivo: nueve comprobaciones de patrones/invariantes satisfactorias. NO son pruebas funcionales ni sustituyen E2E.
- Pruebas nuevas: `tests/enc-radar-classifieds-041.test.mjs`, con `node --test tests/enc-radar-classifieds-041.test.mjs`. Contienen pruebas aisladas de los helpers reales transpilados por TypeScript y guardas estáticas. **Su ejecución y resultado no deben darse por acreditados hasta observar un run real**.

## Riesgos y pendientes

1. Validar con pruebas HTTP reales el 403 de aprobaciones y el permiso de búsqueda, con sesión administrativa. **Sin carril de escritura autorizado.**
2. La deduplicación actualmente utiliza `classifiedsCache` y comparación de URL: no prueba unicidad SQL ante procesos concurrentes, URL con parámetros UTM o reinicios.
3. `dbLoadAllClassifieds` puede devolver lista vacía en error: el readback no garantiza diagnóstico de causa ni una transacción SQL atómica.
4. `classifieds_db.json` y la función periódica `pruneExpiredClassifieds` pueden divergir de MariaDB; confirmar política de persistencia antes de tocar historial.
5. El rastreo web usa páginas de terceros y un User-Agent de navegador; validar restricciones de fuentes, enlaces a anuncios individuales y exactitud de datos producidos por Gemini. No afirmar detecciones actuales sin evidencia.
6. Evaluar CORS y protecciones de carga desde un cambio de seguridad independiente; prohibido aplicar modificaciones globales sin revisión de alcance.
7. Revisar tests de regresión y build antes de marcar lista la PR. Los actuales workflows no necesariamente ejecutan la prueba nueva.
8. **No integrar a `ia-desarrollo`, no desplegar Staging ni cerrar Issue #41 hasta autorización y pruebas.** Producción `main` / `encarmen.org` inalterados.

Estado: IMPLEMENTACIÓN PARCIAL EN RAMA; PENDIENTE VALIDACIÓN FUNCIONAL Y AISLAMIENTO.
## Checkpoint de pruebas y revisión de seguridad — 2026-11-05

- El workflow nuevo `.github/workflows/enc-radar-classifieds-041-ci.yml` ejecuta `npm ci`, `npm run lint`, `node --test tests/enc-radar-classifieds-041.test.mjs` y `npm run build`. No ejecuta desplegados ni operaciones SQL.
- Run del commit `00600e0224bd1bf0ec20555ff2662d93202a31c7`: https://github.com/dJeoMed78/Encarmenorg/actions/runs/42124086531 — SUCCESS; **18/18 pruebas dirigidas PASS**, lint PASS y build PASS.
- Los tests incluyen helpers reales (ejecutados en VM aislada), respuestas HTTP de handlers Express con MariaDB simulada y comprobaciones de código del guard. **No son pruebas contra MariaDB ni HTTP de Hostinger.**
- Nuevas protecciones: solo URLs de anuncios individuales en portales conocidos, normalización de parámetros de seguimiento, y prohibición de aceptar URLs o información de precio/teléfono/descripción originados únicamente de texto Gemini sin fuente observada.
- **Bloqueo material para E2E de aprobación:** `src/db/mariadb.ts` implementa `isWritePermitted()` de forma que siempre retorna false en Staging; `dbSaveClassified` retorna false por `guardWrite`. El middleware HTTP también mantiene bloqueadas las aprobaciones de clasificados. No se debe eliminar ninguna de esas protecciones ni hacer pruebas SQL de escritura a ciegas.
- **Pendientes antes de publicar el flujo completo:** diseñar autorización de escritura de clasificados exclusivamente Staging con snapshot privado validado, identidad de DB efectiva y permisos SQL mínimos; prueba de aislamiento y respaldos completos; idempotencia/duplicados transaccionales de fuente; pruebas de escritura/readback/rollback y cierre seguro; verificar legalidad/operatividad de fuentes web reales.
- `main`, Staging y producción no se han modificado. PR #54 debe permanecer en borrador, no integrar ni desplegar todavía.


## ENC-STAGING-CLASSIFIED-REAL-SQL-041 — Autorización y preparación

**Autorización recibida:** propietario autorizó preparar y probar un carril de escritura de clasificados para demostrar persistencia real. NO autoriza tocar producción ni desactivar protecciones generales.

### Código implementado en rama aislada
- `src/db/stagingClassifiedStore.ts`: capacidad SQL propia de clasificados, verificación de snapshot privado de Staging, ventana corta, identidad SQL y base exacta, InnoDB/PRIMARY KEY, aislamiento `verifyStagingIsolation`, INSERT exclusivo, lectura dentro de transacción, COMMIT o ROLLBACK, cierre de conexión.
- `src/db/mariadb.ts`: proveedor del pool efectivo en Staging; **`isWritePermitted()` permanece sin cambios**, bloqueando las escrituras generales.
- `src/server/stagingBusinessSecurity.ts`: claves nuevas del carril como críticas para detectar duplicación de configuración privada.
- `server.ts`: las rutas `/api/classifieds/approve-candidate` y `/api/classifieds/batch-approve` solo pueden usar la excepción Staging con administración autenticada y `isStagingClassifiedWritePermitted()`. Las demás rutas no obtienen permiso de escritura.
- `scripts/enc-staging-classified-persistence-041.mjs`: prueba presencial para el servidor Staging con preflight, respaldo lógico privado de la tabla, registro sintético oculto, COMMIT, lectura independiente, eliminación exclusiva del registro de prueba y lectura final. Sin credenciales en código ni logs.

### Puerta privada necesaria
Se exige en el archivo privado validado por el servidor (`0600`) `APP_ENV=staging`, base exacta `u293982346_encarmentest`, usuario distinto al productivo, `STAGING_READ_ONLY=true`, `STAGING_DB_CONFIRMED=true`, `STAGING_CLASSIFIED_WRITES_ENABLED=true`, `STAGING_CLASSIFIED_BACKUP_ID` de al menos 12 caracteres, `STAGING_CLASSIFIED_BACKUP_CHECKED_AT` de menos de 30 minutos y `STAGING_CLASSIFIED_WRITE_EXPIRES_AT` próximo, máximo una hora. No colocar contraseñas ni evidencia con datos personales en GitHub.

**El identificador de respaldo es una declaración operativa, no demuestra por sí solo que se realizó el backup.** El operador debe comprobar externamente el respaldo completo de Staging y su restaurabilidad antes de activar esta ventana. La prueba genera además un snapshot lógico privado de `classifieds` antes de escribir, pero no sustituye un respaldo completo.

La prueba presencial exige `ENC_CLASSIFIED_PROBE_EXECUTE=CONFIRM_STAGING_041` y `ENC_STAGING_CLASSIFIED_BACKUP_DIR` privado `0700`, fuera de rutas públicas. El registro de prueba tiene `status=trash` (oculto), y únicamente su ID y `raw_data` pueden usarse para borrarlo. Si falla la limpieza, informar el ID sintético al operador; nunca borrar clasificados históricos.

### Evidencias obtenidas desde GitHub Actions
- https://github.com/dJeoMed78/Encarmenorg/actions/runs/42128363509 — PASS.
- 41 pruebas de radar y carril aislado con mocks PASS; 44 regresiones existentes de seguridad/aislamiento PASS; `npm ci`, TypeScript y compilación PASS.
- El probe real falla cerrado deliberadamente en CI sin autorización/configuración privada, según prueba del workflow.

### Evidencia NO obtenida
- No hay conexión desde esta sesión al servidor Hostinger ni a su MariaDB; el DNS de Staging no resuelve desde el entorno disponible y la consulta web al sitio no está accesible. No se ejecutó el probe contra MariaDB real ni se comprobó una copia de seguridad real.
- No hay SHA de despliegue de estos cambios, ni prueba HTTP con sesión real, ni captura de readback real en SQL. Por tanto **persistencia real NO DEMOSTRADA**.
- PR #54 abierta en borrador, no integrada, Staging y producción sin cambios por este trabajo.

### Siguiente paso seguro
Ejecutar preflight de aislamiento y respaldo en infraestructura Staging autorizada; activar temporalmente solo el carril de clasificados en configuración privada; publicar candidato Staging únicamente tras autorizar su SHA; ejecutar el probe real y E2E HTTP con sesión administrativa; verificar persistencia/reinicio/duplicados/cierre de ventana; presentar evidencias a Jeo para aceptación. No ejecutar SQL si cualquiera de los controles falla.


## Comprobación de persistencia SQL real en Hostinger — 2026-11-06 UTC

**Completado:** procedimiento de prueba presencial ejecutado en Hostinger con GitHub Actions por SSH desde rama de Nia, sin desplegar la PR. Run: https://github.com/dJeoMed78/Encarmenorg/actions/runs/42148261108; commit `17f7de4bf75d23eaf520f556e73ac4a4c3ace0dc`.

Comprobaciones reales confirmadas en logs (sin revelar credenciales ni datos):
- `ENC041_ISOLATION=STAGING_SQL_MARKER_GRANTS_SCHEMA_VERIFIED`
- `ENC041_FRESH_SQL_BACKUP=REUSED_VERIFIED_PRIVATE`; respaldo previamente creado, comprobado y guardado exclusivamente en Hostinger.
- `ENC041_BEFORE_INSERT=NO_SYNTHETIC_ROW`
- `ENC041_SQL_INSERT_COMMIT=SUCCESS`
- `ENC041_NEW_CONNECTION_READBACK=EXACT_MATCH`
- `ENC041_SYNTHETIC_ROW_CLEANUP=CONFIRMED`
- `ENC041_REAL_SQL_PERSISTENCE=PASS`.

Se confirmó que no quedaron registros sintéticos del procedimiento. Las tentativas anteriores fallidas abortaron y registraron limpieza; se corrigió la compatibilidad de valores SQL usando FROM_BASE64 y se validó mediante PREPARE de solo lectura.

**Alcance demostrado:** aislamiento, privilegios, backup y persistencia SQL real de inserción de un clasificado oculto en la tabla existente de Staging.

**AÚN NO demostrado:** despliegue del nuevo backend, funcionamiento del endpoint administrativo con sesión, paso por guardia temporal y aceptación de UI del propietario. Tampoco se ha activado `STAGING_CLASSIFIED_WRITES_ENABLED` en Staging. El marcador `STAGING_READ_ONLY` observado actualmente no coincide con el valor requerido por el carril, por lo cual su compuerta continúa cerrada.

**Decisión:** no afirmar que el Issue #41 se cerró. Mantener PR en borrador hasta completar validación de release Staging y HTTP real; no tocar producción.
