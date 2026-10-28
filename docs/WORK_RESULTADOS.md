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

## ENC-GLASS-BUSINESS-DETAIL-001 — implementación pública Glass (2026-10-28T04:18:29.603Z)

Estado: IMPLEMENTADO / VALIDADO LOCALMENTE / PENDIENTE REVISIÓN. Sin integración ni despliegue.
Rama exclusiva: work/enc-glass-business-detail-001. Base: 1455e568a93629dcd7ae3f58df61d03c76a64f4d.
Instrucción leída en coordinación: docs/work-tasks/ENC-GLASS-BUSINESS-DETAIL-001.md, blob 0fed70695b99d49cd7bfb3974db7f8d78db43150; autorización de implementación vigente.
Checkpoints: 028a3007546e4b6488bfc79825160c9e8aa5d1d1 (inicio), 119e41054c50a8e81654078db8d1fb055a58b2b8 (implementación), 3d60b0b3fc1592a7cf0d5b13f5790a661ae10f04 (ajustes comprobados). El commit de este documento cierra la evidencia.

### Trabajo y alcance
- Nuevo BusinessPublicDetail y CSS encapsulado bpd-*: tres columnas Glass con transparencias, bordes claros, jerarquía navy, botones verde/azul, tarjetas de descripción, identidad, ubicación, horario, pagos y entrega. Dos columnas en tableta y una en móvil.
- BusinessDetailModal y DirectBusinessView son adaptadores del mismo componente; conservan firmas y callbacks públicos. App.tsx NO requirió cambios; conserva montaje, rutas e infraestructura SEO existente.
- Galería deduplicada con conteo de fotografías reales, miniaturas, flechas, lightbox, navegación por teclado, Escape, foco y restauración de scroll. Si una imagen no existe/falla, se muestra un estado honesto.
- Favoritos y QR conservan callbacks del montaje. Landing/compartir utilizan getBusinessPublicUrl en el dominio activo; clipboard await con error visible. Contactos mexicanos válidos; WhatsApp solo con campo registrado, sin suponerlo desde teléfono.
- Ubicación: dirección registrada y enlace HTTP(S) registrado o coordenadas válidas. Tarjeta gráfica de ubicación, NO mapa geográfico ni pin deducido del nombre; no se añadió proveedor de mapas. Horarios libres no se convierten en “abierto ahora”. Sin marcas de pago ni paquetería inventadas.
- Calificaciones: StarRatingWidget/useBusinessRatings/API permanecen byte a byte iguales a base; resumen compacto y widget consultan los datos reales del contrato existente. Sin promedio del catálogo ni reseñas de muestra. Comentarios declarados todavía no disponibles, sin botón que finja publicarlos.
- Gestión: acceso abre únicamente aviso informativo; editar/recomendar/TOP/eliminar están deshabilitados. Sin formulario de credenciales/PIN, llamadas administrativas ni callbacks inseguros. Autenticación, eliminación y persistencia siguen fuera de alcance.
- DigitalCardModal: elimina teléfono ficticio 938 389 5009 y ubicación predeterminada, usa URL del entorno y confirma copiado únicamente tras resolver clipboard; error visible y cancelación de compartir sin éxito ficticio. Exportación/canvas/proveedor QR existentes conservados.

### Archivos publicados (lista cerrada)
1. src/components/BusinessPublicDetail.tsx (nuevo)
2. src/components/BusinessPublicDetail.css (nuevo)
3. src/components/BusinessDetailModal.tsx
4. src/components/DirectBusinessView.tsx
5. src/components/DigitalCardModal.tsx (ajuste localizado)
6. docs/WORK_RESULTADOS.md (esta entrada añadida al historial)
7. docs/work-progress/ENC-GLASS-BUSINESS-DETAIL-001.md

Revisados para compatibilidad sin modificarlos: App.tsx, BusinessCard.tsx, types.ts, StarRatingWidget.tsx, utils/realRatings.ts, utils/businessUrl.ts, utils/phone.ts, services/api.ts, EditBusinessModal.tsx, db/mariadb.ts, server.ts, package.json, tsconfig.json, vite.config.ts e index.css. No se escribieron helpers, servidor, autenticación, widgets de calificaciones, Radar, SQL ni archivos del editor.
Verificación de hashes Git de la copia aislada: App.tsx, StarRatingWidget.tsx, realRatings.ts, api.ts y server.ts coinciden con los blobs de base.

