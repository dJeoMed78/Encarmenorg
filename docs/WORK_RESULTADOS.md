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

### ENC-REVIEWS-003 — Consumidores frontend de calificaciones
- Fecha y responsable: 2026-10-27 (America/Mexico_City), ChatGPT Work. Checkpoints con hora UTC.
- Estado declarado por Work: IMPLEMENTADO_SIN_VERIFICAR. Implementado y probado con HTTP/React simulados; falta validación integrada y tsc global no aprueba por error preexistente.
- Rama base y SHA inicial/final observado: ia-desarrollo, 6004ef637021ee0bea72f5c892a815696c1c8c13 (sin cambios concurrentes observados).
- Rama de trabajo: work/enc-reviews-003.
- SHA WORK_INSTRUCCIONES.md usado (blob): c4ef37ba0f690f60cd9fb5189190afd2be9a8faa. SHA tarea ENC-REVIEWS-003 (blob): 0ed0c6e179cb6f415ffe57944c679c01699e63b3. Contexto: 924a6ccd516520954cc254b901ee2d1e037dad9a.
- Commits publicados antes de este cierre:
  - 7b16fbbf103530358d59c0727467450796e6c439 — inicio/checkpoint: https://github.com/dJeoMed78/Encarmenorg/commit/7b16fbbf103530358d59c0727467450796e6c439
  - 75301fe955d9eda492d462624524eda40ef0615a — implementación/checkpoint: https://github.com/dJeoMed78/Encarmenorg/commit/75301fe955d9eda492d462624524eda40ef0615a
  - El commit de cierre que contiene esta entrada conserva la presentación original del widget y registra las 26 pruebas finales. Su SHA se entrega en el informe final; no se inventa un SHA autorreferente dentro del propio commit.
- Archivos modificados: src/utils/realRatings.ts, src/components/StarRatingWidget.tsx, src/components/BusinessDetailModal.tsx, src/components/DirectBusinessView.tsx, src/App.tsx, src/services/api.ts, src/components/NewestBusinessesBanner.tsx, src/components/AdminAutoBusinessesModal.tsx.
- Archivos creados: docs/WORK_RESULTADOS.md (plantilla acumulativa incorporada de coordinación sin borrar registros), docs/work-progress/ENC-REVIEWS-003.md. Eliminados: ninguno.
- Revisados además, sin cambios: instrucciones ENC-REVIEWS-001/002/003, coordinación, contexto completo y auditoría proporcionada por el coordinador; fuentes TypeScript/TSX de src para buscar consumidores; BusinessCard.tsx, ClientBusinessPageView.tsx, utils/ratings.ts, tipos, package.json, tsconfig.json, vite.config.ts, index.html; endpoints y funciones de ratings del commit backend a6819631fb9925deb5aeedce7b9b9b40e77454e7. Se inspeccionaron copias de fuentes/datos necesarias para compilar, sin conectar servicios reales.
- Cambios funcionales:
  - Un consumidor compartido consulta GET individual/global y espera POST HTTP exitoso con success=true y agregados válidos antes de agradecer o actualizar datos.
  - visitorId válido se conserva solo como identificador auxiliar; rating entero 1..5, sin redondeo de entradas inválidas. No existe garantía de una persona/un voto.
  - 400/404/409/503, errores de red y respuestas inválidas generan error visible. Tras fallo de envío se consulta GET; 409 recupera voto original y no guarda el intento. Fallos ambiguos se reconcilian sin afirmar éxito.
  - Cero, carga y consulta fallida son estados distintos. Sin fallback 5.0 ni count=1. Sin promedios ni votos autoritativos en localStorage.
  - App consume agregados globales reales, los aplica después de overrides y oculta agregados anteriores durante carga/error. Invalida al votar y al recuperar foco. Modal, ficha directa y landing usan el mismo widget/consumidor; se conserva la presentación existente del widget.
  - El banner de recientes y alta administrativa parten sin votos; datos históricos del catálogo se ignoran para los agregados mostrados, sin reescribirlos.
