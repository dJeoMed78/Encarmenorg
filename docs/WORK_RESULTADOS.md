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

# ENC-STAGING-RELEASE-001
## Inicio 2026-10-28T17:43:32.079Z
Estado EN_PROGRESO. Autorización directa de Coordinación01: consolidar selectivamente EditorR1 y Logo/Maps en rama candidata, sin integrar/desplegar. Rama work/ENC-STAGING-RELEASE-001 no existía al consultar; se crea únicamente esta rama desde ia-desarrollo cad1222618c94f4eb3dabb589b6e58836191dcb7. Documento de tarea en coordinación consultado:404; prevalece instrucción expresa de la sesión. Se leyeron reglas generales/contexto y los checkpoints de fuentes13326fdf616c45a0322ce1b1cd52973a264d1f83 y62dd05a1ba734ae035bb0792f09c0fbe6b3a00ca.
Alcance: EditBusinessModal.tsx conciliado, BusinessPublicDetail.tsx/CSS y types.ts para logo/map; WORK_RESULTADOS y este checkpoint. No Auth/Radar/Comentarios/API/DB/servidor/secretos/infraestructura. Reutilizar correcciones sin sustituir diseño actual; mantener puertas de permisos y operaciones inseguras deshabilitadas. Pruebas locales aisladas de proyecto/componentes, solo mocks explícitos y sin backend real. Se recuperará fuente exacta para compilación global; clon Git anónimo no disponible, se utiliza lectura GitHub autorizada. Pendiente implementación y pruebas, sin resultados inventados.

## Conciliación implementada; pruebas en curso — 2026-10-28T17:52:30.492Z
Estado IMPLEMENTADO con pruebas de integración EN_CURSO, no aprobado para despliegue. Conservados los siete ajustes R1 y su distribución visual; añadidos únicamente helpers/estado/UI de logo del trabajo previo. Un único control de exclusión evita guardar/cargar concurrentemente; delta de campos editados incluye logo_url solo si cambió, exige revalidación servidor antes de callback. URLs y fallbacks de Maps/ficha/CSS y tipado se reutilizan de Logo/Maps sin cambios de auth/API/backend.
Fuente base completa recuperada:91 archivos,91 SHA coincidentes con ia vigente. TypeScript7.0.2 --noEmit del proyecto completo PASS; Vite8.3.5 frontend completo PASS,1722 módulos, advertencia chunk>500kb. Salidas solo temporales, no scripts mutantes. Política Maps real:20 comprobaciones PASS sin red. Pruebas de componentes integrados todavía en curso; no se declara batería completa ni persistencia.
Defecto de integración corregido:validación MIME de logo debe seguir rechazandoGIF aunque cargas genéricas de portada/galería lo admitan. Pendientes:cerrar regresiones de editor, logo/mapas, responsive, modales y capturas. Contratos reales de credenciales y persistencia no habilitados; sin esas garantías campo logo queda cerrado. No nuevas credenciales, APIkeys, BD, SQL, PR, integración a ia o despliegue.

## ENC-STAGING-RELEASE-001 — candidata consolidada y probada 2026-10-28T18:01:00.536Z

### Estado y trazabilidad
CONSOLIDADO EN RAMA CANDIDATA / PROBADO_LOCALMENTE. Revisión de Coordinación PENDIENTE. NO INTEGRADO A ia-desarrollo, NO DESPLEGADO. No es certificación de MariaDB ni autenticación real.
Rama única work/ENC-STAGING-RELEASE-001, creada al no existir; base vigente cad1222618c94f4eb3dabb589b6e58836191dcb7, comprobada nuevamente antes de cierre. Coordinación consultada51ae3a45a6f82bc8fcec9f02432835f312ce8c02; documento de tarea404, autorización directa en sesión registrada. Reglas generales/contexto leídos. Fuentes reutilizadas:EditorR113326fdf616c45a0322ce1b1cd52973a264d1f83 y Logo/Maps62dd05a1ba734ae035bb0792f09c0fbe6b3a00ca. Sus ramas no se modificaron.
Checkpoint inicial2ebe21c6ce2848b5c7c5e69bf1288ddd7f014dbd; consolidacióndb348243ccf01ef3078889dfcb0dc0a6f70c0063. Cada commit tiene un padre normal; no merge/rebase/cherry-pick de ramas históricas, PR ni force push.

