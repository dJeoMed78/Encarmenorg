# ENC-F008-R3 — recuperación y revisión

Estado EN_PROGRESO. Fecha local 2026-10-28. Rama work/enc-f008-r3-recuperacion. Base verificada d826a17b6f4bd29eaac1ef350111910ab2dfe872, procedente exclusivamente de work/enc-f008-contactos-visibilidad; ia-desarrollo sigue en0d231cb2779b7a14d8d336fc2f4de3782663c738. Instrucciones coordinación51ae3a45a6f82bc8fcec9f02432835f312ce8c02.

## Auditoría inicial recuperada

Revisados ambos commits053b729bb82f852fa61063802a6a757947cf8b12 y d826a17b6f4bd29eaac1ef350111910ab2dfe872, sus13 archivos, instrucciones generales, contexto, resultados, checkpointR2 e issues5/6. El documento completo ENC-F008-AUDIT-001 no aparece en los árboles de coordinación/R2 ni en búsqueda de código; se aplican los siete hallazgos proporcionados expresamente por Coordinación. No se declara leído un archivo no localizado.

R2 implementa autoridad de columnas SQL, lectura estricta, errores503 sin semillas, preservación por defecto del upsert, borrado explícito con sesión, canales separados y filtros/contadores/paginación. Sus nueve grupos de pruebas son evidencia histórica, todavía no resultados R3.

Server.ts:401 líneas eliminadas, principalmente importador bidireccionalWooCommerce/arranque de sincronización, inicialización de negocios desde semillas y sync-catalog que contaba guardados aunque fallaran. Se conservan estas decisiones: responden al alcance de preservación y a la retirada documental de WordPress; no se reactivan importaciones ni se restaura código destructivo. Las rutas ajenas, calificaciones, Radar y Editor no se sustituyen.

Hallazgos nuevos a resolver/probar: guard DDL de Staging no comprueba isWritePermitted antes de schema-init; tarjeta tel sin prefijo+; enlace administrativo de PIN infiere WhatsApp desde teléfono; datos de tipo objeto/array pueden coercionarse a contacto; readback de PATCH no valida contactos solicitados ni diferencia confirmación fallida posterior a escritura; alias oldId y respuestas frontend antiguas requieren pruebas adicionales.

La conexión/aislamiento de Hostinger sigue siendo una dependencia operativa. No cambiar variables, credenciales, permisos, infraestructura ni activar STAGING_DB_CONFIRMED. Preparar matriz de configuración con entorno sintético y guía para autorización posterior. No se ejecutó SQL real ni servidor completo.

Siguiente hito: recuperar fuente remota íntegra en copia aislada, corregir defectos de contacto y confirmar configuración mediante pruebas sin pool real; publicar pruebas y resultados. No integración, PR ni despliegue. Este checkpoint no aprueba R2.


## Implementación y validación del hito R3

Checkpoint inicial publicado: https://github.com/dJeoMed78/Encarmenorg/commit/d479c0414582919111b78ae93713a0d293f8833a

La copia local de los11 archivos funcionales/de prueba R2 se comparó por blob SHA con la rama remota antes de editar; todos coincidieron. No se trabaja desde una copia supuestamente actualizada. Los resultados R2 se conservan como historial, sin darlos por aprobación.

### Diagnóstico operativo actualizado

GET público de Staging volvió a responder200: database-status `local_json`, `connected=false`, `isolationValid=false`, base configurada `u293982346_encarmentest`, error que menciona STAGING_DB_CONFIRMED; health json_cache/205. GET1081 tiene nombre esperado Yuss Nails Beautiful Hands y ambos contactos vacíos, con no-store. No se divulgaron números ni credenciales. No se accedió a Hostinger autenticado ni se ejecutó SQL real. No se consultó producción en R3.

El código rechaza configuración de Staging sin readonly literal true ni confirmación de escritura. El perfil de lectura permite conectar sin STAGING_DB_CONFIRMED, siempre que las credenciales/host/base existentes sean correctos. Esto explica el bloqueo reportado, pero no prueba permisos ni configuración efectiva en hPanel. Guía precisa, matriz y acciones exclusivamente posteriores: [ENC-F008-R3-HOSTINGER.md](ENC-F008-R3-HOSTINGER.md).

### Decisiones sobre R2, incluidas eliminaciones de server.ts

