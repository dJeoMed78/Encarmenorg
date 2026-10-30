# ENC-PROMO-IMAGE-INTEGRITY-001 — Auditoría de Coordinación
Fecha: 2026-10-29. Entrega Perplexity `work/enc-promo-image-integrity-001` SHA `98ca8ad32a7f920681066b5a22a69d8696a53fe4`.
Rama de subsanación: `coord/enc-promo-image-integrity-review-001`, creada exactamente desde el SHA de Perplexity.

## Dictamen
**ENTREGA INCOMPLETA / NO APROBADA EN SU FORMA ORIGINAL.** El diff publicado solo añadía 3 archivos (script, tests y reporte), sin modificar `src/components/AdminPromotionsTab.tsx`. Las 10 pruebas tampoco se ejecutaron y comprobaban un resultado hipotético `applyPatch(original)`, no código realmente implementado. Además el parche conservaba dos riesgos: no se mostraba `promoImagePreview` en el JSX y `promoImageData` almacenaba el base64 recién seleccionado, incluso después de fallar su carga, y era incluido en el payload del guardado. Una secuencia antigua tampoco se invalidaba al cambiar/cancelar formulario. La edición podía priorizar base64 antiguo sobre URL remota.

## Correcciones directas de Coordinación
- Se implementó en el archivo funcional `AdminPromotionsTab.tsx`, sin ejecutar scripts remotos.
- URL remota confirmada exclusivamente en `promoImage`; la vista previa temporal se mantiene en `promoImagePreview` y desaparece al terminar o fallar; los datos base64 heredados se conservan solamente mientras se edita un registro histórico.
- Subida fallida: no muta `promoImage` ni introduce nuevo base64 en `promoImageData`; conserva el cartel anterior y muestra error.
- Subida confirmada: sustituye URL remota y limpia `promoImageData` histórico para evitar que oculte/sobrescriba el nuevo cartel.
- Invalidación por contador de generación: evita publicar la respuesta vieja de una subida posterior a otra o después de editar/restablecer/eliminar el cartel; se verifica antes/después de esperas asíncronas.
- Guardar bloqueado mientras se sube; URL validada al preparar el payload; vista previa nunca pasa a payload.
- Script de parche anterior se convirtió en verificador no destructivo del código aplicado; suite actualizada para probar archivos realmente versionados (pruebas de inspección estática, no interacción real).

## Pruebas y pendientes
Se verificó a través de GitHub lectura de código, diffs y presencia de cambios publicados. **NO se ejecutaron** pruebas de Node, TypeScript, Vite, navegador, HTTP ni MariaDB; no hay entorno de checkout y dependencias disponible para estas suites. Verificaciones pendientes: `node --test tests/enc-promo-image-integrity-001.test.mjs`, `node scripts/apply-promo-image-integrity-patch.mjs --check`, TypeScript/Vite según package.json revisado y pruebas reales con navegador. Probar subida 500/503/red, carga simultánea, cambio de formulario antes de terminar y revisión de promoción heredada.

## Riesgos
- `saveAdminPromotion()` y backend persisten conforme a su contrato preexistente; **no se verificó persistencia de MariaDB real** ni éxito HTTP con readback. Se requiere revisión de backend de promociones separada, sin solapamiento con W1.
- La interfaz puede conservar base64 heredado intencionalmente; no se realizó migración de registros existentes.
- No se ha comprobado consistencia de `isUploadingPromoImg`/guardado en escenarios de eventos intercalados en React real; exigir prueba navegador.
- No se tocó producción, Staging, main, ia-desarrollo, ni bases. No integrar automáticamente. ENC-INT-006 pendiente de pruebas y validación del propietario.
