import mysql from 'mysql2/promise';

export interface MariaDbConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

let pool: mysql.Pool | null = null;
let isConnected = false;
let lastConnectionError: string | null = null;

export function getLastDbError(): string | null {
  return lastConnectionError;
}

export function getMariaDbConfig(): MariaDbConfig | null {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MARIADB_HOST;
  const user = process.env.DB_USER || process.env.MYSQL_USER || process.env.MARIADB_USER;
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.MARIADB_PASSWORD;
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MARIADB_DATABASE;
  const port = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);

  if (host && user && database) {
    return { host, user, password: password || '', database, port };
  }
  return null;
}

export async function initMariaDb(): Promise<boolean> {
  const config = getMariaDbConfig();
  if (!config) {
    return false;
  }

  try {
    pool = mysql.createPool({
      host: config.host,
      port: config.port || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
    });

    const [rows] = await pool.query('SELECT 1 as test');
    isConnected = true;
    lastConnectionError = null;
    console.log(`[MariaDB/Hostinger] Conectado exitosamente a ${config.database} en ${config.host}`);

    // Auto-create tables if they don't exist
    await createTablesIfNotExist();

    return true;
  } catch (err: any) {
    lastConnectionError = err.message || String(err);
    console.warn(`[MariaDB/Hostinger] No se pudo conectar a la base de datos (${config.host}):`, err.message);
    pool = null;
    isConnected = false;
    return false;
  }
}

export function isMariaDbActive(): boolean {
  return isConnected && pool !== null;
}

export function getPool(): mysql.Pool | null {
  return pool;
}

