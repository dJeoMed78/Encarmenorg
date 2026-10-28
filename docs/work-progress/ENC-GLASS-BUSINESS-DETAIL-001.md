# ENC-GLASS-BUSINESS-DETAIL-001 — Checkpoints

## Inicio — 2026-10-28T04:08:52.521Z
- Estado EN_PROGRESO; implementación visual expresamente autorizada tras auditoría previa.
- Rama work/enc-glass-business-detail-001; base y commit inicial 1455e568a93629dcd7ae3f58df61d03c76a64f4d. Sin partir de rama del editor.
- Instrucciones actualizadas (blob): 0fed70695b99d49cd7bfb3974db7f8d78db43150. Lista cerrada respetada.
- Archivos seleccionados ANTES de editar: src/components/BusinessPublicDetail.tsx y BusinessPublicDetail.css (nuevos), BusinessDetailModal.tsx, DirectBusinessView.tsx, DigitalCardModal.tsx (solo fallbacks/URL/portapapeles), docs/WORK_RESULTADOS.md y este checkpoint. App.tsx no requiere cambios si los callbacks existentes bastan.
- Se mantienen interfaces de adaptadores; presentación compartida de tres columnas y responsive, estrellas existentes sin modificar y comentarios no habilitados.
- Subapartado administrativo bloqueado: controles claramente deshabilitados; no invocar login/fallback local, eliminación, TOP/Recomendada ni PIN inseguros. No cambiar autenticación/backend/API.
- Imagen adjunta de referencia disponible (590x583); no usar negocio, autores, reseñas, horarios o marcas del mockup como datos reales.
- Pruebas previstas: tsc/build directos sin scripts mutantes, Chromium local con datos sintéticos y API interceptada, ambas entradas, faltantes, contactos, galería/QR, errores, navegación y capturas. Sin endpoints/BD reales, SQL, merge o despliegue.


## ENC-GLASS-BUSINESS-DETAIL-001 — implementación pública Glass (2026-10-28T04:18:29.603Z)

Estado: IMPLEMENTADO / VALIDADO LOCALMENTE / PENDIENTE REVISIÓN. Sin integración ni despliegue.
Rama exclusiva: work/enc-glass-business-detail-001. Base: 1455e568a93629dcd7ae3f58df61d03c76a64f4d.
Instrucción leída en coordinación: docs/work-tasks/ENC-GLASS-BUSINESS-DETAIL-001.md, blob 0fed70695b99d49cd7bfb3974db7f8d78db43150; autorización de implementación vigente.
Checkpoints: 028a3007546e4b6488bfc79825160c9e8aa5d1d1 (inicio), 119e41054c50a8e81654078db8d1fb055a58b2b8 (implementación), 3d60b0b3fc1592a7cf0d5b13f5790a661ae10f04 (ajustes comprobados). El commit de este documento cierra la evidencia.

### Trabajo y alcance
- Nuevo BusinessPublicDetail y CSS encapsulado bpd-*: tres columnas Glass con transparencias, bordes claros, jerarquía navy, botones verde/azul, tarjetas de descripción, identidad, ubicación, horario, pagos y entrega. Dos columnas en tableta y una en móvil.
- BusinessDetailModal y DirectBusinessView son adaptadores del mismo componente; conservan firmas y callbacks públicos. App.tsx NO requirió cambios; conserva montaje, rutas e infraestructura SEO existente.
- Galería deduplicada con conteo de fotografías reales, miniaturas, flechas, lightbox, navegación por teclado, Escape, foco y restauración de scroll. Si una imagen no existe/falla, se muestra un estado honesto.
- Favoritos y QR conservan callbacks del montaje. Landing/compartir utilizan getBusinessPublicUrl en el dominio activo; clipboard await con error visible. Contactos mexicanos válidos; WhatsApp solo con campo registrado, sin suponerlo desde teléfono.
- Ubicación: dirección registrada y enlace HTTP(S) registrado o coordenadas válidas. Tarjeta gráfica de ubicación, NO mapa geográfico ni pin deducido del nombre; no se añadió proveedor de mapas. Horarios libres no se convierten en “abierto ahora”. Sin marcas de pago ni paquetería inventadas.
- Calificaciones: StarRatingWidget/useBusinessRatings/API permanecen byte a byte iguales a base; resumen compacto y widget consultan los datos reales del contrato existente. Sin promedio del catálogo ni reseñas de muestra. Comentarios declarados todavía no disponibles, sin botón que finja publicarlos.
- Gestión: acceso abre únicamente aviso informativo; editar/recomendar/TOP/eliminar están deshabilitados. Sin formulario de credenciales/PIN, llamadas administrativas ni callbacks inseguros. Autenticación, eliminación y persistencia siguen fuera de alcance.
- DigitalCardModal: elimina teléfono ficticio 938 389 5009 y ubicación predeterminada, usa URL del entorno y confirma copiado únicamente tras resolver clipboard; error visible y cancelación de compartir sin éxito ficticio. Exportación/canvas/proveedor QR existentes conservados.

### Archivos publicados (lista cerrada)
1. src/components/BusinessPublicDetail.tsx (nuevo)
2. src/components/BusinessPublicDetail.css (nuevo)
3. src/components/BusinessDetailModal.tsx
4. src/components/DirectBusinessView.tsx
5. src/components/DigitalCardModal.tsx (ajuste localizado)
6. docs/WORK_RESULTADOS.md (esta entrada añadida al historial)
7. docs/work-progress/ENC-GLASS-BUSINESS-DETAIL-001.md

