# ENC-SECURITY-CONTAINMENT-003
Fecha:2026-10-29 (America/Mexico_City).
Estado: PROBADO_POR_WORK en aislamiento. NO integrado ni desplegado.
Rama:work/enc-security-containment-003.
Base ia-desarrollo:0d231cb2779b7a14d8d336fc2f4de3782663c738.
Referencias selectivas:auth31cb31c7a51c2ae2ad8a457b4fc902991575dcfe y backups e8541290e082b8cfebe24086b782f3e0ff5d5045.
No se fusionaron ramas completas. Coordinación:51ae3a45a6f82bc8fcec9f02432835f312ce8c02.

## Contención implementada
1. Se eliminan cuentas/contraseñas fijas del servidor y login/cambio de contraseña heredados. El cambio de contraseña HTTP queda denegado incluso para administrador; no modifica credenciales ni bases.
2. Factoría de sesiones de auth001 adaptada a src/server/adminSecurity.ts: tokens opacos aleatorios de32 bytes, digest HMAC en memoria, expiración máxima6h, logout, permisos emitidos por servidor y rate limit5/min por origen de red observado. No cookies/roles/flags del cliente como autoridad.
3. Guard central antes de CORS, parsers/middleware legados y handlers administrativos. Protege admin/aliases, diagnóstico y operaciones MariaDB, edición/eliminación de negocios, aprobaciones, mutaciones de eventos/clasificados, reportes privados y emergencias. Cubre variantes de mayúsculas/decodificación. Se elimina bypass de rate limit por mera presencia de headers y autorización de emergencias basada en flags/Authorization inventado.
4. MariaDB reconnect/sync-catalog exigen sesión admin:manage y habilitación explícita de mutaciones; no pueden invocarse anónimamente.
5. Banner/logotipo conserva actualización de medios autorizada, pero elimina import child_process y todos los comandos de versión/Git/add/commit/push. commitAndPush se ignora. Respuesta gitPushed=false; no se revela salida de shell ni rutas en errores de ese handler.
6. PIN heredado retirado: no carga/listado/generación/archivo/log de PIN ni clave maestra. Rutas list/generate/verify devuelven410 cuando alcanzan el handler autorizado; sin sesión o con mutaciones cerradas se deniegan antes. No se eliminan archivos PIN existentes.
7. adminAuth.ts reutilizado de auth001: sin hashes/fallback/flags locales válidos. Login requiere token Y comprobación /api/admin/session. Logout también solicita revocación. adminFetch solo adjunta token a rutas API del mismo origen y rechaza redirects cuando lo adjunta.
8. API de cliente y modal administrativo envían token mediante ese helper. Se añade entrada manual de usuario configurado porque ya no hay cuentas predeterminadas publicadas antes de autenticarse. App elimina su bypass independiente de contraseña local. No rediseño.
9. Backup guard aprobado ya incluido en base: conservado byte por byte respecto a e854129; montado antes de autenticación y estáticos. Sigue denegando descargas incluso a administradores. CLI de release ZIP sigue deshabilitado; no se genera alias ni se modifica un backup.

## Proveedor seguro y acceso del propietario
Runtime usa environmentAdminProvider(process.env), NO el autenticador de un mock.
Si falta configuración o es inválida: login503; no acepta credenciales históricas. No se han cambiado secretos/configuración real.

Configuración pendiente del operador, fuera de esta tarea:
- ENC_ADMIN_PUBLIC_ORIGIN: origen HTTPS exacto sin path/query/fragment/credenciales, por ejemplo el origen aprobado del entorno.
- ENC_ADMIN_CREDENTIALS_JSON: JSON servidor, versión1, entre1 y20 cuentas:
  {"version":1,"accounts":[{"username":"<usuario>","passwordHash":"scrypt$<salt-hex>$<hash-hex>","permissions":["admin:manage","business:manage","business:delete","business:publish","event:manage","classified:manage"]}]}
  Es una plantilla: los placeholders NO son credenciales utilizables.
  Username1..64 caracteres ASCII alfanuméricos, punto, guion o guion bajo; sin duplicados ignorando mayúsculas.
  Salt aleatorio16..32 bytes en hexadecimal y digest64 bytes en hexadecimal.
  Derivación: Node crypto.scrypt, N16384/r8/p1 predeterminados; contraseña12..200 caracteres, generada/introducida privadamente por el propietario. Nunca enviar contraseña/hash por chat ni guardarlos en Git.
  Otorgar únicamente los permisos necesarios. El servidor rechaza permisos desconocidos.