async function createTablesIfNotExist() {
  if (!pool) return;

  const queries = [
    `CREATE TABLE IF NOT EXISTS \`businesses\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(100) DEFAULT '',
      \`subcategory\` VARCHAR(100) DEFAULT '',
      \`description\` TEXT,
      \`address\` VARCHAR(255) DEFAULT '',
      \`colonia\` VARCHAR(100) DEFAULT '',
      \`phone\` VARCHAR(50) DEFAULT '',
      \`whatsapp\` VARCHAR(50) DEFAULT '',
      \`email\` VARCHAR(100) DEFAULT '',
      \`website\` VARCHAR(255) DEFAULT '',
      \`facebook\` VARCHAR(255) DEFAULT '',
      \`instagram\` VARCHAR(255) DEFAULT '',
      \`schedule\` VARCHAR(255) DEFAULT '',
      \`image\` TEXT,
      \`rating\` DECIMAL(3,2) DEFAULT 5.0,
      \`reviews_count\` INT DEFAULT 0,
      \`verified\` TINYINT(1) DEFAULT 1,
      \`featured\` TINYINT(1) DEFAULT 0,
      \`status\` VARCHAR(50) DEFAULT 'published',
      \`raw_data\` LONGTEXT,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category (\`category\`),
      INDEX idx_colonia (\`colonia\`),
      INDEX idx_phone (\`phone\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`reports\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`business_id\` VARCHAR(64) NOT NULL,
      \`business_name\` VARCHAR(255) NOT NULL,
      \`reason\` VARCHAR(255) NOT NULL,
      \`details\` TEXT,
      \`reporter_email\` VARCHAR(100) DEFAULT '',
      \`status\` VARCHAR(50) DEFAULT 'pending',
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_biz_id (\`business_id\`),
      INDEX idx_status (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`events\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`description\` TEXT,
      \`date\` VARCHAR(100) DEFAULT '',
      \`location\` VARCHAR(255) DEFAULT '',
      \`image\` TEXT,
      \`category\` VARCHAR(100) DEFAULT '',
      \`status\` VARCHAR(50) DEFAULT 'published',
      \`raw_data\` LONGTEXT,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`promotions\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`business_id\` VARCHAR(64) DEFAULT '',
      \`business_name\` VARCHAR(255) DEFAULT '',
      \`discount\` VARCHAR(100) DEFAULT '',
      \`description\` TEXT,
      \`valid_until\` VARCHAR(100) DEFAULT '',
      \`code\` VARCHAR(100) DEFAULT '',
      \`raw_data\` LONGTEXT,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`claimed_coupons\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`promo_id\` VARCHAR(64) NOT NULL,
      \`code\` VARCHAR(100) NOT NULL,
      \`user_name\` VARCHAR(100) DEFAULT '',
      \`user_phone\` VARCHAR(50) DEFAULT '',
      \`status\` VARCHAR(50) DEFAULT 'active',
      \`raw_data\` LONGTEXT,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_promo_id (\`promo_id\`),
      INDEX idx_code (\`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`system_admins\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`username\` VARCHAR(100) UNIQUE NOT NULL,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`role\` VARCHAR(50) DEFAULT 'admin',
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`classifieds\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(100) DEFAULT '',
      \`subcategory\` VARCHAR(100) DEFAULT '',
      \`price\` DECIMAL(12,2) DEFAULT NULL,
      \`price_type\` VARCHAR(50) DEFAULT 'fixed',
      \`phone\` VARCHAR(50) DEFAULT '',
      \`whatsapp\` VARCHAR(50) DEFAULT '',
      \`colonia\` VARCHAR(100) DEFAULT '',
      \`status\` VARCHAR(50) DEFAULT 'active',
      \`user_token\` VARCHAR(100) DEFAULT '',
      \`raw_data\` LONGTEXT,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_class_cat (\`category\`),
      INDEX idx_class_status (\`status\`),
      INDEX idx_class_token (\`user_token\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`emergency_services\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(100) DEFAULT '',
      \`phone\` VARCHAR(50) DEFAULT '',
      \`whatsapp\` VARCHAR(50) DEFAULT '',
      \`address\` VARCHAR(255) DEFAULT '',
      \`schedule\` VARCHAR(255) DEFAULT '',
      \`badge\` VARCHAR(100) DEFAULT '',
      \`is_urgent\` TINYINT(1) DEFAULT 0,
      \`raw_data\` LONGTEXT,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
    } catch (e: any) {
      console.warn('[MariaDB/Hostinger] Error creando tabla:', e.message);
    }
  }
}

// MariaDB CRUD Operations
export async function dbLoadAllBusinesses(): Promise<any[]> {
  if (!pool) return [];
  try {
    const [rows]: any = await pool.query('SELECT * FROM businesses ORDER BY id ASC');
    return rows.map((r: any) => {
      let extra: any = {};
      if (r.raw_data) {
        try { extra = JSON.parse(r.raw_data); } catch (_) {}
      }
      return {
        ...extra,
        id: isNaN(Number(r.id)) ? r.id : Number(r.id),
        name: r.name,
        category: r.category,
        subcategory: r.subcategory,
        description: r.description,
        address: r.address,
        colonia: r.colonia,
        phone: r.phone,
        whatsapp: r.whatsapp,
        email: r.email,
        website: r.website,
        facebook: r.facebook,
        instagram: r.instagram,
        schedule: r.schedule,
        image: r.image || extra.image,
        rating: Number(r.rating || 5.0),
        reviews_count: Number(r.reviews_count || 0),
        verified: Boolean(r.verified),
        featured: Boolean(r.featured),
        status: r.status || 'published'
      };
    });
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando businesses:', err.message);
    return [];
  }
}

export async function dbSaveBusiness(biz: any): Promise<boolean> {
  if (!pool) return false;
  try {
    const id = String(biz.id);
    const rawData = JSON.stringify(biz);
    const query = `
      INSERT INTO businesses (
        id, name, category, subcategory, description, address, colonia,
        phone, whatsapp, email, website, facebook, instagram, schedule,
        image, rating, reviews_count, verified, featured, status, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        subcategory = VALUES(subcategory),
        description = VALUES(description),
        address = VALUES(address),
        colonia = VALUES(colonia),
        phone = VALUES(phone),
        whatsapp = VALUES(whatsapp),
        email = VALUES(email),
        website = VALUES(website),
        facebook = VALUES(facebook),
        instagram = VALUES(instagram),
        schedule = VALUES(schedule),
        image = VALUES(image),
        rating = VALUES(rating),
        reviews_count = VALUES(reviews_count),
        verified = VALUES(verified),
        featured = VALUES(featured),
        status = VALUES(status),
        raw_data = VALUES(raw_data);
    `;
    await pool.query(query, [
      id,
      biz.name || '',
      biz.category || '',
      biz.subcategory || '',
      biz.description || '',
      biz.address || '',
      biz.colonia || '',
      biz.phone || '',
      biz.whatsapp || '',
      biz.email || '',
      biz.website || '',
      biz.facebook || '',
      biz.instagram || '',
      biz.schedule || '',
      biz.image || '',
      biz.rating || 5.0,
      biz.reviews_count || 0,
      biz.verified ? 1 : 0,
      biz.featured ? 1 : 0,
      biz.status || 'published',
      rawData
    ]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando empresa:', err.message);
    return false;
  }
}

export async function dbDeleteBusiness(id: string | number): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM businesses WHERE id = ?', [String(id)]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error eliminando empresa:', err.message);
    return false;
  }
}

export async function dbLoadAllReports(): Promise<any[]> {
  if (!pool) return [];
  try {
    const [rows]: any = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
    return rows;
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando reports:', err.message);
    return [];
  }
}

export async function dbSaveReport(report: any): Promise<boolean> {
  if (!pool) return false;
  try {
    const query = `
      INSERT INTO reports (id, business_id, business_name, reason, details, reporter_email, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), details = VALUES(details);
    `;
    await pool.query(query, [
      report.id,
      String(report.business_id || report.businessId || ''),
      report.business_name || report.businessName || '',
      report.reason || '',
      report.details || '',
      report.reporter_email || report.reporterEmail || '',
      report.status || 'pending'
    ]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando reporte:', err.message);
    return false;
  }
}

export async function dbDeleteReport(id: string): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM reports WHERE id = ?', [id]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error eliminando reporte:', err.message);
    return false;
  }
}

// EVENTS CRUD
export async function dbLoadAllEvents(): Promise<any[]> {
  if (!pool) return [];
  try {
    const [rows]: any = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    return rows.map((r: any) => {
      let extra: any = {};
      if (r.raw_data) {
        try { extra = JSON.parse(r.raw_data); } catch (_) {}
      }
      return {
        ...extra,
        id: r.id,
        title: r.title,
        description: r.description,
        date: r.date,
        location: r.location,
        image: r.image || extra.image,
        category: r.category || extra.category,
        status: r.status || 'published'
      };
    });
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando eventos:', err.message);
    return [];
  }
}

export async function dbSaveEvent(event: any): Promise<boolean> {
  if (!pool) return false;
  try {
    const id = String(event.id);
    const rawData = JSON.stringify(event);
    const query = `
      INSERT INTO events (id, title, description, date, location, image, category, status, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        date = VALUES(date),
        location = VALUES(location),
        image = VALUES(image),
        category = VALUES(category),
        status = VALUES(status),
        raw_data = VALUES(raw_data);
    `;
    await pool.query(query, [
      id,
      event.title || '',
      event.description || '',
      event.date || '',
      event.location || '',
      event.image || '',
      event.category || '',
      event.status || 'published',
      rawData
    ]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando evento:', err.message);
    return false;
  }
}

export async function dbDeleteEvent(id: string): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM events WHERE id = ?', [String(id)]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error eliminando evento:', err.message);
    return false;
  }
}

// PROMOTIONS CRUD
export async function dbLoadAllPromotions(): Promise<any[]> {
  if (!pool) return [];
  try {
    const [rows]: any = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
    return rows.map((r: any) => {
      let extra: any = {};
      if (r.raw_data) {
        try { extra = JSON.parse(r.raw_data); } catch (_) {}
      }
      return {
        ...extra,
        id: r.id,
        title: r.title,
        businessId: isNaN(Number(r.business_id)) ? r.business_id : Number(r.business_id),
        businessName: r.business_name,
        discount: r.discount,
        description: r.description,
        validUntil: r.valid_until,
        code: r.code
      };
    });
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando promociones:', err.message);
    return [];
  }
}

export async function dbSavePromotion(promo: any): Promise<boolean> {
  if (!pool) return false;
  try {
    const id = String(promo.id);
    const rawData = JSON.stringify(promo);
    const query = `
      INSERT INTO promotions (id, title, business_id, business_name, discount, description, valid_until, code, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        business_id = VALUES(business_id),
        business_name = VALUES(business_name),
        discount = VALUES(discount),
        description = VALUES(description),
        valid_until = VALUES(valid_until),
        code = VALUES(code),
        raw_data = VALUES(raw_data);
    `;
    await pool.query(query, [
      id,
      promo.title || '',
      String(promo.businessId || promo.business_id || ''),
      promo.businessName || promo.business_name || '',
      promo.discount || '',
      promo.description || '',
      promo.validUntil || promo.valid_until || '',
      promo.code || '',
      rawData
    ]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando promocion:', err.message);
    return false;
  }
}

export async function dbDeletePromotion(id: string): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM promotions WHERE id = ?', [String(id)]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error eliminando promocion:', err.message);
    return false;
  }
}

// COUPONS CRUD
export async function dbLoadAllCoupons(): Promise<any[]> {
  if (!pool) return [];
  try {
    const [rows]: any = await pool.query('SELECT * FROM claimed_coupons ORDER BY created_at DESC');
    return rows.map((r: any) => {
      let extra: any = {};
      if (r.raw_data) {
        try { extra = JSON.parse(r.raw_data); } catch (_) {}
      }
      return {
        ...extra,
        id: r.id,
        promotionId: r.promo_id,
        code: r.code,
        customerName: r.user_name || extra.customerName,
        customerPhone: r.user_phone || extra.customerPhone,
        status: r.status || 'active'
      };
    });
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando cupones:', err.message);
    return [];
  }
}

export async function dbSaveCoupon(coupon: any): Promise<boolean> {
  if (!pool) return false;
  try {
    const id = String(coupon.id);
    const rawData = JSON.stringify(coupon);
    const query = `
      INSERT INTO claimed_coupons (id, promo_id, code, user_name, user_phone, status, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        raw_data = VALUES(raw_data);
    `;
    await pool.query(query, [
      id,
      String(coupon.promotionId || coupon.promo_id || ''),
      coupon.code || '',
      coupon.customerName || coupon.userName || '',
      coupon.customerPhone || coupon.userPhone || '',
      coupon.status || 'active',
      rawData
    ]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando cupon:', err.message);
    return false;
  }
}

export async function dbUpdateCouponStatus(idOrCode: string, status: string): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query('UPDATE claimed_coupons SET status = ? WHERE id = ? OR code = ?', [status, idOrCode, idOrCode]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error actualizando estado de cupon:', err.message);
    return false;
  }
}

export async function dbDeleteCoupon(idOrCode: string): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM claimed_coupons WHERE id = ? OR code = ?', [idOrCode, idOrCode]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error eliminando cupon:', err.message);
    return false;
  }
}

// CLASSIFIEDS (AVISOS DE OCASIÓN) CRUD
export async function dbLoadAllClassifieds(): Promise<any[]> {
  if (!pool) return [];
  try {
    const [rows]: any = await pool.query('SELECT * FROM classifieds ORDER BY created_at DESC');
    return rows.map((r: any) => {
      let extra: any = {};
      if (r.raw_data) {
        try { extra = JSON.parse(r.raw_data); } catch (_) {}
      }
      return {
        ...extra,
        id: r.id,
        title: r.title,
        category: r.category,
        subcategory: r.subcategory,
        price: r.price !== null ? Number(r.price) : null,
        priceType: r.price_type,
        phone: r.phone,
        whatsapp: r.whatsapp,
        colonia: r.colonia,
        status: r.status,
        userToken: r.user_token
      };
    });
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando classifieds:', err.message);
    return [];
  }
}

export async function dbSaveClassified(ad: any): Promise<boolean> {
  if (!pool) return false;
  try {
    const id = String(ad.id);
    const rawData = JSON.stringify(ad);
    const query = `
      INSERT INTO classifieds (
        id, title, category, subcategory, price, price_type, phone, whatsapp,
        colonia, status, user_token, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        category = VALUES(category),
        subcategory = VALUES(subcategory),
        price = VALUES(price),
        price_type = VALUES(price_type),
        phone = VALUES(phone),
        whatsapp = VALUES(whatsapp),
        colonia = VALUES(colonia),
        status = VALUES(status),
        user_token = VALUES(user_token),
        raw_data = VALUES(raw_data);
    `;
    await pool.query(query, [
      id,
      ad.title || '',
      ad.category || '',
      ad.subcategory || '',
      ad.price !== undefined && ad.price !== null ? Number(ad.price) : null,
      ad.priceType || 'fixed',
      ad.phone || '',
      ad.whatsapp || '',
      ad.colonia || '',
      ad.status || 'active',
      ad.userToken || '',
      rawData
    ]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando aviso clasificado:', err.message);
    return false;
  }
}

export async function dbDeleteClassified(id: string): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM classifieds WHERE id = ?', [String(id)]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error eliminando aviso clasificado:', err.message);
    return false;
  }
}

// EMERGENCY SERVICES CRUD
export async function dbLoadAllEmergencyServices(): Promise<any[]> {
  if (!pool) return [];
  try {
    const [rows]: any = await pool.query('SELECT * FROM emergency_services ORDER BY is_urgent DESC, created_at ASC');
    return rows.map((r: any) => {
      let extra: any = {};
      if (r.raw_data) {
        try { extra = JSON.parse(r.raw_data); } catch (_) {}
      }
      return {
        ...extra,
        id: r.id,
        name: r.name,
        category: r.category,
        phone: r.phone,
        whatsapp: r.whatsapp,
        address: r.address,
        schedule: r.schedule,
        badge: r.badge,
        isUrgent: Boolean(r.is_urgent)
      };
    });
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando emergency services:', err.message);
    return [];
  }
}

export async function dbSaveEmergencyService(item: any): Promise<boolean> {
  if (!pool) return false;
  try {
    const id = String(item.id);
    const rawData = JSON.stringify(item);
    const query = `
      INSERT INTO emergency_services (
        id, name, category, phone, whatsapp, address, schedule, badge, is_urgent, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        phone = VALUES(phone),
        whatsapp = VALUES(whatsapp),
        address = VALUES(address),
        schedule = VALUES(schedule),
        badge = VALUES(badge),
        is_urgent = VALUES(is_urgent),
        raw_data = VALUES(raw_data);
    `;
    await pool.query(query, [
      id,
      item.name || '',
      item.category || '',
      item.phone || '',
      item.whatsapp || '',
      item.address || '',
      item.schedule || '',
      item.badge || '',
      item.isUrgent ? 1 : 0,
      rawData
    ]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando emergency service:', err.message);
    return false;
  }
}

export async function dbDeleteEmergencyService(id: string): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM emergency_services WHERE id = ?', [String(id)]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error eliminando emergency service:', err.message);
    return false;
  }
}