- Evidencia de ejecución y resultados:
  - Node 24.22.1; TypeScript 7.0.2; Vite 8.3.5; esbuild 0.28.2; React/react-test-renderer 19.3.1; @types/node 22.20.5. Herramientas temporales instaladas con --ignore-scripts. No se usó npm ci del lockfile: no afirmar equivalencia exacta con entorno de despliegue.
  - tsc --noEmit ejecutado: FALLA, único TS2339 en src/components/AdminEventsTab.tsx:1499:91: AIRadarCandidate no tiene source. Reproducido en copia con los ocho archivos originales y ratings_db.json del SHA base; no se corrige fuera del alcance. Sin diagnósticos nuevos observados.
  - vite build --outDir /tmp/enc-reviews-tools/vite-dist --emptyOutDir: PASA, 1720 módulos; advertencia de chunk mayor de 500 kB. No invoca scripts de versión. Build repetido tras conservar diseño del widget, con éxito. No equivale a prueba de hosting ni compilación/ejecución de backend.
  - esbuild del consumidor API y widget (CJS temporal): PASA; esbuild de App con paquetes externos: PASA.
  - node /tmp/enc-reviews-tools/test-ratings.cjs: 26 comprobaciones PASAN. Casos: POST éxito/pendiente; 400/404/409/503; red caída; cero votos, nulos, agregados incoherentes; datos locales antiguos ignorados; ratings inválidos; remontaje; dos vistas; GET/POST tardíos de otro negocio; almacenamiento bloqueado. Guion completo, comandos y salida incluidos en docs/work-progress/ENC-REVIEWS-003.md. Son mocks, NO integración real ni persistencia real tras reinicio.
  - Un fallo inicial de prueba mostró que el mensaje de 409 ocultaba el promedio reconciliado. Se separó disponibilidad del agregado del error de envío; batería final aprobada. react-test-renderer avisa que está deprecado; no se oculta ese aviso.
  - Primer intento de tsc offline no disponible; se instaló herramienta temporal y se ejecutó posteriormente. El contraste inicial por API programática de TS no fue utilizable; el contraste válido posterior usa copia física y tsc CLI.
- Impacto en MariaDB, datos y despliegues: NINGUNO. No servidor, SQL, migraciones, PR, merge, integración ni despliegue. No cambios en main, ia-desarrollo, producción o Staging. Publicación únicamente mediante API de GitHub en rama autorizada; git push de terminal no se prueba.
- Riesgos y dependencias pendientes:
  - ENC-REVIEWS-001 no está integrado en esta rama ni verificado como desplegado. Persisten sus bloqueantes externos: índice único/migración aprobada, aislamiento de arranque/BD, normalización de IDs y antiabuso. Este frontend no permite declarar resueltos esos puntos.
  - server.ts y src/db/mariadb.ts conservan defaults/históricos de rating=5 y reviewCount/reviews_count; otros consumidores externos/SEO podrían seguir mostrándolos. Sin backend/migración no puede limpiarse el dato de origen.
  - index.html contiene JSON-LD fijo aggregateRating=4.9 y ratingCount/reviewCount=3920 sin evidencia de votos consultados. Fuera de alcance: subtrabajo detenido, requiere autorización específica para corregirlo.
  - utils/ratings.ts conserva funciones/comentarios antiguos, sin consumidores actuales de voto tras este cambio; no se modifica fuera de alcance.
  - Sin protección de identidad humana, limitación de frecuencia ni moderación nueva. IDs auxiliares pueden rotarse; almacenamiento bloqueado solo conserva ID durante sesión.
  - Sin prueba integrada API/MariaDB, navegador real, revisión visual responsive ni concurrencia real. Recarga entre navegadores y persistencia tras reinicio requieren entorno aislado autorizado.
  - Se mantiene advertencia de tamaño de bundle. La comprobación TypeScript global sigue bloqueada por TS2339 preexistente.
- Rollback propuesto: descartar la rama o revertir sus commits mediante commits normales, sin force push. Ningún cambio de datos requiere reversión. Una futura integración requiere plan coordinado con backend; no se ha ejecutado rollback.
- Recomendaciones/decisiones del coordinador: revisar diff y guion; autorizar por separado TS2339 y JSON-LD/históricos si procede; resolver bloqueantes backend; después autorizar validación aislada de frontend/API/MariaDB y revisión visual antes de decidir integración. No integrar ni desplegar automáticamente.
- Dictamen de Work: entrega lista para revisión de código; NO APTO para integración/despliegue directo a Staging con la evidencia actual. Espera revisión del coordinador.
- Resultado de revisión del coordinador: PENDIENTE (reservado al coordinador).
- Resultado de integración/comprobación en Staging: NO REALIZADO (reservado al coordinador).

