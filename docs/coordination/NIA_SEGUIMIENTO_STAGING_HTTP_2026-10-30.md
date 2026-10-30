# NIA — Continuidad de validación HTTP empresarial en Staging
**Fecha:** 2026-10-30. **Coordinación:** Nia, Jefa 3, Coordinación Principal 01.
**Repositorio:** dJeoMed78/Encarmenorg.
**Objeto:** dejar evidencia del siguiente paso autorizado, sin repetir implementación ni restauración de contactos.

## Hechos revisados
- PR #10 integrado en `ia-desarrollo`: commit `667682fe953c94c65c90777a7ee75a6451b824ff`.
- Entrega W5 de readback estricto: `07d90c1bc4726c3088d815d922b1951bf5ccc736`; pruebas HTTP con MariaDB desechable no sustituyen ensayo sobre Staging público.
- Staging conserva evidencia histórica de 207 empresas, 206 contactos válidos; no ordenar nuevas restauraciones por esta tarea.
- Prueba SQL transitoria de Staging, `coord/staging-write-go-no-go-20261030/ENC_STAGING_SQL_TRANSACTION_RESULT.txt`: 2026-10-30T17:49:03Z, INSERT/UPDATE/ROLLBACK verificados; cambios revertidos.
- Prueba de persistencia HTTP, `coord/staging-http-persistence-test-20261030/ENC_STAGING_HTTP_PERSISTENCE_RESULT.txt`: 2026-10-30T18:16:43Z, BLOQUEADA: `NODE_LOOPBACK_UNAVAILABLE`. Sin alta ni edición HTTP, sin readback SQL del flujo.
- Restauración de configuración `coord/staging-business-enable-20261030/ENC_STAGING_BUSINESS_WINDOW_RESULT.txt`: 2026-10-30T19:11:45Z, regreso a solo lectura, credencial temporal retirada, reinicio de Staging requerido según informe. No afirmar que el reinicio posterior se completó sin prueba independiente.
- El script previo `ops/coord/staging_ephemeral_http_probe.py` selecciona compilación Node por `mtime` máximo; esto no garantiza que corresponda a `hbuilds/current`. Se identificó una **hipótesis de selección incorrecta de versión**, no aún una causa confirmada del fallo.

## Acción nueva de Coordinación
- Rama aislada: `coord/staging-http-readonly-diagnostics-20261030`.
- Commit creador del workflow: `531ce44e399a302e7e84b902fe74eb3519b44f66`.
- Archivo: `.github/workflows/enc-staging-http-readonly-diagnostics.yml`.
- Acción prevista en GitHub Actions: inspección SSH de **solo lectura** del `current` de Staging, comparación con la versión más reciente por mtime, comprobación de marcadores de readback, proceso Node, sintaxis y salud local/pública.
- La ejecución no configura permisos de escritura, no conecta a MariaDB, no crea negocios, no reinicia servidor y no toca producción. Publica resultado sin secretos en la misma rama de diagnóstico.
- **Estado al registrar esta nota:** workflow publicado; archivo `ENC_STAGING_HTTP_READONLY_DIAGNOSTICS_RESULT.txt` aún no disponible, por tanto **NO PROBADO / NO EJECUCIÓN CONFIRMADA**.

## Siguientes puertas concretas
1. Leer `ENC_STAGING_HTTP_READONLY_DIAGNOSTICS_RESULT.txt` y/o evidencia de corrida de Actions, sin considerar creación del workflow como ejecución.
2. Si versión elegida por mtime difiere de `current`, corregir el selector del arnés de pruebas, sin alterar datos reales; comprobar además el inicio del servidor temporal y registrar error sanitizado.
3. Verificar que Staging público quedó efectivamente en solo lectura tras restauración/reinicio.
4. Solo con aislamiento y respaldo confirmados, repetir prueba HTTP sintética en el laboratorio permitido: autenticación real, alta y PATCH, lectura SQL independiente, GET, limpieza específica por ID/nombre/UUID, y restauración del guard. Si falla una puerta, registrar bloqueo y detenerse.
5. No usar `main`, `encarmen.org` ni la MariaDB productiva. No cerrar F001/F003 ni otras incidencias del propietario sin aceptación expresa.

