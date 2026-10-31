# ENC-STAGING-WRITE-GATE-005-GAS

Estado: PROBADO_LOCALMENTE_POR_GAS en aislamiento y suites automatizadas. No aprobado, integrado ni desplegado por Coordinación.
Rama Base: coord/staging-origin-deploy-20261030
SHA Base: 0d09e02efc9f96f0e589c4604a1dc6f61f30c1d5
Rama de Trabajo: work/enc-staging-write-gate-005-gas

## 1. Causa Demostrada del HTTP 503

En el despliegue de Staging en Hostinger (`ENC_STAGING_PERMANENT_ADMIN_PUBLIC_E2E_RESULT.txt`), el inicio de sesión administrativo (`POST /api/admin/login` -> 200) y la consulta de sesión (`GET /api/admin/session` -> 200) funcionaban correctamente durante la ventana de prueba, pero las llamadas de comprobación (`POST /api/submit-business`) devolvían de manera persistente HTTP 503 (7 reintentos en 6 minutos) hasta que el test expiró (`BLOCKED_HOSTINGER_WRITE_WINDOW_RESTART_NOT_CONFIRMED`).

El análisis del código fuente demostró la causa exacta:

1. **Discrepancia en la fuente de verdad**:
   - `privateStagingAdminIdentity` en `server.ts` leía dinámicamente en cada petición el archivo privado canónico `.../hbuilds/config/.env`. Por ello, al añadir la cuenta temporal `enc_e2e_temp` en disco, Node.js reconoció inmediatamente las credenciales sin necesidad de reinicio (HTTP 200).
   - En contraste, la autorización de mutaciones en `server.ts:231` evaluaba:
     `mutationsEnabled: process.env.ENC_ADMIN_MUTATIONS_ENABLED === 'true'`
     y `src/db/mariadb.ts:1289` evaluaba:
     `stagingBusinessConfiguration(process.env, PRODUCTION_DB_USER) && privateStagingBusinessWindowOpen(process.env)`
   - Debido a que Node.js en Hostinger arrancó con la configuración de línea base (`STAGING_READ_ONLY=true`), las variables de `process.env` permanecieron congeladas con los valores iniciales.
   - Aunque el script de E2E modificó el archivo `.env` en disco para abrir la ventana (`STAGING_BUSINESS_WRITES_ENABLED=true`, `ENC_ADMIN_MUTATIONS_ENABLED=true`, `STAGING_READ_ONLY=false`), `process.env` nunca se actualizó en memoria.
   - En consecuencia, `administrativeWritesReady` devolvió `false` y el middleware de `adminSecurity` (línea 112) bloqueó la petición con HTTP 503:
     `"Operación bloqueada hasta habilitar administración segura."`

2. **Diferenciación de capas**:
   - El HTTP 503 reportado en el E2E provino del middleware central de seguridad administrativa (`adminSecurity`), antes de alcanzar la validación del cuerpo o los handlers de MariaDB.
   - Al no resolverse la ventana desde el archivo privado en `writesReady` e `isBusinessWritePermitted`, la petición nunca llegó a `store.create`.

## 2. Cambios Implementados (5 Archivos Autorizados)

Se aplicó la corrección mínima y aislada estrictamente dentro de los 5 archivos autorizados:

1. **`src/server/stagingBusinessSecurity.ts`**:
   - Se implementó `resolvePrivateStagingConfigPath` y `getPrivateStagingSnapshot`: resuelve y valida la configuración privada canónica (`.../domains/staging.encarmen.org/hbuilds/config/.env`) en cada petición.
   - Valida permisos de archivo estrictos (`stat.mode & 0o077 === 0`), rechaza symlinks, archivos ausentes y configuraciones con claves duplicadas en variables críticas.
   - Verifica invariantes de seguridad: `APP_ENV === 'staging'`, `DB_NAME === 'u293982346_encarmentest'`, rechazo terminante del usuario de producción (`u293982346_appuser`) o base de producción (`u293982346_encarmenapp`), y comprobación de correspondencia con la conexión MariaDB activa.
   - Se adaptó `privateStagingBusinessWindowOpen` para validar dinámicamente los 4 flags de la ventana (`STAGING_READ_ONLY=false`, `STAGING_DB_CONFIRMED=true`, `STAGING_BUSINESS_WRITES_ENABLED=true`, `ENC_ADMIN_MUTATIONS_ENABLED=true`) desde la instantánea privada validada.

2. **`src/server/consolidatedWritePolicy.ts`**:
   - Normalización de ruta en `administrativeWritesReady` para asegurar coincidencia exacta de `cleanPath`.
   - Se mantiene el bloqueo estricto: autoriza de forma exclusiva `POST /api/submit-business`, `PATCH /api/businesses/:id` y `PATCH /businesses/:id`. Deniega de forma terminante `DELETE` y cualquier otra mutación.

3. **`server.ts`**:
   - `privateStagingAdminIdentity`: reutiliza `getPrivateStagingSnapshot` para unificar la resolución y validación de la identidad privada contra la conexión efectiva.
   - `writesReady`: evalúa dinámicamente en Staging la instantánea privada real (`snapshot.ENC_ADMIN_MUTATIONS_ENABLED === 'true'`) coordinada con `isBusinessWritePermitted()`, eliminando la dependencia de las variables estáticas congeladas de `process.env`.

