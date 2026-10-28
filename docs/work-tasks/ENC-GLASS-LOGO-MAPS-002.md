# ENC-GLASS-LOGO-MAPS-002 — Logotipo independiente y Google Maps en ficha pública

**Estado:** TAREA PREPARADA PARA EJECUCIÓN CONDICIONAL. **Base:** ia-desarrollo, tras PR #4 (merge cad1222618c94f4eb3dabb589b6e58836191dcb7). **Rama:** work/enc-glass-logo-maps-002. **Sin integración/despliegue/SQL autorizados.**

## Evidencia y objetivo
Propietario aprobó diseño Glass general y señaló 2 defectos en negocio «REGALOS NOVEDADES Y CREACIONES ROSY»: tarjeta de identidad muestra inicial «R» en lugar de logo; ubicación muestra placeholder «Consultar ubicación registrada» en vez de mapa. Inspección de coordinación: `BusinessPublicDetail.tsx` usa `extra.logo_url` para logo pero `EditBusinessModal.tsx` ofrece campo único «Fotografía / Logotipo» ligado a `image`; `Business` en `types.ts` no declara `logo_url`. La ficha Glass muestra tarjeta de mapa ilustrativa aunque haya `mapsUrl` o coordenadas; enlace «Abrir mapa» separado.

## Objetivo funcional
1. Campo **Logotipo de la empresa** independiente de fotografía de portada y galería en formulario existente (no rediseñarlo). Vista previa, subir/cambiar/quitar y persistencia real mediante contrato existente o ampliación segura. Eliminar logo no debe eliminar portada. Sin logo: inicial y nombre como fallback honesto. No confundir logo con `image` ni `cover_url`.
2. Ficha pública: utilizar logo persistido en la tarjeta de identidad, respetando posición responsive ya aprobada. URLs seguras; imagen rota => fallback legible.
3. Ubicación: mostrar Google Maps **incrustado** únicamente si existen coordenadas válidas o una URL/identificador que pueda convertirse de forma segura a embed admitido. No incrustar URL arbitraria de tercero. Sin clave API/permiso/capacidad de embed: enlace Google Maps confiable + placeholder honesto. Dirección textual sola no basta para pin preciso; no inventar coordenadas. Probar restricciones CSP, privacidad y fallback de carga. Preservar botón «Abrir mapa» y accesibilidad.

## Fase 1 y ejecución sin esperas
Leer docs de contexto e instrucciones y el código HEAD actual de `ia-desarrollo`: `BusinessPublicDetail.tsx/.css`, `EditBusinessModal.tsx`, `types.ts`, `src/services/api.ts`, `server.ts`, `src/db/mariadb.ts`, normalizadores de negocios y uploader. Identificar dónde se guardan `image`, `logo_url`, `mapsUrl`, lat/lon y qué campos acepta el backend. Si el backend ya admite logo separado, implementar de inmediato y probar localmente. Si requiere cambio de esquema o endpoints sin autorización, implementar solo visual seguro que no mienta sobre guardado, documentar migración/contrato requerido y detener esa parte. No usar campos sin persistencia como si funcionaran.

## Archivos autorizados de escritura
- `src/components/BusinessPublicDetail.tsx`, `src/components/BusinessPublicDetail.css` (logo y mapa solamente)
- `src/components/EditBusinessModal.tsx` (añadir exclusivamente campo de logo independiente, conservando diseño aprobado y foto existente)
- `src/types.ts` (tipado opcional de logo solo si corresponde a contrato existente)
- `docs/WORK_RESULTADOS.md`, `docs/work-progress/ENC-GLASS-LOGO-MAPS-002.md`
**Solo lectura:** `server.ts`, `src/db/mariadb.ts`, `src/services/api.ts`, normalizadores, App, uploads. Si requieren escritura, detener esa subparte y solicitar alcance específico. No tocar comentarios, Radar, adminAuth, ratings, main ni producción.

## Pruebas de aceptación
- Logo: portada y logo diferentes; guardar y reabrir en prueba local con API mock explícito; quitar logo conserva portada; ausencia de logo fallback; no declarar persistencia real sin API+BD verificadas.
- Mapa: coordenadas válidas => embed seguro; sin coordenadas => fallback y enlace cuando se pueda; enlaces maliciosos y URL no Maps rechazados; navegación a Google Maps real; sin exponer clave secreta. No prometer mapa en caso de política de navegador/CSP que lo bloquee.
- Responsive: escritorio 1440, tablet 834, móvil 390 y 320; logo arriba, sin desborde; accesibilidad iframe title, carga diferida, controles teclado, política de privacidad.
- TypeScript, Vite y Chromium; comprobar que estrellas, galería, contacto y editor previo no regresen. Capturas y reporte. Pruebas de servidor/BD solo con autorización posterior.

## Condiciones de seguridad
No integrar, desplegar ni ejecutar SQL. No crear credenciales, API keys ni servicios pagos. Si no se puede persistir logo con esquema actual, informar claramente y no simular éxito. Mantener cambios limitados y trazables. Informe final en único bloque `text`.
