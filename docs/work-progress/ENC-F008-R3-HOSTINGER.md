# ENC-F008-R3 — plan de conexión de Staging, pendiente autorización

Este documento propone acciones futuras del propietario/Coordinación. Work no aplicó variables, permisos, reinicios, despliegues, SQL ni cambios de infraestructura. No crear otra base ni repetir la recuperación de174 registros.

## Diagnóstico y condiciones del código

En las consultas públicas de esta ejecución, Staging sigue declarando `local_json`, `connected=false`, `isolationValid=false`, base configurada `u293982346_encarmentest`; health indica json_cache/205. El error de aislamiento menciona STAGING_DB_CONFIRMED. La API pública de1081 devuelve nombre esperado y ambos contactos vacíos. Son respuestas HTTP, no inspección autenticada de hPanel, permisos o esquema SQL efectivo.

La ruta causal del código es verificable:

1. APP_ENV/NODE_ENV, STAGING/STAGING_SAFE_MODE o APP_URL/PUBLIC_URL determinan si el proceso se reconoce como Staging.
2. En Staging no existe fallback implícito de conexión: se requieren host, usuario, base y contraseña existentes.
3. Sin STAGING_READ_ONLY=true y sin STAGING_DB_CONFIRMED=true, validateStagingDbConfiguration rechaza el arranque de MariaDB antes de crear el pool. isWritePermitted también resulta false. Por eso el diagnóstico puede informar readOnly=true aun cuando la variable literal STAGING_READ_ONLY no sea true.
4. El perfil de lectura STAGING_READ_ONLY=true permite validar/conectar sin afirmar aislamiento para escrituras. STAGING_DB_CONFIRMED no es necesario para esa lectura.
5. Conectar requiere credenciales/host/puerto correctos y permisos existentes. Pasar la validación de variables no acredita conectividad ni privilegios reales.
6. R3 exige isWritePermitted también antes de DDL, incluso si STAGING_ALLOW_SCHEMA_INIT fuera true. No se deben habilitar DDL ni escrituras para recuperar la visualización.

Once combinaciones de variables sintéticas prueban estas condiciones y el rechazo de configuración incompleta; mysql/pool/DDL se sustituyen por funciones en memoria. No son once conexiones reales.

## Inspección manual sin aplicar cambios

1. Abrir el Dashboard del sitio de STAGING en Hostinger y confirmar explícitamente staging.encarmen.org. No seleccionar encarmen.org. Registrar en privado aplicación, rama/SHA/artefacto ejecutado y versión Node.
2. Consultar Environment variables y los datos de conexión existentes del sitio. No publicar capturas con secretos ni copiar valores a GitHub/chat.
3. Verificar la base existente u293982346_encarmentest. La base productiva u293982346_encarmenapp no es un objetivo admisible para este procedimiento.
4. Verificar que el usuario de Node esté limitado a la base de Staging y que pueda usarse con SELECT únicamente durante la verificación. Una sesión phpMyAdmin del propietario no demuestra los permisos del usuario Node. Si falta una cuenta adecuada o no pueden verificarse privilegios cruzados, detener este paso y solicitar un plan de permisos separado; no inventar ni crear credenciales.
5. Revisar conflictos entre DB_*, MYSQL_* y MARIADB_*: el código prioriza DB_*, luego MYSQL_*, luego MARIADB_*; el puerto toma DB_PORT/MYSQL_PORT. No copiar nombres genéricos de ejemplos del proveedor. Usar los valores existentes confirmados para esa aplicación.
6. Revisar privadamente si un archivo .env instalado contiene valores que contradigan hPanel: server.ts carga dotenv con override:true. Cambiar el panel podría no cambiar la configuración efectiva. No leer/publicar secretos ni borrar/modificar ese archivo dentro de esta tarea.

## Perfil propuesto, NO aplicado

