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


## Aclaración expresa del propietario: separación de credenciales (2026-11-17)

La separación de uso queda definida así:
- `HOSTINGER`: exclusiva del proyecto IA para TODOS / FreeLLMAPI. No utilizarla para operaciones de ENCARMEN ni para administrar Staging.
- `HOSTINGERENCARMEN`: exclusiva para las operaciones del proyecto ENCARMEN sobre `staging.encarmen.org`. Es la credencial que debe usar NIA para las pruebas y administración autorizadas de Staging.

No intercambiar, reutilizar ni asumir equivalencia entre ambas variables. Producción `encarmen.org` permanece protegida y no se modifica sin autorización expresa. Mantener los valores secretos ocultos.


## Investigación ampliada: capacidades de la API pública Hostinger (documentación consultada 2026-11-17)

**Fuente principal:** [Referencia oficial de Hostinger API](https://developers.hostinger.com/) y [visión general de API](https://docs.hostinger.com/api-reference/overview). La referencia se genera desde la especificación OpenAPI que también alimenta CLI, SDK y MCP. La documentación enumera productos de hosting, dominios, DNS, email, VPS, WordPress, ecommerce y billing. La existencia de una categoría no significa que todas sus operaciones estén incluidas en este plan, habilitadas para este token o probadas en nuestra cuenta.

### A. Hosting y sitios web — operaciones documentadas
- Listar sitios web accesibles al token; filtrar por tipo detectado (por ejemplo Node.js o WordPress).
- Crear sitios web (endpoint POST documentado).
- Eliminar sitios web (endpoint DELETE documentado; operación destructiva).
- Desplegar archivos estáticos desde un archivo ZIP ya cargado.
- Consultar inventario, tipo de sitio y datos de hosting.
- En nuestra cuenta se ejecutó la consulta de inventario y se encontraron los sitios indicados en la sección de resultados reales.

### B. Aplicaciones Node.js — operaciones documentadas
- Listar historial de builds y filtrar por estado (pending, running, completed, failed).
- Iniciar un build mediante POST usando un archivo comprimido que ya debe existir en el almacenamiento del sitio.
- Consultar configuración de build: versión Node, framework/tipo, directorios, script, entry file y package manager.
- Reemplazar configuración de build mediante PUT. El endpoint sustituye el conjunto de configuración; los campos omitidos pueden quedar como null.
- Detectar configuración a partir de un archivo comprimido ya cargado.
- Listar nombres de variables de entorno; la API devuelve valores enmascarados y no permite leerlos.
- Reemplazar el conjunto completo de variables de entorno mediante PUT. **Peligro crítico:** es reemplazo total, elimina cualquier variable omitida y un array vacío las elimina todas; guardar reinicia el proceso Node.js.
- Consultar detalle de un build por UUID.
- Consultar logs de build y seguirlos por líneas mientras se ejecuta.
- Consultar logs de runtime con periodos, niveles y paginación incremental.
- Borrar logs de runtime mediante DELETE. Es irreversible y requiere confirmación explícita del usuario.
- Reiniciar el proceso Node.js mediante POST. No recompila ni redespliega; solo aplica a aplicaciones con proceso servidor.
- Solicitar análisis automático de un build fallido (solo builds en estado failed; límite documentado de 5 llamadas por minuto por cliente).
- Consultar vulnerabilidades Node.js y solicitar parcheo de vulnerabilidades mediante endpoint específico.

### C. Subida y archivos — alcance real documentado
- El flujo de build de Node.js requiere que el archivo ZIP esté previamente en el almacenamiento del sitio.
- La documentación menciona un endpoint para generar una URL/credenciales de carga (Generate Upload URL), con la que se sube el archivo antes del build.
- La API permite usar archivos comprimidos como fuente de despliegue; el endpoint de build advierte que el resultado sobrescribe el contenido existente del sitio y no se puede deshacer.
- **No afirmar que existe un administrador API genérico para listar, leer, editar o borrar cualquier archivo/carpeta** sin identificar un endpoint específico de la referencia. En esta auditoría no se probó CRUD arbitrario de archivos.

### D. Dominios, DNS, email, VPS, WordPress, ecommerce y billing
La referencia oficial agrupa endpoints para estas áreas. En la prueba de nuestra cuenta se obtuvieron HTTP 200 para el inventario de portfolio de dominios y para las consultas de datacenters/VPS indicadas arriba. No se han ejecutado operaciones de escritura en estas áreas. Antes de anunciar una capacidad concreta (por ejemplo crear/modificar registros DNS, administrar buzones, comprar/renovar dominios, operar WordPress, facturar o crear VPS), NIA debe consultar el endpoint exacto, verificar permisos y plan, y probar solo lectura primero. La lista de categorías no equivale a permiso ilimitado.

### E. Herramientas oficiales alrededor de la API
- Hostinger CLI.
- SDK oficiales para PHP, Python y TypeScript.
- Hostinger Connector y servidores MCP para asistentes IA.
- Integraciones mencionadas en documentación: Terraform, Ansible, n8n y WHMCS.
- La API es REST sobre HTTPS con bearer token. La documentación general indica límite estándar de 90 solicitudes por minuto, sujeto a límites personalizados; manejar HTTP 429, cabeceras X-RateLimit y Retry-After.

### F. Riesgos y reglas de seguridad que NIA debe aplicar
1. **Nunca llamar POST/PUT/DELETE por exploración.** Primero consultar el endpoint y su esquema exacto; no inferir el body.
2. El POST de Node.js build puede sobrescribir el contenido actual del sitio y no es reversible. Antes requiere respaldo comprobado, ZIP verificado, destino inequívoco y autorización explícita para esa publicación.
3. El PUT de variables Node.js es reemplazo completo, no actualización parcial. Nunca ejecutarlo usando el listado enmascarado como fuente. Requiere inventario completo y valores reales de una fuente autorizada; no pedir ni registrar secretos en logs.
4. El PUT de configuración de build reemplaza campos y puede convertir campos omitidos en null.
5. DELETE de runtime logs borra historial sin recuperación; no usar en auditoría rutinaria.
6. Restart interrumpe/reinicia el proceso; no equivale a deploy y debe verificarse después.
7. Build analysis consume cuota y solo aplica a builds fallidos.
8. Respetar rate limit, paginación y errores 401/403/422/429/5xx.
9. Aplicar separación de credenciales indicada por el propietario: `HOSTINGER` solo IA para TODOS / FreeLLMAPI; `HOSTINGERENCARMEN` solo ENCARMEN Staging.
10. `encarmen.org` producción permanece de solo lectura; ninguna escritura sin autorización expresa del propietario.

### G. Qué puede hacer NIA con Hostinger para ENCARMEN
Con la credencial `HOSTINGERENCARMEN`, y limitándose inicialmente a `staging.encarmen.org`, la API puede convertirse en un canal para:
- Inspeccionar sitios, builds, configuración, variables (solo nombres), logs y estado de runtime.
- Diagnosticar builds fallidos y consultar análisis automático.
- Preparar despliegues de Node.js mediante ZIP y build API, cuando el artefacto esté validado y respaldado.
- Aplicar configuración o variables con un procedimiento de reemplazo completo y controlado.
- Reiniciar el servidor después de cambios autorizados.
- Consultar vulnerabilidades y evaluar parches.

**Estado:** estas últimas acciones son capacidades documentadas, no pruebas ejecutadas en nuestra cuenta. La autenticación y los endpoints de lectura señalados en secciones anteriores sí fueron probados.

### H. Siguiente secuencia recomendada
1. Confirmar que el runtime de Staging reconoce la variable `HOSTINGERENCARMEN` sin mostrar su valor.
2. Añadir una ruta de diagnóstico interna protegida que devuelva solo estado de presencia (booleano), nunca el secreto.
3. Construir cliente Hostinger separado para ENCARMEN, usando exclusivamente `HOSTINGERENCARMEN`; nunca fallback a `HOSTINGER`.
4. Implementar primero herramientas GET de inventario, builds, settings, variables enmascaradas y logs de build/runtime.
5. Añadir operaciones de escritura solo como acciones explícitas con confirmación, alcance fijado a `staging.encarmen.org`, respaldo y verificación posterior.
6. No permitir desde esta integración destinos arbitrarios ni acceso de escritura a `encarmen.org`.