**Criterio anti-duplicidad:** no reconstruir PR #10, no repetir restauración de 174 contactos, no abrir nuevas tareas generales de persistencia mientras este bloqueo concreto pueda diagnosticarse de forma aislada.

## Inspección de solo lectura ejecutada: resultado comprobado
**UTC del workflow:** 2026-10-30T21:28:23Z. **Archivo de evidencia:** `coord/staging-http-readonly-diagnostics-20261030/ENC_STAGING_HTTP_READONLY_DIAGNOSTICS_RESULT.txt`.
- SSH pin verificado y salida SSH 0.
- `ACTIVE_BUILD_CONFIRMED=true`; dos builds disponibles.
- `LATEST_MTIME_EQUALS_ACTIVE=true`: **descartada la hipótesis** de selección equivocada del build por mtime para ese estado.
- `ACTIVE_STRICT_READBACK_MARKERS=true`; `ACTIVE_NODE_PROCESSES=2`; `ACTIVE_JS_SYNTAX_OK=true`.
- `PUBLIC_STAGING_HEALTH_HTTP=200`, pero `ACTIVE_LOOPBACK_HEALTH_STATUS=unavailable`.
- `SQL_OR_STAGING_WRITES_EXECUTED=false`; no prueba POST/PATCH, no SQL.
- **Conclusión:** la versión activa está identificada, pero el fallo de loopback sigue sin causa demostrada. NO afirmar que la validación E2E pública quedó aprobada.
- Nueva ejecución diagnóstica de precisión para distinguir aislamiento de red, puerto/env y tipo de fallo de loopback publicada en commit `4fb210a176e86afcd396210f5a600e573f6c61be`; su resultado es pendiente hasta verificar un log nuevo.

## Segundo resultado de red interna (UTC 21:29:47)
- `PROCESS_NETNS_MATCH=true`: el proceso Node activo comparte espacio de red con la sesión de diagnóstico.
- `PROCESS_PORT_ENV_PRESENT=false`, `PROCESS_VERCEL_ENV_PRESENT=false` en entorno inicial de proceso.
- `ACTIVE_LOOPBACK_HEALTH_STATUS=unavailable`, `ACTIVE_LOOPBACK_EXCEPTION_CLASS=URLError`, mientras HTTP público responde 200.
- **El puerto real escuchado no queda identificado por esta prueba.** No inferir que la aplicación no funciona públicamente, ni que el puerto es necesariamente 3000.
- Publicado diagnóstico adicional **de solo lectura** de descriptores socket/puertos del proceso, commit `ef15d156847fc3b84d49d779758b8ec1c8e28844`; su resultado requiere una ejecución nueva antes de afirmar nada.


## Resolución técnica del bloqueo interno — 2026-10-30T21:58:52Z
- Se corrigió el probador aislado (sin alterar la aplicación): rama `coord/staging-unix-http-e2e-fix-20261030`.
- Commit correctivo: `b003b8d040726b2a4ab3e5c1b7d464aaacdd289e`. La versión de prueba usa la versión activa `hbuilds/current/nodejs`, exporta Express desde `server.js`, inhabilita el listener TCP automático de la instancia temporal mediante `VERCEL=1` y atiende sus solicitudes por un socket Unix privado. Comprueba existencia de respaldo SQL de Staging antes de probar.
- Workflow aislado: `.github/workflows/enc-staging-unix-http-e2e.yml`, commit `1731733fe9db1e3f6381c124ec34a0701b5dcd18`.
- Evidencia real en `coord/staging-unix-http-e2e-fix-20261030/ENC_STAGING_UNIX_HTTP_E2E_RESULT.txt`, UTC `2026-10-30T21:58:52Z`:
  - `STAGING_DB_BACKUP_PRESENT=true`; `SQL_IDENTITY=STAGING_ONLY`; `INPROCESS_HTTP_READY=true`.
  - `ADMIN_LOGIN_STATUS=200`; `UNRELATED_WRITE_HTTP_STATUS=403`.
  - `CREATE_HTTP_STATUS=201`; `EDIT_HTTP_STATUS=200`; `HTTP_EDIT_READBACK=true`.
  - `SQL_COMMITTED_READBACK=PASS`; `RESULT=PASS_INPROCESS_HTTP_CREATE_EDIT_SQL_READBACK`.
  - `SYNTHETIC_CLEANUP=VERIFIED`, `TEMPORARY_PROCESS=CLOSED`, `PUBLIC_STAGING_CONFIG=UNCHANGED`, `SSH_EXIT=0`.