### Validación ejecutada
Entorno aislado: /workspace/scratch/e1cd9bd12722/business-detail-001; dependencias temporales externas al repositorio, sin cambiar package.json ni lockfile. TypeScript 7.0.2, Vite 8.3.5, Chromium 153.0.8010.0, Playwright.
- /tmp/enc-reviews-tools/node_modules/.bin/tsc --noEmit -p business-detail-001/tsconfig.json: EXIT 0.
- Desde la copia aislada: /tmp/enc-reviews-tools/node_modules/.bin/vite build --outDir /tmp/enc-detail-validation/vite-dist --emptyOutDir: EXIT 0; 1722 módulos; JS 1359.79 kB (gzip 295.57), CSS 246.91 kB (gzip 30.53). Advertencia por chunk mayor de 500 kB; no bloqueante; optimización global fuera de alcance. No se ejecutó npm run build ni prebuild, que generan cambios de versión.
- Bundle de harness: esbuild con imports de ambos adaptadores y DigitalCardModal, React real y CSS de la compilación. Solo servidor HTTP estático local; NO se inició server.ts ni se cargaron conexiones de BD.
- node /tmp/enc-detail-validation/test-detail.cjs: EXIT 0, 23 comprobaciones aprobadas, cero errores JavaScript.
- Harness SHA256: 6b302e65d815e08ee1c1bcb0c0682b58212072cedf131575d0409c4105029024.
- Fixtures sintéticos: negocio 4242/IDs de reinicio, café de prueba, siete SVG locales, teléfono/WhatsApp de muestra, horario, pagos y coordenadas; no se guardaron en el proyecto ni en servidores.
- HTTP ratings GET/POST interceptado, respuestas sintéticas según contrato. Se verificó el UI con 4.5/8 votos, POST pendiente (botones bloqueados), confirmación válida 4.6/9, 400 sin éxito, 409 con reconciliación y 503 sin agregado anterior.
- Ambas entradas: 1440x1050 escritorio (3 columnas), 834x1112 tableta (2), 390x844 y 320x700 móvil (1), sin desborde horizontal y blur aplicado.
- Conteos/miniaturas, flechas, Escape/retorno de foco, favoritos, enlace de entorno/landing/QR, clipboard rechazado, ausencia de contactos/dirección/fotos/pagos/horarios, URLs javascript y teléfonos inválidos comprobados.
- Cuatro botones administrativos deshabilitados, cero callbacks administrativos, cero requests API administrativos.
- Todas las solicitudes externas interceptadas y bloqueadas. Una solicitud al proveedor QR externo YA EXISTENTE fue abortada deliberadamente. El servicio QR real y el lienzo/exportación PNG no se validaron end-to-end.
- La prueba inicial encontró desborde a 320px y retorno incorrecto de foco tras cerrar galería; se corrigieron (minmax(0,1fr), toolbar flexible y retorno explícito) y se repitió la batería completa: 23/23 PASS.

### Evidencia visual
14 PNG: modal/direct en desktop/tablet/mobile/narrow; mobile-inferior en ambas; galeria, gestion-bloqueada, datos-ausentes y calificaciones-no-disponibles.
Revisadas visualmente capturas de escritorio y móvil. Incluyen marca “PRUEBA LOCAL · DATOS SINTÉTICOS · SIN BD”.
Paquete: ENC-GLASS-BUSINESS-DETAIL-001-capturas.zip
https://chatgpt.com/library?file_id=libfile_23484adb5af08191acfebeda27fd0db4&account_id=personal
No se afirma coincidencia pixel a pixel con la imagen aprobada: se reproduce su composición y lenguaje Glass con contenido disponible, estados honestos y sin reseñas ficticias ni mapa inventado.