- CONSERVADO: prioridad de columnasSQL, strict reads/503, actualización independiente de firma, ausencia de fallback de contactos, semántica de upsert y six filtros/paginación. Cuentan como implementación heredada y ahora sometida a nueva ejecución, no programación repetida.
- CONSERVADO: retiro de importadorWooCommerce y arranque automático, autoimportación businesses desde semillas y sync-catalog. La comparación R2/base muestra401 líneas eliminadas/72 añadidas en server.ts. La gran mayoría de esas eliminaciones está en el importador y los dos flujos de importación anteriores; estaban dentro del riesgo de pérdida y retirada documental de WordPress. No se reintroducen ni se activan otras sincronizaciones.
- NO REESCRITO: EditorR1, estilosGlass, Logotipo/Maps, Radar, Comentarios y calificaciones. R3 no aplica un rediseño ni incorpora ramas distintas.
- LÍMITE: lecturas de tabla completa por petición priorizan exactitud con205 registros; se mantiene el riesgo de coste cuando crezca el catálogo. No se certifica todo el servidor ni toda la autenticación heredada.

### Correcciones nuevas

1. Guard de DDL: initMariaDb exige isWritePermitted antes de schema-init. Readonly impide DDL incluso con STAGING_ALLOW_SCHEMA_INIT=true accidental; no se debilita la validación de aislamiento.
2. Llamadas de tarjeta: tel:+52 coherente con fichaGlass, sin prefijos duplicados.
3. Envío administrativo de PIN: solo WhatsApp registrado y válido; no se deriva del teléfono ni se genera un enlace vacío.
4. Validación de contactos: rechazo de arrays/objetos/booleanos/no finitos; strings y números enteros seguros mantienen normalizaciónMX. Los datos almacenados no se reescriben por esta validación.
5. PATCH compara los contactos solicitados con el readback real del adaptador. Mismatch da409, no success. Si se intentó escribir y se pierde el acknowledgement o la relectura, devuelve503 con writeMayHaveSucceeded=true y pide recargar antes de reintentar. No afirma rollback ante fallo de red.
6. ClienteAPI rechaza success sin negocio confirmado o con ID distinto.
7. App invalida/aborta respuestas de catálogo anteriores a un guardado confirmado: un GET lento no puede borrar el contacto recién confirmado ni mantener el indicador de carga.
8. Rutas históricas oldId vuelven a resolver la ficha canónica; null/undefined no se convierten en alias de texto.
9. Tarjeta digital (DOM y texto de exportación) y resumen de landing identifican teléfono y WhatsApp por separado; no rotulan un solo canal como ambos. Se conservan estructura, clases y posiciones existentes, usando el espacio anterior a la cajaWeb para la segunda línea del canvas. No se certifica exportación de imagen/canvas en navegador real.

### Archivos del delta R3

- server.ts
- src/db/mariadb.ts
- src/App.tsx
- src/services/api.ts
- src/utils/businessContacts.ts
- src/components/BusinessCard.tsx
- src/components/DigitalCardModal.tsx
- src/components/ClientBusinessPageView.tsx
- src/components/AdminBusinessesTab.tsx
- tests/contacts-r2.test.mjs (expectativa tel:+ y exportación del arnés recuperado)
- tests/contacts-r3.test.mjs (pruebas nuevas)
- docs/WORK_RESULTADOS.md (solo apéndice)
- docs/work-progress/ENC-F008-R3.md
- docs/work-progress/ENC-F008-R3-HOSTINGER.md

### Pruebas efectivamente ejecutadas

Node24.22.1, React19.3.1, TypeScript7.0.2, Vite8.3.5, esbuild0.28.2, jsdom30.1.3.

- `node --test tests/contacts-r3.test.mjs`:19 gruposPASS/0FAIL. Incluye los9 grupos recuperados R2 y10 adicionales, NO19 más9. Once combinaciones de configuración sintética dentro del grupo de configuración.
- TypeScript: `node_modules/.bin/tsc --noEmit`, PASS.
- Frontend: `node_modules/.bin/vite build --outDir /workspace/scratch/e1cd9bd12722/contacts-r3-build`, PASS1723 módulos.
- Servidor: `node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/workspace/scratch/e1cd9bd12722/contacts-r3-build/server-check.mjs`, PASS; no ejecutado.

