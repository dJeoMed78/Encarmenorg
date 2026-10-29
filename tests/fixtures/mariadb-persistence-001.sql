-- Entirely synthetic. Loaded only into the runner-owned local database.
-- The local schema identifier matches the application's fixed staging guard;
-- this file does not connect to any remote environment.
CREATE DATABASE `u293982346_encarmentest` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `u293982346_encarmentest`;
CREATE TABLE businesses (
 id VARCHAR(64) PRIMARY KEY,
 name VARCHAR(255) NOT NULL,
 category VARCHAR(100) DEFAULT '', subcategory VARCHAR(100) DEFAULT '',
 description TEXT, address VARCHAR(255) DEFAULT '', colonia VARCHAR(100) DEFAULT '',
 phone VARCHAR(50) DEFAULT '', whatsapp VARCHAR(50) DEFAULT '',
 email VARCHAR(100) DEFAULT '', website VARCHAR(255) DEFAULT '',
 facebook VARCHAR(255) DEFAULT '', instagram VARCHAR(255) DEFAULT '',
 schedule VARCHAR(255) DEFAULT '', image TEXT,
 rating DECIMAL(3,2) DEFAULT 0, reviews_count INT DEFAULT 0,
 verified TINYINT(1) DEFAULT 0, featured TINYINT(1) DEFAULT 0,
 status VARCHAR(50) DEFAULT 'published', raw_data LONGTEXT,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE encarmen_environment_marker (
 env_name VARCHAR(32) NOT NULL, db_name VARCHAR(128) NOT NULL
) ENGINE=InnoDB;
INSERT INTO encarmen_environment_marker VALUES ('staging', 'u293982346_encarmentest');
