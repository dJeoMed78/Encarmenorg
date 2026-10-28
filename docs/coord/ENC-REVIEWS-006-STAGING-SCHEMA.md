# ENC-REVIEWS-006 — Evidencia manual de esquema Staging (2026-10-28)

## Confirmado por capturas de phpMyAdmin aportadas por propietario
- Base indicada: `u293982346_encarmentest`, MariaDB 11.8.9.
- Tabla `business_ratings`: InnoDB, 0 registros (consulta COUNT(*) previa).
- Campos observados: id VARCHAR(64) NOT NULL PRIMARY, business_id VARCHAR(64) NOT NULL, visitor_id VARCHAR(100) NOT NULL, rating TINYINT(4) NOT NULL; ip, comment y created_at adicionales.
- ALTER ejecutado exitosamente por propietario: `ALTER TABLE u293982346_encarmentest.business_ratings ADD UNIQUE KEY uq_business_ratings_biz_visitor (business_id, visitor_id)`.
- Captura posterior de SHOW INDEX confirma `uq_business_ratings_biz_visitor` con dos partes: business_id secuencia 1, visitor_id secuencia 2, ambas Non_unique=0 y Sub_part=NULL. Índices PRIMARY e idx_biz_visitor intactos.

## No confirmado todavía
- Aislamiento efectivo de conexiones y credenciales entre Staging y producción.
- Permisos de cuenta usada por servidor Staging, topología/replicación y restauración probada de respaldo.
- Auditoría del esquema por runtime ENC-REVIEWS-006 con conexión MariaDB real.
- Integración de work/enc-reviews-006 en ia-desarrollo, despliegue y votos reales.
- Variable RATINGS_SCHEMA_APPROVED: no habilitada.

## Dictamen
Índice único requerido: **VERIFICADO**. No repetir ALTER. **NO** habilitar, integrar o desplegar automáticamente: faltan verificaciones de seguridad y autorización independiente para cada fase. Mantener main/producción intactos.
