# ENC-PROD-CONTACTS-FIX-001
Fecha: 2026-10-28 (America/Mexico_City).
Estado: PROBADO_POR_WORK en aislamiento; pendiente revisión, validación MariaDB y autorización. NO integrado ni desplegado.
Rama: work/enc-prod-contacts-fix-001.
Base main: 9c1a1ca8bb0ed0bffe14bfcb175fef3733d38fa1.
Referencia selectiva R3: 924127e1b76919918c87ce9563d8b0de62a3d373.
Instrucciones coordinación: 51ae3a45a6f82bc8fcec9f02432835f312ce8c02.
No se fusionó R3 ni ia-desarrollo. La selección reutiliza prioridad SQL, lectura estricta, preservación de contactos, separación de canales y control de respuestas atrasadas, adaptados a main.

## Implementado
- Columnas SQL phone/whatsapp autoritativas incluso null/vacío; raw_data inválido, null o array no rompe el catálogo.
- dbLoadAllBusinesses exige conexión/lectura y propaga error genérico. GET lista/detalle/HEAD hacen lectura fresca por solicitud, independiente de firma MAX/COUNT. Responden 503 y fuente unavailable ante error; 200 con fuente mariadb y tabla vacía legítima permitida.
- Las solicitudes usan su resultado local: otra petición no puede sustituir su lista por una caché global más antigua.
- Arranque de businesses solo lee: no carga ni importa semilla, no escribe al detectar error o tabla vacía.
- Upserts generales conservan las dos columnas de contacto existentes incluso con valores entrantes no vacíos antiguos. Alta pública usa INSERT sin upsert, validación MX, canales separados y readback antes de confirmar.
- PATCH relee SQL, preserva contactos omitidos/null/vacíos/espacios y requiere expectedContacts para sustituir valores distintos. El Editor envía los valores que cargó originalmente. Una pantalla antigua recibe 409. Cada sustitución tiene comparación atómica en SQL; cambios concurrentes no se sobrescriben. Lectura posterior verifica contactos.
- Guardado dudoso/readback fallido devuelve 503 con writeMayHaveSucceeded=true; no promete rollback ni éxito local. El conflicto posterior puede haber guardado otros campos: recargar antes de reintentar.
- Eliminación explícita de contactos queda fuera de esta corrección: clearContacts se rechaza; vaciar preserva. No se introduce autenticación nueva.
- Importador bidireccional WooCommerce y temporizador de arranque retirados. Constante de sincronización fijada en false; el helper central de credenciales retorna null y desactiva exportaciones inline existentes. POST sync-catalog, sync, webhook/woocommerce y businesses/:id/sync-wp devuelven 410 sin BD.
- App empieza sin semilla, muestra error/reintento, refresca al recuperar foco, actualiza fichas abiertas y descarta respuestas anteriores a un guardado. Landing usa la misma consulta autoritativa; se retiran sus consultas paralelas antiguas.
- Clientes API no presentan registros ni ediciones locales como confirmados. Sin fallback localStorage para altas.
- Tarjeta, modal y vista directa no usan contactos ajenos ni infieren WhatsApp desde teléfono. Normalizan 10/52/521 y evitan prefijo duplicado.
- Se conserva JSX del Editor byte por byte; solo cambia su preparación de contactos y snapshot de concurrencia. Se conserva íntegra la sección de rutas de calificaciones. Sin estilos/rediseño, cambios en Radar/Eventos, tablas, permisos o infraestructura.

## Archivos
server.ts; server.js; api/server.bundle.js;
src/db/mariadb.ts; src/utils/businessContacts.ts;
src/App.tsx; src/services/api.ts;
src/components/BusinessCard.tsx; BusinessDetailModal.tsx; DirectBusinessView.tsx; EditBusinessModal.tsx;
tests/prod-contacts-fix-001.test.mjs;
dist/index.html; dist/assets/index-BCFNf-Yc.js; dist/assets/index-Cbo85rTE.css;
docs/WORK_RESULTADOS.md; este documento.
Los assets anteriores se conservan; no se eliminan respaldos ni archivos existentes.

## Pruebas ejecutadas
Herramientas temporales, sin modificar package.json/lock: Node24.22.1 y Node22.23.4; esbuild0.28.2, TypeScript7.0.2, Vite8.3.5, Express4.22.3, React19.3.1, jsdom30.1.3.
- node --test tests/prod-contacts-fix-001.test.mjs: 16/16 PASS.
- ENC_PROD_EXECUTABLE=server.js node --test tests/prod-contacts-fix-001.test.mjs: 16/16 PASS.
- ENC_PROD_EXECUTABLE=api/server.bundle.js node --test tests/prod-contacts-fix-001.test.mjs: 16/16 PASS.
Matriz final Node22: los tres modos anteriores, 48 ejecuciones de grupos, cero fallos/omitidos. También pasaron en Node24. No son 48 escenarios distintos.
El arnés extrae definiciones reales de fuente/bundles sin importar módulos completos ni ejecutar initMariaDb. API Express real por loopback; pool/repositorio simulados; tarjeta real renderizada en servidor. Hooks reales de carga/guardado de App ejecutados con React/jsdom comprueban error, reintento y respuesta atrasada. No es un arranque completo ni prueba de layout.
- Backend: esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.js; copia idéntica api/server.bundle.js: PASS.
- node --check server.js y api/server.bundle.js: PASS.
- vite build --outDir /tmp/enc-prod-contacts-frontend --emptyOutDir: PASS, 1720 módulos. Salida copiada a los tres archivos dist indicados; resto de dist conservado. Advertencia de chunk >500 kB.
- git diff --check: PASS.
- tsc --noEmit: FAIL por error PREEXISTENTE src/components/AdminEventsTab.tsx:1499:91, TS2339: source no existe en AIRadarCandidate. Mismo error observado antes de las modificaciones de interfaz y archivo intacto. No se corrige un módulo ajeno ni se declara tipado global aprobado.
Errores corregidos durante trabajo: ancla de extracción de App diferente en main, nullabilidad inicial del Editor y extracción de firmas TypeScript en arnés. Primeras pruebas fallaron por comentario que contenía seed y por extractor; se corrigieron, sin dar esas ejecuciones por exitosas.