### ENC-REVIEWS-006 — Consolidación integral de calificaciones en rama aislada
- Fecha/responsable: 2026-10-27 (America/Mexico_City), ChatGPT Work. Checkpoints con timestamp UTC.
- Estado: IMPLEMENTADO_SIN_VERIFICAR. Tipos, compilación y mocks aprobados; integración MariaDB real pendiente.
- Base inicial: ia-desarrollo, 6004ef637021ee0bea72f5c892a815696c1c8c13. Verificar nuevamente antes de entrega.
- Rama de tarea: work/enc-reviews-006. Sin merge, cherry-pick automático, PR o despliegue.
- Instrucciones generales (blob): c4ef37ba0f690f60cd9fb5189190afd2be9a8faa; tarea (blob): d81c21af1676ff8cfd26a23c5f2e85b73f6521c7.
- Fuentes: 001 a6819631fb9925deb5aeedce7b9b9b40e77454e7; 003 2e0d007879d474d3afbf378ecdadb06660c64d6a; auditorías 002/004 aportadas en conversación; tarea 005 disponible, sin informe de ejecución 005 aportado. Contexto y coordinación leídos.
- Historial: se preservan las entradas 001 y 003 desde sus ramas, además del registro inicial; no se reasignan sus estados ni se presenta su ejecución como propia de 006.
- Commits anteriores a este cierre:
  - d0bfc1e5b330b034eacea3747842231caefe9336 — inicio/checkpoint:
    https://github.com/dJeoMed78/Encarmenorg/commit/d0bfc1e5b330b034eacea3747842231caefe9336
  - 9fcdaeac9165e3b108f3a5fb01622cea28b26d3a — implementación/checkpoint:
    https://github.com/dJeoMed78/Encarmenorg/commit/9fcdaeac9165e3b108f3a5fb01622cea28b26d3a
  - El commit que contiene esta entrada registra cierre y ajustes revisados. SHA exacto se entrega en el informe final; no se inventa una autorreferencia.

Archivos:
- Modificados: server.ts; src/db/mariadb.ts; src/services/api.ts; src/utils/realRatings.ts; src/utils/ratings.ts; src/components/StarRatingWidget.tsx; src/components/BusinessDetailModal.tsx; src/components/DirectBusinessView.tsx; src/App.tsx; src/components/NewestBusinessesBanner.tsx; src/components/AdminAutoBusinessesModal.tsx; index.html (solo JSON-LD fijo); src/components/AdminEventsTab.tsx (solo TS2339).
- Creados respecto a base: docs/sql/enc_reviews_001.sql (redirige propuesta histórica), docs/sql/enc_reviews_006.sql (propuestas comentadas), docs/WORK_RESULTADOS.md y docs/work-progress/ENC-REVIEWS-006.md.
- Eliminados: ninguno. Ninguna dependencia/script/infraestructura ni archivo fuera de alcance se modifica.