Revisados para compatibilidad sin modificarlos: App.tsx, BusinessCard.tsx, types.ts, StarRatingWidget.tsx, utils/realRatings.ts, utils/businessUrl.ts, utils/phone.ts, services/api.ts, EditBusinessModal.tsx, db/mariadb.ts, server.ts, package.json, tsconfig.json, vite.config.ts e index.css. No se escribieron helpers, servidor, autenticación, widgets de calificaciones, Radar, SQL ni archivos del editor.
Verificación de hashes Git de la copia aislada: App.tsx, StarRatingWidget.tsx, realRatings.ts, api.ts y server.ts coinciden con los blobs de base.

### Validación ejecutada
Entorno aislado: /workspace/scratch/e1cd9bd12722/business-detail-001; dependencias temporales externas al repositorio, sin cambiar package.json ni lockfile. TypeScript 7.0.2, Vite 8.3.5, Chromium 153.0.8010.0, Playwright.
- /tmp/enc-reviews-tools/node_modules/.bin/tsc --noEmit -p business-detail-001/tsconfig.json: EXIT 0.
- Desde la copia aislada: /tmp/enc-reviews-tools/node_modules/.bin/vite build --outDir /tmp/enc-detail-validation/vite-dist --emptyOutDir: EXIT 0; 1722 módulos; JS 1359.79 kB (gzip 295.57), CSS 246.91 kB (gzip 30.53). Advertencia por chunk mayor de 500 kB; no bloqueante; optimización global fuera de alcance. No se ejecutó npm run build ni prebuild, que generan cambios de versión.
- Bundle de harness: esbuild con imports de ambos adaptadores y DigitalCardModal, React real y CSS de la compilación. Solo servidor HTTP estático local; NO se inició server.ts ni se cargaron conexiones de BD.
- node /tmp/enc-detail-validation/test-detail.cjs: EXIT 0, 23 comprobaciones aprobadas, cero errores JavaScript.
- Harness SHA256: 6b302e65d815e08ee1c1bcb0c0682b58212072cedf131575d0409c4105029024.
- Fixtures sintéticos: negocio 4242/IDs de reinicio, café de prueba, siete SVG locales, teléfono/WhatsApp de muestra, horario, pagos y coordenadas; no se guardaron en el proyecto ni en servidores.
- HTTP ratings GET/POST interceptado, respuestas sintéticas según contrato. Se verificó el UI con 4.5/8 votos, POST pendiente (botones bloqueados), confirmación válida 4.6/9, 400 sin éxito, 409 con reconciliación y 503 sin agregado anterior.
- Ambas entradas: 1440x1050 escritorio (3 columnas), 834x1112 tableta (2), 390x844 y 320x700 móvil (1), sin desborde horizontal y blur aplicado.
- Conteos/miniaturas, flechas, Escape/retorno de foco, favoritos, enlace de entorno/landing/QR, clipboard rechazado, ausencia de contactos/dirección/fotos/pagos/horarios, URLs javascript y teléfonos inválidos comprobados.
- Cuatro botones administrativos deshabilitados, cero callbacks administrativos, cero requests API administrativos.
- Todas las solicitudes externas interceptadas y bloqueadas. Una solicitud al proveedor QR externo YA EXISTENTE fue abortada deliberadamente. El servicio QR real y el lienzo/exportación PNG no se validaron end-to-end.
- La prueba inicial encontró desborde a 320px y retorno incorrecto de foco tras cerrar galería; se corrigieron (minmax(0,1fr), toolbar flexible y retorno explícito) y se repitió la batería completa: 23/23 PASS.

### Evidencia visual
14 PNG: modal/direct en desktop/tablet/mobile/narrow; mobile-inferior en ambas; galeria, gestion-bloqueada, datos-ausentes y calificaciones-no-disponibles.
Revisadas visualmente capturas de escritorio y móvil. Incluyen marca “PRUEBA LOCAL · DATOS SINTÉTICOS · SIN BD”.
Paquete: ENC-GLASS-BUSINESS-DETAIL-001-capturas.zip
https://chatgpt.com/library?file_id=libfile_23484adb5af08191acfebeda27fd0db4&account_id=personal
No se afirma coincidencia pixel a pixel con la imagen aprobada: se reproduce su composición y lenguaje Glass con contenido disponible, estados honestos y sin reseñas ficticias ni mapa inventado.

### Riesgos y pendientes para coordinación
- NO se validó persistencia ni concurrencia real de MariaDB; API simulada, sin SQL ni conexión. Integración de calificaciones sigue bajo coordinación.
- Autenticación/administración/eliminación continúan bloqueadas en estas fichas; necesitan tarea independiente con contrato seguro. No habilitar esos controles solo por isAdmin.
- Proveedor QR externo y exportación existentes conservan sus dependencias; requieren revisión funcional futura en un entorno autorizado.
- Las dos instancias del widget (resumen y formulario) consultan el mismo contrato y evento de actualización; no se introdujo un caché global nuevo.
- Revisar visualmente con logos/fotos y textos reales, además de Safari/iOS/VoiceOver; solo Chromium local comprobado. La tarjeta de ubicación no integra mapa interactivo.
- Código sin nuevas dependencias. Revisar diff contra base fija; ia-desarrollo seguía en 1455e568a93629dcd7ae3f58df61d03c76a64f4d al cierre de verificación. No se rebasó ni fusionó ninguna rama compartida.
- No hay bloqueo para revisión del diseño público. La funcionalidad administrativa pendiente no se implementó ni se simuló.
Dictamen: APTO PARA REVISIÓN DE COORDINACIÓN DEL DISEÑO PÚBLICO; NO autorización de integración, despliegue, administración o ejecución SQL. Esperando revisión.