Cobertura: APIHTTP local con handlers reales y pool simulado; serialización de columnas frente a raw_data; PATCH mínimo/omitido/vacío/null/espacios; cache antigua; borrado explícito autorizado/sin sesión/vencida; importaciones retiradas410 sin consultas; arranque fallido/vacío/reinicio simulado; seis filtros, búsqueda y paginación con60 registros; estados de error y reintento; teléfonos/WA independientes. Nuevas pruebas de matriz de readonly/DDL, tipo de contacto, mismatch/readback fallido/ack perdido, imports paralelos y actualización de ambos canales, alias, PINWhatsApp, confirmaciónAPI, respuestaGET atrasada y etiquetas independientes de tarjeta digital.

Prueba adicional de continuidad aislada: filaSQL sintética1081 con raw_data contradictorio -> serializador real -> handlerExpress porHTTP -> fichaGlass y botones de tarjeta reales en DOM. Los enlaces usan columnas del fixture, no los teléfonos obsoletos de raw_data. El ID1081 se reutiliza como referencia de contrato; sus números de prueba NO son los restaurados por el propietario.

En la prueba de carrera se sustituyen solamente dos hijos por adaptadores de callbacks del arnés; App, servicioAPI y tarjeta son reales. Las demás pruebas renderizan los componentes reales mencionados. jsdom comprueba DOM/interacciones, no layoutCSS ni dispositivos reales. Temporizadores ajenos deshabilitados/fetch sustituido en DOM. mysql.createPool/DDL son mocks: ninguna prueba se conecta a MariaDB ni ejecuta SQL real. La prueba paralela no demuestra locks ni transacciones de un motor real.

Se ejecutó nuevamente R2 por recuperación/revisión y tras cambios que afectaban sus contratos, no para sumar éxitos. Las ampliaciones finales se justifican por el guard readonly, el contacto internacional y el reconocimiento de ack perdido. No se corrigieron fallos ajenos a esta tarea.

### Reproducción

En copia independiente sin .env ni credenciales, con Node24:

    npm install --ignore-scripts --no-audit --no-fund
    npm install --no-save --package-lock=false --ignore-scripts esbuild@0.28.2 jsdom@30.1.3
    node --test tests/contacts-r3.test.mjs
    node_modules/.bin/tsc --noEmit
    node_modules/.bin/vite build --outDir /tmp/enc-f008-r3-frontend
    node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/enc-f008-r3-server-check.mjs

Package scripts revisados: build/prebuild actualizan versión y build:server escribe dos bundles. Se invocaron compiladores directamente con salida temporal. No ejecutar dev/start/initMariaDb real, npm run build ni scripts de migración/importación para estas pruebas. package/lock/version/bundles heredados no se modifican en esta entrega.

### Riesgos, pendientes y reversión

- Bloqueo operativo real sigue presente: conexiónMariaDB de Staging y permisos requieren intervención autorizada del propietario. El código no puede corregir variables/credenciales remotas sin autorización; no ocultará desconexión mediante semillas.
- Hostinger, MariaDB real, motor SQL efectivo, permisos cruzados, persistencia y sesión administrativa operativa NO verificados. Los174 restaurados por base son hechos reportados por Coordinación, no una nueva restauración/verificación SQL realizada por Work.
- El control de sesión para retirada explícita se conserva y prueba aisladamente. La autorización general de PATCH y la auditoría durable de borrados continúan como dependencias de revisión de seguridad; no se integra otra tarea para resolverlas.
- Un PATCH explícito desde un cliente antiguo que envíe un contacto no vacío se considera sustitución, no omisión: el protocolo no implementa control de versión universal para clientes externos. El EditorR1 ya envía solo contactos modificados; el upsert por defecto conserva contactos frente a importaciones antiguas.
- Advertencias conocidas: chunkfrontend mayor500kB y salida externa; no se alteran módulos para eliminar advertencias cosméticas.
- Bundles server.js/api/server.bundle.js quedan heredados. Antes de una ejecución autorizada, recompilar ambos desde el SHA revisado y verificar coherencia; no iniciar los antiguos como si contuvieran R3.
- Para retorno previo a integración, mantener la rama aislada. Si se autorizara integrar después, revertir únicamente commitsR3 mediante nuevos commits; se recupera R2 y sus defectos nuevos documentados. No force, SQL ni restauración de datos. Revertir R2 además reintroduce riesgo de semillas/sincronización y exige decisión separada.

DictamenWork: implementación permitida finalizada y probada aisladamente; candidata PARA REVISIÓN independiente, NO aprobación propia. No integración, despliegue, migraciones, restauración, cambios de infraestructura ni producción. Validación operativa pendiente según guía.