### Conciliación funcional
- EditBusinessModal.tsx:partir del JSX vigente y lógica R1 probada; insertar selectivamente helpers de URL/sesión y UI de logo de la otra implementación. NO reemplazo indiscriminado por archivo de otra rama ni diseño PR#3.
- Se conservan7 correcciones:parser de horario reconocido sin transformar texto libre no editado; contactos independientes sin inferirWhatsApp; pagos y modalidad sin defaults sobre legado; valores vacíos/heredados conservados y contacto editado validado; exclusión inmediata de doble guardado/reintento seguro; cargas503/dataURI rechazadas sin destruir imágenes.
- Único snapshot/delta de campos editados y exclusión de operaciones de R1 también para logo. Guardado de solo logo envía únicamente logo_url; no toca portada, galería, horarios, pagos, modalidad o campos desconocidos. Revalidar sesión/permiso en servidor ANTES de upload y ANTES del callback, con mutex activado antes de esperar. Respuestas de negocio/edición anterior no modifican el actual.
- Campo exclusivo Logotipo de la empresa, preview, subir/cambiar/quitar y mensajes honestos. Falta/vencimiento de sesión,403/503 y permisos insuficientes mantienen bloqueado. No se usa isAdmin como autorización del nuevo campo. Borrador no se presenta como guardado.
- Logo distinto de portada/galería; ausente/roto muestra fallback. Publicación responsive en ambas entradas reales BusinessDetailModal/DirectBusinessView mediante componente compartido. Desktop/tablet arriba a derecha de galería; móvil cabecera antes de galería.
- BusinessPublicDetail.tsx/CSS y types.ts reutilizan EXACTAMENTE fuentes de Logo/Maps, sin cambiar estrellas/comentarios/Auth/Radar. Google Maps solo URLs HTTPS conocidas/canonicalizadas y consentimiento previo; iframe accesible/lazy/referrer, fallback por CSP y enlace externo. Coordenadas válidas sin configuraciónEmbed generan enlace preciso; sin ubicación no se inventa pin. No nuevasAPIkeys, geocodificación ni proveedores.

### Defectos de integración resueltos
1. Uploader genérico R1 admiteGIF, pero logo exigeJPEG/PNG/WebP:se añadió validación diferenciada y prueba de rechazo antes de API.
2. Inserción del campo había perdido la clasept-1 original de portada:detectado por comparaciónAST, restaurado.184 atributos originales className/style vuelven a conservarse en orden, con estilos añadidos solo para logo.
3. Se unificaron exclusión/snapshot/validación asíncrona para evitar que la combinación de las dos implementaciones reintrodujera callbacks duplicados o sobrescrituras. No se agregan validaciones de contraseña en navegador ni endpoints nuevos.
Después de restaurarpt-1 se reconstruyó el montaje y se ejecutaron las baterías finales; los resultados siguientes pertenecen a la candidata final.