Cobertura: raw_data contradictorio/null/array/JSON inválido; SQL null/vacío; desconexión y error vs tabla vacía; actualizaciones sin firma; GET/HEAD; upsert viejo/vacío/omitido; INSERT duplicado; PATCH parcial y contactos separados; edición vieja y carrera entre lectura/escritura; readback perdido; alta con un solo canal; rutas 410 sin consultas; no importación de arranque; cliente ante fallos; botones deshabilitados sin contacto; error/reintento de App y descarte de respuesta atrasada.
SQL se valida mediante parámetros y simulación de sus condiciones: NO se ejecutó contra motor MariaDB. No acredita locks, collation ni transacciones reales.

## Huellas SHA256
server.ts: 4b0d5cc352c19bd21d7b4e8a5176d1023ede5b68e0f7aeda63e6839ffe132e1f
server.js y api/server.bundle.js (328559 bytes): 50bd220b74ac028dae35fc61ba2b2553769981d4a3046b0a2786c817c6566d15
dist/index.html: 65049e68876c5220880cc61d5c296d39f3de795d2d6152a4c127b60ef5972b2d
frontend JS: c9453f3b12721981f7c514aaa816f32c6a8d45a85f960ccf13330c9832778711
frontend CSS: 835576d1c559c94b46dd91d9be0d76a8f60b2426647bfc67af86fa95de1fd2ed
La versión visual heredada no se cambió. Identificar entrega por SHA y huellas, no solo etiqueta visual.

## Reproducción
En copia independiente de esta rama, sin .env ni credenciales:
1. Instalar dependencias del proyecto con --ignore-scripts. Añadir temporalmente esbuild@0.28.2 y jsdom@30.1.3, sin modificar manifests versionados.
2. Ejecutar los tres comandos node --test de arriba.
3. Invocar esbuild y Vite directamente; no npm run build/prebuild, que actualizan versión.
No iniciar dev/start ni importar server.ts, server.js, api/server.bundle.js o el módulo MariaDB completo.
El arnés usa únicamente fixtures inventados; no contiene contactos restaurados reales.

## Riesgos y condiciones antes de intervenir
1. No cambia ni certifica conexión, variables o código efectivo de Hostinger. El 403 previo no se elude ni se resuelve aquí.
2. main conserva inicialización DDL y tareas de otros módulos. No ejecutar servidor completo contra producción para probar esta rama.
3. Autorización general heredada de PATCH/otros endpoints NO queda certificada. expectedContacts es control de concurrencia, NO autenticación. Evaluar seguridad antes de habilitar cambios en producción.
4. Clientes antiguos que pretendan sustituir contactos distintos sin expectedContacts reciben 409; deben recargar/usar interfaz actualizada. No se habilita borrado de contactos.
5. INSERT concurrentes con mismo ID no sobrescriben negocios: uno puede fallar y pedir recarga. No se añade secuencia/migración.
6. Lectura completa por GET prioriza exactitud; medir carga. No se añaden filtros administrativos F009 ni rediseño Glass.
7. Tipado global bloqueado por error previo de Eventos. Solicitar decisión/corrección separada antes de exigir un pipeline tsc totalmente verde.
8. Antes de despliegue: revisión independiente, prueba MariaDB desechable, confirmar esquema/respaldos/permisos/runtime, prueba ID1081 y los restaurados API/UI, aprobación expresa y ventana/reversión.
9. Sin pruebas móviles/layout, llamadas/WhatsApp físicos, SQL real, persistencia real tras reinicio ni sesión administrativa real.

## Reversión
Antes de futura integración, la reversión es no integrar esta rama.
Si se autoriza después: conservar release previa completa (frontend, backend y configuración privada), revertir únicamente los commits de esta tarea mediante nuevos commits bajo autorización; no SQL, force push, reimportación ni restauración masiva. Retornar a main antiguo reactiva riesgos de semillas/upsert/sync: evaluar ese retorno antes de reiniciar. Mantener restauración de datos independiente del rollback de código.

No se modificaron main, ia-desarrollo ni ramas del Trabajador1; sin PR, merge, despliegue, Hostinger, secretos ni consultas SQL reales.


## Publicación y verificación remota
Implementación publicada: https://github.com/dJeoMed78/Encarmenorg/commit/d1ea78d7a88385f29bdd9f224983295b86069c6f
Comparación: https://github.com/dJeoMed78/Encarmenorg/compare/9c1a1ca8bb0ed0bffe14bfcb175fef3733d38fa1...d1ea78d7a88385f29bdd9f224983295b86069c6f
Verificación del árbol remoto: 17/17 blobs coinciden con los contenidos locales probados y sus hashes Git. Comparación ahead_by=1, behind_by=0; exactamente17 rutas previstas, sin archivos eliminados. Se preservan los assets históricos, package/lock, semilla, módulos de eventos/Radar y ramas ajenas.
La carga inicial del árbol con contenido inline recibió422 por timeout/tamaño; se publicaron blobs separados y árbol por SHA, con verificación íntegra posterior. No se omitió ningún artefacto ni se pidió ampliar permisos.
Este cierre añade solo evidencia documental, sin cambiar código ni repetir pruebas. El commit final documental se identifica en el informe entregado a Coordinación. La autorización para integrar/desplegar permanece pendiente.
