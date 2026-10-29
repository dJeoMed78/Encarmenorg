-- ENCARMEN laboratorio MariaDB estrictamente efimero (CI); prohibido ejecutar en bases reales.
CREATE DATABASE enc_classifieds_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE enc_classifieds_lab_nomarker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE u293982346_encarmenapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE enc_classifieds_lab;
CREATE TABLE public_classifieds (
 id VARCHAR(64) PRIMARY KEY, idempotency_key VARCHAR(64) NOT NULL UNIQUE,
 title VARCHAR(120) NOT NULL, description TEXT NOT NULL, category VARCHAR(40) NOT NULL,
 price DECIMAL(10,2) NULL, contact_phone VARCHAR(20) NOT NULL DEFAULT '',
 contact_whatsapp VARCHAR(20) NOT NULL DEFAULT '', image_url TEXT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'active', owner_token_hash CHAR(64) NOT NULL,
 expires_at DATETIME(3) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 details_json LONGTEXT NULL, INDEX feed(status,expires_at,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE enc_classifieds_isolation(marker_value VARCHAR(80) PRIMARY KEY) ENGINE=InnoDB;
INSERT INTO enc_classifieds_isolation VALUES ('ENC-CLASSIFIEDS-LAB-ISOLATED');

USE enc_classifieds_lab_nomarker;
CREATE TABLE enc_classifieds_isolation(marker_value VARCHAR(80) PRIMARY KEY) ENGINE=InnoDB;

CREATE USER 'enc_lab'@'%' IDENTIFIED BY 'enc_lab_ci';
CREATE USER 'enc_ro'@'%' IDENTIFIED BY 'enc_ro_ci';
GRANT SELECT, INSERT, UPDATE ON enc_classifieds_lab.public_classifieds TO 'enc_lab'@'%';
GRANT SELECT ON enc_classifieds_lab.enc_classifieds_isolation TO 'enc_lab'@'%';
GRANT SELECT ON enc_classifieds_lab_nomarker.enc_classifieds_isolation TO 'enc_lab'@'%';
GRANT SELECT ON enc_classifieds_lab.public_classifieds TO 'enc_ro'@'%';
GRANT SELECT ON enc_classifieds_lab.enc_classifieds_isolation TO 'enc_ro'@'%';
-- Q: DB con nombre de produccion es solo una DB vacia dentro del contenedor efimero.