### Compilación REAL del proyecto completo
Fuente recuperada mediante GitHub autorizado porque clone anónimo no tenía acceso:91 archivos de build,91 SHA de blob coincidentes antes de aplicar cambios. Incluye todo src, server.ts, index.html, package/lock, tsconfig y Vite. Solo4 archivos funcionales difieren de base; manifiesto de hashes adjunto. No se usaron stubs de fuentes para afirmar compilación global.
Dependencias temporales externas:TypeScript7.0.2,Vite8.3.5,@vitejs/plugin-react6.1.1,@tailwindcss/vite4.3.3,React/ReactDOM19.0.1,Lucide0.546.0 y demás dependencias compatibles. No package/lock/config/dependencias de repo modificados. Node24 local, no validación de Node22Hostinger.
- node /tmp/enc-release-tools/node_modules/typescript/bin/tsc --noEmit -p /tmp/enc-staging-release/project/tsconfig.json:PASS, proyecto completo incluido backend, sin emitir/ejecutar.
- Vite CLI build desde copia completa del proyecto, outDir temporal frontend-build y emptyOutDir:PASS,1722 módulos, CSS247.51kB, JS1,329.30kB/gzip287.95kB. Advertencia chunk>500kB, no error. No npm run build/prebuild/update_version ni copia de bundles a repo.
- esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile temporal:PASS,351.9kB. COMPILACIÓN SOLAMENTE; nunca ejecutar servidor completo/DB.
La fuente de servidor se leyó para compilación, no se cambió ni se expusieron secretos en informe/artefacto.

### Pruebas funcionales y visuales finales
1. Regresión R1 SOBRE EDITOR CONSOLIDADO:24 comprobaciones PASS y5 adicionales PASS. Incluye los7 hallazgos, delta{}, solo nombre, preservación de heredados, contacto vacío/largo/+52, horario libre/turno nocturno, fallo de guardado/red y reintento,2submit=>1callback, upload503 tanto portada como galería, respuesta tardía, refresh mismoID, bloqueo durante carga y geometría1440/390.
2. Logo/Maps + wrappers reales:21 comprobaciones PASS. Sin sesión;401/403/503/vencimiento/permiso insuficiente; carga/cambio/quitar/reabrir; delta exclusivo; fallo sin cerrar;503/dataURI;MIME; permiso vencido antes de callback; doble envío durante verificación; cambio de negocio; ambas entradas1440/834/390/320; galería/ficha abrir/cerrar; logo ausente/roto; consentimiento yCSP; URLmaliciosa y coordenadas.
3. Editor móvil con campo logo desplegado y cancelar/reabrir:3 comprobaciones PASS.
4. Política Maps REAL extraída sin red:20 comprobaciones PASS:null/vacío/NaN/rangos/0,0, protocolos/hosts falsos, credencialesURL, puerto,HTML,key, embed canónico y enlaces cortos sin iframe.
No sumar controles repetidos entre baterías como escenarios únicos. No reutilizar conteos históricos como si fueran de este candidato:estas son nuevas ejecuciones justificadas por la conciliación.
Chromium153.0.8010.0/Playwright; APIs, sesiones, calificaciones, uploads y callback onSave SIMULADOS EXPLÍCITAMENTE. Cambios recuperados de registro EN MEMORIA de fixture no equivalen a DB. Cero excepciones JavaScript y solicitudes externas en baterías finales; solo POSTs a upload local simulado. Errores401/403/503 yCSP inducidos; no se afirma consola libre de esos errores esperados.
CSP REAL local frame-src'none' bloqueó iframe Google, generó evento de navegador y activó fallback conservando enlace; título/lazy/referrer verificados mediante observación DOM. Nunca se contactó Google ni se mostró un mapa simulado como proveedor real. Coordenadas0,0 y pb de fixture son sintéticos.
184 atributos originales className/style conservados medianteAST; dimensiones/clases de panel/scroll/pie iguales a editor vigente en1440/390. No se rediseñó. Posición del logo validada también en834/320.