Trabajo realizado:
- Consolidación manual de backend 001 y consumidores 003, con revisión del diff; no merges de ramas.
- Rutas GET global, GET individual y POST mantienen campos del contrato. POST valida entero 1..5, token/formato/comentario y solo confirma después de commit resuelto. HTTP 400/404/409/503 y errores de red sin éxito ficticio.
- Persistencia únicamente en business_ratings. Se retira JSON y actualización lateral del catálogo/dbSaveBusiness que antes ocurría al votar.
- ID se resuelve desde businesses y se usa canónico en inserción, agregado y voto personal. No se escriben ni bloquean filas de businesses con FOR UPDATE.
- UNIQUE real completo, NOT NULL, engine, PK, tipos y datos revisados antes de operar. Datos históricos incompatibles bloquean con 503 sin transformación automática.
- GET_LOCK cooperativo por esquema/negocio, timeout 5s y misma conexión hasta después de commit; UNIQUE es la garantía persistente. Lectura individual en snapshot transaccional. Se descartan sesiones ante adquisición incierta, rollback/release fallidos o SET/BEGIN fallidos, sin filtrarlas al pool.
- RATINGS_SCHEMA_APPROVED=true requerido posteriormente para habilitar. No se ha configurado en hosting. La bandera no sustituye aislamiento ni inhibe arranque de otros módulos.
- Creación automática de business_ratings retirada del arranque; DDL y funciones SQL de otras tablas conservados.
- Consumidores comparten datos de API, no promedios/votos de localStorage; 409 reconcilia voto registrado y respuestas tardías se descartan. Identificador auxiliar es el único dato local de este flujo.
- Widget conserva presentación; modal, ficha y landing lo usan. Cero/carga/error diferenciados.
- Defaults ficticios de nuevos objetos de negocio pasan a cero, sin migrar registros ni modificar las funciones SQL del catálogo.
- JSON-LD 4.9/3920 retirado; otros metadatos preservados. TS2339 corregido eliminando referencia a cand.source no declarada, conservando URL/badge/organizer.

Pruebas ejecutadas:
- tsc 7.0.2 --noEmit: PASA, exit 0. Error TS2339 anterior corregido.
- Vite 8.3.5 directo: PASA, 1720 módulos; advertencia de chunk >500kB. No prebuild, actualización de versión ni salida en fuente.
- Esbuild backend ESM y bundles temporales de consumidor/repositorio: PASAN. Compilar backend no equivale a arrancar el servidor.
- 26 comprobaciones frontend HTTP/React: PASAN; éxito/pendiente, 400/404/409/503, red, nulos, cero votos, datos locales ignorados, entradas inválidas, dos vistas, remontaje, GET/POST tardíos y almacenamiento bloqueado.
- 32 comprobaciones backend: PASAN; IDs canónicos, esquema incompatible, duplicados secuenciales y concurrencia SIMULADA, commit fallido/ambiguo, rollback/release/BEGIN fallidos, timeout/pérdida al adquirir lock, datos históricos incompatibles, rutas y ausencia de escrituras SQL ajenas.
- 3 controles estáticos: PASAN; preservación de metadatos/nodos JSON-LD ajenos, DDL/funciones SQL ajenas intactos, SQL propuesto sin sentencias activas.
- Total: 58 comprobaciones con mocks y 3 estáticas. NO son integración real, persistencia tras reinicio ni concurrencia real.
- Primer intento del control HTML no ejecutable por fixture temporal faltante; recuperada copia original del SHA base por lectura, control completo repetido y aprobado.
- No hay mariadbd ni Docker disponibles localmente; no se abrió ninguna conexión real. No se arrancó server.ts ni el bundle.
- Guiones íntegros, comandos, salidas y versiones en docs/work-progress/ENC-REVIEWS-006.md. React-test-renderer emite advertencia de deprecación. Herramientas temporales reutilizadas fuera del repositorio; no instalación npm ci del lockfile ni equivalencia exacta con Hostinger.

Esquema/migración propuesta:
- Nuevo modelo InnoDB exclusivo de ratings: id VARCHAR64 ASCII, business_id VARCHAR64 canónico binario, visitor_id CHAR64 SHA256 binario, rating TINYINT UNSIGNED, comentario opcional <=200, timestamp, PK y UNIQUE completo; CHECK propuestos sujetos a versión.
- Tabla existente compatible: ADD UNIQUE conservador, manteniendo índice no único para simplificar reversión. No recrear solo por estar vacía. Sin SQL activo en archivos.
- Antes de autorizar: verificar COUNT(*), DDL, engine/columnas, duplicados, nulos/rango/huérfanos, canonicalización y procedencia de claves. Formato hexadecimal no demuestra hash; no rehashear a ciegas.
- Verificar destinos/permisos reales, escritor único/topología/replicación, recursos y ventana; pausar todos los escritores, respaldo actualizado con hash y restauración ensayada. Elegir una alternativa SQL con autorización explícita.
- DDL implica commit; no se promete ROLLBACK. Reversión de UNIQUE solo con bandera deshabilitada y pausa, preservando votos nuevos. No restaurar respaldo viejo encima de datos nuevos sin conciliación.
- Reversión de código propuesta: descartar rama o commits normales de reversión, sin force push. No regresar automáticamente al antiguo escritor JSON.

