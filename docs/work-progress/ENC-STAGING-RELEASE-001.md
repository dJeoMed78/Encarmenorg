# ENC-STAGING-RELEASE-001
## Inicio 2026-10-28T17:43:32.079Z
Estado EN_PROGRESO. Autorización directa de Coordinación01: consolidar selectivamente EditorR1 y Logo/Maps en rama candidata, sin integrar/desplegar. Rama work/ENC-STAGING-RELEASE-001 no existía al consultar; se crea únicamente esta rama desde ia-desarrollo cad1222618c94f4eb3dabb589b6e58836191dcb7. Documento de tarea en coordinación consultado:404; prevalece instrucción expresa de la sesión. Se leyeron reglas generales/contexto y los checkpoints de fuentes13326fdf616c45a0322ce1b1cd52973a264d1f83 y62dd05a1ba734ae035bb0792f09c0fbe6b3a00ca.
Alcance: EditBusinessModal.tsx conciliado, BusinessPublicDetail.tsx/CSS y types.ts para logo/map; WORK_RESULTADOS y este checkpoint. No Auth/Radar/Comentarios/API/DB/servidor/secretos/infraestructura. Reutilizar correcciones sin sustituir diseño actual; mantener puertas de permisos y operaciones inseguras deshabilitadas. Pruebas locales aisladas de proyecto/componentes, solo mocks explícitos y sin backend real. Se recuperará fuente exacta para compilación global; clon Git anónimo no disponible, se utiliza lectura GitHub autorizada. Pendiente implementación y pruebas, sin resultados inventados.

## Conciliación implementada; pruebas en curso — 2026-10-28T17:52:30.492Z
Estado IMPLEMENTADO con pruebas de integración EN_CURSO, no aprobado para despliegue. Conservados los siete ajustes R1 y su distribución visual; añadidos únicamente helpers/estado/UI de logo del trabajo previo. Un único control de exclusión evita guardar/cargar concurrentemente; delta de campos editados incluye logo_url solo si cambió, exige revalidación servidor antes de callback. URLs y fallbacks de Maps/ficha/CSS y tipado se reutilizan de Logo/Maps sin cambios de auth/API/backend.
Fuente base completa recuperada:91 archivos,91 SHA coincidentes con ia vigente. TypeScript7.0.2 --noEmit del proyecto completo PASS; Vite8.3.5 frontend completo PASS,1722 módulos, advertencia chunk>500kb. Salidas solo temporales, no scripts mutantes. Política Maps real:20 comprobaciones PASS sin red. Pruebas de componentes integrados todavía en curso; no se declara batería completa ni persistencia.
Defecto de integración corregido:validación MIME de logo debe seguir rechazandoGIF aunque cargas genéricas de portada/galería lo admitan. Pendientes:cerrar regresiones de editor, logo/mapas, responsive, modales y capturas. Contratos reales de credenciales y persistencia no habilitados; sin esas garantías campo logo queda cerrado. No nuevas credenciales, APIkeys, BD, SQL, PR, integración a ia o despliegue.

## ENC-STAGING-RELEASE-001 — candidata consolidada y probada 2026-10-28T18:01:00.536Z

### Estado y trazabilidad
CONSOLIDADO EN RAMA CANDIDATA / PROBADO_LOCALMENTE. Revisión de Coordinación PENDIENTE. NO INTEGRADO A ia-desarrollo, NO DESPLEGADO. No es certificación de MariaDB ni autenticación real.
Rama única work/ENC-STAGING-RELEASE-001, creada al no existir; base vigente cad1222618c94f4eb3dabb589b6e58836191dcb7, comprobada nuevamente antes de cierre. Coordinación consultada51ae3a45a6f82bc8fcec9f02432835f312ce8c02; documento de tarea404, autorización directa en sesión registrada. Reglas generales/contexto leídos. Fuentes reutilizadas:EditorR113326fdf616c45a0322ce1b1cd52973a264d1f83 y Logo/Maps62dd05a1ba734ae035bb0792f09c0fbe6b3a00ca. Sus ramas no se modificaron.
Checkpoint inicial2ebe21c6ce2848b5c7c5e69bf1288ddd7f014dbd; consolidacióndb348243ccf01ef3078889dfcb0dc0a6f70c0063. Cada commit tiene un padre normal; no merge/rebase/cherry-pick de ramas históricas, PR ni force push.

