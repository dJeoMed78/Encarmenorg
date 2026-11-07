# ENCARMEN — Checkpoint de continuidad Nia, 2026-11-07

**Rol:** Nia, Jefa 3, Coordinación Principal 01. **Memoria Drive:** NIA-2026-11-07.md (ID `1EC6i3pMF-YxzXnVQnRBCaVLq2wSDrJXRwKYaNZVy2vo`); anterior: NIA-2026-11-06.md (ID `1tbMojdWte6as86rh81W1CO6jMZmxnXCMIoUBuui6jrY`). **Fuente narrativa:** historial adjunto de 3491 líneas con actividades de 6-7 noviembre. Esta entrada no altera producción ni código.

## #34 — Último checkpoint funcional del propietario (7-nov)
- Rediseño Glass de dos columnas, PR #73; Staging SHA previo `9eef757ca928dd27ac964a6490b52d474d8fa2da`, aprobado visualmente por propietario.
- Bloqueo de POST inicialmente debido a guardias específicas deshabilitadas; propietario autorizó habilitar **solo** calificaciones y moderación de comentarios en Staging.
- Activación reportada en run [42400177963](https://github.com/dJeoMed78/Encarmenorg/actions/runs/42400177963), con SQL Staging/backup/config privada y preservación de guardias generales.
- E2E real reportada PASS [42401540342](https://github.com/dJeoMed78/Encarmenorg/actions/runs/42401540342): HTTP POST 200, SQL readback, duplicado 409, moderación pendiente/aprobado/rechazado, autorización administrativa y limpieza sintética.
- Release final tras retirar diagnóstico temporal: SHA `265afdafafe96c178a4117e3a67bea47618729e1`; deploy [42401982750](https://github.com/dJeoMed78/Encarmenorg/actions/runs/42401982750), verificación [42402074158](https://github.com/dJeoMed78/Encarmenorg/actions/runs/42402074158). Último informe lo declara desplegado en Staging.
- **Estado de cierre:** Issue #34 continúa abierto. Falta aceptación del propietario al publicar comentario real desde interfaz, verificar su persistencia y moderación mediante sesión administrativa humana real. No confundir E2E sintética con aceptación manual.

## Resto de actividades
- Radares #41/#43: PR #57 fusionada y deploy Staging del 6-nov documentado; falta conciliación de comportamiento real.
- #19 (12 imágenes), #42 (eventos), #044 (Facebook), #6 (contactos), footer PR #60: deben cotejarse de nuevo; estados previos son históricos.
- Proteger `main`, sitio `encarmen.org` y MariaDB productiva. Laboratorio únicamente `ia-desarrollo`/Staging con aislamiento, backup y reversión comprobados.
- Regla permanente: doble publicación Drive + GitHub, evidencia antes de declarar implementado/probado/integrado/desplegado.

**Próxima acción:** validación manual del propietario #34 en Staging, corrección dirigida si falla, auditoría de moderación admin y registro del resultado sin cerrar el Issue hasta aceptación expresa.

## Hallazgo del propietario y corrección aislada #34 — 7 noviembre

Captura del propietario muestra que pulsar 4 estrellas registra el voto y oculta el campo de comentario. **Causa confirmada en código:** `StarRatingWidget.tsx` invocaba envío de voto directamente en `onClick` de estrella; luego `hasRated=true` ocultaba estrellas y comentario. Invertir solamente el orden visual no corrige la causa.

**PR [#80](https://github.com/dJeoMed78/Encarmenorg/pull/80)** DRAFT contra `ia-desarrollo`, rama `work/enc-ratings-034-comment-before-submit-nia`, head `fa56eaf4ebb6d2ae0bf84bb34abd72d62c2b58a8`. Se coloca comentario antes de estrellas, el clic en estrella solo selecciona valor local y un botón explícito «Publicar mi opinión» envía ambos datos juntos; se conservan `hasRated`, anti-duplicado y moderación. **No probado en CI, no integrado, no desplegado.** Debe comprobarse TypeScript, pruebas frontend, flujo HTTP real, moderación y móvil antes de integración. El voto de 4 estrellas ya registrado del propietario debe preservarse.

## Integración y solicitud de despliegue #80 — 2026-11-07

PR #80 fue fusionada por squash a `ia-desarrollo`, SHA `cd8854faafb908a9e569dc2cd4ac8e4787c3004d`. Los dos workflows PR del head `fa56eaf4ebb6d2ae0bf84bb34abd72d62c2b58a8` terminaron SUCCESS: #42404267293 (ratings/moderación, TypeScript, MariaDB efímera, Chromium, build) y #42404267531 (regresión multimedia). No representan prueba manual del flujo nuevo en Staging.

Por autorización del propietario, se activó la ruta preexistente de deploy Staging mediante comentario de activación en `.github/workflows/enc-radars-041-043-staging-deploy.yml` sobre `ia-desarrollo`, commit `8f422be4e2a2bdc3e500bb9f1a57d906c48c423c`. El YAML vigente usa `push` limitado a ese archivo, además de `workflow_dispatch`; valida build, aislamiento MariaDB, respaldo SQL, identidad SSH, switch reversible y SHA vía HTTP. **ESTADO: DISPARADOR PUBLICADO; RESULTADO DE WORKFLOW PUSH Y SHA ACTIVO STAGING AÚN NO VERIFICADOS** porque conector no expone listado de runs push y solicitudes HTTP externas no están disponibles. NO DECLARAR desplegado. Producción no modificada por herramientas usadas. Siguiente paso consultar GitHub Actions run y manifiesto Staging para confirmar o diagnosticar; usuario no debe tomarlo como publicado sin esa comprobación.
