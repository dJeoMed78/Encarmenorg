# ENC-RADAR-EMPRESAS-043 — Documentación Técnica de Segunda Corrección

**Tarea:** ENC-RADAR-EMPRESAS-043  
**Issue:** https://github.com/dJeoMed78/Encarmenorg/issues/43  
**PR:** #55 (https://github.com/dJeoMed78/Encarmenorg/pull/55)  
**Rama:** `work/enc-radar-empresas-043-gas`  
**Rama Base:** `ia-desarrollo`  
**Ejecutor:** Google AI Studio (GAS)  
**Auditoría Técnica:** 01 — Nia, Coordinación Principal  
**Estado:** SEGUNDA ORDEN DE CORRECCIÓN TÉCNICA ATENDIDA Y VERIFICADA  

---

## 1. Dictamen y Alcance de la Segunda Corrección

La segunda auditoría independiente de Coordinación Principal 01 confirmó que la verificación de lectura posterior (`readback verification`) fue implementada efectivamente. No obstante, señaló nuevos hallazgos bloqueantes que impedían la integración:
1. **Consulta SQL defectuosa en `server.ts` (`getNextBusinessId`):** Expresión regular SQL con comilla de cierre faltante (`'^[0-9]+$`), y captura silenciosa de excepciones con `catch (_) {}` que degradaba a la caché local.
2. **Concurrencia e Identificadores en MariaDB:** Exclusividad de IDs limitada a la memoria de un único proceso Node, requiriendo garantías nativas de MariaDB sin alterar el esquema (migraciones DDL prohibidas).
3. **Pruebas sobre código real (Corrección C):** La suite de pruebas duplicaba la lógica de los controladores en lugar de importar y ejecutar directamente el código de producción de `server.ts`.
4. **Procedencia Web y Sugerencias de IA (Corrección D):** Clasificación incorrecta de candidatos de IA como "búsqueda en vivo" únicamente por la presencia sintáctica de una URL devuelta por el modelo.
5. **Compatibilidad con PR #54 (Corrección E):** Demostración empírica y automatizada de que los controladores de empresas no colisionan ni interfieren con los endpoints y compuertas de clasificados de la PR #54.

---

## 2. Corrección A — Consulta SQL Robusta y Comportamiento Fail-Closed

### 2.1 Causa Raíz
En `server.ts`, la consulta SQL dentro de `getNextBusinessId`:
```sql
SELECT MAX(CAST(id AS UNSIGNED)) AS max_id FROM businesses WHERE id REGEXP '^[0-9]+$
```
carecía de la comilla simple de cierre en el patrón de la expresión regular, generando un error de sintaxis en MariaDB (`ER_PARSE_ERROR`). Dicho error era capturado y suprimido silenciosamente mediante `catch (_) {}`, provocando que la función cayera en el cálculo local de la caché en memoria y asignara potencialmente un ID no verificado en la base de datos central.

### 2.2 Solución Implementada
- **Corrección de la expresión regular SQL:** Se cerró formalmente la comilla del patrón:
  ```sql
  SELECT MAX(CAST(id AS UNSIGNED)) AS max_id FROM businesses WHERE id REGEXP '^[0-9]+$'
  ```
- **Eliminación total de supresión silenciosa:** Si MariaDB está activa y la conexión o la consulta fallan, `getNextBusinessId()` lanza una excepción explícita (`throw new Error(...)`).
- **Aborto estricto con HTTP 503:** Los controladores `handleApproveCandidate` y `handleApproveMultipleCandidates` capturan dicha excepción e interrumpen de inmediato la publicación devolviendo `503 Service Unavailable`. Bajo ninguna circunstancia se publica una empresa con un ID generado únicamente desde la memoria local cuando la base de datos falla.

---

## 3. Corrección B — Concurrencia e Identificadores (Análisis Arquitectónico)

### 3.1 Inspección del Esquema de MariaDB
La tabla de empresas en MariaDB posee la siguiente definición estructural:
- **Motor:** InnoDB.
- **Clave Primaria:** `id VARCHAR(64) PRIMARY KEY`.
- **Tipo de datos:** Cadena de caracteres alfanumérica, permitiendo tanto identificadores numéricos tradicionales (`1001`, `4001`) como prefijos administrativos.

### 3.2 Imposibilidad de AUTO_INCREMENT o SEQUENCE sin Migración DDL
El motor MariaDB / MySQL no permite declarar `AUTO_INCREMENT` sobre columnas de tipo `VARCHAR(64)` sin modificar el tipo de datos a `BIGINT UNSIGNED AUTO_INCREMENT`. Asimismo, el uso de objetos `SEQUENCE` de MariaDB requiere la ejecución de sentencias de definición de datos (`CREATE SEQUENCE ...`).
Dado que las instrucciones de Coordinación Principal **prohíben estrictamente ejecutar migraciones DDL en producción o Staging**, no es posible alterar el esquema existente.

