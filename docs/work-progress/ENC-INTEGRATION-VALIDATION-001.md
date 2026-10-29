# ENC-INTEGRATION-VALIDATION-001

Estado: EN_PROGRESO. Fecha:2026-10-29. Base exacta:afa344a291a2f64354989c890f8f55dad0a2af7c. Rama:work/enc-integration-validation-001.

Fase1: SHA y CI40942083179 comprobados(success sobre la misma base); rama nueva creada sin sobrescribir otra. Se consultaron documentación oficial y candidata. WORK_INSTRUCCIONES.md no existe en la candidata; se leyó la copia de coordinación y se registra la diferencia. Fuentes recuperadas contrastadas por hash Git, incluido server.ts completo. Scripts de build actualizan versión: se usarán compiladores directos.

Hallazgos iniciales: permisos SQL de clasificados aceptan grants globales/ajenos por regex; campos de UI no se persisten; price=null no se aplica por COALESCE; recuperación de titular tras POST incierto no está resuelta; cuotas y límite de cuerpo requieren cobertura. Se ampliarán H01-H04, HTTP completo, cliente/router y persistencia.

Laboratorio: descarga de binarios MariaDB en carpeta propia, sin instalación/servicios del sistema. Playwright está disponible pero instalación inicial de browser falló por lock; se investiga descarga aislada. Todavía NO se declara prueba real SQL ni navegador. Sin Hostinger, bases existentes, cambios de variables remotas, integración o despliegue.


## Cierre de implementación y validación — 2026-10-29 UTC

Estado: IMPLEMENTADO / PROBADO LOCALMENTE / PUBLICADO EN RAMA / PENDIENTE DE REVISIÓN. No integrado, no desplegado ni aprobado. Base exacta afa344a291a2f64354989c890f8f55dad0a2af7c, rama work/enc-integration-validation-001.
Checkpoint inicial f734363ee76924de9a714c829ed6c5818595bdab. Implementación publicada 423bb1f80f1b301743a6d08c29ba95ace6acfc55; este cierre añade la espera real de retiro, regresiones H02 y evidencia final. El SHA de cierre es el commit que contiene esta entrada y se entrega al coordinador; no se inventa una autorreferencia.

### Defectos corregidos
1. Contrato GAS/PERP incompleto: subcategoría, colonia, modalidad, tipo de precio, contacto e información adicional se descartaban. Se valida un conjunto cerrado y se persiste en details_json; actualización con lectura fresca y bloqueo de fila. Precio NULL ahora se guarda deliberadamente, no mediante COALESCE.
2. Defaults de formulario inválidos: subcategoría inexistente y colonia "Centro" ajena al catálogo canónico; se usan bazar-electronica y Ciudad del Carmen Centro. WhatsApp no se infiere del teléfono al editar ni publicar.
3. Respuesta inicial perdida dejaba sin credencial al titular: cliente crea secreto aleatorio de 32 bytes y verifica su conservación ANTES del POST. Header separado de clave idempotente; servidor guarda solo hash. Reintento acredita mismo secreto; una clave idempotente sola jamás revela token. Sin almacenamiento local disponible no se envía. Borrado de almacenamiento/navegador distinto no tiene recuperación de identidad: requiere solución futura, no bypass.
4. Duplicados concurrentes del mismo identificador se reconcilian leyendo el registro; contenido diferente conserva 409. Concurrencia de servicio probada con SQL simulado, no con conexiones MariaDB simultáneas.
5. Aislamiento SQL reforzado: rechaza grants globales/ajenos, privilegios amplios/GRANT OPTION, marcador ambiguo, producción y ausencia de índices únicos. No se elimina el guardián de Staging ni se abre una excepción pública de escritura.
6. Límite JSON local 16 kb antes del parser general de 50 MB; 60 mutaciones/min/IP, mapa acotado, errores JSON y no-store. No es CAPTCHA ni defensa distribuida contra abuso.
7. Doble envío de formulario bloqueado con ref; cierre manual durante envío bloqueado. Retiro ahora devuelve/espera Promise, no cierra en fallo y evita doble solicitud. Al editar se actualiza la ficha seleccionada.
8. Alta empresarial confirmada invalida catálogo pendiente, comparte contador/abort de navegación. H02 probado ejecutando los handlers/effects reales de App con respuestas diferidas, incluido transporte que ignora abort.
9. H03/H04: matrices ejecutadas de 400/500/502/no JSON/red/lectura posterior/reintento; UUID conservado y sin éxito de reportes sustituido por localStorage. Se conservaron las correcciones de Coordinación.

