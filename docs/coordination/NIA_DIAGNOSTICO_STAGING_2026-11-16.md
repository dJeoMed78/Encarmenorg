# ENCARMEN — Diagnóstico Staging 2026-11-16

Fuente: GitHub Actions run 43924381277, job 133499974019, logs consultados durante reactivación Nia.

- Estado final: FAILURE; candidato ff6a0b2752f65bd34a35916a5f6263709f3be337.
- Build exact candidate: SUCCESS.
- Pinned SSH host identity: SUCCESS.
- Fresh isolated Staging SQL backup: SUCCESS.
- Salida remota: STAGING_PRIVATE_DB_IDENTITY=VERIFIED y ENC041_PREDEPLOY_BACKUP=PASS.
- Bloqueo exacto: STAGING_ACTIVE_RELEASE_NOT_STABLE; salida 5 durante verificación del enlace hbuilds/current, antes del cambio de versión.
- Paso de rollback: SUCCESS, pero salida ENC041_ROLLBACK_NOT_REQUIRED; no se hizo restauración porque el candidato no era la versión activa.
- Verificación HTTP de SHA: SKIPPED. Consultas externas a /encarmen-release.json y /api/health no accesibles desde el entorno de consulta; no atribuir HTTP 503 actual sin evidencia.
- Diagnóstico: condición de estabilidad del enlace de release no satisfecha. No está demostrado si hay un proceso concurrente, cambio de symlink o defecto en el criterio de estabilidad; requiere inspección de solo lectura de readlink/current y timestamps desde workflow controlado antes de nuevo despliegue.
- Seguridad: no se modificaron producción ni bases de datos desde esta sesión; no se publicaron empresas. No cerrar Issue #43 ni #6 ni imágenes.
- Siguiente operación: inspeccionar workflow de diagnóstico de Staging y mecanismo de estabilidad; contrastar SHA HTTP antes de cualquier intento de despliegue.
