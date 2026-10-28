# ENC-F008-R2 / ENC-F009 — continuidad y evidencia

- Fecha: 2026-10-28. Responsable: Work Desarrollo, trabajador 1.
- Estado: PROBADO_POR_WORK en entorno aislado; pendiente revisión y validación operativa.
- Rama exclusiva: `work/enc-f008-contactos-visibilidad`.
- Base: `ia-desarrollo`, `0d231cb2779b7a14d8d336fc2f4de3782663c738`.
- Instrucciones: orden original, complemento de auditoría y rectificación de Coordinación 01; se cumplen conjuntamente. Issues #5 y #6 consultados. `WORK_INSTRUCCIONES.md` de coordinación: blob `c4ef37ba0f690f60cd9fb5189190afd2be9a8faa`.
- No se modificaron Editor, Logotipo/Maps, secretos, infraestructura, main ni ia-desarrollo. No integración, PR ni despliegue.

## Causa inmediata observada (HTTPS público, sin sesión ni conexión SQL)

2026-10-28, consultas GET a Staging:

| Recurso | Resultado observado |
| --- | --- |
| `/api/database-status` | 200; `activeEngine=local_json`, `environment=staging`, `connected=false`, base configurada `u293982346_encarmentest`, `isolationValid=false`, `readOnly=true` calculado por el guard |
| `/api/health` | 200; `database=json_cache`, 205 negocios |
| `/api/businesses/1081` | 200; nombre `Yuss Nails Beautiful Hands`; phone y whatsapp vacíos; `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`; sin cabecera Age observada |

El error de aislamiento reportado menciona `STAGING_DB_CONFIRMED`. No se publicaron usuario, host, tokens, contraseñas ni mensajes de conexión. `readOnly=true` es el resultado del guard, NO prueba de que la variable STAGING_READ_ONLY esté configurada en true.

Esta combinación demuestra que el proceso público consultado sirve JSON y no mantiene una conexión MariaDB activa. La restauración SQL por sí sola no cambia esa fuente. No se atribuye el incidente exclusivamente a caché, ni se certifica el esquema conectado mediante SELECT DATABASE(). No se accedió a hPanel/SSH ni a bases reales.

Producción: GET público `/api/businesses/1081` rechazado con HTTP 403. No se insistió ni se eludió el rechazo. Conexión efectiva y visualización de producción pendientes. Las 174 restauraciones por base son evidencia aportada por Coordinación; no fueron repetidas ni verificadas mediante SQL en esta tarea.

## Hallazgos y correcciones

