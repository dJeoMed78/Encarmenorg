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
