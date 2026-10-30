# ENCARMEN — Orden para W4 Perplexity

**Tarea:** ENC-STAGING-WRITE-AUDIT-PERP-20261030  
**Tipo:** Auditoría técnica EXCLUSIVAMENTE DE LECTURA  
**Prioridad:** Alta  
**Repo:** `dJeoMed78/Encarmenorg`  
**Rama/versión fuente:** `ia-desarrollo`, SHA `4407e6aeb08b52cc750c952735467a0e04fe19cc`

## Contexto indispensable
Producción `main` / `encarmen.org` / MariaDB `u293982346_encarmenapp` absolutamente prohibida. Staging Hostinger = `staging.encarmen.org` con MariaDB exclusiva `u293982346_encarmentest`. Ya está verificado `APP_ENV=staging`, usuario separado, MariaDB staging autenticada, no se observa esquema productivo. La tabla `encarmen_environment_marker` ya fue creada con backup y relectura verificadas. `STAGING_READ_ONLY=true`, `STAGING_DB_CONFIRMED=false`, `STAGING_BUSINESS_WRITES_ENABLED=false`, hashes de administrador staging NO configurados. No hacer pruebas de escritura, no iniciar servidores con datos reales, no usar GAS preview, no ejecutar SQL ni DDL.

## Objetivo
Auditar código de la ruta de administración y carril de altas/ediciones Staging ANTES de habilitar persistencia:
1. Examinar `server.ts`, `src/server/stagingBusinessRoutes.ts`, `src/server/stagingBusinessSecurity.ts`, `src/server/stagingIsolationProof.ts`, `src/db/stagingBusinessStore.ts`, `src/utils/businessContacts.ts`, pruebas asociadas.
2. Identificar exactamente cómo se crean/verifican cookies de sesión administrativa; riesgo de CORS `*`, CSRF, credenciales temporales, eventos del despliegue, persistencia y fallo por reinicio. Verificar que solo rutas empresariales puedan mutar, nunca reportes/cupones/eventos ni producción.
3. Contrastar `SHOW GRANTS`, marcador y configuración exigidos por código; distinguir diagnóstico existente de lo todavía no comprobado.
4. Proponer secuencia de preparación de credencial temporal única (sin comunicar secreto por chat), rotación, rollback y alta/edición de registro empresarial sintético con lectura posterior, limpieza controlada y restauración de read-only.
5. Informar BLOQUEOS REALES, con evidencia de archivo y línea, sin confundir pruebas simuladas con SQL real.

## Restricciones
No editar archivo, commit, PR, merge, desplegar, cambiar .env, ni pedir acceso a credenciales. No consultar producción. Si existe riesgo no mitigable, registrarlo y detenerse. Evitar gastar cuotas W1/W2.

## Informe
Entregar diagnóstico en un único bloque de código `text` con ID, SHA, controles aprobados, fallos, severidad, secuencia segura y condiciones de activación. Dejar claro qué fue revisado en código versus probado realmente.
