# ENC-STAGING-HTTP-E2E-CLOSURE-001 — W5

## Checkpoint 1 — inspección (2026-10-30 UTC)
Base real ia-desarrollo: `4407e6aeb08b52cc750c952735467a0e04fe19cc`.
Rama creada tras verificar ausencia: `work/enc-staging-http-e2e-closure-001`.
Repositorio confirmado por conector y git ls-remote/clone. Sin cambios a main/ia.

Leídos CONTEXTO_ENCARMEN.md, WORK_RESULTADOS.md, fuentes requeridas y package.json.
WORK_INSTRUCCIONES.md y registro maestro no existen en base; consultados en
origin/coord/encarmen-work-control-001. No AGENTS.md en checkout.

Orden real: contención de descargas → registerAdminSecurity (parser/login propio,
provider ENC_ADMIN_CREDENTIALS_JSON, tokens X-Encarmen-Admin-Token, permisos/origen)
→ guard Staging → parser JSON general → GET estricto → rutas Staging → legado.
POST /api/submit-business y PATCH /api/businesses/:id usan stagingBusinessStore,
transacción, marcador/grants/esquemas, InnoDB/PK, lock de altas, readback y COMMIT.
GET /api/businesses exige lectura MariaDB fresca; health informa escrituras GENERALES,
no la capacidad empresarial. No inferir capacidad empresarial de ese indicador.
Ruta pública separada requiere PUBLIC_REGISTRATION_ENABLED; no se habilitará.
Legado POST retirado (503); PATCH Staging es interceptado antes del legado.
Rutas no empresariales bloqueadas por guard/autorización.

Riesgos encontrados para ensayar: pruebas actuales de HTTP usan SQL simulado;
readback de store solo compara contactos, no otros campos; gestión de conexiones
ante rollback/lock/commit inciertos merece regresión. Ningún defecto se declara
confirmado sin reproducción. No se ejecutan scripts históricos.

Historial revisado: cinco ramas coord solicitadas, resultados runtime map,
HTTP persistence, business window, write guard y SQL transaction; scripts de
instancia temporal, activación/restauración de ventana y transacción auditados.
La sonda anterior esperaba health.environment correctamente, pero no logró
loopback; limpieza dependía de recibir ID, insuficiente ante interrupción tras
COMMIT. La prueba SQL validaba identidad DESPUÉS de ejecutar el bloque completo;
no es patrón seguro para reutilizar. Los scripts de activación modifican .env
remoto: excluidos de esta tarea. Runtime map usaba separación de NUL incorrecta.
Ningún script/workflow remoto ejecutado ni copiado.

GET público 2026-10-30T19:33Z: health 200, staging, readOnly=true,
writesPermitted=false, mariadb, 207 negocios. /api/version devolvió
6618e1d53de1f229-1793375896229; no contiene SHA Git verificable. Por ello no se
certifica que Hostinger ejecute el SHA inspeccionado; evidencia histórica no basta.
No hubo solicitudes a producción ni cambios remotos.

Entorno: Node 24.19.0; Docker local 28.4.0; imagen mariadb:11.4 descargada,
digest sha256:d1891ede5a559f1086f55053bb8cc1569b0298338c4d72d71725a7f74f6ba620.
Primer clone falló por sandbox de red; con permiso de red funcionó.
npm ci FALLÓ por lockfile preexistente incompleto (dependencias opcionales).
Para continuar: npm install --no-package-lock --ignore-scripts, sin cambiar
manifiestos. Esta instalación no equivale a npm ci exitoso.

Siguiente: harness de servidor real compilado en directorio temporal sin .env,
MariaDB efímera sin datos reales, cuenta SQL mínima, pruebas HTTP/SQL y limpieza.
No integración/despliegue/aprobación.

