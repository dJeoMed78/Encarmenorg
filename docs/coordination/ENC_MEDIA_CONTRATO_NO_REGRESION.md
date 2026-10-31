# ENCARMEN — Contrato de no regresión: empresas y multimedia
Fecha: 2026-10-31
Responsable: Coordinación Principal 01 (Nia 6)
Alcance: ia-desarrollo y Staging. Ninguna autorización para producción.

## Evidencia de aceptación
- 31-oct-2026: propietario confirmó en dispositivo móvil que la empresa de prueba ID 20274 se publica y sus imágenes aparecen en el frontend.
- Verificación independiente de Staging: GET /api/businesses/20274 HTTP 200; logo y campo image asociados a rutas /uploads/pub-…webp; galería de 3 imágenes.
- Tres WebP distintos recuperados por HTTP 200; evidencia GitHub Actions #41246095985.
- Registro público multimedia integrado PR #25; corrección administrativa PR #26; selectores públicos reactivados PR #27.
- Alta, edición y borrado de empresas verificados previamente por el propietario con lecturas SQL de Staging. No extrapolar a producción ni a todos los casos.

## Invariantes obligatorias
1. Los input file de logo y galería del registro público deben permitir seleccionar archivos, no llevar `disabled` permanente y estar conectados a los handlers reales.
2. El registro público admite 1 logotipo y máximo 10 fotografías; el envío espera a las cargas pendientes y conserva las referencias al guardar.
3. El editor administrativo no usará `/api/upload-logo` heredado, bloqueado en Staging; cargará por el servicio de medios verificados.
4. Las imágenes aceptadas serán JPEG/PNG/WebP reales, reencodificadas a WebP, con ruta local `/uploads/pub-...`, intento asociado y contenido BLOB legible desde MariaDB.
5. No se confirmará éxito de una carga sin leer el BLOB persistido y comprobar su integridad.
6. Prohibidas escrituras a la base productiva y habilitación global de métodos mutantes. Conservar compuertas de Staging, aislamiento y autorización para `DELETE`.
7. Nunca sustituir código de persistencia por placeholders, archivos efímeros, data URI o fallback local de éxito.
8. Mantener independientes teléfono y WhatsApp y la protección de alta, modificación, eliminación e idempotencia.

## Control de cambios
- Ejecutar en cada PR contra `ia-desarrollo`: `npm run lint`, `node --import tsx --test tests/enc-staging-public-media-001.test.mjs tests/enc-media-regression-guard.test.mjs`, `npm run build`.
- Workflow: `.github/workflows/enc-media-regression-gate.yml`. Para que sea bloqueo obligatorio, configurar protección de rama y hacer requerido el status check `media-regressions`; la presencia del workflow por sí sola no impide merges manuales.
- Cualquier cambio en `RegisterBusinessView.tsx`, `EditBusinessModal.tsx`, `publicMediaClient.ts`, `publicMediaCore.ts`, `publicMediaRoutes.ts`, `stagingMediaStore.ts`, `publicRegistrationWiring.ts`, `server.ts` o contratos de negocio requiere revisión independiente y pruebas dirigidas.
- Antes de cerrar cambios multimedia: validar en Staging versión publicada, alta con imágenes, edición administrativa, GET del negocio y recuperación HTTP de todas las imágenes. Registrar SHA, evidencia y resultado. No usar registros reales para pruebas destructivas.
- No integrar ni desplegar si falla cualquier verificación o falta aislamiento/respaldo/reversión.

## Pendientes
- Validación visual y funcional de carga desde el editor administrativo (separada de la aceptación pública).
- Verificar configuración de branch protection para exigir CI. No declarar blindaje absoluto.
