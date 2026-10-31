import {STAGING_BUSINESS_DATABASE,stagingBusinessConfiguration,privateStagingBusinessWindowOpen,getPrivateStagingSnapshot} from '../server/stagingBusinessSecurity';
import {verifyStagingIsolation, evaluateGrants} from '../server/stagingIsolationProof';
import {createStagingBusinessStore} from './stagingBusinessStore';
import mysql from 'mysql2/promise';
import { createHash, randomUUID } from 'node:crypto';

export interface MariaDbConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

let pool: mysql.Pool | null = null;
let isConnected = false;
let connectedDatabase: string | null = null;
let connectedUser: string | null = null;
let lastConnectionError: string | null = null;

export const PRODUCTION_DB_NAME = 'u293982346_encarmenapp';
export const PRODUCTION_DB_USER = 'u293982346_appuser';
export const PRODUCTION_DB_HOST = 'srv1356.hstgr.io';

export function isStagingEnvironment(): boolean {
  const env = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase().trim();
  const isStagingFlag = process.env.STAGING === 'true' || process.env.STAGING_SAFE_MODE === 'true';
  const isStagingHost = (process.env.APP_URL || process.env.PUBLIC_URL || '').toLowerCase().includes('staging.encarmen.org');
  const businessProfile = process.env.STAGING_BUSINESS_WRITES_ENABLED !== undefined;
  const configuredDatabase = (process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MARIADB_DATABASE || '').trim();
  return env === 'staging' || isStagingFlag || isStagingHost || businessProfile || configuredDatabase === STAGING_BUSINESS_DATABASE;
}

export function isWritePermitted(): boolean {
  if (process.env.STAGING_READ_ONLY === 'true') {
    return false;
  }
  // Staging never grants general writes: only the separate businesses capability may write.
  if (isStagingEnvironment()) return false;
  return true;
}

function guardWrite(operationName: string): boolean {
  if (!isWritePermitted()) {
    console.warn(`[Staging Guard] Escritura bloqueada en '${operationName}': base de datos en modo seguro/lectura o sin confirmar aislamiento de Staging.`);
    return false;
  }
  return true;
}

export interface StagingDbValidationResult {
  valid: boolean;
  isStaging: boolean;
  error?: string;
  config?: MariaDbConfig;
}

export function validateStagingDbConfiguration(): StagingDbValidationResult {
  const isStaging = isStagingEnvironment();
  if (!isStaging) {
    const config = getMariaDbConfig();
    return { valid: Boolean(config), isStaging: false, config: config || undefined };
  }

  // En Staging, no se admiten fallbacks implícitos a producción
  const rawDbName = (process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MARIADB_DATABASE || '').trim();
  const rawDbHost = (process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MARIADB_HOST || '').trim();
  const rawDbUser = (process.env.DB_USER || process.env.MYSQL_USER || process.env.MARIADB_USER || '').trim();
  const isReadOnly = process.env.STAGING_READ_ONLY === 'true';
  const isConfirmed = process.env.STAGING_DB_CONFIRMED === 'true';

  if (!rawDbName) {
    return {
      valid: false,
      isStaging: true,
      error: 'En Staging se rechaza el fallback automático a producción. Debe definir DB_NAME explícitamente (ej. u293982346_encarmentest).'
    };
  }

  if (rawDbName !== STAGING_BUSINESS_DATABASE || (rawDbUser === PRODUCTION_DB_USER && !isReadOnly)) {
    return {valid:false,isStaging:true,error:'Staging requiere su base exacta y una cuenta distinta a producción.'};
  }

  if (!isReadOnly && !isConfirmed) {
    return {
      valid: false,
      isStaging: true,
      error: `Para habilitar escrituras en Staging (STAGING_READ_ONLY=false), debe confirmar explícitamente el aislamiento mediante STAGING_DB_CONFIRMED=true en una base de datos distinta a producción.`
    };
  }

  const config = getMariaDbConfig();
  return { valid: Boolean(config), isStaging: true, config: config || undefined };
}

export function getLastDbError(): string | null {
  return lastConnectionError;
}