### Conciliación funcional
- EditBusinessModal.tsx:partir del JSX vigente y lógica R1 probada; insertar selectivamente helpers de URL/sesión y UI de logo de la otra implementación. NO reemplazo indiscriminado por archivo de otra rama ni diseño PR#3.
- Se conservan7 correcciones:parser de horario reconocido sin transformar texto libre no editado; contactos independientes sin inferirWhatsApp; pagos y modalidad sin defaults sobre legado; valores vacíos/heredados conservados y contacto editado validado; exclusión inmediata de doble guardado/reintento seguro; cargas503/dataURI rechazadas sin destruir imágenes.
- Único snapshot/delta de campos editados y exclusión de operaciones de R1 también para logo. Guardado de solo logo envía únicamente logo_url; no toca portada, galería, horarios, pagos, modalidad o campos desconocidos. Revalidar sesión/permiso en servidor ANTES de upload y ANTES del callback, con mutex activado antes de esperar. Respuestas de negocio/edición anterior no modifican el actual.
- Campo exclusivo Logotipo de la empresa, preview, subir/cambiar/quitar y mensajes honestos. Falta/vencimiento de sesión,403/503 y permisos insuficientes mantienen bloqueado. No se usa isAdmin como autorización del nuevo campo. Borrador no se presenta como guardado.
- Logo distinto de portada/galería; ausente/roto muestra fallback. Publicación responsive en ambas entradas reales BusinessDetailModal/DirectBusinessView mediante componente compartido. Desktop/tablet arriba a derecha de galería; móvil cabecera antes de galería.
- BusinessPublicDetail.tsx/CSS y types.ts reutilizan EXACTAMENTE fuentes de Logo/Maps, sin cambiar estrellas/comentarios/Auth/Radar. Google Maps solo URLs HTTPS conocidas/canonicalizadas y consentimiento previo; iframe accesible/lazy/referrer, fallback por CSP y enlace externo. Coordenadas válidas sin configuraciónEmbed generan enlace preciso; sin ubicación no se inventa pin. No nuevasAPIkeys, geocodificación ni proveedores.

### Defectos de integración resueltos
1. Uploader genérico R1 admiteGIF, pero logo exigeJPEG/PNG/WebP:se añadió validación diferenciada y prueba de rechazo antes de API.
2. Inserción del campo había perdido la clasept-1 original de portada:detectado por comparaciónAST, restaurado.184 atributos originales className/style vuelven a conservarse en orden, con estilos añadidos solo para logo.
3. Se unificaron exclusión/snapshot/validación asíncrona para evitar que la combinación de las dos implementaciones reintrodujera callbacks duplicados o sobrescrituras. No se agregan validaciones de contraseña en navegador ni endpoints nuevos.
Después de restaurarpt-1 se reconstruyó el montaje y se ejecutaron las baterías finales; los resultados siguientes pertenecen a la candidata final.

### Compilación REAL del proyecto completo
Fuente recuperada mediante GitHub autorizado porque clone anónimo no tenía acceso:91 archivos de build,91 SHA de blob coincidentes antes de aplicar cambios. Incluye todo src, server.ts, index.html, package/lock, tsconfig y Vite. Solo4 archivos funcionales difieren de base; manifiesto de hashes adjunto. No se usaron stubs de fuentes para afirmar compilación global.
Dependencias temporales externas:TypeScript7.0.2,Vite8.3.5,@vitejs/plugin-react6.1.1,@tailwindcss/vite4.3.3,React/ReactDOM19.0.1,Lucide0.546.0 y demás dependencias compatibles. No package/lock/config/dependencias de repo modificados. Node24 local, no validación de Node22Hostinger.
- node /tmp/enc-release-tools/node_modules/typescript/bin/tsc --noEmit -p /tmp/enc-staging-release/project/tsconfig.json:PASS, proyecto completo incluido backend, sin emitir/ejecutar.
- Vite CLI build desde copia completa del proyecto, outDir temporal frontend-build y emptyOutDir:PASS,1722 módulos, CSS247.51kB, JS1,329.30kB/gzip287.95kB. Advertencia chunk>500kB, no error. No npm run build/prebuild/update_version ni copia de bundles a repo.
- esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile temporal:PASS,351.9kB. COMPILACIÓN SOLAMENTE; nunca ejecutar servidor completo/DB.
La fuente de servidor se leyó para compilación, no se cambió ni se expusieron secretos en informe/artefacto.

