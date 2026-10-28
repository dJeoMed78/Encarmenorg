# ENCARMEN — Libreta operativa de coordinación

**Propósito:** conservar hechos previamente aportados por el propietario y evidencias verificadas para evitar repetir preguntas. **No registrar secretos.** Actualizar cuando cambie la configuración.

## 1. Staging — configuración reportada previamente
**Fuente:** captura de variables de entorno de Hostinger aportada por propietario y revisada en conversación del 2026-10-27. Estos son valores de configuración, **no prueba de conexión efectiva del proceso en ejecución**.

| Variable / elemento | Valor conocido |
| --- | --- |
| APP_URL | https://staging.encarmen.org |
| DB_NAME | u293982346_encarmentest |
| DB_USER | u293982346_staging_user |
| DB_HOST | 127.0.0.1 |
| DB_PORT | 3306 |
| STAGING_READ_ONLY | false |
| ENABLE_WP_SYNC | false |
| NODE_ENV | production |
| Aplicación | Node.js / Express en Hostinger, con despliegue desde ia-desarrollo |
| Base asociada a producción | u293982346_encarmenapp |

**Importante:** producción y Staging tienen nombres de BD distintos según evidencia aportada. No equivale a probar ausencia de permisos cruzados, infraestructura compartida, credenciales efectivas, o aislamiento en tiempo de ejecución. No repetir al propietario preguntas sobre los nombres/valores anteriores salvo que haya evidencia de cambio. Nunca pedir contraseñas.

## 2. Ratings — evidencias de Hostinger 2026-10-28
- Base `u293982346_encarmentest`, MariaDB `11.8.9-MariaDB-log`.
- `business_ratings` es InnoDB, `COUNT(*) = 0` al momento de la consulta.
- Columnas históricas: `id VARCHAR(64) NOT NULL PRIMARY`, `business_id VARCHAR(64) NOT NULL`, `visitor_id VARCHAR(100) NOT NULL`, `rating TINYINT NOT NULL`; además `ip`, `comment`, `created_at`.
- Propietario ejecutó `ALTER TABLE ... ADD UNIQUE KEY uq_business_ratings_biz_visitor (business_id, visitor_id)` en esa base.
- Captura posterior `SHOW INDEX`: índice `uq_business_ratings_biz_visitor` **Non_unique=0**, partes `business_id` secuencia 1 y `visitor_id` secuencia 2, `Sub_part=NULL`; `PRIMARY` y `idx_biz_visitor` conservados.
- **No volver a pedir ejecutar ese ALTER** ni consultar otra vez lo mismo sin motivo.
- Evidencia específica: `docs/coord/ENC-REVIEWS-006-STAGING-SCHEMA.md`.

## 3. Código y ramas — al cierre de la revisión
- Calificaciones: `work/enc-reviews-006`, 3 commits sobre `ia-desarrollo`, 17 archivos; compilación y mocks reportados aprobados, MariaDB real no probada. `RATINGS_SCHEMA_APPROVED=true` no habilitada.
- Radar: `coord/radar-classifieds-fix-001`, 3 commits, frontend y servicio de eventos; backend de clasificados aún puede devolver éxito sin persistencia confirmada.
- `main` y `https://encarmen.org`: producción protegida, sin autorización de modificación.
- `ia-desarrollo`: rama de integración; no integrar ni desplegar sin revisión/autorización.
- Coordinación: `coord/encarmen-work-control-001`.

## 4. Próximos controles reales, sin repetir trabajo
1. Verificar que el proceso de Staging use efectivamente la BD de pruebas, sin exponer credenciales ni arrancar procesos con efectos laterales inesperados.
2. Revisar integración de `work/enc-reviews-006` con los cambios actuales de `ia-desarrollo`; verificar seguridad y resultados.
3. Acordar autorización separada para integración y despliegue a Staging; nunca main.
4. Activar `RATINGS_SCHEMA_APPROVED` solamente tras controles efectivos y autorización; ejecutar voto real, recuperación, duplicado y reinicio.
5. Corregir persistencia del backend Radar sin colisionar con `server.ts` de Work.

## 5. Criterio de evidencia
Distinguir siempre: **configuración declarada**, **estructura SQL verificada**, **código publicado**, **pruebas simuladas**, **conexión real**, **integrado** y **desplegado**. No afirmar equivalencias. No almacenar contraseñas, tokens ni capturas con secretos.

## 6. Pendiente funcional — comentarios de la comunidad (ENC-COMMENTS, ID de implementación por asignar)
- **Estado: PENDIENTE / NO IMPLEMENTADO NI PROBADO.** El diseño visual de ficha empresarial muestra comentarios u opiniones, pero el propietario confirmó que no existe el sistema funcional correspondiente en el código. No presentar la maqueta como funcionalidad entregada.
- **Separación:** sistema de calificaciones por estrellas ≠ sistema de comentarios. El flujo básico de estrellas se validó en Staging con un voto de 4 y lectura SQL; comentarios requieren análisis, arquitectura, tarea, implementación y pruebas independientes.
- **Alcance propuesto, sujeto a aprobación:** comentarios textuales asociados a negocios reales; persistencia en MariaDB; validación, antispam, moderación administrativa, manejo de errores, permisos y presentación responsive en ficha Glass. Evaluar fotografías de comentarios, reportes y políticas de publicación antes de autorizar alcance.
- **Seguridad:** no crear tablas ni migrar datos ni modificar Staging o producción sin autorización específica; definir controles de privacidad y abuso.
- **Coordinación:** evitar colisiones con Work en editor Glass y con módulos de calificaciones/Radar. Priorizar tras estabilizar lo ya integrado, salvo autorización de paralelismo en archivos aislados.
