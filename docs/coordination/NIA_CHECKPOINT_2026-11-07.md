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

## Toast de reseñas y diagnóstico de publicación — 7 noviembre

Propietario confirmó visualmente que formulario de PR #80 ya está implementado y solicitó toast estilo iOS al enviar. **PR #81** https://github.com/dJeoMed78/Encarmenorg/pull/81, rama `work/enc-034-review-toast-001-nia`, commit head `dea7a42a77b749d3922116b7378a671e3f7c89c2`; CI PASS: run `42406358766` (moderación, MariaDB efímera, Chromium, TypeScript/compilación) y `42406358753` (regresión multimedia). Merge squash a `ia-desarrollo`: `d5855d4c8141aa4a9ab56e275e186a07254b43c5`. Archivo verificado en rama integrada: `src/components/StarRatingWidget.tsx`; toast Glass accesible se cierra en 4.2 s. Si el envío incluye comentario: “Reseña enviada — Quedó pendiente de revisión. Se mostrará públicamente cuando sea aprobada.” Si no incluye comentario: “Calificación registrada”. Mensaje persistente también aclara moderación. No se afirma publicación prematura.

**Diagnóstico de almacenamiento:** `POST /api/ratings` pasa comentario a `dbInsertRating`; `src/db/mariadb.ts` inserta comentario en `business_ratings.comment`. El público consulta `dbGetApprovedRatingComments`, que solo devuelve `business_rating_moderation.status='approved'`. Cola privada: `GET /api/reviews/moderation/pending`, protegida por sesión admin; incluye comentarios sin registro de moderación o status pending. Decisión: `POST /api/reviews/moderation/:id` con status approved/rejected y ventana privada Staging. La pantalla administrativa `WordPressSyncModal.tsx` revisada no contiene panel/cliente de moderación. Por tanto, **no se confirmó en vivo la fila específica del usuario**; si escribió comentario y el POST fue exitoso, el código lo guarda, pero debe verificarse en la cola pendiente. No alterar voto original ni duplicarlo.

**Despliegue Staging solicitado:** commit `4ed071a2a75faf6ec1a7d2015affbaf48a20b05b` actualizó el marcador del workflow preexistente `.github/workflows/enc-radars-041-043-staging-deploy.yml` para disparar publicación reversible de PR #80+#81 a Staging. El YAML fue leído y confirma backup MariaDB, comprobación de aislamiento, build exacto, SSH host pin, switch reversible y verificación HTTP de SHA. Sin embargo, el conector actual no expone ejecuciones disparadas por push y la URL de release JSON/TXT no es accesible desde la herramienta web; **despliegue del toast aún no verificado**, no afirmar que ya esté en Staging. `main` y producción no se modificaron.

Siguiente: obtener run push del workflow y comprobar SHA activo en Staging. Después usuario prueba toast; localizar reseña en cola admin. Considerar tarea aparte para panel visual de moderación si propietario lo autoriza.

## ENC-034 — 2026-11-07: reseñas públicas Glass, PR #83

El propietario aprobó rediseñar las reseñas públicas: compactas, dos columnas en escritorio, una en móvil, 4/5 estrellas reales por reseña y fecha, texto alineado a la izquierda, menos altura vacía después de votar. Modificados BusinessComments.tsx, StarRatingWidget.tsx, BusinessPublicDetail.css, ratingModeration.ts y pruebas unitarias/MariaDB efímera. No se alteró moderación: únicamente comentarios expresamente aprobados mediante INNER JOIN; no se divulga identificador de visitante.

**PR #83** [GitHub](https://github.com/dJeoMed78/Encarmenorg/pull/83), head `a2d7530275b7d6159921486df852a9e049832e56`, CI ratings [42410223239](https://github.com/dJeoMed78/Encarmenorg/actions/runs/42410223239) SUCCESS (TypeScript, 34 tests, MariaDB real efímera, Chromium, build), multimedia [42410223275](https://github.com/dJeoMed78/Encarmenorg/actions/runs/42410223275) SUCCESS. Squash integrado en `ia-desarrollo`: `1e81692e99ef6eb0231227290541a5bc9fad035a`.

**Despliegue Staging:** commit `9683d63560fc6a9cc63c54d7c107c39eb8420fd2` disparó workflow [42410414999](https://github.com/dJeoMed78/Encarmenorg/actions/runs/42410414999) SUCCESS. Verificó build, identidad SSH, respaldo fresco MariaDB Staging, switch reversible y `Check exact SHA over staging HTTP` SUCCESS; rollback omitido por no ser necesario. Staging publicado bajo SHA `9683d63560fc6a9cc63c54d7c107c39eb8420fd2`. La aceptación visual del propietario de este nuevo diseño aún está pendiente. `main` y producción no tocados por esta intervención. Issue #34 aún requiere aceptación funcional final para cierre.