### Pruebas funcionales y visuales finales
1. Regresión R1 SOBRE EDITOR CONSOLIDADO:24 comprobaciones PASS y5 adicionales PASS. Incluye los7 hallazgos, delta{}, solo nombre, preservación de heredados, contacto vacío/largo/+52, horario libre/turno nocturno, fallo de guardado/red y reintento,2submit=>1callback, upload503 tanto portada como galería, respuesta tardía, refresh mismoID, bloqueo durante carga y geometría1440/390.
2. Logo/Maps + wrappers reales:21 comprobaciones PASS. Sin sesión;401/403/503/vencimiento/permiso insuficiente; carga/cambio/quitar/reabrir; delta exclusivo; fallo sin cerrar;503/dataURI;MIME; permiso vencido antes de callback; doble envío durante verificación; cambio de negocio; ambas entradas1440/834/390/320; galería/ficha abrir/cerrar; logo ausente/roto; consentimiento yCSP; URLmaliciosa y coordenadas.
3. Editor móvil con campo logo desplegado y cancelar/reabrir:3 comprobaciones PASS.
4. Política Maps REAL extraída sin red:20 comprobaciones PASS:null/vacío/NaN/rangos/0,0, protocolos/hosts falsos, credencialesURL, puerto,HTML,key, embed canónico y enlaces cortos sin iframe.
No sumar controles repetidos entre baterías como escenarios únicos. No reutilizar conteos históricos como si fueran de este candidato:estas son nuevas ejecuciones justificadas por la conciliación.
Chromium153.0.8010.0/Playwright; APIs, sesiones, calificaciones, uploads y callback onSave SIMULADOS EXPLÍCITAMENTE. Cambios recuperados de registro EN MEMORIA de fixture no equivalen a DB. Cero excepciones JavaScript y solicitudes externas en baterías finales; solo POSTs a upload local simulado. Errores401/403/503 yCSP inducidos; no se afirma consola libre de esos errores esperados.
CSP REAL local frame-src'none' bloqueó iframe Google, generó evento de navegador y activó fallback conservando enlace; título/lazy/referrer verificados mediante observación DOM. Nunca se contactó Google ni se mostró un mapa simulado como proveedor real. Coordenadas0,0 y pb de fixture son sintéticos.
184 atributos originales className/style conservados medianteAST; dimensiones/clases de panel/scroll/pie iguales a editor vigente en1440/390. No se rediseñó. Posición del logo validada también en834/320.

