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
