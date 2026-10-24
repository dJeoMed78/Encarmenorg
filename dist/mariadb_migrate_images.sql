-- ==============================================================================
-- SCRIPT DE MIGRACIÓN Y DESVINCULACIÓN DEFINITIVA DE WORDPRESS / WOOCOMMERCE
-- Base de Datos: Hostinger MariaDB (u293982346_encarmenapp)
-- Propósito: Convertir todas las URLs absolutas de empresasencarmen.com a rutas locales
--            (/wp-content/uploads/...) para que al apagar WordPress nada falle ni se rompa.
-- ==============================================================================

-- 1. Normalizar rutas legacy /media/ a /wp-content/uploads/
UPDATE `businesses`
SET `image` = REPLACE(`image`, 'https://empresasencarmen.com/media/', '/wp-content/uploads/'),
    `raw_data` = REPLACE(`raw_data`, 'https://empresasencarmen.com/media/', '/wp-content/uploads/')
WHERE `image` LIKE '%empresasencarmen.com/media/%' OR `raw_data` LIKE '%empresasencarmen.com/media/%';

-- 2. Sustituir https://empresasencarmen.com en imágenes de negocios
UPDATE `businesses`
SET `image` = REPLACE(`image`, 'https://empresasencarmen.com', '')
WHERE `image` LIKE '%https://empresasencarmen.com%';

UPDATE `businesses`
SET `image` = REPLACE(`image`, 'http://empresasencarmen.com', '')
WHERE `image` LIKE '%http://empresasencarmen.com%';

-- 3. Sustituir en descripciones de negocios (videos mp4, imágenes incrustadas)
UPDATE `businesses`
SET `description` = REPLACE(`description`, 'https://empresasencarmen.com', '')
WHERE `description` LIKE '%https://empresasencarmen.com%';

UPDATE `businesses`
SET `description` = REPLACE(`description`, 'http://empresasencarmen.com', '')
WHERE `description` LIKE '%http://empresasencarmen.com%';

-- 4. Sustituir en el campo JSON raw_data (galerías secundarias, logos, banners)
UPDATE `businesses`
SET `raw_data` = REPLACE(`raw_data`, 'https://empresasencarmen.com', '')
WHERE `raw_data` LIKE '%https://empresasencarmen.com%';

UPDATE `businesses`
SET `raw_data` = REPLACE(`raw_data`, 'http://empresasencarmen.com', '')
WHERE `raw_data` LIKE '%http://empresasencarmen.com%';

-- 5. Actualizar tabla de Promociones
UPDATE `promotions`
SET `raw_data` = REPLACE(`raw_data`, 'https://empresasencarmen.com', ''),
    `description` = REPLACE(`description`, 'https://empresasencarmen.com', '')
WHERE `raw_data` LIKE '%empresasencarmen.com%' OR `description` LIKE '%empresasencarmen.com%';

UPDATE `promotions`
SET `raw_data` = REPLACE(`raw_data`, 'http://empresasencarmen.com', ''),
    `description` = REPLACE(`description`, 'http://empresasencarmen.com', '')
WHERE `raw_data` LIKE '%http://empresasencarmen.com%' OR `description` LIKE '%http://empresasencarmen.com%';

-- 6. Actualizar tabla de Eventos
UPDATE `events`
SET `image` = REPLACE(`image`, 'https://empresasencarmen.com', ''),
    `raw_data` = REPLACE(`raw_data`, 'https://empresasencarmen.com', '')
WHERE `image` LIKE '%empresasencarmen.com%' OR `raw_data` LIKE '%empresasencarmen.com%';

-- 7. Consulta de verificación (Debe arrojar 0 registros pendientes)
SELECT 
  (SELECT COUNT(*) FROM `businesses` WHERE `image` LIKE '%empresasencarmen.com%' OR `raw_data` LIKE '%empresasencarmen.com%') AS negocios_con_wp,
  (SELECT COUNT(*) FROM `promotions` WHERE `raw_data` LIKE '%empresasencarmen.com%') AS promociones_con_wp,
  (SELECT COUNT(*) FROM `events` WHERE `image` LIKE '%empresasencarmen.com%') AS eventos_con_wp;
