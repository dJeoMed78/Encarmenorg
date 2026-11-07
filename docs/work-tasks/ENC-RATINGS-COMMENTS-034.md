# ENC-RATINGS-COMMENTS-034 — W1, 2026-11-07

## Estado
Implementación parcial probada localmente; pendiente de revisión. NO cierre integral: comentarios moderados requieren autorización de esquema; escritura real y móvil pendientes. Sin integración/despliegue.
Base vigente: `db34778138b7f028761cbff057c010bc35d33204` de ia-desarrollo. Rama existente `work/enc-ratings-comments-034-w1` estaba en `9bd1eaba965f82805fa8ba8f74bc6d04b1f7f9e9`, sin commits propios; se conserva y avanza sin force push. No se mezcla la tarea Facebook.

## Diagnóstico y recuperación
Leídos Issue #34 (sin comentarios), documentación de coordinación y antecedentes ENC-REVIEWS-006, incluidos esquema propuesto e informes. PR abiertas consultadas: #55, #56 y #65, ninguna de ratings. Los cambios recientes de Radar se conservan desde la base vigente.

Revalidación estrictamente GET de Staging, sin visitorId ni datos personales: `/api/ratings` respondió HTTP 200, un agregado para 966 (average 4, count 1, distribución 0/0/0/1/0). `/api/ratings/966` respondió el mismo agregado, hasRated false y userRating null. NO se reproduce hoy el error histórico de lectura; no se atribuye una causa histórica sin logs. Esta consulta no acredita escrituras ni acceso directo a MariaDB.

`src/db/mariadb.ts:1361-1371` exige pool, RATINGS_SCHEMA_APPROVED y isWritePermitted para insertar. Se conservan esas defensas. Las comprobaciones de esquema/UNIQUE y datos existentes preceden la consulta; los códigos estaban ocultos bajo un mensaje genérico. `server.ts:2060` ahora expone solo códigos permitidos, nunca mensajes SQL internos.

Defectos demostrados en cliente: distribución no validada contra count/average (`src/services/api.ts`, parseRatingStats); una lectura iniciada por evento de actualización podía reemplazar el agregado confirmado por POST (`src/utils/realRatings.ts`). Corregidos con validación matemática y contador compartido de vigencia. El widget presenta cinco barras con datos comprobados, sin promedios ficticios. Compatibilidad con respuestas históricas sin distribución conservada.

## Comentarios: dependencia que requiere decisión previa
El repositorio inserta texto opcional privado de hasta 200 caracteres, parametrizado, rechazando HTML y controles. GET solo entrega agregados y voto, no texto. `BusinessPublicDetail.tsx:736` mantiene disponibilidad honesta. El esquema documentado en docs/sql/enc_reviews_006.sql tiene comment/created_at, NO estado persistente ni auditoría de moderación. No se inspeccionó esquema real; no afirmar inexistencia física de columnas extra.

Propuesta para autorización, NO implementada ni ejecutada: estado explícito pending/approved/rejected/hidden asociado al ID de rating, fecha de moderación, identidad administrativa y versión para concurrencia. Los históricos deben permanecer privados, nunca aprobarse por defecto. GET público debe filtrar approved en SQL, paginar por fecha e ID y no exponer visitor_id. Moderación con sesión y permiso por operación, sin modificar estrellas. Requiere confirmar esquema real y aprobar cambio de esquema y política/guard administrativo compartido; sección 11 de la orden exige autorización previa. No se crea formulario que prometa envío/moderación inexistentes.

También falta política antiabuso: el token local puede rotarse; SHA256 es seudonimización, no identidad ni protección antifraude. UNIQUE impide duplicados del mismo par, no votos de la misma persona con nuevos tokens. Definir límites y desafío antes de abrir escrituras. No se amplían permisos generales ni se cambia configuración privada.

