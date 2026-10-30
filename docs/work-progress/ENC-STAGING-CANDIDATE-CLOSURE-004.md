# ENC-STAGING-CANDIDATE-CLOSURE-004

W1. Fecha2026-10-29, America/Mexico_City. Estado IMPLEMENTADO/PROBADO LOCALMENTE; publicación y revisión independientes pendientes al crear checkpoint. No integrado/desplegado ni incidencias cerradas.

Base obligatoria74e3300fa9ff022153d7e6671c65362203258032, work/enc-data-integrity-closure-003 comprobada. Rama destino inexistente al consultar; creada work/enc-staging-candidate-closure-004 desde SHA exacto, sin force ni cambios en ramas ajenas.

Consultados punto de entrada de coordinación, registro maestro actualizado, metodología/contexto/instrucciones y resultados e informes previos de consolidación/H01-H04/R3/closure003. La entrega003 está terminada y es base; no se reinicia ni se repite recuperación histórica de contactos. Sin acceso a Hostinger/bases reales.

## Matriz de paquetes

A:74e3300fa9ff022153d7e6671c65362203258032. Preservados H01-H04, fetchReports tipado sin localStorage, panel/carrera, acuse de contactos, R3 y políticas cerradas.
B:79757de8cfb07317668553c02a37502de4b64366, coord/enc-upload-honest-result-001. Incorporadas por hunks las funciones upload/duplicados/updateReportStatus/deleteReport y dos handlers de error del panel; suite original incluida.
C:aa5260cf16a08539e04f4225056e152472302c57, coord/enc-report-persistence-001. Incorporados handlers y affectedRows de DELETE; suite incluida y adaptador ampliado para lectura fresca/UPDATE sin upsert. Se corrigieron brechas adicionales descritas abajo.
D:73a68214cb326283375a8fe5e5ceeb669cee6d49, coord/enc-f007a-completion-001. Incorporados únicamente movimiento de sección y CSS por hunks; script/suite relacionados. Corregido reconocimiento idempotente del script que buscaba className incompleto. No se incorporaron documentos/ramas completos ni paquetes ajenos. Los HEAD de B/C/D coincidían con esos SHA al verificarlos.

## Implementación adicional necesaria

- dbLoadAllReports deja de convertir pool ausente/error/resultado inválido en []; lanza error y conserva [] como consulta válida.
- GET /api/reports exige MariaDB activa, realiza lectura SQL actual por solicitud, no-store y503 en fallo. No usa caché como confirmación; solo actualiza caché tras lectura válida. Startup maneja error/vacío sin JSON/semilla de reportes ni impedir carga de otros módulos.
- Mutaciones consultan SQL fresco, no dependen de existencia en caché antigua, y solo actualizan caché/JSON tras acuse booleano real. PATCH usa UPDATE dedicado, no upsert que pudiera recrear un reporte eliminado. Helpers exigen affectedRows>0. Registro inexistente404; fallo o acuse insuficiente503, con incertidumbre de escritura cuando no puede descartarse. No se afirma transacción SQL+JSON ni idempotencia de POST.
- Lectura SQL normaliza nombres snake_case/camelCase para consumidores. Metadatos de reportes de clasificados/comentarios, que antes se perdían al escribir columnas limitadas, se conservan en details existente mediante envoltura JSON versionada y campos cerrados. Lectura acepta también details histórico de texto puro. Sin columna/migración nueva. Prueba de roundtrip con adaptadorSQL confirma identificación de clasificado y comentario.
- Galería administrativa ya no sustituye carga fallida por base64; error visible y estado anterior conservado. Logo fallido no modifica URL guardada y muestra error.
- Promociones conservaban fallback base64 aun con API corregida: ahora distinguen preview pendiente de URL remota, bloquean guardado no confirmado y excluyen preview del payload; quitar imagen limpia la preview pendiente. Formularios no se restablecen tras fallo.
- F007A conserva un solo widget/calificaciones y contactos; DOM sitúa opiniones tras datos, CSSdesktopfila3/tabletfila4/móvilorder7. Su aceptación sigue reservada al propietario.

## Hito ejecutado

Batería de fuentes173 PASS/0FAIL/0omitidas, incluye anterior147 sin regresión; paquetes B/C/D13 PASS incluidos. Pruebas de consumidores, HTTP loopback con middleware real y SQL simulado, helper SQL y DOM están incluidas; no son173 escenarios únicos. Suite histórica de backend compilado27 PASS/0FAIL. CompilaciónTS/Vite/esbuild PASS, ambas copias backend idénticas y segunda compilación coincidente. Comandos y detalle final tras publicar checkpoint.
Chromium real intentado: falla antes de página por socket Unix EPERM; no capturas ni validación geométrica. Sin MariaDB real, SQL real, servidor completo ni despliegue.

