# ENC-RADAR-EMPRESAS-043 — Documentación Técnica de Corrección

**Tarea:** ENC-RADAR-EMPRESAS-043  
**Issue:** https://github.com/dJeoMed78/Encarmenorg/issues/43  
**PR:** #55 (https://github.com/dJeoMed78/Encarmenorg/pull/55)  
**Rama:** `work/enc-radar-empresas-043-gas`  
**Rama Base:** `ia-desarrollo`  
**Ejecutor:** Google AI Studio (GAS)  
**Auditoría y Revisión:** Coordinación Principal 01 (Nia)  
**Estado:** CORRECCIONES TÉCNICAS AUDITADAS COMPLETADAS

---

## 1. Diagnóstico y Causas Raíz

Tras la auditoría directa realizada por Coordinación Principal 01 (Nia) sobre la PR #55, se identificaron y subsanaron cinco defectos críticos:

1. **A. Persistencia Múltiple Incompleta (BLOQUEANTE):**
   - En `server.ts` (líneas 7638–7643), la aprobación por lotes fuera de Staging agregaba candidatos a `confirmed` inmediatamente después de que `dbSaveBusiness()` retornara éxito, sin verificar la lectura posterior desde MariaDB.
   - En casos de replicación asíncrona, lecturas no comprometidas o fallos de flush, un registro guardado podía no ser recuperable o presentar discrepancias críticas en contactos y nombre, contaminando el estado del sistema.

2. **B. Generación Concurrente de Identificadores Vulnerable:**
   - El cálculo anterior `max(businessesCache) + 1` dependía únicamente de la memoria volátil del proceso, exponiendo al sistema a colisiones de clave primaria bajo solicitudes simultáneas o ante registros creados directamente en MariaDB fuera del caché.

3. **C. Procedencia Engañosa de Candidatos Web:**
   - En `auto-search-ai`, los resultados generados por modelos sin grounding web activo o con URLs vacías eran catalogados optimistamente como `isLiveWebDiscovery: true` y `provenance: ai_grounding`.

4. **D. Información Comercial Inventada:**
   - `generateAutonomousAdCopy` y los controladores asignaban por defecto horarios ("Lunes a Sábado"), formas de pago ("Efectivo y Transferencia") y servicios de entrega ("Servicio a Domicilio en toda la isla", `hasDelivery: true`) no proporcionados ni verificados por la fuente real.

5. **E. Compatibilidad con PR #54:**
   - La PR #54 añade el radar de clasificados en `server.ts` y `src/services/api.ts`. Se requería garantizar que los controles de persistencia y compuertas de seguridad de empresas (`writesReady`) no causaran regresiones en clasificados ni conflictos en Staging.

---

## 2. Correcciones Implementadas

### A. Persistencia Múltiple con Verificación Posterior Obligatoria (Item A)
- **Lectura real tras guardado:** Tanto en aprobación individual como por lotes (`approve-candidate` y `approve-multiple-candidates`), fuera de Staging se ejecuta obligatoriamente `dbLoadAllBusinesses(true)` tras `dbSaveBusiness(newBiz)`.
- **Verificación de concordancia estricta:** Se comprueba que el registro exista con el ID asignado (`String(b.id) === String(newBiz.id)`), que el nombre coincida y que los dígitos telefónicos/WhatsApp (`contactDigits`) correspondan fielmente a los guardados.
- **Partición transparente:** Si `dbSaveBusiness` falla o si la lectura posterior no confirma la existencia del registro o discrepa en datos críticos, el candidato se incorpora a `rejected` con el motivo:
  `"Fallo de verificación de lectura en MariaDB. No se confirmó la persistencia íntegra."`
- **Garantía de no contaminación:** Si la verificación falla, el candidato **NUNCA** se agrega a `confirmed` ni se actualiza en `businessesCache` ni en `businesses_seed.json`.

### B. Generación Segura y Atómica de Identificadores (Item B)
- **Mutex de serialización en memoria (`acquireApprovalMutex`):** Todas las solicitudes de aprobación (individual y lote) se serializan a través de un mutex FIFO asíncrono para impedir condiciones de carrera e interrupciones en la reserva de IDs.
- **Generador de ID consultando MariaDB (`getNextBusinessId`):** Consulta el valor máximo directamente en MariaDB con:
  `SELECT MAX(CAST(id AS UNSIGNED)) AS max_id FROM businesses WHERE id REGEXP ^[0-9]+$`
  e integra los identificadores en memoria y el conjunto `allocatedIds` reservado dentro del mismo lote.
- **Prevención de colisiones intra-lote:** `batchNames` y `batchPhones` rechazan inmediatamente cualquier repetición dentro de un mismo lote.

### C. Procedencia Verificable y Revisión Humana (Item C)
- **Validación de URL:** En `auto-search-ai`, se verifica formalmente la URL devuelta mediante:
  `const isVerifiableUrl = /^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(rawSourceUrl);`
- **Catalogación honesta:**
  - Si la URL es comprobable: `isLiveWebDiscovery: true`, `provenance: web_search_ai`.
  - Si no existe URL comprobable: `isLiveWebDiscovery: false`, `provenance: ai_unverified`, `requiresAdminVerification: true`.
- **UI en `AdminAutoBusinessesModal.tsx`:** Muestra una insignia explícita de advertencia:
  `"IA sin verificar (Requiere revisión manual)"` destacando la necesidad de validación humana antes de su publicación.

