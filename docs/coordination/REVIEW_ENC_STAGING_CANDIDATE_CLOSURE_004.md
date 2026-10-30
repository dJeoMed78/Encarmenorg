# Revisión independiente de Coordinación — ENC-STAGING-CANDIDATE-CLOSURE-004
Fecha: 2026-10-29. Ejecutor W1. Rama entregada `work/enc-staging-candidate-closure-004`, SHA `c79992a385213b437541cb92954c76a99c2485b1`; base `74e3300fa9ff022153d7e6671c65362203258032`.

## Evidencia independiente
- Comparación GitHub exacta: 2 commits publicados, 18 archivos modificados/agregados. No es una entrega únicamente documental: los archivos `server.ts`, `src/db/mariadb.ts`, `src/services/api.ts`, `WordPressSyncModal.tsx`, `AdminPromotionsTab.tsx`, `BusinessPublicDetail.tsx/.css` y bundles aparecen modificados.
- Inspección real del código: GET de reportes lee MariaDB y devuelve 503 ante fallo, no devuelve caché como SQL; mutaciones condicionadas a funciones `dbSaveReport/dbUpdateReport/dbDeleteReport` con acuse y readback; F007A incluye cambios reales DOM/CSS.
- 176 PASS, lint, builds y 27 comprobaciones backend son **resultados declarados por W1**, no ejecutados independientemente por Coordinación. MariaDB real, navegador real, aislamiento Staging y despliegue NO comprobados.
- **Dictamen: REQUIERE CORRECCIONES antes de aprobación técnica e integración.**

## Hallazgo C4-H01 — ALTO — Resultado tardío de imagen promocional puede contaminar otro formulario
Código exacto en SHA entregado: `src/components/AdminPromotionsTab.tsx`, función `handlePromoImageUpload` (aprox. líneas 105–134) y `handleEditPromo`/`handleResetForm` (aprox. 190–226).
- La función marca `isUploadingPromoImg=true`, espera `compressFlyerImage`, guarda `promoImageData`, espera `uploadBusinessLogo` y al recibir success ejecuta `setPromoImage(res.url)`. No compara identificador de solicitud, versión de formulario ni confirma que la respuesta pertenece al negocio/promoción actualmente editado.
- `handleEditPromo`, `handleResetForm` y controles de «Quitar cartel» no invalidan la solicitud asíncrona previa.
- Reproducción lógica: iniciar upload A para promoción X; antes de recibir respuesta, editar promoción Y; responder upload A exitosamente; `setPromoImage(urlA)` modifica el estado del formulario Y. Alternativamente iniciar A y B, responder B antes de A; A sobrescribe la elección más reciente.
- Una prueba de upload503 con una sola operación no cubre intercalado ni reset; la suite reportada no demuestra prevenir este error.
- Consecuencia potencial: asociar el cartel de una promoción distinta si después el usuario guarda; no se ha probado el fallo en un navegador ni en MariaDB real. No declarar pérdida de datos observada.

## Hallazgo C4-H02 — MEDIO — Falso bloqueo o pérdida de compatibilidad de promociones históricas
En `handleEditPromo` se asigna `setPromoImage(promo.promoImage || promo.promoImageData || '')` y `promoImageUnconfirmed=true` si empieza con `data:`; `handleSavePromo` bloquea siempre mientras `promoImageUnconfirmed` aunque `promoImageData` sea un cartel histórico recibido del servidor. Además el payload `promoImageData:null` elimina ese campo al guardar otra modificación. Se debe determinar contrato real de persistencia/compatibilidad y preservar historial; no suprimir base64 remoto de promociones antiguas arbitrariamente. Riesgo confirmado por lectura del código, impacto sobre datos existentes aún no probado.

## Condiciones
1. Corregir H01 con generación/epoch/ref de subida (antes y después de cada await), cancelación lógica al editar/resetear/quitar y pruebas que reproduzcan intercalado. Validar URLs remotas de forma estricta, limpiar estado temporal solo de solicitud activa.
2. Resolver H02 sobre el contrato real de datos históricos: no borrar `promoImageData` persistido al editar otros campos, distinguir dato histórico confirmado de preview no confirmada, exigir pruebas de conservación.
3. Pruebas funcionales del componente (no solo extracción de handlers), TypeScript/Vite y suite de regresión sin degradar seguridad.
4. Coordinar exclusivamente una corrección complementaria sobre SHA `c79992a` en nueva rama W1, **sin volver a implementar paquetes A/B/C/D**.
5. Antes de Staging: inspección de corrección, decisión de integración del propietario, aislamiento de infra comprobado, build frontend del SHA final, pruebas seguras y validación visual F007A. No cambiar `main`, `ia-desarrollo`, Hostinger ni bases sin autorización específica.

**Estado:** candidata publicada, NO APROBADA, NO INTEGRADA, NO DESPLEGADA. Incidencias del propietario abiertas hasta su aceptación.