### Riesgos y pendientes para coordinación
- NO se validó persistencia ni concurrencia real de MariaDB; API simulada, sin SQL ni conexión. Integración de calificaciones sigue bajo coordinación.
- Autenticación/administración/eliminación continúan bloqueadas en estas fichas; necesitan tarea independiente con contrato seguro. No habilitar esos controles solo por isAdmin.
- Proveedor QR externo y exportación existentes conservan sus dependencias; requieren revisión funcional futura en un entorno autorizado.
- Las dos instancias del widget (resumen y formulario) consultan el mismo contrato y evento de actualización; no se introdujo un caché global nuevo.
- Revisar visualmente con logos/fotos y textos reales, además de Safari/iOS/VoiceOver; solo Chromium local comprobado. La tarjeta de ubicación no integra mapa interactivo.
- Código sin nuevas dependencias. Revisar diff contra base fija; ia-desarrollo seguía en 1455e568a93629dcd7ae3f58df61d03c76a64f4d al cierre de verificación. No se rebasó ni fusionó ninguna rama compartida.
- No hay bloqueo para revisión del diseño público. La funcionalidad administrativa pendiente no se implementó ni se simuló.
Dictamen: APTO PARA REVISIÓN DE COORDINACIÓN DEL DISEÑO PÚBLICO; NO autorización de integración, despliegue, administración o ejecución SQL. Esperando revisión.

## Corrección aprobada: ubicación del logotipo — 2026-10-28
Estado: IMPLEMENTADA / 12 comprobaciones enfocadas aprobadas / PENDIENTE REVISIÓN.
Autorización: instrucción directa del propietario; único cambio visual solicitado, sin nueva auditoría.
Rama: work/enc-glass-business-detail-001.
Base de esta corrección: 5cf6213e0974e0b534d65b252a67eb9f344071f7.

### Cambio
- Se mueve el bloque existente bpd-identity fuera de bpd-facts para darle posición independiente en la cuadrícula. Hay un solo bloque y se conservan logo, texto alternativo y fallback de identidad.
- Escritorio >1100px: misma zona superior derecha; altura de 175px y separación vertical de 12px respecto a ubicación.
- Tablet 701–1100px: primera fila derecha, junto al inicio de la galería, antes del contenido central.
- Móvil <=700px: inmediatamente después de la cabecera con nombre y antes de galería/contactos y demás secciones; altura existente de 150px.
- Ajuste de selectores nth-child de los iconos informativos para conservar sus colores al retirar el logo del contenedor anterior.
- Sin cambios de handlers, contratos, backend, editor, calificaciones ni administración. Verificación estática: al retirar el bloque de identidad y normalizar espacios, el TSX restante es idéntico a la base; el propio bloque también es idéntico.
- Archivos de código modificados: únicamente src/components/BusinessPublicDetail.tsx y src/components/BusinessPublicDetail.css. Documentación: este registro y docs/work-progress/ENC-GLASS-BUSINESS-DETAIL-001.md.

### Pruebas
Copia aislada: /workspace/scratch/e1cd9bd12722/business-detail-001.
Se reconstruyeron las dependencias temporales fuera del repositorio porque /tmp de la sesión previa ya no existía. Sin modificar package.json ni lockfile.
- TypeScript 7.0.2: /tmp/enc-reviews-tools/node_modules/.bin/tsc --noEmit -p tsconfig.json desde la copia: EXIT 0. Un intento inicial utilizó ruta relativa duplicada; se corrigió y ejecutó correctamente.
- Vite 8.3.5: /tmp/enc-reviews-tools/node_modules/.bin/vite build --outDir /tmp/enc-logo-validation/vite-dist --emptyOutDir: EXIT 0, 1722 módulos. Advertencia existente: chunk JS >500kB; no se amplió el alcance para optimización.
- Chromium 153.0.8010.0 / Playwright: node /tmp/enc-logo-validation/test-logo.cjs: EXIT 0; 12 comprobaciones aprobadas.
- Ambas entradas: modal y DirectBusinessView. Escritorio 1440x1050, tablet 834x1112, móvil 390x844 y pantalla estrecha 320x700.
- Aserciones geométricas: único bloque de logo, alineación superior derecha en escritorio/tablet; en móvil, heading.bottom <= logo.top y logo.bottom <= galería.top; logotipo visible en el primer viewport; sin desborde horizontal.
- Identidad alternativa sin logo comprobada en ambas entradas móviles.
- Favoritos y apertura/cierre de galería conservados; widget de estrellas y mensaje honesto de comentarios presentes.
- Cero errores JavaScript y cero solicitudes externas. Solo GET de ratings interceptado con respuesta sintética; no se enviaron calificaciones ni se iniciaron backend/BD.
- Revisión visual de capturas de tablet y móvil.
- El binario Chromium temporal funcionó tras extracción; el helper automático notificó fallo chown de fuentes, sin impedir la ejecución real de las pruebas. No es un error del producto.
- Harness SHA256: 97a10a32f7761f29e97559e23e515f39b53ca909507ebcb273e8c958689885d4.