- ENC_ADMIN_MUTATIONS_ENABLED: ausente/false por defecto. Una sesión válida puede consultar, pero las mutaciones devuelven503. true solo después de revisión de permisos/persistencia. Además se exige isWritePermitted(): no evade el guard de Staging/read-only.
- Configurar en secretos/variables exclusivas del servidor, no VITE_*, frontend ni portal_config.json.
- La rotación se hace en el proveedor configurado y requiere reinicio autorizado de todos los procesos para cargarlo e invalidar sesiones. No utilizar change-password heredado.

No hay bloqueo irreversible: no se borran cuentas de BD ni archivos de credenciales. La administración puede autenticarse mediante el proveedor real una vez configurado correctamente. La activación no se ejecutó; cualquier cambio de Hostinger/reinicio exige autorización posterior.
Las credenciales históricas expuestas requieren rotación por el propietario; retirarlas del código actual no las vuelve secretas en el historial.

## Pruebas ejecutadas
Node24.22.1 y Node22.23.4; Express4.22.3, esbuild0.28.2, TypeScript7.0.2, Vite8.3.5.
- node --test tests/security-containment-003.test.mjs:18/18 PASS (Node24).
- Matriz final Node22: fuente, ENC_SECURITY_EXECUTABLE=server.js, ENC_SECURITY_EXECUTABLE=api/server.bundle.js:18/18 cada modo,54 ejecuciones de grupos/0 fallos/omitidos. No son54 escenarios diferentes.
- Backup security: node --test tests/backup-security-002.test.cjs y ENC_BACKUP_EXECUTABLE=server.js/api/server.bundle.js:9/9 cada modo.25 rutas históricas en GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS; variantes, ZIP/SQL estáticos, codificaciones, recursos públicos, CLI y conservación de fixtures.
- tsc --noEmit:PASS, también ejecutado con Node22 y entorno limpio.
- Vite directo:PASS,1722 módulos. Advertencia de chunk>500kB.
- esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.js; copia api/server.bundle.js:PASS.
- node --check ambos bundles y git diff --check:PASS.

HTTP real por loopback Express: scrypt real con contraseña SINTÉTICA, login, sesión, permiso insuficiente, headers/token falsos, origen cruzado, logout, expiración, límite login, cuerpos inválidos/413, guard de mutaciones, cambio de contraseña bloqueado, PIN retirado y lectura pública preservada.
Se extraen handlers reales de server.ts y módulos de seguridad reales. Los modos compilados extraen solo la sección adminSecurity de cada bundle, nunca ejecutan servidor completo. MariaDB está sustituida por callbacks de prueba; fs del banner apunta exclusivamente a un directorio de fixtures. Positivo de MariaDB significa autorización/despacho, NO conexión ni persistencia real.
Cliente: contrato simulado prueba que flags no crean sesión, login exige verificación y token no se adjunta a URL externa/redirects. No se declara prueba visual completa.

Incidencias corregidas: tipos explícitos del proveedor; faltaban URL/Buffer/portalConfig en VM de pruebas; búsqueda de montaje confundía la definición de factoría con su invocación en bundle. Esos fallos del arnés no se contabilizan como PASS; batería final completa aprobada.