| Variable | Condición propuesta para verificación de lectura |
| --- | --- |
| APP_ENV | staging, aunque NODE_ENV sea production |
| DB_NAME | u293982346_encarmentest, existente y verificada |
| DB_HOST | Host real confirmado para ESTA aplicación; no se inventa. La documentación del proveedor recomienda127.0.0.1 para conexión local de Node; confirmar que aplica a la instalación antes de cambiarlo |
| DB_PORT | Puerto existente confirmado; el código usa3306 por defecto si no se configura |
| DB_USER | Cuenta existente verificada, limitada a Staging; no se proporciona nombre ni se crea una cuenta |
| DB_PASSWORD | Secreto existente administrado por el propietario; no incluirlo en documentos |
| STAGING_READ_ONLY | true, literal minúscula sin comillas externas |
| STAGING_DB_CONFIRMED | false para esta fase; no habilitar escrituras |
| STAGING_ALLOW_SCHEMA_INIT | false; no crear/modificar tablas |
| ENABLE_WP_SYNC | false en artefactos heredados; R2/R3 lo deshabilitan también en código |

No es una transcripción del entorno actual ni una autorización para aplicarlo. No introducir variables DB_* o STAGING_* como VITE_*: son configuración de servidor, no secretos para el frontend. DATABASE_URL no es leído por este adaptador.

## Aplicación posterior, solo con autorización específica

1. Coordinación revisa el código y autoriza por separado el perfil de conexión, los permisos y la aplicación de cambios al proceso de Staging. Conservar copia privada segura de la configuración anterior y plan de retorno.
2. En Environment variables del sitio correcto, aplicar exclusivamente los valores aprobados. Si la aplicación mantiene .env con prioridad, resolver esa discrepancia como cambio autorizado separado. No tocar producción.
3. Antes de reiniciar un artefacto heredado, verificar que no active importaciones o sincronización externa al arrancar. Tras autorización, reiniciar únicamente el proceso de Staging para cargar variables runtime. No usar reconnect/sync-catalog/importaciones como atajo. Un cambio de variables no incorpora R3: publicar código/recompilar es otra operación que requiere aprobación propia.
4. Antes de ejecutar una versión R3 aprobada, recompilar frontend y servidor desde su SHA; asegurar que server.js y api/server.bundle.js corresponden al mismo server.ts. Los bundles heredados del repositorio NO se actualizaron en esta tarea; el bundle temporal fue compilado pero nunca ejecutado.
5. Verificar en lectura: database-status con engine MariaDB/connected true, configuración Staging y guard de escritura false; health con database=mariadb. Confirmar independientemente esquema efectivo y ausencia de permisos productivos. Estos diagnósticos no sustituyen revisar privilegios.
6. Comparar internamente los contactos restaurados de1081 entre SQL ya verificado por Coordinación, GET de lista y detalle, tarjeta y ficha. En una versión R3, comprobar cabecera X-Encarmen-Business-Source=mariadb y no-store. Evaluar también los174 registros restaurados y contadores completos; no publicar sus números en el informe.
7. Verificar búsqueda/paginación/filtros con lectura. No probar PATCH, eliminación de contactos ni guardados sobre registros reales. Si un paso falla, conservar read-only/DDL deshabilitado, registrar estado redaccionado y detener el paso afectado.

## Retorno y límites

Ante fallo de conexión, restaurar únicamente la configuración previamente aprobada bajo autorización del propietario y reiniciar solo Staging si se autoriza. Nunca activar STAGING_DB_CONFIRMED o schema-init para ocultar el error; no restaurar SQL ni reactivar WooCommerce/semillas. La aplicación R3 falla con503 de forma explícita si la fuente no está disponible.

Este plan no certifica que otros procesos de arranque estén libres de intentos de escritura. La cuenta SELECT limitada y las protecciones de aplicación deben verificarse conjuntamente antes de arrancar un servidor real. No se propone modificar otras tablas.

## Referencias oficiales del proveedor consultadas

- Variables runtime, panel y reinicio: https://www.hostinger.com/support/how-to-edit-or-add-environment-variables-after-deployment/
- Datos de conexión y host local de Node: https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/

Los ejemplos genéricos de esas páginas no son valores verificados de ENCARMEN. Las condiciones APP_ENV/STAGING y la precedencia de variables provienen del código del repositorio, no del proveedor.