### Capturas corregidas
Paquete: ENC-GLASS-BUSINESS-DETAIL-001-correccion-logo-capturas.zip
https://chatgpt.com/library?file_id=libfile_88c5cb58cfd8819190823148c91163d7&account_id=personal
Diez PNG únicos, datos sintéticos y marca “PRUEBA LOCAL · DATOS SINTÉTICOS · SIN BD”:
modal-desktop-logo.png, modal-tablet-logo.png, modal-mobile-logo.png, modal-narrow-logo.png,
direct-desktop-logo.png, direct-tablet-logo.png, direct-mobile-logo.png, direct-narrow-logo.png,
modal-mobile-sin-logo.png y direct-mobile-sin-logo.png.
Enlace registrado en la documentación publicada en GitHub; sin añadir archivos binarios fuera de la lista autorizada.

### Riesgos, pendientes y dictamen
Sin bloqueo real para esta corrección. Validación limitada a Chromium local y datos sintéticos; Safari/iOS y revisión del propietario siguen pendientes.
No se ejecutaron SQL, migraciones, despliegues, fusiones ni conexiones a bases de datos. No se modificaron producción, Staging, main, ia-desarrollo ni otras ramas.
Dictamen: APTO PARA REVISIÓN FINAL DE LA CORRECCIÓN DEL LOGOTIPO. Esperando coordinación; sin integración ni despliegue.

## ENC-GLASS-LOGO-MAPS-002 — entrega condicional (2026-10-28T12:54:14.829Z)
Estado IMPLEMENTADO (frontend condicionado), PROBADO LOCALMENTE, NO VERIFICADO POR COORDINACIÓN, NO INTEGRADO, NO DESPLEGADO.
Rama work/enc-glass-logo-maps-002; base cad1222618c94f4eb3dabb589b6e58836191dcb7.
Commits previos de esta tarea: 0e04ac0c8baadde35217db4fe9527e3cc5fdcb32 (alcance), d2a0224cb9517f114cfaef657f9c517cef07f343 (implementación), 05400585ad4618d89f6cea097627dd78e49dc2e9 (protección de guardado).
Instrucción e6766270ac99949888ee71bd4ade625d0ab0ccdb.

### Logo independiente
- types.ts añade únicamente logo_url opcional. Contrato leído: PATCH combina req.body; dbSaveBusiness serializa objeto en raw_data; dbLoadAllBusinesses devuelve ...extra; fetchBusinesses conserva datos. Esto demuestra compatibilidad de CÓDIGO, no existencia/estado de columna activa ni persistencia real.
- Editor vigente se conserva; sección adicional dentro de fotografías: preview, subir/cambiar/quitar logo separado de image y gallery. Etiqueta antigua pasa a Fotografía de portada. No se sustituyó por el editor PR#3.
- Campo requiere GET /api/admin/session exitoso, expiración vigente y permiso business:manage comprobado por servidor, no isAdmin/flag local. Se revalida al cargar/guardar; ausencia del endpoint/sesión mantiene campo deshabilitado. Credenciales reales y proveedor seguro siguen bloqueados en tarea Auth independiente.
- JPEG/PNG/WebP hasta5MB; carga por contrato existente. El helper legado devuelve dataURI ante fallo; nuevo campo rechaza ese falso URL remoto y conserva logo previo. Preview es borrador hasta callback onSave confirmado; no afirma BD.
- Guardado nuevo de logo filtra campos no editados. Pruebas exigen payload de única clave logo_url cuando solo se cambia/quita logo; conserva portada, galería, horario, pago y modalidad heredados en mock. Exclusión de doble envío y epoch antes/después de API impiden enviar resultado obsoleto tras cambiar negocio.
- Flujo general sin editar logo mantiene el editor existente: sus siete hallazgos se documentan aparte, no se pretende haberlos corregido globalmente.
- Ficha pública usa logo_url válido, no lo deduce de portada/galería. Ausente/roto devuelve inicial y nombre. Posición aprobada intacta en desktop/tablet/celular.

