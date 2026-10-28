# WORK_RESULTADOS.md — Registro acumulativo de entregas

Este documento es un registro **acumulativo**. Work lo actualiza **únicamente en su rama de tarea**; el coordinador lo revisa antes de integrar a `ia-desarrollo`. No borrar ni reescribir entradas anteriores.

## Formato para cada entrega

### [ID] — [Título]
- Fecha y responsable:
- Estado declarado por Work: `PENDIENTE` / `EN_PROGRESO` / `IMPLEMENTADO_SIN_VERIFICAR` / `PROBADO_POR_WORK` / `BLOQUEADO`.
- Rama base y SHA inicial:
- Rama de trabajo:
- SHA versión de `WORK_INSTRUCCIONES.md` usada:
- Commits y URLs:
- Archivos creados, modificados y eliminados:
- Cambios funcionales (sin exagerar):
- Evidencia de ejecución: comandos exactos, resultados, logs resumidos, prueba de errores y limitaciones.
- Impacto en MariaDB, datos y despliegues (o indicar ninguno):
- Riesgos, regresiones y cómo revertir:
- Puntos que requieren decisión del coordinador:
- Resultado de revisión del coordinador (lo escribe exclusivamente el coordinador):
- Resultado de integración y comprobación en Staging (lo escribe exclusivamente el coordinador):

## Registro inicial

### ENC-SETUP-001 — Verificación controlada de escritura
- Estado: `VERIFICADO_COORDINADOR` (solo capacidad de escribir Markdown en rama separada).
- Rama: `work/verificacion-acceso-001`.
- SHA base: `6004ef637021ee0bea72f5c892a815696c1c8c13`.
- Commit: `d48a3367805b21e1e49cb1aac05fe835dbe5748f`.
- Archivo agregado: `docs/WORK_PRUEBA_ACCESO.md`.
- Evidencia: comparación GitHub `ahead_by=1`, único cambio el archivo indicado (7 líneas agregadas), lectura posterior satisfactoria.
- Alcance de validación: escritura por API de GitHub; no verifica `git push` de terminal ni compilación.
- Efecto en producción y Staging: ninguno.

### ENC-REVIEWS-001 — Persistencia de calificaciones y opiniones
- Fecha y responsable: 2026-10-27, ChatGPT Work.
- Estado: IMPLEMENTADO_SIN_VERIFICAR (pruebas aisladas con mocks aprobadas; integración MariaDB pendiente).
- Rama base y SHA inicial/final observado: ia-desarrollo, 6004ef637021ee0bea72f5c892a815696c1c8c13; sin cambios concurrentes observados al entregar.
- Rama: work/enc-reviews-001.
- SHA blob WORK_INSTRUCCIONES.md: 08a5313d98813ded2657318814f2da4462b64c72.
- SHA blob de tarea: 529506d64ace64aac54c13e4ee52eae5946dc4dc.
- Commit de implementación y resultados: el commit que incorpora esta entrada (consultar historial de esta rama y entrega al usuario; no se incluye autorreferencia SHA imposible).
- Archivos: server.ts, src/db/mariadb.ts modificados; docs/WORK_RESULTADOS.md incorporado desde coordinación; docs/sql/enc_reviews_001.sql creado. Sin otros cambios.
- Implementación: GET y POST conservan campos de respuesta; fuente de verdad MariaDB, sin JSON ni fallback en memoria, sin escrituras a catálogo/semilla. Promedio y cantidad cero sin votos. Validación estricta de rating numérico entero 1..5, businessId y visitorId; comentario opcional máximo 200 caracteres, HTML/control rechazados. Comentarios persisten como texto; estos contratos no incluyen consulta pública de comentarios.
- Consultas parametrizadas; visitorId se almacena como SHA256 y no se devuelve; no se guarda ni usa IP. Errores de BD producen 503 sin detalles internos, duplicados 409 y negocios inexistentes 404. Se rechazan arrays/objetos en identificadores.
- Unicidad: índice compuesto único para instalaciones nuevas. En tablas existentes POST comprueba índice único exacto y falla cerrado con 503 si falta; NO aplica ALTER ni migración automática. Transacción con bloqueo de fila de negocio, INSERT y agregado antes de COMMIT; rollback/release en fallos.
- Histórico: inspeccionados ambos JSON del commit base sin imprimir datos personales: raíz ratings=[] y 207 stats; api/ratings_db.json ratings=[] y 206 stats. No hay votos individuales verificables en esos archivos. No se importan agregados como votos. Archivos remotos de Hostinger no inspeccionados.
- Migración: propuesta comentada en docs/sql/enc_reviews_001.sql, con backup, validación, SHA256 una sola vez, deduplicación determinista, cuarentena, revisión de BD existente, índice y rollback; no ejecutada.
- Pruebas ejecutadas: node /tmp/enc-test.cjs, salida PASS (código real de endpoints/helpers extraído, tipos eliminados con node:module y ejecutado con node:vm; controlador SQL simulado). Primer voto 200; fracciones/cadenas/fuera de rango, IDs inválidos, comentario >200 y HTML 400; sin votos 0; errores 409/404/503. Helpers: agregados, duplicado, rollback/release, falta de índice, negocio inexistente, lectura posterior, solicitudes paralelas duplicadas y propagación de falla BD. Estos mocks NO verifican bloqueo, restricciones ni concurrencia MariaDB real. El arnés temporal no se añadió al repositorio por alcance limitado.
- Verificación sintáctica: node --input-type=module con stripTypeScriptTypes sobre server.ts y src/db/mariadb.ts: OK ambos. No equivale a comprobación de tipos.
- Scripts inspeccionados: lint=tsc --noEmit; prebuild/build actualizan versión; build:server genera artefactos fuera del alcance. No se ejecutaron npm build ni build:server. No hay node_modules ni tsc disponible (command -v tsc y test -d node_modules sin resultado positivo); no se ejecutó lint ni compilación completa.
- Limitaciones: sin BD aislada configurada no se probaron persistencia tras reinicio real, concurrencia real, rollback/DDL ni integración de aplicación. No se inició el servidor para evitar sus efectos de inicialización de otras tablas.
- Riesgos: visitorId controlado por cliente puede rotarse/suplantarse; hash no lo autentica ni anonimiza de forma irreversible. Sin CAPTCHA/rate limiting/moderación en este alcance, no habilitar publicación abierta sin revisión de seguridad. El cliente excluido conserva almacenamiento local y puede presentar datos desactualizados. No se actualizan atributos rating/reviewCount del catálogo; los GET ratings son fuente autoritativa y sus consumidores requieren revisión posterior. Los comentarios no se exponen ni interpretan como HTML.
- Compatibilidad: validaciones ahora rechazan entradas antes aceptadas accidentalmente (rating cadena/fracción, HTML, identificadores inválidos); se mantienen rutas y forma de éxito. Coordinador debe comprobar consumidores antes de integrar.
- Impacto ejecutado en MariaDB/datos/despliegues: ninguno; no se conectó a BD real ni ejecutaron migraciones, despliegues o PR.
- Rollback: no integrar esta rama. Si se integra posteriormente, revertir commit de aplicación y coordinar restauración de esquema/datos con respaldo según propuesta; preservar votos nuevos.
- Pendientes/decisiones: pruebas MariaDB aisladas y tipado/build completos; aprobación y ejecución separada de migración; revisión de clientes, protección antiabuso y moderación antes de publicación. No fusionar automáticamente.
- Revisión del coordinador: pendiente, reservado al coordinador.
- Integración y comprobación Staging: pendiente, reservado al coordinador.
