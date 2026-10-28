-- ENC-REVIEWS-006 — PROPUESTA, NO EJECUTADA. Nunca importar este archivo en hosting.
-- No contiene DDL activo: las alternativas requieren revisión y autorización separada.
-- Aprobación de código != aprobación de migración, integración o despliegue.
-- Destino previsto, aún por verificar: u293982346_encarmentest.
-- Ninguna instrucción debe modificar businesses ni otra tabla ajena a ratings.
--
-- PRECONDICIONES FUTURAS (no ejecutadas durante desarrollo):
-- 1. Verificar servidor, VERSION(), DATABASE(), cuenta efectiva, grants/roles y
--    conexión real de Staging/producción mediante personal autorizado. Sin permisos
--    cruzados de escritura. No publicar secretos ni hashes de autenticación.
-- 2. SHOW CREATE TABLE y SHOW INDEX de business_ratings; engine InnoDB, columnas
--    id/business_id/visitor_id/rating NOT NULL y tipos compatibles. COUNT(*) real:
--    cero duplicados no prueba tabla vacía ni inexistencia de votos legítimos.
-- 3. Pausar TODOS los escritores; repetir duplicados GROUP BY business_id,visitor_id
--    bajo collation efectiva, nulos/vacíos, rango, comentarios >200 caracteres,
--    huérfanos y diferencias BINARY contra el ID canónico de businesses.
-- 4. visitor_id debe ser SHA-256 hexadecimal minúsculo del token original UTF-8.
--    El formato de 64 hex NO prueba procedencia. Si hay filas, verificar procedencia
--    y coherencia con tokens históricos; no hashear dos veces ni convertir a ciegas.
--    Cualquier saneamiento/deduplicación requiere otra autorización y respaldo.
-- 5. Respaldo actualizado consistente de tabla, DDL y base de pruebas. Conservar
--    exportación original y JSON históricos de ratings sin importar stats como votos.
--    SHA-256 de archivos, acceso restringido y restauración ensayada en instancia
--    sin conectividad a producción. Los 35.6 MB reportados no prueban restaurabilidad.
-- 6. Ensayar con misma versión/engine/charset, presupuesto de disco/tiempo y bloqueos;
--    verificar endpoint escritor único/topología y compatibilidad de GET_LOCK
--    (no es un bloqueo distribuido ni seguro para statement-based replication);
--    fijar límites de espera con el operador. No forzar ALGORITHM/LOCK sin ensayo.
--    DDL hace commit implícito: ROLLBACK no lo deshace. No usar IGNORE ni REPLACE.
--
-- MODELO NUEVO: solo para tabla INEXISTENTE y destino aprobado. No recrear una
-- tabla existente ni usar IF NOT EXISTS para ocultar diferencias. Los CHECK requieren
-- versión MariaDB con enforcement comprobado; runtime valida entradas y datos además.
/*
CREATE TABLE `u293982346_encarmentest`.`business_ratings` (
  `id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `business_id` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `visitor_id` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL,
  `comment` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_business_ratings_biz_visitor` (`business_id`, `visitor_id`),
  CONSTRAINT `ck_ratings_range` CHECK (`rating` BETWEEN 1 AND 5),
  CONSTRAINT `ck_ratings_visitor` CHECK (BINARY `visitor_id` REGEXP '^[0-9a-f]{64}$'),
  CONSTRAINT `ck_ratings_business` CHECK (BINARY `business_id` REGEXP '^[A-Za-z0-9_-]{1,64}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
*/
-- No IP persistida. Comentario privado, texto plano <=200 unidades UTF-16 en API;
-- no se publica por GET ni se promete moderación. Revisar retención/política antes
-- de activar. Hash pseudónimo, NO anonimización ni identidad humana.
-- No FK a businesses: evita alterar/bloquear sus operaciones de borrado. Los IDs se
-- resuelven leyendo el catálogo y se auditan; un borrado externo concurrente aún
-- puede dejar huérfanos. Resolver lifecycle con coordinación en otra tarea si procede.
-- Serialización: GET_LOCK por (DATABASE(), ID canónico), liberado tras commit en la
-- misma conexión. UNIQUE es la garantía persistente final incluso sin advisory lock.
-- GET individual usa snapshot transaccional para promedio y voto personal.
--
-- ALTERNATIVA CONSERVADORA PARA TABLA EXISTENTE (vacía o con filas verificadas):
-- Compatible con la tabla histórica id VARCHAR64, business_id VARCHAR64 NOT NULL,
-- visitor_id VARCHAR100 NOT NULL, rating TINYINT NOT NULL, comment TEXT y columnas
-- adicionales. No cambia otras columnas/filas. Todas las precondiciones aplican.
-- Conservar idx_biz_visitor no único inicialmente; retirar redundancia será otra
-- operación aprobada. Comprobar que no existe ya UNIQUE equivalente o nombre usado.
/*
ALTER TABLE `u293982346_encarmentest`.`business_ratings`
  ADD UNIQUE KEY `uq_business_ratings_biz_visitor` (`business_id`, `visitor_id`);
*/
-- Si la tabla está vacía, NO es obligatorio recrearla: este ALTER es preferible
-- si cumple tipos/NOT NULL y el runtime. Migrar al DDL nuevo exacto solo bajo plan
-- independiente aprobado; no se incluye DROP/TRUNCATE ni borrado de columnas/IP.
-- Si hay datos incompatibles: DETENER; no eliminar filas ni reconstruir la tabla.
--
-- POSTVALIDACIÓN con escritores aún pausados:
-- SHOW CREATE TABLE/SHOW INDEX: Non_unique=0, dos columnas completas en orden,
-- Sub_part=NULL; índices previos preservados. Comparar filas por PK, conteos,
-- distribución y promedios antes/después. Auditar esquema/integridad con runtime.
-- Probar duplicado normal/concurrente, diferentes visitantes/negocios, reinicio,
-- fallo de commit/reconciliación e IDs equivalentes usando datos sintéticos en
-- instancia aislada, no datos reales de Staging. No declarar integración con mocks.
-- No iniciar server.ts para estas pruebas: el arranque histórico modifica otros módulos.
--
-- ACTIVACIÓN POSTERIOR: RATINGS_SCHEMA_APPROVED=true únicamente después de verificar
-- esquema, claves, permisos, respaldo y revisión. Default ausente: GET/POST ratings
-- fallan 503. No se ha configurado esta variable en ningún servicio durante la tarea.
-- Esta bandera NO desactiva el arranque histórico de otros módulos ni aísla una BD.
--
-- REVERSIÓN CONSERVADORA, solo si UNIQUE fue agregado por esta operación y el índice
-- no único sigue intacto. Pausar escritores y respaldar votos nuevos PRIMERO.
/*
ALTER TABLE `u293982346_encarmentest`.`business_ratings`
  DROP INDEX `uq_business_ratings_biz_visitor`;
*/
-- Antes de revertir, deshabilitar feature con autorización. Sin UNIQUE el runtime
-- rechaza ratings con 503; no reabrir escrituras incompatibles. El DROP no deshace
-- votos nuevos. No restaurar backup viejo encima de votos nuevos sin conciliarlos.
-- Ante timeout/conexión perdida: inspeccionar estado, no repetir DDL ni matar sesiones
-- a ciegas. Reversión del código: commits normales en rama revisada, sin force push.