### Google Maps
- Solo hosts Google Maps HTTPS admitidos; rechaza dominios ajenos, credenciales URL, puerto no estándar, HTML y URL con key.
- URL compartida /maps/embed?pb=... validada se canonicaliza y puede cargar iframe tras consentimiento. Sin iframe automático al abrir; título accesible, lazy, referrer de origen, ancho mínimo comprobado, fallback ante error/CSP y enlace externo siempre que haya ubicación válida.
- Coordenadas numéricas válidas generan enlace Google Maps exacto. Sin URL embed admitida/configuración, NO se fabrica iframe ni pin por nombre/dirección; permanece alternativa honesta. Enlaces cortos Maps no se resuelven ni se incrustan.
- Referencias primarias consultadas: https://developers.google.com/maps/documentation/embed/embedding-map y https://support.google.com/maps/answer/7101463 . No se crearon claves, cuentas de facturación ni configuración. Generación automática de Embed API desde coordenadas queda pendiente de configuración autorizada; esta entrega admite URL compartida existente.
- No se contactó Google Maps desde las pruebas; iframe explícitamente simulado. CSP real de Hostinger/Google y mapa real siguen sin verificar.

### Pruebas confirmadas
- tsc --noEmit -p logo-maps-002/tsconfig.json: PASS.
- Vite directo desde copia de la tarea: PASS; advertencia chunk>500kb. Un intento inicial usó directorio base incorrecto y fue corregido; la compilación final sí corresponde a esta tarea.
- Política pura de mapas: 23 PASS (coordenadas nulas/vacías/NaN/fuera de rango/0 válido, URLs falsas/HTML/key, embed canónico/enlace corto).
- Chromium153: última batería COMPLETA CONFIRMADA 23 PASS. Ambas entradas desktop1440/tablet834/mobile390/narrow320; logo/portada separados y posición intacta; logo ausente/roto; consentimiento/embed mock/título/lazy/enlace; coordenadas sin embed; URL inválida; carga/quitar/guardar/reabrir mock; datos heredados sin sobrescribir; refresco, falta/vencimiento de permiso, 503/dataURI, fallo de save sin cerrar, MIME inválido, cambio de negocio durante validación y CSP bloqueado. Cero errores JS ni solicitudes externas reales en esa batería.
- SHA256 batería completada: 11cc423fce18b79bf83b3b35779dce6b96285b73f1d7ed56271a02f377490578 (browser); 2013b79ff52c958df8b0f84787135f37724e822762f629ddb133b815571a6a01 (política).
- API de sesión/upload, callback de guardado y contenido iframe SIMULADOS; jamás prueba de persistencia MariaDB.
- Ajustes del harness: input file oculto en details, errores duplicados heredados, sesión de fixture entre casos y script de storage inyectado en iframe CSP. Corregidos en harness y batería completada 23/23. No se cuentan intentos incompletos como PASS.

### Evidencia, interrupción y límites
Paquete común: https://chatgpt.com/library?file_id=libfile_1d6fb1057d78819184c5920af2051d53&account_id=personal
Carpeta Logo-Maps: 12 PNG sintéticos. Imágenes de iframe rotuladas SIMULADO, no mapa real. La captura editor-logo-independiente.png quedó con Opciones adicionales plegadas y NO debe tomarse como prueba visual del campo desplegado; el campo/callback se verificó por pruebas, pero esa captura requiere renovación. El rótulo del iframe mock muestra además un problema de charset del fixture, no evidencia del proveedor.
Se inició un retoque de ambas capturas/harness y el entorno local quedó NO DISPONIBLE. Esa última ejecución fue interrumpida/no confirmada; NO sustituye ni aumenta el resultado 23 PASS previo. Los cambios funcionales ya estaban publicados y no se modificaron después. Se concluye documentación mediante GitHub; nueva captura/editor desplegado y proveedor real quedan pendientes.

