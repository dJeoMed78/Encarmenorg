# ENC-RADAR-EMPRESAS-043 — Persistencia Segura y Eliminación de Publicación Heredada

## Metadata de la Orden
- **ID**: `ENC-RADAR-EMPRESAS-043`
- **Prioridad**: Crítica
- **Repositorio**: `dJeoMed78/Encarmenorg`
- **Issue**: https://github.com/dJeoMed78/Encarmenorg/issues/43
- **Rama Base**: `ia-desarrollo`
- **SHA Base**: `9bd1eaba965f82805fa8ba8f74bc6d04b1f7f9e9`
- **Rama Exclusiva**: `work/enc-radar-empresas-043-gas`
- **Destino de PR**: `ia-desarrollo`
- **Estado**: COMPLETADO — Listo para Pull Request

---

## 1. Causas Raíz Identificadas

1. **Confirmación Falsa sin Persistencia Verificada en MariaDB**:
   - En el entorno de Staging, `guardWrite('dbSaveBusiness')` devuelve `false` por diseño arquitectónico para evitar escrituras no controladas fuera del canal aislado de `stagingBusinessStore`.
   - Los endpoints de aprobación (`/api/businesses/approve-candidate` y `/api/businesses/approve-multiple-candidates`) invocaban `await dbSaveBusiness(newBiz)` ignorando el valor de retorno booleano.
   - Antes de confirmar la escritura en la base de datos, agregaban la empresa inmediatamente a la memoria (`businessesCache.unshift(newBiz)`) y respondían `{ success: true }`, generando un falso positivo tanto en la interfaz como en el almacenamiento temporal en memoria.

2. **Dependencias y Efectos Colaterales Heredados de WordPress/WooCommerce**:
   - Durante la aprobación se ejecutaba `exportBusinessToWooCommerce(newBiz, authHeader)`, el cual sobreescribía el ID autonómico de la empresa con el ID de producto de WordPress (`newBiz.id = exportRes.wpId`) y borraba/reinsertaba registros en MariaDB. Esto violaba la autonomía de MariaDB como fuente autorizada y provocaba estados inconsistentes.

3. **Aprobación Múltiple sin Manejo Atómico ni Partición de Errores**:
   - La aprobación por lotes no controlaba colisiones intra-lote ni duplicados frente a la base de datos existente.
   - En la interfaz de usuario (`AdminAutoBusinessesModal.tsx`), `handleAcceptAllPending` actualizaba indiscriminadamente el estado de todos los candidatos a `'accepted'` mediante un mapeo optimista ciego, incluso si ocurrían rechazos parciales o fallos en el servidor.

4. **Procedencia Engañosa en el Radar de Candidatos**:
   - `auto-search` y `auto-search-ai` presentaban candidatos del pool local simulando rastreos web activos (`✨ Detección con IA (Google & FB Carmen)` y URLs sintéticas de Facebook), sin indicar su procedencia real como registros locales históricos.

---

## 2. Correcciones Implementadas

### A. Archivos Modificados Autorizados
1. `server.ts`:
   - Se actualizó el middleware de compuerta `writesReady` para permitir que las rutas de aprobación pasen a los controladores donde se valida la persistencia específica (`isBusinessWritePermitted` en Staging o `isMariaDbActive() && isWritePermitted()` en producción/dev).
   - Se añadió verificación de autorización administrativa con permiso `business:publish` en ambos endpoints de aprobación (`approve-candidate` y `approve-multiple-candidates`), rechazando con `401 Unauthorized` cualquier petición sin credenciales o permisos adecuados.
   - Se implementó validación rigurosa de número telefónico mediante `contactDigits`, exigiendo al menos un contacto verificado de 10 dígitos (formato estándar mexicano); de lo contrario se rechaza con `400 Bad Request`.
   - Se implementó detección de duplicados con `findDuplicateBusiness`, respondiendo `409 Conflict` si ya existe un negocio con el mismo nombre normalizado o teléfono.
   - **Persistencia en Staging**: Se utiliza de forma exclusiva `stagingBusinessStore.create(draft, requestId)` con clave UUID v4, bloqueo `GET_LOCK`, transacción InnoDB, verificación de prueba de aislamiento y readback select (`contactsMatchReadback` y `matchesWrittenValues`).
   - **Persistencia fuera de Staging**: Se requiere `isMariaDbActive() && isWritePermitted()`, se ejecuta `dbSaveBusiness` y se realiza verificación de lectura con `dbLoadAllBusinesses(true).find()`. Si la base de datos no confirma el guardado, se devuelve `503 Service Unavailable`.
   - **Invariante de Caché**: `businessesCache` y `businesses_seed.json` se actualizan **únicamente** tras la confirmación exitosa de MariaDB.
   - **Eliminación Total de WordPress**: Se removieron todas las llamadas a `exportBusinessToWooCommerce`, mutaciones de IDs por IDs de WordPress, permalinks externos y flags `wpSynced`.
   - **Aprobación Múltiple**: Se procesa cada candidato de forma verificable, evitando colisiones intra-lote y catalogando los resultados en listas explícitas de `confirmed` y `rejected`.
   - **Radar Honesto**: `auto-search` y `auto-search-ai` marcan honestamente los candidatos locales con `isLiveWebDiscovery: false` y `provenance: 'local_pool'`, reservando `isLiveWebDiscovery: true` únicamente para detecciones de Gemini con grounding real.