- **Dictamen:** E2E HTTP con MariaDB de Staging superado mediante instancia temporal del bundle instalado. **No equivale a haber probado POST/PATCH contra el endpoint público de Hostinger ni el editor de navegador.** Mantener F001/F003 abiertos hasta comprobación pública y aceptación del propietario.
- La tarea horaria de vigilancia improductiva `6ae4c468d9d881919faeb473047f5e27` fue desactivada por Coordinación; no se necesita monitorear cambios inexistentes.
- Siguiente acción de valor: habilitar bajo controles y probar la ruta empresarial pública en Staging, comprobar persistencia y funcionamiento del editor visual, conservar reversión y limpieza. Mantener producción cerrada.

## Validación pública y navegador — ejecución lanzada, resultado por comprobar
- **Rama:** `coord/staging-public-browser-validation-20261030`.
- **Workflow y commit:** `.github/workflows/enc-staging-public-browser-validation.yml`, `df6115c3c15a3dc3b92b876c529b9cd1e02d060e`.
- **Objetivo del workflow:** hacer GET público a `/api/health`, `/api/businesses`, `/api/admin/session` y `/`; comprobar rechazo de POST con cuerpo JSON vacío (sin empresa válida); intentar renderizado móvil con Chromium real y conservar captura como artefacto de GitHub Actions.
- **Seguridad:** no modifica permisos de Staging, no abre ventana de escrituras, no cambia credenciales, no modifica SQL, no despliega y no toca producción.
- **Estado verificado en este punto:** GitHub conserva el workflow, pero `ENC_STAGING_PUBLIC_BROWSER_RESULT.txt` todavía **no estaba publicado**. No afirmar éxito de HTTP público ni de Chromium sin ese resultado.
- **Limitación:** este control anónimo NO prueba la edición del editor autenticado ni un POST/PATCH real en el host público. Para ello se requiere una ventana de escritura cuidadosamente asegurada, un reinicio limitado a Staging y un mecanismo fiable de reversión/reinicio; los scripts históricos de enable/restore **no reinician** el servicio.

## Ejecución parcial de pruebas públicas — 2026-10-30
- Rama `coord/staging-public-browser-validation-20261030`.
- Smoke HTTP público original `ENC_STAGING_PUBLIC_API_RESULT.txt` reportó `/api/health` HTTP 200, MariaDB, `READ_ONLY=True`, root HTTP 200, sesión anónima HTTP 401. La consulta general `/api/businesses` falló con código de transporte 0; no afirmar error HTTP de backend sin clasificar excepción.
- Segundo smoke HTTP real, UTC 2026-10-30T22:22:00Z: `/api/health` HTTP 200 (0.29 s), `/api/businesses?hasWhatsapp=true` HTTP 200 (0.21 s), **206 empresas**, `/api/admin/session` HTTP 401 (0.11 s), sitio raíz HTTP 200 (0.13 s), `HTTP_MUTATIONS=NONE`.
- Evidencia: `coord/staging-public-browser-validation-20261030/ENC_STAGING_PUBLIC_API_RESULT.txt`.
- Workflow de Chromium móvil publicado en `.github/workflows/enc-staging-public-browser-validation.yml`, commit `df6115c3c15a3dc3b92b876c529b9cd1e02d060e`; al hacer esta actualización **todavía no se dispone** del archivo `ENC_STAGING_PUBLIC_BROWSER_RESULT.txt`. No declararlo probado.
- **Sin prueba pública de POST/PATCH:** guard de Staging sigue `READ_ONLY=True`; no se habilitó ventana de escritura ni se reinició el servicio sin validar proceso de restauración. El E2E anterior por socket Unix permanece válido solo como comprobación de backend temporal.
- F001/F003 siguen abiertas, y navegador/editor visual no aceptados por propietario.

