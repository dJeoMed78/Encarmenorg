# ENC-REPORT-PERSISTENCE-001 — corrección directa Jefa 3
Fecha 2026-10-29. Estado: IMPLEMENTADO Y PUBLICADO, PENDIENTE DE PRUEBAS EJECUTABLES Y AUDITORÍA.

## Procedencia y alcance
Base exacta: work/enc-consolidation-fixes-002, SHA e60582e971f4f8cb56ea56191d33d91824f3fc5e.
Rama: coord/enc-report-persistence-001.
Se verificó que los handlers de POST/PATCH/DELETE /api/reports mutaban caché e ignoraban errores de disco/SQL, entregando success:true. `dbSaveReport` y `dbDeleteReport` retornan booleano, false en guard/SQL fallidos.

## Cambios
- server.ts, POST/PATCH/DELETE /api/reports: operaciones requieren isMariaDbActive y acuse booleano positivo de SQL antes de publicar cambios en memoria y responder success:true; errores responden 503, incluyendo writeMayHaveSucceeded donde no puede excluirse COMMIT.
- PATCH valida estados resolved/dismissed, crea copia en vez de mutar objeto existente antes de acuse SQL.
- DELETE exige acuse SQL antes de retirar registro de caché.
- POST fija id/status/createdAt desde servidor después de copiar cuerpo para que no puedan sobrescribirse, con ID no predecible por simple Date.now.
- El JSON local queda como copia secundaria: una falla al escribirlo se advierte, pero una operación confirmada por MariaDB sí puede responder éxito. Persistencia durable de MariaDB NO equivale a persistencia del JSON local.
- src/db/mariadb.ts: dbDeleteReport confirma affectedRows>0; ya no retorna éxito si la sentencia SQL afecta cero reportes.
- tests/coord-report-persistence-001.test.mjs: nuevas regresiones sintéticas sobre handlers reales de Express para errores de SQL, validaciones, caché y casos positivos.

## Límites y riesgos
- Pruebas NO EJECUTADAS: el entorno disponible no permite clonar la repo (DNS de github.com inaccesible), no hay checkout ni node_modules; lint/build tampoco ejecutados. Requiere W2 o entorno con checkout para ejecutar `npm run lint`, `npm run build:server`, `node --import tsx --test tests/coord-report-persistence-001.test.mjs` y regresiones H01-H04.
- No existe garantía de transacción entre MariaDB y JSON local; el cambio trata MariaDB como fuente de confirmación y JSON como copia auxiliar.
- Otros handlers de eventos, promociones, clasificados y cupones aún contienen persistencia best-effort; no se modificaron para evitar ampliar el alcance sin pruebas. La posibilidad de COMMIT seguida de pérdida de respuesta se trata como incertidumbre; reintentos idempotentes de POST reports no están implementados.
- GET /api/reports aún usa reportsCache y fetchReports() cliente mantiene fallback local histórico (trabajo ENC-DATA-INTEGRITY-CLOSURE-003 reservado para W1). No afirmar que lectura remota ya está alineada de modo integral.
- La implementación **no habilita escrituras bloqueadas en Staging**, no modifica controles H01, no ejecuta SQL ni contactos restaurados.
- Sin modificación main, ia-desarrollo, Staging o producción; sin PR, merges, despliegues o secretos.

## Revisión siguiente
Validar ejecución y contratos, inspeccionar efectos en reportes históricos, robustecer persistencia administrativa restante por tareas separadas y revisión de coordinación antes de integrar.
