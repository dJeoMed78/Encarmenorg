-- ENC-MARIADB-CI-REAL-002 — esquema del laboratorio efímero (solo CI, nunca producción).
-- Ejecutar como root del contenedor efímero.

CREATE DATABASE IF NOT EXISTS enc_classifieds_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS enc_classifieds_lab_nomarker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS u293982346_encarmenapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'enc_lab'@'%' IDENTIFIED BY 'enc_lab_ci';
CREATE USER IF NOT EXISTS 'enc_ro'@'%' IDENTIFIED BY 'enc_ro_ci';

GRANT ALL PRIVILEGES ON enc_classifieds_lab.* TO 'enc_lab'@'%';
GRANT SELECT ON u293982346_encarmenapp.* TO 'enc_lab'@'%';
GRANT SELECT ON enc_classifieds_lab_nomarker.* TO 'enc_lab'@'%';
GRANT SELECT ON enc_classifieds_lab.* TO 'enc_ro'@'%';
FLUSH PRIVILEGES;

USE enc_classifieds_lab;

CREATE TABLE IF NOT EXISTS enc_classifieds_isolation (
  marker_value VARCHAR(64) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO enc_classifieds_isolation (marker_value)
VALUES ('ENC-CLASSIFIEDS-LAB-ISOLATED');