2. `src/services/api.ts`:
   - Se definieron las interfaces `ApproveCandidateResult` y `ApproveMultipleCandidatesResult`.
   - Se actualizó el tipado y procesamiento de respuestas para retornar colecciones explícitas de `confirmed`, `published`, `rejected` y `failed`, eliminando expectativas de sincronización con WordPress.

3. `src/components/AdminAutoBusinessesModal.tsx`:
   - `handleAccept`: Actualiza el estado visual a `'accepted'` únicamente cuando el backend devuelve `res.success && res.business`.
   - `handleAcceptAllPending`: Inspecciona `res.confirmed` y actualiza a `'accepted'` **únicamente** las empresas confirmadas en MariaDB. Notifica de forma transparente cuántas se guardaron y cuántas fueron rechazadas por duplicidad o datos incompletos.
   - Se agregaron distintivos de procedencia visual (`Catálogo local` vs `Detección web activa`) en las tarjetas de candidatos.

4. `tests/radar-business-approval.test.mjs`:
   - Nueva suite de pruebas automatizadas con mocks que cubre íntegramente los 12 escenarios obligatorios.

---

## 3. Matriz de Pruebas y Resultados

| # | Escenario Obligatorio | Tipo | Resultado |
|---|----------------------|------|-----------|
| 1 | MariaDB disponible | Mock | **PASS** (200 OK, persistencia confirmada, caché actualizado) |
| 2 | MariaDB no disponible | Mock | **PASS** (503 Service Unavailable, caché intacto) |
| 3 | Error al guardar empresa | Mock | **PASS** (503, excepción capturada, caché intacto) |
| 4 | Confirmación exitosa de persistencia | Mock | **PASS** (readback select verificado, datos consistentes) |
| 5 | Empresa duplicada | Mock | **PASS** (409 Conflict, rechazo por nombre/teléfono existente) |
| 6 | Teléfono inválido | Mock | **PASS** (400 Bad Request por menos de 10 dígitos) |
| 7 | Usuario sin autorización | Mock | **PASS** (401 Unauthorized sin token o sin permiso `business:publish`) |
| 8 | Aprobación individual en Staging | Mock | **PASS** (usa `stagingBusinessStore` aislado, no altera producción) |
| 9 | Aprobación múltiple parcialmente fallida | Mock | **PASS** (partición exacta entre `confirmed` y `rejected`) |
| 10 | Ausencia de llamadas a WordPress/WooCommerce | Mock | **PASS** (0 llamadas salientes, `publishedToWordPress: false`, IDs preservados) |
| 11 | Caché sin publicaciones falsas | Mock | **PASS** (ante cualquier fallo el caché permanece idéntico) |
| 12 | Candidatos locales con procedencia honesta | Mock | **PASS** (`isLiveWebDiscovery: false`, `provenance: 'local_pool'`) |

### Comprobaciones adicionales ejecutadas:
- `node --import tsx --test tests/radar-business-approval.test.mjs`: **12/12 PASSED**
- `node --import tsx --test tests/enc-staging-write-gate-005-unit.test.mjs`: **15/15 PASSED**
- `node --import tsx --test tests/security-radar-001.test.mjs`: **6/6 PASSED**
- `npm run lint` (`tsc --noEmit`): **PASSED** (0 errores de compilación TypeScript)
- `compile_applet`: **PASSED**

---

## 4. Garantías de Seguridad y Límites de Ejecución

- **Producción no modificada**: No se establecieron conexiones ni escrituras sobre bases de datos productivas.
- **Aislamiento de Staging conservado**: La compuerta transaccional de Staging se mantiene estricta y protegida contra operaciones de escritura genéricas.
- **Control de Acceso Preservado**: Las operaciones de publicación requieren explícitamente sesión activa de administrador con permiso `business:publish`.
- **Integración**: NO INTEGRADO (los cambios residen en la rama de trabajo para revisión y PR hacia `ia-desarrollo`).
- **Despliegue**: NO DESPLEGADO.

## 5. Compatibilidad y Análisis Frente a PR #54 (Nia)

- **Alcance de PR #54**: La PR #54 (rama `work/enc-radar-clasificados-041-nia`) aborda el Issue #41 enfocado exclusivamente en el radar de **clasificados** (anuncios de empleo, vehículos, inmuebles) y su persistencia en el carril `stagingClassifiedStore`.
- **Alcance de esta tarea (#43)**: ENC-RADAR-EMPRESAS-043 atiende de forma estricta y autónoma el radar de **empresas y negocios** (endpoints `/api/businesses/approve-candidate`, `/api/businesses/approve-multiple-candidates`, `auto-search` y `AdminAutoBusinessesModal.tsx`).
- **Puntos de Contacto en `server.ts`**:
  - Ambos desarrollos tocan el middleware de compuerta `writesReady`. Las reglas no colisionan: GAS habilita exclusivamente las rutas de aprobación de negocios cuando las escrituras de negocios están autorizadas, mientras que PR #54 agrega soporte para clasificados.
  - No existe solapamiento en los bloques de rutas de negocios y clasificados.
- **Puntos de Contacto en `src/services/api.ts`**:
  - PR #54 modifica `searchClassifiedRadarCandidates` y `approveClassifiedCandidate`.
  - Esta tarea modifica `approveAutoBusinessCandidate` y `approveMultipleAutoBusinessCandidates`.
  - Las funciones pertenecen a dominios separados y pueden coexistir limpiamente sin pérdida de código.
- **Directriz de Integración**: Coordinación y Nia pueden fusionar ambas PRs hacia `ia-desarrollo` de forma aditiva preservando las dos capacidades sin conflicto funcional.
