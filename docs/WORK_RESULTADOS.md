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

## ENC-REVIEWS-COMMENTS-002 — entrega parcial segura (2026-10-28T11:06:15.592Z)
Estado: PROBADO_POR_WORK en entorno simulado; ACTIVACIÓN PÚBLICA Y MODERACIÓN BLOQUEADAS.
Rama work/enc-reviews-comments-002; base 1455e568a93629dcd7ae3f58df61d03c76a64f4d.
Checkpoint 0297bf369cb2bac1fc90cd15d3df1ff886643248; implementación ef220ce878f1cb5371452fecfc0c32270a9ceab7.
Instrucción 92380799f74dd3c04f302733c49b4bc5fc2f7ffa. Leídos WORK_INSTRUCCIONES (c4ef37ba0f690f60cd9fb5189190afd2be9a8faa), CONTEXTO, COMMENTS-001 y código de base. Sin actualizar CONTEXTO por regla de alcance.

### Implementación
- StarRatingWidget: selección de puntuación sin envío inmediato; texto opcional, contador/vista previa, confirmación explícita; quitar/corregir comentario sin perder borrador por rechazo. Errores y reconciliación del voto existentes conservados.
- BusinessComments.tsx/CSS: lista paginada con abort/generación para respuestas obsoletas, DTO sin IP/visitor_id, texto renderizado por React, cero nombres/fechas/fotos inventados. Página vacía diferenciada de indisponibilidad. Sin fechas porque el contrato no las garantiza.
- BusinessCommentsPolicy.tsx: política compartida server/repositorio/cliente, NFKC, controles/bidi/invisibles rechazados, texto 10–200 unidades UTF-16 (mínimo por caracteres) y 800 bytes, sin HTML/código/enlaces/contactos/direcciones identificables; heurísticas conservadoras de español, insultos, amenazas/publicidad y repetición. No servicios externos/dependencias nuevas. Lenguaje y datos personales NO se detectan con garantía absoluta; falsos positivos/negativos requieren moderación humana.
- Contrato compatible POST /api/ratings con comment opcional; límites 200 del esquema/contrato existente conservados en lugar de 500 propuestos; estrellas sin comentario siguen disponibles bajo RATINGS_SCHEMA_APPROVED.
- GET /api/ratings/:businessId/comments?limit=1..20&cursor=<id público>: consulta parametrizada, máximo 21 filas exploradas, filtrado también sobre legado; cursor opaco de fila, no fecha cronológica. IDs públicos de comentario, puntuación y texto únicamente.
- JSON restringido a 2kb para /api/ratings antes del parser global; esquema estricto. Límites por minuto: IP 30 escrituras/120 lecturas, visitante 5, negocio 60, mismo texto/negocio 1; Retry-After 60. Mapa acotado a 5000 claves, HMAC efímera de IP sin persistencia/logs. Límite por proceso: no sustituye control distribuido, bots/desafío ni identidad humana; verificar proxy antes de activación.
- RATINGS_COMMENTS_APPROVED debe ser exactamente true para lectura y publicación. DEFAULT OFF. No se cambió ninguna variable real. Repositorio también falla cerrado. Sin comentario, las estrellas no dependen del nuevo gate.
- POST .../comments/:commentId/moderation devuelve siempre 403; no mutación ni confianza en isAdmin/token del cliente. No implementa eliminación. No se habilitaron controles administrativos.
- Repositorio reutiliza business_ratings.comment, transacción/lock/índice UNIQUE existentes. No columnas/tablas nuevas ni migración propuesta/ejecutada. Consultas parametrizadas escritas en código para revisión futura; NINGUNA consulta fue ejecutada contra BD.

