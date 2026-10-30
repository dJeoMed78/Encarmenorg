# ENC-PROMO-IMAGE-INTEGRITY-001 — integridad de imágenes en promociones

Rama `work/enc-promo-image-integrity-001`, base `work/enc-consolidation-fixes-002` (`e60582e971f4f8cb56ea56191d33d91824f3fc5e`). Relacionada con ENC-INT-006.

## Problema confirmado

En `src/components/AdminPromotionsTab.tsx`, `handlePromoImageUpload()` asignaba `setPromoImage(compressedDataUrl)` cuando `uploadBusinessLogo()` fallaba o devolvía `success:false`. Eso convertía una previsualización base64 local en `promoImage`, y `handleSavePromo()` podía enviarla como `promoImage` (`promoImage.trim() || promoImageData || null`), confundiendo imagen local con imagen remota confirmada.

## Solución aplicada (parche idempotente)

- Nuevo estado `promoImagePreview` para la previsualización local; `promoImage` queda reservado a URL remota confirmada.
- Si la subida falla (HTTP 500/503, red, `success:false`, respuesta sin URL, o URL data:): se conserva la imagen anterior, se muestra error claro y no se toca `promoImage`.
- Subidas consecutivas fuera de orden: `promoUploadSeq` garantiza que solo la más reciente pueda actualizar el estado.
- `handleSavePromo`: bloquea el guardado mientras hay una subida en curso; envía `promoImage` solo si es URL remota (no data:); el dataURI histórico de una promoción editada se conserva en `promoImageData` (contrato existente).
- Edición y reset limpian la previsualización local.
- No se modificaron `api.ts`, `mariadb.ts`, `server.ts`, `App.tsx`, contactos, registro, autenticación ni reportes.

## Pruebas

`tests/enc-promo-image-integrity-001.test.mjs` — 10 pruebas: defecto en la base, previsualización separada, fallo conserva imagen anterior, subida fuera de orden, guardado remoto-only, bloqueo durante subida, edición/reset, contrato de `uploadBusinessLogo`, sin éxito falso, idempotencia.

## Estado de ejecución

**NO se ejecutaron `tsc`, `vite build`, la suite ni pruebas de navegador en este entorno** (no hay Node/navegador disponibles para el agente). Comandos listos:

    node scripts/apply-promo-image-integrity-patch.mjs --check
    node scripts/apply-promo-image-integrity-patch.mjs
    npx tsx --test tests/enc-promo-image-integrity-001.test.mjs
    npx tsc --noEmit
    npx vite build

No se declaran como probados la compilación, la suite ni la validación visual. Capturas: no disponibles (sin navegador).

## Límites

- El parche debe aplicarse a `src/components/AdminPromotionsTab.tsx` antes de compilar.
- No se demostró pérdida real en MariaDB; solo se corrigió la confusión local/remota en el cliente.
- Si el backend no persiste `promoImageData`, la imagen base64 histórica seguirá dependiendo de ese contrato (pendiente de Coordinación).