## Rollout del arreglo HTTPS 403 — seguimiento verificado 2026-10-30 (noche)
- Resultado de inspección corregida: rama `coord/staging-safety-readonly-20261030`, resultado UTC 22:55:37, `STAGING_BACKUP_DIRECTORY_PRESENT=true`, un dump SQL presente, permisos privados verdaderos, APP_ENV/DB_NAME Staging, READ_ONLY=true, versión anterior disponible, SSH verificado y salud pública HTTP 200. **La revisión previa de backups era un falso negativo por ruta equivocada.**
- Corrección `server.ts` para origen y carga de .env privado en `coord/staging-admin-env-origin-fix-20261030`; CI Node 22, npm ci, tsc, esbuild, node --check y marcadores de aislamiento PASS. PR #11 sigue borrador; NO integrada a `ia-desarrollo`.
- Rama `coord/staging-origin-deploy-20261030`, workflow `.github/workflows/enc-staging-origin-deploy.yml`. Primer intento UTC 22:57:17: `FAILURE_CODE=[Errno_2] No such file or directory 'node'` al validar bundle mediante SSH, `ROLLBACK=NOT_NEEDED_NO_MODIFICATION`. Se corrigió a uso de /proc/pid/exe en commit `3d4136ef70ef12422e4c03b843a73b651ae5d2d9`.
- Segundo intento UTC 22:58:35: `HOST_KEY=VERIFIED`, `STAGING_CONFIG_AND_SQL_BACKUP=VERIFIED`, `SERVER_BACKUP=VERIFIED`, `STAGING_RESTART=TRIGGERED`, **`FAILURE_CODE=PUBLIC_STAGING_HEALTH_NOT_RECOVERED`**. Rollback de server.js previo realizado y `POST_ROLLBACK_STAGING_HEALTH=true`; `RESULT=BLOCKED_OR_ROLLED_BACK`. Evidencia `coord/staging-origin-deploy-20261030/ENC_STAGING_ORIGIN_DEPLOY_RESULT.txt`.
- **DICTAMEN:** el nuevo bundle NO está validado en runtime, el despliegue de este parche se REVIRTIÓ; no declarar corrección del 403 pública. No integrar PR #11 ni reintentar a ciegas. Producción sigue fuera de alcance; Staging readOnly.
- Diagnóstico siguiente: identificar el entrypoint real de los procesos Node en Hostinger en lectura (sin publicar argumentos), verificar por qué la salud pública falla al arrancar el nuevo bundle. Se publicó inspección por `/proc/<pid>/cmdline` con indicadores booleanos, en `coord/staging-safety-readonly-20261030`, commit `5e20c56095a06ee9a913db1f6f0c70d9ed150303`, pendiente nuevo resultado. No ejecutar SQL ni publicar sobre la aplicación durante la inspección.

## Diagnóstico adicional y control de cierre (2026-10-30 UTC 23:03)
- Inspección read-only Node `coord/staging-safety-readonly-20261030/ENC_STAGING_SAFETY_READONLY_RESULT.txt`, UTC 23:03:31: 2 procesos Node con cwd en la versión activa, ninguna entrada reconocida como `server.js`, `api/server.bundle.js`, `app.js`, `index.js`; no listeners TCP, Node syntax válido. No se localizaron logs .log/.txt en rutas estándar restringidas de Staging. No concluir que Hostinger carece de logs; sólo no aparecieron en estas rutas.
- El portal público seguía HTTP 200 con modo solo lectura tras la reversión. **PR #11: NO AUTORIZADO PARA MERGE** por fallo del arranque público al desplegar candidata. No confundir CI que compila con verificación real del servicio. No se ha superado el E2E público ni la prueba visual del editor. No declarar finalizado.
- La operación necesaria antes de publicar es identificar de forma verificable el bootstrap real de Hostinger y el motivo de la falta de salud del bundle candidato. Hasta entonces, evitar repetición a ciegas de despliegues.