## Artefactos y coherencia
Backend server.js/api/server.bundle.js idénticos:
SHA256 a12f66f97a6b45f9fad86ab6bad6301bb3050bf72a8f397de8d0c56de289675a.
src/server/adminSecurity.ts:
3ea043019f9dd15fce077beea1713907439b0a384a5e6bd5f89f6e05bd0fb710.
dist/index.html:
3ff23070d3ef89a8afa10c7937e5463df02a8e7f1d2a9bb71716ee2219277052.
Frontend generado:
dist/assets/index-DuBn4P_z.js, dist/assets/index-OcaulTXa.css.
No se borran assets históricos. Identificar versión por SHA/huellas, no solo etiqueta visual heredada.
No package.json/lock, scripts de versión, DB, Editor o estilos ajenos modificados.

## Reproducción segura
En copia independiente sin .env/credenciales:
- Instalar dependencias con --ignore-scripts; herramientas de prueba esbuild/TypeScript/Vite/Express fuera de manifests si no están disponibles.
- node --test tests/security-containment-003.test.mjs
- ENC_SECURITY_EXECUTABLE=server.js node --test tests/security-containment-003.test.mjs
- ENC_SECURITY_EXECUTABLE=api/server.bundle.js node --test tests/security-containment-003.test.mjs
- node --test tests/backup-security-002.test.cjs
- ENC_BACKUP_EXECUTABLE=server.js node --test tests/backup-security-002.test.cjs
- ENC_BACKUP_EXECUTABLE=api/server.bundle.js node --test tests/backup-security-002.test.cjs
- tsc --noEmit; invocar Vite/esbuild directamente con salida temporal o copia aislada.
No iniciar dev/start, server.ts, bundles completos ni initMariaDb. No ejecutar npm run build/prebuild porque actualizan versión.

## Bloqueos y riesgos operativos
- Contención verificada en código y localmente, NO en sitios desplegados.
- Sin proveedor configurado el login falla503 intencionadamente. Con proveedor pero sin mutaciones habilitadas, consultas autorizadas posibles y escrituras503.
- No activar mutaciones sin revisar persistencia/privilegios. Los handlers legados mantienen sus contratos best-effort; esta tarea no los certifica ni reescribe.
- Sesiones y rate limit son por proceso. Varios workers requieren diseño de sesiones compartidas o afinidad y política de revocación; no se implementa infraestructura.
- Validar integración del formulario/token con la UI efectiva y consumidores administrativos legados antes de habilitar administración. No se certifica cada pantalla.
- El bloqueo Express NO controla archivos que Hostinger/CDN sirvan directamente; restringir rutas/archivos externos requiere revisión operativa separada y autorización. No se declara hosting protegido.
- Historial Git, assets antiguos y credenciales previamente expuestas requieren tratamiento/rotación independiente. No se reescribe historial.
- Public uploader, protección antiabuso del registro y seguridad integral del portal no quedan certificadas por esta tarea.
- Cambio de contraseña web y flujo PIN permanecen retirados hasta un mecanismo seguro autorizado; no reactivarlos como atajo.

## Reversión
Mantener rama aislada hasta revisión. Si se integra bajo autorización, revertir únicamente commits de esta tarea con una release coherente de frontend/backend; no SQL ni eliminación de respaldos. Revertir a código vulnerable reabre contraseñas/PIN/Git automático, por lo que debe evaluarse antes. La configuración del proveedor/rotación/reinicio es una operación posterior del propietario, no realizada aquí.
Sin main/ia, Hostinger, bases reales, credenciales reales, PR, integración o despliegue.

## Publicación y verificación remota
Implementación: https://github.com/dJeoMed78/Encarmenorg/commit/153b557ded6a6d4ec54272eda057ed31421afc82
Comparación contra0d231cb2779b7a14d8d336fc2f4de3782663c738: ahead_by=1,behind_by=0; exactamente14 archivos previstos, sin eliminaciones. Árbol remoto14/14 blobs coincide con los contenidos locales probados y sus hashes Git. No se modifican package/lock, DB, scripts ZIP, Editor ni ramas ajenas.
Este cierre solo registra publicación/evidencia. No cambia código ni añade pruebas ficticias; autorización de integración/despliegue pendiente.