### Evidencia entregada
[ENC-STAGING-RELEASE-001-evidencias.zip](https://chatgpt.com/library?file_id=libfile_330abd2465fc81918fb7462f9878cdee&account_id=personal)
11 PNG reales del montaje integrado, scripts locales, JSON de resultados, manifiesto de fuente ySHA256. Sin bundles/fuentes de aplicación/semillas/DB/credenciales reales en paquete.
- Integracion/editor-sin-sesion-1440.png
- Integracion/editor-logo-borrador-1440.png
- Integracion/editor-logo-desplegado-390.png
- Integracion/ficha-modal-1440.png / ficha-modal-390.png
- Integracion/ficha-direct-1440.png / ficha-direct-390.png
- Integracion/maps-consentimiento-1440.png
- Integracion/maps-csp-fallback-1440.png
- Editor-R1/editor-R1-1440.png / editor-R1-390.png
Revisadas visualmente ficha móvil, editor móvil desplegado y CSPdesktop; capturas de la aplicación/componente ejecutado, no imágenes generadas. El contenedor de pruebas tiene controles propios rotulados; no es navegaciónE2E del portal contra backend.
SHA256 editor final55ce3cdfaecb0bb362782b8a57a53e99c73c40d67f34f6c1ba0355c10e33fa4b. Blob Giteditor eedb330bf88b82c0b6f3132c20532cc6ec160e2f. Ficha660a87f63146c0a7c5d7f2de5d39c7ca773d6327; CSS71db9cc424f054e47ee96e1c88a21e3734cd9dd0; types42c27f6b401c8994486e3c1ff96faca511d870d5.
Harness integrado SHA256 b4286cc3686c859fd3c5c558ffdbe8182c71304197c749fdf97b413a3776cdda; móvil723c35dea1c3ac5ec056a267b6fbb00511bb2e63f48036940e22cf814693207e.

### Incidencias y límites
Fallos de harness corregidos antes de final:doble React entre referencia/candidata, espera visible sobre inputfile oculto, comparación URLrelativa con absoluta normalizada, sincronización de props/callback asíncrono y supuesto erróneo de tablet(logo a derecha de galería, nombre debajo). No se cambiaron estilos aprobados para satisfacer ese supuesto. Intentos incompletos no cuentan como PASS.
Un comando inicial invocó el binario esbuild mediante node; se corrigió invocándolo directamente y compiló. Creación inicial de ref por update_ref rechazó422; se usó create_branch, una sola rama autorizada. Ningún force ni escalación de permisos.
Persistencia real NO verificada. Contrato raw_data de logo solo compatible por lectura de código; no se comprobó esquema/conexión efectiva. onSave/API/backend pueden conservar comportamientos best-effort y autorización heredada; no se arreglaron fuera del alcance ni se presentan como seguros. No se incorporó la rama Auth. El nuevo campo no se habilita sin sesión servidor válida.
La exclusión local no sustituye idempotencia/validación/autorización backend. Uploads remotos parciales huérfanos requieren contrato de limpieza fuera de alcance. Safari/iOS, NodeHostinger, CSP real del sitio y mapaGoogle cargado quedan sin comprobar.
Sin SQL, migraciones, bases reales, secretos, hPanel, cambios de infraestructura, main/ia, otras ramas, PR o despliegue. Hostinger vigente; no Azure/Vercel/Render.

### Archivos y condiciones exactas para integración posterior
Solo src/components/EditBusinessModal.tsx, src/components/BusinessPublicDetail.tsx, src/components/BusinessPublicDetail.css, src/types.ts, docs/WORK_RESULTADOS.md y docs/work-progress/ENC-STAGING-RELEASE-001.md.
1. Coordinación revisa diff completo de candidata contra SHA vigente de ia; si cambió, conciliar antes de aprobar. Esta candidata sí nace del ia actual comprobado, no de ramas históricas divergentes.
2. Mantener puertas cerradas y no interpretar mocks como persistencia. Para habilitar logo/guardados:servidor debe acreditar sesión/permiso, endpoints de mutación y confirmación durable, sin fallback cliente; revisión de seguridad administrativa separada. No basta un isAdmin local.
3. Cualquier prueba con datos reales requiere autorización específica y aislamiento efectivo confirmado de credenciales/esquema/producción, respaldo y validación de lectura posterior; Work no realiza esas operaciones.
4. Revisar CSP/privacidad de Google y Node/compilación del entornoHostinger. Sin embed/configuración válida conservar alternativa; no crear claves implícitas.
5. Aprobación expresa de Coordinación antes de integrar. La autorización actual no permite push a ia ni despliegue; Hostinger puede reaccionar a integración, por lo que se requiere plan de publicación controlado.
Dictamen:APTO PARA REVISIÓN DE CANDIDATA FRONTEND CONSOLIDADA; integración únicamente condicionada a revisión anterior. NO APTO PARA DECLARAR ESCRITURAS/AUTENTICACIÓN/MARIA DB REALES VERIFICADAS O DESPLEGAR AUTOMÁTICAMENTE.

### Reversión
Antes de integrar:descartar candidata sin tocar ia o registrar reversión por commits normales, nunca force. Si Coordinación la integra en futuro y requiere rollback:revertir commits de código de esta tarea sobre su entorno autorizado, o restaurar los4 archivos desde cad1222618c94f4eb3dabb589b6e58836191dcb7 después de comprobar cambios posteriores. No revertir implementaciones ajenas ni usar la rama histórica del editor como referencia visual. Mantener cierre de funciones inseguras. No rollbackSQL porque no se modificaron datos. Documentación histórica se conserva.
