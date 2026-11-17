# ENCARMEN — Evidencia de acceso Hostinger API para NIA y Staging

**Fecha de verificación:** 2026-11-17  
**Propósito:** conservar evidencia para la coordinación NIA y el trabajo de FreeLLMAPI / Staging ENCARMEN.  
**Alcance ejecutado:** consultas GET de solo lectura. No se crearon, modificaron, desplegaron ni eliminaron recursos de Hostinger.

## 1. Configuración y autenticación

- Variable de entorno en Vercel: `HOSTINGER`.
- Se verificó que está habilitada para Production, Preview y Development.
- Visibilidad: Secret; el valor no se recuperó ni se mostró.
- La autenticación se probó desde un deployment Preview de `freellmapi-gemini-experimental`.
- Resultado del endpoint de auditoría: `authentication: accepted`.
- La ruta de auditoría ejecutada fue `/api/hostinger-audit`.
- La ruta realiza exclusivamente solicitudes GET a `https://developers.hostinger.com`; filtra campos sensibles y nunca expone el token al navegador.

## 2. Despliegue de la prueba

- Repositorio: `dJeoMed78/Ia-para-todos`.
- Rama: `experiment/freellmapi-vibe-lab`.
- Proyecto Vercel: `freellmapi-gemini-experimental`.
- Commit de la versión ampliada de auditoría: `aa7ca9f6352b7390fbb44a1a03050e80ae3a26a9`.
- Deployment ID: `dpl_Fn9GC9tCXhbCVu22YaSPrz5qJPQb`.
- Estado verificado: `READY`.
- URL de deployment: https://freellmapi-gemini-experimental-m3jz7vaub-iaparatodos1.vercel.app
- Endpoint probado: https://freellmapi-gemini-experimental-m3jz7vaub-iaparatodos1.vercel.app/api/hostinger-audit

Nota de depuración: el primer deployment presentó HTTP 500 por un salto de línea literal mal insertado en el comentario de la ruta. Se corrigió en commit `557dabb65e977484b9c4539df323f6e2944d4e1e`; después se amplió la auditoría y se desplegó el commit citado arriba. El endpoint final respondió HTTP 200.

## 3. Recursos de Hostinger identificados

La API devolvió HTTP 200 para inventario de sitios. Encontró cuatro sitios en la cuenta:
- `staging.encarmen.org` — habilitado, tipo Node.js.
- `encarmen.org` — habilitado, tipo Node.js.
- `2026.afroditalove.store` — habilitado.
- `afroditalove.store` — habilitado, tipo WordPress.

Para ENCARMEN:
- Usuario de hosting: `u293982346`.
- Order ID usado para consultar datacenters: `1005507867`.
- Ruta raíz de Staging: `/home/u293982346/domains/staging.encarmen.org/public_html`.
- Ruta raíz de producción: `/home/u293982346/domains/encarmen.org/public_html`.

## 4. Resultados Node.js de Staging y producción

Ambos sitios respondieron HTTP 200 en:
- Consulta de historial de builds.
- Lectura de configuración Node.js.
- Inventario de nombres de variables de entorno (valores enmascarados).
- Consulta de endpoint de logs.

Configuración de ambos sitios:
- Node.js 22.
- Aplicación Express.
- Build script: `build:server`.
- Entry file: `server.js`.
- Package manager: npm.

Staging:
- Historial: 151 builds.
- Build más reciente devuelto: `completed`, creado el 2026-11-16T20:57:35Z.
- Fuente Git: `dJeoMed78/Encarmenorg`, rama `ia-desarrollo`.
- Variables inventariadas: INEGI_DENUE_TOKEN, GEMINI_API_KEY, STAGING_DB_CONFIRMED, STAGING_ALLOW_SCHEMA_INIT, RATINGS_SCHEMA_APPROVED, APP_URL, NODE_ENV, STAGING_READ_ONLY, ENABLE_WP_SYNC, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, APP_ENV, ENC_ADMIN_PUBLIC_ORIGIN, ENC_ADMIN_CREDENTIALS_JSON, STAGING_BUSINESS_WRITES_ENABLED, ENC_ADMIN_MUTATIONS_ENABLED, PUBLIC_REGISTRATION_ENABLED, STAGING_CLASSIFIED_WRITES_ENABLED, STAGING_CLASSIFIED_BACKUP_ID, STAGING_CLASSIFIED_BACKUP_CHECKED_AT, STAGING_CLASSIFIED_WRITE_EXPIRES_AT, RATINGS_MODERATION_APPROVED, STAGING_RATINGS_PUBLIC_WRITES_ENABLED, STAGING_RATINGS_MODERATION_WRITES_ENABLED, STAGING_RATINGS_BACKUP_ID, STAGING_RATINGS_BACKUP_CHECKED_AT.
- Logs: endpoint HTTP 200; la respuesta indicó 79 líneas históricas, sin devolver líneas de log en esta consulta.