## Checkpoint 2 — harness preparado
`scripts/test-staging-http-e2e.mjs`: compila TODO server.ts sin sustituir rutas,
guards, proveedor, pool ni serializador. Arranca en CWD temporal sin .env ni
semillas; entorno hijo allowlist, solo SQL 127.0.0.1 y cuenta aleatoria mínima.
Docker local explícito; MariaDB --rm, datos en tmpfs, puerto solo loopback.
Marcador y DDL businesses extraído de mariadb.ts; sentinel sintético.
Limpieza de fila exige ID+nombre exacto+UUID interno. Finalmente destruye solo
contenedor con etiquetas/identidad verificadas. Journal previo al arranque
permite --cleanup tras SIGKILL, sin necesitar credenciales; no usa Hostinger.

Primer ensayo de preparación falló por default de token del harness (undefined
heredaba sesión), no por bypass de backend. Corregido a null explícito. Espera
de proceso terminado por señal corregida para revisar signalCode. Recuperación
manual del contenedor con journal ejecutada: OWNED_EPHEMERAL_CONTAINER_REMOVED.
No es una prueba completa aprobada. Lint inicial exit 0. Pruebas SQL/HTTP en curso.

## Checkpoint 3 — ejecución real sobre código BASE
2026-10-30T19:38:30Z: `node scripts/test-staging-http-e2e.mjs --probe-readback`
exit 0 (modo que EXIGE reproducir el defecto). Store original recuperado con
`git show 4407e6a:src/db/stagingBusinessStore.ts`; corrección en preparación
restaurada al finalizar. Bundle base SHA256
41e165f267041403b6d2aa01b32016de7650f03d93c24ce21c6a6e768b41d197.
Evidencia íntegra saneada: `ENC-STAGING-HTTP-E2E-CLOSURE-001-evidence/before-fix.json`.

POST 201 → SQL independiente ID4001/contactos; replay 200 y dos concurrentes200,
COUNT=1; conflicto409; PATCH200 → SQL descripción; reinicio de aplicación → GET
200 mariadb. SQL SIGNAL INSERT/UPDATE →503; marcador ausente/production→403;
cuatro flags apagados individualmente bloquean POST/PATCH/alias con503.
Sentinel intacto, DELETE exacto1/restantes0, contenedor/tmpfs destruido.

DEFECTO CONFIRMADO: trigger BEFORE UPDATE conserva NEW.description=OLD.description.
PATCH devuelve200/success=true y raw_data descripción nueva, pero columna SQL
mantiene la anterior. Al serializar se oculta diferencia con alias de raw_data.
No basta validar contactos. Corrección dirigida: cotejar columnas efectivamente
escritas y raw_data antes del COMMIT en create/update; discrepancia503+rollback.

Ajustes de harness durante preparación: health json_cache es esperado cuando
STAGING_DB_CONFIRMED=false impide initMariaDb; no esperar MariaDB en ese caso.
REVOKE SELECT no invalida privilegios cacheados de conexiones existentes; para
fallo determinista de GET se renombra temporalmente businesses SOLO en contenedor
propio y se restaura. Primer probe completo falló por esos supuestos del harness;
no se cambió código operativo para hacerlos pasar. Proceso/señal y recuperación
con etiquetas conservados. No scripts remotos, configuración ni datos reales.

## Checkpoint 4 — corrección y regresiones
`src/db/stagingBusinessStore.ts`: helper matchesWrittenValues coteja ID,
columnas escritas y objeto raw_data completo (comparación profunda), antes de
COMMIT. create conserva error REGISTRATION_READBACK_FAILED503; update mantiene
CONTACT_READBACK_CONFLICT409 y añade BUSINESS_READBACK_FAILED503 para los otros
campos. No cambia rutas, autenticación, permisos, flags, DDL o catálogo real.

Prueba final real `node scripts/test-staging-http-e2e.mjs`: exit0, evidencia
http-sql-results.json. Servidor completo compilado desde fuente; SQL real
MariaDB11.4, cuenta SELECT/INSERT/UPDATE sin DELETE/DDL ni acceso a otros esquemas.
POST201, SQL ID4001, replay/concurrencia200 COUNT1, PATCH200, SQL independiente,
GET200 fuente mariadb después de reiniciar proceso. Trigger descarta descripción:
ahora503/success=false y rollback. Trigger descarta raw_data:503+rollback.
Trigger descarta descripción del INSERT:503 y COUNT0. SIGNAL SQL:503 sin éxito.
Fallo SELECT con caché caliente:503. Marcador ausente/production:403.
Flags apagados individualmente:POST/PATCH y alias503. Sentinel idéntico.
Limpieza exacta affectedRows1, restantes0, solo sentinel antes de destruir tmpfs.

