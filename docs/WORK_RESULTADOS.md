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