1. Semilla: 205 registros, 30 phone y 30 whatsapp no vacíos; ID 1081 sin ambos. App iniciaba con semillas y el servicio de consulta volvía a ellas ante errores. Ahora App empieza sin negocios, consulta API, acepta un conjunto vacío legítimo y muestra error/reintento si falla. El servicio no sustituye contactos vigentes por la semilla. La semilla se conserva intacta; otros usos estadísticos históricos del servicio no se modificaron.
2. Serialización: las columnas SQL phone/whatsapp tienen prioridad absoluta, incluidos vacío y null. raw_data no puede resucitar contactos retirados ni sustituir restaurados. La validación MX compartida decide qué contactos son utilizables y contabiliza los inválidos como ausentes sin modificar los datos almacenados.
3. Actualización verificable: GET de lista/detalle y PATCH hacen lectura estricta de MariaDB, independiente de MAX(updated_at)/COUNT(*). GET identifica `X-Encarmen-Business-Source=mariadb`; fallo da 503 y fuente `unavailable`, sin devolver semillas. La lista incluye `source=mariadb`. Se conserva no-store.
4. Upsert: por defecto conserva los contactos existentes incluso si llegan valores no vacíos de una caché vieja. El INSERT de negocios nuevos conserva los contactos suministrados. Solo el PATCH validado habilita sustitución de campos enviados; omitido/null/vacío/espacios preservan el valor SQL. Las condiciones SQL y sus parámetros se comprueban aisladamente, NO en un motor MariaDB real.
5. Arranque: consulta estricta y cero escrituras de inicialización de businesses, tanto ante tabla vacía como ante fallo. No importa negocios faltantes desde semillas. Un reinicio no repone contactos históricos sobre SQL.
6. Sync-catalog y rutas heredadas WooCommerce: HTTP 410, sin lectura/escritura de negocios. Flag de sincronización fijado en false y helper de importación retirado; una variable de entorno no puede revivirlo. Se respeta la decisión documental de retirar WordPress. No se cambian Radar ni sus contratos.
7. UI: tarjetas, ficha Glass y landing empresarial usan validación MX común; teléfono y WhatsApp independientes, sin inferir un canal del otro. Botones y enlaces apuntan al contacto de su propio negocio.
8. Retirada explícita: PATCH `{clearContacts:["phone"]}` o `["whatsapp"]`, sesión administrativa real validada por el mapa de sesiones del servidor; sin sesión, token inventado o sesión vencida => 403. Solicitudes ambiguas o inválidas => 400. La interfaz pide confirmación y espera respuesta/readback. Registro operativo de ID y nombres de campos, sin números/tokens; no es una auditoría durable en BD.
9. ENC-F009: seis filtros, búsqueda, categoría/colonia, contadores del conjunto completo antes de paginar, aviso de ausencia y páginas de 24 registros en grid/lista. API soporta `contacts=all|phone|no-phone|whatsapp|no-whatsapp|none`, `offset` y `limit` opcionales (1..200); sin paginación explícita devuelve todo para mantener compatibilidad. Contadores por ámbito de búsqueda antes del filtro de contactos/página.
10. Confirmación: PATCH devuelve contactos releídos desde SQL, no el objeto propuesto. Si no puede confirmar, falla sin anunciar éxito. App refresca al recuperar foco y reconcilia la ficha abierta. Reintento de negocios tiene etiqueta accesible propia.

## Pruebas reales ejecutadas localmente

Entorno Node 24.22.1, TypeScript 7.0.2, React 19.3.1, esbuild 0.28.2, jsdom 30.1.3.

- `node_modules/.bin/tsc --noEmit`: PASS.
- `node_modules/.bin/vite build --outDir /workspace/scratch/e1cd9bd12722/contacts-build`: PASS, 1723 módulos. Advertencia de chunk mayor de 500 kB y salida externa al proyecto; no se ejecutaron scripts que actualizan versión.
- `node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/workspace/scratch/e1cd9bd12722/contacts-build/server-check.mjs`: PASS; bundle no ejecutado.
- `node --test tests/contacts-r2.test.mjs`: 9 grupos PASS, 0 fallos en la ejecución final.

Los nueve grupos comprueban normalización y separación de canales; serialización SQL frente a raw_data; upsert vacío/omitido/null/espacios/caché vieja/sustitución explícita; intentos de borrado inválidos/sin sesión; arranque fallido/vacío/restaurado; handlers reales Express GET/PATCH/410 con repositorio simulado; componentes reales React en DOM jsdom (botones, Glass, seis filtros, búsqueda y paginación con 60 negocios); servicio API ante 503 con falso success; App con error, reintento y actualización de ficha abierta al recuperar foco. Se prueba lectura tras recrear el repositorio simulado, no un reinicio de Hostinger.

El ID sintético 1081 en pruebas no contiene los contactos reales restaurados. No se ejecuta server.ts, initMariaDb, DDL, SQL real ni escrituras de red. El pool es simulado; no acredita semántica ejecutada por MariaDB, persistencia ni autenticación operativa. El arnés desactiva temporizadores de módulos ajenos al alcance y sustituye fetch en pruebas DOM. Las únicas peticiones de las pruebas HTTP son loopback a Express con almacenamiento simulado.

Incidencias corregidas durante validación: nombre local que ocultaba el argumento data en el servicio; tipos del helper WooCommerce retirado; selector de enlace tel con prefijo +; selector de reintento confundido con el de calificaciones. El arnés se aisló de temporizadores históricos de otros módulos. Ninguna de estas iteraciones fallidas se declara exitosa.

## Reproducción segura