Riesgos y pendientes:
- Falta validar SQL, CHECK, collation, advisory locks, snapshots, concurrencia, reinicio, permisos y restauración en MariaDB aislada real.
- Sin FK ni cambios al lifecycle de businesses: borrado externo concurrente puede dejar huérfanos; auditoría posterior bloquea hasta revisión. No se promete integridad referencial absoluta sin esa coordinación.
- GET_LOCK es por instancia y cooperativo; validar topología y compatibilidad de replicación. Escritores externos no coordinados no tienen garantía de agregados seriales. Medir carga y costo de auditoría por petición.
- Defaults/atributos históricos en businesses permanecen intactos para no alterar persistencia ajena. Ratings API y frontend los ignoran; consumidores externos del catálogo requieren revisión separada.
- Código histórico de configuración/arranque puede crear/sincronizar otras tablas; se conserva y no se ejecuta. No usar arrancar aplicación como prueba inocua de ratings.
- Hash es pseudónimo, no identidad humana ni anonimización. Sin IP nueva; no se borra IP histórica. Comentarios privados, sin publicación ni moderación nueva. Falta política de retención/antibot/rate limit y revisar logging del proveedor de visitorId en query.
- Falta revisión visual responsive y revisión de coordinación.
- Impacto real en MariaDB/Hostinger, Staging/producción: NINGUNO. Sin SQL real, migraciones, PR, merges, despliegues ni cambios de permisos/configuración.

Recomendación:
- APTO para revisión técnica de esta rama y propuesta SQL.
- NO APTO para autorizar migración, integración o despliegue con la evidencia actual.
- Coordinar revisión de código y pruebas; luego autorizar por separado entorno aislado, ensayo, SQL exacto/destino/operador/ventana/reversión, integración y despliegue. Producción excluida.
- Revisión del coordinador: PENDIENTE, reservada al coordinador.
- Integración y comprobación Staging: NO REALIZADAS, reservadas al coordinador.

### ENC-GLASS-EDITOR-001 — Editor empresarial iOS/macOS Glass
- Fecha/responsable: 2026-10-27 (America/Mexico_City), 02 ChatGPT Work. Checkpoints con hora UTC.
- Estado: IMPLEMENTADO_SIN_VERIFICAR: UI local/tipos enfocados/build probados; imagen original y persistencia real pendientes.
- Base inicial: ia-desarrollo, 6004ef637021ee0bea72f5c892a815696c1c8c13.
- Rama: work/enc-glass-editor-001. No parte de calificaciones ni Radar.
- SHA instrucciones generales (blob): c4ef37ba0f690f60cd9fb5189190afd2be9a8faa.
- SHA tarea (blob): 672c823b4e6f3c2547289cdd72e3f60ecb09f832.
- SHA especificación ficha (blob): 3f83c83a8cbf6239f779ad7361a0f00dd349b050.
- Leídos contexto completo/anexos y documentos de coordinación. La especificación de ficha no amplía el alcance del editor. La imagen aprobada no está disponible: se implementa especificación textual, sin afirmar coincidencia píxel a píxel.
- Commits antes de este cierre:
  - cac638abb32569d57933a260bde7fa89e53ac48b — inicio:
    https://github.com/dJeoMed78/Encarmenorg/commit/cac638abb32569d57933a260bde7fa89e53ac48b
  - 85d02e1d9e0d90c48dc0da7aeb370c903bfd8abc — implementación y checkpoint:
    https://github.com/dJeoMed78/Encarmenorg/commit/85d02e1d9e0d90c48dc0da7aeb370c903bfd8abc
  - El commit que contiene esta entrada cierra evidencia y formato/revisión; SHA exacto se entrega en el informe final, sin autorreferencia inventada.

Archivos:
- Modificado: src/components/EditBusinessModal.tsx.
- Creados respecto a base: docs/WORK_RESULTADOS.md y docs/work-progress/ENC-GLASS-EDITOR-001.md.
- No se modifica ningún otro archivo. No dependencias, scripts, CSS compartido, API, backend, DB ni componentes de calificaciones.

