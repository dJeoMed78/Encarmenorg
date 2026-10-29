-- SOLO para una base nueva creada por el laboratorio desechable. No es migración de Staging.
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
