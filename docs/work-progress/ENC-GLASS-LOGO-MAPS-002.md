# ENC-GLASS-LOGO-MAPS-002
## Inicio 2026-10-28T12:06:09.913Z
Base cad1222618c94f4eb3dabb589b6e58836191dcb7, rama work/enc-glass-logo-maps-002. Instrucción e6766270ac99949888ee71bd4ade625d0ab0ccdb.
Contrato inspeccionado solo lectura: PATCH negocios combina req.body, dbSaveBusiness guarda JSON completo en raw_data y dbLoadAllBusinesses extiende ...extra; logo_url puede conservarse sin columna nueva. NO se ejecutó SQL ni se prueba BD. Uploader existente da URL; no cambiar servidor/API/uploader. Logo nuevo requiere sesión/permiso comprobado en servidor y no indicador isAdmin; con servidor actual sin contrato de sesión seguro el campo queda inactivo. Trabajo Auth está en rama independiente, sin integrar, y requiere credenciales/operaciones seguras.
Implementar tipado opcional logo_url, campo separado de portada/galería con carga confirmada (sin fallback dataURL), quitar/logo preserve portada, revalidación de permiso antes de guardar cambio de logo. Publicar logo seguro y fallback inicial/nombre si ausente o roto. Preservar diseño/posición.
Maps: documentación primaria Google revisada (https://developers.google.com/maps/documentation/embed/embedding-map). Embed API exige clave; no crear/configurar claves en esta tarea. Solo URL de mapa compartido embed de Google validada puede cargarse con consentimiento; coordenadas válidas generan enlace externo preciso si no hay embed admitido/configuración. No usar variantes no documentadas de iframe ni inferir pin desde nombre/dirección. Mantener fallback honesto y detectar CSP/error; proveedor real no se contactará en tests.
Archivos: BusinessPublicDetail.tsx/CSS solo logo/map, EditBusinessModal.tsx solo campo logo y etiqueta portada, types.ts solo logo_url, WORK_RESULTADOS y este progreso. No Auth/Radar/comentarios/App/DB/API/dependencias.

## Hito frontend probado 2026-10-28T12:23:44.721Z
Campo logo independiente implementado con preview/subir/cambiar/quitar, rol servidor business:manage, revalidación antes de cambio/guardado, payload solo al editar logo y sin base64 fallback. Logo roto/ausente muestra inicial/nombre; portada/galería independientes. Mapa soloURL https Google compartida embed/pb canónica y carga voluntaria; sin embed admitido coordenadas producen enlace exacto/fallback, sin APIkeys nuevas. CSP bloqueado mantiene enlace. 23 tests puros y 22 Chromium PASS; TypeScript y Vite PASS (chunk>500kb). API/iframe/guardado mock; sin BD real. Capturas responsive/errores listas. Ajustes de harness por input oculto en detalles, errores duplicados heredados y storage inyectado en iframe CSP; repetida batería completa sin errores JS. No se tocaron API/servidor/uploader/App/Auth/calificaciones/Radar.

## Protección adicional del guardado de logo — 2026-10-28T12:45:17.714Z
La revisión del editor vigente encontró normalizaciones que pueden sobrescribir campos heredados aun sin edición. Se protege EXCLUSIVAMENTE la nueva operación de logo: snapshot del borrador inicial, payload filtrado a campos realmente cambiados y logo_url, mutex inmediato y control de versión antes de enviar/después de respuesta. Cuando solo cambia logo, la prueba exige payload con única clave logo_url; portada, galería, horario, pago y modalidad permanecen en el registro mock sin sobrescritura. El flujo general sin cambio de logo y el diseño no se sustituyen; las regresiones del editor vigente se reportan en ENC-GLASS-EDITOR-001.
23 pruebas puras de mapas PASS y 23 Chromium PASS (batería completa repetida), incluyendo refresco de mismo negocio, rol vencido, carga503, borrado/logo independiente y cambio de negocio mientras se verifican permisos sin guardado obsoleto. TypeScript/Vite PASS. Solo mocks de upload/API/guardado/iframe, sin BD o proveedor Google real.
Harness browser final SHA256 11cc423fce18b79bf83b3b35779dce6b96285b73f1d7ed56271a02f377490578; política 2013b79ff52c958df8b0f84787135f37724e822762f629ddb133b815571a6a01.

## ENC-GLASS-LOGO-MAPS-002 — entrega condicional (2026-10-28T12:54:14.829Z)
Estado IMPLEMENTADO (frontend condicionado), PROBADO LOCALMENTE, NO VERIFICADO POR COORDINACIÓN, NO INTEGRADO, NO DESPLEGADO.
Rama work/enc-glass-logo-maps-002; base cad1222618c94f4eb3dabb589b6e58836191dcb7.
Commits previos de esta tarea: 0e04ac0c8baadde35217db4fe9527e3cc5fdcb32 (alcance), d2a0224cb9517f114cfaef657f9c517cef07f343 (implementación), 05400585ad4618d89f6cea097627dd78e49dc2e9 (protección de guardado).
Instrucción e6766270ac99949888ee71bd4ade625d0ab0ccdb.

### Logo independiente
- types.ts añade únicamente logo_url opcional. Contrato leído: PATCH combina req.body; dbSaveBusiness serializa objeto en raw_data; dbLoadAllBusinesses devuelve ...extra; fetchBusinesses conserva datos. Esto demuestra compatibilidad de CÓDIGO, no existencia/estado de columna activa ni persistencia real.
- Editor vigente se conserva; sección adicional dentro de fotografías: preview, subir/cambiar/quitar logo separado de image y gallery. Etiqueta antigua pasa a Fotografía de portada. No se sustituyó por el editor PR#3.
- Campo requiere GET /api/admin/session exitoso, expiración vigente y permiso business:manage comprobado por servidor, no isAdmin/flag local. Se revalida al cargar/guardar; ausencia del endpoint/sesión mantiene campo deshabilitado. Credenciales reales y proveedor seguro siguen bloqueados en tarea Auth independiente.
- JPEG/PNG/WebP hasta5MB; carga por contrato existente. El helper legado devuelve dataURI ante fallo; nuevo campo rechaza ese falso URL remoto y conserva logo previo. Preview es borrador hasta callback onSave confirmado; no afirma BD.
- Guardado nuevo de logo filtra campos no editados. Pruebas exigen payload de única clave logo_url cuando solo se cambia/quita logo; conserva portada, galería, horario, pago y modalidad heredados en mock. Exclusión de doble envío y epoch antes/después de API impiden enviar resultado obsoleto tras cambiar negocio.
- Flujo general sin editar logo mantiene el editor existente: sus siete hallazgos se documentan aparte, no se pretende haberlos corregido globalmente.
- Ficha pública usa logo_url válido, no lo deduce de portada/galería. Ausente/roto devuelve inicial y nombre. Posición aprobada intacta en desktop/tablet/celular.

### Google Maps
- Solo hosts Google Maps HTTPS admitidos; rechaza dominios ajenos, credenciales URL, puerto no estándar, HTML y URL con key.
- URL compartida /maps/embed?pb=... validada se canonicaliza y puede cargar iframe tras consentimiento. Sin iframe automático al abrir; título accesible, lazy, referrer de origen, ancho mínimo comprobado, fallback ante error/CSP y enlace externo siempre que haya ubicación válida.
- Coordenadas numéricas válidas generan enlace Google Maps exacto. Sin URL embed admitida/configuración, NO se fabrica iframe ni pin por nombre/dirección; permanece alternativa honesta. Enlaces cortos Maps no se resuelven ni se incrustan.
- Referencias primarias consultadas: https://developers.google.com/maps/documentation/embed/embedding-map y https://support.google.com/maps/answer/7101463 . No se crearon claves, cuentas de facturación ni configuración. Generación automática de Embed API desde coordenadas queda pendiente de configuración autorizada; esta entrega admite URL compartida existente.
- No se contactó Google Maps desde las pruebas; iframe explícitamente simulado. CSP real de Hostinger/Google y mapa real siguen sin verificar.

### Pruebas confirmadas
- tsc --noEmit -p logo-maps-002/tsconfig.json: PASS.
- Vite directo desde copia de la tarea: PASS; advertencia chunk>500kb. Un intento inicial usó directorio base incorrecto y fue corregido; la compilación final sí corresponde a esta tarea.
- Política pura de mapas: 23 PASS (coordenadas nulas/vacías/NaN/fuera de rango/0 válido, URLs falsas/HTML/key, embed canónico/enlace corto).
- Chromium153: última batería COMPLETA CONFIRMADA 23 PASS. Ambas entradas desktop1440/tablet834/mobile390/narrow320; logo/portada separados y posición intacta; logo ausente/roto; consentimiento/embed mock/título/lazy/enlace; coordenadas sin embed; URL inválida; carga/quitar/guardar/reabrir mock; datos heredados sin sobrescribir; refresco, falta/vencimiento de permiso, 503/dataURI, fallo de save sin cerrar, MIME inválido, cambio de negocio durante validación y CSP bloqueado. Cero errores JS ni solicitudes externas reales en esa batería.
- SHA256 batería completada: 11cc423fce18b79bf83b3b35779dce6b96285b73f1d7ed56271a02f377490578 (browser); 2013b79ff52c958df8b0f84787135f37724e822762f629ddb133b815571a6a01 (política).
- API de sesión/upload, callback de guardado y contenido iframe SIMULADOS; jamás prueba de persistencia MariaDB.
- Ajustes del harness: input file oculto en details, errores duplicados heredados, sesión de fixture entre casos y script de storage inyectado en iframe CSP. Corregidos en harness y batería completada 23/23. No se cuentan intentos incompletos como PASS.

### Evidencia, interrupción y límites
Paquete común: https://chatgpt.com/library?file_id=libfile_1d6fb1057d78819184c5920af2051d53&account_id=personal
Carpeta Logo-Maps: 12 PNG sintéticos. Imágenes de iframe rotuladas SIMULADO, no mapa real. La captura editor-logo-independiente.png quedó con Opciones adicionales plegadas y NO debe tomarse como prueba visual del campo desplegado; el campo/callback se verificó por pruebas, pero esa captura requiere renovación. El rótulo del iframe mock muestra además un problema de charset del fixture, no evidencia del proveedor.
Se inició un retoque de ambas capturas/harness y el entorno local quedó NO DISPONIBLE. Esa última ejecución fue interrumpida/no confirmada; NO sustituye ni aumenta el resultado 23 PASS previo. Los cambios funcionales ya estaban publicados y no se modificaron después. Se concluye documentación mediante GitHub; nueva captura/editor desplegado y proveedor real quedan pendientes.

### Alcance y coordinación
Modificados únicamente src/components/BusinessPublicDetail.tsx/.css, src/components/EditBusinessModal.tsx, src/types.ts, docs/WORK_RESULTADOS.md y docs/work-progress/ENC-GLASS-LOGO-MAPS-002.md.
Solo lectura: servidor, API, db/mariadb, normalización/uploader/App. Sin SQL, migraciones, DB real, auth global, comentarios/Radar ni dependencias.
Auth y Logo/Maps son ramas independientes sobre la misma base: las capturas de esta rama no incorporan el π de Auth. Coordinación debe resolver hooks/imports/CSS compartidos preservando ambos cambios; no se hizo merge ni copia del editor PR#3.
Bloqueos: sesión/credenciales seguras para habilitar edición; persistencia real y esquema activo no verificados; configuración Embed desde coordenadas; evidencia visual adicional/Safari por entorno no disponible. No requiere migración propuesta para logo bajo contrato raw_data inspeccionado; no se autorizó operar la BD.
Rollback propuesto de código: revertir commits de esta tarea en revisión futura; no hay datos escritos que revertir. No restaurar auth insegura para habilitar el campo.
Dictamen APTO PARA REVISIÓN DEL FRONTEND PREPARADO; NO APTO PARA DECLARAR LOGO PERSISTIDO REAL, EMBED REAL VERIFICADO O DESPLEGAR COMO FUNCIONALIDAD COMPLETA. Pendientes y bloqueos explícitos, sin integración.