### Evidencia entregada
[ENC-STAGING-RELEASE-001-evidencias.zip](https://chatgpt.com/library?file_id=libfile_330abd2465fc81918fb7462f9878cdee&account_id=personal)
11 PNG reales del montaje integrado, scripts locales, JSON de resultados, manifiesto de fuente ySHA256. Sin bundles/fuentes de aplicación/semillas/DB/credenciales reales en paquete.
- Integracion/editor-sin-sesion-1440.png
- Integracion/editor-logo-borrador-1440.png
- Integracion/editor-logo-desplegado-390.png
- Integracion/ficha-modal-1440.png / ficha-modal-390.png
- Integracion/ficha-direct-1440.png / ficha-direct-390.png
- Integracion/maps-consentimiento-1440.png
- Integracion/maps-csp-fallback-1440.png
- Editor-R1/editor-R1-1440.png / editor-R1-390.png
Revisadas visualmente ficha móvil, editor móvil desplegado y CSPdesktop; capturas de la aplicación/componente ejecutado, no imágenes generadas. El contenedor de pruebas tiene controles propios rotulados; no es navegaciónE2E del portal contra backend.
SHA256 editor final55ce3cdfaecb0bb362782b8a57a53e99c73c40d67f34f6c1ba0355c10e33fa4b. Blob Giteditor eedb330bf88b82c0b6f3132c20532cc6ec160e2f. Ficha660a87f63146c0a7c5d7f2de5d39c7ca773d6327; CSS71db9cc424f054e47ee96e1c88a21e3734cd9dd0; types42c27f6b401c8994486e3c1ff96faca511d870d5.
Harness integrado SHA256 b4286cc3686c859fd3c5c558ffdbe8182c71304197c749fdf97b413a3776cdda; móvil723c35dea1c3ac5ec056a267b6fbb00511bb2e63f48036940e22cf814693207e.

### Incidencias y límites
Fallos de harness corregidos antes de final:doble React entre referencia/candidata, espera visible sobre inputfile oculto, comparación URLrelativa con absoluta normalizada, sincronización de props/callback asíncrono y supuesto erróneo de tablet(logo a derecha de galería, nombre debajo). No se cambiaron estilos aprobados para satisfacer ese supuesto. Intentos incompletos no cuentan como PASS.
Un comando inicial invocó el binario esbuild mediante node; se corrigió invocándolo directamente y compiló. Creación inicial de ref por update_ref rechazó422; se usó create_branch, una sola rama autorizada. Ningún force ni escalación de permisos.
Persistencia real NO verificada. Contrato raw_data de logo solo compatible por lectura de código; no se comprobó esquema/conexión efectiva. onSave/API/backend pueden conservar comportamientos best-effort y autorización heredada; no se arreglaron fuera del alcance ni se presentan como seguros. No se incorporó la rama Auth. El nuevo campo no se habilita sin sesión servidor válida.
La exclusión local no sustituye idempotencia/validación/autorización backend. Uploads remotos parciales huérfanos requieren contrato de limpieza fuera de alcance. Safari/iOS, NodeHostinger, CSP real del sitio y mapaGoogle cargado quedan sin comprobar.
Sin SQL, migraciones, bases reales, secretos, hPanel, cambios de infraestructura, main/ia, otras ramas, PR o despliegue. Hostinger vigente; no Azure/Vercel/Render.

### Archivos y condiciones exactas para integración posterior
Solo src/components/EditBusinessModal.tsx, src/components/BusinessPublicDetail.tsx, src/components/BusinessPublicDetail.css, src/types.ts, docs/WORK_RESULTADOS.md y docs/work-progress/ENC-STAGING-RELEASE-001.md.
1. Coordinación revisa diff completo de candidata contra SHA vigente de ia; si cambió, conciliar antes de aprobar. Esta candidata sí nace del ia actual comprobado, no de ramas históricas divergentes.
2. Mantener puertas cerradas y no interpretar mocks como persistencia. Para habilitar logo/guardados:servidor debe acreditar sesión/permiso, endpoints de mutación y confirmación durable, sin fallback cliente; revisión de seguridad administrativa separada. No basta un isAdmin local.
3. Cualquier prueba con datos reales requiere autorización específica y aislamiento efectivo confirmado de credenciales/esquema/producción, respaldo y validación de lectura posterior; Work no realiza esas operaciones.
4. Revisar CSP/privacidad de Google y Node/compilación del entornoHostinger. Sin embed/configuración válida conservar alternativa; no crear claves implícitas.
5. Aprobación expresa de Coordinación antes de integrar. La autorización actual no permite push a ia ni despliegue; Hostinger puede reaccionar a integración, por lo que se requiere plan de publicación controlado.
Dictamen:APTO PARA REVISIÓN DE CANDIDATA FRONTEND CONSOLIDADA; integración únicamente condicionada a revisión anterior. NO APTO PARA DECLARAR ESCRITURAS/AUTENTICACIÓN/MARIA DB REALES VERIFICADAS O DESPLEGAR AUTOMÁTICAMENTE.

### Reversión
Antes de integrar:descartar candidata sin tocar ia o registrar reversión por commits normales, nunca force. Si Coordinación la integra en futuro y requiere rollback:revertir commits de código de esta tarea sobre su entorno autorizado, o restaurar los4 archivos desde cad1222618c94f4eb3dabb589b6e58836191dcb7 después de comprobar cambios posteriores. No revertir implementaciones ajenas ni usar la rama histórica del editor como referencia visual. Mantener cierre de funciones inseguras. No rollbackSQL porque no se modificaron datos. Documentación histórica se conserva.

## ENC-STAGING-INTEGRATION-READINESS-001 — candidata de integración
Fecha UTC 2026-10-28T17:49:31.788Z. Estado PROBADO_POR_WORK localmente; sin integración/despliegue.
Rama work/ENC-STAGING-INTEGRATION-READINESS-001, base cad1222618c94f4eb3dabb589b6e58836191dcb7; checkpoint 581c0cba919609047bc6a9aabb7f95736d35e275.
Fuente autorizada b6b26fefcce0b4d268ba0f715433d2d534e0b1a2. Incorporados idénticos cinco archivos: server.ts, server.js, api/server.bundle.js, scripts/create_release_zip.js y tests/backup-security-002.test.cjs. Sin cambios de comportamiento. Documentación: esta entrada acumulativa y docs/work-progress/ENC-STAGING-INTEGRATION-READINESS-001.md (plan canónico único, matriz, comandos, condiciones C1–C8 y reversión).
Node22.23.4: TypeScript7.0.2/Vite8.3.5/esbuild0.28.2 PASS; recompilación backend idéntica a ambos ejecutables. Tres modos de harness PASS (27 tests/927 solicitudes localhost), sin importar servidor completo/BD; CLI solo fixtures y snapshots preservados. SHA256 bundle01b6cab6b6560b7b1f00fb26b4c58b7f42b612791c3788ed1a1eacd71e39137e. Advertencias no bloqueantes: chunk Vite>500kB, npm http-proxy y EnvHttpProxyAgent experimental en check sintáctico. Sin errores de validación ni correcciones adicionales.
Entregas observadas al cierre: Trabajador1 en2ebe21c6ce2848b5c7c5e69bf1288ddd7f014dbd, solo checkpoint EN_PROGRESO; Google ENV enSHA base, sin diferencias. Ninguna incorporada ni supuesta terminada/aprobada. Conciliación futura descrita, sin esperar indefinidamente.
No package/lock/frontend/infraestructura/auth/DB modificados. Copia aislada y dependencias temporales fuera del repositorio; builds con entorno vacío salvo PATH. Frontend generado temporalmente, no se publica dist. No credenciales reales, SQL, backup real, Hostinger, arranque completo, PR, merge, integración ni despliegue. Main/ia-desarrollo preservados.
Riesgos no resueltos por guard: arranque/semillas/limpieza y conexión productiva, permisos cruzados, estáticos externos/CDN/caché, symlinks/renombrados. Falta autorización y evidencia operativa; Staging NO declarado protegido. Reversión debe mantener contención y artefactos coherentes, sin restaurar BD ni abrir descargas a ciegas.



## ENC-F008-R2 / ENC-F009 — contactos visibles y protección de recuperación

Fecha: 2026-10-28. Estado: PROBADO_POR_WORK localmente; pendiente revisión operativa. Rama exclusiva `work/enc-f008-contactos-visibilidad`, base ia-desarrollo `0d231cb2779b7a14d8d336fc2f4de3782663c738`.

Diagnóstico público verificado: Staging informa local_json/json_cache, 205 negocios, MariaDB desconectada y aislamiento inválido; base configurada de Staging. ID1081 Yuss Nails Beautiful Hands devuelve contactos vacíos. Producción rechaza GET con403. No acceso a hPanel/SSH ni SQL real. Restauración de174 por base reportada por Coordinación, no repetida.

Implementación: SQL phone/whatsapp autoritativos frente a raw_data; lecturas estrictas frescas con fuente identificable/no-store y503 explícito; sin fallback de contactos semilla en App/servicio; conservación atómica en upsert de campos omitidos/vacíos y cachés antiguas; sustitución explícita mediante PATCH y readback; eliminación por clearContacts con sesión validada en servidor. Arranque de negocios sin seed/upsert; sync-catalog y WooCommerce retirados con410. Validación MX común en tarjetas, Glass y landing sin inferir WhatsApp. Filtros/contadores reales por conjunto de búsqueda antes de paginar y aviso sin contactos; API contacts/offset/limit y paginación local24. Editor/Logotipo/Radar/Comentarios no se mezclan.

Pruebas: nueve grupos PASS con Node24.22.1/esbuild0.28.2/jsdom30.1.3; handlers Express reales con pool simulado, componentes React en DOM jsdom, App error/reintento/ficha actualizada, serialización, PATCH, eliminación403/400, preservación de caché, arranque/fallo/vacío y reinicio simulado, rutas410 sin consultas. TypeScript7.0.2 PASS; Vite8.3.5 PASS1723 módulos, warningchunk>500kB; bundlebackend PASS sin ejecutarlo. No pruebas de MariaDB/persistencia/autenticación reales ni llamadas/envíos físicos. Se documentan iteraciones fallidas y límites en el checkpoint.

Trazabilidad completa, archivos, reproducción y rollback: [docs/work-progress/ENC-F008-R2.md](work-progress/ENC-F008-R2.md). Pruebas reproducibles: `tests/contacts-r2.test.mjs`. Sin main/ia, PR, integración, despliegue, SQL, credenciales ni infraestructura. Candidato apto para revisión de código; NO APTO para despliegue inmediato hasta conexión/aislamiento y verificación independiente del ID1081/API/UI. No activar confirmaciones de escritura sin comprobar permisos y aislamiento. Espera Coordinación.

Implementación ENC-F008-R2 publicada y releída: https://github.com/dJeoMed78/Encarmenorg/commit/053b729bb82f852fa61063802a6a757947cf8b12. Verificación remota13/13 archivos, scope limitado a13 rutas. Editor/CSS/types/semilla/package/bundles heredados intactos. La integración futura exige recompilar server.ts y actualizar/verificar los artefactos de ejecución; no arrancar bundles viejos suponiendo que contienen la corrección. Ver checkpoint para bloqueos, condiciones y reversión. Sin integración/despliegue.


## ENC-F008-R3 — recuperación revisada y finalización aislada

Fecha local2026-10-28. EstadoPROBADO_POR_WORK localmente; NO integrado/desplegado/aprobado. Rama exclusiva work/enc-f008-r3-recuperacion, baseR2 d826a17b6f4bd29eaac1ef350111910ab2dfe872; checkpoint d479c0414582919111b78ae93713a0d293f8833a. Se auditaron ambos commitsR2 y sus13 archivos; se conservaron correcciones útiles y retirada de importaciónWooCommerce/semillas (401 líneas eliminadas en server.ts porR2, justificadas en checkpoint), sin reescribir historial ni tocar la rama anterior. Auditoría completa ENC-F008-AUDIT-001 no localizada en GitHub; aplicados los siete hallazgos transmitidos por Coordinación.

Diagnóstico HTTP público actualizado: Staging local_json/json_cache,205 negocios, MariaDB desconectada, aislamiento inválido y mensaje de confirmación; base configurada u293982346_encarmentest. ID1081 coincide en nombre y devuelve ambos contactos vacíos. No consultas a producción, hPanel autenticado ni SQL real.

Correcciones nuevas: DDL condicionado también a isWritePermitted; tel:+52; PIN solo por WhatsApp registrado; tipos de contacto estrictos; PATCH compara contactos de readback y falla409 ante discrepancia; ack perdido/relectura fallida se informa503 con posible escritura y sin éxito falso; cliente rechaza confirmación sin negocio/ID correcto; App descartaGET anterior a guardado y conserva aliasoldId; tarjeta digital y resumen de landing muestran canales independientes. ENC-F009 y protección/lecturaSQL deR2 conservados y probados nuevamente.

Pruebas actuales: node --test tests/contacts-r3.test.mjs =>19 gruposPASS/0FAIL (9 recuperados+10 nuevos, no sumarlos otra vez). Matriz11 configuraciones simuladas; APIHTTPExpress local/poolmocks; continuidad filaSQL sintética1081->serializador->API->DOMGlass/botones; PATCH, sincronizaciones410, arranque/fallos/vacío, cachevieja, concurrencia simulada, filtros/búsqueda/paginación, canales y respuestaatrasada. TypeScriptPASS, frontendVitePASS1723módulos y esbuildservidorPASSsin ejecutar. EntornoNode24.22.1; sin acreditación de SQL/persistencia, permisos/auth reales, layoutCSS en dispositivos ni exportacióncanvas. Advertenciaschunk>500kB y salida temporalexterna.

Delta: server.ts; src/db/mariadb.ts; src/App.tsx; src/services/api.ts; src/utils/businessContacts.ts; BusinessCard.tsx; AdminBusinessesTab.tsx; DigitalCardModal.tsx; ClientBusinessPageView.tsx; tests/contacts-r2.test.mjs; tests/contacts-r3.test.mjs; este registro y dos documentosR3. Editor/CSSGlass/Logotipo/Radar/Comentarios/config/secretos/main/ia no modificados. Bundlesheredados no publicados comoR3: recompilación/coherencia obligatoria antes de ejecución futura autorizada.

Checkpoint y reproducción: docs/work-progress/ENC-F008-R3.md. PlanHostinger para autorización posterior: docs/work-progress/ENC-F008-R3-HOSTINGER.md. Propone lectura/DDLoff con credenciales existentes verificadas, explica precedencia.env y condiciónSTAGING_DB_CONFIRMED sin habilitar escrituras. Ninguna acción aplicada. Pendientesoperativos: conexión/permisos independientes, ID1081/174registros/API/UI reales, revisión de autorización generalPATCH/auditoríadurable y aprobación deCoordinación. Candidato paraREVISIÓN, no para despliegue inmediato. Reversión por commitsnormales exclusivamente deR3; no SQL ni force.

Publicación R3 verificada: https://github.com/dJeoMed78/Encarmenorg/commit/734bfbd4affe5712ab30d68f0a289a27c24b377c. Lectura remota14/14 archivos coincidentes,14 rutas en diff, fuenteR2 e ia-desarrollo intactas. Nuevo delta server.ts limitado a7 adiciones/4 eliminaciones; no se amplió la retirada de código heredada. Resultado final19 gruposPASS, TypeScript/frontend/backendPASS. GuíaHostinger y bloqueos incluidos; sin aprobación, integración o despliegue.