Cambios:
- Panel Glass con ambiente azul/rosa, blur real, borde luminoso y campos blancos; seis tarjetas agrupadas.
- Encabezado lápiz/título/subtítulo/cierre; pie translúcido fuera del scroll; responsive y degradación sin blur.
- Cinco modalidades con selección múltiple azul; cuatro pagos principales, preservando quinto pago y valores desconocidos en avanzados.
- Horarios Lun-Dom y apertura/cierre, sin días/horas inventados. Texto libre heredado se conserva hasta edición explícita; opción de restaurar original y edición libre avanzada.
- Descripción con contador y límite 500 al editar, conservando texto heredado más largo si no se cambia.
- Contacto estricto de 10 dígitos o prefijo mexicano reconocido; sin truncar números arbitrariamente ni copiar teléfono a WhatsApp.
- Guardado por delta, sin normalizar/reescribir campos no editados. Conserva categorías secundarias, aliases existentes y campos ajenos. Ciudad opcional solo se envía al editar.
- No se cierra ni se informa éxito si onSave no confirma success===true. Error conserva borrador; bloqueo de doble envío/cierre durante operación; respuestas viejas se ignoran.
- Foco contenido/restaurado, Escape controlado, nombres accesibles, aria-pressed, alert/status, foco visible y preferencias de movimiento.
- Avanzados conservan redes, sitio, logo, URL de imagen, galería de 10, enlace/admin TOP/recomendada e historial.
- Uploads limitados a imágenes admitidas <=5 MB; error explícito ante fallback data URI del helper compartido. Quitar foto tiene estilo Glass. Sin cambios en servicio de upload.