## Pruebas nuevas reproducibles
`node --test tests/ratings-034.test.mjs tests/ratings-hook-034.test.mjs tests/ratings-repository-034.test.mjs tests/ratings-routes-034.test.mjs`: 24 PASS, 0 FAIL.
- Cliente: cero/uno/varios, promedio/distribución, agregados inválidos, HTTP400/404/409/503, JSON inválido, rango y confirmación.
- React/jsdom: doble envío, GET atrasado tras POST, cambio de empresa, error, remontaje y desmontaje.
- Repositorio real con adaptador SQL SIMULADO: COMMIT confirmado/readback, rollback por error, duplicado y desconexión. NO motor MariaDB.
- Handlers extraídos y HTTP Express local: GET, validación de IDs/rango, rechazo de escritura, comentarios vacío/válido/200/201/XSS/controles. No arranca server.ts completo para estas pruebas.

`node --test tests/ratings-browser-034.test.mjs`: BLOQUEADA/FAIL por ejecutable Chromium ausente. Se incluye prueba reproducible con Playwright, bundle y CSS compilado, red limitada a localhost, anchuras320/390/834/1440. No acredita visual móvil. Dependencias de pruebas jsdom y Playwright requeridas, sin cambios al manifest/lock.

`npm run lint`: PASS.
`node_modules/.bin/vite build --outDir /tmp/034-dist`: PASS; warning chunk >500kB. Copia local de fuentes sin todos los recursos binarios; no es paquete de despliegue.
`node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/034-server.js`: PASS.
No se ejecuta npm run build: llama actualización de versión y escribe bundles del repositorio; se sustituyó por compilaciones directas a /tmp. No se publican dist/server.js/api/server.bundle.js.

`node --import tsx --test tests/security-radar-001.test.mjs tests/enc-staging-public-media-001.test.mjs`: 14 PASS /1 FAIL. Falla caso histórico que espera búsqueda clasificados pública fuera de Staging (HTTP500 frente a200); cambios actuales de Radar exigen administración. No se cambia esa política ni la prueba ajena. No se declara toda regresión aprobada.
Suite combinada con tests/enc-radars-041-043-integration.test.mjs: ABORTADA (SIGINT) porque importa el servidor y lo deja escuchando en3000; reportó seis casos antes de interrupción, sin resultado final. Log informó .env con0 variables, datos seed y Vite. No se suministraron credenciales ni se invocó init SQL real desde pruebas nuevas. No usar esta suite como PASS.

## Plan reversible MariaDB, pendiente de ejecución autorizada
Coordinación: comprobar DATABASE/cuenta/grants/topología reales, respaldo recuperable y esquema; aprobar capacidad específica para ratings, sin abrir isWritePermitted general. Usar empresa sintética previamente autorizada y visitante sintético; capturar agregados iniciales; POST, leer desde conexión nueva y HTTP; repetir duplicado; probar rechazo y cierre de ventana. Identificar exclusivamente IDs de prueba y autorizar su limpieza conservadora, comparar históricos. No hacer restauración masiva. W1 no ejecutó SQL, POST real, migraciones, ventanas ni limpieza.

## Revisión y reversión
Diff funcional limitado a server.ts (serializador de errores ratings), api.ts (agregados), realRatings.ts (vigencia), StarRatingWidget.tsx (distribución), cinco tests ratings y documentación. Código MariaDB, políticas compartidas, otros componentes y bundles no se publican modificados. Revertir commit de tarea por PR revisada; no modifica datos ni requiere rollback SQL. No cerrar #34. Revisión independiente y autorización de esquema/política pendientes; entrega no autoaprobada.

Instalación reproducible: `npm ci --ignore-scripts` sobre copia temporal de package/lock de la base falló EUSAGE por lock desincronizado (dependencias opcionales ausentes). No se modificaron ambos archivos. Las validaciones usaron node_modules recuperado de instalación anterior sin regenerar lock; no equivalen a npm ci exitoso. Resolver lock por tarea autorizada antes de exigir CI verde.


## Intervención directa de Coordinación 01 — 2026-11-07 (continuación por límite Work)

