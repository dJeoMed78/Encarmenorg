# ENC-STAGING-PUBLIC-MEDIA-001 — carga pública de logotipo y hasta 10 fotografías

Rama `work/enc-staging-public-media-001`, base `ia-desarrollo` en `f1cb399a25aa254f148ba93fa97fb2b652d6b707`.

## Qué implementa

- Nueva ruta pública `POST /api/public/registration-media`, separada de `/api/upload-logo`, exclusiva de Staging y habilitada con los mismos controles privados del registro público.
- Acepta JPEG, PNG y WebP validados por firma binaria; máximo 3 MB; recodificación obligatoria a WebP con `sharp`.
- Rechaza SVG, HTML, GIF, data URI, URLs externas y archivos cuyo tipo declarado no coincida con el contenido.
- Persistencia en la tabla existente `uploaded_files` mediante un almacén autorizado propio: no usa `guardWrite()` ni modifica el permiso global de escritura.
- Antes de escribir verifica base exacta, motor InnoDB y aislamiento de Staging; usa transacción, bloqueo, `INSERT` sin upsert y lectura del BLOB antes y después del `COMMIT`.
- Nombres aleatorios `pub-<intento>-<l|g>-<32 hex>.webp`, asociados a un intento UUID; límites por IP, por intento (3 logos, 20 fotos) y por hora (300).
- Registro público con `logo_url`, `image` y `gallery` (máximo 1 logo y 10 fotos), verificadas como BLOB WebP real del mismo intento antes de crear la empresa.
- Lectura posterior de la empresa que confirma que las rutas quedaron en `image` y `raw_data.gallery`; un placeholder no cuenta como prueba.
- Cliente frontend que reduce fotos pesadas y sube cada archivo sin base64 ni data URI; el envío se bloquea mientras haya cargas pendientes.

## Archivos publicados

Nuevos:

- `src/server/publicMediaCore.ts`
- `src/server/publicMediaRoutes.ts`
- `src/server/publicMediaRecode.ts`
- `src/db/stagingMediaStore.ts`
- `src/services/publicMediaClient.ts`
- `scripts/apply-public-media-patch.mjs`
- `tests/enc-staging-public-media-001.test.mjs`
- `docs/work-progress/ENC-STAGING-PUBLIC-MEDIA-001.md`

Reemplazados:

- `src/constants/publicRegistration.ts`
- `src/server/publicRegistrationCore.ts`
- `src/server/publicRegistrationWiring.ts`

## Parche pendiente (NO ejecutado)

`scripts/apply-public-media-patch.mjs` debe aplicarse manualmente para activar el flujo en `server.ts` y `src/components/RegisterBusinessView.tsx`:

```bash
node scripts/apply-public-media-patch.mjs --check
node scripts/apply-public-media-patch.mjs
```

El parche es idempotente y falla sin modificar nada si una ancla no coincide. `server.ts` conserva la corrección posterior del Issue #12; el parche solo añade la ruta de medios a la lista permitida de Staging.

## Pruebas

`tests/enc-staging-public-media-001.test.mjs` — 24 pruebas dirigidas. Resultado registrado en el entorno de desarrollo: **23 PASS, 1 SKIP (sharp no instalado), 0 FAIL**.

## Pendientes

- Ejecutar el parche (no automático) y luego `tsc` y Vite.
- Revisar posibles conflictos con pruebas existentes que validen la lista exacta de campos públicos.
- Validación funcional en Staging por Nia 6; no se ejecutaron escrituras reales ni migraciones.
- Limpieza de imágenes huérfanas: requiere autorización de Coordinación (operación destructiva).
