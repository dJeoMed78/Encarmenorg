# ENC-REVIEWS-006 — Despliegue automático observado en Hostinger (2026-10-28)

## Evidencia aportada por propietario
Captura del panel **Despliegues** de la aplicación `staging.encarmen.org`:
- Rama: `ia-desarrollo`
- Commit desplegado: `1455e568` (merge PR #2, SHA completo GitHub `1455e568a93629dcd7ae3f58df61d03c76a64f4d`)
- Estado Hostinger: `Se ha completado`
- Etiqueta: `Actual`
- Hora mostrada: `2026-10-27 21:26:37` (zona horaria de panel no confirmada).
GitHub verificó PR #2 merged=true, destino `ia-desarrollo`.

## Dictamen
**Despliegue reportado como completado por Hostinger**. No confundir con prueba de funcionalidad de calificaciones, conexión runtime a BD de Staging ni aislamiento efectivo respecto a producción.

## Próxima acción
- El propietario confirmó previamente que `RATINGS_SCHEMA_APPROVED` **no existía** en Staging.
- Índice `uq_business_ratings_biz_visitor` instalado y verificado en `u293982346_encarmentest`; ver `docs/coord/ENC-REVIEWS-006-STAGING-SCHEMA.md`.
- Código en `ia-desarrollo` exige `process.env.RATINGS_SCHEMA_APPROVED === 'true'` y conexión MariaDB activa para leer/escribir calificaciones.
- Antes de habilitar escrituras, verificar en panel Staging que `DB_NAME` apunta a `u293982346_encarmentest` (dato reportado en captura previa) y que cuenta de BD no tenga permisos de escritura sobre producción. No pedir secretos.
- Con autorización del propietario para activación exclusivamente en Staging, agregar `RATINGS_SCHEMA_APPROVED=true`, guardar/reiniciar según Hostinger y probar GET ratings; solo después realizar voto controlado y verificar en BD.
- Nunca modificar producción ni `main`.