### D. Eliminación de Datos Comerciales Ficticios (Item D)
- **Valores neutrales:** Si la fuente no proporciona horario, método de pago o entrega, se asigna rigurosamente el texto neutral `"Consultar con el negocio"`.
- **Delivery honesto:** `hasDelivery` se establece en `false` por defecto (`Boolean(candidate.hasDelivery === true)`).
- **Descripción sin publicidad engañosa:** `generateAutonomousAdCopy` se reescribió para redactar únicamente datos comprobables y ubicación, eliminando afirmaciones inventadas sobre métodos de pago o envíos en toda la isla.

### E. Compatibilidad con PR #54 y Restricciones de Staging (Item E)
- **Compuertas de seguridad:** Las verificaciones de `writesReady` en `server.ts` no interfieren con las rutas de clasificados de PR #54.
- **Staging Business Store:** En Staging se continúa utilizando `stagingBusinessStore.create()` con bloqueo consultivo `GET_LOCK(encarmen:staging:business-create, 5)`, transacción InnoDB aislada y comprobación de `verifyStagingIsolation`.

---

## 3. Matriz de Pruebas (14 Escenarios Obligatorios)

Archivo: `tests/radar-business-approval.test.mjs`  
Comando ejecutado: `node --import tsx --test tests/radar-business-approval.test.mjs`

| # | Escenario Obligatorio | Tipo | Resultado | Verificación Técnica Realizada |
|---|----------------------|------|-----------|--------------------------------|
| 1 | Aprobación individual exitosa | Handler HTTP | **PASS** | 200 OK, ID generado por `getNextBusinessId`, persistencia guardada y verificada en lectura, caché actualizado |
| 2 | Aprobación múltiple exitosa | Handler HTTP | **PASS** | 200 OK, 3 candidatos persistidos con IDs secuenciales únicos, `count: 3`, 0 rechazados |
| 3 | MariaDB no disponible | Handler HTTP | **PASS** | 503 Service Unavailable, mensaje informativo, caché estrictamente intacto |
| 4 | Error durante el guardado | Handler HTTP | **PASS** | 503 Service Unavailable ante aborto de base de datos, caché en memoria intacto |
| 5 | Guardado exitoso con lectura posterior fallida | Handler HTTP | **PASS** | **BLOQUEANTE:** individual retorna 503; lote retorna 422/207 con candidato en `rejected` y 0 en `confirmed`; caché **NUNCA** se modifica |
| 6 | Duplicados existentes | Handler HTTP | **PASS** | 409 Conflict por colisión contra catálogo existente por teléfono o nombre; caché intacto |
| 7 | Colisiones dentro del mismo lote | Handler HTTP | **PASS** | 207 Multi-Status, primer candidato confirmado, segundo rechazado por colisión intra-lote |
| 8 | Aprobaciones concurrentes | Handler HTTP | **PASS** | `Promise.all` con 4 peticiones simultáneas serializadas por `acquireApprovalMutex`, generando 4 IDs únicos no colisionantes |
| 9 | Usuario sin autorización | Handler HTTP | **PASS** | 401 Unauthorized sin token y 401 con usuario de solo lectura sin permiso `business:publish` |
| 10 | Aprobación parcial con resultados correctos | Handler HTTP | **PASS** | 207 Multi-Status con partición exacta: 2 confirmados, 2 rechazados (teléfono corto y duplicado) |
| 11 | Caché intacto cuando falla la persistencia | Handler HTTP | **PASS** | Verificación profunda (`deepEqual`) de que el caché antes y después es idéntico ante fallos |
| 12 | Ausencia de efectos secundarios hacia WordPress/WooCommerce | Handler HTTP | **PASS** | `publishedToWordPress: false`, 0 llamadas de red a WP, sin IDs ni flags heredados |
| 13 | Compatibilidad con las restricciones de Staging | Handler HTTP | **PASS** | Invoca `stagingBusinessStore.create` aislado y no toca métodos de guardado de producción |
| 14 | Regresión de clasificados frente a PR #54 | Handler HTTP | **PASS** | Rutas `/api/classifieds/radar-search` y `/api/classifieds/batch-approve` funcionan sin interferencia con la aprobación de empresas |

### Pruebas de regresión adicionales del repositorio:
- `tests/enc-staging-write-gate-005-unit.test.mjs`: **15/15 PASSED**
- `tests/security-radar-001.test.mjs`: **6/6 PASSED**
- `npm run build:server`: **PASSED** (0 errores de compilación Vite y esbuild)

---

## 4. Garantías de Seguridad y Límites de Ejecución

- **Producción no modificada:** Ningún cambio afecta la base de datos de producción.
- **Aislamiento de Staging conservado:** Las escrituras en Staging utilizan exclusivamente las compuertas y bloqueos autorizados de `stagingBusinessStore`.
- **RBAC riguroso:** Se exige la sesión de administración y el permiso `business:publish`.
- **Sin efectos secundarios externos:** Totalmente desligado de endpoints o servicios heredados de WordPress / WooCommerce.
- **Integración:** NO INTEGRADO (los cambios residen en la rama autorizada `work/enc-radar-empresas-043-gas` para revisión en PR #55).
- **Despliegue:** NO DESPLEGADO.
