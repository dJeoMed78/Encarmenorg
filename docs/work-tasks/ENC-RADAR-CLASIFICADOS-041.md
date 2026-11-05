# ENC-RADAR-CLASIFICADOS-041 — Informe técnico de Coordinación 01

Fecha: 2026-11-05. Issue: https://github.com/dJeoMed78/Encarmenorg/issues/41
PR: https://github.com/dJeoMed78/Encarmenorg/pull/54
Rama: `work/enc-radar-clasificados-041-nia`
Base de `ia-desarrollo`: `9bd1eaba965f82805fa8ba8f74bc6d04b1f7f9e9`.

## Comprobaciones y evidencias

- Se cotejó el informe de Perplexity con los archivos completos de la rama: `server.ts`, `src/services/api.ts`, `src/components/AdminClassifiedsTab.tsx` y `src/db/mariadb.ts`. A diferencia de la auditoría parcial de Perplexity, se inspeccionaron las rutas de aprobación reales.
- Defectos confirmados: búsqueda POST bloqueada por el guard de Staging, envío `useAi:true` forzado desde cliente, errores HTTP ocultados, UI con confirmación antes de respuesta, backend que ignoraba `false` de `dbSaveClassified`, caché actualizada antes de SQL.
- Correcciones preparadas en esta rama: selección Sin IA, tratamiento de errores; confirmación administrativa y SQL con relectura antes de éxito; reporte parcial por lote; búsqueda read-only autenticada en Staging; retiro de UI optimista.
- Prueba estructural manual sobre código vivo: nueve comprobaciones de patrones/invariantes satisfactorias. NO son pruebas funcionales ni sustituyen E2E.
- Pruebas nuevas: `tests/enc-radar-classifieds-041.test.mjs`, con `node --test tests/enc-radar-classifieds-041.test.mjs`. Contienen pruebas aisladas de los helpers reales transpilados por TypeScript y guardas estáticas. **Su ejecución y resultado no deben darse por acreditados hasta observar un run real**.

## Riesgos y pendientes

1. Validar con pruebas HTTP reales el 403 de aprobaciones y el permiso de búsqueda, con sesión administrativa. **Sin carril de escritura autorizado.**
2. La deduplicación actualmente utiliza `classifiedsCache` y comparación de URL: no prueba unicidad SQL ante procesos concurrentes, URL con parámetros UTM o reinicios.
3. `dbLoadAllClassifieds` puede devolver lista vacía en error: el readback no garantiza diagnóstico de causa ni una transacción SQL atómica.
4. `classifieds_db.json` y la función periódica `pruneExpiredClassifieds` pueden divergir de MariaDB; confirmar política de persistencia antes de tocar historial.
5. El rastreo web usa páginas de terceros y un User-Agent de navegador; validar restricciones de fuentes, enlaces a anuncios individuales y exactitud de datos producidos por Gemini. No afirmar detecciones actuales sin evidencia.
6. Evaluar CORS y protecciones de carga desde un cambio de seguridad independiente; prohibido aplicar modificaciones globales sin revisión de alcance.
7. Revisar tests de regresión y build antes de marcar lista la PR. Los actuales workflows no necesariamente ejecutan la prueba nueva.
8. **No integrar a `ia-desarrollo`, no desplegar Staging ni cerrar Issue #41 hasta autorización y pruebas.** Producción `main` / `encarmen.org` inalterados.

Estado: IMPLEMENTACIÓN PARCIAL EN RAMA; PENDIENTE VALIDACIÓN FUNCIONAL Y AISLAMIENTO.
## Checkpoint de pruebas y revisión de seguridad — 2026-11-05

- El workflow nuevo `.github/workflows/enc-radar-classifieds-041-ci.yml` ejecuta `npm ci`, `npm run lint`, `node --test tests/enc-radar-classifieds-041.test.mjs` y `npm run build`. No ejecuta desplegados ni operaciones SQL.
- Run del commit `00600e0224bd1bf0ec20555ff2662d93202a31c7`: https://github.com/dJeoMed78/Encarmenorg/actions/runs/42124086531 — SUCCESS; **18/18 pruebas dirigidas PASS**, lint PASS y build PASS.
- Los tests incluyen helpers reales (ejecutados en VM aislada), respuestas HTTP de handlers Express con MariaDB simulada y comprobaciones de código del guard. **No son pruebas contra MariaDB ni HTTP de Hostinger.**
- Nuevas protecciones: solo URLs de anuncios individuales en portales conocidos, normalización de parámetros de seguimiento, y prohibición de aceptar URLs o información de precio/teléfono/descripción originados únicamente de texto Gemini sin fuente observada.
- **Bloqueo material para E2E de aprobación:** `src/db/mariadb.ts` implementa `isWritePermitted()` de forma que siempre retorna false en Staging; `dbSaveClassified` retorna false por `guardWrite`. El middleware HTTP también mantiene bloqueadas las aprobaciones de clasificados. No se debe eliminar ninguna de esas protecciones ni hacer pruebas SQL de escritura a ciegas.
- **Pendientes antes de publicar el flujo completo:** diseñar autorización de escritura de clasificados exclusivamente Staging con snapshot privado validado, identidad de DB efectiva y permisos SQL mínimos; prueba de aislamiento y respaldos completos; idempotencia/duplicados transaccionales de fuente; pruebas de escritura/readback/rollback y cierre seguro; verificar legalidad/operatividad de fuentes web reales.
- `main`, Staging y producción no se han modificado. PR #54 debe permanecer en borrador, no integrar ni desplegar todavía.
