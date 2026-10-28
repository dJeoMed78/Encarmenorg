# Checkpoint de Tarea — Inventario de Archivos y Justificación

**ID de Tarea:** `ENC-STAGING-ENV-READINESS-001`  
**Destinatario / Ejecutor:** 04 — Google AI Studio  
**Coordinación:** 01 — ChatGPT  
**Rama de Trabajo:** `work/ENC-STAGING-ENV-READINESS-001`  
**Base:** HEAD de `ia-desarrollo` (`cad1222618c94f4eb3dabb589b6e58836191dcb7`)  

---

## 1. Declaración de Cumplimiento de Restricciones
En estricto apego a las directivas de Coordinación:
- Ningún archivo de producción o código funcional fuera de arranque, configuración, conexión y aislamiento será alterado.
- No se utilizan credenciales reales en pruebas.
- No se modifican bases de datos reales.
- Las ramas `main` e `ia-desarrollo` permanecen intactas en sus respectivos SHAs.

---

## 2. Inventario Exacto de Archivos a Intervenir y Justificación

| Archivo | Acción | Categoría | Justificación Técnica Detallada |
| :--- | :--- | :--- | :--- |
| `docs/checkpoints/CHECKPOINT_ENC_STAGING_ENV_READINESS_001.md` | Crear | Checkpoint | Registro formal previo a la modificación de código con el inventario auditado exigido por Coordinación. |
| `src/db/mariadb.ts` | Modificar | Conexión / Seguridad | 1. Eliminar fallbacks implícitos a la base de datos de producción (`u293982346_encarmenapp`) y host (`srv1356.hstgr.io`) cuando se ejecute en Staging.<br>2. Implementar `verifyStagingDbIsolation()` para abortar el arranque de forma controlada si Staging apunta a la base de producción.<br>3. Prohibir DDL (`createTablesIfNotExist`) y escrituras automáticas en Staging a menos que sea una base staging explícitamente confirmada (`STAGING_DB_CONFIRMED=true`).<br>4. Implementar guardas a nivel de función para impedir mutaciones si el entorno opera en solo lectura. |
| `server.ts` | Modificar | Arranque / Seguridad | 1. Implementar comprobación de arranque seguro para Staging (`validateStagingStartupSecurity()`). Si la configuración apunta a producción sin aislamiento verificado, abortar con error diagnóstico claro.<br>2. Suprimir rutinas destructivas en el boot (`pruneExpiredEvents()`, auto-población de empresas, eventos, promociones, etc. en MariaDB compartida).<br>3. Desactivar llamadas de purga hacia dominios productivos (`encarmen.org`, `empresasencarmen.com`).<br>4. Aislar la subida de archivos multimedia para evitar sobreescribir imágenes de producción. |
| `.env.staging.example` | Crear | Configuración | Plantilla de variables de entorno para `staging.encarmen.org` sin secretos, documentando `APP_ENV=staging`, `DB_NAME=u293982346_encarmentest`, flags de solo lectura y opciones de aislamiento. |
| `docs/STAGING_ENVIRONMENT_OPERATIONS.md` | Crear | Documentación Operativa | Procedimiento exacto paso a paso para Hostinger: configuración en hPanel, variables de entorno, checklist de aislamiento y protocolo de reversión inmediata. |
| `.gitignore` | Modificar | Configuración Git | Permitir seguimiento de `.env.staging.example` como plantilla pública de Staging sin secretos. |
| `tests/test_staging_isolation.mjs` | Crear | Pruebas Automatizadas | Suite de pruebas automatizadas con dependencias simuladas verificando detección de Staging, rechazo de fallback a producción, rechazo de usuario de escritura de producción, aceptación de BD dedicada y bloqueo de mutaciones HTTP y de repositorio. |

---

## 3. Estado de Aprobación
Este inventario se restringe exclusivamente a **configuración, arranque, conexión y pruebas de aislamiento**. Se procede a la implementación sobre la rama autorizada `work/ENC-STAGING-ENV-READINESS-001`.