4. **`src/db/mariadb.ts`**:
   - Registro de identidad de conexión: se conserva el usuario efectivo conectado (`connectedUser`) y la base conectada (`connectedDatabase`) en `initMariaDb`.
   - `isBusinessWritePermitted`: verifica la conexión MariaDB viva, la correspondencia del usuario conectado con la instantánea privada validada, y comprueba `stagingBusinessConfiguration` y `privateStagingBusinessWindowOpen` contra la instantánea del archivo privado.
   - En `stagingBusinessStore`: se inyecta `verifyIsolation` para verificar el aislamiento contra la instantánea privada antes de la conexión y re-verificar `canWrite` antes del `COMMIT` transaccional.

5. **`src/server/stagingIsolationProof.ts`**:
   - En `verifyStagingIsolation`: cuando `env` evaluado es `process.env` y carece de variables completas en runtime de Hostinger, se fusiona de forma segura con la instantánea privada validada (`getPrivateStagingSnapshot()`).
   - Mantiene intacta la comprobación cerrada: grants mínimos, esquemas aislados y tabla de marca de entorno (`encarmen_environment_marker`).

## 3. Pruebas Reales Ejecutadas Localmente

Se crearon 2 archivos de prueba autorizados en `tests/`:
- `tests/enc-staging-write-gate-005-unit.test.mjs` (12 aserciones sobre los 15 puntos requeridos).
- `tests/enc-staging-write-gate-005-http.test.mjs` (prueba de integración del pipeline HTTP completo de apertura y revocación dinámica de ventana sin reinicio).

### Matriz de los 15 Escenarios Obligatorios Verificados:
1. **Readonly bloquea POST**: VERIFICADO (PASS). En línea base readonly, `administrativeWritesReady` e `isBusinessWritePermitted` deniegan `POST /api/submit-business`.
2. **Readonly bloquea PATCH**: VERIFICADO (PASS). En línea base readonly, `administrativeWritesReady` deniega `PATCH /api/businesses/:id`.
3. **Ventana segura permite POST autorizado**: VERIFICADO (PASS). Con flags activos en snapshot privado, `POST /api/submit-business` es autorizado (HTTP 201).
4. **Ventana segura permite PATCH autorizado**: VERIFICADO (PASS). Con flags activos en snapshot privado, `PATCH /api/businesses/:id` es autorizado (HTTP 200).
5. **Restauración de ventana bloquea escrituras**: VERIFICADO (PASS). Al restaurar el archivo privado a readonly, `isBusinessWritePermitted` y `writesReady` se cierran inmediatamente sin reinicio (HTTP 503).
6. **Usuario MariaDB productivo rechazado**: VERIFICADO (PASS). `DB_USER=u293982346_appuser` es rechazado de inmediato.
7. **Nombre de base productiva rechazado**: VERIFICADO (PASS). `DB_NAME=u293982346_encarmenapp` es rechazado de inmediato.
8. **Archivo privado inválido rechazado**: VERIFICADO (PASS). Archivos inexistentes o sin campos requeridos retornan null y bloquean escrituras.
9. **Symlinks rechazados**: VERIFICADO (PASS). Enlaces simbólicos retornan null y bloquean escrituras.
10. **Configuración duplicada rechazada**: VERIFICADO (PASS). Claves duplicadas en el archivo `.env` retornan null y bloquean escrituras.
11. **Falta de sesión administrativa rechazada**: VERIFICADO (PASS). Peticiones sin token o con token inválido reciben HTTP 401.
12. **DELETE permanece bloqueado**: VERIFICADO (PASS). `DELETE` es rechazado con 403 (permiso) y 503 (política) aun con ventana abierta.
13. **Otras mutaciones permanecen bloqueadas**: VERIFICADO (PASS). `POST /api/events`, `POST /api/reports`, etc., permanecen bloqueadas.
14. **Aislamiento inválido impide COMMIT**: VERIFICADO (PASS). `verifyStagingIsolation` rechaza conexiones con esquemas de producción o marcas de entorno erróneas.
15. **No se alteran los controles de autenticación**: VERIFICADO (PASS). Credenciales scrypt de `jeo` preservadas intactas y verificadas.

### Comandos y Resultados:
- `npm run lint` (`tsc --noEmit`): **0 ERRORES (PASS)**
- `node --test tests/enc-staging-write-gate-005-unit.test.mjs`: **12/12 PASS**
- `node --import tsx --test tests/enc-staging-write-gate-005-unit.test.mjs tests/enc-staging-write-gate-005-http.test.mjs`: **13/13 PASS**
- Batería de regresión completa (`tests/staging-isolation-proof.test.mjs tests/backup-security-002.test.cjs tests/security-containment-003.test.mjs tests/business-description-links.test.mjs tests/public-registration-server-patch.test.mjs tests/enc-staging-write-gate-005-unit.test.mjs`): **65/65 PASS**
- `compile_applet` (`npm run build`): **PASS**