Producción:
- Historial: 33 builds.
- Build más reciente devuelto: `completed`, creado el 2026-11-12T19:28:17Z.
- Fuente Git: `dJeoMed78/Encarmenorg`, rama `main`.
- Variables inventariadas: GEMINI_API_KEY, APP_URL, DB_PASSWORD, NODE_ENV. Los valores permanecieron enmascarados.
- Logs: endpoint HTTP 200; la respuesta indicó 190 líneas históricas, sin devolver líneas de log en esta consulta.

## 5. Otros endpoints probados

- Datacenters: HTTP 200 tras incluir el parámetro requerido `order_id=1005507867`; devolvió ubicaciones disponibles.
- VPS virtual machines: HTTP 200, lista vacía.
- Portfolio de dominios: HTTP 200; aparecieron `empresasencarmen.com` y `afroditalove.store`.
- DNS `/api/dns/v1/zones/encarmen.org`: HTTP 200, lista vacía. Esto no prueba que no existan registros DNS; sólo que esa consulta no devolvió zonas.
- El endpoint DNS inicial `/api/dns/v1/zones` devolvió 404; la ruta de zona consultada después respondió 200.

## 6. Capacidades confirmadas vs. pendientes

**Confirmadas por ejecución real (solo lectura):**
- Autenticación del token.
- Inventario de sitios.
- Portfolio de dominios.
- Catálogo de datacenters.
- Consulta de VPS.
- Historial de builds de Staging y producción.
- Lectura de configuración Node.js.
- Inventario de nombres de variables, con valores enmascarados.
- Acceso al endpoint de logs.

**No probadas todavía:**
- Lanzar una compilación o despliegue desde Hostinger.
- Reiniciar aplicaciones Node.js.
- Crear, actualizar o eliminar variables de entorno.
- Modificar archivos.
- Cambiar configuración de hosting.
- Operaciones de DNS con escritura.
- Administración o modificación de bases de datos.

La documentación de endpoints no debe confundirse con ejecución comprobada. No afirmar que estas operaciones de escritura funcionan hasta probarlas.

## 7. Directrices operativas para NIA

1. Usar Hostinger API como canal complementario a GitHub: GitHub administra código, ramas, commits y PR; Hostinger consulta y administra el runtime/hosting cuando se autorice y se pruebe.
2. Mantener las pruebas de escritura exclusivamente en `staging.encarmen.org`.
3. Antes de cualquier escritura en Staging: identificar endpoint y método exactos, revisar impacto, respaldos y reversibilidad; ejecutar una sola operación controlada y verificar el resultado mediante lectura posterior.
4. No ejecutar operaciones de escritura en `encarmen.org` ni producción sin autorización expresa del propietario.
5. No revelar ni copiar el valor de `HOSTINGER`, ni valores de variables sensibles. La API sólo debe devolver nombres de variables y estados enmascarados.
6. No inferir que un HTTP 200 en el endpoint de logs significa que se recuperaron líneas: en esta prueba se devolvió una cantidad histórica de líneas, pero el arreglo `logs` llegó vacío.
7. Mantener la separación entre evidencia histórica, código implementado, operación ejecutada, prueba verificada y despliegue confirmado.

## 8. Siguiente acción

Preparar una matriz de operaciones de escritura documentadas de Hostinger y seleccionar una prueba reversible de bajo riesgo en Staging. No realizarla hasta revisar el endpoint, el impacto y el mecanismo de verificación. Mantener producción en modo de solo lectura.


## Actualización del propietario: variable configurada en Hostinger Staging (2026-11-17)

El propietario confirma que ya agregó en el panel de variables de entorno de Hostinger para `staging.encarmen.org` la clave exacta `HOSTINGERENCARMEN`. La captura compartida muestra el nombre de la clave y el valor enmascarado; no se recibió ni debe solicitarse o copiarse el valor secreto.

**Instrucción para NIA:** reconocer `HOSTINGERENCARMEN` como la variable que el propietario acaba de configurar directamente en el entorno de Hostinger de Staging. No confundirla con la variable `HOSTINGER` previamente utilizada en Vercel para la prueba Preview de FreeLLMAPI: son nombres y ubicaciones distintos. Antes de usarla desde la aplicación, verificar de forma segura que el runtime de Staging la reconoce (sin imprimir ni devolver su valor). No modificarla ni recrearla si ya existe. La presencia en el panel no demuestra por sí sola que el proceso Node.js la haya cargado ni que una operación de la API funcione.