export function getMariaDbConfig(): MariaDbConfig | null {
  const isStaging = isStagingEnvironment();

  // En Staging nunca se permite fallback implícito a la base de datos o usuario de producción
  let host = process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MARIADB_HOST;
  let user = process.env.DB_USER || process.env.MYSQL_USER || process.env.MARIADB_USER;
  let database = process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MARIADB_DATABASE;
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.MARIADB_PASSWORD;
  const port = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);

  if (!isStaging) {
    // Entorno de producción estándar (permite defaults informados si faltan en env)
    host = host || PRODUCTION_DB_HOST;
    user = user || PRODUCTION_DB_USER;
    database = database || PRODUCTION_DB_NAME;
  }

  if (host && user && database && password) {
    return { host, user, password, database, port };
  }
  return null;
}

export async function initMariaDb(): Promise<boolean> {
  const isStaging = isStagingEnvironment();
  if (isStaging) {
    const validation = validateStagingDbConfiguration();
    if (!validation.valid) {
      lastConnectionError = validation.error || 'Configuración inválida de Staging';
      console.error(`[Staging Guard] Conexión MariaDB bloqueada: ${lastConnectionError}`);
      return false;
    }
  }

  const config = getMariaDbConfig();
  if (!config) {
    return false;
  }

  // Soporta tanto conexión remota como conexión local (127.0.0.1 / localhost) en el mismo servidor de Hostinger
  const candidateHosts = [
    config.host,
    '127.0.0.1',
    'localhost'
  ].filter((h, i, arr) => Boolean(h) && arr.indexOf(h) === i) as string[];

  for (const candidateHost of candidateHosts) {
    try {
      pool = mysql.createPool({
        host: candidateHost,
        port: config.port || 3306,
        user: config.user,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: process.env.VERCEL ? 3 : 10,
        queueLimit: 0,
        connectTimeout: 4000,
        idleTimeout: 15000,
        enableKeepAlive: true,
      });

      await pool.query('SELECT 1 as test');
      if (isStaging) {
        const [context]: any = await pool.query(
          "SELECT SUBSTRING_INDEX(CURRENT_USER(), '@', 1) AS effective_user, DATABASE() AS db_name"
        );
        const effectiveDb = context[0]?.db_name;
        // Identidad efectiva de SQL obtenida desde CURRENT_USER()
        const effectiveUser = context[0]?.effective_user ?? (context[0] && !('effective_user' in context[0]) ? config.user : null);

        if (!effectiveDb || effectiveDb !== STAGING_BUSINESS_DATABASE) {
          throw new Error('STAGING_DATABASE_TARGET_MISMATCH');
        }
        if (!effectiveUser || effectiveUser === PRODUCTION_DB_USER) {
          throw new Error('STAGING_DB_USER_IS_PRODUCTION');
        }
        if (config.user && effectiveUser !== config.user) {
          throw new Error('STAGING_DB_USER_IDENTITY_MISMATCH');
        }

        // Comprobar privilegios efectivos de la cuenta MariaDB
        try {
          const [grantsRows]: any = await pool.query('SHOW GRANTS FOR CURRENT_USER()');
          const grantLines = (grantsRows || []).map((row: any) => String(Object.values(row || {})[0] || ''));
          if (grantLines.length > 0 && grantLines.some((l: string) => l.startsWith('GRANT'))) {
            const snapshot = getPrivateStagingSnapshot({ connectionUser: effectiveUser });
            const requireMinimal = (snapshot?.STAGING_REQUIRE_MINIMAL_GRANTS || process.env.STAGING_REQUIRE_MINIMAL_GRANTS) === 'true';
            const grantCheck = evaluateGrants(grantLines, STAGING_BUSINESS_DATABASE, PRODUCTION_DB_NAME, requireMinimal);
            if (grantCheck.code) {
              throw new Error(`STAGING_DB_GRANTS_INVALID:${grantCheck.code}`);
            }
          }
        } catch (grantErr: any) {
          if (grantErr?.message?.startsWith('STAGING_DB_GRANTS_INVALID:')) throw grantErr;
        }

        connectedDatabase = effectiveDb;
        connectedUser = effectiveUser;
      } else {
        connectedDatabase = config.database || null;
        connectedUser = config.user || null;
      }
      isConnected = true;
      lastConnectionError = null;
      console.log(`[MariaDB/Hostinger] Conectado exitosamente a ${config.database} en ${candidateHost}`);

      // Staging nunca ejecuta DDL destructivo sobre producción ni en modo read-only
      const canRunDdl = isWritePermitted() && (!isStaging
        ? process.env.STAGING_READ_ONLY !== 'true'
        : (process.env.STAGING_ALLOW_SCHEMA_INIT === 'true' && config.database !== PRODUCTION_DB_NAME));

      if (canRunDdl) {
        await createTablesIfNotExist();
      } else {
        console.log('[Staging Guard] Inicialización de esquema DDL deshabilitada (modo seguro/read-only).');
      }

      return true;
    } catch (err: any) {
      lastConnectionError = err.message || String(err);
      console.warn(`[MariaDB/Hostinger] Intento de conexión con ${candidateHost} falló:`, err.message);
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      pool = null;
      connectedDatabase = null;
      connectedUser = null;
      isConnected = false;
    }
  }

  return false;
}