### Alcance y coordinación
Modificados únicamente src/components/BusinessPublicDetail.tsx/.css, src/components/EditBusinessModal.tsx, src/types.ts, docs/WORK_RESULTADOS.md y docs/work-progress/ENC-GLASS-LOGO-MAPS-002.md.
Solo lectura: servidor, API, db/mariadb, normalización/uploader/App. Sin SQL, migraciones, DB real, auth global, comentarios/Radar ni dependencias.
Auth y Logo/Maps son ramas independientes sobre la misma base: las capturas de esta rama no incorporan el π de Auth. Coordinación debe resolver hooks/imports/CSS compartidos preservando ambos cambios; no se hizo merge ni copia del editor PR#3.
Bloqueos: sesión/credenciales seguras para habilitar edición; persistencia real y esquema activo no verificados; configuración Embed desde coordenadas; evidencia visual adicional/Safari por entorno no disponible. No requiere migración propuesta para logo bajo contrato raw_data inspeccionado; no se autorizó operar la BD.
Rollback propuesto de código: revertir commits de esta tarea en revisión futura; no hay datos escritos que revertir. No restaurar auth insegura para habilitar el campo.
Dictamen APTO PARA REVISIÓN DEL FRONTEND PREPARADO; NO APTO PARA DECLARAR LOGO PERSISTIDO REAL, EMBED REAL VERIFICADO O DESPLEGAR COMO FUNCIONALIDAD COMPLETA. Pendientes y bloqueos explícitos, sin integración.

## Recuperación Work 02 y cierre de evidencia pendiente — 2026-10-28T17:11:21.871Z
Estado: FRONTEND IMPLEMENTADO PREVIAMENTE; NUEVA EVIDENCIA LOCAL REAL OBTENIDA; SIN PERSISTENCIA REAL. HEAD de código recuperadoa6b10a9b4f90dce4a9922e719c60ea08f2de451b, implementación d2a0224cb9517f114cfaef657f9c517cef07f343 y protección de payload05400585ad4618d89f6cea097627dd78e49dc2e9. ia-desarrollo comprobadacad1222618c94f4eb3dabb589b6e58836191dcb7. Instrucción oficial e6766270ac99949888ee71bd4ade625d0ab0ccdb y reglas generales c4ef37ba0f690f60cd9fb5189190afd2be9a8faa, en coordinación51ae3a45a6f82bc8fcec9f02432835f312ce8c02.
No se repitió implementación. Se preservan campo logo independiente y payload limitado, controles de sesión/permisos, fallback, posición responsive y mapa con consentimiento/URL segura. Sin proveedor seguro, campo de logo sigue deshabilitado.