### Pruebas finales ejecutadas
Entorno: Node24.22.1, TypeScript7.0.2, Vite8.3.5, esbuild0.28.2. Dependencias disponibles de laboratorio reutilizadas; no se modificaron package/lock ni se afirma npm ci limpio contra lock.
Comando reproducible principal (sin .env ni credenciales, salida fuera del repositorio):
    node tests/run-integration-validation.mjs /tmp/enc-iv-results-NUEVO
Ejecutado en esta entrega con salida ../iv-lab/final-run:
- tsc --noEmit: PASS, exit0, cero diagnósticos.
- 12 suites: 128 PASS / 0 FAIL / 0 skipped. Lista exacta en runner y salida en evidencia.
- vite build --outDir temporal: PASS. Advertencia chunk >500kb, sin cambiar versión.
- esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile temporal: PASS.
- Servidor COMPLETO compilado en fixture nueva: 6 grupos PASS. Login scrypt/sesiones sintéticas operativos; 60 ataques Radar alternando PUT/PATCH/DELETE, cinco rutas y cuatro identidades rechazados. GET/POST/OPTIONS de búsqueda no abren handlers mutantes. Logout revoca, respaldos403, catálogo sintético intacto. Red saliente bloqueada y listener127.0.0.1. Sin credenciales ni conexiones SQL.
- Cliente API real -> Express real -> servicio real con SQL simulado: alta con respuesta perdida, replay con credencial conservada, edición completa/NULL, consulta y retiro. Tamaño413 y abuso429. TTL7d, vendido/expirado, autorización403, conflicto409 y permisos SQL503. Filtros parametrizados antes de LIMIT, sin interpolación del término de búsqueda.
- H02: dos escenarios de carrera reales en closures/effects y uno adicional de retiro asíncrono. No se presentan como pruebas DOM/navegador.
- SQL NATIVO MariaDB10.11.14: 10 comprobaciones PASS. Datadir nuevo, sin red ni .env. CREATE/INSERT/readback entre procesos reiniciados, unicidad, UPDATE/NULL/contactos, rollback, JSON, retiro/expiración y marca. Error SQL deliberado retorna proceso fallido; el INSERT previo persiste por autocommit, lo que confirma por qué un error posterior no permite afirmar que nada se escribió.
Comando SQL aislado:
    node tests/integration-validation-mariadb-bootstrap.mjs /ruta/distribucion-mariadb-extraida/usr
El script solo acepta distribución, crea su propio datadir y esquema aleatorio. No acepta bases existentes, no tiene DROP y no ejecuta migraciones de aplicación.
- MariaDB por protocolo mysql2/HTTP, usuario mínimo efectivo y concurrencia SQL REAL: NO PROBADOS. El daemon no puede abrir socket Unix (EPERM), incluso al usar TCP. No se eludió seguridad del entorno.
- Chromium150.0.7871.100: versión ejecutable comprobada; lanzamiento Playwright FALLA antes de crear página: process_singleton_posix.cc socket() Operation not permitted. Sin capturas ni validación visual responsive. Runner preparado para320/360/390/834/1440, pendiente de ejecución en entorno que permita Chromium; no declararlo aprobado.
Intento reproducible (Playwright instalado aparte, sin cambiar package/lock):
    ENC_IV_PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs node --import tsx tests/integration-validation-browser.mjs /ruta/chromium