### Bloqueos
1. Moderación, reporte persistente, auditoría/retirada y bloqueo urgente por comentario NO implementados: gestión de contraseña administrativa permite cambio sin autorización fiable. El token efímero servidor existente no basta para confiar en la identidad de administrador. Cambiar autenticación global queda fuera del alcance.
2. AdminBusinessesTab.tsx fue identificado inequívocamente como panel real ANTES de editar; se mantuvo sin cambios por el bloqueo anterior. No se entregan los dos controles eliminar; módulo NO completo.
3. PR #4 seguía abierto/no integrado al comenzar. Se respetó la precondición: base ia-desarrollo 1455e568a93629dcd7ae3f58df61d03c76a64f4d, sin editar BusinessPublicDetail, su CSS, adaptadores, App ni logo. Montaje en widget compartido actual. Tras integración de Glass, coordinación debe resolver su aviso estático anterior “Comentarios todavía no disponibles” antes de activar texto. No se mezcló la rama Glass.
4. Sin pruebas reales de MariaDB, esquema activo, permisos, concurrencia de BD o dos navegadores contra persistencia real. Activar texto requiere revisión de esquema ya aprobado, pruebas autorizadas de persistencia y moderación/plan de abuso seguro. NO APTO para habilitación pública ahora.

### Pruebas realmente ejecutadas
- tsc --noEmit -p comments-002/tsconfig.json: PASS.
- vite build directo, sin scripts de versión: PASS, 1723 módulos; advertencia chunk >500kb.
- node /tmp/enc-comments-validation/test-routes.cjs: 37 PASS. Política, español/crítica negativa, URLs espaciadas/fullwidth, email/teléfono/dirección, HTML, Unicode invisible/bidi, repetición, idioma inglés evidente, insulto separado, amenaza, publicidad, tamaño, esquema, GET en cliente separado, duplicado/carrera simulada, 400/403/409/413/429/503, gate cerrado y estrellas sin texto.
- node /tmp/enc-comments-validation/test-browser.cjs: 13 PASS en Chromium 153. Confirmación explícita, negativo 1 estrella, recuperación mediante GET, 1440x1050/834x1112/390x844, borrador rechazado sin envío, quitar texto, pendiente/doble envío bloqueado, 400/409/429/503 sin éxito falso, gate cerrado y cero errores JS.
- HTTP de pruebas real local con repositorio EN MEMORIA y API browser interceptada. Se extrajo únicamente registerRatingsRoutes para el harness; NO se importó/ejecutó el servidor completo, NO se abrió conexión MariaDB y NO se ejecutó SQL.
- La prueba inicial descubrió evasión de dominio con letras espaciadas; corregida y repetida batería 37/37. No se afirma eficacia total del filtro.
- Capturas sobre ficha existente de la base, no Glass aún sin integrar. Logo Glass no modificado; 12 responsive de la corrección siguen en rama Glass, no se atribuyen a estas pruebas.

### Evidencia y archivos
4 capturas sintéticas: comentarios desktop/tablet/mobile y gate cerrado:
https://chatgpt.com/library?file_id=libfile_2bcafafc336c81919b5b5d39ac891ae3&account_id=personal
Archivos modificados: server.ts, src/db/mariadb.ts, src/services/api.ts, src/utils/realRatings.ts, src/components/StarRatingWidget.tsx; nuevos src/components/BusinessComments.tsx, BusinessCommentsPolicy.tsx, BusinessComments.css; WORK_RESULTADOS y progreso de esta tarea.
Sin App, editor, Radar, auth global ni dependencias. No PR/merge/despliegue/SQL. Rollback propuesto: revertir commits de esta rama en una integración futura; gate default off conserva no publicación de texto. No rollback de datos porque no se escribió BD.
Dictamen: APTO PARA REVISIÓN DEL CÓDIGO PREPARADO; NO APTO PARA ACTIVAR COMENTARIOS PÚBLICOS NI MODERACIÓN. Se concluye el trabajo seguro posible y continúa Radar sin nueva espera.

### Verificación adicional de cierre — 2026-10-28T11:21:02.702Z
- Compilación aislada del backend completo con esbuild --bundle --platform=node --format=esm --packages=external --outfile=/tmp/enc-comments-validation/server.bundle.mjs: PASS. Solo compilación, jamás ejecución de servidor ni conexión/consulta.
- Rutas/política harness SHA256 bd33b1a54ec10bfc204731d2ae2e95c2017007ecc2b2f5d5c1f02897d91e4657; navegador 90646a3aca5011100b407ce41db880db1ff07997e3cad8a841185b4914bacaec.
- Los ocho archivos de código publicados fueron leídos de vuelta y coinciden exactamente con la copia probada.
- Cambio concurrente verificado: PR #4 ya fue integrado por coordinación en cad1222618c94f4eb3dabb589b6e58836191dcb7 después de la base de esta tarea. Work no integró ni rebasó Comentarios. Se mantiene la dependencia de adaptar el aviso estático de Glass en integración revisada; código de logo intacto.
- Entrega final sigue siendo PARCIAL PREPARADA, gate default off y moderación bloqueada. No activar ni declarar módulo completo.