### Evidencia nueva y procedencia
[ENCARMEN-recuperacion-02-evidencias.zip](https://chatgpt.com/library?file_id=libfile_9a6f44d18d808191b76f340ea060b3ee&account_id=personal).
7 PNG capturadas realmente con Chromium153.0.8010.0 ejecutando componentes React publicados, no imágenes generadas ni recreación del formulario. Contenedor aislado con props/recursos sintéticos explícitos, sin sesión/BD/backend real. No es la aplicación completa ni Hostinger. Se capturó el estado bloqueado real; no se simuló autenticación o guardado exitoso.
Fuentes de los17 archivos del bundle verificadas byte a byte mediante SHA blob del árbol remoto. Editor401a65ecc3b7d944043e09384de5e523206227a9; ficha660a87f63146c0a7c5d7f2de5d39c7ca773d6327; CSS71db9cc424f054e47ee96e1c88a21e3734cd9dd0. Copia recuperada exacta en temporal, sin cambiar fuentes de aplicación.
Capturas editor-logo-desplegado-escritorio/tablet/movil/estrecho.png:1440x1050,834x1112,390x844,320x740; details abierto y campo completo visible, sin desborde horizontal del documento/panel, preview logo distinto de portada/galería, input de logo y quitar deshabilitados por ausencia de sesión. editor-logo-ausente-tablet.png muestra fallback y carga bloqueada. maps-sin-ubicacion-tablet.png: ausencia honesta de ubicación. maps-consentimiento-sin-carga.png:1440x1050 con botón previo a carga y ningún iframe/proveedor conectado. URL pb SINTÉTICA únicamente para probar control previo; no evidencia mapa/localización válidos ni aceptación por Google.
Revisadas visualmente capturas escritorio/móvil y consentimiento. Las capturas nuevas sustituyen SOLO la carencia de evidencia del campo desplegado, no invalidan resultados históricos ni demuestran persistencia.
Las imágenes se entregan mediante enlace indexado en estos documentos GitHub. No se añadieron PNG/binaries en rutas nuevas del repositorio: la lista cerrada solo permite fuentes específicas y estos dos Markdown.

### Ejecución y resultados honestos
- node /tmp/enc-recovery-validation/build.cjs: bundle esbuild de componentes reales PASS; TailwindCLI4.3.3 PASS. No se ejecutaron scripts build/prebuild que cambian versión/bundles del repo.
- test.cjs: seis criterios terminaron PASS (4 anchos del editor, logo ausente, mapa sin ubicación) y seis capturas. La ejecución completa terminó con timeout30s al buscar botón de consentimiento a834. NO se declara batería global aprobada ni cero consola global de ese intento. No se repitieron los seis casos ya aprobados.
- test-maps.cjs posterior, solo pendiente Maps a1440:2 criterios PASS; consentimiento visible sin iframe/conexiónGoogle, cero excepciones JavaScript, solicitudes externas y escrituras. Consola sí muestra2 errores de recurso503 de GET ratings por backend local deliberadamente ausente; UI muestra calificaciones no disponibles, sin resultados ficticios. No se realizaron escrituras de ratings ni llamadas de upload/save reales.
- Resultado JSON adjunto corresponde únicamente a2 criterios posteriores. Se conservan como ANTERIORES23 políticas y23 Chromium, TypeScript y Vite del checkpoint previo; NO repetidos en esta recuperación ni sumados como ejecución nueva.
- Hashes SHA256 harness: entry059e36b18b0c1aec7ed84a9f9ba858210925c7ade52041cb39d106e767b8d12d; build28bc5b624b8365a5af08c6f40782d14cd282f1f051e80f7544b35ec274b56b53; test8a59e9e89e50521ba76dc76bab9684b0e96972a86fa38d34121a9f5b952ccddd; Maps cbe71be398c3e6daca9b80ca3b868aa1cac1498e138db2b23cca9d1b7caf9d12. ZIP contiene manifiesto de hashes, scripts de fixture y resultados para revisión.
- Intentos fallidos de entorno: descarga Chrome truncada, extracción chown no permitido y fuentes Fontconfig ausentes; corregidos en herramientas temporales mediante Chromium empaquetado/npm y fuentes locales. Lucide latest sin exportInstagram se sustituyó en tooling por0.546.0 compatible con package.json. Ningún fallo se cuenta como PASS; ningún cambio de dependencias de repo.

### Bloqueos y dictamen
Pendiente credencial/proveedor seguro, autorización real de edición, persistencia MariaDB independiente, mapaGoogle cargado/CSPHostinger y Safari/iOS. No existe autorización para esas operaciones reales. Coordenadas sin embed/configuración siguen con enlace preciso y fallback; no inventar APIkey/pin.
Solo docs/WORK_RESULTADOS.md y docs/work-progress/ENC-GLASS-LOGO-MAPS-002.md cambian en recuperación. Sin código nuevo, servidor/API/auth/DB/uploader/editorPR3, SQL, integración, despliegue o Hostinger. Capturas no incorporan Auth independiente.
APTO para revisión de evidencia local y frontend condicionado. NO APTO para declarar autenticación/persistencia/mapa real verificados ni para habilitación o despliegue completos. Se espera revisión independiente de coordinación; Hostinger vigente, sin uso de Azure/Vercel/Render.
