# ENC-STAGING-WRITE-001-RECOVERY — comprobación de aislamiento y cierre del carril de escrituras

Rama: `work/enc-staging-write-001`. Base de esta entrega: `4dcb1afec7dd4df60291b97441c45d2c3bda5213` (implementación del Trabajador 1, publicada el 2026-10-29T02:22:34Z, sobre R3 `924127e`). Sin merge, PR, despliegue, SQL real, migraciones ni cambios de variables o de Hostinger.

## 1. Estado recuperado (lectura de la rama)

La orden asumía que la implementación no estaba publicada. La rama ya contiene, desde `4dcb1af`: `src/db/stagingBusinessStore.ts` (INSERT sin upsert, GET_LOCK, clave de idempotencia, UPDATE de campos explícitos con `FOR UPDATE`, lectura SQL posterior, ACK perdido = 503 con `writeMayHaveSucceeded`), `src/server/stagingBusinessRoutes.ts` (alta y edición solo con sesión de administrador del servidor), `src/server/stagingBusinessSecurity.ts` (scrypt configurable, límite de intentos) y `tests/staging-write-001.test.mjs`. Este documento no repite esa implementación.

## 2. Brecha cerrada: aislamiento real

La orden pide no aceptar el nombre de la base ni `STAGING_DB_CONFIRMED=true` como prueba. El almacén comprobaba `SELECT DATABASE()`, motor InnoDB y clave primaria, pero no los permisos de la cuenta ni la identidad del entorno. Se añade `src/server/stagingIsolationProof.ts` (solo consultas `SELECT`/`SHOW`, falla cerrado, devuelve únicamente códigos):

| Comprobación | Bloquea con |
|---|---|
| `APP_ENV=staging` explícito; host/usuario/base/contraseña presentes y sin conflicto entre `DB_*`/`MYSQL_*`/`MARIADB_*`; base = Staging; usuario distinto del de producción; `APP_URL`/`PUBLIC_URL` = staging.encarmen.org | `ENV_NOT_STAGING`, `CONFIG_INCOMPLETE`, `CONFIG_AMBIGUOUS`, `DB_NAME_NOT_STAGING`, `DB_USER_IS_PRODUCTION`, `APP_URL_NOT_STAGING` |
| Sincronización o DDL automáticos desactivados (`ENABLE_WP_SYNC`, `STAGING_ALLOW_SCHEMA_INIT`) | `AUTOMATIC_SYNC_OR_DDL_ENABLED` |
| Base efectivamente conectada (`SELECT DATABASE()`) | `CONNECTED_TO_PRODUCTION`, `DATABASE_TARGET_MISMATCH` |
| `SHOW GRANTS FOR CURRENT_USER()`: nada global salvo USAGE, nada fuera de la base de Staging, sin comodines ni GRANT OPTION, con INSERT y UPDATE sobre Staging | `GLOBAL_PRIVILEGES`, `GRANT_ON_PRODUCTION`, `GRANT_ON_OTHER_SCHEMA`, `GRANT_SCHEMA_WILDCARD`, `GRANT_OPTION_PRESENT`, `NO_WRITE_PRIVILEGE_ON_STAGING`, `GRANTS_UNPARSEABLE` |
| Esquemas visibles para la cuenta (`information_schema.SCHEMATA`) | `PRODUCTION_SCHEMA_VISIBLE`, `UNEXPECTED_SCHEMA_VISIBLE` |
| Marca de entorno dentro de la base (`encarmen_environment_marker`, una fila `staging` con el nombre de esa base) | `ENVIRONMENT_MARKER_MISSING`, `MARKER_SAYS_PRODUCTION`, `ENVIRONMENT_MARKER_MISMATCH`, `ENVIRONMENT_MARKER_AMBIGUOUS` |
| Cualquier error de consulta | `ISOLATION_CHECK_FAILED` |

Privilegios más amplios que SELECT/INSERT/UPDATE sobre la propia base de Staging generan solo el aviso `BROAD_STAGING_PRIVILEGES`; con `STAGING_REQUIRE_MINIMAL_GRANTS=true` bloquean.

