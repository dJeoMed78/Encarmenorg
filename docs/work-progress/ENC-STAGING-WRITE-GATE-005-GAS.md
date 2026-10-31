# ENC-STAGING-WRITE-GATE-005-GAS (Revisión R1)

Estado: PROBADO_LOCALMENTE_POR_GAS en aislamiento y suites automatizadas. No aprobado, integrado ni desplegado por Coordinación.
Rama Base: coord/staging-origin-deploy-20261030
SHA Base: 0d09e02efc9f96f0e589c4604a1dc6f61f30c1d5
Rama de Trabajo: work/enc-staging-write-gate-005-gas
Pull Request: https://github.com/dJeoMed78/Encarmenorg/pull/14

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
   - En consecuencia, `administrativeWritesReady` devolvió `false` y el middleware de `adminSecurity` bloqueó la petición con HTTP 503:
     `"Operación bloqueada hasta habilitar administración segura."`

2. **Diferenciación de capas**:
   - El HTTP 503 reportado en el E2E provino del middleware central de seguridad administrativa (`adminSecurity`), antes de alcanzar la validación del cuerpo o los handlers de MariaDB.
   - Al no resolverse la ventana desde el archivo privado en `writesReady` e `isBusinessWritePermitted`, la petición nunca llegó a `store.create`.

## 2. Correcciones Implementadas

### A. Correcciones de Arquitectura Inicial
1. **`src/server/stagingBusinessSecurity.ts`**:
   - Se implementó `resolvePrivateStagingConfigPath` y `getPrivateStagingSnapshot`: resuelve y valida la configuración privada canónica (`.../domains/staging.encarmen.org/hbuilds/config/.env`) en cada petición.
   - Valida permisos de archivo estrictos (`stat.mode & 0o077 === 0`), rechaza symlinks, archivos ausentes y configuraciones con claves duplicadas en variables críticas.
   - Verifica invariantes de seguridad: `APP_ENV === 'staging'`, `DB_NAME === 'u293982346_encarmentest'`, rechazo terminante del usuario de producción (`u293982346_appuser`) o base de producción (`u293982346_encarmenapp`).
   - Se adaptó `privateStagingBusinessWindowOpen` para validar dinámicamente los 4 flags de la ventana (`STAGING_READ_ONLY=false`, `STAGING_DB_CONFIRMED=true`, `STAGING_BUSINESS_WRITES_ENABLED=true`, `ENC_ADMIN_MUTATIONS_ENABLED=true`) desde la instantánea privada validada.

2. **`src/server/consolidatedWritePolicy.ts`**:
   - Normalización de ruta en `administrativeWritesReady` para asegurar coincidencia exacta de `cleanPath`.
   - Se mantiene el bloqueo estricto: autoriza de forma exclusiva `POST /api/submit-business`, `PATCH /api/businesses/:id` y `PATCH /businesses/:id`. Deniega de forma terminante `DELETE` y cualquier otra mutación.

3. **`server.ts`**:
   - `privateStagingAdminIdentity`: reutiliza `getPrivateStagingSnapshot` para unificar la resolución y validación de la identidad privada contra la conexión efectiva.
   - `writesReady`: evalúa dinámicamente en Staging la instantánea privada real (`snapshot.ENC_ADMIN_MUTATIONS_ENABLED === 'true'`) coordinada con `isBusinessWritePermitted()`, eliminando la dependencia de las variables estáticas congeladas de `process.env`.

### B. Correcciones Específicas Solicitadas por Coordinación (R1)
4. **Precedencia de Configuración Privada (`src/server/stagingIsolationProof.ts`)**:
   - Se corrigió el orden de fusión a `effectiveEnv = { ...env, ...snapshot }` para garantizar que la configuración privada validada prevalezca sobre variables de entorno heredadas o congeladas (`env`/`process.env`).
   - Se asegura una fuente única validada con comportamiento fail-closed antes de validar la configuración.
   - Se corrigió la evaluación de `STAGING_REQUIRE_MINIMAL_GRANTS` para que se obtenga de `effectiveEnv.STAGING_REQUIRE_MINIMAL_GRANTS === 'true'`, permitiendo que el snapshot privado aplique la restricción estricta de privilegios.
   - Se añadió soporte de `configPath` en `IsolationOptions` para permitir validaciones directas.

5. **Identidad Efectiva MariaDB (`src/db/mariadb.ts`)**:
   - En `initMariaDb`, se obtiene la identidad efectiva ejecutando `SELECT SUBSTRING_INDEX(CURRENT_USER(), '@', 1) AS effective_user, DATABASE() AS db_name`.
   - Se valida que `effective_user` esté presente, sea distinto al usuario de producción (`u293982346_appuser`) y coincida con el usuario configurado.
   - Se comprueban los privilegios efectivos de la cuenta MariaDB conectada contra Staging mediante `SHOW GRANTS FOR CURRENT_USER()` y `evaluateGrants`, respetando `STAGING_REQUIRE_MINIMAL_GRANTS`.
   - `connectedUser` y `connectedDatabase` se asignan con base en la identidad real comprobada por el motor SQL.
   - Se preserva el aislamiento absoluto: no se registran contraseñas ni secretos en los logs.
   - En `stagingBusinessStore.verifyIsolation`, se inyecta la instantánea con precedencia sobre `process.env`.

## 3. Pruebas Reales Ejecutadas Localmente

Se mantuvieron y ampliaron los archivos de prueba en `tests/`:
- `tests/enc-staging-write-gate-005-unit.test.mjs` (15 subpruebas completas).
- `tests/enc-staging-write-gate-005-http.test.mjs` (prueba de integración del pipeline HTTP completo de apertura y revocación dinámica de ventana sin reinicio).

### Matriz de Escenarios Verificados:
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
16. **Precedencia de configuración privada sobre process.env**: VERIFICADO (PASS). `effectiveEnv = { ...env, ...snapshot }` garantiza que la configuración privada prevalezca sobre variables de entorno heredadas o congeladas.
17. **Evaluación de STAGING_REQUIRE_MINIMAL_GRANTS**: VERIFICADO (PASS). Se valida contra `effectiveEnv` bloqueando privilegios amplios cuando está activo en el archivo privado.
18. **Validación de CURRENT_USER() en MariaDB**: VERIFICADO (PASS). Se verifica que la identidad efectiva SQL pertenezca al usuario autorizado y se rechace cualquier cuenta de producción.

### Comandos y Resultados:
- `npm run lint` (`tsc --noEmit`): **0 ERRORES (PASS)**
- `npm run build`: **EXITOSO (PASS)**
- `node --test tests/enc-staging-write-gate-005-unit.test.mjs`: **15/15 PASS**
- `node --import tsx --test tests/enc-staging-write-gate-005-http.test.mjs`: **PASS (Pipeline E2E)**
- Baterías de regresión completas:
  - `node --test tests/staging-isolation-proof.test.mjs`: **10/10 PASS**
  - `node --test tests/security-containment-003.test.mjs`: **18/18 PASS**
- Total de pruebas automatizadas ejecutadas: **68/68 PASS**