Este arnés es preparatorio y no pasó navegación por el bloqueo de arranque; sus pasos UI todavía requieren validación.

### Iteraciones fallidas corregidas y límites
El refuerzo de grants invalidó la antigua fixture que otorgaba *.*: se sustituyó por permisos sintéticos mínimos; NO se relajó código. Un ancla contigua del parche empresarial quedó separada al mover el router; se reordenó el montaje conservando límite previo al parser y pasó idempotencia del parche. El test estático heredado de retiro esperaba callback void: se actualizó al contrato Promise y se añadió prueba de espera/fallo/reintento sobre handler real. Se corrigió una carrera de reloj en la fixture de expiración; el resultado final128/128 corresponde a la última ejecución con runner en entorno limpio.
Bootstrap inicialmente recibió múltiples sentencias en una línea: se corrigió delimitación y volvió a ejecutarse con10/10. La descarga inicial de Chromium fue incompleta; se obtuvo paquete completo, versión real y dependencias, pero arranque siguió bloqueado por EPERM. Ningún intento fallido se cuenta como PASS.
No se ejecutaron scripts de build que incrementan versiones. No se publican dist/server.js/api/server.bundle.js: continúan siendo artefactos heredados y NO representan estas fuentes. Recompilación desde fuentes obligatoria en cualquier empaquetado posterior autorizado.

### Archivos y evidencia
Funcionales: server.ts, src/server/publicClassifieds.ts, src/services/api.ts, src/App.tsx, src/components/ClassifiedCreateModal.tsx, src/components/ClassifiedDetailModal.tsx.
Pruebas: tests/public-classifieds.test.mjs; tests/classifieds-integration-002.test.mjs; tests/support/classifiedsMemoryPool.mjs; tests/support/iv-full-server-preload.cjs; tests/fixtures/public-classifieds-lab.sql; tests/integration-validation-{regressions.test,navigation.test,full-http,mariadb-bootstrap,browser}.mjs; tests/run-integration-validation.mjs.
Documentos: este checkpoint, WORK_RESULTADOS.md (solo append), ENC-INTEGRATION-VALIDATION-001-evidence/ (README, logs de suites/build, resultados runner/HTTP/SQL y bloqueo Chromium).
Evidencia: [directorio](ENC-INTEGRATION-VALIDATION-001-evidence/README.md).

### Bloqueos y siguiente decisión de Coordinación
- details_json es una columna NUEVA necesaria para conservar metadatos. Solo existe en el esquema del laboratorio. No se ha aplicado ALTER ni DDL en Staging; verificar esquema y autorizar por separado migración segura antes de habilitar operaciones. Hasta entonces, fallo cerrado.
- Escrituras públicas de clasificados siguen bloqueadas por guardián general de Staging. No activar flags ni ampliar excepciones como parte de esta tarea.
- Completar en laboratorio permitido: mysql2/HTTP con usuario de permisos mínimos, concurrencia SQL, restart de aplicación y readback; después validación real de navegador y responsive. SQL bootstrap no sustituye esos criterios.
- Fotografías/uploads públicos siguen deshabilitados. Credencial de titular no recuperable si se elimina almacenamiento; no hay identidad verificada ni cuenta de usuario.
- Rate limit local no sustituye control distribuido; revisión de privacidad/retención y abuso sigue siendo necesaria.
- No se tocaron main/ia/coordinación/Hostinger/variables reales, Staging ni producción. No PR, merge ni despliegue.
- Recomendación: revisión independiente de código y evidencia; NO habilitar/desplegar automáticamente. No se autoaprueba implementación.
Reversión: antes de integración, conservar/descartar rama sin afectar compartidas. Si se incorporara después, revertir commits de ESTA tarea en orden inverso mediante commits normales, preservando cambios ajenos. No force ni rollback SQL: esta ejecución no cambió bases compartidas.