En una copia independiente de esta rama, sin .env ni credenciales, con Node 24:

    npm install --ignore-scripts --no-audit --no-fund
    npm install --no-save --package-lock=false --ignore-scripts esbuild@0.28.2 jsdom@30.1.3
    node --test tests/contacts-r2.test.mjs
    node_modules/.bin/tsc --noEmit
    node_modules/.bin/vite build --outDir /tmp/enc-f008-review-build
    node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/enc-f008-server-check.mjs

No ejecutar npm run build/prebuild, npm run dev, start, el bundle de servidor ni scripts SQL para estas pruebas. Las dependencias adicionales son solo de prueba; package.json y lock del proyecto no forman parte del cambio publicado.

## Bloqueos y condiciones para integración

- NO APTO para despliegue inmediato: el proceso observado no está conectado a MariaDB. La nueva versión deliberadamente mostrará indisponibilidad hasta disponer de la fuente autorizada, en lugar de fingir contactos actuales con semillas.
- Coordinación debe revisar configuración y privilegios sin compartir secretos, comprobar esquema efectivo y separación Staging/producción. No activar STAGING_DB_CONFIRMED a ciegas: puede habilitar otras escrituras del servidor. Evaluar lectura con cuenta limitada y configuración segura, bajo autorización separada.
- Pendiente comparar ID 1081 y cobertura de los 174 registros entre columnas SQL, API y ficha tras conexión/despliegue autorizado. Producción continúa sin comprobación por HTTP 403.
- Pendiente ejecutar las condiciones SQL en una MariaDB local independiente autorizada; no se declara persistencia probada.
- Revisar por separado autenticación heredada y autorización de PATCH en general. Esta tarea reutiliza el control de sesión del servidor para borrado explícito y no certifica todo el módulo de seguridad.
- Auditoría durable de borrados y umbral de caída de cobertura requieren decisión de Coordinación; no se crea tabla, migración ni infraestructura.
- Lectura completa por petición prioriza consistencia con 205 registros; medir carga antes de ampliar catálogo. No se hicieron pruebas físicas de llamada, envío de WhatsApp ni navegadores móviles reales.
- Rollback: conservar estos commits aislados/no integrarlos; si se autoriza integrar después, revertir sus commits de código sin SQL. Revertir devuelve los riesgos de semillas/caché/sobrescritura, por lo que debe evaluarse antes. No restaurar datos ni modificar producción como rollback de código.

Dictamen: IMPLEMENTADO y PROBADO LOCALMENTE con aislamiento. Evidencia pública de diagnóstico verificada; conexión/persistencia/autenticación reales pendientes. NO INTEGRADO, NO DESPLEGADO, NO APROBADO por el propio trabajador. Espera revisión independiente de Coordinación.


## Publicación y comprobación remota

- Implementación publicada: https://github.com/dJeoMed78/Encarmenorg/commit/053b729bb82f852fa61063802a6a757947cf8b12
- Comparación: https://github.com/dJeoMed78/Encarmenorg/compare/0d231cb2779b7a14d8d336fc2f4de3782663c738...053b729bb82f852fa61063802a6a757947cf8b12
- Lectura remota posterior: 13/13 archivos coinciden exactamente con los contenidos probados/publicados; comparación ahead_by=1, behind_by=0 antes del cierre documental. Ref remota confirmada en el SHA anterior.
- Blobs de Editor, CSS Glass, types, semilla, package.json y ambos bundles de servidor conservados. No hay archivos de otras tareas en el diff.
- Advertencia de integración: se entrega fuente y se verificó un bundle temporal, NO se actualizaron server.js ni api/server.bundle.js. Antes de ejecutar el candidato, Coordinación debe garantizar la recompilación desde server.ts y la coherencia de ambos artefactos; iniciar los bundles heredados no incorpora esta corrección. No ejecutar el bundle temporal contra entornos reales.
- Base ia-desarrollo nuevamente comprobada en 0d231cb2779b7a14d8d336fc2f4de3782663c738 antes del cierre. Estas comprobaciones son de GitHub/código; no certifican despliegue ni conexión de Hostinger.