### 3.3 Solución Arquitectónica: Bloqueos Consultivos Distribuidos (`GET_LOCK`)
Para resolver la concurrencia entre múltiples instancias o procesos Node sin modificar el esquema de datos:
1. Se utiliza la primitiva distribuida de MariaDB:
   ```sql
   SELECT GET_LOCK('encarmen:business:id-allocation', 5) AS acquired
   ```
2. Tras adquirir el bloqueo distribuido en la conexión del pool, se ejecuta la consulta `SELECT MAX(CAST(id AS UNSIGNED)) ...`, se calcula el siguiente ID secuencial y se libera el candado mediante:
   ```sql
   SELECT RELEASE_LOCK('encarmen:business:id-allocation')
   ```
3. A nivel de proceso Node, se mantiene el mutex FIFO asíncrono en memoria (`acquireApprovalMutex`) para serializar solicitudes locales concurrentes.
4. **Propuesta formal para futura migración (si se autoriza):**
   ```sql
   -- Propuesta para cuando Coordinación autorice migración de esquema:
   CREATE SEQUENCE IF NOT EXISTS seq_business_id START WITH 50000 INCREMENT BY 1 NOCACHE;
   -- O bien migrar la clave primaria:
   -- ALTER TABLE businesses MODIFY COLUMN id BIGINT UNSIGNED AUTO_INCREMENT;
   ```

---

## 4. Corrección C — Pruebas sobre Código Real de Producción

### 4.1 Inyección de Dependencias en `server.ts`
Para evitar la duplicación de controladores en la suite de pruebas sin alterar las rutas ni la arquitectura de Express, se diseñó la factoría de dependencias en `server.ts`:
```typescript
export interface BusinessApprovalDependencies {
  isStaging: boolean;
  isMariaDbActive: () => boolean;
  getPool: () => any;
  dbSaveBusiness: (biz: any) => Promise<boolean>;
  dbLoadAllBusinesses: (force?: boolean) => Promise<any[]>;
  stagingBusinessStore: {
    create: (draft: any, requestId: string) => Promise<{ business: any }>;
  };
  businessesCache: any[];
  acquireApprovalMutex: <T>(fn: () => Promise<T>) => Promise<T>;
  getNextBusinessId: (allocatedIds?: Set<number>, poolOverride?: any) => Promise<number>;
  findDuplicateBusiness: (name: string, phone: string) => any;
  dismissedCandidates: Set<string>;
  saveDismissedCandidate: (identifier: string, name?: string, contact?: string) => Promise<void>;
  generateSafeSlug: (name: string, id: number) => string;
  generateAutonomousAdCopy: (name: string, category: string, deliveryOption?: string, address?: string) => string;
  generateCategorySlugs: (categories: string[]) => string[];
  contactDigits: (phoneOrContact?: string | null) => string;
}

export function createBusinessApprovalHandlers(customDeps?: Partial<BusinessApprovalDependencies>) { ... }
```
En tiempo de ejecución de producción, `server.ts` utiliza los controladores por defecto:
```typescript
export const defaultApprovalHandlers = createBusinessApprovalHandlers();
app.post('/api/businesses/approve-candidate', defaultApprovalHandlers.handleApproveCandidate);
app.post('/api/businesses/approve-multiple-candidates', defaultApprovalHandlers.handleApproveMultipleCandidates);
```

### 4.2 Ejecución Real en `tests/radar-business-approval.test.mjs`
La suite de pruebas importa directamente `createBusinessApprovalHandlers`, `getNextBusinessId`, `acquireApprovalMutex` y `generateSafeSlug` desde `../server.ts`, montándolos en un servidor Express en memoria (`http.createServer(app)`) con el middleware de seguridad real (`registerAdminSecurity`).

### 4.3 Matriz de Ejecución y Resultados
Todas las pruebas se ejecutan mediante `node --import tsx --test`:

| Categoría | Prueba / Escenario | Resultado | Código / Condición Verificada |
|---|---|---|---|
| **Unitaria** | 1. `getNextBusinessId` regex válida con comilla de cierre | **PASS** | `WHERE id REGEXP '^[0-9]+$'` |
| **Unitaria** | 2. `getNextBusinessId` bloqueo consultivo distribuido | **PASS** | `GET_LOCK` y `RELEASE_LOCK` invocados |
| **Unitaria** | 3. `getNextBusinessId` comportamiento fail-closed | **PASS** | Lanza excepción ante error SQL sin fallback silencioso |
| **Unitaria** | 4. `acquireApprovalMutex` serialización asíncrona | **PASS** | Ejecución estrictamente FIFO |
| **Unitaria** | 5. `generateSafeSlug` normalización URL-safe | **PASS** | Remueve tildes, caracteres especiales y asigna fallback |
| **Handler Real** | Escenario 1: Aprobación individual exitosa | **PASS** | 200 OK, `dbSaveBusiness` y lectura posterior confirmada |
| **Handler Real** | Escenario 2: Aprobación múltiple exitosa | **PASS** | 200 OK, lectura posterior verificada para cada ítem |
| **Handler Real** | Escenario 3: MariaDB no disponible / fallo pool | **PASS** | 503 Service Unavailable, aborto y caché inalterado |
| **Handler Real** | Escenario 4: Error durante guardado en MariaDB | **PASS** | 503 Service Unavailable, caché inalterado |
| **Handler Real** | Escenario 5: Guardado exitoso con lectura fallida | **PASS** | 503 Service Unavailable, rechazo estricto (BLOQUEANTE) |
| **Handler Real** | Escenario 6: Discordancia de datos en lectura posterior | **PASS** | 503 Service Unavailable, rechazo estricto |
| **Handler Real** | Escenario 7: Detección de duplicados contra catálogo | **PASS** | 409 Conflict, sin escritura en MariaDB |
| **Handler Real** | Escenario 8: Control de colisiones intra-lote | **PASS** | 207 Multi-Status, segundo ítem rechazado con motivo |
| **Handler Real** | Escenario 9: Concurrencia con Mutex sin colisión de ID | **PASS** | 200 OK en ambas, IDs únicos generados secuencialmente |
| **Handler Real** | Escenario 10: Solicitudes no autenticadas | **PASS** | 401 Unauthorized sin token válido |
| **Handler Real** | Escenario 11: Aprobación parcial por lotes | **PASS** | 207 Multi-Status con listas `confirmed` y `rejected` |
| **Handler Real** | Escenario 12: Invarianza del caché ante fallos | **PASS** | Caché no sufre mutaciones si falla la persistencia |
| **Handler Real** | Escenario 13: Ausencia de efectos hacia WordPress/WooCommerce | **PASS** | Cero llamadas HTTP a APIs heredadas |
| **Handler Real** | Escenario 14: Restricciones de Staging Write Gate | **PASS** | 503 Service Unavailable en modo sólo lectura sin bypass |
| **Handler Real** | Escenario 15: Modelo de procedencia de candidatos IA | **PASS** | `isLiveWebDiscovery: false`, `requiresAdminVerification: true` |
| **Coexistencia** | Escenario 16: Compatibilidad con PR #54 | **PASS** | Coexistencia fluida entre clasificados y empresas |

**Total de pruebas ejecutadas:** 21 pruebas automatizadas (100% aprobadas, 0 fallos).

---

## 5. Corrección D — Procedencia Web y Honestidad Comercial

En `server.ts` (endpoint `auto-search-ai`):
1. Se disoció la presencia sintáctica de una URL del concepto de rastreo web directo:
   - Para candidatos devueltos por Gemini:
     - `isLiveWebDiscovery: false`
     - `provenance: isVerifiableUrl ? 'ai_suggestion_with_url' : 'ai_unverified'`
     - `requiresAdminVerification: true`
     - `source: isVerifiableUrl ? '💡 Sugerencia IA con URL de referencia' : '💡 Sugerencia IA sin verificar'`
2. En `src/components/AdminAutoBusinessesModal.tsx`:
   - Se actualizó la insignia para mostrar de forma explícita:  
     `Sugerencia IA — No verificada (Requiere revisión manual)`
   - El enlace a la fuente se rotuló honestamente como `URL de referencia ↗`.
   - Se advierte al operador sobre la necesidad de verificar el contacto telefónico antes de la aprobación.

---

## 6. Corrección E — Compatibilidad Verificada con PR #54

Se analizó la rama de PR #54 (`work/enc-staging-classifieds-gate-005`):
- PR #54 introduce rutas bajo `/api/classifieds/...` (`radar-search`, `batch-approve`) y compuertas de seguridad para clasificados.
- PR #55 opera exclusivamente sobre `/api/businesses/...` (`approve-candidate`, `approve-multiple-candidates`, `auto-search-ai`, `getNextBusinessId`).
- No existe solapamiento ni colisión de rutas o middlewares.
- En la prueba automatizada `Escenario 16`, se verificó que ambas suites de endpoints responden concurrentemente sin interferencias.

---

## 7. Verificación de Seguridad y Entorno

- **Cero modificaciones en producción:** No se alteró la rama `main` ni despliegues productivos.
- **Cero migraciones ejecutadas:** El esquema de MariaDB se mantiene idéntico.
- **Aislamiento de Staging:** Todas las pruebas respetaron el modo de solo lectura y las compuertas de Staging.
- **Validación del compilador y linter:**
  - `npm run build:server`: Compilación exitosa de frontend (Vite) y backend (esbuild bundle).
  - `tsc --noEmit` (`npm run lint`): 0 errores tipográficos o sintácticos.