`stagingBusinessStore.ts` llama a la comprobación en `connection()`, después de verificar base, motor y clave primaria y antes de abrir transacción. Si no se inyecta `verifyIsolation`, usa la comprobación real con `process.env` (valor por defecto estricto): no hace falta cambiar `server.ts`. Cada alta o edición vuelve a comprobar; no hay caché.

`tests/support/staging-write-entry.ts` inyecta un verificador neutro únicamente para el arnés con conexiones simuladas de `tests/staging-write-001.test.mjs`.

## 3. Pruebas

Ejecutadas por Perplexity (Node 20, sin TypeScript, sin red; tipos eliminados con un script propio): `tests/staging-isolation-proof.test.mjs`, 10 de 10; 4 mutaciones (omitir marca, permitir grant de producción, ignorar esquemas, fallar abierto) hacen fallar la suite. Verificación de integridad: el almacén publicado, con sus 4 cambios revertidos, reproduce el SHA de blob original `94804911df2c85f5e598d3f675c2453ff8f5cdfa`.

No ejecutadas (requieren esbuild, jsdom, express y React instalados): `tests/staging-store-default-strict.test.mjs` y la suite previa `tests/staging-write-001.test.mjs`. Ejecutarlas antes de integrar: `node --test tests/staging-isolation-proof.test.mjs tests/staging-store-default-strict.test.mjs tests/staging-write-001.test.mjs`, más `tsc --noEmit` y `vite build`.

Ninguna prueba usa MariaDB real: la persistencia real sigue sin demostrarse.

## 4. Procedimiento de activación (solo con autorización del propietario)

1. Desplegar código recompilado desde el SHA revisado (`server.js` y `api/server.bundle.js` heredados no incluyen estos cambios).
2. En la base de Staging, el propietario crea la marca de entorno (propuesta, NO ejecutada por esta tarea):

       CREATE TABLE encarmen_environment_marker (env_name VARCHAR(16) NOT NULL PRIMARY KEY, db_name VARCHAR(64) NOT NULL) ENGINE=InnoDB;
       INSERT INTO encarmen_environment_marker (env_name, db_name) VALUES ('staging', 'u293982346_encarmentest');

   Recomendado: marca `production` análoga en la base de producción.
3. Cuenta MariaDB exclusiva de Staging con SELECT, INSERT y UPDATE solo sobre esa base, sin acceso a producción. Verificar con `SHOW GRANTS` y que no vea otros esquemas.
4. Variables: `APP_ENV=staging`, `APP_URL=https://staging.encarmen.org`, `DB_*` del paso 3, `STAGING_READ_ONLY=false`, `STAGING_DB_CONFIRMED=true`, `STAGING_BUSINESS_WRITES_ENABLED=true`, hashes `STAGING_ADMIN_*_SCRYPT`; `ENABLE_WP_SYNC` y `STAGING_ALLOW_SCHEMA_INIT` ausentes. Revisar que ningún `.env` instalado contradiga el panel (`dotenv` usa `override: true`).
5. Reiniciar solo Staging y comprobar `/api/database-status`; la primera alta de prueba debe confirmarse con lectura posterior.

Reversión: `STAGING_READ_ONLY=true` (o quitar `STAGING_BUSINESS_WRITES_ENABLED`) y reiniciar solo Staging; los datos escritos no se revierten automáticamente (restaurar solo con respaldo y autorización).

## 5. Pendiente y riesgos

- `server.ts` (350 KB) no se pudo leer completo con la herramienta: el cableado del carril (login, sesiones, middleware global) está descrito por el commit `4dcb1af` y sus pruebas, pero no fue revisado línea a línea por Perplexity.
- Sin control de versión optimista: dos ediciones del mismo campo se resuelven por la última (la fila se bloquea con `FOR UPDATE` y `raw_data` se fusiona con la fila vigente, así que no se pierden otros campos).
- El alta lee la tabla completa dentro de la transacción (aceptable con ~207 filas).
- La marca de entorno no impide por sí sola una copia de producción con la marca de Staging; por eso se combina con permisos y visibilidad de esquemas.
- Cuentas de Hostinger con ALL PRIVILEGES sobre la base de Staging solo producen aviso; usar `STAGING_REQUIRE_MINIMAL_GRANTS=true` cuando exista una cuenta limitada.