`node scripts/test-staging-http-e2e.mjs --test-recovery`: exit0; hijo de prueba
recibe SIGKILL después de POST confirmado por SQL. Journal permite verificar
etiquetas/identidad, detener servidor por PID+CWD+cmdline exactos y destruir solo
contenedor efímero propio; cero contenedores restantes y servidor detenido.
SIGTERM/SIGINT también limpian. Tras caída completa del entorno, usar --cleanup
con journal registrado; la recuperación de SIGKILL requiere ejecutar ese comando,
no se promete finally ante SIGKILL. Ningún volumen persistente de BD.

Regresión: `node --import tsx --test tests/staging-write-001.test.mjs
 tests/staging-isolation-proof.test.mjs tests/staging-store-default-strict.test.mjs
 tests/public-registration-integration.test.mjs`:43/43,0fallos,0omitidas,exit0.
Incluye SQL simulado/error commit ambiguo como COMPLEMENTO a la prueba real.
Intento inicial sin loader:38PASS+1archivo fallido por import TS sin extensión;
corregida invocación con tsx, sin modificar fuentes ajenas.
`npm run lint`:exit0. `npm --prefix /tmp/enc-w5-build run build`:exit0,
1726 módulos; copia de1271 entradas rastreadas necesarias, store modificado,
node_modules enlazado, sin.env; cambios de versión/dist/bundles solo temporales.
Aviso chunk>500kB. npm ci continúa FALLIDO por lockfile previo, no reparado fuera
de alcance. Instalación auxiliar jsdom --no-save para suites existentes.
Logs completos saneados y versiones: carpeta de evidencia. git diff --check:0.

### Reproducción por Coordinación
Requisitos: Linux, Node24 probado (Node22 Hostinger no ensayado), Docker local
Unix socket, imagen fijada por digest, dependencias de package.json y esbuild.
1. Checkout de esta rama en entorno sin secretos. No arrancar servidor en CWD
   del despliegue ni ejecutar scripts ops/coord históricos.
2. Intentar npm ci; si persiste EUSAGE del lockfile, conservar fallo y utilizar
   npm install --no-package-lock --ignore-scripts en copia aislada. Instalar
   jsdom con --no-save --no-package-lock para las regresiones preexistentes.
3. docker pull mariadb:11.4@sha256:d1891ede5a559f1086f55053bb8cc1569b0298338c4d72d71725a7f74f6ba620
4. node scripts/test-staging-http-e2e.mjs
5. node scripts/test-staging-http-e2e.mjs --test-recovery
6. Si proceso fue interrumpido externamente: node scripts/test-staging-http-e2e.mjs
   --cleanup /tmp/enc-w5-http-<valor-real>/cleanup.json (ruta impresa al inicio).
El harness NO acepta host, base, usuario o claves externos; siempre crea su
propia MariaDB temporal. Credenciales aleatorias solo en memoria/entorno hijo.
--probe-readback exige reproducir el defecto y SOLO corresponde al store BASE;
no es el comando de aceptación del código corregido. before-fix.json conserva
la corrida base; diff del commit correctivo muestra antes/después.

### Límites y pendientes
No probar ni habilitar escritura pública; no modificar .env remoto, reiniciar
Hostinger, ejecutar workflow, integrar, aprobar o desplegar. Fuente corregida
requiere build posterior por Coordinación; server.js/api/server.bundle.js y dist
rastreados NO fueron actualizados en esta rama. El harness siempre recompila.
No confundir bundles heredados con corrección desplegada.
No certificamos SHA del proceso Hostinger con endpoint de versión sin SHA.
Revisar lockfile como tarea independiente; no se afirma instalación limpia.
Revisión independiente, integración autorizada y prueba pública de POST/PATCH
siguen pendientes. Los criterios HTTP/SQL quedan demostrados EN ENTORNO AISLADO.