## Validación previa a publicación del checkpoint

La batería final ampliada tras las últimas correcciones pasó176/176,0omitidas. Incluye147regresiones base, suites B/C/D, controles adicionales de registro inexistente, consumidores de upload y comprobación del móduloSQL compilado. La suite independiente histórica del bundle27/27 también pasó; tiene cobertura compartida y no se suma como escenarios nuevos.
Se reforzó el acuse con lectura SQL posterior: guardar/actualizar comprueba id/status/details y DELETE comprueba ausencia. Así, affectedRows por sí solo no acredita un contenido truncado ni un resultado inexistente. Un fallo de readback conserva incertidumbre y no adelanta la caché. No se afirma transacción entre lectura, escritura y caché.

## Cierre ejecutado y publicación

Checkpoint funcional y artefactos publicados: b27d769adc51ea6c1e64f9ec92cf02327cc08369. El SHA definitivo es el commit que contiene este cierre, informado al coordinador sin autorreferencia ficticia. Dictamen: CANDIDATA PUBLICADA PARA REVISIÓN DE COORDINACIÓN. Implementado/probado localmente/publicado; no integrado/no desplegado. No se cierra ninguna incidencia del propietario.

### Comandos exactos

    node --import tsx --test tests/staging-candidate-closure-004*.test.mjs tests/data-integrity-closure-003-*.test.mjs tests/consolidation-fixes-002-*.test.mjs tests/security-radar-001.test.mjs tests/public-registration*.test.mjs tests/consolidation-001.test.mjs tests/contacts-r3.test.mjs tests/staging-write-001.test.mjs tests/staging-isolation-proof.test.mjs tests/security-containment-003.test.mjs tests/backup-security-002.test.cjs tests/coord-api-honest-results-001.test.mjs tests/coord-report-persistence-001.test.mjs tests/enc-f007a-mobile-order-001.test.mjs tests/public-detail-ux-001.test.mjs
    npm run lint
    node_modules/.bin/vite build --outDir /tmp/enc-staging-candidate-closure-004-dist
    node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.js
    cp server.js api/server.bundle.js
    ENC_SECURITY_EXECUTABLE=server.js ENC_BACKUP_EXECUTABLE=server.js node --test tests/security-containment-003.test.mjs tests/backup-security-002.test.cjs
    node --check server.js
    node --check api/server.bundle.js
    cmp server.js api/server.bundle.js
    node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/enc-c4-rebuilt.mjs
    cmp server.js /tmp/enc-c4-rebuilt.mjs
    node scripts/apply-f007a-mobile-order-patch.mjs --check

Resultados finales:176 PASS/0 FAIL/0 skipped (5010.912109ms); incluye la anterior batería147, sin sustituirla por resultados históricos. Hay cobertura compartida y suites importadas, no176 escenarios únicos. Pruebas B/C/D ejecutadas con adaptador actualizado para el contrato estricto de lectura/UPDATE; caso de recursosSQL inexistentes añadido. Dentro de176 se ejecuta una prueba nueva del módulo SQL del bundle real, sin arrancar servidor completo. Además27 comprobaciones históricas del bundle PASS, con cobertura compartida, no sumarlas como escenarios distintos.

TypeScript PASS sin diagnósticos; frontend Vite PASS y backend esbuild PASS. Ambas copias backend idénticas a segunda compilación y sintaxis Node válida. SHA256:
    41e165f267041403b6d2aa01b32016de7650f03d93c24ce21c6a6e768b41d197
Node24.22.1, TypeScript7.0.2, Vite8.3.5, esbuild0.28.2; dependencias locales reutilizadas, no npmci limpio. Avisos: chunkfrontend>500kb y npm http-proxy. No scripts de versión. El frontend se genera temporalmente, no se publica dist; cualquier despliegue futuro debe construir frontend desde este SHA, no servir assets viejos junto a estos bundles.

### Nivel de evidencia