export function isMariaDbActive(): boolean {
  return isConnected && pool !== null;
}

export function getConnectedDbUser(): string | null {
  return connectedUser;
}

export function getConnectedDatabase(): string | null {
  return connectedDatabase;
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`portal_settings\` (
      \`config_key\` VARCHAR(64) PRIMARY KEY,
      \`config_value\` LONGTEXT,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`portal_notes\` (
      \`id\` INT PRIMARY KEY DEFAULT 1,
      \`cambios_al_portal\` LONGTEXT,
      \`fallas_del_portal\` LONGTEXT,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`uploaded_files\` (
      \`filename\` VARCHAR(255) PRIMARY KEY,
      \`mime_type\` VARCHAR(100) DEFAULT 'image/png',
      \`data\` LONGBLOB NOT NULL,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`dismissed_candidates\` (
      \`id\` VARCHAR(100) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`phone\` VARCHAR(50) DEFAULT '',
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // Ratings schema is deliberately prepared separately: never migrate it at startup.

  ];


  for (const q of queries) {
    try {
      await pool.query(q);
    } catch (e: any) {
      console.warn('[MariaDB/Hostinger] Error creando tabla:', e.message);
    }
  }
}

// Uploaded files persistence in MariaDB
export async function dbSaveUploadedFile(filename: string, mimeType: string, buffer: Buffer): Promise<boolean> {
  if (!guardWrite('dbSaveUploadedFile')) return false;
  if (!pool) return false;
  try {
    const q = `
      INSERT INTO uploaded_files (filename, mime_type, data)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), data = VALUES(data);
    `;
    await pool.query(q, [filename, mimeType, buffer]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando archivo subido:', err.message);
    return false;
  }
}

export async function dbGetUploadedFile(filename: string): Promise<{ mimeType: string; data: Buffer } | null> {
  if (!pool) return null;
  try {
    const [rows]: any = await pool.query('SELECT mime_type, data FROM uploaded_files WHERE filename = ?', [filename]);
    if (rows && rows.length > 0) {
      return {
        mimeType: rows[0].mime_type || 'image/png',
        data: Buffer.isBuffer(rows[0].data) ? rows[0].data : Buffer.from(rows[0].data)
      };
    }
    return null;
  } catch (err: any) {
    console.warn('[MariaDB] Error obteniendo archivo subido:', err.message);
    return null;
  }
}

// MariaDB CRUD Operations
export function businessFromRow(r: any): any {

      let extra: any = {};
      if (r.raw_data) {
        try { const parsed=JSON.parse(r.raw_data); if(parsed && typeof parsed==='object' && !Array.isArray(parsed)) extra=parsed; } catch (_) {}
      }
      delete extra._stagingRegistrationId;
      delete extra._stagingRegistrationDigest;
      return {
        ...extra,
        id: isNaN(Number(r.id)) ? r.id : Number(r.id),
        name: r.name || extra.name || '',
        category: extra.category || r.category || '',
        categories: Array.isArray(extra.categories) && extra.categories.length > 0
          ? extra.categories
          : (r.category ? [r.category] : ['Servicios']),
        categorySlugs: Array.isArray(extra.categorySlugs) ? extra.categorySlugs : [],
        subcategory: extra.subcategory || r.subcategory || '',
        description: extra.description || r.description || '',
        address: extra.address || r.address || '',
        colonia: extra.colonia || r.colonia || '',
        postalCode: extra.postalCode || '',
        // Dedicated columns are authoritative, including explicit empty values.
        phone: String(r.phone ?? ''),
        whatsapp: String(r.whatsapp ?? ''),
        email: extra.email || r.email || '',
        website: extra.website || r.website || '',
        facebook: extra.facebook || r.facebook || '',
        instagram: extra.instagram || r.instagram || '',
        schedule: extra.schedule || r.schedule || '',
        image: extra.image || r.image || '',
        gallery: Array.isArray(extra.gallery) ? extra.gallery : [],
        delivery: extra.delivery || '',
        hasDelivery: Boolean(extra.hasDelivery),
        payment: extra.payment || '',
        rating: Number(extra.rating || r.rating || 5.0),
        reviews_count: Number(extra.reviews_count || r.reviews_count || 0),
        verified: Boolean(extra.verified ?? r.verified ?? true),
        featured: Boolean(extra.featured ?? r.featured ?? false),
        isRecommended: Boolean(extra.isRecommended ?? false),
        isTopBusiness: Boolean(extra.isTopBusiness ?? false),
        status: extra.status || r.status || 'published'
      };

}

export async function dbLoadAllBusinesses(strict = true): Promise<any[]> {
  if (!pool) { if (strict) throw new Error("BUSINESSES_SOURCE_UNAVAILABLE"); return []; }
  try {
    const [rows]: any = await pool.query('SELECT * FROM businesses ORDER BY id ASC');
    return rows.map(businessFromRow);
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando businesses:', err.message);
    if (strict) throw new Error('BUSINESSES_SOURCE_UNAVAILABLE');
    return [];
  }
}

// Ultra-lightweight query (~30 bytes) to detect changes in 1ms without loading full table
export async function dbGetBusinessesSignature(): Promise<{ lastUpdate: string | null; total: number } | null> {
  if (!pool) return null;
  try {
    const [rows]: any = await pool.query('SELECT MAX(updated_at) AS last_update, COUNT(*) AS total FROM businesses');
    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        lastUpdate: row.last_update ? String(row.last_update) : null,
        total: Number(row.total || 0)
      };
    }
    return null;
  } catch (_) {
    return null;
  }
}

export async function dbSaveBusiness(biz: any, options: { clearContacts?: readonly ('phone' | 'whatsapp')[]; updateContacts?: boolean } = {}): Promise<boolean> {
  if (!guardWrite('dbSaveBusiness')) return false;
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
        phone = IF(?, '', IF(?, COALESCE(NULLIF(TRIM(VALUES(phone)), ''), phone), phone)),
        whatsapp = IF(?, '', IF(?, COALESCE(NULLIF(TRIM(VALUES(whatsapp)), ''), whatsapp), whatsapp)),
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
        raw_data = VALUES(raw_data),
        updated_at = NOW();
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
      rawData,
      options.clearContacts?.includes('phone') ? 1 : 0,
      options.updateContacts === true ? 1 : 0,
      options.clearContacts?.includes('whatsapp') ? 1 : 0,
      options.updateContacts === true ? 1 : 0
    ]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando empresa:', err.message);
    return false;
  }
}

// Dismissed candidate persistence in MariaDB
export async function dbSaveDismissedCandidate(id: string, name: string, phone: string = ''): Promise<boolean> {
  if (!guardWrite('dbSaveDismissedCandidate')) return false;
  if (!pool) return false;
  try {
    const q = `
      INSERT INTO dismissed_candidates (id, name, phone)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone);
    `;
    await pool.query(q, [id, name, phone]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando candidato descartado:', err.message);
    return false;
  }
}

export async function dbLoadDismissedCandidates(): Promise<Array<{ id: string; name: string; phone: string }>> {
  if (!pool) return [];
  try {
    const [rows]: any = await pool.query('SELECT id, name, phone FROM dismissed_candidates');
    return Array.isArray(rows) ? rows : [];
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando candidatos descartados:', err.message);
    return [];
  }
}

export async function dbDeleteBusiness(id: string | number): Promise<boolean> {
  if (!guardWrite('dbDeleteBusiness')) return false;
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM businesses WHERE id = ?', [String(id)]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error eliminando empresa:', err.message);
    return false;
  }
}

function reportDetailsForSql(report: any): string {
  const metadata: Record<string,unknown> = {__encReport:1};
  for(const key of ['type','classifiedId','classifiedTitle','requesterName','requesterContact','comment','details','businessPhone','businessWhatsapp','contactEmail']) {
    if(typeof report[key]==='string')metadata[key]=report[key];
  }
  return JSON.stringify(metadata);
}

export async function dbLoadAllReports(): Promise<any[]> {
  if (!pool) throw new Error('REPORTS_UNAVAILABLE');
  const [rows]: any = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
  if (!Array.isArray(rows)) throw new Error('REPORTS_INVALID_READ');
  return rows.map((row:any)=>{
    let metadata:Record<string,unknown>={};
    try {const parsed=JSON.parse(row.details || '');if(parsed?.__encReport===1){metadata.details=typeof parsed.details==='string'?parsed.details:(typeof parsed.comment==='string'?parsed.comment:'');for(const key of ['type','classifiedId','classifiedTitle','requesterName','requesterContact','comment','details','businessPhone','businessWhatsapp','contactEmail'])if(typeof parsed[key]==='string')metadata[key]=parsed[key];}} catch {}
    return {...row,businessId:row.business_id ? Number(row.business_id) : undefined,businessName:row.business_name || '',createdAt:row.created_at,...metadata};
  });
}

// Updates must never recreate a report removed by another operation.
export async function dbUpdateReport(report: any): Promise<boolean> {
  if (!guardWrite('dbUpdateReport') || !pool) return false;
  try {
    const [result]: any = await pool.query('UPDATE reports SET status = ?, details = ? WHERE id = ?', [report.status,reportDetailsForSql(report),report.id]);
    if (!(Number(result?.affectedRows || 0) > 0)) return false;
    const [rows]: any = await pool.query('SELECT * FROM reports WHERE id = ?', [report.id]);
    return Array.isArray(rows) && rows.length===1 && String(rows[0].id)===String(report.id) && rows[0].status===report.status && rows[0].details===reportDetailsForSql(report);
  } catch { return false; }
}

export async function dbSaveReport(report: any): Promise<boolean> {
  if (!guardWrite('dbSaveReport')) return false;
  if (!pool) return false;
  try {
    const query = `
      INSERT INTO reports (id, business_id, business_name, reason, details, reporter_email, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), details = VALUES(details);
    `;
    const [result]: any = await pool.query(query, [
      report.id,
      String(report.business_id || report.businessId || ''),
      report.business_name || report.businessName || '',
      report.reason || '',
      reportDetailsForSql(report),
      report.reporter_email || report.reporterEmail || '',
      report.status || 'pending'
    ]);
    if (!(Number(result?.affectedRows || 0) > 0)) return false;
    const [rows]: any = await pool.query('SELECT * FROM reports WHERE id = ?', [report.id]);
    return Array.isArray(rows) && rows.length===1 && String(rows[0].id)===String(report.id) && rows[0].status===report.status && rows[0].details===reportDetailsForSql(report);
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando reporte:', err.message);
    return false;
  }
}

export async function dbDeleteReport(id: string): Promise<boolean> {
  if (!guardWrite('dbDeleteReport')) return false;
  if (!pool) return false;
  try {
    const [result]: any = await pool.query('DELETE FROM reports WHERE id = ?', [id]);
    if (!(Number(result?.affectedRows || 0) > 0)) return false;
    const [rows]: any = await pool.query('SELECT id FROM reports WHERE id = ?', [id]);
    return Array.isArray(rows) && rows.length===0;
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
  if (!guardWrite('dbSaveEvent')) return false;
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
  if (!guardWrite('dbDeleteEvent')) return false;
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
  if (!guardWrite('dbSavePromotion')) return false;
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
  if (!guardWrite('dbDeletePromotion')) return false;
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
  if (!guardWrite('dbSaveCoupon')) return false;
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
  if (!guardWrite('dbUpdateCouponStatus')) return false;
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
  if (!guardWrite('dbDeleteCoupon')) return false;
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
  if (!guardWrite('dbSaveClassified')) return false;
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
  if (!guardWrite('dbDeleteClassified')) return false;
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
  if (!guardWrite('dbSaveEmergencyService')) return false;
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
  if (!guardWrite('dbDeleteEmergencyService')) return false;
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM emergency_services WHERE id = ?', [String(id)]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error eliminando emergency service:', err.message);
    return false;
  }
}

// ----------------------------------------------------
// Configuración Persistente del Portal y Cambios Deseados
// ----------------------------------------------------

export async function dbLoadPortalConfig(): Promise<any | null> {
  if (!pool) return null;
  try {
    const [rows]: any = await pool.query("SELECT config_value FROM portal_settings WHERE config_key = 'main_config' LIMIT 1");
    if (rows && rows.length > 0 && rows[0].config_value) {
      return JSON.parse(rows[0].config_value);
    }
    return null;
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando portal config:', err.message);
    return null;
  }
}

export async function dbSavePortalConfig(config: any): Promise<boolean> {
  if (!guardWrite('dbSavePortalConfig')) return false;
  if (!pool) return false;
  try {
    const val = JSON.stringify(config);
    const query = `
      INSERT INTO portal_settings (config_key, config_value)
      VALUES ('main_config', ?)
      ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()
    `;
    await pool.query(query, [val]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando portal config:', err.message);
    return false;
  }
}

export async function dbLoadPortalNotes(): Promise<{ cambios_al_portal: string; fallas_del_portal: string; updated_at?: string } | null> {
  if (!pool) return null;
  try {
    const [rows]: any = await pool.query('SELECT cambios_al_portal, fallas_del_portal, updated_at FROM portal_notes WHERE id = 1 LIMIT 1');
    if (rows && rows.length > 0) {
      return {
        cambios_al_portal: rows[0].cambios_al_portal || '',
        fallas_del_portal: rows[0].fallas_del_portal || '',
        updated_at: rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : undefined
      };
    }
    return null;
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando portal notes:', err.message);
    return null;
  }
}

export async function dbSavePortalNotes(notes: { cambios_al_portal: string; fallas_del_portal: string }): Promise<boolean> {
  if (!guardWrite('dbSavePortalNotes')) return false;
  if (!pool) return false;
  try {
    const query = `
      INSERT INTO portal_notes (id, cambios_al_portal, fallas_del_portal)
      VALUES (1, ?, ?)
      ON DUPLICATE KEY UPDATE
        cambios_al_portal = VALUES(cambios_al_portal),
        fallas_del_portal = VALUES(fallas_del_portal),
        updated_at = NOW()
    `;
    await pool.query(query, [notes.cambios_al_portal || '', notes.fallas_del_portal || '']);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando portal notes:', err.message);
    return false;
  }
}



// ENC-REVIEWS-006 RATINGS REPOSITORY START
export type RatingStats = { average: number; count: number; distribution: Record<number, number> };
const emptyRatingStats = (): RatingStats => ({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
const ratingsError = (code: string) => Object.assign(new Error(code), { code });

// Injection is for isolated tests; the application uses only the existing pool.
// No schema creation, catalog writes, IP persistence, or JSON fallback occurs here.
export function createRatingsRepository(db: Pick<mysql.Pool, 'getConnection'>) {
  async function verifySchema(connection: any) {
    const [tables]: any = await connection.query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_ratings'");
    if (tables.length !== 1 || tables[0].ENGINE !== 'InnoDB') throw ratingsError('RATINGS_SCHEMA_REQUIRED');
    const [columns]: any = await connection.query('SHOW FULL COLUMNS FROM business_ratings');
    for (const field of ['id', 'business_id', 'visitor_id', 'rating']) {
      const column = columns.find((c: any) => c.Field === field);
      if (!column || column.Null !== 'NO') throw ratingsError('RATINGS_SCHEMA_REQUIRED');
      const type = String(column.Type).toLowerCase();
      if (field === 'rating' ? !/^tinyint(?:\(\d+\))?(?: unsigned)?$/.test(type) :
          !/^(?:var)?char\(\d+\)$/.test(type) || Number(type.match(/\d+/)?.[0]) < 64) throw ratingsError('RATINGS_SCHEMA_REQUIRED');
    }
    const [indexes]: any = await connection.query('SHOW INDEX FROM business_ratings');
    const keys = new Map<string, any[]>();
    for (const part of indexes) if (Number(part.Non_unique) === 0) {
      const parts = keys.get(part.Key_name) || []; parts.push(part); keys.set(part.Key_name, parts);
    }
    const primary = keys.get('PRIMARY');
    if (!primary || primary.length !== 1 || primary[0].Column_name !== 'id' || primary[0].Sub_part != null) throw ratingsError('RATINGS_SCHEMA_REQUIRED');
    if (![...keys.values()].some(parts => parts.length === 2 && parts.every(p => p.Sub_part == null) &&
      parts.sort((a, b) => a.Seq_in_index - b.Seq_in_index).map(p => p.Column_name).join(',') === 'business_id,visitor_id')) {
      throw ratingsError('RATINGS_UNIQUE_INDEX_REQUIRED');
    }
    // Legacy keys/IDs are never silently converted. The approved migration must settle provenance.
    const [invalid]: any = await connection.query(`SELECT COUNT(*) AS invalid_count FROM business_ratings r
      LEFT JOIN businesses b ON r.business_id = b.id
      WHERE b.id IS NULL OR BINARY r.business_id <> BINARY b.id
        OR r.business_id = '' OR r.visitor_id IS NULL
        OR BINARY r.visitor_id NOT REGEXP '^[0-9a-f]{64}$'
        OR r.rating IS NULL OR r.rating NOT BETWEEN 1 AND 5
        OR (r.comment IS NOT NULL AND CHAR_LENGTH(r.comment) > 200)`);
    if (Number(invalid[0]?.invalid_count) !== 0) throw ratingsError('RATINGS_DATA_REVIEW_REQUIRED');
  }
  async function canonicalId(connection: any, requestedId: string) {
    const [rows]: any = await connection.query('SELECT id FROM businesses WHERE id = ? LIMIT 1', [requestedId]);
    if (rows.length !== 1) throw ratingsError('RATING_BUSINESS_NOT_FOUND');
    const id = String(rows[0].id);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw ratingsError('RATINGS_BUSINESS_ID_UNSUPPORTED');
    return id;
  }
  async function statsOn(connection: any, businessId?: string): Promise<Record<string, RatingStats>> {
    const [rows]: any = await connection.query(
      'SELECT business_id, rating, COUNT(*) AS votes FROM business_ratings' +
      (businessId === undefined ? '' : ' WHERE business_id = ?') + ' GROUP BY business_id, rating',
      businessId === undefined ? [] : [businessId]);
    const stats: Record<string, RatingStats> = Object.create(null);
    for (const row of rows) {
      const rating = Number(row.rating), votes = Number(row.votes);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !Number.isSafeInteger(votes) || votes < 1) throw ratingsError('RATINGS_INVALID_AGGREGATE');
      const item = stats[String(row.business_id)] ||= emptyRatingStats();
      item.count += votes; item.average += rating * votes; item.distribution[rating] += votes;
    }
    for (const item of Object.values(stats)) item.average = Math.round(item.average / item.count * 10) / 10;
    return stats;
  }
  return {
    async getAll() {
      const connection = await db.getConnection();
      try { await verifySchema(connection); return await statsOn(connection); }
      finally { connection.release(); }
    },
    async getBusiness(requestedId: string, visitorKey: string | null) {
      const connection = await db.getConnection();
      let transaction = false, reusable = true;
      try {
        await verifySchema(connection);
        // Single snapshot for aggregate and personal vote; never lock businesses rows.
        reusable = false; // Do not return a session with pending transaction characteristics.
        await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await connection.beginTransaction(); transaction = true; reusable = true;
        const id = await canonicalId(connection, requestedId);
        const stats = (await statsOn(connection, id))[id] || emptyRatingStats();
        const [votes]: any = visitorKey ? await connection.query(
          'SELECT rating FROM business_ratings WHERE business_id = ? AND visitor_id = ? LIMIT 1', [id, visitorKey]) : [[]];
        await connection.commit(); transaction = false;
        return { ...stats, hasRated: votes.length > 0, userRating: votes.length ? Number(votes[0].rating) : null };
      } catch (error) { if (transaction) { try { await connection.rollback(); } catch { reusable = false; } } throw error; }
      finally { if (reusable) connection.release(); else connection.destroy(); }
    },
    async insert(requestedId: string, visitorKey: string, rating: number, comment: string) {
      if (!/^[0-9a-f]{64}$/.test(visitorKey) || !Number.isInteger(rating) || rating < 1 || rating > 5 ||
          comment.length > 200 || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(comment)) throw ratingsError('RATINGS_INVALID_INPUT');
      const connection = await db.getConnection();
      let lock: string | null = null, transaction = false, reusable = true;
      try {
        await verifySchema(connection);
        const id = await canonicalId(connection, requestedId);
        const [context]: any = await connection.query('SELECT DATABASE() AS db_name');
        if (!context[0]?.db_name) throw ratingsError('RATINGS_DATABASE_UNAVAILABLE');
        const name = 'enc-ratings:' + createHash('sha256').update(String(context[0].db_name) + '\0' + id).digest('hex').slice(0, 48);
        reusable = false; // A lost acquisition reply may leave a connection-scoped lock behind.
        const [acquired]: any = await connection.query('SELECT GET_LOCK(?, 5) AS acquired', [name]);
        if (acquired[0]?.acquired === 0) { reusable = true; throw ratingsError('RATINGS_BUSY'); }
        if (Number(acquired[0]?.acquired) !== 1) throw ratingsError('RATINGS_BUSY');
        lock = name; reusable = true;
        reusable = false; // Do not return a session with pending transaction characteristics.
        await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await connection.beginTransaction(); transaction = true; reusable = true;
        // Recheck the catalog after waiting. This is a read, not a write or FOR UPDATE lock.
        if (await canonicalId(connection, requestedId) !== id) throw ratingsError('RATINGS_BUSINESS_CHANGED');
        await connection.query('INSERT INTO business_ratings (id, business_id, rating, visitor_id, comment) VALUES (?, ?, ?, ?, ?)',
          [randomUUID(), id, rating, visitorKey, comment.trim()]);
        const stats = (await statsOn(connection, id))[id];
        if (!stats) throw ratingsError('RATINGS_INVALID_AGGREGATE');
        await connection.commit(); transaction = false;
        return stats;
      } catch (error) {
        if (transaction) { try { await connection.rollback(); } catch { reusable = false; } }
        throw error;
      } finally {
        if (lock) {
          try {
            const [released]: any = await connection.query('SELECT RELEASE_LOCK(?) AS released', [lock]);
            if (Number(released[0]?.released) !== 1) reusable = false;
          } catch { reusable = false; }
        }
        if (reusable) connection.release(); else connection.destroy();
      }
    }
  };
}
function ratingsRepository() {
  if (!pool) throw ratingsError('RATINGS_DATABASE_UNAVAILABLE');
  // Fail closed until the coordinator confirms schema/key provenance and enables this feature.
  if (process.env.RATINGS_SCHEMA_APPROVED !== 'true') throw ratingsError('RATINGS_SCHEMA_APPROVAL_REQUIRED');
  return createRatingsRepository(pool);
}
export async function dbGetRatingStats() { return ratingsRepository().getAll(); }
export async function dbGetBusinessRating(id: string, visitorKey: string | null) { return ratingsRepository().getBusiness(id, visitorKey); }
export async function dbInsertRating(id: string, visitorKey: string, rating: number, comment: string) {
  if (!isWritePermitted()) throw ratingsError('RATINGS_DATABASE_READ_ONLY');
  return ratingsRepository().insert(id, visitorKey, rating, comment);
}
// ENC-REVIEWS-006 RATINGS REPOSITORY END



export function isBusinessWritePermitted(): boolean {
  if (!isStagingEnvironment()) return false;
  if (!isConnected || pool === null || connectedDatabase !== STAGING_BUSINESS_DATABASE) return false;
  const effectiveUser = connectedUser || getMariaDbConfig()?.user;
  if (!effectiveUser || effectiveUser === PRODUCTION_DB_USER) return false;

  const snapshot = getPrivateStagingSnapshot({ connectionUser: effectiveUser });
  if (snapshot) {
    return stagingBusinessConfiguration(snapshot, PRODUCTION_DB_USER) &&
      privateStagingBusinessWindowOpen(snapshot, { connectionUser: effectiveUser });
  }

  return stagingBusinessConfiguration(process.env, PRODUCTION_DB_USER) &&
    privateStagingBusinessWindowOpen(process.env, { connectionUser: effectiveUser });
}
export const stagingBusinessStore = createStagingBusinessStore({
  canWrite: isBusinessWritePermitted,
  getConnection: async () => { if (!pool) throw new Error('STAGING_DATABASE_UNAVAILABLE'); return pool.getConnection(); },
  serialize: businessFromRow,
  verifyIsolation: async (conn: any) => {
    const effectiveUser = connectedUser || getMariaDbConfig()?.user;
    const snapshot = getPrivateStagingSnapshot({ connectionUser: effectiveUser });
    return verifyStagingIsolation(conn, snapshot ? { ...process.env, ...snapshot } : process.env);
  }
});
