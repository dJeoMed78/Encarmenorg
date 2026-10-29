# ENCARMEN — Primer despliegue autorizado de la versión integrada a Staging

**Fecha:** 2026-10-29 (UTC). **Autorización:** propietario por conversación, limitada a Staging. **Responsable:** Coordinación Principal 01.

## Estado final
- **DESPLEGADO EN STAGING Y VERIFICADO**: https://staging.encarmen.org
- Rama fuente: `coord/encarmen-staging-candidate-001`
- SHA publicado y verificado por recurso HTTP: `7e7818166beecb9e3905aa8af83ec61f7d993737`
- Nueva versión física: `/home/u293982346/domains/staging.encarmen.org/hbuilds/versions/enc-coord-7e7818166bee`
- Enlace activo: `hbuilds/current -> versions/enc-coord-7e7818166bee`
- Versión anterior recuperable: `versions/01a18545-6254-7060-bb07-7b73bf4df65f`

## Evidencia
- Despliegue GitHub Actions **SUCCESS**: https://github.com/dJeoMed78/Encarmenorg/actions/runs/40963696408
- GitHub Actions TS + build Vite + esbuild **PASS**; paso de respaldo selectivo y cambio de versión **PASS**; healthcheck HTTP 200 y recurso `/encarmen-release.txt` coincidiendo exactamente con SHA **PASS**.
- Verificación independiente postdespliegue **SUCCESS**: https://github.com/dJeoMed78/Encarmenorg/actions/runs/40964038556
- Confirma `STAGING_HTTP_RELEASE_OK`, `STAGING_ACTIVE_RELEASE=7e7818166bee`, `ROLLBACK_OLD_RELEASE_PRESENT=yes` y `SELECTIVE_BACKUP_VALID=yes`.
- La consulta de producción pública desde GitHub Actions respondió **403**, por lo que ese control **no permite acreditar respuesta pública HTTP 200 en producción**, pero la ejecución no efectuó escrituras en su directorio ni sus archivos. No inferir un incidente de producción a partir del 403 de un runner externo.

## Respaldo previo y recuperación
- MariaDB Staging ya respaldada en privado: `/home/u293982346/encarmen-staging-backups/database/staging-db-20261029T215244Z.sql.gz`. Verificación anterior: https://github.com/dJeoMed78/Encarmenorg/actions/runs/40961499416
- Backup selectivo antes de reemplazar: `/home/u293982346/encarmen-staging-backups/files/2026-10-29/predeploy-enc-coord-7e7818166bee.tar.gz`, con hash y manifiesto.
- Cobertura archivos: `server.js`, `dist/`, `api/server.bundle.js`. **No se copió el sitio completo.**
- La versión anterior sigue intacta y puede restaurarse mediante cambio controlado de `hbuilds/current` a la versión previa y reinicio Passenger. La herramienta de despliegue incluye rollback automático ante fallo de healthcheck.
- Dos intentos previos fallaron por validación del archivo TAR; en ambos el link activo se mantuvo intacto y rollback indicó que no se requería cambio. El tercero tuvo éxito.

## Límites de la publicación
- No se modificó `main`, rama `ia-desarrollo` ni código de producción.
- No se ejecutó ninguna migración SQL ni operación destructiva contra MariaDB Staging o producción.
- `details_json` requiere preparación de esquema autorizada para funcionalidades de escritura; **los clasificados públicos conservan sus protecciones de Staging**.
- Corrección del botón SOS a 320 px publicada, pero todavía no se volvió a ejecutar matriz Playwright sobre el SHA final.
- `crontab` no está disponible en SSH de Hostinger: respaldo SQL real existe, pero **programación cada 72 horas pendiente** en hPanel/u otro mecanismo.
- Validación profunda de flujos funcionales reales mediante navegador después del despliegue está pendiente; HTTP 200 + SHA no la sustituyen.

## Política para siguientes cambios
Para cambios de alto impacto, respaldar selectivamente los archivos afectados antes de actualizar. Conservar hasta 7 días de historial de archivos y hasta 3 copias SQL con intervalos mínimos de 72 h y ventana de 9 días. No alterar producción. Registrar versión activa, backup y resultado de reversión.