- HTTP Express loopback real: autenticación/sesiones y guardián reales con identidades sintéticas; GET SQL fallido devuelve503 hasta fetchReports error/totalnull, sin entregar caché antigua; SQL vacío legítimo200. Solicitud sin sesión401; mutaciones cerradas403/503 sin consultas de escritura. H01 conserva matrices y efectos secundarios nulos.
- Mutaciones de reportes: handlers reales, adaptadoresSQL explícitos; error/acuse insuficiente sin cache/JSON adelantados, inexistentes404, éxitos únicamente con acuse. Helpers reales y extraídos del bundle prueban poolausente/error versus[]; affectedRows y lectura posterior, DELETE efectivo, UPDATE sin reinserción. SQL NO ejecutado en motor real.
- Clientes/consumidores: suite APIB confirma upload sin dataURI de éxito, duplicados cerrados en fallo y acciones de reportes estrictas. Handlers reales de galería y promociones prueban upload503 preservando URLs previas, sin inyectar base64, y bloqueo del guardado de preview. Suite React/jsdom heredada confirma panel sin históricos/contadores falsos y formulario que conserva texto; nueva conexión HTTP->fetchReports prueba propagación del backend. No se afirma un único E2E completo de navegador contra MariaDB.
- F007A:6tests de paquete verifican DOM fuente/CSS/idempotencia; nueva renderización React SSR+jsdom comprueba DOM funcional, único widget, ubicación/horarios/pagos/servicio antes de opiniones y enlaces de contacto conservados. CSS verifica escritoriofila3,701-1100fila4 y móvilorder7. No prueba geométrica real ni aceptación del propietario.
- Chromium150 real intentado con about:blank, sin proveedores/datos reales. Falla antes de página: chrome/browser/process_singleton_posix.cc socket() Operation not permitted; ptrace también EPERM. No se eludió seguridad ni se generan capturas simuladas. Sin capturas ni validación visual real.
- No MariaDB real, Hostinger, bases compartidas, despliegues, workflows remotos, SQL real, importaciones, restauraciones ni migraciones. No pruebas de persistencia operativa ni de aislamiento real.

### Incidencias de implementación resueltas

Pruebas iniciales C necesitaban dbLoadAllReports/dbUpdateReport sintéticos para el nuevo contrato; se corrigieron fixtures, no se relajó código. Una prueba de contactos extraía startup por comentario //2.Reports; se conservó la ancla y la prueba vuelve a pasar, sin retirar su aserción antisiembra. Se corrigió la extracción del handler de promociones en el arnés, que incluía un comentario final dentro del wrapper. El primer arnés HTTP no montaba el guardStaging y esperaba503 donde no había handler; se montó el guard real y se verifican403/503 con cero efectos. Se detectó y corrigió preventDefault antes del bloqueo de guardado de preview. Todos los fallos iniciales están separados del resultado final176/176.

### Restricciones operativas y preparación para Staging

1. Coordinación debe revisar este SHA y matriz antes de autorizar integración/despliegue. La compilación local no es aprobación propia.
2. Mantener políticas de seguridad/autenticación/aislamiento y rutas cerradas. Upload y mutaciones administrativas de reportes siguen condicionadas/denegadas por los controles actuales; esta candidata NO los habilita mediante flags generales. Si se requiere activarlos, hace falta alcance y autorización separados para su política, no un bypass.
3. Operador autorizado debe comprobar identidad/independencia de base, cuenta, almacenamiento, permisos mínimos y existencia del esquema reports antes de pruebas reales. Ninguna comprobación aplicada por W1. No crear tablas ni migrar para sortear503. Lectura requiereSELECT; mutaciones, permisos y autorización efectivos adicionales.
4. La envoltura versionada en details usa una columna existente, noDDL; validar compatibilidad/tamaño/SQLmode en laboratorio autorizado. Readback estricto rechaza truncamiento o datos no concordantes, sin prometer rollback ante fallo. Una actualización con affectedRows0 se trata conservadoramente como no confirmada; no se promete idempotencia universal de PATCH.
5. No hay transacción distribuida SQL/JSON/caché, locks entre workers ni idempotencia de POST de reportes. Acuse perdido/readback fallido puede dejar escritura realizada; verificar antes de reenviar, no inventar fracaso definitivo. JSON local sigue secundario.
6. Revisar CSS en dispositivo/navegador permitido y obtener aceptación expresa de F007A. Mantener abierto el registro de incidencias; no cambiar maestro de Coordinación desde esta rama.
7. No se incorporó backend/frontend de clasificados ajeno, sembradores ni tareas nuevas. Contactos históricos intactos y R3/H02/H03 conservados. No cambios en App, seguridad o políticas para pasar pruebas.

### Archivos finales y reversión

Funcionales: server.ts; src/db/mariadb.ts; src/services/api.ts; WordPressSyncModal.tsx; AdminPromotionsTab.tsx; BusinessPublicDetail.tsx/.css. ScriptF007A y seis archivos de pruebas pertinentes; server.js/api/server.bundle.js recompilados; esta bitácora y WORK_RESULTADOS acumulativo. Documentos históricos de paquetes B/C/D no copiados como nuevas entregas; se enlazan mediante sus SHA y se conservan en sus ramas.

Reversión de código mediante commits normales de ESTA tarea sobre base74e3300f, preservando H01-H04/R3 y sinforce. Revertir fuentes y bundles juntos; nunca volver a la consolidación vulnerable original. No hay datos reales que revertir ahora. Si en futuro se habilitan escrituras y existen detallesJSONversionados, conservar lector compatible durante rollback; no restaurar SQL ni borrar metadatos automáticamente. Toda reversión operativa necesita autorización y respaldo selectivo del entorno correspondiente.