**Objetivo:** completar el código de comentarios moderados sin reabrir W1 ni modificar producción.
**Rama aislada Nia:** `work/enc-ratings-comments-034-nia-completion` basada en head W1 `86863c11fb06884e48d9c643469d1e345a2e865e`.
**PR Nia:** https://github.com/dJeoMed78/Encarmenorg/pull/67 (DRAFT, destino rama W1, no integrada).

Implementado en código:
- Repositorio `src/db/ratingModeration.ts`: comentarios públicos sólo con estado `approved`; comentarios sin registro de moderación (incluidos históricos) permanecen privados; revisión de pendientes y decisión transaccional con locking y rollback.
- Nuevas rutas de consulta pública y moderación administrativa en `server.ts`, autenticación y nombre real de la sesión administrativa; respuestas sin caché, validación de identificadores y paginación.
- Gating de esquema y datos en `src/db/mariadb.ts`: requieren `RATINGS_SCHEMA_APPROVED` y `RATINGS_MODERATION_APPROVED` y no abren escrituras generales.
- Interfaz pública con lista de aprobados y paginación, campo de comentario opcional al enviar una calificación, y cola administrativa para aprobar/rechazar mediante respuesta real del servidor.
- `docs/sql/enc_reviews_034_moderation_PROPOSAL.sql` contiene **DDL comentado, no ejecutado**. No se modifica información histórica.

**Restricciones:** El módulo NO se activa en Staging hasta confirmar el esquema y autorizar su aplicación; las escrituras siguen denegadas por `isWritePermitted()` sin un carril específico autorizado. No se han ejecutado pruebas de escritura MariaDB real, migraciones, ni despliegues. El código propuesto no constituye autorización para activar esas funciones.

**Prueba E2E reversible a cargo de Coordinación tras autorización separada:**
1. Verificar Hostinger Staging, `DATABASE()`, `CURRENT_USER()`, grants, motor y tablas, e independencia de producción. Inspeccionar esquema real sin cambios.
2. Crear respaldo lógico consistente de sólo Staging, conservar integridad/verificabilidad y tener reversión preparada. Confirmar estado inicial de los registros sintéticos.
3. Revisar y aprobar DDL compatible con esquema real, probar en copia aislada antes de aplicarlo en Staging. Evitar DDL sin autorización: implica commit implícito.
4. Activar temporalmente sólo la capacidad específica de ratings y comentarios con usuario administrativo y restricciones temporales; **nunca** abrir `isWritePermitted()` general o tocar producción.
5. Enviar voto y comentario sintéticos autorizados sobre empresa de prueba previamente verificada; confirmar HTTP, `COMMIT`, lectura SQL en segunda conexión y GET público sin comentario aprobado.
6. Moderar un comentario desde sesión administrativa; confirmar auditoría de nombre, fecha, estado y consulta pública tras aprobación. Rechazar otro, verificar que no aparece al público.
7. Repetir voto para comprobar respuesta de duplicado, rechazar acceso anónimo, probar interrupción de SQL y concurrencia. Ejecutar Playwright en 320/390/834/1440 px.
8. Cerrar ventana de escritura, confirmar bloqueo; limpiar exclusivamente IDs sintéticos bajo autorización y verificar que los agregados históricos no cambiaron.
9. Confirmar versión exacta y fecha de release en Staging, monitorear regresiones, documentar evidencias antes de cerrar Issue #34.

**Riesgos abiertos:** no existen todavía permisos de escritura de ratings en Staging; no se probó SQL real ni compatibilidad DDL con tablas activas. La moderación guarda última decisión, usuario y hora pero no historial inmutable de cambios. Identificadores de visitantes no prueban identidad humana; exigir política antiabuso antes de habilitar votos públicos.

**Estado:** IMPLEMENTACIÓN AISLADA; integración, migración, E2E real y despliegue BLOQUEADOS hasta verificaciones y autorizaciones correspondientes.