### Corrección final de parser de ratings — 2026-10-28T11:22:37.597Z
Se detectó que el parser JSON de 2kb no impedía que cuerpos no JSON llegaran al parser urlencoded global de 50mb. Corregido exclusivamente en /api/ratings: POST no JSON devuelve 415 antes de parsear y Content-Length >2048 devuelve 413; el parser JSON mantiene límite para cuerpos chunked/descomprimidos. No se cambió el parser de otras rutas.
Se extrajo también el middleware REAL al harness: 38 pruebas de política/rutas/middleware PASS, incluidas 413 y 415; TypeScript y bundle esbuild del backend PASS. Harness rutas actualizado SHA256 b7f41ffa06712883fccf80bd1a4d2ae3cae8c0a175d6453323d9e23e7c8c44a2. Una ejecución inicial del harness falló por resolución de body-parser al empaquetar Express; se marcó Express externo en el harness y la batería completa pasó. No es fallo de aplicación.
La batería Chromium de 13 PASS sigue vigente: no hubo cambios frontend tras ella. Gate cerrado por defecto y bloqueos administrativos intactos. Sin servidor completo, SQL ni BD.

### Salida del borrador si cae disponibilidad — 2026-10-28T11:24:35.640Z
Añadido botón “Quitar comentario”, disponible aunque la consulta de comentarios falle, salvo durante envío. Corrige el caso en que textarea queda deshabilitado con borrador y el visitante necesita confirmar solo estrellas. La batería completa Chromium ahora pasa 14/14, incluido cambio a 503 durante borrador y envío posterior sin texto. TypeScript y Vite PASS. Las 38 pruebas backend/política siguen vigentes; sin cambios backend en este commit.
Harness navegador final SHA256 9cb52b2ff54c33bf5edd8e636d8708d4a66f807ffd8b8de69213f08dcc8d96d2. Cuatro capturas regeneradas en el mismo enlace anterior. Gate cerrado por defecto, sin activación, moderación, SQL ni persistencia real probada.

## Compatibilidad con Glass vigente — 2026-10-28T12:02:13.646Z
Base vigente ia-desarrollo cad1222618c94f4eb3dabb589b6e58836191dcb7. Rama existente revisada, HEAD anterior 03fe644b729b8fa8d04428e2b639cecd2ea2ac84; sin rebase, merge ni duplicación de implementación.
Cambio limitado a BusinessComments.css: el aviso estático anterior de Glass se oculta SOLO si existe el nuevo módulo de comentarios en esa misma tarjeta. El módulo nuevo conserva su propio mensaje de indisponibilidad/gate cerrado; no se oculta un fallo ni se afirma publicación. No se copiaran archivos Glass desde otra rama ni se modifica su diseño/logo.
Pruebas repetidas: 38 política/rutas PASS y 14 Chromium PASS; TypeScript y Vite PASS. Nueva composición local de shell Glass aprobado (solo lectura) + widget de esta tarea mediante alias de harness: 9 PASS (ambas entradas en 1440/834/390/320, comentarios de una estrella con API mock, aviso no duplicado, logo en posición aprobada, gate503 honesto y cero errores JS). Esto es prueba de contratos en bundle aislado, NO merge ni persistencia real.
Moderación y publicación permanecen cerradas: nueva contención auth en rama independiente 48bbba2016b8a66b06de5a5139474bcb73524358 tampoco habilita credenciales ni persistencia. Sin auditoría/retirada segura ni esquema autorizado, no se añade eliminación desde ficha/panel. Continúan contrato público preparado, conservación de estrellas y gate default off.
Evidencia local nueva en /tmp/enc-comments-glass-validation; paquete de capturas se enlazará con la entrega secuencial. Recomendación: revisar patch sobre ia vigente y adaptar integración por coordinación, sin habilitar gate. Estado PROBADO LOCALMENTE; NO INTEGRADO/NO DESPLEGADO.
