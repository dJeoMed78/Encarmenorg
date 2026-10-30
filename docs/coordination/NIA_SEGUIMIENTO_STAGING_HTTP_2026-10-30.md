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