Pruebas:
- TypeScript 7.0.2 enfocado en editor/dependencias: APROBADO, exit 0.
- tsc --noEmit global en base original: FALLA, único TS2339 preexistente de AdminEventsTab.tsx:1499:91 (AIRadarCandidate.source); archivo reservado, NO modificado.
- Vite 8.3.5 directo: APROBADO, 1719 módulos; advertencia chunk >500kB. Sin npm run build/prebuild ni actualización de versión; salidas temporales.
- 40 comprobaciones de Chromium 153.0.8010.0: APROBADAS. Seis tarjetas, chips, responsive, footer, foco, cierre, validación, descripción, horarios heredados/semanales, contactos, errores/éxito, campos preservados, admin, multimedia, tamaño/galería y respuestas tardías.
- Navegador real con onSave/upload simulados: NO constituye integración con API/MariaDB ni persistencia real. Sin errores JS ni solicitudes externas; servidor estático en loopback, sin iniciar server.ts.
- Nueve capturas reales (inicio/horarios en 1440x1050, 834x1112, 390x844 y 320x700; más avanzados/admin) con datos sintéticos. Sin evidencia falsa ni screenshots generados por IA.
- Capturas: [ENC-GLASS-EDITOR-001-capturas.zip](https://chatgpt.com/library?file_id=libfile_94254a3a7a008191b23294484005dfaa&account_id=personal).
- Guiones completos, comandos, salidas y hashes en docs/work-progress/ENC-GLASS-EDITOR-001.md.
- Intentos fallidos: Chromium estándar descargó ZIP inválido; extracción de fonts alternativa dio EINVAL/chown, pero se utilizó correctamente el ejecutable temporal disponible. Pruebas iniciales detectaron etiqueta ambigua (corregida) y carrera del reset del harness (corregida); batería completa final aprobada. Herramientas fuera del repo; no se afirma npm ci del lockfile.

Concurrencia:
- Durante la tarea ia-desarrollo avanzó a 1455e568a93629dcd7ae3f58df61d03c76a64f4d por merge PR #2 de coordinación, observado por lectura.
- No fue un merge realizado por esta tarea. No se infiere despliegue.
- EditBusinessModal conserva en esa base el mismo blob inicial 00eeb741068d731988cf13b6ee49edd12182016b: sin colisión de código del editor observada.
- No se hizo rebase/merge ni se incorporó código de calificaciones.
- Este registro preserva íntegramente WORK_RESULTADOS de ese SHA concurrente al agregar Glass; no altera estados ajenos. La coordinación deberá conciliar el archivo documental compartido durante su revisión.
- El error global informado corresponde a nuestra base original, no se atribuye automáticamente a ia-desarrollo actual. Validación sobre la base de integración final corresponde a coordinación.

Riesgos/pendientes:
- Falta imagen original para comparación exacta, Safari/iOS/tablet físicos y revisión visual del propietario.
- No probados guardado/recarga ni uploads contra backend real; permisos y persistencia siguen dependiendo del backend existente.
- Carga de medios puede dejar archivos remotos sin asociar si se cancela o falla parte de un lote; no se añade borrado remoto fuera de alcance.
- Retirar una foto del borrador no borra físicamente su archivo remoto.
- Ciudad/aliases requieren comprobación de persistencia en prueba futura autorizada.
- Sin integración sobre la base concurrente ni solución de archivos reservados en esta rama.
- Ningún cambio en datos reales, SQL, Hostinger, Staging, main o producción; ningún PR, merge o despliegue ejecutado.

Rollback propuesto:
- Descartar rama o revertir sus commits mediante commits normales, sin force push. No hay cambios de datos que revertir. No revertir calificaciones ajenas.

Recomendación/dictamen:
- APTO para revisión de código y capturas locales.
- No declarar fidelidad exacta, persistencia integrada ni despliegue.
- Coordinar comparación con referencia original, conciliación documental y pruebas posteriores autorizadas.
- Revisión del coordinador: PENDIENTE, reservada al coordinador.
- Integración/Staging: NO REALIZADOS por esta tarea.

## ENC-GLASS-EDITOR-001 — auditoría comparativa sin rediseño (2026-10-28T12:56:25.086Z)
Estado AUDITORÍA COMPLETADA / PRUEBAS LOCALES EJECUTADAS / 7 HALLAZGOS. Sin nuevo código funcional; NO INTEGRADO/NO DESPLEGADO.
Rama work/enc-glass-editor-001. HEAD de código revisado d49ec7004874a0004bf2cf8f03a67bd8b7a89de0, checkpoint de esta revisión b9ecd08e3ddf7a9077df49b37b7106695f01a4d0. ia-desarrollo vigente cad1222618c94f4eb3dabb589b6e58836191dcb7.
PR#3 abierto/no integrado al revisar; rama Work divergía con3 commits propios y10 detrás. No se aplicó PR#3, no se sustituyó el editor aprobado.
Fuentes: Work src/components/EditBusinessModal.tsx d80a5a83871f129b7c033343be859c5410830cc9; ia00eeb741068d731988cf13b6ee49edd12182016b. Se mantienen sin modificación.
Leídas instrucciones de tarea672c823b4e6f3c2547289cdd72e3f60ecb09f832 y ENC-UI-GLASS-001 (especificación de ficha pública, no sustituto de imagen original de editor). Prevalece orden actual de auditar/no rediseñar. La referencia original específica de editor no estaba disponible; no se afirma coincidencia pixel a pixel.

### Pruebas y método
- Copia aislada con consumidores actuales de ia y SOLO la implementación Work de editor sustituida para comprobar contrato, no merge ni checkout íntegro de la rama histórica.
- tsc --noEmit -p editor-audit-001/tsconfig.json: PASS.
- Vite directo en esa copia: PASS,1722 módulos, advertencia chunk>500kb.
- Chromium153/Playwright, node /tmp/enc-editor-audit-validation/test-audit.cjs: auditoría de26 criterios,19 cumplidos y7 hallazgos; adicionalmente control técnico de cero errores JS/solicitudes externas aprobado. EXIT0 del script indica auditoría completada, NO ausencia de regresiones.
- Por variante: ia6 criterios cumplidos/7 hallazgos; Work13 cumplidos/0 hallazgos EN LOS CASOS EXAMINADOS. No prueba exhaustividad ni seguridad backend.
- Datos sintéticos, upload503 interceptado y callbacks onSave en memoria con respuesta error/pendiente. Sin servidor completo, BD, SQL, migración o publicación real.
- SHA256 harness:9c5971d1f69b51d44faa780dacb58dab0ae10a23f62819b4ba545bea2cc471e3.
- Ambos renderizan en1440x1050 y390x844 sin desborde observado; clic exterior no cierra; error y pendiente de onSave no cierran ni muestran guardado confirmado. Horario sin editar se conserva en ambos.

### Siete hallazgos comprobados sobre ia actual
1. Horario de fixture “Lun, Mié, Vie09:15-17:30” precarga controles08:00/18:00. El texto no editado sí se preservó; riesgo de sobrescritura si se cambia el control semanal. La expresión de extracción aparece doble escapada.
2. WhatsApp vacío se rellena con9381234567 del teléfono de fixture. No se demostró que ese teléfono tenga WhatsApp.
3. Pago heredado “Pago corporativo al cierre de mes” se envía como “Efectivo, Transferencia Bancaria (SPEI)” sin editar.
4. Modalidad “Servicio únicamente mediante cita” se envía como “Atención en el Local de la empresa” sin editar.
5. Sin teléfono ni WhatsApp se invoca onSave1 vez; frontend no bloquea ese caso.
6. Doble clic rápido durante pendiente invoca onSave2 veces. No demuestra dos filas ni persistencia duplicada en BD; son dos callbacks.
7. Upload503 sustituye preview por dataURI local. Es observación de fallback del helper, NO prueba de subida remota ni de escritura ficticia en BD. Debe comunicarse como borrador o rechazarse según contrato; verificar persistencia antes de tratarlo como carga remota.
Work supera estos mismos13 criterios: horas09:15/17:30, WA vacío, campos heredados preservados,0 callbacks sin contacto,1 callback en doble envío y preview previo conservado ante upload503.

### Compatibilidad y diferencias visuales
Props onSave/onClose/business y consumidores actuales compilaron. Work usa payload de campos sucios, guardas de guardado/upload y protección de sesión; son mejoras funcionales candidatas a portado selectivo.
Las capturas muestran diferencias materiales de ancho, espaciado, tipografía y ubicación (dirección/CP vs colonia/ciudad), aunque ambas son Glass. Mejor comportamiento en estos casos NO autoriza reemplazar el diseño que el propietario aprobó.
No se incorporó la nueva sección logo de la rama Logo/Maps. Coordinación deberá conciliar preservación de campos, payload de logo y diseño aprobado de forma explícita; copiar un archivo entero puede perder cambios de otra tarea.
Autenticación real/persistencia continúan siendo dependencias; un isAdmin de cliente no sustituye guard servidor. El editor por sí solo no prueba operaciones autorizadas ni MariaDB.

### Evidencia y cambios publicados
Paquete común: https://chatgpt.com/library?file_id=libfile_1d6fb1057d78819184c5920af2051d53&account_id=personal
Carpeta Editor-auditoria:4 PNG (ia y Work en escritorio/móvil), todos sintéticos, Work rotulado NO APLICADA. Capturas desktop revisadas visualmente.
Solo se modifican docs/WORK_RESULTADOS.md y docs/work-progress/ENC-GLASS-EDITOR-001.md en esta revisión. Código de editor intacto. Sin refactor/diseño/cambios API/servidor/App/auth/DB/dependencias.
El entorno local quedó no disponible durante una renovación posterior de capturas de otra tarea. Estos26 criterios ya habían terminado y sus resultados/capturas estaban guardados; no se inventan nuevas ejecuciones.

### Recomendación y dictamen
NO APTO para sustitución automática mediante PR#3 ni despliegue basado solo en esta auditoría.
APTO para revisión de hallazgos/contrato de editor. Preservar diseño aprobado; acordar cuál fuente visual conservar y portar únicamente lógica necesaria con pruebas, sin sobreescribir otros módulos.
Priorizar preservación de pago/modalidad/WA, parser de horarios y exclusión inmediata de doble envío; revisar semántica de uploaddataURI. Persistencia real y pruebas autorizadas de sesión/BD quedan pendientes. No se aplicó ninguna corrección de UI bajo una orden de solo revisión.
Rollback de esta revisión: revertir únicamente commits documentales; no hay código/datos nuevos que revertir. Esperando coordinación, sin PR/merge/despliegue/SQL.