## Verificación SQL real de solo lectura, Staging — 2026-11-07

**Ejecución verificable:** https://github.com/dJeoMed78/Encarmenorg/actions/runs/42386024507 — SUCCESS. Acceso SSH anclado por huella y consultas exclusivamente SELECT a Hostinger, sin DDL/DML. Identidad SQL de base **`u293982346_encarmentest`** comprobada, sin grants explícitos de producción.

**Esquema obtenido de `information_schema` (no supuesto):**
- `business_ratings`: **EXISTS / InnoDB**, **1 registro** al momento de auditar.
- Columnas: `id varchar(64) NOT NULL`, `business_id varchar(64) NOT NULL`, `rating tinyint(4) NOT NULL`, `visitor_id varchar(100) NOT NULL`, `ip varchar(50) NULL`, `comment text NULL`, `created_at datetime NULL`.
- Índices: `PRIMARY(id)`, `idx_biz_visitor(business_id, visitor_id)` no único, `uq_business_ratings_biz_visitor(business_id,visitor_id)` único.
- `business_rating_moderation`: **MISSING**. El despliegue no puede ofrecer moderación real antes de crearla con autorización y respaldo.

**Corrección posterior a la auditoría:** Se añadió un carril aislado `src/db/stagingRatingWrite.ts`, con verificación estricta de identidad, banderas de autorización y ventana ≤30 minutos ligada a respaldo fresco. La aplicación sólo permite POST de votos/moderación durante la ventana. La compuerta `isWritePermitted()` general permanece sin cambios y la moderación está desactivada en producción. `src/server/stagingBusinessSecurity.ts` rechaza parámetros privados duplicados.

**Para ejecutar la activación real — REQUIERE autorización expresa para DDL Staging:**
1. Verificar de nuevo `DATABASE()`, `CURRENT_USER()`, grants, versión y esquema; medir la existencia y hashes de respaldos recientes de `u293982346_encarmentest`.
2. Verificar que `business_rating_moderation` aún no exista; revisar índice, charset/collation y compatibilidad del SQL propuesto en `docs/sql/enc_reviews_034_moderation_PROPOSAL.sql` contra el esquema real.
3. Crear respaldo lógico consistente y comprobable de Staging con manifiesto y vía de reversión; probar DDL primero en instancia de prueba aislada.
4. Con permiso específico, crear **únicamente** la nueva tabla vacía de moderación dentro de la base Staging, sin alterar ninguna fila de `business_ratings`. DDL produce commit implícito; si falla, no asumir que rollback SQL elimina la tabla.
5. Registrar en configuración privada y sólo durante la ventana: `RATINGS_SCHEMA_APPROVED=true`, `RATINGS_MODERATION_APPROVED=true`, `STAGING_RATINGS_WRITES_ENABLED=true`, `STAGING_RATINGS_BACKUP_ID`, `STAGING_RATINGS_BACKUP_CHECKED_AT` y `STAGING_RATINGS_WRITE_EXPIRES_AT` con ≤30 minutos. Exigir `STAGING_DB_CONFIRMED=true`, `STAGING_READ_ONLY=false`. Nunca introducir secrets en GitHub o logs.
6. Desplegar sólo Staging tras auditar/mergear la PR, verificando SHA y HTTP. Ejecutar POST de voto y comentario **sintéticos autorizados**, SQL readback independiente, rechazo de duplicados, acceso admin, moderación approved/rejected y GET público filtrado. Probar estados de error y concurrencia.
7. Expirar o revocar ventana, confirmar denegación inmediata; limpiar exclusivamente registros sintéticos tras autorización y comprobar que el registro histórico y agregados legítimos siguen intactos.
8. Documentar pruebas, respaldo, versiones y rollback, entonces cerrar Issue #34 únicamente con aceptación del propietario.

**No se ejecutaron cambios de estructura ni escritos en SQL durante esta auditoría**; la propuesta DDL permanece comentada para evitar aplicación accidental.
