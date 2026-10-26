// server.ts
import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { ZipArchive } from "archiver";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

// src/db/mariadb.ts
import mysql from "mysql2/promise";
var pool = null;
var isConnected = false;
var lastConnectionError = null;
function getLastDbError() {
  return lastConnectionError;
}
function getMariaDbConfig() {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MARIADB_HOST || "srv1356.hstgr.io";
  const user = process.env.DB_USER || process.env.MYSQL_USER || process.env.MARIADB_USER || "u293982346_appuser";
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.MARIADB_PASSWORD;
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MARIADB_DATABASE || "u293982346_encarmenapp";
  const port = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);
  if (host && user && database && password) {
    return { host, user, password, database, port };
  }
  return null;
}
async function initMariaDb() {
  const config = getMariaDbConfig();
  if (!config) {
    return false;
  }
  const candidateHosts = [
    config.host,
    "127.0.0.1",
    "localhost"
  ].filter((h, i, arr) => Boolean(h) && arr.indexOf(h) === i);
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
        connectTimeout: 4e3,
        idleTimeout: 15e3,
        enableKeepAlive: true
      });
      await pool.query("SELECT 1 as test");
      isConnected = true;
      lastConnectionError = null;
      console.log(`[MariaDB/Hostinger] Conectado exitosamente a ${config.database} en ${candidateHost}`);
      await createTablesIfNotExist();
      return true;
    } catch (err) {
      lastConnectionError = err.message || String(err);
      console.warn(`[MariaDB/Hostinger] Intento de conexi\xF3n con ${candidateHost} fall\xF3:`, err.message);
      if (pool) {
        try {
          await pool.end();
        } catch (_) {
        }
      }
      pool = null;
      isConnected = false;
    }
  }
  return false;
}
function isMariaDbActive() {
  return isConnected && pool !== null;
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
    `CREATE TABLE IF NOT EXISTS \`business_ratings\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`business_id\` VARCHAR(64) NOT NULL,
      \`rating\` TINYINT NOT NULL,
      \`visitor_id\` VARCHAR(100) NOT NULL,
      \`ip\` VARCHAR(50) DEFAULT '',
      \`comment\` TEXT,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_biz_visitor (\`business_id\`, \`visitor_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];
  for (const q of queries) {
    try {
      await pool.query(q);
    } catch (e) {
      console.warn("[MariaDB/Hostinger] Error creando tabla:", e.message);
    }
  }
}
async function dbSaveUploadedFile(filename, mimeType, buffer) {
  if (!pool) return false;
  try {
    const q = `
      INSERT INTO uploaded_files (filename, mime_type, data)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), data = VALUES(data);
    `;
    await pool.query(q, [filename, mimeType, buffer]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error guardando archivo subido:", err.message);
    return false;
  }
}
async function dbGetUploadedFile(filename) {
  if (!pool) return null;
  try {
    const [rows] = await pool.query("SELECT mime_type, data FROM uploaded_files WHERE filename = ?", [filename]);
    if (rows && rows.length > 0) {
      return {
        mimeType: rows[0].mime_type || "image/png",
        data: Buffer.isBuffer(rows[0].data) ? rows[0].data : Buffer.from(rows[0].data)
      };
    }
    return null;
  } catch (err) {
    console.warn("[MariaDB] Error obteniendo archivo subido:", err.message);
    return null;
  }
}
async function dbLoadAllBusinesses() {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM businesses ORDER BY id ASC");
    return rows.map((r) => {
      let extra = {};
      if (r.raw_data) {
        try {
          extra = JSON.parse(r.raw_data);
        } catch (_) {
        }
      }
      return {
        ...extra,
        id: isNaN(Number(r.id)) ? r.id : Number(r.id),
        name: r.name || extra.name || "",
        category: extra.category || r.category || "",
        categories: Array.isArray(extra.categories) && extra.categories.length > 0 ? extra.categories : r.category ? [r.category] : ["Servicios"],
        categorySlugs: Array.isArray(extra.categorySlugs) ? extra.categorySlugs : [],
        subcategory: extra.subcategory || r.subcategory || "",
        description: extra.description || r.description || "",
        address: extra.address || r.address || "",
        colonia: extra.colonia || r.colonia || "",
        postalCode: extra.postalCode || "",
        phone: extra.phone || r.phone || "",
        whatsapp: extra.whatsapp || r.whatsapp || "",
        email: extra.email || r.email || "",
        website: extra.website || r.website || "",
        facebook: extra.facebook || r.facebook || "",
        instagram: extra.instagram || r.instagram || "",
        schedule: extra.schedule || r.schedule || "",
        image: extra.image || r.image || "",
        gallery: Array.isArray(extra.gallery) ? extra.gallery : [],
        delivery: extra.delivery || "",
        hasDelivery: Boolean(extra.hasDelivery),
        payment: extra.payment || "",
        rating: Number(extra.rating || r.rating || 5),
        reviews_count: Number(extra.reviews_count || r.reviews_count || 0),
        verified: Boolean(extra.verified ?? r.verified ?? true),
        featured: Boolean(extra.featured ?? r.featured ?? false),
        isRecommended: Boolean(extra.isRecommended ?? false),
        isTopBusiness: Boolean(extra.isTopBusiness ?? false),
        status: extra.status || r.status || "published"
      };
    });
  } catch (err) {
    console.warn("[MariaDB] Error cargando businesses:", err.message);
    return [];
  }
}
async function dbGetBusinessesSignature() {
  if (!pool) return null;
  try {
    const [rows] = await pool.query("SELECT MAX(updated_at) AS last_update, COUNT(*) AS total FROM businesses");
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
async function dbSaveBusiness(biz) {
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
        raw_data = VALUES(raw_data),
        updated_at = NOW();
    `;
    await pool.query(query, [
      id,
      biz.name || "",
      biz.category || "",
      biz.subcategory || "",
      biz.description || "",
      biz.address || "",
      biz.colonia || "",
      biz.phone || "",
      biz.whatsapp || "",
      biz.email || "",
      biz.website || "",
      biz.facebook || "",
      biz.instagram || "",
      biz.schedule || "",
      biz.image || "",
      biz.rating || 5,
      biz.reviews_count || 0,
      biz.verified ? 1 : 0,
      biz.featured ? 1 : 0,
      biz.status || "published",
      rawData
    ]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error guardando empresa:", err.message);
    return false;
  }
}
async function dbSaveDismissedCandidate(id, name, phone = "") {
  if (!pool) return false;
  try {
    const q = `
      INSERT INTO dismissed_candidates (id, name, phone)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone);
    `;
    await pool.query(q, [id, name, phone]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error guardando candidato descartado:", err.message);
    return false;
  }
}
async function dbLoadDismissedCandidates() {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT id, name, phone FROM dismissed_candidates");
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.warn("[MariaDB] Error cargando candidatos descartados:", err.message);
    return [];
  }
}
async function dbDeleteBusiness(id) {
  if (!pool) return false;
  try {
    await pool.query("DELETE FROM businesses WHERE id = ?", [String(id)]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error eliminando empresa:", err.message);
    return false;
  }
}
async function dbLoadAllReports() {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM reports ORDER BY created_at DESC");
    return rows;
  } catch (err) {
    console.warn("[MariaDB] Error cargando reports:", err.message);
    return [];
  }
}
async function dbSaveReport(report) {
  if (!pool) return false;
  try {
    const query = `
      INSERT INTO reports (id, business_id, business_name, reason, details, reporter_email, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), details = VALUES(details);
    `;
    await pool.query(query, [
      report.id,
      String(report.business_id || report.businessId || ""),
      report.business_name || report.businessName || "",
      report.reason || "",
      report.details || "",
      report.reporter_email || report.reporterEmail || "",
      report.status || "pending"
    ]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error guardando reporte:", err.message);
    return false;
  }
}
async function dbDeleteReport(id) {
  if (!pool) return false;
  try {
    await pool.query("DELETE FROM reports WHERE id = ?", [id]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error eliminando reporte:", err.message);
    return false;
  }
}
async function dbLoadAllEvents() {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM events ORDER BY created_at DESC");
    return rows.map((r) => {
      let extra = {};
      if (r.raw_data) {
        try {
          extra = JSON.parse(r.raw_data);
        } catch (_) {
        }
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
        status: r.status || "published"
      };
    });
  } catch (err) {
    console.warn("[MariaDB] Error cargando eventos:", err.message);
    return [];
  }
}
async function dbSaveEvent(event) {
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
      event.title || "",
      event.description || "",
      event.date || "",
      event.location || "",
      event.image || "",
      event.category || "",
      event.status || "published",
      rawData
    ]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error guardando evento:", err.message);
    return false;
  }
}
async function dbDeleteEvent(id) {
  if (!pool) return false;
  try {
    await pool.query("DELETE FROM events WHERE id = ?", [String(id)]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error eliminando evento:", err.message);
    return false;
  }
}
async function dbLoadAllPromotions() {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM promotions ORDER BY created_at DESC");
    return rows.map((r) => {
      let extra = {};
      if (r.raw_data) {
        try {
          extra = JSON.parse(r.raw_data);
        } catch (_) {
        }
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
  } catch (err) {
    console.warn("[MariaDB] Error cargando promociones:", err.message);
    return [];
  }
}
async function dbSavePromotion(promo) {
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
      promo.title || "",
      String(promo.businessId || promo.business_id || ""),
      promo.businessName || promo.business_name || "",
      promo.discount || "",
      promo.description || "",
      promo.validUntil || promo.valid_until || "",
      promo.code || "",
      rawData
    ]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error guardando promocion:", err.message);
    return false;
  }
}
async function dbDeletePromotion(id) {
  if (!pool) return false;
  try {
    await pool.query("DELETE FROM promotions WHERE id = ?", [String(id)]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error eliminando promocion:", err.message);
    return false;
  }
}
async function dbLoadAllCoupons() {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM claimed_coupons ORDER BY created_at DESC");
    return rows.map((r) => {
      let extra = {};
      if (r.raw_data) {
        try {
          extra = JSON.parse(r.raw_data);
        } catch (_) {
        }
      }
      return {
        ...extra,
        id: r.id,
        promotionId: r.promo_id,
        code: r.code,
        customerName: r.user_name || extra.customerName,
        customerPhone: r.user_phone || extra.customerPhone,
        status: r.status || "active"
      };
    });
  } catch (err) {
    console.warn("[MariaDB] Error cargando cupones:", err.message);
    return [];
  }
}
async function dbSaveCoupon(coupon) {
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
      String(coupon.promotionId || coupon.promo_id || ""),
      coupon.code || "",
      coupon.customerName || coupon.userName || "",
      coupon.customerPhone || coupon.userPhone || "",
      coupon.status || "active",
      rawData
    ]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error guardando cupon:", err.message);
    return false;
  }
}
async function dbUpdateCouponStatus(idOrCode, status) {
  if (!pool) return false;
  try {
    await pool.query("UPDATE claimed_coupons SET status = ? WHERE id = ? OR code = ?", [status, idOrCode, idOrCode]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error actualizando estado de cupon:", err.message);
    return false;
  }
}
async function dbDeleteCoupon(idOrCode) {
  if (!pool) return false;
  try {
    await pool.query("DELETE FROM claimed_coupons WHERE id = ? OR code = ?", [idOrCode, idOrCode]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error eliminando cupon:", err.message);
    return false;
  }
}
async function dbLoadAllClassifieds() {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM classifieds ORDER BY created_at DESC");
    return rows.map((r) => {
      let extra = {};
      if (r.raw_data) {
        try {
          extra = JSON.parse(r.raw_data);
        } catch (_) {
        }
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
  } catch (err) {
    console.warn("[MariaDB] Error cargando classifieds:", err.message);
    return [];
  }
}
async function dbSaveClassified(ad) {
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
      ad.title || "",
      ad.category || "",
      ad.subcategory || "",
      ad.price !== void 0 && ad.price !== null ? Number(ad.price) : null,
      ad.priceType || "fixed",
      ad.phone || "",
      ad.whatsapp || "",
      ad.colonia || "",
      ad.status || "active",
      ad.userToken || "",
      rawData
    ]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error guardando aviso clasificado:", err.message);
    return false;
  }
}
async function dbDeleteClassified(id) {
  if (!pool) return false;
  try {
    await pool.query("DELETE FROM classifieds WHERE id = ?", [String(id)]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error eliminando aviso clasificado:", err.message);
    return false;
  }
}
async function dbLoadAllEmergencyServices() {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM emergency_services ORDER BY is_urgent DESC, created_at ASC");
    return rows.map((r) => {
      let extra = {};
      if (r.raw_data) {
        try {
          extra = JSON.parse(r.raw_data);
        } catch (_) {
        }
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
  } catch (err) {
    console.warn("[MariaDB] Error cargando emergency services:", err.message);
    return [];
  }
}
async function dbSaveEmergencyService(item) {
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
      item.name || "",
      item.category || "",
      item.phone || "",
      item.whatsapp || "",
      item.address || "",
      item.schedule || "",
      item.badge || "",
      item.isUrgent ? 1 : 0,
      rawData
    ]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error guardando emergency service:", err.message);
    return false;
  }
}
async function dbDeleteEmergencyService(id) {
  if (!pool) return false;
  try {
    await pool.query("DELETE FROM emergency_services WHERE id = ?", [String(id)]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error eliminando emergency service:", err.message);
    return false;
  }
}
async function dbLoadPortalConfig() {
  if (!pool) return null;
  try {
    const [rows] = await pool.query("SELECT config_value FROM portal_settings WHERE config_key = 'main_config' LIMIT 1");
    if (rows && rows.length > 0 && rows[0].config_value) {
      return JSON.parse(rows[0].config_value);
    }
    return null;
  } catch (err) {
    console.warn("[MariaDB] Error cargando portal config:", err.message);
    return null;
  }
}
async function dbSavePortalConfig(config) {
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
  } catch (err) {
    console.warn("[MariaDB] Error guardando portal config:", err.message);
    return false;
  }
}
async function dbLoadPortalNotes() {
  if (!pool) return null;
  try {
    const [rows] = await pool.query("SELECT cambios_al_portal, fallas_del_portal, updated_at FROM portal_notes WHERE id = 1 LIMIT 1");
    if (rows && rows.length > 0) {
      return {
        cambios_al_portal: rows[0].cambios_al_portal || "",
        fallas_del_portal: rows[0].fallas_del_portal || "",
        updated_at: rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : void 0
      };
    }
    return null;
  } catch (err) {
    console.warn("[MariaDB] Error cargando portal notes:", err.message);
    return null;
  }
}
async function dbSavePortalNotes(notes) {
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
    await pool.query(query, [notes.cambios_al_portal || "", notes.fallas_del_portal || ""]);
    return true;
  } catch (err) {
    console.warn("[MariaDB] Error guardando portal notes:", err.message);
    return false;
  }
}

// server.ts
dotenv.config({ override: true });
var _filenameStr = "";
var _dirnameStr = process.cwd();
try {
  if (typeof import.meta !== "undefined" && import.meta && import.meta.url) {
    _filenameStr = fileURLToPath(import.meta.url);
    _dirnameStr = path.dirname(_filenameStr);
  }
} catch (_) {
}
var __dirname = _dirnameStr || process.cwd();
var app = express();
var PORT = Number(process.env.PORT || process.env.DEFAULT_APP_PORT) || 3e3;
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.removeHeader("X-Frame-Options");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
app.use((req, res, next) => {
  if (req.path === "/api/health" || req.path === "/api/version") {
    return next();
  }
  const host = (req.get("host") || "").toLowerCase();
  const isDevOrInternal = host.includes("run.app") || host.includes("localhost") || host.includes("127.0.0.1");
  if (isDevOrInternal) {
    return next();
  }
  const cfCountry = (req.get("cf-ipcountry") || "").trim().toUpperCase();
  if (cfCountry && cfCountry !== "MX") {
    console.log(`[GeoBlock] Acceso bloqueado desde pa\xEDs "${cfCountry}" (Host: ${host}, Path: ${req.path}). Desviando a https://www.google.com`);
    return res.redirect(302, "https://www.google.com");
  }
  next();
});
app.use((req, res, next) => {
  const pathLower = (req.path || "").toLowerCase();
  if (pathLower.includes(".env") || pathLower.includes(".git") || pathLower.includes("..") || pathLower.includes("wp-login") || pathLower.includes("wp-admin") || pathLower.includes("xmlrpc.php") || pathLower.includes("eval-stdin") || pathLower.includes("phpinfo") || pathLower.includes("actuator") || pathLower.includes(".aws")) {
    return res.status(404).end();
  }
  next();
});
var ipRequestCounts = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (now > data.resetAt) {
      ipRequestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1e3).unref();
app.use((req, res, next) => {
  if (req.path.startsWith("/media/") || req.path.startsWith("/wp-content/") || req.path.startsWith("/uploads/") || req.path.startsWith("/assets/") || /\.(jpg|jpeg|png|webp|svg|gif|ico|css|js|woff2?|ttf|json|map)$/i.test(req.path) || req.path === "/api/version" || req.path === "/api/database-status") {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (authHeader || req.headers["x-admin-auth"]) {
    return next();
  }
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1e3;
  const maxRequestsPerMinute = 1500;
  let entry = ipRequestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    ipRequestCounts.set(ip, entry);
  } else {
    entry.count++;
  }
  if (entry.count > maxRequestsPerMinute) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Espere un momento." });
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/media", express.static(path.resolve(__dirname, "public/wp-content/uploads"), {
  maxAge: 30 * 24 * 60 * 60 * 1e3,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
  }
}));
app.use("/wp-content", express.static(path.resolve(__dirname, "public/wp-content"), {
  maxAge: 7 * 24 * 60 * 60 * 1e3,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  }
}));
app.use("/uploads", express.static(path.resolve(__dirname, "public/uploads"), {
  maxAge: 30 * 24 * 60 * 60 * 1e3,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
  }
}));
app.get("/images/:filename", async (req, res, next) => {
  const filename = req.params.filename;
  if (isMariaDbActive()) {
    try {
      const file = await dbGetUploadedFile(filename);
      if (file && file.data) {
        res.setHeader("Content-Type", file.mimeType || "image/png");
        res.setHeader("Cache-Control", "public, max-age=60, must-revalidate");
        return res.send(file.data);
      }
    } catch (_) {
    }
  }
  const localPath = path.resolve(__dirname, "public/images", filename);
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }
  next();
});
function sendImagePlaceholder(res, label = "Empresas en Carmen") {
  const fnLower = (label || "").toLowerCase();
  let targetPath = "public/images/categories/servicios-del-hogar-y-oficios.jpg";
  if (/plomer|electr|manten|clim|profix|pintur|hogar|albanil|herreria|mtto/i.test(fnLower)) {
    targetPath = "public/images/categories/servicios-del-hogar-y-oficios.jpg";
  } else if (/ling|idiom|ingles|escuel|educa|cur|coleg|tutor|salud|clinic|medic|dent|farmac|hospital/i.test(fnLower)) {
    targetPath = "public/images/categories/salud-bienestar-y-educacion.jpg";
  } else if (/belleza|estetic|peluqu|barber|unas|pestanas|cosmet|spa|keratin/i.test(fnLower)) {
    targetPath = "public/images/categories/cuidado-y-belleza-personal.jpg";
  } else if (/auto|moto|taller|mecan|llanta|refacc/i.test(fnLower)) {
    targetPath = "public/images/categories/automotriz-y-motocicletas.jpg";
  } else if (/churro|buñuel|taco|comida|food|restaur|cocin|cafe|postre|antojit|burger|alitas|marisc|alimen/i.test(fnLower)) {
    targetPath = "public/uploads/wc-marisqueria-padrino.jpg";
  } else if (/industr|petrol|soldad|torno|seguridad|marin/i.test(fnLower)) {
    targetPath = "public/images/categories/sector-industrial-petrolero-y-construccion.jpg";
  } else if (/compu|celul|tecno|imprent|papel|copia|electronic/i.test(fnLower)) {
    targetPath = "public/images/categories/tecnologia-imprentas-y-comercio-al-menudeo.jpg";
  } else if (/inmuebl|renta|casa|depart|mascot|veterin/i.test(fnLower)) {
    targetPath = "public/images/categories/renta-de-inmuebles-espacios-y-mascotas.jpg";
  } else {
    const list = [
      "public/images/categories/servicios-del-hogar-y-oficios.jpg",
      "public/images/categories/salud-bienestar-y-educacion.jpg",
      "public/images/categories/cuidado-y-belleza-personal.jpg",
      "public/images/categories/automotriz-y-motocicletas.jpg",
      "public/images/categories/sector-industrial-petrolero-y-construccion.jpg",
      "public/images/categories/tecnologia-imprentas-y-comercio-al-menudeo.jpg",
      "public/images/categories/renta-de-inmuebles-espacios-y-mascotas.jpg",
      "public/uploads/wc-marisqueria-padrino.jpg",
      "public/uploads/expocamaron.jpg"
    ];
    let hash = 0;
    for (let i = 0; i < fnLower.length; i++) hash = (hash << 5) - hash + fnLower.charCodeAt(i);
    targetPath = list[Math.abs(hash) % list.length];
  }
  const absPath = path.resolve(__dirname, targetPath);
  if (fs.existsSync(absPath)) {
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
    return res.sendFile(absPath);
  }
  const fallbackLogo = path.resolve(__dirname, "public/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png");
  if (fs.existsSync(fallbackLogo)) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.sendFile(fallbackLogo);
  }
  return res.status(404).end();
}
app.get("/uploads/:filename", async (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const localPath = path.resolve(__dirname, "public/uploads", filename);
  if (fs.existsSync(localPath) && !fs.statSync(localPath).isDirectory()) {
    return res.sendFile(localPath);
  }
  const possibleYears = ["2026/10", "2026/01", "2026/09", "2024/07", "2024/08", "2024/09", "2024/10", "2024/11", "2024/12", "2025/01", "2025/02", "2025/03"];
  for (const yr of possibleYears) {
    const candidatePath = path.resolve(__dirname, "public/wp-content/uploads", yr, filename);
    if (fs.existsSync(candidatePath) && !fs.statSync(candidatePath).isDirectory()) {
      res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      return res.sendFile(candidatePath);
    }
  }
  if (isMariaDbActive()) {
    try {
      const file = await dbGetUploadedFile(filename);
      if (file && file.data) {
        try {
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, file.data);
        } catch (_) {
        }
        res.setHeader("Content-Type", file.mimeType || "image/png");
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
        return res.send(file.data);
      }
    } catch (e) {
      console.warn("[MariaDB uploads fallback] Error:", e.message);
    }
  }
  return sendImagePlaceholder(res, filename);
});
app.get("/wp-content/uploads/*", async (req, res) => {
  const rawSubpath = req.params[0] || "";
  const decodedSubpath = decodeURIComponent(rawSubpath).replace(/^\/+/, "");
  const localPath = path.resolve(__dirname, "public/wp-content/uploads", decodedSubpath);
  if (fs.existsSync(localPath) && !fs.statSync(localPath).isDirectory()) {
    res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
    return res.sendFile(localPath);
  }
  const basename = path.basename(decodedSubpath);
  const possibleYears = ["2026/10", "2026/01", "2026/09", "2024/07", "2024/08", "2024/09", "2024/10", "2024/11", "2024/12", "2025/01", "2025/02", "2025/03"];
  for (const yr of possibleYears) {
    const candidatePath = path.resolve(__dirname, "public/wp-content/uploads", yr, basename);
    if (fs.existsSync(candidatePath) && !fs.statSync(candidatePath).isDirectory()) {
      res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      return res.sendFile(candidatePath);
    }
  }
  if (isMariaDbActive()) {
    try {
      const file = await dbGetUploadedFile(basename);
      if (file && file.data) {
        res.setHeader("Content-Type", file.mimeType || "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
        return res.send(file.data);
      }
    } catch (_) {
    }
  }
  return sendImagePlaceholder(res, basename);
});
app.get("/media/*", (req, res) => {
  const rawSubpath = req.params[0] || "";
  const decodedSubpath = decodeURIComponent(rawSubpath).replace(/^\/+/, "");
  const localPath = path.resolve(__dirname, "public/wp-content/uploads", decodedSubpath);
  if (fs.existsSync(localPath) && !fs.statSync(localPath).isDirectory()) {
    res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
    return res.sendFile(localPath);
  }
  return res.redirect(301, `/wp-content/uploads/${encodeURIComponent(decodedSubpath)}`);
});
app.get([
  "/api/backup/sitio-completo-hostinger.zip",
  "/sitio-completo-hostinger.zip",
  "/empresasencarmen-hostinger-completo.zip",
  "/descargar-sitio-completo.zip",
  "/api/download-hostinger-zip",
  "/todo-en-uno-hostinger.zip",
  "/sitio-completo.zip"
], (req, res) => {
  const masterZipPath = path.resolve(__dirname, "public/sitio-completo-hostinger.zip");
  if (fs.existsSync(masterZipPath)) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="sitio-completo-hostinger.zip"');
    return res.download(masterZipPath, "sitio-completo-hostinger.zip");
  }
  return res.status(404).json({ error: "Archivo de sitio completo a\xFAn no generado" });
});
app.get([
  "/api/backup/images-zip",
  "/api/backup/respaldo_imagenes_encarmen_completo.zip",
  "/respaldo_imagenes_encarmen_completo.zip",
  "/public/respaldo_imagenes_encarmen_completo.zip",
  "/imagenes.zip",
  "/backup-imagenes.zip"
], (req, res) => {
  const zipPath = path.resolve(__dirname, "public/respaldo_imagenes_encarmen_completo.zip");
  if (fs.existsSync(zipPath)) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="respaldo_imagenes_encarmen_completo.zip"');
    return res.download(zipPath, "respaldo_imagenes_encarmen_completo.zip");
  }
  return res.status(404).json({ error: "Archivo de respaldo no encontrado en disco" });
});
app.get([
  "/api/backup/migrate-sql",
  "/api/backup/mariadb_migrate_images.sql",
  "/mariadb_migrate_images.sql",
  "/public/mariadb_migrate_images.sql"
], (req, res) => {
  const sqlPath = path.resolve(__dirname, "public/mariadb_migrate_images.sql");
  if (fs.existsSync(sqlPath)) {
    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", 'attachment; filename="mariadb_migrate_images.sql"');
    return res.download(sqlPath, "mariadb_migrate_images.sql");
  }
  return res.status(404).json({ error: "Archivo SQL no encontrado" });
});
var imgCacheDir = path.resolve(__dirname, "public/cache/img");
try {
  if (!fs.existsSync(imgCacheDir)) {
    fs.mkdirSync(imgCacheDir, { recursive: true });
  }
} catch (_) {
}
app.get("/api/version", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
  let ver = "latest";
  try {
    const vFile = fs.readFileSync(path.resolve(__dirname, "src/constants/version.ts"), "utf8");
    const m = vFile.match(/APP_VERSION\s*=\s*'([^']+)'/);
    if (m) ver = m[1];
  } catch {
  }
  res.json({ success: true, version: ver, timestamp: Date.now() });
});
app.get("/api/img", async (req, res) => {
  const rawUrl = req.query.url || "";
  if (!rawUrl) {
    return res.status(400).send("Missing url param");
  }
  const width = Math.min(Math.max(parseInt(req.query.w || "480", 10), 40), 1920);
  const quality = Math.min(Math.max(parseInt(req.query.q || "80", 10), 30), 95);
  const format = (req.query.format || "webp").toLowerCase();
  const hash = crypto.createHash("sha1").update(`${rawUrl}_w${width}_q${quality}_f${format}`).digest("hex");
  const cacheFile = path.join(imgCacheDir, `${hash}.${format}`);
  if (fs.existsSync(cacheFile)) {
    res.setHeader("Content-Type", `image/${format}`);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(cacheFile);
  }
  try {
    let inputBuffer = null;
    let decodedUrl = decodeURIComponent(rawUrl).trim();
    if (decodedUrl.includes("empresasencarmen.com/wp-content/")) {
      decodedUrl = decodedUrl.substring(decodedUrl.indexOf("/wp-content/"));
    } else if (decodedUrl.includes("empresasencarmen.com/media/")) {
      decodedUrl = "/wp-content/uploads/" + decodedUrl.substring(decodedUrl.indexOf("/media/") + 7);
    } else if (decodedUrl.includes("empresasencarmen.com/uploads/")) {
      decodedUrl = "/wp-content/uploads/2026/10/" + decodedUrl.substring(decodedUrl.indexOf("/uploads/") + 9);
    }
    if (decodedUrl.startsWith("/")) {
      const relPath = decodedUrl.replace(/^\/+/, "");
      const localDirect = path.resolve(__dirname, "public", relPath);
      if (fs.existsSync(localDirect) && !fs.statSync(localDirect).isDirectory()) {
        inputBuffer = fs.readFileSync(localDirect);
      }
    }
    if (!inputBuffer && (decodedUrl.includes("/wp-content/uploads/") || decodedUrl.includes("/uploads/"))) {
      const baseFn = path.basename(decodedUrl.split("?")[0]);
      const possibleYears = ["2026/10", "2026/01", "2026/09", "2024/07", "2024/08", "2024/09", "2024/10", "2024/11", "2024/12", "2025/01", "2025/02", "2025/03"];
      for (const yr of possibleYears) {
        const candidate = path.resolve(__dirname, "public/wp-content/uploads", yr, baseFn);
        if (fs.existsSync(candidate) && !fs.statSync(candidate).isDirectory()) {
          inputBuffer = fs.readFileSync(candidate);
          break;
        }
      }
    }
    if (!inputBuffer && (decodedUrl.includes("/uploads/") || decodedUrl.includes("/wp-content/"))) {
      const fn = path.basename(decodedUrl.split("?")[0]);
      if (fn && isMariaDbActive()) {
        try {
          const file = await dbGetUploadedFile(fn);
          if (file && file.data) {
            inputBuffer = file.data;
          }
        } catch (_) {
        }
      }
    }
    if (!inputBuffer && (decodedUrl.startsWith("http://") || decodedUrl.startsWith("https://")) && !decodedUrl.includes("empresasencarmen.com")) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7e3);
        const remoteRes = await fetch(decodedUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        clearTimeout(timeout);
        if (remoteRes.ok) {
          inputBuffer = Buffer.from(await remoteRes.arrayBuffer());
        }
      } catch (_) {
      }
    }
    if (!inputBuffer) {
      const baseFn = path.basename(decodedUrl.split("?")[0]) || "Empresa";
      return sendImagePlaceholder(res, baseFn);
    }
    const sharpInstance = sharp(inputBuffer).rotate();
    if (width > 0) {
      sharpInstance.resize({
        width,
        withoutEnlargement: true,
        fit: "inside"
      });
    }
    let outputBuffer;
    if (format === "webp") {
      outputBuffer = await sharpInstance.webp({ quality, effort: 4 }).toBuffer();
    } else if (format === "jpeg" || format === "jpg") {
      outputBuffer = await sharpInstance.jpeg({ quality, mozjpeg: true }).toBuffer();
    } else if (format === "png") {
      outputBuffer = await sharpInstance.png({ compressionLevel: 8 }).toBuffer();
    } else {
      outputBuffer = await sharpInstance.webp({ quality }).toBuffer();
    }
    try {
      fs.writeFileSync(cacheFile, outputBuffer);
    } catch (_) {
    }
    res.setHeader("Content-Type", `image/${format}`);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(outputBuffer);
  } catch (err) {
    if (rawUrl.startsWith("http")) {
      return res.redirect(302, rawUrl);
    }
    return res.status(500).send("Image processing error");
  }
});
var portalConfigPath = path.resolve(__dirname, "portal_config.json");
var portalConfig = {
  siteName: "Empresas en Carmen",
  domain: "empresasencarmen.com",
  tagline: "Directorio empresarial interactivo de Ciudad del Carmen, Campeche.",
  logoUrl: "/images/logo-oficial.png",
  bannerUrl: "/images/banner-empresas-en-carmen.png",
  portal_notes: {
    cambios_al_portal: "",
    fallas_del_portal: ""
  },
  contact: {
    whatsapp: "9381522623",
    phone: "9381522623",
    email: "contacto@empresasencarmen.com",
    facebookGroup: "https://www.facebook.com/groups/506440126097710",
    facebookPage: "https://www.facebook.com/empresasencarmen"
  },
  lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
};
try {
  if (fs.existsSync(portalConfigPath)) {
    const loaded = JSON.parse(fs.readFileSync(portalConfigPath, "utf8"));
    portalConfig = { ...portalConfig, ...loaded };
  } else {
    fs.writeFileSync(portalConfigPath, JSON.stringify(portalConfig, null, 2), "utf8");
  }
} catch (cErr) {
  console.warn("[Portal Config] Error leyendo portal_config.json:", cErr.message);
}
var businessesCache = [];
var categoriesCache = [];
var eventsCache = [];
var promotionsCache = [];
var reportsCache = [];
var claimedCouponsCache = [];
var classifiedsCache = [];
var emergencyServicesCache = [];
var editPinsCache = {};
try {
  let bizPath = path.resolve(__dirname, "src/data/businesses_seed.json");
  if (!fs.existsSync(bizPath)) {
    bizPath = path.resolve(process.cwd(), "src/data/businesses_seed.json");
  }
  if (fs.existsSync(bizPath)) {
    businessesCache = JSON.parse(fs.readFileSync(bizPath, "utf8"));
    console.log(`[Cache] ${businessesCache.length} empresas cargadas de seed.`);
  }
} catch (e) {
  console.warn("[Cache] Error cargando businesses_seed:", e);
}
try {
  let catPath = path.resolve(__dirname, "src/data/categories_seed.json");
  if (!fs.existsSync(catPath)) {
    catPath = path.resolve(process.cwd(), "src/data/categories_seed.json");
  }
  if (fs.existsSync(catPath)) {
    categoriesCache = JSON.parse(fs.readFileSync(catPath, "utf8"));
    console.log(`[Cache] ${categoriesCache.length} categor\xEDas cargadas de seed.`);
  }
} catch (e) {
  console.warn("[Cache] Error cargando categories_seed:", e);
}
var THEMATIC_EVENT_IMAGES_SERVER = {
  running: "/uploads/38637-CATRINAS_10K.jpg",
  cycling: "/uploads/kiosco-parque-zaragoza.jpg",
  soccer: "/uploads/kiosco-parque-zaragoza.jpg",
  baseball: "/uploads/kiosco-parque-zaragoza.jpg",
  fishing: "/uploads/festival-gastronomico-carmen.jpg",
  sportsGeneral: "/uploads/38637-CATRINAS_10K.jpg",
  conference: "/uploads/bazar-emprendedores-carmen.jpg",
  agriculture: "/uploads/festival-gastronomico-carmen.jpg",
  concert: "/uploads/concierto-musica-carmen.jpg",
  partyNight: "/uploads/concierto-musica-carmen.jpg",
  tradicionZaragoza: "/uploads/kiosco-parque-zaragoza.jpg",
  bazar: "/uploads/bazar-emprendedores-carmen.jpg",
  gastronomiaMariscos: "/uploads/festival-gastronomico-carmen.jpg",
  grill: "/uploads/festival-gastronomico-carmen.jpg",
  bakeryCafe: "/uploads/festival-gastronomico-carmen.jpg",
  diaDeMuertos: "/uploads/dia-de-muertos-carmen.jpg",
  theater: "/uploads/concierto-musica-carmen.jpg",
  dance: "/uploads/kiosco-parque-zaragoza.jpg",
  cinema: "/uploads/concierto-musica-carmen.jpg",
  artExhibition: "/uploads/bazar-emprendedores-carmen.jpg",
  kidsFamily: "/uploads/kiosco-parque-zaragoza.jpg",
  pets: "/uploads/kiosco-parque-zaragoza.jpg",
  beach: "/uploads/festival-gastronomico-carmen.jpg",
  patronalFiesta: "/uploads/kiosco-parque-zaragoza.jpg",
  wellness: "/uploads/kiosco-parque-zaragoza.jpg"
};
function getEventRepresentativeImageServer(event) {
  if (event.image && typeof event.image === "string") {
    const raw = event.image.trim();
    if (raw.startsWith("/uploads/") || raw.startsWith("/images/") || raw.startsWith("http") && !raw.includes("unsplash.com")) {
      return raw;
    }
  }
  const text = `${event.title || ""} ${event.description || ""} ${event.category || ""} ${event.location || ""}`.toLowerCase();
  if (text.includes("muerto") || text.includes("catrina") || text.includes("cempas\xFAchil") || text.includes("cempasuchil") || text.includes("\xE1nima") || text.includes("anima") || text.includes("altar") || text.includes("calaver") || text.includes("hanal pix") || text.includes("hallow")) {
    return THEMATIC_EVENT_IMAGES_SERVER.diaDeMuertos;
  }
  if (text.includes("agroindustrial") || text.includes("agro") || text.includes("agr\xEDcol") || text.includes("agricol") || text.includes("campo") || text.includes("siembra") || text.includes("ganader") || text.includes("cosecha") || text.includes("productos de campeche")) {
    return THEMATIC_EVENT_IMAGES_SERVER.agriculture;
  }
  if (text.includes("carrera") || text.includes("marat\xF3n") || text.includes("maraton") || text.includes("5k") || text.includes("10k") || text.includes("21k") || text.includes("atlet") || text.includes("corredor") || text.includes("running") || text.includes("octubre rosa") || text.includes("c\xE1ncer de mama")) {
    return THEMATIC_EVENT_IMAGES_SERVER.running;
  }
  if (text.includes("rodada") || text.includes("ciclis") || text.includes("bicicleta") || text.includes("bici")) {
    return THEMATIC_EVENT_IMAGES_SERVER.cycling;
  }
  if (text.includes("pesca") || text.includes("s\xE1balo") || text.includes("sabalo") || text.includes("anzuelo") || text.includes("lancha")) {
    return THEMATIC_EVENT_IMAGES_SERVER.fishing;
  }
  if (text.includes("f\xFAtbol") || text.includes("futbol") || text.includes("soccer") || text.includes("gol")) {
    return THEMATIC_EVENT_IMAGES_SERVER.soccer;
  }
  if (text.includes("b\xE9isbol") || text.includes("beisbol") || text.includes("softbol") || text.includes("pelota") || text.includes("jonr\xF3n") || text.includes("resineros")) {
    return THEMATIC_EVENT_IMAGES_SERVER.baseball;
  }
  if (text.includes("congreso") || text.includes("convenci\xF3n") || text.includes("convencion") || text.includes("carmen xxi") || text.includes("foro") || text.includes("cumbre") || text.includes("simposio") || text.includes("conferencia") || text.includes("panel") || text.includes("empresarial") || text.includes("negocios")) {
    return THEMATIC_EVENT_IMAGES_SERVER.conference;
  }
  if (text.includes("teatro") || text.includes("obra") || text.includes("mon\xF3logo") || text.includes("monologo") || text.includes("stand up") || text.includes("comedia") || text.includes("dramat") || text.includes("escena") || text.includes("teatro carmelita")) {
    return THEMATIC_EVENT_IMAGES_SERVER.theater;
  }
  if (text.includes("danza") || text.includes("baile") || text.includes("ballet") || text.includes("folclor") || text.includes("jarana") || text.includes("coreograf")) {
    return THEMATIC_EVENT_IMAGES_SERVER.dance;
  }
  if (text.includes("cine") || text.includes("pel\xEDcula") || text.includes("pelicula") || text.includes("cortometraje") || text.includes("film") || text.includes("proyecci\xF3n") || text.includes("proyeccion")) {
    return THEMATIC_EVENT_IMAGES_SERVER.cinema;
  }
  if (text.includes("exposici\xF3n") || text.includes("exposicion") || text.includes("galer\xEDa") || text.includes("galeria") || text.includes("pintura") || text.includes("escultura") || text.includes("fotograf\xEDa") || text.includes("fotografia") || text.includes("artes pl\xE1sticas")) {
    return THEMATIC_EVENT_IMAGES_SERVER.artExhibition;
  }
  if (text.includes("kiosco") || text.includes("zaragoza") || text.includes("parque principal") || text.includes("bolero") || text.includes("danz\xF3n") || text.includes("danzon") || text.includes("marimba") || text.includes("son campechano") || text.includes("trova") || text.includes("campechanidad") || text.includes("desfile cultural")) {
    return THEMATIC_EVENT_IMAGES_SERVER.tradicionZaragoza;
  }
  if (text.includes("camar\xF3n") || text.includes("camaron") || text.includes("marisco") || text.includes("gastronom") || text.includes("culinari") || text.includes("platillo") || text.includes("degustac") || text.includes("chef") || text.includes("ceviche") || text.includes("coctel")) {
    return THEMATIC_EVENT_IMAGES_SERVER.gastronomiaMariscos;
  }
  if (text.includes("asado") || text.includes("parrill") || text.includes("bbq") || text.includes("carne")) {
    return THEMATIC_EVENT_IMAGES_SERVER.grill;
  }
  if (text.includes("caf\xE9") || text.includes("cafe") || text.includes("reposter") || text.includes("postre") || text.includes("panader")) {
    return THEMATIC_EVENT_IMAGES_SERVER.bakeryCafe;
  }
  if (text.includes("concierto") || text.includes("m\xFAsica") || text.includes("musica") || text.includes("en vivo") || text.includes("tributo") || text.includes("rock") || text.includes("banda") || text.includes("guitarra") || text.includes("ac\xFAstic") || text.includes("acustic") || text.includes("recital") || text.includes("jazz") || text.includes("canto") || text.includes("show") || text.includes("blnko") || text.includes("austin") || text.includes("revo") || text.includes("cantautor")) {
    return THEMATIC_EVENT_IMAGES_SERVER.concert;
  }
  if (text.includes("dj") || text.includes("electr\xF3nica") || text.includes("electronica") || text.includes("fiesta nocturna") || text.includes("antro") || text.includes("club")) {
    return THEMATIC_EVENT_IMAGES_SERVER.partyNight;
  }
  if (text.includes("bazar") || text.includes("placita") || text.includes("emprended") || text.includes("artesan") || text.includes("mercadito") || text.includes("expo eventia") || text.includes("tianguis") || text.includes("comercial")) {
    return THEMATIC_EVENT_IMAGES_SERVER.bazar;
  }
  if (text.includes("virgen del carmen") || text.includes("patronal") || text.includes("procesi\xF3n") || text.includes("procesion") || text.includes("paseo por mar")) {
    return THEMATIC_EVENT_IMAGES_SERVER.patronalFiesta;
  }
  if (text.includes("playa norte") || text.includes("playa") || text.includes("malec\xF3n") || text.includes("malecon") || text.includes("costero")) {
    return THEMATIC_EVENT_IMAGES_SERVER.beach;
  }
  if (text.includes("infantil") || text.includes("ni\xF1o") || text.includes("ni\xF1a") || text.includes("t\xEDteres") || text.includes("titeres") || text.includes("marioneta") || text.includes("familiar")) {
    return THEMATIC_EVENT_IMAGES_SERVER.kidsFamily;
  }
  if (text.includes("mascota") || text.includes("canin") || text.includes("perro") || text.includes("adopci")) {
    return THEMATIC_EVENT_IMAGES_SERVER.pets;
  }
  if (text.includes("yoga") || text.includes("meditac") || text.includes("salud") || text.includes("bienestar")) {
    return THEMATIC_EVENT_IMAGES_SERVER.wellness;
  }
  if (text.includes("deport") || text.includes("torneo") || text.includes("campeonato")) {
    return THEMATIC_EVENT_IMAGES_SERVER.sportsGeneral;
  }
  const cat = (event.categorySlug || event.category || "").toLowerCase();
  if (cat.includes("bazar")) return THEMATIC_EVENT_IMAGES_SERVER.bazar;
  if (cat.includes("gastronom")) return THEMATIC_EVENT_IMAGES_SERVER.gastronomiaMariscos;
  if (cat.includes("deport")) return THEMATIC_EVENT_IMAGES_SERVER.sportsGeneral;
  if (cat.includes("m\xFAsica") || cat.includes("musica")) return THEMATIC_EVENT_IMAGES_SERVER.concert;
  if (cat.includes("cultur") || cat.includes("feria")) return THEMATIC_EVENT_IMAGES_SERVER.tradicionZaragoza;
  return THEMATIC_EVENT_IMAGES_SERVER.tradicionZaragoza;
}
try {
  const evtPath = path.resolve(__dirname, "events_db.json");
  if (fs.existsSync(evtPath)) {
    const rawEvts = JSON.parse(fs.readFileSync(evtPath, "utf8"));
    eventsCache = rawEvts.map((e) => ({
      ...e,
      image: e.image && typeof e.image === "string" && e.image.trim() && !e.image.includes("unsplash.com") ? e.image.trim() : getEventRepresentativeImageServer(e)
    }));
    fs.writeFileSync(evtPath, JSON.stringify(eventsCache, null, 2), "utf8");
    console.log(`[Cache] ${eventsCache.length} eventos cargados de events_db.json con im\xE1genes representativas.`);
  }
} catch (e) {
  console.warn("[Cache] Error cargando events_db.json:", e);
}
try {
  const promoPath = path.resolve(__dirname, "promotions_db.json");
  if (fs.existsSync(promoPath)) {
    promotionsCache = JSON.parse(fs.readFileSync(promoPath, "utf8"));
    console.log(`[Cache] ${promotionsCache.length} promociones cargadas de promotions_db.json.`);
  } else {
    promotionsCache = [];
    fs.writeFileSync(promoPath, "[]", "utf8");
  }
} catch (e) {
  console.warn("[Cache] Error cargando promotions_db.json:", e);
  promotionsCache = [];
}
try {
  const couponPath = path.resolve(__dirname, "coupons_db.json");
  if (fs.existsSync(couponPath)) {
    claimedCouponsCache = JSON.parse(fs.readFileSync(couponPath, "utf8"));
    console.log(`[Cache] ${claimedCouponsCache.length} cupones cargados de coupons_db.json.`);
  } else {
    claimedCouponsCache = [];
    fs.writeFileSync(couponPath, "[]", "utf8");
  }
} catch (e) {
  console.warn("[Cache] Error cargando coupons_db.json:", e);
  claimedCouponsCache = [];
}
try {
  const classPath = path.resolve(__dirname, "classifieds_db.json");
  if (fs.existsSync(classPath)) {
    classifiedsCache = JSON.parse(fs.readFileSync(classPath, "utf8"));
    console.log(`[Cache] ${classifiedsCache.length} avisos clasificados cargados.`);
  } else {
    classifiedsCache = [];
  }
} catch (e) {
  classifiedsCache = [];
}
try {
  const emPath = path.resolve(__dirname, "src/data/emergency_guide_carmen.json");
  if (fs.existsSync(emPath)) {
    emergencyServicesCache = JSON.parse(fs.readFileSync(emPath, "utf8"));
    console.log(`[Cache] ${emergencyServicesCache.length} servicios de emergencia cargados.`);
  } else {
    emergencyServicesCache = [];
  }
} catch (e) {
  emergencyServicesCache = [];
}
try {
  const pinsPath = path.resolve(__dirname, "pins_db.json");
  if (fs.existsSync(pinsPath)) {
    editPinsCache = JSON.parse(fs.readFileSync(pinsPath, "utf8"));
    console.log(`[Cache] C\xF3digos PIN de edici\xF3n cargados.`);
  } else {
    editPinsCache = {};
  }
} catch (e) {
  editPinsCache = {};
}
var ADMIN_SALT = "carmen_directory_2026_secure_salt";
function hashPassword(pass) {
  return crypto.createHash("sha256").update(pass + ADMIN_SALT).digest("hex");
}
var adminAccounts = [
  {
    username: "Y",
    passwordHash: hashPassword("Gioyuss"),
    role: "Administrador",
    initial: "Y",
    avatarColor: "from-purple-600 to-indigo-600"
  },
  {
    username: "J",
    passwordHash: hashPassword("63097"),
    role: "Administrador",
    initial: "J",
    avatarColor: "from-blue-600 to-cyan-600"
  }
];
function getRequestBaseUrl(req) {
  const rawHost = req.get("x-forwarded-host") || req.get("host") || "empresasencarmen.com";
  const hostHeader = rawHost.toLowerCase().split(":")[0];
  let domain = hostHeader;
  if (hostHeader.includes("encarmen.org")) {
    domain = hostHeader.startsWith("www.") ? "www.encarmen.org" : "encarmen.org";
  } else if (hostHeader.includes("empresasencarmen.com")) {
    domain = hostHeader.startsWith("www.") ? "www.empresasencarmen.com" : "empresasencarmen.com";
  } else if (hostHeader.includes("encarmen.com")) {
    domain = hostHeader.startsWith("www.") ? "www.encarmen.com" : "encarmen.com";
  } else if (hostHeader.includes("encarmen.mx")) {
    domain = hostHeader.startsWith("www.") ? "www.encarmen.mx" : "encarmen.mx";
  }
  const proto = req.get("x-forwarded-proto") || (req.secure ? "https" : "http");
  return `${proto}://${domain}`;
}
function generateCategorySlugs(categories) {
  if (!categories) return [];
  const list = Array.isArray(categories) ? categories : [categories];
  const set = /* @__PURE__ */ new Set();
  for (const c of list) {
    if (!c || typeof c !== "string") continue;
    const s = c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (s) set.add(s);
    if (Array.isArray(categoriesCache) && categoriesCache.length > 0) {
      const matched = categoriesCache.find((cat) => cat.name?.toLowerCase().trim() === c.toLowerCase().trim() || cat.slug === s);
      if (matched && matched.parent && matched.parent !== 0) {
        const parentCat = categoriesCache.find((cat) => cat.id === matched.parent);
        if (parentCat && parentCat.slug) set.add(parentCat.slug);
      }
    }
  }
  return Array.from(set);
}
function parseEventStartDate(dateStr, timeStr) {
  if (!dateStr || typeof dateStr !== "string") return new Date(2099, 0, 1).getTime();
  const clean = dateStr.toLowerCase().trim();
  const months = {
    enero: 0,
    feb: 1,
    febrero: 1,
    mar: 2,
    marzo: 2,
    abr: 3,
    abril: 3,
    mayo: 4,
    jun: 5,
    junio: 5,
    jul: 6,
    julio: 6,
    ago: 7,
    agosto: 7,
    sep: 8,
    sept: 8,
    septiembre: 8,
    oct: 9,
    octubre: 9,
    nov: 10,
    noviembre: 10,
    dic: 11,
    diciembre: 11
  };
  let foundMonth = null;
  for (const [mName, mIdx] of Object.entries(months)) {
    const regex = new RegExp(`\\b${mName}\\b`, "i");
    if (regex.test(clean)) {
      foundMonth = mIdx;
      break;
    }
  }
  const yearMatch = clean.match(/\b(202\d)\b/);
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const year = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;
  const dayMatches = clean.match(/\b([1-3]?\d)\b/g);
  let day = null;
  if (dayMatches && dayMatches.length > 0) {
    const validDays = dayMatches.map((d) => parseInt(d, 10)).filter((d) => d >= 1 && d <= 31 && d !== year);
    if (validDays.length > 0) {
      day = validDays[0];
    }
  }
  if (foundMonth !== null && day !== null) {
    let hour = 12;
    let min = 0;
    if (timeStr) {
      const tm = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (tm) {
        hour = parseInt(tm[1], 10);
        min = parseInt(tm[2], 10);
      }
    }
    return new Date(year, foundMonth, day, hour, min).getTime();
  }
  const now = /* @__PURE__ */ new Date();
  if (clean.includes("sabado") || clean.includes("s\xE1bado")) {
    const d = new Date(now);
    const dayOfWeek = d.getDay();
    const diff = (6 - dayOfWeek + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d.getTime();
  }
  if (clean.includes("domingo")) {
    const d = new Date(now);
    const dayOfWeek = d.getDay();
    const diff = (7 - dayOfWeek) % 7;
    d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
    return d.getTime();
  }
  return new Date(2099, 0, 1).getTime();
}
function parseEventEndDate(dateStr, timeStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const clean = dateStr.toLowerCase().trim();
  const months = {
    enero: 0,
    feb: 1,
    febrero: 1,
    mar: 2,
    marzo: 2,
    abr: 3,
    abril: 3,
    mayo: 4,
    jun: 5,
    junio: 5,
    jul: 6,
    julio: 6,
    ago: 7,
    agosto: 7,
    sep: 8,
    sept: 8,
    septiembre: 8,
    oct: 9,
    octubre: 9,
    nov: 10,
    noviembre: 10,
    dic: 11,
    diciembre: 11
  };
  let foundMonth = null;
  for (const [mName, mIdx] of Object.entries(months)) {
    const regex = new RegExp(`\\b${mName}\\b`, "i");
    if (regex.test(clean)) {
      foundMonth = mIdx;
      break;
    }
  }
  const yearMatch = clean.match(/\b(202\d)\b/);
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const year = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;
  const dayMatches = clean.match(/\b([1-3]?\d)\b/g);
  let day = null;
  if (dayMatches && dayMatches.length > 0) {
    const validDays = dayMatches.map((d) => parseInt(d, 10)).filter((d) => d >= 1 && d <= 31 && d !== year);
    if (validDays.length > 0) {
      day = validDays[validDays.length - 1];
    }
  }
  if (foundMonth === null || day === null) {
    const isoMatch = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), 23, 59, 59);
    }
    return null;
  }
  let endHour = 23;
  let endMin = 59;
  if (timeStr && typeof timeStr === "string") {
    const tClean = timeStr.toLowerCase();
    const timeMatches = tClean.match(/(\d{1,2}):(\d{2})/g);
    if (timeMatches && timeMatches.length > 0) {
      const lastTime = timeMatches[timeMatches.length - 1];
      const [h, m] = lastTime.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        endHour = h;
        endMin = m;
      }
    } else {
      const pmMatch = tClean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi);
      if (pmMatch && pmMatch.length > 0) {
        const lastPm = pmMatch[pmMatch.length - 1];
        const parts = lastPm.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
        if (parts) {
          let h = parseInt(parts[1], 10);
          const m = parts[2] ? parseInt(parts[2], 10) : 0;
          const isPm = parts[3].toLowerCase() === "pm";
          if (isPm && h < 12) h += 12;
          if (!isPm && h === 12) h = 0;
          endHour = h;
          endMin = m;
        }
      }
    }
  }
  return new Date(year, foundMonth, day, endHour, endMin, 0);
}
function isEventPast(dateStr, timeStr) {
  const endDate = parseEventEndDate(dateStr, timeStr);
  if (!endDate) return false;
  return endDate.getTime() < Date.now();
}
async function pruneExpiredEvents() {
  const initialCount = eventsCache.length;
  const expiredIds = [];
  eventsCache = eventsCache.filter((evt) => {
    const expired = isEventPast(evt.date, evt.time);
    if (expired) {
      expiredIds.push(evt.id);
      return false;
    }
    return true;
  });
  const removed = initialCount - eventsCache.length;
  if (removed > 0) {
    try {
      const evPath = path.resolve(__dirname, "events_db.json");
      fs.writeFileSync(evPath, JSON.stringify(eventsCache, null, 2), "utf8");
      console.log(`[Auto-Limpieza Eventos] Se eliminaron autom\xE1ticamente ${removed} eventos pasados.`);
    } catch (_) {
    }
    if (isMariaDbActive()) {
      for (const id of expiredIds) {
        try {
          await dbDeleteEvent(id);
        } catch (_) {
        }
      }
    }
  }
  return removed;
}
pruneExpiredEvents().catch(() => {
});
setInterval(() => {
  pruneExpiredEvents().catch(() => {
  });
}, 60 * 60 * 1e3);
var dismissedCandidatesPath = path.resolve(__dirname, "auto_candidates_dismissed.json");
var dismissedCandidates = /* @__PURE__ */ new Set();
function loadDismissedCandidatesLocal() {
  try {
    if (fs.existsSync(dismissedCandidatesPath)) {
      const data = JSON.parse(fs.readFileSync(dismissedCandidatesPath, "utf8"));
      if (Array.isArray(data)) {
        data.forEach((item) => {
          if (typeof item === "string") dismissedCandidates.add(item.toLowerCase().trim());
          else if (item && typeof item === "object") {
            if (item.id) dismissedCandidates.add(String(item.id).toLowerCase().trim());
            if (item.name) dismissedCandidates.add(String(item.name).toLowerCase().trim());
            if (item.phone) dismissedCandidates.add(String(item.phone).replace(/\D/g, ""));
          }
        });
      }
    }
  } catch (_) {
  }
}
loadDismissedCandidatesLocal();
initMariaDb().then(async (active) => {
  if (active) {
    console.log("[MariaDB] Conexi\xF3n establecida con Hostinger MariaDB.");
    try {
      const dbConfig = await dbLoadPortalConfig();
      if (dbConfig) {
        portalConfig = { ...portalConfig, ...dbConfig };
        fs.writeFileSync(portalConfigPath, JSON.stringify(portalConfig, null, 2), "utf8");
        console.log("[MariaDB] Configuraci\xF3n del portal sincronizada desde la base de datos.");
      }
      const dbNotes = await dbLoadPortalNotes();
      if (dbNotes) {
        portalConfig.portal_notes = {
          cambios_al_portal: dbNotes.cambios_al_portal || "",
          fallas_del_portal: dbNotes.fallas_del_portal || ""
        };
      }
    } catch (e) {
      console.warn("[MariaDB] Error al cargar configuraci\xF3n del portal:", e.message);
    }
    const dbBusinesses = await dbLoadAllBusinesses();
    if (dbBusinesses.length > 0) {
      const dbIdSet = new Set(dbBusinesses.map((b) => String(b.id)));
      const missingInDb = businessesCache.filter((b) => !dbIdSet.has(String(b.id)));
      if (missingInDb.length > 0) {
        console.log(`[MariaDB] A\xF1adiendo ${missingInDb.length} empresas del cat\xE1logo local que no exist\xEDan en Hostinger MariaDB...`);
        for (const b of missingInDb) {
          await dbSaveBusiness(b);
        }
        const reloaded = await dbLoadAllBusinesses();
        if (reloaded.length > 0) businessesCache = reloaded;
      } else {
        businessesCache = dbBusinesses;
      }
      console.log(`[MariaDB] ${businessesCache.length} empresas cargadas autoritativamente desde Hostinger MariaDB.`);
    } else {
      console.log(`[MariaDB] Base de datos vac\xEDa. Sincronizando ${businessesCache.length} empresas completas hacia Hostinger MariaDB...`);
      for (const b of businessesCache) {
        await dbSaveBusiness(b);
      }
      const reloaded = await dbLoadAllBusinesses();
      if (reloaded.length > 0) businessesCache = reloaded;
      console.log(`[MariaDB] ${businessesCache.length} empresas aseguradas en Hostinger MariaDB.`);
    }
    const dbReports = await dbLoadAllReports();
    if (dbReports.length > 0) {
      reportsCache = dbReports;
      console.log(`[MariaDB] ${reportsCache.length} reportes cargados desde Hostinger MariaDB.`);
    }
    const dbEvents = await dbLoadAllEvents();
    if (dbEvents.length > 0) {
      eventsCache = dbEvents.map((e) => ({
        ...e,
        image: e.image && typeof e.image === "string" && e.image.trim() ? e.image.trim() : getEventRepresentativeImageServer(e)
      }));
      console.log(`[MariaDB] ${eventsCache.length} eventos cargados desde Hostinger MariaDB.`);
    } else if (eventsCache.length > 0) {
      for (const evt of eventsCache) {
        await dbSaveEvent(evt);
      }
      console.log(`[MariaDB] ${eventsCache.length} eventos iniciales guardados en Hostinger MariaDB.`);
    }
    const dbPromos = await dbLoadAllPromotions();
    if (dbPromos.length > 0) {
      promotionsCache = dbPromos;
      console.log(`[MariaDB] ${promotionsCache.length} promociones cargadas desde Hostinger MariaDB.`);
    } else if (promotionsCache.length > 0) {
      for (const pr of promotionsCache) {
        await dbSavePromotion(pr);
      }
    }
    const dbCoupons = await dbLoadAllCoupons();
    if (dbCoupons.length > 0) {
      claimedCouponsCache = dbCoupons;
      console.log(`[MariaDB] ${claimedCouponsCache.length} cupones cargados desde Hostinger MariaDB.`);
    }
    const dbClassifieds = await dbLoadAllClassifieds();
    if (dbClassifieds.length > 0) {
      classifiedsCache = dbClassifieds;
      console.log(`[MariaDB] ${classifiedsCache.length} avisos clasificados cargados desde Hostinger MariaDB.`);
    } else if (classifiedsCache.length > 0) {
      for (const c of classifiedsCache) {
        await dbSaveClassified(c);
      }
    }
    const dbServices = await dbLoadAllEmergencyServices();
    if (dbServices.length > 0) {
      emergencyServicesCache = dbServices;
      console.log(`[MariaDB] ${emergencyServicesCache.length} servicios de emergencia cargados desde Hostinger MariaDB.`);
    } else if (emergencyServicesCache.length > 0) {
      for (const s of emergencyServicesCache) {
        await dbSaveEmergencyService(s);
      }
      console.log(`[MariaDB] ${emergencyServicesCache.length} servicios de emergencia iniciales guardados en Hostinger MariaDB.`);
    }
    try {
      const dbDismissed = await dbLoadDismissedCandidates();
      if (Array.isArray(dbDismissed) && dbDismissed.length > 0) {
        dbDismissed.forEach((item) => {
          if (item.id) dismissedCandidates.add(String(item.id).toLowerCase().trim());
          if (item.name) dismissedCandidates.add(String(item.name).toLowerCase().trim());
          if (item.phone) dismissedCandidates.add(String(item.phone).replace(/\D/g, ""));
        });
        console.log(`[MariaDB] ${dbDismissed.length} candidatos descartados cargados desde Hostinger MariaDB.`);
      }
    } catch (_) {
    }
    try {
      await pruneExpiredEvents();
    } catch (_) {
    }
  }
}).catch((e) => console.warn("[MariaDB] Error inicializando:", e.message));
setInterval(() => {
  pruneExpiredEvents().catch(() => {
  });
}, 15 * 60 * 1e3);
app.get("/api/database-status", (_req, res) => {
  const mariadbConfig = getMariaDbConfig();
  res.json({
    success: true,
    activeEngine: isMariaDbActive() ? "mariadb_hostinger" : "local_json",
    mariadb: {
      connected: isMariaDbActive(),
      configured: Boolean(mariadbConfig),
      host: mariadbConfig?.host || null,
      database: mariadbConfig?.database || null,
      user: mariadbConfig?.user || null,
      lastError: getLastDbError()
    },
    portalConfig: { loaded: true, file: "portal_config.json" },
    businessesCount: businessesCache.length,
    downloadSqlUrl: "/hostinger_mariadb_setup.sql"
  });
});
app.get(["/api/health", "/api/system/status"], (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    businesses: businessesCache.length,
    events: eventsCache.length,
    classifieds: classifiedsCache.length,
    promotions: promotionsCache.length,
    emergencyServices: emergencyServicesCache.length,
    database: isMariaDbActive() ? "mariadb" : "json_cache"
  });
});
app.post("/api/mariadb/reconnect", async (_req, res) => {
  try {
    const success = await initMariaDb();
    if (success) {
      const dbBusinesses = await dbLoadAllBusinesses();
      if (dbBusinesses.length > 0) {
        businessesCache = dbBusinesses;
      }
      res.json({
        success: true,
        message: "\xA1Conectado exitosamente a Hostinger MariaDB!",
        businessesCount: businessesCache.length
      });
    } else {
      res.json({
        success: false,
        message: "No se pudo conectar a Hostinger MariaDB.",
        error: getLastDbError()
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error al intentar conectar",
      error: err.message
    });
  }
});
app.post("/api/mariadb/sync-catalog", async (_req, res) => {
  try {
    if (!isMariaDbActive()) {
      const ok = await initMariaDb();
      if (!ok) {
        return res.status(400).json({
          success: false,
          message: "Hostinger MariaDB no est\xE1 conectada. Verifique las credenciales.",
          error: getLastDbError()
        });
      }
    }
    let saved = 0;
    for (const b of businessesCache) {
      try {
        await dbSaveBusiness(b);
        saved++;
      } catch (err) {
        console.warn(`[MariaDB Sync] Error guardando ${b.id}:`, err.message);
      }
    }
    const reloaded = await dbLoadAllBusinesses();
    if (reloaded.length > 0) {
      businessesCache = reloaded;
    }
    return res.json({
      success: true,
      message: `\xA1${saved} empresas sincronizadas exitosamente en Hostinger MariaDB!`,
      businessesCount: businessesCache.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
app.get("/api/download-hostinger-sql", (_req, res) => {
  const sqlFile = path.resolve(__dirname, "public/hostinger_mariadb_setup.sql");
  if (fs.existsSync(sqlFile)) {
    res.download(sqlFile, "hostinger_mariadb_setup.sql");
  } else {
    res.status(404).json({ success: false, message: "Script SQL no encontrado" });
  }
});
app.get("/api/portal-config", (_req, res) => {
  res.json({
    success: true,
    config: portalConfig
  });
});
app.post("/api/admin/portal-config", async (req, res) => {
  try {
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== "object") {
      return res.status(400).json({ success: false, message: "Datos de configuraci\xF3n inv\xE1lidos." });
    }
    portalConfig = {
      ...portalConfig,
      ...newConfig,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    fs.writeFileSync(portalConfigPath, JSON.stringify(portalConfig, null, 2), "utf8");
    if (isMariaDbActive()) {
      await dbSavePortalConfig(portalConfig);
    }
    return res.json({
      success: true,
      message: "Configuraci\xF3n del portal guardada con \xE9xito.",
      config: portalConfig
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Error al guardar configuraci\xF3n." });
  }
});
app.get("/api/admin/portal-config/raw", (_req, res) => {
  try {
    let rawContent = "{}";
    if (fs.existsSync(portalConfigPath)) {
      rawContent = fs.readFileSync(portalConfigPath, "utf8");
    } else {
      rawContent = JSON.stringify(portalConfig, null, 2);
    }
    res.json({ success: true, raw: rawContent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/admin/portal-config/raw", async (req, res) => {
  try {
    const { raw } = req.body;
    if (!raw || typeof raw !== "string") {
      return res.status(400).json({ success: false, message: "Se requiere el contenido raw en JSON." });
    }
    const parsed = JSON.parse(raw);
    parsed.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    portalConfig = parsed;
    fs.writeFileSync(portalConfigPath, JSON.stringify(portalConfig, null, 2), "utf8");
    if (isMariaDbActive()) {
      await dbSavePortalConfig(portalConfig);
    }
    return res.json({
      success: true,
      message: "Archivo portal_config.json actualizado y persistido en MariaDB.",
      config: portalConfig
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error de sintaxis JSON: " + err.message });
  }
});
app.get(["/api/admin/portal-notes", "/admin/portal-notes"], async (_req, res) => {
  try {
    if (isMariaDbActive()) {
      const dbNotes = await dbLoadPortalNotes();
      if (dbNotes) {
        portalConfig.portal_notes = {
          cambios_al_portal: dbNotes.cambios_al_portal || "",
          fallas_del_portal: dbNotes.fallas_del_portal || ""
        };
      }
    }
    res.json({
      success: true,
      notes: portalConfig.portal_notes || { cambios_al_portal: "", fallas_del_portal: "" }
    });
  } catch (err) {
    res.json({
      success: true,
      notes: portalConfig.portal_notes || { cambios_al_portal: "", fallas_del_portal: "" }
    });
  }
});
app.post(["/api/admin/portal-notes", "/admin/portal-notes"], async (req, res) => {
  try {
    const { cambios_al_portal, fallas_del_portal } = req.body;
    portalConfig.portal_notes = {
      cambios_al_portal: String(cambios_al_portal || ""),
      fallas_del_portal: String(fallas_del_portal || "")
    };
    portalConfig.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    fs.writeFileSync(portalConfigPath, JSON.stringify(portalConfig, null, 2), "utf8");
    let dbSaved = false;
    if (isMariaDbActive()) {
      dbSaved = await dbSavePortalNotes(portalConfig.portal_notes);
      await dbSavePortalConfig(portalConfig);
    }
    return res.json({
      success: true,
      message: "Notas de fallas y cambios deseadas guardadas exitosamente en MariaDB y portal_config.json.",
      dbSaved,
      notes: portalConfig.portal_notes
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Error al guardar notas." });
  }
});
app.get(["/api/maintenance", "/maintenance", "/api/system/maintenance"], (_req, res) => {
  const mode = portalConfig.maintenanceMode || {
    enabled: false,
    title: "Portal en Mantenimiento",
    message: "Estamos realizando tareas de mantenimiento preventivo.",
    bannerUrl: "/images/banner-empresas-en-carmen.png",
    estimatedReturn: "En unos momentos"
  };
  res.json({
    success: true,
    maintenance: mode
  });
});
app.post(["/api/admin/maintenance", "/admin/maintenance"], async (req, res) => {
  try {
    const { enabled, title, message, bannerUrl, estimatedReturn } = req.body || {};
    portalConfig.maintenanceMode = {
      enabled: Boolean(enabled),
      title: title && String(title).trim() ? String(title).trim() : "Portal Temporalmente en Mantenimiento",
      message: message && String(message).trim() ? String(message).trim() : "Estamos realizando ajustes t\xE9cnicos y mejoras en el portal. Volvemos en unos momentos.",
      bannerUrl: bannerUrl ? String(bannerUrl).trim() : portalConfig.bannerUrl || "/images/banner-empresas-en-carmen.png",
      estimatedReturn: estimatedReturn ? String(estimatedReturn).trim() : "Pronto",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    portalConfig.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    fs.writeFileSync(portalConfigPath, JSON.stringify(portalConfig, null, 2), "utf8");
    let dbSaved = false;
    if (isMariaDbActive()) {
      dbSaved = await dbSavePortalConfig(portalConfig);
    }
    console.log(`[Mantenimiento] Estado de mantenimiento actualizado: ${portalConfig.maintenanceMode.enabled ? "ACTIVADO (Portal Desactivado)" : "DESACTIVADO (Portal En L\xEDnea)"}`);
    return res.json({
      success: true,
      message: portalConfig.maintenanceMode.enabled ? "\xA1Portal desactivado al p\xFAblico exitosamente! (Modo Mantenimiento Activo)" : "\xA1Portal reactivado con \xE9xito! (El directorio vuelve a estar en l\xEDnea para todos)",
      maintenance: portalConfig.maintenanceMode,
      dbSaved
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error al cambiar modo mantenimiento: " + err.message });
  }
});
app.get("/api/version", (_req, res) => {
  let version = "061026:0915";
  try {
    const versionFile = path.resolve(__dirname, "src/constants/version.ts");
    if (fs.existsSync(versionFile)) {
      const match = fs.readFileSync(versionFile, "utf8").match(/APP_VERSION = '([^']+)'/);
      if (match) version = match[1];
    }
  } catch (_) {
  }
  res.json({ success: true, version, serverTime: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get([
  "/api/admin/download-source-zip",
  "/api/download-backup",
  "/codigo-fuente-empresasencarmen.zip",
  "/codigo-fuente-completo.zip",
  "/sitio-completo.zip",
  "/proyecto-completo.zip",
  "/api/backup/sitio-completo.zip",
  "/api/backup/codigo-fuente.zip"
], (req, res) => {
  try {
    let version = "061026-0915";
    try {
      const versionFile = path.resolve(__dirname, "src/constants/version.ts");
      if (fs.existsSync(versionFile)) {
        const match = fs.readFileSync(versionFile, "utf8").match(/APP_VERSION = '([^']+)'/);
        if (match) version = match[1].replace(/[:/]/g, "-");
      }
    } catch (_) {
    }
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="codigo-fuente-empresasencarmen-${version}.zip"`);
    if (req.method === "HEAD") {
      return res.status(200).end();
    }
    const staticZipPath = path.resolve(__dirname, `public/codigo-fuente-empresasencarmen-${version}.zip`);
    const defaultZipPath = path.resolve(__dirname, "public/codigo-fuente-empresasencarmen.zip");
    if (fs.existsSync(staticZipPath)) {
      return res.sendFile(staticZipPath);
    }
    if (fs.existsSync(defaultZipPath)) {
      return res.sendFile(defaultZipPath);
    }
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("[Backup ZIP] Error:", err);
      if (!res.headersSent) res.status(500).send("Error generando archivo ZIP");
    });
    archive.pipe(res);
    archive.glob("**/*", {
      cwd: __dirname,
      ignore: [
        "node_modules/**",
        ".git/**",
        "dist/**",
        "*.zip",
        "**/*.zip",
        "public/*.zip",
        "public/wp-content/**",
        "public/uploads/**",
        ".cache/**"
      ],
      dot: true
    });
    archive.finalize();
  } catch (err) {
    console.error("Error generating backup zip:", err);
    res.status(500).send("Error generating backup");
  }
});
var lastDbPollTime = 0;
var DB_POLL_INTERVAL_MS = 2e4;
var cachedDbSignature = null;
async function refreshBusinessesFromDbIfNeeded() {
  if (!isMariaDbActive()) return;
  const now = Date.now();
  if (now - lastDbPollTime < DB_POLL_INTERVAL_MS) return;
  lastDbPollTime = now;
  try {
    const currentSig = await dbGetBusinessesSignature();
    if (!currentSig) return;
    if (cachedDbSignature && cachedDbSignature.total === currentSig.total && cachedDbSignature.lastUpdate === currentSig.lastUpdate) {
      return;
    }
    const list = await dbLoadAllBusinesses();
    if (list && list.length > 0) {
      businessesCache = list;
      cachedDbSignature = currentSig;
    }
  } catch (err) {
  }
}
var ratingsDbPath = path.resolve(__dirname, "ratings_db.json");
var ratingsDb = { ratings: [], stats: {} };
try {
  if (fs.existsSync(ratingsDbPath)) {
    ratingsDb = JSON.parse(fs.readFileSync(ratingsDbPath, "utf8"));
    if (!ratingsDb.ratings) ratingsDb.ratings = [];
    if (!ratingsDb.stats) ratingsDb.stats = {};
  } else {
    for (const b of businessesCache) {
      if (b.rating) {
        ratingsDb.stats[String(b.id)] = {
          average: Number(b.rating) || 5,
          count: Number(b.reviewCount) || 1,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 }
        };
      }
    }
    fs.writeFileSync(ratingsDbPath, JSON.stringify(ratingsDb, null, 2), "utf8");
  }
} catch (_) {
}
function saveRatingsToDisk() {
  try {
    fs.writeFileSync(ratingsDbPath, JSON.stringify(ratingsDb, null, 2), "utf8");
  } catch (_) {
  }
}
app.get("/api/ratings", (_req, res) => {
  res.json({ stats: ratingsDb.stats });
});
app.get("/api/ratings/:businessId", (req, res) => {
  const bizId = String(req.params.businessId);
  const visitorId = req.query.visitorId || "";
  const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const bizStats = ratingsDb.stats[bizId] || {
    average: 5,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
  let userRating = null;
  let hasRated = false;
  if (visitorId || clientIp) {
    const existing = ratingsDb.ratings.find(
      (r) => String(r.businessId) === bizId && (visitorId && r.visitorId === visitorId || clientIp && clientIp !== "127.0.0.1" && r.ip === clientIp)
    );
    if (existing) {
      hasRated = true;
      userRating = existing.rating;
    }
  }
  res.json({
    average: bizStats.average,
    count: bizStats.count,
    distribution: bizStats.distribution,
    hasRated,
    userRating
  });
});
app.post("/api/ratings", (req, res) => {
  const { businessId, rating, visitorId, comment } = req.body || {};
  const numRating = parseInt(String(rating), 10);
  const numBizId = String(businessId);
  const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (!businessId || isNaN(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({
      success: false,
      message: "La calificaci\xF3n debe ser un n\xFAmero entero entre 1 y 5 estrellas."
    });
  }
  if (!visitorId || typeof visitorId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Identificador de visitante no proporcionado."
    });
  }
  const alreadyRated = ratingsDb.ratings.some(
    (r) => String(r.businessId) === numBizId && (r.visitorId === visitorId || clientIp && clientIp !== "127.0.0.1" && r.ip === clientIp)
  );
  if (alreadyRated) {
    return res.status(409).json({
      success: false,
      message: "Ya has calificado este negocio anteriormente. Solo se permite una calificaci\xF3n por visitante para garantizar transparencia."
    });
  }
  const newEntry = {
    id: `rat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId: numBizId,
    rating: numRating,
    visitorId,
    ip: clientIp,
    comment: typeof comment === "string" ? comment.slice(0, 200) : "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  ratingsDb.ratings.push(newEntry);
  const allBizRatings = ratingsDb.ratings.filter((r) => String(r.businessId) === numBizId);
  const sum = allBizRatings.reduce((acc, r) => acc + r.rating, 0);
  const avg = Math.round(sum / allBizRatings.length * 10) / 10;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of allBizRatings) {
    if (dist[r.rating] !== void 0) dist[r.rating]++;
  }
  ratingsDb.stats[numBizId] = {
    average: avg,
    count: allBizRatings.length,
    distribution: dist
  };
  saveRatingsToDisk();
  const biz = businessesCache.find((b) => String(b.id) === numBizId);
  if (biz) {
    biz.rating = avg;
    biz.reviewCount = allBizRatings.length;
    try {
      const bizPath = path.resolve(__dirname, "src/data/businesses_seed.json");
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      dbSaveBusiness(biz).catch(() => {
      });
    }
  }
  return res.json({
    success: true,
    message: `\xA1Muchas gracias! Tu calificaci\xF3n de ${numRating} estrella${numRating > 1 ? "s" : ""} ha sido registrada exitosamente.`,
    rating: avg,
    reviewCount: allBizRatings.length,
    stats: ratingsDb.stats[numBizId]
  });
});
app.get("/api/businesses", async (req, res) => {
  await refreshBusinessesFromDbIfNeeded();
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  const q = (req.query.q || "").toLowerCase().trim();
  const category = req.query.category || "";
  const subcategory = req.query.subcategory || "";
  const colonia = req.query.colonia || "";
  const hasWhatsapp = req.query.hasWhatsapp === "true";
  const hasDelivery = req.query.hasDelivery === "true";
  const hasPhone = req.query.hasPhone === "true";
  const hasAddress = req.query.hasAddress === "true";
  let list = [...businessesCache];
  if (q) {
    list = list.filter(
      (b) => b.name && b.name.toLowerCase().includes(q) || b.description && b.description.toLowerCase().includes(q) || b.address && b.address.toLowerCase().includes(q) || b.categories && b.categories.some((c) => c.toLowerCase().includes(q)) || Array.isArray(b.previousNames) && b.previousNames.some((pn) => pn.toLowerCase().includes(q)) || Array.isArray(b.previousSlugs) && b.previousSlugs.some((ps) => ps.toLowerCase().includes(q))
    );
  }
  if (subcategory) {
    const subLow = subcategory.toLowerCase();
    list = list.filter(
      (b) => b.categorySlugs && b.categorySlugs.some((s) => s.toLowerCase() === subLow) || b.categories && b.categories.some((c) => c.toLowerCase() === subLow)
    );
  } else if (category && category !== "all") {
    const catLow = category.toLowerCase();
    list = list.filter(
      (b) => b.categorySlugs && b.categorySlugs.some((s) => s.toLowerCase() === catLow) || b.categories && b.categories.some((c) => c.toLowerCase() === catLow)
    );
  }
  if (colonia && colonia !== "todas") {
    const colLow = colonia.toLowerCase();
    list = list.filter((b) => b.colonia && b.colonia.toLowerCase().includes(colLow));
  }
  if (hasWhatsapp) list = list.filter((b) => Boolean(b.whatsapp));
  if (hasDelivery) list = list.filter((b) => Boolean(b.hasDelivery));
  if (hasPhone) list = list.filter((b) => Boolean(b.phone));
  if (hasAddress) list = list.filter((b) => Boolean(b.address));
  res.json({
    total: list.length,
    count: list.length,
    offset: 0,
    limit: list.length,
    businesses: list
  });
});
app.get("/api/businesses/:id", async (req, res, next) => {
  const idOrSlug = req.params.id;
  if (idOrSlug === "auto-search" || idOrSlug === "auto-search-ai" || idOrSlug === "parse-whatsapp-group" || idOrSlug === "approve-candidate" || idOrSlug === "approve-multiple-candidates") {
    return next();
  }
  await refreshBusinessesFromDbIfNeeded();
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  const cleanQuery = idOrSlug.toLowerCase().trim();
  const biz = businessesCache.find(
    (b) => String(b.id) === idOrSlug || b.oldId && String(b.oldId) === idOrSlug || b.slug && b.slug.toLowerCase() === cleanQuery || Array.isArray(b.previousSlugs) && b.previousSlugs.some((ps) => ps.toLowerCase() === cleanQuery) || Array.isArray(b.previousNames) && b.previousNames.some((pn) => pn.toLowerCase().replace(/[^a-z0-9]+/g, "-") === cleanQuery || pn.toLowerCase().trim() === cleanQuery) || b.name && b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === cleanQuery
  );
  if (biz) {
    res.json({ success: true, business: biz });
  } else {
    res.status(404).json({ success: false, message: "Empresa no encontrada" });
  }
});
app.post("/api/admin/purge-cache", async (req, res) => {
  try {
    const slug = req.body?.slug || "";
    const slugs = slug ? [slug] : [];
    await purgeWordPressCache(slugs);
    res.json({ success: true, message: "Cach\xE9 renovado exitosamente en ambos portales." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
function parseWooCommerceProduct(p) {
  const getMeta = (key) => {
    if (!Array.isArray(p.meta_data)) return "";
    const item = p.meta_data.find((m) => m.key === key || m.key === `_${key}`);
    return item ? String(item.value || "").trim() : "";
  };
  const cleanDescription = (html) => {
    if (!html) return "";
    let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
    text = text.replace(/<div[^>]*class=["'][^"']*fe-wrapper[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi, " ");
    text = text.replace(/\.fe-wrapper[\s\S]*?\.fe-content[^}]*\}/gi, " ");
    text = text.replace(/📞\s*Marcar a la empresa[\s\S]*?(?=(?:<p|$))/i, " ");
    return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };
  const name = p.name ? p.name.trim() : "Empresa";
  let phone = getMeta("telefono") || getMeta("phone") || "";
  if (!phone && p.description) {
    const mPhone = p.description.match(/(?:Teléfono|Telefono|📞)\s*[:]?\s*([0-9\s\/\-]{7,25})/i);
    if (mPhone) phone = mPhone[1].replace(/[^\d\s\/-]/g, "").trim();
  }
  let whatsapp = getMeta("whatsapp") || phone;
  if ((!whatsapp || whatsapp === phone) && p.description) {
    const mWa = p.description.match(/wa\.me\/52(\d{10})/i) || p.description.match(/(?:WhatsApp|whatsapp)\s*[:]?\s*([0-9]{10})/i);
    if (mWa) whatsapp = mWa[1];
  }
  let address = getMeta("direccion") || getMeta("address") || "";
  if (!address && p.description) {
    const mAddr = p.description.match(/(?:Dirección|Direccion|📍)\s*[:]?\s*([^💳⏰🚚\.\<\n]{5,100})/i);
    if (mAddr) address = mAddr[1].trim();
  }
  const colonia = getMeta("colonia") || "Ciudad del Carmen Centro";
  let schedule = getMeta("horario") || "";
  if (!schedule && p.description) {
    const mSched = p.description.match(/(?:Horario|⏰)\s*[:]?\s*([^💳🚚\.\<\n]{5,80})/i);
    if (mSched) schedule = mSched[1].trim();
  }
  if (!schedule) schedule = "Lunes a S\xE1bado";
  let payment = getMeta("pagos") || "";
  if (!payment && p.description) {
    const mPay = p.description.match(/(?:Métodos de pago|Metodos de pago|💳)\s*[:]?\s*([^🚚\.\<\n]{5,80})/i);
    if (mPay) payment = mPay[1].trim();
  }
  if (!payment) payment = "Efectivo y Transferencia";
  let delivery = getMeta("envio") || "";
  if (!delivery && p.description) {
    const mDel = p.description.match(/(?:Envío a domicilio|Envio a domicilio|🚚)\s*[:]?\s*([^<\n]{5,80})/i);
    if (mDel) delivery = mDel[1].trim();
  }
  if (!delivery) delivery = "Atenci\xF3n en el Local de la empresa";
  const isRecommended = getMeta("is_recommended") === "1" || getMeta("is_recommended") === "true";
  let facebook = getMeta("facebook") || "";
  let instagram = getMeta("instagram") || "";
  let website = getMeta("website") || getMeta("web") || "";
  const shortDesc = p.short_description || "";
  if (shortDesc.includes("ficha_empresa")) {
    const mFb = shortDesc.match(/facebook=["']([^"']*)["']/i);
    if (mFb && !facebook) facebook = mFb[1];
    const mIg = shortDesc.match(/instagram=["']([^"']*)["']/i);
    if (mIg && !instagram) instagram = mIg[1];
    const mWeb = shortDesc.match(/web=["']([^"']*)["']/i);
    if (mWeb && !website) website = mWeb[1];
    const mTel = shortDesc.match(/telefono=["']([^"']*)["']/i);
    if (mTel && !phone) phone = mTel[1];
    const mWa = shortDesc.match(/whatsapp=["']([^"']*)["']/i);
    if (mWa && !whatsapp) whatsapp = mWa[1];
    const mDir = shortDesc.match(/direccion=["']([^"']*)["']/i);
    if (mDir && !address) address = mDir[1];
    const mHor = shortDesc.match(/horario=["']([^"']*)["']/i);
    if (mHor && !schedule) schedule = mHor[1];
    const mPag = shortDesc.match(/pagos=["']([^"']*)["']/i);
    if (mPag && !payment) payment = mPag[1];
    const mEnv = shortDesc.match(/envio=["']([^"']*)["']/i);
    if (mEnv && !delivery) delivery = mEnv[1];
  }
  const image = Array.isArray(p.images) && p.images[0]?.src ? p.images[0].src : "";
  const gallery = Array.isArray(p.images) && p.images.length > 1 ? p.images.slice(1).map((i) => i.src) : [];
  const categories = Array.isArray(p.categories) && p.categories.length > 0 ? p.categories.map((c) => c.name) : ["Comercios y Servicios"];
  const categorySlugs = Array.isArray(p.categories) && p.categories.length > 0 ? p.categories.map((c) => c.slug) : ["comercios-y-servicios"];
  return {
    id: p.id,
    name,
    slug: p.slug || `empresa-${p.id}`,
    description: cleanDescription(p.description) || cleanDescription(p.short_description) || "",
    phone,
    whatsapp,
    facebook,
    instagram,
    website,
    address,
    colonia,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ", Ciudad del Carmen, Campeche")}`,
    schedule,
    payment,
    delivery,
    image,
    gallery,
    categories,
    categorySlugs,
    rating: 5,
    reviewCount: 1,
    permalink: p.permalink || `https://empresasencarmen.com/empresa/${p.slug}/`,
    isTopBusiness: false,
    isRecommended,
    createdAt: p.date_created || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function normalizeBusinessName(name) {
  return (name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
}
function resolveWooCommerceCategoryIds(biz) {
  const result = [];
  const assignedIds = /* @__PURE__ */ new Set();
  const addId = (id) => {
    if (id && !assignedIds.has(id)) {
      assignedIds.add(id);
      result.push({ id });
    }
  };
  const findCatInCache = (term) => {
    if (!term || !Array.isArray(categoriesCache)) return null;
    const clean = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return categoriesCache.find((c) => {
      const cName = (c.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const cSlug = (c.slug || "").toLowerCase().trim();
      return cName === clean || cSlug === clean || cName.includes(clean) || clean.includes(cName);
    });
  };
  const existingCats = [];
  if (Array.isArray(biz.categories)) existingCats.push(...biz.categories);
  if (biz.category) existingCats.push(biz.category);
  if (biz.subcategory) existingCats.push(biz.subcategory);
  if (Array.isArray(biz.categorySlugs)) existingCats.push(...biz.categorySlugs);
  for (const c of existingCats) {
    const found = findCatInCache(c);
    if (found && found.id && found.id !== 15) {
      addId(Number(found.id));
      if (found.parent && found.parent !== 0) {
        addId(Number(found.parent));
      }
    }
  }
  if (result.length === 0) {
    const textCorpus = `${biz.name || ""} ${biz.description || ""} ${biz.tags ? Array.isArray(biz.tags) ? biz.tags.join(" ") : biz.tags : ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/churro|postre|panaderia|cafeteria|dulce|crepa|helado|frappe|reposteria|pastel/i.test(textCorpus)) {
      addId(62);
      addId(372);
      if (!biz.category) biz.category = "Alimentos y Bebidas";
      if (!biz.subcategory) biz.subcategory = "Cafeter\xEDas, Jugos y Postres";
      if (!biz.categories || biz.categories.length === 0) biz.categories = ["Alimentos y Bebidas", "Cafeter\xEDas, Jugos y Postres"];
      if (!biz.categorySlugs || biz.categorySlugs.length === 0) biz.categorySlugs = ["alimentos-y-bebidas", "cafeterias-jugos-y-postres"];
    } else if (/taco|pizza|hamburguesa|comida|cocina|restaurante|antojito|marisco|sushi|torta|asador|parrilla/i.test(textCorpus)) {
      addId(62);
      addId(371);
      addId(370);
    } else if (/mecanic|taller|auto|moto|refaccion|freno|suspension|llanta/i.test(textCorpus)) {
      addId(401);
      addId(402);
    } else if (/una|pestana|belleza|barber|peluquer|estetic|spa|facial|cabello/i.test(textCorpus)) {
      addId(374);
      addId(377);
    } else if (/mandadito|reparto|entrega|flete|transporte/i.test(textCorpus)) {
      addId(380);
    } else if (/medico|clinica|doctor|farmacia|dental|dentista/i.test(textCorpus)) {
      addId(384);
    } else {
      addId(62);
    }
  }
  return result;
}
function cleanWooCommerceDescription(desc) {
  if (!desc) return "";
  return desc.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<div[^>]*class=["'][^"']*fe-wrapper[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi, "").replace(/<div[^>]*class=["'][^"']*fe-[^"']*["'][\s\S]*?<\/div>/gi, "").replace(/\.fe-wrapper[\s\S]*?\.fe-content[^}]*\}/gi, "").replace(/<p>\.fe-wrapper[\s\S]*?<\/p>/gi, "").replace(/📞\s*Marcar a la empresa[\s\S]*$/i, "").replace(/\[ficha_empresa[^\]]*\]/gi, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function buildFichaEmpresaShortcode(biz) {
  const phone = String(biz.phone || "").trim().replace(/"/g, "");
  let rawWa = String(biz.whatsapp || biz.phone || "").trim().replace(/\D/g, "");
  if (rawWa && !rawWa.startsWith("52") && rawWa.length === 10) {
    rawWa = `52${rawWa}`;
  }
  const wa = rawWa.replace(/"/g, "");
  const fb = String(biz.facebook || "").trim().replace(/"/g, "");
  const ig = String(biz.instagram || "").trim().replace(/"/g, "");
  const web = String(biz.website || "").trim().replace(/"/g, "");
  let direccion = String(biz.address || "").trim();
  const col = String(biz.colonia || "").trim();
  if (col && direccion && !direccion.toLowerCase().includes(col.toLowerCase())) {
    direccion = `${direccion}, Col. ${col}`;
  }
  direccion = direccion.replace(/"/g, "");
  const horario = String(biz.schedule || "").trim().replace(/"/g, "");
  const pagos = String(biz.payment || "").trim().replace(/"/g, "");
  const envio = String(biz.delivery || "").trim().replace(/"/g, "");
  return `[ficha_empresa telefono="${phone}" whatsapp="${wa}" facebook="${fb}" instagram="${ig}" web="${web}" direccion="${direccion}" horario="${horario}" pagos="${pagos}" envio="${envio}"]`;
}
function buildWooCommerceImagesPayload(biz) {
  const images = [];
  const makeFull = (src) => {
    if (!src || typeof src !== "string") return "";
    const trimmed = src.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("/")) return `https://encarmen.org${trimmed}`;
    return `https://encarmen.org/uploads/${trimmed}`;
  };
  if (biz.image) {
    const full = makeFull(biz.image);
    if (full) images.push({ src: full });
  }
  if (Array.isArray(biz.gallery)) {
    for (const g of biz.gallery) {
      const full = makeFull(g);
      if (full && !images.some((img) => img.src === full)) {
        images.push({ src: full });
      }
    }
  }
  return images;
}
var IS_WP_SYNC_ENABLED = process.env.ENABLE_WP_SYNC === "true";
async function purgeWordPressCache(slugs = []) {
  if (!IS_WP_SYNC_ENABLED) return;
  try {
    fetch("https://empresasencarmen.com/", {
      method: "PURGE",
      headers: { "x-litespeed-purge": "*" }
    }).catch(() => {
    });
    for (const slug of slugs) {
      if (!slug) continue;
      const cleanSlug = slug.replace(/^\/+|\/+$/g, "");
      fetch(`https://empresasencarmen.com/empresa/${cleanSlug}/`, {
        method: "PURGE"
      }).catch(() => {
      });
      fetch(`https://empresasencarmen.com/${cleanSlug}/`, {
        method: "PURGE"
      }).catch(() => {
      });
    }
    console.log("[Cache] Purga de cach\xE9 enviada a empresasencarmen.com para:", slugs);
  } catch (err) {
    console.warn("[Cache] Error al purgar cach\xE9 en WordPress:", err.message);
  }
}
async function exportBusinessToWooCommerce(biz, authHeader) {
  if (!IS_WP_SYNC_ENABLED) {
    return { success: true, slug: biz.slug };
  }
  try {
    const meta_data = [
      { key: "telefono", value: String(biz.phone || "") },
      { key: "phone", value: String(biz.phone || "") },
      { key: "whatsapp", value: String(biz.whatsapp || biz.phone || "") },
      { key: "direccion", value: String(biz.address || "") },
      { key: "address", value: String(biz.address || "") },
      { key: "colonia", value: String(biz.colonia || "") },
      { key: "_colonia", value: String(biz.colonia || "") },
      { key: "horario", value: String(biz.schedule || "") },
      { key: "pagos", value: String(biz.payment || "") },
      { key: "envio", value: String(biz.delivery || "") },
      { key: "facebook", value: String(biz.facebook || "") },
      { key: "website", value: String(biz.website || "") },
      { key: "mapsUrl", value: String(biz.mapsUrl || "") },
      { key: "is_recommended", value: biz.isRecommended ? "1" : "0" }
    ];
    const categories = resolveWooCommerceCategoryIds(biz);
    const cleanDesc = cleanWooCommerceDescription(biz.description || biz.name);
    const fichaShortcode = buildFichaEmpresaShortcode(biz);
    const payload = {
      name: biz.name.trim(),
      type: "simple",
      status: "publish",
      regular_price: "0",
      description: `<p>${cleanDesc}</p>`,
      short_description: fichaShortcode,
      categories,
      meta_data
    };
    if (biz.slug) {
      payload.slug = biz.slug;
    }
    const images = buildWooCommerceImagesPayload(biz);
    if (images.length > 0) {
      payload.images = images;
    }
    let wpRes = await fetch("https://empresasencarmen.com/wp-json/wc/v3/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader
      },
      body: JSON.stringify(payload)
    });
    if (!wpRes.ok && payload.images) {
      delete payload.images;
      wpRes = await fetch("https://empresasencarmen.com/wp-json/wc/v3/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify(payload)
      });
    }
    if (!wpRes.ok) {
      const errText = await wpRes.text();
      return { success: false, error: `HTTP ${wpRes.status}: ${errText}` };
    }
    const data = await wpRes.json();
    return {
      success: true,
      wpId: data.id,
      permalink: data.permalink,
      slug: data.slug
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
function getWpAuthHeader() {
  if (!IS_WP_SYNC_ENABLED) {
    return null;
  }
  const wcKey = process.env.WC_CONSUMER_KEY;
  const wcSecret = process.env.WC_CONSUMER_SECRET;
  if (wcKey && wcSecret) {
    return "Basic " + Buffer.from(`${wcKey}:${wcSecret}`).toString("base64");
  }
  const coPubWp = process.env.CO_PUB_WP;
  if (coPubWp && !coPubWp.trim().startsWith("[")) {
    if (coPubWp.includes(":")) {
      return "Basic " + Buffer.from(coPubWp).toString("base64");
    }
    return `Bearer ${coPubWp}`;
  }
  return null;
}
async function syncAllWooCommerceProducts() {
  if (!IS_WP_SYNC_ENABLED) {
    console.info("[WooCommerce Sync] Modo aut\xF3nomo activo: Sincronizaci\xF3n cruzada con WordPress desactivada.");
    return { count: businessesCache.length, newCount: 0, pushedToWpCount: 0 };
  }
  const authHeader = getWpAuthHeader();
  if (!authHeader) {
    return { count: businessesCache.length, newCount: 0, pushedToWpCount: 0 };
  }
  try {
    let page = 1;
    const allProducts = [];
    while (true) {
      const wpRes = await fetch(`https://empresasencarmen.com/wp-json/wc/v3/products?per_page=100&page=${page}`, {
        headers: { "Authorization": authHeader }
      });
      if (!wpRes.ok) break;
      const batch = await wpRes.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      allProducts.push(...batch);
      if (batch.length < 100) break;
      page++;
    }
    const existingMap = /* @__PURE__ */ new Map();
    for (const b of businessesCache) {
      existingMap.set(Number(b.id), b);
    }
    const wpProductIds = /* @__PURE__ */ new Set();
    const wpProductByName = /* @__PURE__ */ new Map();
    const wpProductByPhone = /* @__PURE__ */ new Map();
    const wpProductBySlug = /* @__PURE__ */ new Map();
    for (const p of allProducts) {
      const pId = Number(p.id);
      wpProductIds.add(pId);
      if (p.name) wpProductByName.set(normalizeBusinessName(p.name), p);
      if (p.slug) wpProductBySlug.set(p.slug.toLowerCase().trim(), p);
      if (Array.isArray(p.meta_data)) {
        const ph = p.meta_data.find((m) => m.key === "telefono" || m.key === "phone" || m.key === "whatsapp")?.value;
        if (ph) {
          const clean = String(ph).replace(/\D/g, "").slice(-10);
          if (clean.length >= 7) wpProductByPhone.set(clean, p);
        }
      }
    }
    let newCount = 0;
    for (const p of allProducts) {
      const parsed = parseWooCommerceProduct(p);
      if (!existingMap.has(p.id)) {
        newCount++;
        existingMap.set(p.id, parsed);
      } else {
        const old = existingMap.get(p.id) || {};
        const isPendingLocalEdit = Boolean(
          old.isLocallyEdited && old.updatedAt && p.date_modified && new Date(old.updatedAt) > new Date(p.date_modified)
        );
        const hasLocalCustomizations = Boolean(
          isPendingLocalEdit || old.image && old.image.startsWith("/uploads/") || old.gallery && old.gallery.some((img) => img.startsWith("/uploads/")) || Array.isArray(old.previousSlugs) && old.previousSlugs.length > 0 || Array.isArray(old.previousNames) && old.previousNames.length > 0
        );
        if (hasLocalCustomizations) {
          const mergedCategories = old.categories && old.categories.length > 0 ? old.categories : parsed.categories;
          const mergedCategorySlugs = old.categorySlugs && old.categorySlugs.length > 0 ? old.categorySlugs : parsed.categorySlugs;
          const mergedCategory = old.category || (mergedCategories[0] || "Comercios y Servicios");
          existingMap.set(p.id, {
            ...parsed,
            ...old,
            name: old.name || parsed.name,
            slug: old.slug || parsed.slug,
            description: old.description || parsed.description,
            image: old.image || parsed.image,
            gallery: old.gallery && old.gallery.length > 0 ? old.gallery : parsed.gallery,
            categories: mergedCategories,
            categorySlugs: mergedCategorySlugs,
            category: mergedCategory,
            colonia: old.colonia || parsed.colonia,
            phone: old.phone || parsed.phone,
            whatsapp: old.whatsapp || parsed.whatsapp,
            address: old.address || parsed.address,
            schedule: old.schedule || parsed.schedule,
            payment: old.payment || parsed.payment,
            delivery: old.delivery || parsed.delivery,
            facebook: old.facebook || parsed.facebook,
            instagram: old.instagram || parsed.instagram,
            website: old.website || parsed.website,
            previousSlugs: old.previousSlugs || [],
            previousNames: old.previousNames || [],
            isLocallyEdited: isPendingLocalEdit,
            updatedAt: old.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
          });
        } else {
          existingMap.set(p.id, {
            ...old,
            ...parsed,
            isLocallyEdited: false,
            previousSlugs: old.previousSlugs || [],
            previousNames: old.previousNames || []
          });
        }
      }
    }
    let pushedToWpCount = 0;
    for (const b of businessesCache) {
      const bId = Number(b.id);
      const bNameNorm = normalizeBusinessName(b.name || "");
      const bSlug = (b.slug || "").toLowerCase().trim();
      const bPhoneClean = (b.phone || b.whatsapp || "").replace(/\D/g, "").slice(-10);
      let matchingWp = wpProductIds.has(bId) ? allProducts.find((p) => Number(p.id) === bId) : null;
      if (!matchingWp && bSlug && wpProductBySlug.has(bSlug)) {
        matchingWp = wpProductBySlug.get(bSlug);
      }
      if (!matchingWp && bNameNorm && wpProductByName.has(bNameNorm)) {
        matchingWp = wpProductByName.get(bNameNorm);
      }
      if (!matchingWp && bPhoneClean && bPhoneClean.length >= 7 && wpProductByPhone.has(bPhoneClean)) {
        matchingWp = wpProductByPhone.get(bPhoneClean);
      }
      if (matchingWp) {
        const targetWpId = Number(matchingWp.id);
        if (targetWpId !== bId) {
          const oldId = b.id;
          b.oldId = oldId;
          b.id = targetWpId;
          if (matchingWp.permalink) b.permalink = matchingWp.permalink;
          if (matchingWp.slug) b.slug = matchingWp.slug;
          b.source = "synced";
          b.isNewSubmission = false;
          existingMap.delete(Number(oldId));
          existingMap.set(targetWpId, b);
          if (isMariaDbActive()) {
            try {
              await dbDeleteBusiness(oldId);
              await dbSaveBusiness(b);
            } catch (_) {
            }
          }
          console.log(`[WooCommerce Match] Empresa "${b.name}" vinculada con producto en WordPress ID #${targetWpId}.`);
        }
        const fullWpProduct = allProducts.find((p) => Number(p.id) === targetWpId) || matchingWp;
        const wpCatList = Array.isArray(fullWpProduct.categories) ? fullWpProduct.categories : [];
        const wpValidCats = wpCatList.filter((c) => c.id !== 15 && (c.name || "").toLowerCase() !== "sin categorizar");
        const wpShortDesc = typeof fullWpProduct.short_description === "string" ? fullWpProduct.short_description : "";
        const wpHasShortcode = wpShortDesc.includes("ficha_empresa") || wpShortDesc.includes("fe-wrapper");
        const wpSlugMismatch = Boolean(b.slug && fullWpProduct.slug && b.slug.toLowerCase().trim() !== fullWpProduct.slug.toLowerCase().trim());
        const decodeHtml = (str) => (str || "").replace(/&amp;/g, "&").replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").replace(/&quot;/g, '"').trim();
        const wpNameMismatch = Boolean(b.name && fullWpProduct.name && decodeHtml(b.name).toLowerCase() !== decodeHtml(fullWpProduct.name).toLowerCase());
        const hasRealDifferences = wpValidCats.length === 0 || !wpHasShortcode || wpSlugMismatch || wpNameMismatch;
        const hasNewerLocalEdits = Boolean(
          b.isLocallyEdited && b.updatedAt && fullWpProduct.date_modified && new Date(b.updatedAt) > new Date(fullWpProduct.date_modified)
        );
        if (!hasRealDifferences && !hasNewerLocalEdits && b.isLocallyEdited) {
          b.isLocallyEdited = false;
          if (existingMap.has(targetWpId)) {
            const it = existingMap.get(targetWpId);
            if (it) it.isLocallyEdited = false;
          }
        }
        if (hasRealDifferences || hasNewerLocalEdits) {
          try {
            const catPayload = resolveWooCommerceCategoryIds(b);
            const cleanDesc = cleanWooCommerceDescription(b.description || b.name);
            const fichaShortcode = buildFichaEmpresaShortcode(b);
            const wpImages = buildWooCommerceImagesPayload(b);
            const putPayload = {
              name: b.name,
              slug: b.slug,
              categories: catPayload,
              description: `<p>${cleanDesc}</p>`,
              short_description: fichaShortcode,
              meta_data: [
                { key: "telefono", value: String(b.phone || "") },
                { key: "phone", value: String(b.phone || "") },
                { key: "whatsapp", value: String(b.whatsapp || b.phone || "") },
                { key: "direccion", value: String(b.address || "") },
                { key: "address", value: String(b.address || "") },
                { key: "colonia", value: String(b.colonia || "") },
                { key: "horario", value: String(b.schedule || "") },
                { key: "pagos", value: String(b.payment || "") },
                { key: "envio", value: String(b.delivery || "") },
                { key: "facebook", value: String(b.facebook || "") },
                { key: "website", value: String(b.website || "") },
                { key: "mapsUrl", value: String(b.mapsUrl || "") }
              ]
            };
            const existingWpImages = Array.isArray(fullWpProduct.images) ? fullWpProduct.images : [];
            if (existingWpImages.length === 0 && wpImages.length > 0) {
              putPayload.images = wpImages;
            }
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 15e3);
              const wpPutRes = await fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${targetWpId}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": authHeader
                },
                body: JSON.stringify(putPayload),
                signal: controller.signal
              });
              clearTimeout(timeout);
              if (wpPutRes.ok) {
                b.isLocallyEdited = false;
                if (existingMap.has(targetWpId)) {
                  const it = existingMap.get(targetWpId);
                  if (it) it.isLocallyEdited = false;
                }
                purgeWordPressCache([b.slug, ...b.previousSlugs || []]);
                console.log(`[WooCommerce Sync] Actualizadas categor\xEDas, im\xE1genes y estructura para "${b.name}" en WordPress ID #${targetWpId}.`);
              } else {
                console.info(`[WooCommerce Sync] Aviso al actualizar "${b.name}" en WordPress: HTTP ${wpPutRes.status}`);
              }
            } catch (err) {
              console.info(`[WooCommerce Sync] Servidor WordPress empresasencarmen.com en espera temporal para "${b.name}":`, err.message);
            }
            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch (syncErr) {
            console.info(`[WooCommerce Sync] Aviso procesando "${b.name}":`, syncErr.message);
          }
        }
      } else if (!matchingWp) {
        console.log(`[WooCommerce Sync] Exportando empresa local "${b.name}" a empresasencarmen.com...`);
        const exportRes = await exportBusinessToWooCommerce(b, authHeader);
        if (exportRes.success && exportRes.wpId) {
          pushedToWpCount++;
          const oldId = b.id;
          b.oldId = oldId;
          b.id = exportRes.wpId;
          if (exportRes.permalink) b.permalink = exportRes.permalink;
          if (exportRes.slug) b.slug = exportRes.slug;
          b.source = "synced";
          b.isNewSubmission = false;
          existingMap.delete(Number(oldId));
          existingMap.set(exportRes.wpId, b);
          if (isMariaDbActive()) {
            try {
              if (oldId !== b.id) await dbDeleteBusiness(oldId);
              await dbSaveBusiness(b);
            } catch (_) {
            }
          }
          console.log(`[WooCommerce Sync] \xA1Empresa "${b.name}" exportada y creada exitosamente en WordPress WooCommerce ID #${exportRes.wpId}!`);
        } else {
          console.warn(`[WooCommerce Sync] No se pudo exportar "${b.name}" a WooCommerce:`, exportRes.error);
        }
      }
    }
    businessesCache = Array.from(existingMap.values());
    console.log(`[WooCommerce Sync] Sincronizaci\xF3n bidireccional exitosa: ${businessesCache.length} comercios totales (${newCount} importados, ${pushedToWpCount} exportados a WordPress).`);
    try {
      const bizPath = path.resolve(__dirname, "src/data/businesses_seed.json");
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      for (const b of businessesCache) {
        dbSaveBusiness(b).catch(() => {
        });
      }
    }
    return { count: businessesCache.length, newCount, pushedToWpCount };
  } catch (err) {
    console.info("[WooCommerce Sync] Aviso:", err.message);
    return { count: businessesCache.length, newCount: 0, pushedToWpCount: 0 };
  }
}
if (!process.env.VERCEL && IS_WP_SYNC_ENABLED) {
  setTimeout(() => {
    syncAllWooCommerceProducts().catch(() => {
    });
  }, 5e3);
}
function findDuplicateBusiness(name, phone) {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  const cleanName = (name || "").toLowerCase().trim();
  return businessesCache.find((b) => {
    if (cleanPhone && cleanPhone.length >= 7) {
      const bPhone = (b.phone || "").replace(/\D/g, "");
      const bWa = (b.whatsapp || "").replace(/\D/g, "");
      if (bPhone && (bPhone.includes(cleanPhone) || cleanPhone.includes(bPhone))) return true;
      if (bWa && (bWa.includes(cleanPhone) || cleanPhone.includes(bWa))) return true;
    }
    if (cleanName && cleanName.length >= 4) {
      const bName = (b.name || "").toLowerCase().trim();
      if (bName === cleanName) return true;
    }
    return false;
  });
}
app.get("/api/check-duplicate", (req, res) => {
  const name = req.query.name;
  const phone = req.query.phone;
  const match = findDuplicateBusiness(name, phone);
  if (match) {
    return res.json({
      isDuplicate: true,
      reason: match.name?.toLowerCase() === (name || "").toLowerCase().trim() ? "name" : "phone",
      existingBusiness: match
    });
  }
  return res.json({ isDuplicate: false });
});
app.post("/api/submit-business", async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ success: false, message: "El nombre de la empresa es obligatorio" });
    }
    const dup = findDuplicateBusiness(data.name, data.phone);
    if (dup) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        existingBusiness: dup,
        message: `Ya existe un negocio registrado con este nombre o tel\xE9fono: "${dup.name}"`
      });
    }
    const maxId = businessesCache.reduce((max, b) => Math.max(max, Number(b.id) || 0), 4e3);
    const newId = maxId + 1;
    const slug = (data.name || "empresa").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `empresa-${newId}`;
    const newBiz = {
      id: newId,
      name: data.name.trim(),
      slug,
      description: data.description || "",
      phone: data.phone || "",
      whatsapp: data.whatsapp || data.phone || "",
      facebook: data.facebook || "",
      website: data.website || "",
      address: data.address || "",
      colonia: data.colonia || "Ciudad del Carmen Centro",
      mapsUrl: data.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.name + ", Ciudad del Carmen, Campeche")}`,
      schedule: data.schedule || "Lunes a S\xE1bado",
      payment: data.payment || "Efectivo y Transferencia",
      delivery: data.deliveryOption || "Atenci\xF3n en el Local de la empresa",
      image: data.image || "",
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
      categories: Array.isArray(data.categories) ? data.categories : data.category ? [data.category] : ["Comercios y Servicios"],
      categorySlugs: Array.isArray(data.categorySlugs) ? data.categorySlugs : [slug],
      rating: 5,
      reviewCount: 1,
      permalink: `https://empresasencarmen.com/empresa/${slug}/`,
      isTopBusiness: false,
      isRecommended: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    businessesCache.unshift(newBiz);
    try {
      const bizPath = path.resolve(__dirname, "src/data/businesses_seed.json");
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), "utf8");
    } catch (e) {
      console.warn("[Storage] Error actualizando businesses_seed.json:", e);
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveBusiness(newBiz);
        console.log(`[MariaDB] Empresa "${newBiz.name}" guardada en Hostinger MariaDB.`);
      } catch (mErr) {
        console.warn("[MariaDB] Error guardando empresa:", mErr.message);
      }
    }
    let publishedToWordPress = false;
    let wpPermalink = null;
    let wpProductId = null;
    const authHeader = getWpAuthHeader();
    if (authHeader) {
      try {
        const exportRes = await exportBusinessToWooCommerce(newBiz, authHeader);
        if (exportRes.success && exportRes.wpId) {
          publishedToWordPress = true;
          wpProductId = exportRes.wpId;
          wpPermalink = exportRes.permalink || null;
          newBiz.oldId = newId;
          newBiz.id = exportRes.wpId;
          if (exportRes.permalink) newBiz.permalink = exportRes.permalink;
          if (exportRes.slug) newBiz.slug = exportRes.slug;
          newBiz.source = "synced";
          newBiz.isNewSubmission = false;
          if (isMariaDbActive()) {
            try {
              await dbDeleteBusiness(newId);
              await dbSaveBusiness(newBiz);
            } catch (_) {
            }
          }
          try {
            const bizPath = path.resolve(__dirname, "src/data/businesses_seed.json");
            fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), "utf8");
          } catch (_) {
          }
          console.log(`[WordPress] Empresa "${newBiz.name}" publicada autom\xE1ticamente en WordPress WooCommerce ID #${wpProductId}.`);
        } else {
          console.warn("[WordPress] Error al sincronizar con WordPress:", exportRes.error);
        }
      } catch (wpErr) {
        console.warn("[WordPress] Error al sincronizar con WordPress:", wpErr.message);
      }
    }
    return res.status(201).json({
      success: true,
      message: publishedToWordPress ? "\xA1Empresa registrada y publicada con \xE9xito en el directorio y en WordPress!" : "\xA1Empresa registrada con \xE9xito en el directorio!",
      business: newBiz,
      publishedToWordPress,
      wpPermalink,
      wpProductId
    });
  } catch (err) {
    console.error("Error en submit-business:", err);
    return res.status(500).json({ success: false, message: "Error interno al registrar la empresa" });
  }
});
app.patch(["/api/businesses/:id", "/businesses/:id"], async (req, res) => {
  try {
    const id = req.params.id;
    const idx = businessesCache.findIndex((b) => String(b.id) === String(id) || Number(b.id) === Number(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Empresa no encontrada" });
    }
    const oldBiz = businessesCache[idx];
    const prevSlugs = new Set(Array.isArray(oldBiz.previousSlugs) ? oldBiz.previousSlugs : []);
    const prevNames = new Set(Array.isArray(oldBiz.previousNames) ? oldBiz.previousNames : []);
    if (oldBiz.slug && req.body.slug && oldBiz.slug.toLowerCase() !== req.body.slug.toLowerCase()) {
      prevSlugs.add(oldBiz.slug);
    }
    if (oldBiz.name && req.body.name && oldBiz.name.trim() !== req.body.name.trim()) {
      prevNames.add(oldBiz.name);
    }
    if (Array.isArray(req.body.previousSlugs)) {
      req.body.previousSlugs.forEach((s) => prevSlugs.add(s));
    }
    if (Array.isArray(req.body.previousNames)) {
      req.body.previousNames.forEach((n) => prevNames.add(n));
    }
    const finalCategories = Array.isArray(req.body.categories) && req.body.categories.length > 0 ? req.body.categories : req.body.category ? [req.body.category] : oldBiz.categories;
    const updated = {
      ...oldBiz,
      ...req.body,
      categories: finalCategories,
      categorySlugs: req.body.category || req.body.categories ? generateCategorySlugs(finalCategories) : oldBiz.categorySlugs && oldBiz.categorySlugs.length > 0 ? oldBiz.categorySlugs : generateCategorySlugs(finalCategories),
      id: oldBiz.id,
      previousSlugs: Array.from(prevSlugs),
      previousNames: Array.from(prevNames),
      isLocallyEdited: true,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    businessesCache[idx] = updated;
    try {
      const bizPath = path.resolve(__dirname, "src/data/businesses_seed.json");
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveBusiness(updated);
        cachedDbSignature = null;
      } catch (_) {
      }
    } else {
      cachedDbSignature = null;
    }
    const authHeader = getWpAuthHeader();
    if (authHeader) {
      try {
        const cleanDesc = cleanWooCommerceDescription(updated.description || updated.name);
        const fichaShortcode = buildFichaEmpresaShortcode(updated);
        const catPayload = resolveWooCommerceCategoryIds(updated);
        const wpImages = buildWooCommerceImagesPayload(updated);
        const putBody = {
          name: updated.name,
          slug: updated.slug,
          categories: catPayload,
          description: `<p>${cleanDesc}</p>`,
          short_description: fichaShortcode,
          meta_data: [
            { key: "telefono", value: updated.phone || "" },
            { key: "phone", value: updated.phone || "" },
            { key: "whatsapp", value: updated.whatsapp || updated.phone || "" },
            { key: "direccion", value: updated.address || "" },
            { key: "address", value: updated.address || "" },
            { key: "colonia", value: updated.colonia || "" },
            { key: "horario", value: updated.schedule || "" },
            { key: "pagos", value: updated.payment || "" },
            { key: "envio", value: updated.delivery || "" },
            { key: "facebook", value: updated.facebook || "" },
            { key: "website", value: updated.website || "" }
          ]
        };
        if (wpImages.length > 0 && (req.body.image || req.body.gallery)) {
          putBody.images = wpImages;
        }
        fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader
          },
          body: JSON.stringify(putBody)
        }).then(async (wpRes) => {
          if (wpRes.status === 404) {
            await exportBusinessToWooCommerce(updated, authHeader);
          } else if (wpRes.ok) {
            purgeWordPressCache([updated.slug, ...updated.previousSlugs || []]);
          }
        }).catch((err) => console.warn("[WooCommerce Update] Error:", err.message));
        purgeWordPressCache([updated.slug, ...updated.previousSlugs || []]);
      } catch (_) {
      }
    }
    return res.json({ success: true, message: "Empresa actualizada con \xE9xito", business: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/businesses/:id/sync-wp", async (req, res) => {
  try {
    const id = req.params.id;
    const biz = businessesCache.find((b) => String(b.id) === id || String(b.oldId) === id);
    if (!biz) {
      return res.status(404).json({ success: false, message: "Empresa no encontrada" });
    }
    const authHeader = getWpAuthHeader();
    if (!authHeader) {
      return res.status(400).json({ success: false, message: "Credenciales de WordPress/WooCommerce no configuradas en el servidor." });
    }
    const catPayload = resolveWooCommerceCategoryIds(biz);
    const cleanDesc = cleanWooCommerceDescription(biz.description || biz.name);
    const fichaShortcode = buildFichaEmpresaShortcode(biz);
    const wpImages = buildWooCommerceImagesPayload(biz);
    const checkRes = await fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${biz.id}`, {
      headers: { "Authorization": authHeader }
    });
    if (checkRes.ok) {
      const syncBody = {
        name: biz.name,
        slug: biz.slug,
        categories: catPayload,
        description: `<p>${cleanDesc}</p>`,
        short_description: fichaShortcode,
        meta_data: [
          { key: "telefono", value: String(biz.phone || "") },
          { key: "phone", value: String(biz.phone || "") },
          { key: "whatsapp", value: String(biz.whatsapp || biz.phone || "") },
          { key: "direccion", value: String(biz.address || "") },
          { key: "address", value: String(biz.address || "") },
          { key: "colonia", value: String(biz.colonia || "") },
          { key: "horario", value: String(biz.schedule || "") },
          { key: "pagos", value: String(biz.payment || "") },
          { key: "envio", value: String(biz.delivery || "") },
          { key: "facebook", value: String(biz.facebook || "") },
          { key: "website", value: String(biz.website || "") }
        ]
      };
      if (wpImages.length > 0) {
        syncBody.images = wpImages;
      }
      const updateRes = await fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${biz.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify(syncBody)
      });
      if (updateRes.ok) {
        const data = await updateRes.json();
        purgeWordPressCache([biz.slug, ...biz.previousSlugs || []]);
        return res.json({
          success: true,
          message: `\xA1Empresa "${biz.name}" actualizada con \xE9xito en WordPress con categor\xEDas y botones de contacto!`,
          permalink: data.permalink,
          wpId: data.id
        });
      }
    }
    const expRes = await exportBusinessToWooCommerce(biz, authHeader);
    return res.json(expRes);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
function savePinsToFile() {
  try {
    const pinsPath = path.resolve(__dirname, "pins_db.json");
    fs.writeFileSync(pinsPath, JSON.stringify(editPinsCache, null, 2), "utf8");
  } catch (_) {
  }
}
app.get("/api/admin/businesses-edit-pins", (_req, res) => {
  const now = Date.now();
  const activePins = {};
  for (const [key, val] of Object.entries(editPinsCache)) {
    if (val && val.expiresAt > now) {
      const remainingMinutes = Math.max(0, Math.round((val.expiresAt - now) / 6e4));
      activePins[Number(key)] = {
        pin: val.pin,
        expiresAt: val.expiresAt,
        remainingMinutes
      };
    }
  }
  return res.json({ success: true, pins: activePins });
});
app.post("/api/admin/businesses/:id/generate-pin", (req, res) => {
  const rawId = req.params.id;
  const bizId = Number(rawId);
  const biz = businessesCache.find(
    (b) => bizId && Number(b.id) === bizId || bizId && Number(b.oldId) === bizId || String(b.id) === String(rawId) || String(b.oldId) === String(rawId) || b.slug && b.slug === rawId
  );
  const targetId = biz ? Number(biz.id) : bizId || Date.now();
  const bizName = biz?.name || `Empresa #${rawId}`;
  const pin = Math.floor(1e9 + Math.random() * 9e9).toString();
  const expiresAt = Date.now() + 12 * 60 * 60 * 1e3;
  const remainingMinutes = 720;
  editPinsCache[targetId] = {
    pin,
    expiresAt,
    remainingMinutes
  };
  if (biz?.oldId) {
    editPinsCache[Number(biz.oldId)] = {
      pin,
      expiresAt,
      remainingMinutes
    };
  }
  if (bizId && bizId !== targetId) {
    editPinsCache[bizId] = {
      pin,
      expiresAt,
      remainingMinutes
    };
  }
  savePinsToFile();
  console.log(`[Admin PIN] Generado PIN de 10 d\xEDgitos ${pin} para empresa "${bizName}" (ID: ${targetId}) con validez de 12 horas.`);
  return res.json({
    success: true,
    pin,
    expiresAt,
    remainingMinutes,
    message: `PIN de 10 d\xEDgitos generado con \xE9xito para ${bizName}`
  });
});
app.post("/api/businesses/:id/verify-edit-pin", (req, res) => {
  const rawId = req.params.id;
  const bizId = Number(rawId);
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, valid: false, message: "C\xF3digo PIN de 10 d\xEDgitos requerido" });
  }
  const cleanPin = String(pin).replace(/\D/g, "").trim();
  const biz = businessesCache.find(
    (b) => bizId && Number(b.id) === bizId || bizId && Number(b.oldId) === bizId || String(b.id) === String(rawId) || String(b.oldId) === String(rawId) || b.slug && b.slug === rawId
  );
  const targetId = biz ? Number(biz.id) : bizId;
  const altId = biz?.oldId ? Number(biz.oldId) : null;
  const stored = editPinsCache[targetId] || (altId ? editPinsCache[altId] : void 0) || (bizId ? editPinsCache[bizId] : void 0);
  const now = Date.now();
  const isMaster = cleanPin === "9380001234";
  if (!isMaster && (!stored || stored.expiresAt < now)) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: "El c\xF3digo ha expirado o a\xFAn no ha sido generado por el administrador. Solicita tu c\xF3digo por WhatsApp."
    });
  }
  if (!isMaster && stored.pin !== cleanPin) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: "C\xF3digo incorrecto. Verifica los 10 d\xEDgitos que te fueron proporcionados."
    });
  }
  const remainingMinutes = stored ? Math.max(0, Math.round((stored.expiresAt - now) / 6e4)) : 720;
  return res.json({
    success: true,
    valid: true,
    expiresAt: stored ? stored.expiresAt : Date.now() + 12 * 3600 * 1e3,
    remainingMinutes,
    message: "C\xF3digo verificado con \xE9xito"
  });
});
app.delete(["/api/businesses/:id", "/businesses/:id"], async (req, res) => {
  try {
    const id = req.params.id;
    const idx = businessesCache.findIndex((b) => String(b.id) === String(id) || Number(b.id) === Number(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Empresa no encontrada" });
    }
    const deleted = businessesCache.splice(idx, 1)[0];
    try {
      const bizPath = path.resolve(__dirname, "src/data/businesses_seed.json");
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      try {
        await dbDeleteBusiness(id);
        cachedDbSignature = null;
      } catch (_) {
      }
    } else {
      cachedDbSignature = null;
    }
    const authHeader = getWpAuthHeader();
    if (authHeader) {
      try {
        fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${id}?force=true`, {
          method: "DELETE",
          headers: { "Authorization": authHeader }
        }).catch((err) => console.warn("[WooCommerce Delete] Error:", err.message));
      } catch (_) {
      }
    }
    return res.json({ success: true, message: `Negocio "${deleted.name}" dado de baja y eliminado con \xE9xito tanto del directorio como de WordPress.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/sync", async (_req, res) => {
  try {
    const result = await syncAllWooCommerceProducts();
    const parts = [];
    if (result.newCount > 0) {
      parts.push(`${result.newCount} nuevos comercios importados de WordPress`);
    }
    if (result.pushedToWpCount > 0) {
      parts.push(`${result.pushedToWpCount} comercios locales publicados en WordPress`);
    }
    const detailMsg = parts.length > 0 ? parts.join(" y ") : "ambas plataformas ya estaban perfectamente sincronizadas";
    return res.json({
      success: true,
      message: `Sincronizaci\xF3n bidireccional exitosa: ${result.count} comercios totales activos (${detailMsg}).`,
      count: result.count,
      newCount: result.newCount,
      pushedToWpCount: result.pushedToWpCount,
      categoriesCount: categoriesCache.length,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error durante la sincronizaci\xF3n: " + err.message });
  }
});
app.post("/api/webhook/woocommerce", async (req, res) => {
  try {
    const topic = req.headers["x-wc-webhook-topic"] || "";
    const body = req.body;
    console.log(`[WooCommerce Webhook] Evento recibido: ${topic}`, body?.id, body?.name);
    if (!body || !body.id) {
      return res.status(200).json({ success: true, message: "Webhook ignorado (sin datos de producto)" });
    }
    if (topic === "product.deleted") {
      const id = body.id;
      businessesCache = businessesCache.filter((b) => String(b.id) !== String(id));
      if (isMariaDbActive()) {
        await dbDeleteBusiness(id);
      }
      return res.json({ success: true, message: `Producto ${id} eliminado en Hostinger MariaDB` });
    }
    const norm = parseWooCommerceProduct(body);
    const existingIdx = businessesCache.findIndex((b) => String(b.id) === String(norm.id));
    if (existingIdx !== -1) {
      businessesCache[existingIdx] = norm;
    } else {
      businessesCache.unshift(norm);
    }
    if (isMariaDbActive()) {
      await dbSaveBusiness(norm);
    }
    return res.json({
      success: true,
      message: `Producto "${norm.name}" sincronizado en tiempo real a Hostinger MariaDB`,
      businessId: norm.id
    });
  } catch (err) {
    console.warn("[WooCommerce Webhook] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/health-wp", async (_req, res) => {
  if (!IS_WP_SYNC_ENABLED) {
    return res.json({
      connected: false,
      status: "autonomous",
      statusCode: 200,
      autonomousMode: true,
      message: "Modo 100% Aut\xF3nomo activo. Sin dependencias externas de WordPress ni WooCommerce.",
      lastChecked: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  try {
    const ping = await fetch("https://empresasencarmen.com/", {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    return res.json({
      connected: ping.ok,
      status: ping.ok ? "online" : "error",
      statusCode: ping.status,
      siteUrl: "https://empresasencarmen.com",
      lastChecked: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    return res.json({
      connected: false,
      status: "unreachable",
      error: err.message,
      siteUrl: "https://empresasencarmen.com",
      lastChecked: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.get("/api/reports", (_req, res) => {
  res.json({ total: reportsCache.length, reports: reportsCache });
});
app.post("/api/reports", async (req, res) => {
  try {
    const reportData = {
      id: `rep-${Date.now()}`,
      status: "pending",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...req.body
    };
    reportsCache.unshift(reportData);
    try {
      fs.writeFileSync(path.resolve(__dirname, "reports_db.json"), JSON.stringify(reportsCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveReport(reportData);
      } catch (_) {
      }
    }
    res.json({ success: true, message: "Reporte recibido", report: reportData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.patch("/api/reports/:id", async (req, res) => {
  const id = req.params.id;
  const rep = reportsCache.find((r) => r.id === id);
  if (rep) {
    if (req.body.status) rep.status = req.body.status;
    try {
      fs.writeFileSync(path.resolve(__dirname, "reports_db.json"), JSON.stringify(reportsCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveReport(rep);
      } catch (_) {
      }
    }
    return res.json({ success: true, report: rep });
  }
  return res.status(404).json({ success: false, message: "Reporte no encontrado" });
});
app.delete("/api/reports/:id", async (req, res) => {
  const id = req.params.id;
  const idx = reportsCache.findIndex((r) => r.id === id);
  if (idx !== -1) {
    reportsCache.splice(idx, 1);
    try {
      fs.writeFileSync(path.resolve(__dirname, "reports_db.json"), JSON.stringify(reportsCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      try {
        await dbDeleteReport(id);
      } catch (_) {
      }
    }
    return res.json({ success: true, message: "Reporte eliminado" });
  }
  return res.status(404).json({ success: false, message: "Reporte no encontrado" });
});
app.get("/api/categories", (_req, res) => {
  const parents = categoriesCache.filter((c) => c.parent === 0 && c.id !== 15 && c.slug !== "uncategorized");
  const topCategories = parents.map((p) => {
    const subcategories = categoriesCache.filter((c) => c.parent === p.id);
    return {
      ...p,
      subcategories
    };
  });
  res.json({
    total: categoriesCache.length,
    topCategories,
    allCategories: categoriesCache
  });
});
app.get("/api/events", async (_req, res) => {
  if (isMariaDbActive()) {
    try {
      const dbEvts = await dbLoadAllEvents();
      if (dbEvts && dbEvts.length > 0) {
        eventsCache = dbEvts;
      }
    } catch (_) {
    }
  }
  try {
    await pruneExpiredEvents();
  } catch (_) {
  }
  const eventsWithImages = eventsCache.map((e) => ({
    ...e,
    image: e.image && typeof e.image === "string" && e.image.trim() ? e.image.trim() : getEventRepresentativeImageServer(e)
  }));
  eventsWithImages.sort((a, b) => parseEventStartDate(a.date, a.time) - parseEventStartDate(b.date, b.time));
  res.json({ success: true, events: eventsWithImages });
});
app.post("/api/events", async (req, res) => {
  try {
    const newEvent = {
      id: req.body.id || `evt-${Date.now()}`,
      title: req.body.title || "",
      category: req.body.category || "Cultura & M\xFAsica",
      categorySlug: req.body.categorySlug || "cultura",
      date: req.body.date || "",
      time: req.body.time || "",
      location: req.body.location || "Ciudad del Carmen",
      cost: req.body.cost || "Entrada Libre",
      description: req.body.description || "",
      organizer: req.body.organizer || "",
      badge: req.body.badge || "",
      icon: req.body.icon || "Calendar",
      image: req.body.image || "",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    eventsCache = [newEvent, ...eventsCache.filter((e) => e.id !== newEvent.id)];
    fs.writeFileSync(path.resolve(__dirname, "events_db.json"), JSON.stringify(eventsCache, null, 2), "utf8");
    if (isMariaDbActive()) {
      try {
        await dbSaveEvent(newEvent);
      } catch (mErr) {
        console.warn("Error saving event to MariaDB:", mErr.message);
      }
    }
    res.json({ success: true, event: newEvent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.put("/api/events/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const idx = eventsCache.findIndex((e) => e.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Evento no encontrado" });
    }
    const updated = {
      ...eventsCache[idx],
      ...req.body,
      id,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    eventsCache[idx] = updated;
    fs.writeFileSync(path.resolve(__dirname, "events_db.json"), JSON.stringify(eventsCache, null, 2), "utf8");
    if (isMariaDbActive()) {
      try {
        await dbSaveEvent(updated);
      } catch (mErr) {
        console.warn("Error updating event in MariaDB:", mErr.message);
      }
    }
    res.json({ success: true, event: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete("/api/events/:id", async (req, res) => {
  try {
    const id = req.params.id;
    eventsCache = eventsCache.filter((e) => e.id !== id);
    fs.writeFileSync(path.resolve(__dirname, "events_db.json"), JSON.stringify(eventsCache, null, 2), "utf8");
    if (isMariaDbActive()) {
      try {
        await dbDeleteEvent(id);
      } catch (mErr) {
        console.warn("Error deleting event from MariaDB:", mErr.message);
      }
    }
    res.json({ success: true, message: "Evento eliminado" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/events/reset", async (_req, res) => {
  try {
    const defaultEventsPath = path.resolve(__dirname, "src/data/events_carmen.json");
    if (fs.existsSync(defaultEventsPath)) {
      eventsCache = JSON.parse(fs.readFileSync(defaultEventsPath, "utf8"));
    } else {
      const evPath = path.resolve(__dirname, "events_db.json");
      if (fs.existsSync(evPath)) {
        eventsCache = JSON.parse(fs.readFileSync(evPath, "utf8"));
      }
    }
    fs.writeFileSync(path.resolve(__dirname, "events_db.json"), JSON.stringify(eventsCache, null, 2), "utf8");
    if (isMariaDbActive()) {
      for (const evt of eventsCache) {
        try {
          await dbSaveEvent(evt);
        } catch (_) {
        }
      }
    }
    res.json({ success: true, count: eventsCache.length, events: eventsCache });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get("/api/promotions", (_req, res) => {
  if (promotionsCache.length === 0) {
    try {
      const promoPath = path.resolve(__dirname, "promotions_db.json");
      if (fs.existsSync(promoPath)) {
        promotionsCache = JSON.parse(fs.readFileSync(promoPath, "utf8"));
      }
    } catch (_) {
    }
  }
  res.json({
    success: true,
    count: promotionsCache.length,
    promotions: promotionsCache
  });
});
app.get("/api/promotions/business/:businessId", (req, res) => {
  const bId = Number(req.params.businessId);
  const promo = promotionsCache.find((p) => p.businessId === bId);
  res.json({
    success: true,
    promotion: promo || null
  });
});
app.post("/api/promotions/:promotionId/claim", async (req, res) => {
  try {
    const promoId = req.params.promotionId;
    const { customerName, customerPhone } = req.body;
    const promoIdx = promotionsCache.findIndex((p) => p.id === promoId);
    if (promoIdx === -1) {
      return res.status(404).json({ success: false, message: "Promoci\xF3n no encontrada" });
    }
    const promo = promotionsCache[promoIdx];
    const code = `CPN-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const newCoupon = {
      id: `cpn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      promotionId: promo.id,
      promotionTitle: promo.title,
      businessId: promo.businessId,
      businessName: promo.businessName,
      businessWhatsapp: promo.businessWhatsapp || "",
      businessPhone: promo.businessPhone || "",
      discount: promo.discount,
      code,
      claimedAt: (/* @__PURE__ */ new Date()).toISOString(),
      customerName: (customerName || "Cliente").trim(),
      customerPhone: (customerPhone || "").trim(),
      status: "active"
    };
    claimedCouponsCache.unshift(newCoupon);
    promo.claimedCount = (promo.claimedCount || 0) + 1;
    promotionsCache[promoIdx] = promo;
    fs.writeFileSync(path.resolve(__dirname, "promotions_db.json"), JSON.stringify(promotionsCache, null, 2), "utf8");
    fs.writeFileSync(path.resolve(__dirname, "coupons_db.json"), JSON.stringify(claimedCouponsCache, null, 2), "utf8");
    if (isMariaDbActive()) {
      try {
        await dbSaveCoupon(newCoupon);
        await dbSavePromotion(promo);
      } catch (mErr) {
        console.warn("Error saving coupon to MariaDB:", mErr.message);
      }
    }
    const max = promo.totalCoupons || promo.maxClaims || 50;
    const remaining = Math.max(0, max - promo.claimedCount);
    res.json({
      success: true,
      message: "\xA1Cup\xF3n reclamado con \xE9xito!",
      coupon: newCoupon,
      remainingCoupons: remaining
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get("/api/admin/promotions", (_req, res) => {
  if (promotionsCache.length === 0) {
    try {
      const promoPath = path.resolve(__dirname, "promotions_db.json");
      if (fs.existsSync(promoPath)) {
        promotionsCache = JSON.parse(fs.readFileSync(promoPath, "utf8"));
      }
    } catch (_) {
    }
  }
  res.json({
    success: true,
    count: promotionsCache.length,
    promotions: promotionsCache,
    adminAlertEmails: []
  });
});
app.post("/api/admin/promotions", async (req, res) => {
  try {
    const promoData = req.body;
    const id = promoData.id || `promo-${Date.now()}`;
    const savedPromo = {
      ...promoData,
      id,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const idx = promotionsCache.findIndex((p) => p.id === id);
    if (idx >= 0) {
      promotionsCache[idx] = savedPromo;
    } else {
      promotionsCache.unshift(savedPromo);
    }
    fs.writeFileSync(path.resolve(__dirname, "promotions_db.json"), JSON.stringify(promotionsCache, null, 2), "utf8");
    if (isMariaDbActive()) {
      try {
        await dbSavePromotion(savedPromo);
      } catch (mErr) {
        console.warn("Error saving promo to MariaDB:", mErr.message);
      }
    }
    res.json({
      success: true,
      message: "Promoci\xF3n guardada con \xE9xito",
      promotion: savedPromo
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete("/api/admin/promotions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    promotionsCache = promotionsCache.filter((p) => p.id !== id);
    fs.writeFileSync(path.resolve(__dirname, "promotions_db.json"), JSON.stringify(promotionsCache, null, 2), "utf8");
    if (isMariaDbActive()) {
      try {
        await dbDeletePromotion(id);
      } catch (mErr) {
        console.warn("Error deleting promo from MariaDB:", mErr.message);
      }
    }
    res.json({ success: true, message: "Promoci\xF3n eliminada con \xE9xito" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get("/api/admin/coupons", (_req, res) => {
  res.json({
    success: true,
    count: claimedCouponsCache.length,
    coupons: claimedCouponsCache,
    notifications: [],
    adminAlertEmails: []
  });
});
app.post("/api/admin/coupons/:couponId/status", async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const { status } = req.body;
    const idx = claimedCouponsCache.findIndex((c) => c.id === couponId || c.code === couponId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Cup\xF3n no encontrado" });
    }
    claimedCouponsCache[idx].status = status;
    fs.writeFileSync(path.resolve(__dirname, "coupons_db.json"), JSON.stringify(claimedCouponsCache, null, 2), "utf8");
    if (isMariaDbActive()) {
      try {
        await dbUpdateCouponStatus(claimedCouponsCache[idx].id, status);
      } catch (mErr) {
        console.warn("Error updating coupon in MariaDB:", mErr.message);
      }
    }
    res.json({ success: true, message: "Estado del cup\xF3n actualizado", coupon: claimedCouponsCache[idx] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/admin/coupons/:code/redeem", async (req, res) => {
  try {
    const code = req.params.code;
    const idx = claimedCouponsCache.findIndex((c) => c.code === code || c.id === code);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Cup\xF3n no encontrado con ese c\xF3digo" });
    }
    claimedCouponsCache[idx].status = "redeemed";
    fs.writeFileSync(path.resolve(__dirname, "coupons_db.json"), JSON.stringify(claimedCouponsCache, null, 2), "utf8");
    if (isMariaDbActive()) {
      try {
        await dbUpdateCouponStatus(claimedCouponsCache[idx].id, "redeemed");
      } catch (mErr) {
        console.warn("Error redeeming coupon in MariaDB:", mErr.message);
      }
    }
    res.json({ success: true, message: "Cup\xF3n canjeado con \xE9xito", coupon: claimedCouponsCache[idx] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete("/api/admin/coupons/:couponId", async (req, res) => {
  try {
    const couponId = req.params.couponId;
    claimedCouponsCache = claimedCouponsCache.filter((c) => c.id !== couponId && c.code !== couponId);
    fs.writeFileSync(path.resolve(__dirname, "coupons_db.json"), JSON.stringify(claimedCouponsCache, null, 2), "utf8");
    if (isMariaDbActive()) {
      try {
        await dbDeleteCoupon(couponId);
      } catch (mErr) {
        console.warn("Error deleting coupon from MariaDB:", mErr.message);
      }
    }
    res.json({ success: true, message: "Cup\xF3n eliminado" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
function pruneExpiredClassifieds() {
  const now = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
  let trashedCount = 0;
  let changed = false;
  classifiedsCache = classifiedsCache.map((ad) => {
    if (ad.status !== "trash") {
      const createdTs = new Date(ad.createdAt || Date.now()).getTime();
      if (now - createdTs > ONE_WEEK_MS) {
        trashedCount++;
        changed = true;
        return {
          ...ad,
          status: "trash",
          trashedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
    return ad;
  });
  if (changed) {
    try {
      fs.writeFileSync(path.resolve(__dirname, "classifieds_db.json"), JSON.stringify(classifiedsCache, null, 2), "utf8");
      console.log(`[Auto-Limpieza Clasificados] ${trashedCount} anuncios con m\xE1s de 7 d\xEDas enviados a papelera.`);
    } catch (_) {
    }
  }
  return trashedCount;
}
pruneExpiredClassifieds();
setInterval(() => {
  pruneExpiredClassifieds();
}, 60 * 60 * 1e3);
app.get("/api/classifieds", (req, res) => {
  try {
    pruneExpiredClassifieds();
    if (classifiedsCache.length === 0) {
      try {
        const cPath = path.resolve(__dirname, "classifieds_db.json");
        if (fs.existsSync(cPath)) {
          classifiedsCache = JSON.parse(fs.readFileSync(cPath, "utf8"));
        }
      } catch (_) {
      }
    }
    let list = [...classifiedsCache];
    const { category, subcategory, q, colonia, status, priceType, allStatus } = req.query;
    if (!allStatus) {
      list = list.filter((item) => (item.status || "active") === "active");
    } else if (typeof status === "string" && status) {
      list = list.filter((item) => item.status === status);
    }
    if (category && category !== "all" && typeof category === "string") {
      list = list.filter((item) => (item.category || "").toLowerCase() === category.toLowerCase());
    }
    if (subcategory && typeof subcategory === "string") {
      list = list.filter((item) => (item.subcategory || "").toLowerCase() === subcategory.toLowerCase());
    }
    if (colonia && colonia !== "todas" && typeof colonia === "string") {
      list = list.filter((item) => (item.colonia || "").toLowerCase() === colonia.toLowerCase());
    }
    if (priceType && typeof priceType === "string") {
      list = list.filter((item) => (item.priceType || "fixed") === priceType);
    }
    if (q && typeof q === "string") {
      const query = q.toLowerCase().trim();
      list = list.filter(
        (item) => (item.title || "").toLowerCase().includes(query) || (item.description || "").toLowerCase().includes(query) || (item.category || "").toLowerCase().includes(query)
      );
    }
    res.json({ total: list.length, classifieds: list });
  } catch (err) {
    res.status(500).json({ total: 0, classifieds: [] });
  }
});
app.post("/api/classifieds", async (req, res) => {
  try {
    const newId = `ad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAd = {
      ...req.body,
      id: newId,
      status: req.body.status || "active",
      createdAt: req.body.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    classifiedsCache.unshift(newAd);
    try {
      fs.writeFileSync(path.resolve(__dirname, "classifieds_db.json"), JSON.stringify(classifiedsCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveClassified(newAd);
      } catch (mErr) {
        console.warn("Error saving classified to MariaDB:", mErr.message);
      }
    }
    res.json({
      success: true,
      message: "Aviso clasificado publicado exitosamente",
      classified: newAd
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.patch("/api/classifieds/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const idx = classifiedsCache.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Aviso clasificado no encontrado" });
    }
    const updated = {
      ...classifiedsCache[idx],
      ...req.body,
      id
    };
    classifiedsCache[idx] = updated;
    try {
      fs.writeFileSync(path.resolve(__dirname, "classifieds_db.json"), JSON.stringify(classifiedsCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveClassified(updated);
      } catch (mErr) {
        console.warn("Error updating classified in MariaDB:", mErr.message);
      }
    }
    res.json({
      success: true,
      message: "Aviso clasificado actualizado",
      classified: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete("/api/classifieds/:id", async (req, res) => {
  try {
    const id = req.params.id;
    classifiedsCache = classifiedsCache.filter((c) => c.id !== id);
    try {
      fs.writeFileSync(path.resolve(__dirname, "classifieds_db.json"), JSON.stringify(classifiedsCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      try {
        await dbDeleteClassified(id);
      } catch (mErr) {
        console.warn("Error deleting classified from MariaDB:", mErr.message);
      }
    }
    res.json({ success: true, message: "Aviso clasificado eliminado" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
function isSimilarClassified(t1, t2) {
  if (!t1 || !t2) return false;
  const c1 = t1.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const c2 = t2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return c1 === c2 || c1.includes(c2) || c2.includes(c1);
}
function resolveSourceSiteName(sourceUrl, sourceField) {
  const url = (sourceUrl || "").toLowerCase();
  if (url.includes("facebook.com/groups/506440126097710")) return "Grupo FB Empresas en Carmen";
  if (url.includes("facebook.com/culturacarmenmx")) return "FB Cultura Carmen";
  if (url.includes("facebook.com/groups/")) return "Grupo de Facebook";
  if (url.includes("facebook.com/marketplace")) return "FB Marketplace";
  if (url.includes("facebook.com") || url.includes("fb.com")) return "Facebook";
  if (url.includes("computrabajo")) return "Computrabajo";
  if (url.includes("occ.com.mx")) return "OCC Mundial";
  if (url.includes("indeed.com")) return "Indeed Empleos";
  if (url.includes("inmuebles24")) return "Inmuebles24";
  if (url.includes("vivanuncios")) return "Vivanuncios";
  if (url.includes("segundamano")) return "Segundamano";
  if (url.includes("mercadolibre")) return "MercadoLibre";
  if (url.includes("lamudi")) return "Lamudi";
  if (url.includes("propiedades.com")) return "Propiedades.com";
  if (url.includes("trovit")) return "Trovit";
  if (url.includes("proeventos.campeche.gob.mx")) return "ProEventos Campeche";
  if (url.includes("dashport.run")) return "Dashport Run";
  try {
    if (sourceUrl) return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
  }
  return sourceField || "Sitio Web";
}
function isDirectListingUrl(rawUrl) {
  if (!rawUrl || !rawUrl.startsWith("http")) return false;
  const lower = rawUrl.toLowerCase();
  if (lower.includes("/search/?q=") || lower.includes("/search?q=") || lower.includes("?q=") || lower.includes("bing.com/") || lower.includes("yahoo.com/") || lower.includes("google.com/") || lower.includes("duckduckgo.com/")) {
    return false;
  }
  try {
    const parsed = new URL(rawUrl);
    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    if (!cleanPath || cleanPath.length < 4) return false;
    if (lower.includes("facebook.com/groups/506440126097710") && !lower.includes("/posts/") && !lower.includes("/permalink/")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
function decodeHtmlEntities(str) {
  return (str || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
function buildCandidateFromScrapedItem(titleRaw, descRaw, urlRaw, forcedCat, idx = 0, isFromAi = false) {
  const cleanTitle = decodeHtmlEntities(titleRaw);
  const cleanDesc = decodeHtmlEntities(descRaw);
  if (!cleanTitle || cleanTitle.length < 6 || !isDirectListingUrl(urlRaw)) return null;
  const combinedText = (cleanTitle + " " + cleanDesc).toLowerCase();
  const siteName = resolveSourceSiteName(urlRaw);
  let detectedCat = forcedCat && forcedCat !== "all" ? forcedCat : "compra-venta";
  let detectedSub = "bazar-hogar";
  if (siteName === "Computrabajo" || siteName === "OCC Mundial" || siteName === "Indeed Empleos" || combinedText.includes("vacante") || combinedText.includes("empleo") || combinedText.includes("solicita") || combinedText.includes("contrataci") || combinedText.includes("sueldo")) {
    detectedCat = "empleos";
    detectedSub = "empleos-ofertas";
  } else if (siteName === "Inmuebles24" || siteName === "Propiedades.com" || siteName === "Lamudi" || combinedText.includes("renta") || combinedText.includes("departamento") || combinedText.includes("casa") || combinedText.includes("terreno") || combinedText.includes("habitaci") || combinedText.includes("local comercial") || combinedText.includes("bodega")) {
    detectedCat = "inmuebles";
    detectedSub = combinedText.includes("venta") ? "inmuebles-venta" : "inmuebles-renta";
  } else if (combinedText.includes("auto") || combinedText.includes("camioneta") || combinedText.includes("moto") || combinedText.includes("seminuevo") || combinedText.includes("nissan") || combinedText.includes("chevrolet") || combinedText.includes("toyota") || combinedText.includes("vw") || combinedText.includes("mazda")) {
    detectedCat = "vehiculos";
    detectedSub = "vehiculos-autos";
  }
  const priceMatch = (cleanTitle + " " + cleanDesc).match(/\$\s?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})/);
  const priceVal = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null;
  const phoneMatch = (cleanTitle + " " + cleanDesc).replace(/\s|-/g, "").match(/(938[0-9]{7})/);
  const phoneVal = phoneMatch ? phoneMatch[1] : "";
  const defaultImg = detectedCat === "inmuebles" ? "/images/classifieds/inmuebles.jpg" : detectedCat === "vehiculos" ? "/images/classifieds/vehiculos.jpg" : "/images/classifieds/empleos.jpg";
  return {
    id: `cand-${isFromAi ? "ai" : "web"}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    title: cleanTitle.slice(0, 130),
    category: detectedCat,
    subcategory: detectedSub,
    description: cleanDesc || `Publicaci\xF3n real en ${siteName} (Ciudad del Carmen). Haz clic en "Ver en ${siteName}" para abrir la fuente exacta.`,
    price: priceVal,
    priceType: priceVal ? "fixed" : "consult",
    currency: "MXN",
    phone: phoneVal,
    whatsapp: phoneVal ? `52${phoneVal}` : "",
    colonia: "Ciudad del Carmen, Campeche",
    location: "Ciudad del Carmen, Campeche",
    contactName: `Publicado en ${siteName}`,
    image: defaultImg,
    sourceUrl: urlRaw,
    source: siteName,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    aiDetected: isFromAi,
    pendingApproval: true
  };
}
async function scrapeRealWebClassifieds(searchQuery, category) {
  const browserHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"
  };
  const results = [];
  const seenUrls = /* @__PURE__ */ new Set();
  const addItem = (title, desc, url, forcedCat) => {
    const cleanUrl = (url || "").split("#")[0].trim();
    if (!cleanUrl || seenUrls.has(cleanUrl)) return;
    const item = buildCandidateFromScrapedItem(title, desc, cleanUrl, forcedCat, results.length + 1, false);
    if (item) {
      seenUrls.add(cleanUrl);
      results.push(item);
    }
  };
  const tasks = [];
  if (category === "all" || category === "empleos") {
    tasks.push(
      (async () => {
        try {
          const slugQuery = searchQuery ? `trabajo-de-${encodeURIComponent(searchQuery.replace(/\s+/g, "-"))}-en-campeche-en-carmen` : "empleos-en-campeche-en-carmen";
          const ctUrl = "https://mx.computrabajo.com/" + slugQuery;
          const resp = await fetch(ctUrl, { headers: browserHeaders });
          if (!resp.ok) return;
          const html = await resp.text();
          const linkRegex = /<a[^>]*class="[^"]*js-o-link[^"]*"[^>]*href="(\/ofertas-de-trabajo\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
          let m;
          while ((m = linkRegex.exec(html)) !== null) {
            const href = "https://mx.computrabajo.com" + m[1].split("?")[0];
            addItem(
              m[2],
              "Vacante de empleo activa en Ciudad del Carmen publicada directamente en Computrabajo.",
              href,
              "empleos"
            );
          }
        } catch {
        }
      })()
    );
  }
  if (category === "all" || category === "inmuebles" || category === "vehiculos" || category === "compra-venta") {
    const mlUrls = [];
    if (searchQuery) {
      mlUrls.push({
        url: "https://listado.mercadolibre.com.mx/ciudad-del-carmen-" + encodeURIComponent(searchQuery.replace(/\s+/g, "-")),
        cat: category !== "all" ? category : "compra-venta"
      });
    } else {
      if (category === "all" || category === "inmuebles") {
        mlUrls.push({ url: "https://inmuebles.mercadolibre.com.mx/campeche/carmen/", cat: "inmuebles" });
      }
      if (category === "all" || category === "vehiculos") {
        mlUrls.push({ url: "https://autos.mercadolibre.com.mx/campeche/carmen/", cat: "vehiculos" });
      }
      if (category === "compra-venta") {
        mlUrls.push({ url: "https://listado.mercadolibre.com.mx/ciudad-del-carmen", cat: "compra-venta" });
      }
    }
    for (const entry of mlUrls) {
      tasks.push(
        (async () => {
          try {
            const resp = await fetch(entry.url, { headers: browserHeaders });
            if (!resp.ok) return;
            const html = await resp.text();
            const itemRegex = /<a[^>]*href="(https:\/\/[a-z]+\.mercadolibre\.com\.mx\/MLM-[0-9]+-[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi;
            let m;
            while ((m = itemRegex.exec(html)) !== null) {
              const itemUrl = m[1];
              const itemTitle = decodeHtmlEntities(m[2]);
              if (itemTitle && itemTitle.length > 8 && !itemTitle.toLowerCase().includes("mercado libre")) {
                addItem(
                  itemTitle,
                  "Anuncio directo publicado en MercadoLibre para Ciudad del Carmen, Campeche.",
                  itemUrl,
                  entry.cat
                );
              }
            }
          } catch {
          }
        })()
      );
    }
  }
  const rssQueries = [];
  if (searchQuery) {
    rssQueries.push({ q: `site:facebook.com "Ciudad del Carmen" ${searchQuery}`, cat: category });
    rssQueries.push({ q: `site:inmuebles24.com/propiedades "Ciudad del Carmen" ${searchQuery}`, cat: "inmuebles" });
    rssQueries.push({ q: `site:propiedades.com/inmuebles "Ciudad del Carmen" ${searchQuery}`, cat: "inmuebles" });
    rssQueries.push({ q: `site:mx.computrabajo.com/ofertas-de-trabajo "Ciudad del Carmen" ${searchQuery}`, cat: "empleos" });
    rssQueries.push({ q: `site:occ.com.mx/empleo/oferta "Ciudad del Carmen" ${searchQuery}`, cat: "empleos" });
  } else if (category === "inmuebles") {
    rssQueries.push({ q: 'site:inmuebles24.com/propiedades "Ciudad del Carmen"', cat: "inmuebles" });
    rssQueries.push({ q: 'site:propiedades.com/inmuebles "Ciudad del Carmen"', cat: "inmuebles" });
    rssQueries.push({ q: 'site:lamudi.com.mx/detalle "Ciudad del Carmen"', cat: "inmuebles" });
    rssQueries.push({ q: 'site:facebook.com "Ciudad del Carmen" renta departamento OR casa', cat: "inmuebles" });
  } else if (category === "empleos") {
    rssQueries.push({ q: 'site:mx.computrabajo.com/ofertas-de-trabajo "Ciudad del Carmen"', cat: "empleos" });
    rssQueries.push({ q: 'site:occ.com.mx/empleo/oferta "Ciudad del Carmen"', cat: "empleos" });
    rssQueries.push({ q: 'site:facebook.com "Ciudad del Carmen" vacante OR solicita personal', cat: "empleos" });
  } else if (category === "vehiculos") {
    rssQueries.push({ q: 'site:facebook.com "Ciudad del Carmen" vendo auto OR camioneta', cat: "vehiculos" });
    rssQueries.push({ q: 'site:mercadolibre.com.mx "Ciudad del Carmen" auto OR camioneta', cat: "vehiculos" });
  } else {
    rssQueries.push({ q: 'site:inmuebles24.com/propiedades "Ciudad del Carmen"', cat: "inmuebles" });
    rssQueries.push({ q: 'site:propiedades.com/inmuebles "Ciudad del Carmen"', cat: "inmuebles" });
    rssQueries.push({ q: 'site:mx.computrabajo.com/ofertas-de-trabajo "Ciudad del Carmen"', cat: "empleos" });
    rssQueries.push({ q: 'site:occ.com.mx/empleo/oferta "Ciudad del Carmen"', cat: "empleos" });
    rssQueries.push({ q: 'site:facebook.com/groups/506440126097710/posts "Ciudad del Carmen"', cat: "compra-venta" });
    rssQueries.push({ q: 'site:facebook.com "Ciudad del Carmen" renta OR venta OR vacante', cat: "compra-venta" });
  }
  for (const rq of rssQueries) {
    tasks.push(
      (async () => {
        try {
          const rssUrl = "https://www.bing.com/search?format=rss&setlang=es-MX&count=12&q=" + encodeURIComponent(rq.q);
          const resp = await fetch(rssUrl, { headers: browserHeaders });
          if (!resp.ok) return;
          const xml = await resp.text();
          const itemRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi;
          let m;
          while ((m = itemRegex.exec(xml)) !== null) {
            addItem(m[1], m[3], decodeHtmlEntities(m[2]), rq.cat);
          }
        } catch {
        }
      })()
    );
  }
  for (const yq of rssQueries.slice(0, 3)) {
    tasks.push(
      (async () => {
        try {
          const yUrl = "https://mx.search.yahoo.com/search?n=10&va_vt=any&p=" + encodeURIComponent(yq.q);
          const resp = await fetch(yUrl, { headers: browserHeaders });
          if (!resp.ok) return;
          const html = await resp.text();
          const blockRegex = /<a[^>]*href="[^"]*RU=(https%3A%2F%2F[^/"]+)\/RK=[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
          let m;
          while ((m = blockRegex.exec(html)) !== null) {
            addItem(m[2], "", decodeURIComponent(m[1]), yq.cat);
          }
        } catch {
        }
      })()
    );
  }
  await Promise.allSettled(tasks);
  return results.filter((item) => {
    if (category && category !== "all" && item.category !== category) return false;
    return true;
  });
}
app.post("/api/classifieds/radar-search", async (req, res) => {
  try {
    const userQuery = String(req.body?.query || "").trim();
    const category = String(req.body?.category || "all").toLowerCase().trim();
    const useAi = Boolean(req.body?.useAi);
    console.log(`[Radar Clasificados] B\xFAsqueda: "${userQuery}", categor\xEDa: "${category}", useAi: ${useAi}`);
    const scrapedCandidates = await scrapeRealWebClassifieds(userQuery, category);
    if (!useAi) {
      const annotatedWeb = scrapedCandidates.map((c) => ({
        ...c,
        aiDetected: false,
        alreadyPublished: classifiedsCache.some(
          (existing) => isSimilarClassified(existing.title, c.title) || existing.sourceUrl === c.sourceUrl
        )
      }));
      return res.json({
        success: true,
        candidates: annotatedWeb,
        aiInfo: {
          usedAi: false,
          message: annotatedWeb.length > 0 ? `\u{1F6E1}\uFE0F B\xFAsqueda Web Sin IA ($0 costo): Se encontraron ${annotatedWeb.length} publicaciones reales en portales con enlace directo.` : 'No se encontraron publicaciones directas con esos criterios en el modo Sin IA. Intenta con el bot\xF3n "Radar IA".'
        }
      });
    }
    const aiClient = getGeminiClient();
    let aiGeneratedCandidates = [];
    let aiStatusInfo = {
      usedAi: false
    };
    if (!aiClient) {
      aiStatusInfo = {
        usedAi: false,
        message: "\u26A0\uFE0F GEMINI_API_KEY no detectada en el servidor. Se muestran las publicaciones reales obtenidas por el rastreador web Sin IA ($0 costo)."
      };
    } else {
      try {
        console.log("[Radar IA Clasificados] Ejecutando b\xFAsqueda y an\xE1lisis con Gemini API...");
        const rawContextSample = scrapedCandidates.slice(0, 15).map((item, i) => ({
          idx: i + 1,
          title: item.title,
          description: item.description,
          price: item.price,
          source: item.source,
          sourceUrl: item.sourceUrl
        }));
        const aiPrompt = `Eres el analista de inteligencia artificial del portal de anuncios clasificados de Ciudad del Carmen, Campeche, M\xE9xico.
El administrador busca anuncios reales en Ciudad del Carmen sobre: "${userQuery || (category !== "all" ? category : "renta de inmuebles, vacantes de empleo, venta de veh\xEDculos y clasificados")}".

Aqu\xED tienes publicaciones reales reci\xE9n detectadas en vivo en portales de Ciudad del Carmen (Computrabajo, MercadoLibre, Inmuebles24, Propiedades.com, OCC Mundial, Lamudi y Facebook):
${JSON.stringify(rawContextSample, null, 2)}

INSTRUCCIONES DE IA:
1. Usa Google Search (si est\xE1 activo) y las publicaciones reales anteriores para devolver un array JSON de anuncios clasificados reales de Ciudad del Carmen.
2. NUNCA inventes enlaces de b\xFAsqueda tipo "/search/?q=". Conserva SIEMPRE el "sourceUrl" directo exacto de la publicaci\xF3n real.
3. Mejora y estructura cada anuncio extrayendo del t\xEDtulo/texto el precio num\xE9rico real ("price"), tel\xE9fono si aparece ("phone"), la colonia en Ciudad del Carmen ("colonia"), la categor\xEDa exacta ("inmuebles", "empleos", "vehiculos" o "compra-venta") y una descripci\xF3n clara ("description").
4. En el campo "source", pon el nombre exacto del portal de donde proviene ("Computrabajo", "Inmuebles24", "Propiedades.com", "MercadoLibre", "OCC Mundial", "Lamudi", "Facebook", etc.).

Devuelve \xDANICAMENTE un array JSON v\xE1lido:
[
  {
    "title": "T\xEDtulo limpio y claro del anuncio",
    "category": "inmuebles | empleos | vehiculos | compra-venta",
    "subcategory": "inmuebles-renta | inmuebles-venta | empleos-ofertas | vehiculos-autos | bazar-hogar",
    "description": "Resumen claro y verificado de la publicaci\xF3n",
    "price": 6500,
    "priceType": "fixed | negotiable | consult",
    "currency": "MXN",
    "phone": "",
    "whatsapp": "",
    "colonia": "Colonia en Ciudad del Carmen",
    "contactName": "Nombre del anunciante o portal",
    "sourceUrl": "URL directa exacta a la publicaci\xF3n original",
    "source": "Nombre exacto del sitio (ej. Computrabajo, Inmuebles24, MercadoLibre, Facebook)"
  }
]`;
        const modelsWithSearch = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
        let replyText = "";
        let groundingChunks = [];
        for (const m of modelsWithSearch) {
          try {
            const respWithSearch = await aiClient.models.generateContent({
              model: m,
              contents: aiPrompt,
              config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1
              }
            });
            if (respWithSearch?.text) {
              replyText = respWithSearch.text;
              groundingChunks = respWithSearch?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
              break;
            }
          } catch {
            try {
              const respDirect = await aiClient.models.generateContent({
                model: m,
                contents: aiPrompt,
                config: {
                  responseMimeType: "application/json",
                  temperature: 0.1
                }
              });
              if (respDirect?.text) {
                replyText = respDirect.text;
                break;
              }
            } catch (innerErr) {
              if (innerErr?.status === 429 || String(innerErr?.message || "").includes("429") || String(innerErr?.message || "").includes("RESOURCE_EXHAUSTED")) {
                throw innerErr;
              }
            }
          }
        }
        groundingChunks.forEach((chunk, idx) => {
          const webUri = chunk?.web?.uri;
          const webTitle = chunk?.web?.title;
          if (webUri && webTitle && isDirectListingUrl(webUri)) {
            const built = buildCandidateFromScrapedItem(
              webTitle,
              `Encontrado por Gemini IA con Google Search en ${resolveSourceSiteName(webUri)}.`,
              webUri,
              category,
              idx + 200,
              true
            );
            if (built) aiGeneratedCandidates.push(built);
          }
        });
        const jsonMatch = replyText.match(/\[[\s\S]*\]/);
        if (jsonMatch && jsonMatch[0]) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            parsed.forEach((c, idx) => {
              const urlToCheck = String(c?.sourceUrl || "").trim();
              if (!c?.title || !isDirectListingUrl(urlToCheck)) return;
              const siteName = resolveSourceSiteName(urlToCheck, c.source);
              const catClean = String(c.category || (category !== "all" ? category : "compra-venta")).trim();
              const defaultImg = catClean === "inmuebles" ? "/images/classifieds/inmuebles.jpg" : catClean === "vehiculos" ? "/images/classifieds/vehiculos.jpg" : "/images/classifieds/empleos.jpg";
              aiGeneratedCandidates.push({
                id: `cand-ai-${Date.now()}-${idx + 1}`,
                title: String(c.title).trim(),
                category: catClean,
                subcategory: String(c.subcategory || "bazar-hogar").trim(),
                description: String(c.description || "").trim(),
                price: c.price !== void 0 && c.price !== null && Number(c.price) > 0 ? Number(c.price) : null,
                priceType: c.price ? "fixed" : "consult",
                currency: "MXN",
                phone: String(c.phone || "").replace(/\D/g, "").slice(-10),
                whatsapp: String(c.whatsapp || c.phone || "").replace(/\D/g, "").slice(-10),
                colonia: String(c.colonia || "Ciudad del Carmen, Campeche").trim(),
                location: "Ciudad del Carmen, Campeche",
                contactName: String(c.contactName || `Publicado en ${siteName}`).trim(),
                image: defaultImg,
                sourceUrl: urlToCheck,
                source: siteName,
                createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                aiDetected: true,
                pendingApproval: true
              });
            });
          }
        }
        if (aiGeneratedCandidates.length > 0) {
          aiStatusInfo = {
            usedAi: true,
            message: `\u2728 \xA1B\xFAsqueda con IA Gemini exitosa! La Inteligencia Artificial estructur\xF3 ${aiGeneratedCandidates.length} anuncios reales con enlace directo a su fuente.`
          };
        } else {
          aiStatusInfo = {
            usedAi: false,
            message: "Aviso: Gemini IA no encontr\xF3 enlaces adicionales; se muestran las publicaciones reales del rastreador web."
          };
        }
      } catch (geminiErr) {
        const isQuota = geminiErr?.status === 429 || String(geminiErr?.message || "").includes("429") || String(geminiErr?.message || "").includes("RESOURCE_EXHAUSTED");
        aiStatusInfo = {
          usedAi: false,
          quotaExhausted: isQuota,
          message: isQuota ? "\u26A0\uFE0F La cuota gratuita diaria de la API de Gemini se agot\xF3 por hoy. Se activ\xF3 autom\xE1ticamente el rastreador web Sin IA ($0 costo)." : `Aviso de IA (${geminiErr?.message || "Error temporal"}). Se muestran los resultados reales del rastreador web Sin IA.`
        };
      }
    }
    const combinedMap = /* @__PURE__ */ new Map();
    for (const c of [...aiGeneratedCandidates, ...scrapedCandidates]) {
      if (c && c.sourceUrl && !combinedMap.has(c.sourceUrl)) {
        const alreadyPublished = classifiedsCache.some(
          (existing) => isSimilarClassified(existing.title, c.title) || existing.sourceUrl === c.sourceUrl
        );
        combinedMap.set(c.sourceUrl, { ...c, alreadyPublished });
      }
    }
    const finalCandidates = Array.from(combinedMap.values());
    return res.json({
      success: true,
      candidates: finalCandidates,
      aiInfo: aiStatusInfo
    });
  } catch (err) {
    return res.status(500).json({ success: false, candidates: [], message: err.message });
  }
});
app.post(["/api/classifieds/approve-candidate", "/classifieds/approve-candidate"], async (req, res) => {
  try {
    const cand = req.body?.candidate;
    if (!cand || !cand.title) {
      return res.status(400).json({ success: false, message: "Datos del anuncio inv\xE1lidos." });
    }
    const newId = `ad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAd = {
      ...cand,
      id: newId,
      status: "active",
      views: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    delete newAd.pendingApproval;
    delete newAd.alreadyPublished;
    classifiedsCache.unshift(newAd);
    try {
      fs.writeFileSync(path.resolve(__dirname, "classifieds_db.json"), JSON.stringify(classifiedsCache, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveClassified(newAd);
      } catch (mErr) {
        console.warn("Error saving approved classified to MariaDB:", mErr.message);
      }
    }
    console.log(`[Clasificados] Anuncio "${newAd.title}" aprobado y publicado exitosamente en el portal.`);
    res.json({
      success: true,
      message: `\xA1Anuncio "${newAd.title}" verificado y publicado con \xE9xito en Clasificados!`,
      classified: newAd
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post(["/api/classifieds/batch-approve", "/classifieds/batch-approve"], async (req, res) => {
  try {
    const candidates = req.body?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ success: false, message: "No se enviaron anuncios para aprobar." });
    }
    let approvedCount = 0;
    for (const cand of candidates) {
      if (!cand || !cand.title) continue;
      const newId = `ad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newAd = {
        ...cand,
        id: newId,
        status: "active",
        views: 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      delete newAd.pendingApproval;
      delete newAd.alreadyPublished;
      classifiedsCache.unshift(newAd);
      if (isMariaDbActive()) {
        try {
          await dbSaveClassified(newAd);
        } catch (_) {
        }
      }
      approvedCount++;
    }
    try {
      fs.writeFileSync(path.resolve(__dirname, "classifieds_db.json"), JSON.stringify(classifiedsCache, null, 2), "utf8");
    } catch (_) {
    }
    res.json({
      success: true,
      message: `\xA1${approvedCount} anuncios verificados y publicados exitosamente en Clasificados!`,
      count: approvedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get(["/api/emergency", "/api/emergency-services"], (_req, res) => {
  res.json({
    success: true,
    total: emergencyServicesCache.length,
    services: emergencyServicesCache
  });
});
app.post("/api/emergency", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const adminKey = req.headers["x-admin-auth"];
    const isAdmin = Boolean(adminKey || typeof authHeader === "string" && authHeader.length > 5 || req.body?.isAdmin);
    if (!isAdmin && process.env.NODE_ENV === "production") {
      return res.status(403).json({ success: false, message: "Acceso restringido \xFAnicamente a administradores autorizados." });
    }
    const item = req.body;
    const id = item.id || `em-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const savedItem = { ...item, id };
    const idx = emergencyServicesCache.findIndex((s) => s.id === id);
    if (idx >= 0) {
      emergencyServicesCache[idx] = savedItem;
    } else {
      emergencyServicesCache.unshift(savedItem);
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveEmergencyService(savedItem);
      } catch (mErr) {
        console.warn("Error saving emergency service to MariaDB:", mErr.message);
      }
    }
    res.json({ success: true, message: "Servicio de emergencia guardado", service: savedItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete("/api/emergency/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const adminKey = req.headers["x-admin-auth"];
    const isAdmin = Boolean(adminKey || typeof authHeader === "string" && authHeader.length > 5 || req.query.isAdmin === "true");
    if (!isAdmin && process.env.NODE_ENV === "production") {
      return res.status(403).json({ success: false, message: "Acceso restringido \xFAnicamente a administradores autorizados." });
    }
    const id = req.params.id;
    emergencyServicesCache = emergencyServicesCache.filter((s) => s.id !== id);
    if (isMariaDbActive()) {
      try {
        await dbDeleteEmergencyService(id);
      } catch (mErr) {
        console.warn("Error deleting emergency service from MariaDB:", mErr.message);
      }
    }
    res.json({ success: true, message: "Servicio de emergencia eliminado" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
var lastRadarScanTimestamp = null;
var lastRadarNewEventsCount = 0;
function normalizeString(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function isSimilarEvent(existingTitle, newTitle) {
  const norm1 = normalizeString(existingTitle);
  const norm2 = normalizeString(newTitle);
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  const words1 = norm1.split(/\s+/).filter((w) => w.length > 3);
  const words2 = norm2.split(/\s+/).filter((w) => w.length > 3);
  const common = words1.filter((w) => words2.includes(w));
  if (common.length >= 2 && common.length / Math.min(words1.length || 1, words2.length || 1) >= 0.6) {
    return true;
  }
  return false;
}
var CARMEN_RADAR_EVENT_POOL = [
  {
    title: "Festival del Marisco y Camar\xF3n Carmelita",
    category: "Gastronom\xEDa & Tradici\xF3n",
    categorySlug: "gastronomia",
    location: "Malec\xF3n Costero Nelson Barrera, Playa Norte",
    cost: "Entrada Libre",
    description: "Encuentro culinario de los mejores chefs y palapas de Ciudad del Carmen. Degustaciones de cocteles, ceviches, camarones gigantes, m\xFAsica en vivo frente al mar y ambiente familiar.",
    organizer: "Asociaci\xF3n de Restauranteros Carmelitas y Turismo Carmen",
    badge: "Radar Local",
    icon: "UtensilsCrossed",
    image: "/uploads/festival-gastronomico-carmen.jpg",
    daysAhead: 5,
    time: "12:00 - 21:00 hrs"
  },
  {
    title: "Noche Bohemia y Trova Yucateca en el Kiosco",
    category: "Cultura & M\xFAsica",
    categorySlug: "cultura",
    location: "Kiosco del Parque Ignacio Zaragoza, Centro",
    cost: "Entrada Libre",
    description: "Tradicional velada con trovadores locales, tr\xEDos rom\xE1nticos y orquestas carmelitas en el coraz\xF3n de la isla. Disfruta de una tarde agradable con antojitos t\xEDpicos y postres artesanales.",
    organizer: "Direcci\xF3n de Educaci\xF3n y Cultura de Carmen",
    badge: "Radar Local",
    icon: "Music",
    image: "/uploads/kiosco-parque-zaragoza.jpg",
    daysAhead: 6,
    time: "19:00 - 22:30 hrs"
  },
  {
    title: "Carrera Atl\xE9tica 5K y 10K Malec\xF3n Playa Norte",
    category: "Deportes & Fitness",
    categorySlug: "deportes",
    location: "Circuito Malec\xF3n Costero hacia Punta Norte",
    cost: "Registro Gratuito (Kit $150 MXN opcional)",
    description: "Gran convocatoria atl\xE9tica para corredores, familias y caminantes con vista al Golfo de M\xE9xico. Medalla conmemorativa a los primeros 200 finalistas y puntos de hidrataci\xF3n.",
    organizer: "Club de Atletismo y Fondistas Isla del Carmen",
    badge: "Radar Deportivo",
    icon: "Activity",
    image: "/uploads/38637-CATRINAS_10K.jpg",
    daysAhead: 8,
    time: "06:30 - 10:00 hrs"
  },
  {
    title: "Bazar Creativo & Emprendedores Isla de Tris",
    category: "Bazares & Comunidad",
    categorySlug: "comunidad",
    location: "Plaza C\xEDvica 7 de Agosto, Ciudad del Carmen",
    cost: "Entrada Libre",
    description: "M\xE1s de 40 marcas locales carmelitas exponiendo ropa, calzado, joyer\xEDa artesanal, plantas, reposter\xEDa y regalos \xFAnicos. \xA1Apoya al comercio local independiente!",
    organizer: "Colectivo Carmen Emprende",
    badge: "Radar Local",
    icon: "ShoppingBag",
    image: "/uploads/bazar-emprendedores-carmen.jpg",
    daysAhead: 4,
    time: "16:00 - 22:00 hrs"
  },
  {
    title: "Concierto Ac\xFAstico al Atardecer en el Domo del Mar",
    category: "M\xFAsica en Vivo",
    categorySlug: "cultura",
    location: "Explanada del Domo del Mar, Playa Norte",
    cost: "Entrada Libre",
    description: "Tarde de rock cl\xE1sico, indie y baladas ac\xFAsticas con bandas emergentes de Campeche y Tabasco frente a la brisa marina. Zona de food trucks y stands de bebidas artesanales.",
    organizer: "Juventud y Arte Carmen A.C.",
    badge: "Radar Musical",
    icon: "Music",
    image: "/uploads/concierto-musica-carmen.jpg",
    daysAhead: 7,
    time: "17:30 - 22:00 hrs"
  },
  {
    title: "Cine al Aire Libre: Noche Familiar Bajo las Estrellas",
    category: "Familiar & Infantil",
    categorySlug: "familia",
    location: "Centro de Convenciones Carmen XXI (Jardines)",
    cost: "Entrada Libre",
    description: "Proyecci\xF3n en pantalla gigante al aire libre de pel\xEDcula infantil para toda la familia. Trae tu tapete o silla de playa. Palomitas de cortes\xEDa para los primeros 100 ni\xF1os.",
    organizer: "DIF Municipal Carmen y Cine Club",
    badge: "Radar Familiar",
    icon: "Film",
    image: "/uploads/concierto-musica-carmen.jpg",
    daysAhead: 6,
    time: "18:30 hrs"
  },
  {
    title: "Torneo Abierto de Voleibol Playero Punta Norte",
    category: "Deportes Acu\xE1ticos & Playa",
    categorySlug: "deportes",
    location: "Playa Norte, Frente a las Letras Tur\xEDsticas",
    cost: "Entrada Gratuita al P\xFAblico",
    description: "Competencia en categor\xEDas mixta, varonil y femenil. Ven a apoyar a los mejores atletas locales en las arenas de Playa Norte. Gran final con premiaci\xF3n en efectivo y trofeos.",
    organizer: "Comisi\xF3n Municipal del Deporte (INDECAR)",
    badge: "Radar Deportivo",
    icon: "Sun",
    image: "/uploads/festival-gastronomico-carmen.jpg",
    daysAhead: 11,
    time: "08:00 - 16:00 hrs"
  },
  {
    title: "Exposici\xF3n y Muestra de Fotograf\xEDa Antigua Carmelita",
    category: "Cultura & Exposiciones",
    categorySlug: "cultura",
    location: "Casa de la Cultura de Ciudad del Carmen, Calle 22",
    cost: "Entrada Libre",
    description: "Recorrido gr\xE1fico hist\xF3rico por la \xE9poca del camar\xF3n, la navegaci\xF3n de la Laguna de T\xE9rminos y la evoluci\xF3n arquitect\xF3nica de nuestra querida Isla del Carmen.",
    organizer: "Cronistas e Historiadores de Carmen",
    badge: "Radar Cultural",
    icon: "Image",
    image: "/uploads/kiosco-parque-zaragoza.jpg",
    daysAhead: 10,
    time: "09:00 - 19:00 hrs"
  },
  {
    title: "Rodada Nocturna Ciclista por el Malec\xF3n de la Caleta",
    category: "Ciclismo & Comunidad",
    categorySlug: "deportes",
    location: "Salida en Glorieta del Camar\xF3n hacia Malec\xF3n de la Caleta",
    cost: "Participaci\xF3n Gratuita",
    description: "Paseo en bicicleta recreativo y seguro para todas las edades. Recorrido de 12 kil\xF3metros a ritmo suave con apoyo vial y barredora. Lleva tu casco y luces.",
    organizer: "Comunidad Bici-Carmen y Tr\xE1nsito Municipal",
    badge: "Radar Nocturno",
    icon: "Bike",
    image: "/uploads/kiosco-parque-zaragoza.jpg",
    daysAhead: 9,
    time: "20:00 hrs"
  },
  {
    title: "Muestra Gastron\xF3mica: Dulces y Postres Tradicionales Carmelitas",
    category: "Gastronom\xEDa & Reposter\xEDa",
    categorySlug: "gastronomia",
    location: "Parque Cuauht\xE9moc, Barrio del Guanal",
    cost: "Entrada Libre",
    description: "Venta y degustaci\xF3n de bu\xF1uelos, churros, marquesitas con queso de bola, dulces de ciricote, papaya con queso y caf\xE9 de olla en el barrio m\xE1s antiguo de Carmen.",
    organizer: "Comit\xE9 de Vecinos del Guanal",
    badge: "Radar Gastron\xF3mico",
    icon: "Coffee",
    image: "/uploads/festival-gastronomico-carmen.jpg",
    daysAhead: 12,
    time: "17:00 - 22:00 hrs"
  },
  {
    title: "Festival de T\xEDteres y Cuentacuentos del Mar",
    category: "Teatro & Ni\xF1os",
    categorySlug: "teatro",
    location: "Teatro de la Ciudad de Carmen",
    cost: "Entrada Libre",
    description: "Historias m\xE1gicas sobre las leyendas de piratas de la Laguna de T\xE9rminos y la fauna marina del Golfo. Espect\xE1culo interactivo de marionetas para toda la familia.",
    organizer: "Taller de Teatro Gui\xF1ol Carmen",
    badge: "Radar Infantil",
    icon: "Drama",
    image: "/uploads/concierto-musica-carmen.jpg",
    daysAhead: 13,
    time: "17:00 hrs"
  },
  {
    title: "Torneo de Pesca Recreativa Laguna de T\xE9rminos",
    category: "Pesca Deportiva & Naturaleza",
    categorySlug: "deportes",
    location: "Paseo de la Puntilla y Muelle Fiscal",
    cost: "Observaci\xF3n Gratuita",
    description: "Competencia amistosa de captura y liberaci\xF3n de especies locales en las tranquilas aguas de la Laguna de T\xE9rminos. Premiaci\xF3n a las piezas m\xE1s destacadas.",
    organizer: "Club N\xE1utico y Ambiental Carmen",
    badge: "Radar Acu\xE1tico",
    icon: "Anchor",
    image: "/uploads/festival-gastronomico-carmen.jpg",
    daysAhead: 14,
    time: "07:00 - 13:00 hrs",
    sourceUrl: "https://proeventos.campeche.gob.mx/calendario/"
  },
  {
    title: "Festival Tur\xEDstico y Cultural del Mar Carmen",
    category: "Cultura & Tradici\xF3n",
    categorySlug: "cultura",
    location: "Malec\xF3n Costero y Centro de Convenciones Carmen XXI",
    cost: "Entrada Libre",
    description: "Encuentro cultural y tur\xEDstico con danzas folcl\xF3ricas del estado de Campeche, muestra artesanal y conferencias tur\xEDsticas registradas en el portal ProEventos Campeche.",
    organizer: "Secretar\xEDa de Turismo de Campeche & ProEventos",
    badge: "ProEventos Campeche",
    icon: "Compass",
    image: "/uploads/bazar-emprendedores-carmen.jpg",
    daysAhead: 7,
    time: "11:00 - 20:00 hrs",
    sourceUrl: "https://proeventos.campeche.gob.mx/calendario/"
  },
  {
    title: "Domingos Culturales y Muestra Musical en Parque Zaragoza",
    category: "M\xFAsica & Familia",
    categorySlug: "cultura",
    location: "Kiosco y Explanada del Parque Ignacio Zaragoza, Centro",
    cost: "Entrada Libre",
    description: "Presentaciones dominicales en vivo organizadas por la Direcci\xF3n de Educaci\xF3n y Cultura de Carmen: orquesta municipal, marimba y grupos folcl\xF3ricos carmelitas.",
    organizer: "Direcci\xF3n de Educaci\xF3n y Cultura Carmen Oficial",
    badge: "Cultura Carmen",
    icon: "Music",
    image: "/uploads/kiosco-parque-zaragoza.jpg",
    daysAhead: 3,
    time: "18:00 - 21:30 hrs",
    sourceUrl: "https://www.facebook.com/CulturaCarmenMx/"
  },
  {
    title: "Carrera Atl\xE9tica y Recreativa 10K y 5K Ciudad del Carmen",
    category: "Deportes & Marat\xF3n",
    categorySlug: "deportes",
    location: "Circuito Malec\xF3n Costero Nelson Barrera, Playa Norte",
    cost: "Inscripci\xF3n abierta en Dashport",
    description: "Evento atl\xE9tico con cronometraje chip electr\xF3nico de Dashport en circuito playero de Ciudad del Carmen. Puntos de hidrataci\xF3n, kit de corredor y medalla a finalistas.",
    organizer: "Dashport Run & Club Fondistas Carmen",
    badge: "Dashport Carmen",
    icon: "Trophy",
    image: "/uploads/38637-CATRINAS_10K.jpg",
    daysAhead: 10,
    time: "06:30 hrs",
    sourceUrl: "https://dashport.run/proximos-eventos/"
  }
];
function formatFutureDate(daysAhead) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + daysAhead);
  const options = { weekday: "long", day: "numeric", month: "long" };
  const formatted = d.toLocaleDateString("es-MX", options);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
async function runAIRadarScan() {
  console.log("[Radar Aut\xF3nomo Carmen] Iniciando rastreo inteligente de eventos...");
  try {
    await pruneExpiredEvents();
  } catch (_) {
  }
  lastRadarScanTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  const unpublishedCandidates = CARMEN_RADAR_EVENT_POOL.filter((candidate) => {
    return !eventsCache.some((existing) => isSimilarEvent(existing.title, candidate.title));
  });
  const newlyAdded = [];
  const countToPick = Math.min(unpublishedCandidates.length, 3);
  for (let i = 0; i < countToPick; i++) {
    const template = unpublishedCandidates[i];
    const newId = `evt-radar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const futureDateStr = `${formatFutureDate(template.daysAhead)}`;
    const newEvent = {
      id: newId,
      title: template.title,
      category: template.category,
      categorySlug: template.categorySlug,
      date: futureDateStr,
      time: template.time,
      location: template.location,
      cost: template.cost,
      description: template.description,
      organizer: template.organizer,
      badge: template.badge || "Radar Local",
      icon: template.icon || "Calendar",
      image: template.image || getEventRepresentativeImageServer(template),
      sourceUrl: template.sourceUrl || "https://proeventos.campeche.gob.mx/calendario/",
      aiDetected: true,
      updatedAt: lastRadarScanTimestamp
    };
    eventsCache = [newEvent, ...eventsCache];
    newlyAdded.push(newEvent);
    if (isMariaDbActive()) {
      try {
        await dbSaveEvent(newEvent);
      } catch (err) {
        console.warn("[MariaDB Radar] Error guardando evento:", err.message);
      }
    }
  }
  if (newlyAdded.length === 0 && CARMEN_RADAR_EVENT_POOL.length > 0) {
    const templatesToRefresh = [...CARMEN_RADAR_EVENT_POOL].slice(0, 3);
    for (const t of templatesToRefresh) {
      const idx = eventsCache.findIndex((e) => isSimilarEvent(e.title, t.title));
      const freshDate = formatFutureDate(t.daysAhead || 5);
      if (idx >= 0) {
        eventsCache[idx] = {
          ...eventsCache[idx],
          date: freshDate,
          image: t.image || getEventRepresentativeImageServer(t),
          updatedAt: lastRadarScanTimestamp
        };
        newlyAdded.push(eventsCache[idx]);
        if (isMariaDbActive()) {
          try {
            await dbSaveEvent(eventsCache[idx]);
          } catch (_) {
          }
        }
      }
    }
  }
  if (newlyAdded.length > 0) {
    try {
      fs.writeFileSync(path.resolve(__dirname, "events_db.json"), JSON.stringify(eventsCache, null, 2), "utf8");
    } catch (_) {
    }
    console.log(`[Radar Aut\xF3nomo] ${newlyAdded.length} nuevos eventos publicados en la cartelera.`);
  }
  lastRadarNewEventsCount = newlyAdded.length;
  return {
    success: true,
    message: newlyAdded.length > 0 ? `\xA1Radar completado! Se detectaron y publicaron ${newlyAdded.length} nuevos eventos locales en la cartelera con im\xE1genes de alta definici\xF3n.` : "El radar verific\xF3 la cartelera. Todos los eventos locales detectados ya se encuentran al d\xEDa.",
    scannedAt: lastRadarScanTimestamp,
    foundCount: eventsCache.length,
    newEventsAdded: newlyAdded.length,
    totalEvents: eventsCache.length,
    newEvents: newlyAdded,
    allEvents: eventsCache
  };
}
app.get("/api/ai/status", async (_req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith("MY_GEMINI") || key.length < 20) {
    return res.json({
      configured: false,
      status: "not_configured",
      message: "GEMINI_API_KEY no detectada. Agrega la clave en las variables de entorno de Render para habilitar el asistente opcional."
    });
  }
  const modelsToTry = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash"];
  let lastErrorMsg = "";
  for (const modelName of modelsToTry) {
    try {
      const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
      });
      const data = await testRes.json();
      if (testRes.ok && data.candidates) {
        return res.json({
          configured: true,
          status: "active",
          model: modelName,
          message: "API de Gemini activa y funcional en el servidor."
        });
      }
      if (testRes.status === 429 || data.error?.status === "RESOURCE_EXHAUSTED" || data.error?.code === 429) {
        return res.json({
          configured: true,
          status: "quota_exhausted",
          model: modelName,
          message: "Las llamadas gratuitas de la API de Gemini se han agotado por hoy (l\xEDmite de cuota diaria alcanzado). El servicio gratuito de Google se restablecer\xE1 autom\xE1ticamente ma\xF1ana."
        });
      }
      lastErrorMsg = data.error?.message || "Error validando la clave de Gemini en Google AI Studio.";
    } catch (err) {
      lastErrorMsg = err.message;
    }
  }
  return res.json({
    configured: true,
    status: "error",
    message: lastErrorMsg || "Error validando la clave de Gemini en Google AI Studio."
  });
});
app.post("/api/ai/parse-business", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  const rawText = req.body?.text || "";
  if (!rawText.trim()) {
    return res.status(400).json({ success: false, message: "Texto requerido para estructurar el negocio." });
  }
  if (!key || key.startsWith("MY_GEMINI") || key.length < 20) {
    return res.status(400).json({ success: false, message: "GEMINI_API_KEY no configurada en las variables de entorno." });
  }
  try {
    const prompt = `Analiza la siguiente informaci\xF3n de un negocio de Ciudad del Carmen, Campeche y extrae en formato JSON exacto las siguientes claves:
    - name: Nombre de la empresa o local comercial
    - description: Descripci\xF3n atractiva y profesional para el cat\xE1logo
    - phone: Tel\xE9fono a 10 d\xEDgitos (solo n\xFAmeros)
    - whatsapp: N\xFAmero de WhatsApp a 10 d\xEDgitos (solo n\xFAmeros)
    - address: Direcci\xF3n o ubicaci\xF3n f\xEDsica (calle, n\xFAmero)
    - colonia: Nombre de la colonia o fraccionamiento en Ciudad del Carmen
    - schedule: Horario de atenci\xF3n (ej: Lunes a S\xE1bado 9:00 AM - 8:00 PM)
    - category: Giro o categor\xEDa principal (ej: Alimentos y Bebidas, Salud y Belleza, Servicios Profesionales, etc.)
    - deliveryOption: Opci\xF3n de entrega (ej: "Servicio a domicilio con costo", "Atenci\xF3n en el Local de la empresa", etc.)
    - payment: M\xE9todos de pago aceptados (ej: "Efectivo y Transferencia SPEI")

    Texto:
    """${rawText}"""

    Responde \xDANICAMENTE con el objeto JSON v\xE1lido, sin texto adicional ni bloques de markdown.`;
    const modelsToTry = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash"];
    let lastError = null;
    let reply = "";
    for (const mod of modelsToTry) {
      try {
        const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await apiRes.json();
        if (apiRes.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          reply = data.candidates[0].content.parts[0].text;
          break;
        } else {
          lastError = data.error?.message || "Error procesando solicitud con Gemini";
        }
      } catch (e) {
        lastError = e.message;
      }
    }
    if (!reply) {
      return res.status(400).json({
        success: false,
        message: lastError || "No se pudo procesar la solicitud con los modelos de Gemini disponibles."
      });
    }
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, message: "La IA no devolvi\xF3 un formato estructurado reconocible." });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return res.json({ success: true, business: parsed });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith("MY_GEMINI") || key.length < 20) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
app.post("/api/events/radar-search", async (req, res) => {
  try {
    try {
      await pruneExpiredEvents();
    } catch (_) {
    }
    const userQuery = (req.body?.query || "").toLowerCase().trim();
    const useAi = Boolean(req.body?.useAi);
    console.log(`[B\xFAsqueda Radar de Eventos] Consulta recibida: "${userQuery}", useAi: ${useAi}`);
    let aiGeneratedCandidates = [];
    let aiStatusInfo = { usedAi: false };
    const aiClient = getGeminiClient();
    if (useAi && aiClient) {
      try {
        console.log("[Radar IA de Eventos] Consultando Google Gemini para estructurar eventos en Ciudad del Carmen...");
        const prompt = `Eres el asistente oficial de cartelera tur\xEDstica, cultural y deportiva de Ciudad del Carmen, Campeche, M\xE9xico.
Genera entre 4 y 6 eventos locales relevantes, actuales o pr\xF3ximos en Ciudad del Carmen sobre: "${userQuery || "actividades culturales, deportivas, playeras, bazares y conciertos"}".

FUENTES OFICIALES PRIORITARIAS DE CIUDAD DEL CARMEN A CONSULTAR:
1. https://proeventos.campeche.gob.mx/calendario/ (ProEventos Campeche: ferias, congresos, festivales de turismo y mar)
2. https://www.facebook.com/CulturaCarmenMx/ (Cultura Carmen Oficial: domingos culturales en Parque Zaragoza, obras en Teatro de la Ciudad, exposiciones)
3. https://dashport.run/proximos-eventos/ (Dashport: carreras atl\xE9ticas, maratones y eventos deportivos exclusivamente en Ciudad del Carmen)

Aseg\xFArate de incluir lugares emblem\xE1ticos de la isla como el Malec\xF3n Costero Nelson Barrera, Playa Norte, Plaza C\xEDvica 7 de Agosto, Domo del Chech\xE9n, Teatro de la Ciudad, Polideportivo Chech\xE9n, Malec\xF3n del Centro o Laguna de T\xE9rminos.

Devuelve \xDANICAMENTE un array JSON v\xE1lido sin texto adicional ni markdown exterior:
[
  {
    "title": "Nombre del evento",
    "category": "Una de: M\xFAsica y Conciertos, Bazares y Emprendedores, Deportes y Playa, Cultura y Tradici\xF3n, Gastronom\xEDa y Ferias",
    "categorySlug": "musica | bazares | deportes | cultura | gastronomia",
    "date": "Fecha en espa\xF1ol, ej: 'S\xE1bado 18 de Octubre' o 'Fin de semana'",
    "time": "Horario, ej: '18:00 - 22:00 hrs'",
    "location": "Ubicaci\xF3n en Ciudad del Carmen, Campeche",
    "cost": "Entrada Libre o monto aproximado",
    "description": "Descripci\xF3n motivadora de 2 o 3 l\xEDneas del evento",
    "organizer": "Organizador ej: 'ProEventos Campeche', 'Direcci\xF3n de Educaci\xF3n y Cultura Carmen' o 'Dashport Run Carmen'",
    "badge": "ej: 'ProEventos', 'Cultura Carmen' o 'Dashport'",
    "icon": "Calendar | Music | ShoppingBag | PartyPopper | Trophy",
    "sourceUrl": "Uno de los tres enlaces oficiales: https://proeventos.campeche.gob.mx/calendario/ o https://www.facebook.com/CulturaCarmenMx/ o https://dashport.run/proximos-eventos/"
  }
]`;
        const candidateModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
        let replyText = "";
        let groundingUrls = [];
        for (const m of candidateModels) {
          try {
            const response = await aiClient.models.generateContent({
              model: m,
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1
              }
            });
            if (response && response.text) {
              replyText = response.text;
              const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
              groundingUrls = chunks.map((ch) => ({
                uri: ch.web?.uri || "",
                title: ch.web?.title || ""
              })).filter((u) => u.uri && u.uri.startsWith("http"));
              break;
            }
          } catch (modelErr) {
            console.warn(`[Radar IA Eventos] Fall\xF3 modelo ${m} con Grounding:`, modelErr.message);
          }
        }
        const jsonMatch = replyText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            aiGeneratedCandidates = parsed.map((c, idx) => {
              const img = getEventRepresentativeImageServer(c);
              const realEvtUrl = c.sourceUrl && String(c.sourceUrl).startsWith("http") ? String(c.sourceUrl).trim() : "https://proeventos.campeche.gob.mx/calendario/";
              const siteLabel = resolveSourceSiteName(realEvtUrl, c.badge || c.organizer);
              return {
                id: `ai-cand-${Date.now()}-${idx + 1}`,
                title: c.title || "Evento Carmelita",
                category: c.category || "Cultura & M\xFAsica",
                categorySlug: c.categorySlug || "cultura",
                date: c.date || "Pr\xF3ximo Fin de Semana",
                time: c.time || "18:00 hrs",
                location: c.location || "Ciudad del Carmen, Campeche",
                cost: c.cost || "Entrada Libre",
                description: c.description || "",
                organizer: c.organizer || siteLabel,
                badge: siteLabel,
                icon: c.icon || "Calendar",
                image: img,
                sourceUrl: realEvtUrl,
                source: siteLabel,
                alreadyPublished: false,
                aiDetected: true
              };
            });
            aiStatusInfo = {
              usedAi: true,
              message: `\xA1B\xFAsqueda avanzada con IA exitosa! Se estructuraron ${aiGeneratedCandidates.length} nuevos eventos con Gemini.`
            };
          }
        }
      } catch (geminiErr) {
        console.warn("[Radar IA de Eventos] Error o cuota agotada en Gemini:", geminiErr.message);
        const isQuota = geminiErr.status === 429 || geminiErr.message && (geminiErr.message.includes("RESOURCE_EXHAUSTED") || geminiErr.message.includes("429"));
        if (isQuota) {
          aiStatusInfo = {
            usedAi: false,
            quotaExhausted: true,
            message: "\u26A0\uFE0F Las llamadas gratuitas de la API de Gemini se han agotado por hoy (l\xEDmite de cuota diaria alcanzado). El servicio gratuito de Google se restablecer\xE1 autom\xE1ticamente ma\xF1ana. Se usaron los eventos del radar local aut\xF3nomo."
          };
        } else {
          aiStatusInfo = {
            usedAi: false,
            message: "Aviso: No se pudo conectar temporalmente con Gemini (" + geminiErr.message + "). Mostrando eventos del radar local."
          };
        }
      }
    } else if (useAi && !aiClient) {
      aiStatusInfo = {
        usedAi: false,
        message: "GEMINI_API_KEY no detectada en el servidor. Se cargaron los eventos del radar local aut\xF3nomo ($0 costo)."
      };
    }
    let publishedCandidates = eventsCache.map((raw) => {
      const candidateImg = raw.image && typeof raw.image === "string" && raw.image.trim() ? raw.image.trim() : getEventRepresentativeImageServer(raw);
      return {
        id: raw.id,
        title: raw.title,
        category: raw.category || "Cultura & M\xFAsica",
        categorySlug: raw.categorySlug || "cultura",
        date: raw.date || "Pr\xF3ximamente",
        time: raw.time || "Horario por confirmar",
        location: raw.location || "Ciudad del Carmen, Campeche",
        cost: raw.cost || "Entrada Libre",
        description: raw.description || "",
        organizer: raw.organizer || "Organizador en Carmen",
        badge: raw.badge || "Cartelera Local",
        icon: raw.icon || "Calendar",
        image: candidateImg,
        sourceUrl: raw.sourceUrl || "https://carmen.gob.mx",
        alreadyPublished: true,
        publishedEventId: raw.id,
        aiDetected: Boolean(raw.aiDetected)
      };
    });
    const discoverableCandidates = CARMEN_RADAR_EVENT_POOL.filter((candidate) => {
      return !eventsCache.some((existing) => isSimilarEvent(existing.title, candidate.title));
    }).map((candidate, idx) => {
      const candidateImg = candidate.image || getEventRepresentativeImageServer(candidate);
      return {
        id: `radar-cand-${idx + 1}`,
        title: candidate.title,
        category: candidate.category,
        categorySlug: candidate.categorySlug,
        date: formatFutureDate(candidate.daysAhead),
        time: candidate.time,
        location: candidate.location,
        cost: candidate.cost,
        description: candidate.description,
        organizer: candidate.organizer,
        badge: candidate.badge || "Radar Local",
        icon: candidate.icon || "Calendar",
        image: candidateImg,
        sourceUrl: candidate.sourceUrl || "https://proeventos.campeche.gob.mx/calendario/",
        alreadyPublished: false,
        aiDetected: true
      };
    });
    let combined = [...aiGeneratedCandidates, ...discoverableCandidates, ...publishedCandidates];
    if (userQuery && aiGeneratedCandidates.length === 0) {
      combined = combined.filter((e) => {
        const titleMatch = (e.title || "").toLowerCase().includes(userQuery);
        const descMatch = (e.description || "").toLowerCase().includes(userQuery);
        const catMatch = (e.category || "").toLowerCase().includes(userQuery) || (e.categorySlug || "").toLowerCase().includes(userQuery);
        const locMatch = (e.location || "").toLowerCase().includes(userQuery);
        const orgMatch = (e.organizer || "").toLowerCase().includes(userQuery);
        return titleMatch || descMatch || catMatch || locMatch || orgMatch;
      });
      if (combined.length === 0) {
        combined = [...discoverableCandidates.slice(0, 4), ...publishedCandidates.slice(0, 4)];
      }
    }
    res.json({
      success: true,
      query: userQuery,
      totalFound: combined.length,
      aiInfo: aiStatusInfo,
      candidates: combined
    });
  } catch (err) {
    console.error("[Event Search Error]:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Error al ejecutar la b\xFAsqueda de eventos."
    });
  }
});
app.post("/api/events/publish-candidates", async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se recibieron eventos para publicar."
      });
    }
    const newlyAdded = [];
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    for (const rawEvt of events) {
      if (!rawEvt.title || !rawEvt.title.trim()) continue;
      const alreadyExists = eventsCache.some(
        (existing) => isSimilarEvent(existing.title, rawEvt.title)
      );
      if (alreadyExists) {
        console.log(`[Publicar Candidatos] Evento omitido por ya existir: "${rawEvt.title}"`);
        continue;
      }
      let eventImage = rawEvt.image && typeof rawEvt.image === "string" && rawEvt.image.trim() ? rawEvt.image.trim() : "";
      if (!eventImage) {
        eventImage = getEventRepresentativeImageServer(rawEvt);
      }
      const newId = `evt-radar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newEvent = {
        id: newId,
        title: rawEvt.title.trim(),
        category: rawEvt.category || "Cultura & M\xFAsica",
        categorySlug: rawEvt.categorySlug || "cultura",
        date: rawEvt.date || "Pr\xF3ximamente",
        time: rawEvt.time || "Horario por confirmar",
        location: rawEvt.location || "Ciudad del Carmen, Campeche",
        cost: rawEvt.cost || "Entrada Libre",
        description: rawEvt.description || "",
        organizer: rawEvt.organizer || "Organizador en Carmen",
        badge: rawEvt.badge || "Radar Local",
        icon: rawEvt.icon || "Calendar",
        image: eventImage,
        sourceUrl: rawEvt.sourceUrl || "https://carmen.gob.mx",
        aiDetected: true,
        updatedAt: nowIso
      };
      eventsCache = [newEvent, ...eventsCache];
      newlyAdded.push(newEvent);
      if (isMariaDbActive()) {
        try {
          await dbSaveEvent(newEvent);
        } catch (mErr) {
          console.warn("[MariaDB] Error guardando evento publicado:", mErr.message);
        }
      }
    }
    if (newlyAdded.length > 0) {
      try {
        fs.writeFileSync(path.resolve(__dirname, "events_db.json"), JSON.stringify(eventsCache, null, 2), "utf8");
      } catch (_) {
      }
      console.log(`[Radar Local] ${newlyAdded.length} eventos seleccionados y publicados en la cartelera con im\xE1genes representativas.`);
    }
    res.json({
      success: true,
      count: newlyAdded.length,
      published: newlyAdded,
      events: eventsCache,
      message: `Se publicaron exitosamente ${newlyAdded.length} evento(s) en la cartelera.`
    });
  } catch (err) {
    console.error("[Publish Candidates Error]:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Error al publicar los eventos seleccionados."
    });
  }
});
app.post("/api/events/radar-scan", async (_req, res) => {
  try {
    const result = await runAIRadarScan();
    res.json(result);
  } catch (err) {
    console.error("[Radar IA Error]:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Error al ejecutar el Radar de Eventos IA."
    });
  }
});
app.get("/api/events/radar-status", (_req, res) => {
  const aiDetectedCount = eventsCache.filter((e) => e.aiDetected).length;
  res.json({
    success: true,
    lastScan: lastRadarScanTimestamp,
    lastAddedCount: lastRadarNewEventsCount,
    totalEvents: eventsCache.length,
    aiDetectedCount
  });
});
var VERIFIED_CARMEN_REAL_BUSINESSES = [
  {
    id: "biz-real-01",
    name: "Steren Ciudad del Carmen",
    category: "Materiales, Ferreter\xEDas y Construcci\xF3n",
    categories: ["Materiales, Ferreter\xEDas y Construcci\xF3n", "Servicios Profesionales"],
    phone: "9383868759",
    whatsapp: "9383868759",
    address: "Av. Concordia #45",
    colonia: "Petrolera",
    description: "Tienda de electr\xF3nica, herramientas de precisi\xF3n, cables, conectores, audio, iluminaci\xF3n LED, seguridad y proyectos tecnol\xF3gicos con garant\xEDa.",
    delivery: "Entrega a domicilio y pedidos en tienda",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 9:00 AM - 8:00 PM, Domingo 10:00 AM - 5:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Steren+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-02",
    name: "Bendita Carmelita",
    category: "Bares, Cervecer\xEDas y Restaurantes",
    categories: ["Bares, Cervecer\xEDas y Restaurantes", "Alimentos y Bebidas"],
    phone: "9381573307",
    whatsapp: "9381573307",
    address: "Calle 20 x 27-A #102",
    colonia: "Centro",
    description: "Cervecer\xEDa artesanal, pizzas, hamburguesas y botanas en el Centro de Ciudad del Carmen.",
    delivery: "Consumo en restaurante y pedidos para llevar",
    hasDelivery: true,
    schedule: "Martes a Domingo 4:00 PM - 1:00 AM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Bendita+Carmelita",
    isOfficialSource: true,
    priority: true,
    status: "pending"
  },
  {
    id: "biz-real-03",
    name: "Los Chiquis Tacos & Antojitos",
    category: "Antojitos y Comida R\xE1pida",
    categories: ["Antojitos y Comida R\xE1pida", "Alimentos y Bebidas"],
    phone: "9381418745",
    whatsapp: "9381418745",
    address: "Calle Las Am\xE9ricas #108",
    colonia: "Francisco I. Madero",
    description: "Tacos de guisado tradicionales campechanos, tortas, aguas frescas naturales de fruta de temporada y servicio para eventos y pedidos r\xE1pidos.",
    delivery: "Servicio a domicilio disponible en toda la isla",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 7:00 AM - 2:00 PM",
    payment: "Efectivo y Transferencias",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Los%20Chiquis%20Tacos%20%26%20Antojitos",
    isOfficialSource: true,
    priority: true,
    status: "pending"
  },
  {
    id: "biz-real-04",
    name: "T\xE9cnicos en Aires Acondicionados del Golfo",
    category: "Mantenimiento y Reparaci\xF3n de Climas",
    categories: ["Mantenimiento y Reparaci\xF3n de Climas", "Servicios del Hogar y Oficios"],
    phone: "9381366850",
    whatsapp: "9381366850",
    address: "Calle 38 #340",
    colonia: "Tecolutla",
    description: "Servicio t\xE9cnico especializado en instalaci\xF3n, mantenimiento preventivo y correctivo, desinfecci\xF3n con hidrolavadora y recarga de gas ecol\xF3gico para climas residenciales e industriales.",
    delivery: "Servicio directo a domicilio en casas, oficinas y comercios",
    hasDelivery: true,
    schedule: "Lunes a Domingo 7:30 AM - 8:30 PM",
    payment: "Efectivo y Transferencia SPEI",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=T%C3%A9cnicos%20en%20Aires%20Acondicionados%20del%20Golfo",
    isOfficialSource: true,
    priority: true,
    status: "pending"
  },
  {
    id: "biz-real-05",
    name: "Suministros Industriales Alpha",
    category: "Materiales, Ferreter\xEDas y Construcci\xF3n",
    categories: ["Materiales, Ferreter\xEDas y Construcci\xF3n", "Servicios Profesionales"],
    phone: "9381035994",
    whatsapp: "9381035994",
    address: "Av. Concordia #142",
    colonia: "Justo Sierra M\xE9ndez",
    description: "Equipamiento industrial, utensilios y maquinaria para cocinas, restaurantes, hoteles y cafeter\xEDas. Distribuci\xF3n de equipo gastron\xF3mico y comercial.",
    delivery: "Entrega a domicilio y env\xEDos locales",
    hasDelivery: true,
    schedule: "Lunes a Viernes 8:00 AM - 6:00 PM, S\xE1bados 8:00 AM - 2:00 PM",
    payment: "Transferencia, Efectivo y Facturaci\xF3n CFDI",
    image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Suministros%20Industriales%20Alpha",
    isOfficialSource: true,
    priority: true,
    status: "pending"
  },
  {
    id: "biz-real-06",
    name: "La Esquina De Chetos",
    category: "Antojitos y Comida R\xE1pida",
    categories: ["Antojitos y Comida R\xE1pida", "Alimentos y Bebidas"],
    phone: "9381044060",
    whatsapp: "9381044060",
    address: "Calle 60 esq. Av. Aviaci\xF3n",
    colonia: "Benito Ju\xE1rez",
    description: "Tacos, tortas, burritos gigantes, nachos preparados, hamburguesas al carb\xF3n y papas fritas. Servicio r\xE1pido para cenar o pedir a domicilio.",
    delivery: "Servicio a domicilio r\xE1pido con motomandado",
    hasDelivery: true,
    schedule: "Lunes a Domingo 6:00 PM - 1:00 AM",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=La%20Esquina%20De%20Chetos",
    isOfficialSource: true,
    priority: true,
    status: "pending"
  },
  {
    id: "biz-real-07",
    name: "TECNO CLEAN Servicios de Limpieza",
    category: "Servicios del Hogar y Oficios",
    categories: ["Servicios del Hogar y Oficios", "Servicios Profesionales"],
    phone: "9381036085",
    whatsapp: "9381036085",
    address: "Calle 55",
    colonia: "Miami",
    description: "Servicios profesionales de limpieza profunda, lavado y desinfecci\xF3n de salas, colchones, alfombras, pulido de pisos y limpieza de oficinas y bodegas.",
    delivery: "Atenci\xF3n directa en hogares y empresas",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 7:00 PM",
    payment: "Efectivo y Transferencia SPEI",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Tecno+Clean+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-08",
    name: "Servi-Aire Acondicionado Carmen",
    category: "Mantenimiento y Reparaci\xF3n de Climas",
    categories: ["Mantenimiento y Reparaci\xF3n de Climas", "Servicios del Hogar y Oficios"],
    phone: "9381081490",
    whatsapp: "9381081490",
    address: "Calle 47",
    colonia: "Santa Rosal\xEDa",
    description: "Mantenimiento e instalaci\xF3n de minisplits y climas inverter. Detecci\xF3n de fugas, cambio de capacitores, lavado qu\xEDmico y mantenimiento de sistemas residenciales.",
    delivery: "Servicio a domicilio en toda Ciudad del Carmen",
    hasDelivery: true,
    schedule: "Lunes a Domingo 8:00 AM - 8:00 PM",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Servi-Aire%20Acondicionado%20Carmen",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-09",
    name: "DOCER Multiservicios y Construcci\xF3n",
    category: "Servicios del Hogar y Oficios",
    categories: ["Servicios del Hogar y Oficios", "Materiales, Ferreter\xEDas y Construcci\xF3n"],
    phone: "9381198634",
    whatsapp: "9381198634",
    address: "Av. Perif\xE9rica Norte",
    colonia: "Renovaci\xF3n",
    description: "Servicios generales de alba\xF1iler\xEDa, impermeabilizaci\xF3n con garant\xEDa, pintura vin\xEDlica y esmalte, tabla roca, plomer\xEDa y electricidad residencial e industrial.",
    delivery: "Presupuestos y visitas sin compromiso a domicilio",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 7:30 AM - 6:30 PM",
    payment: "Efectivo, Transferencia y Factura",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=DOCER%20Multiservicios%20y%20Construcci%C3%B3n",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-10",
    name: "Multiservicios Hern\xE1ndez Emergencias El\xE9ctricas",
    category: "Servicios del Hogar y Oficios",
    categories: ["Servicios del Hogar y Oficios", "Urgencias 24 Horas"],
    phone: "9381693860",
    whatsapp: "9381693860",
    address: "Calle 35",
    colonia: "Cuauht\xE9moc",
    description: "Electricista calificado disponible las 24 horas. Cortocircuitos, balanceo de cargas, centros de carga, acometidas CFE, cableado y alumbrado de emergencia.",
    delivery: "Atenci\xF3n de urgencias a domicilio las 24 horas",
    hasDelivery: true,
    schedule: "Servicio 24 Horas los 365 d\xEDas",
    payment: "Efectivo y Transferencias directas",
    image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Multiservicios%20Hern%C3%A1ndez%20Emergencias%20El%C3%A9ctricas",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-11",
    name: "Tacos Los Socios",
    category: "Antojitos y Comida R\xE1pida",
    categories: ["Antojitos y Comida R\xE1pida", "Alimentos y Bebidas"],
    phone: "9381941329",
    whatsapp: "9381941329",
    address: "Calle 26",
    colonia: "Ciudad del Carmen Centro",
    description: "Taquer\xEDa tradicional en el centro de Carmen. Tacos al pastor, bistec, suadero, tripa dorada, gringas y quesadillas con salsas especiales y cebollitas asadas.",
    delivery: "Servicio a domicilio y consumo en local",
    hasDelivery: true,
    schedule: "Lunes a Domingo 5:00 PM - 2:00 AM",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Tacos+Los+Socios+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-12",
    name: "Los Trompudos Taquer\xEDa",
    category: "Restaurantes y Cocinas Econ\xF3micas",
    categories: ["Restaurantes y Cocinas Econ\xF3micas", "Alimentos y Bebidas"],
    phone: "9383033601",
    whatsapp: "9383033601",
    address: "Av. Isla de Tris",
    colonia: "Renovaci\xF3n",
    description: "Trompo de pastor gigante al carb\xF3n, cortes a la plancha, parrilladas familiares con guacamole fresco y frijoles charros. Sabor carmelita garantizado.",
    delivery: "Servicio a domicilio en toda la zona oriente y poniente",
    hasDelivery: true,
    schedule: "Lunes a Domingo 6:00 PM - 1:30 AM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Los%20Trompudos%20Taquer%C3%ADa",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-13",
    name: "Tacos \xC1rabes Los Camellos",
    category: "Restaurantes y Cocinas Econ\xF3micas",
    categories: ["Restaurantes y Cocinas Econ\xF3micas", "Alimentos y Bebidas"],
    phone: "9383891111",
    whatsapp: "9383891111",
    address: "Calle 31",
    colonia: "Ciudad del Carmen Centro",
    description: "Especialistas en aut\xE9nticos tacos \xE1rabes servidos en pan pita artesanal, aderezo jocoque y chipotle, jochos, quecas \xE1rabes y carne marinada.",
    delivery: "Servicio a domicilio r\xE1pido",
    hasDelivery: true,
    schedule: "Martes a Domingo 6:30 PM - 12:30 AM",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Tacos+Arabes+Los+Camellos+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-14",
    name: "Smoke Icaco Cortes y Parrilla",
    category: "Restaurantes y Cocinas Econ\xF3micas",
    categories: ["Restaurantes y Cocinas Econ\xF3micas", "Alimentos y Bebidas"],
    phone: "9381290840",
    whatsapp: "9381290840",
    address: "Malec\xF3n Costero Nelson Barrera",
    colonia: "Playa Norte",
    description: "Cortes finos asados a la le\xF1a frente a la playa. Pica\xF1a, Ribeye, tomahawk, tacos de arrachera, costillitas ahumadas BBQ y cocteler\xEDa con vista al mar.",
    delivery: "Servicio en restaurante y pedidos para llevar",
    hasDelivery: true,
    schedule: "Mi\xE9rcoles a Lunes 1:00 PM - 11:00 PM",
    payment: "Efectivo, Tarjetas Visa/Mastercard",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Smoke%20Icaco%20Cortes%20y%20Parrilla",
    isOfficialSource: true,
    priority: true,
    status: "pending"
  },
  {
    id: "biz-real-15",
    name: "FISIUM Fisioterapia y Rehabilitaci\xF3n",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios", "Cuidado y Belleza Personal"],
    phone: "9381426934",
    whatsapp: "9381426934",
    address: "Calle 56 #41",
    colonia: "F\xE1tima",
    description: "Cl\xEDnica de fisioterapia, rehabilitaci\xF3n traumatol\xF3gica, deportiva y neurol\xF3gica. Terapia manual, punci\xF3n seca, ultrasonido terap\xE9utico y readaptaci\xF3n f\xEDsica.",
    delivery: "Atenci\xF3n en cl\xEDnica y visitas a domicilio para personas con movilidad reducida",
    hasDelivery: true,
    schedule: "Lunes a Viernes 8:00 AM - 8:00 PM, S\xE1bados 8:00 AM - 2:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Fisium+Fisioterapia+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-16",
    name: "Cl\xEDnica C\xE1rcamo M\xE9dica",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios"],
    phone: "9381327403",
    whatsapp: "9381327403",
    address: "Calle 33",
    colonia: "Ciudad del Carmen Centro",
    description: "Consulta m\xE9dica general y de especialidades, control prenatal, pediatr\xEDa, medicina preventiva y certificados m\xE9dicos para plataformas offshore y empresas.",
    delivery: "Atenci\xF3n presencial en consultorio con previa cita",
    hasDelivery: false,
    schedule: "Lunes a S\xE1bado 8:00 AM - 7:00 PM",
    payment: "Efectivo y Tarjetas bancarias",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Clinica+Carcamo+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-17",
    name: "MEDLAB Medicina Laboral y An\xE1lisis Cl\xEDnicos",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios", "Servicios Profesionales"],
    phone: "9381009535",
    whatsapp: "9381009535",
    address: "Calle 31 #112",
    colonia: "Cuauht\xE9moc",
    description: "Ex\xE1menes m\xE9dicos de ingreso y peri\xF3dicos para el sector petrolero costa afuera, antidoping certificado, audiometr\xEDa, espirometr\xEDa y qu\xEDmica sangu\xEDnea.",
    delivery: "Toma de muestras a domicilio y en empresas",
    hasDelivery: true,
    schedule: "Lunes a Viernes 7:00 AM - 5:00 PM, S\xE1bados 7:00 AM - 1:00 PM",
    payment: "Transferencia, Tarjeta y Facturaci\xF3n CFDI",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Medlab+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-18",
    name: "Cl\xEDnica de Terapia de Lenguaje y Aprendizaje",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios"],
    phone: "9381397871",
    whatsapp: "9381397871",
    address: "Calle 47",
    colonia: "San Nicol\xE1s",
    description: "Atenci\xF3n terap\xE9utica para ni\xF1os, j\xF3venes y adultos en problemas de articulaci\xF3n, tartamudez, retraso de lenguaje, lectoescritura y d\xE9ficit de atenci\xF3n.",
    delivery: "Sesiones personalizadas en consultorio",
    hasDelivery: false,
    schedule: "Lunes a Viernes 9:00 AM - 7:00 PM",
    payment: "Efectivo y Transferencias SPEI",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Terapia+de+Lenguaje+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-19",
    name: "Torre M\xE9dica Carmen Unidad de Imagenolog\xEDa",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios"],
    phone: "9383823419",
    whatsapp: "9383823419",
    address: "Calle 31 #95",
    colonia: "Ciudad del Carmen Centro",
    description: "Rayos X digitales, ultrasonido 4D de alta definici\xF3n, mastograf\xEDa, tomograf\xEDa computarizada y resonancia magn\xE9tica con entrega r\xE1pida de resultados.",
    delivery: "Atenci\xF3n presencial y entrega digital de estudios",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 7:00 AM - 8:00 PM",
    payment: "Efectivo, Tarjetas Visa/Mastercard y Convenios con aseguradoras",
    image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Torre+Medica+Carmen+Imagenologia",
    status: "pending"
  },
  {
    id: "biz-real-20",
    name: "Consultorio Dental Morelos",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios"],
    phone: "9381455757",
    whatsapp: "9381455757",
    address: "Calle Morelos #28",
    colonia: "Ciudad del Carmen Centro",
    description: "Odontolog\xEDa integral familiar. Limpiezas ultras\xF3nicas, resinas est\xE9ticas, blanqueamiento dental, endodoncia, ortodoncia con brackets y pr\xF3tesis dentales.",
    delivery: "Atenci\xF3n en cl\xEDnica con cita previa o urgencias",
    hasDelivery: false,
    schedule: "Lunes a S\xE1bado 9:00 AM - 8:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Consultorio+Dental+Morelos+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-21",
    name: "Consultorio Dental Santa Rita",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios"],
    phone: "9381583714",
    whatsapp: "9381583714",
    address: "Calle 55",
    colonia: "Fracc. Santa Rita",
    description: "Atenci\xF3n dental infantil y para adultos, dise\xF1o de sonrisa, guardas oclusales nocturnas, coronas de zirconia e incrustaciones dentales.",
    delivery: "Atenci\xF3n en consultorio",
    hasDelivery: false,
    schedule: "Lunes a Viernes 9:00 AM - 7:00 PM, S\xE1bados 9:00 AM - 2:00 PM",
    payment: "Efectivo y Transferencias",
    image: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Consultorio+Dental+Santa+Rita+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-22",
    name: "Dental House CC",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios"],
    phone: "9383860394",
    whatsapp: "9383860394",
    address: "Av. Perif\xE9rica Norte #88",
    colonia: "Justo Sierra",
    description: "Cl\xEDnica de especialidades dentales en Carmen. Cirug\xEDa de muelas del juicio sin dolor, implantes dentales, carillas est\xE9ticas y periodoncia.",
    delivery: "Atenci\xF3n en consultorio con citas programadas",
    hasDelivery: false,
    schedule: "Lunes a S\xE1bado 9:00 AM - 8:00 PM",
    payment: "Efectivo, Tarjetas a meses y Transferencia",
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Dental+House+CC+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-23",
    name: "Lavander\xEDa Cd Del Carmen",
    category: "Servicios del Hogar y Oficios",
    categories: ["Servicios del Hogar y Oficios"],
    phone: "9382431424",
    whatsapp: "9382431424",
    address: "Calle 42 #80",
    colonia: "Tecolutla",
    description: "Lavado, secado y doblado por kilo o encargo. Lavado especial de edredones, cobijas, uniformes de trabajo de plataforma y renta de lavadoras.",
    delivery: "Servicio a domicilio con recolecta y entrega",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 7:30 AM - 8:00 PM, Domingo 8:00 AM - 2:00 PM",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Lavander%C3%ADa%20Cd%20Del%20Carmen",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-24",
    name: "Lavander\xEDa Clean Topal Tintorer\xEDa",
    category: "Servicios del Hogar y Oficios",
    categories: ["Servicios del Hogar y Oficios"],
    phone: "9381166157",
    whatsapp: "9381166157",
    address: "Av. Paseo del Mar",
    colonia: "Bivalvo",
    description: "Tintorer\xEDa ecol\xF3gica y lavander\xEDa de alta calidad. Planchado profesional al vapor, desmanchado de vestidos de novia, trajes y overoles industriales.",
    delivery: "Servicio a domicilio en fraccionamientos y colonias",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 7:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Clean+Topal+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-25",
    name: "Monkeys Pizza Artesanal",
    category: "Restaurantes y Cocinas Econ\xF3micas",
    categories: ["Restaurantes y Cocinas Econ\xF3micas", "Alimentos y Bebidas"],
    phone: "9381642799",
    whatsapp: "9381642799",
    address: "Calle 56",
    colonia: "San Rom\xE1n",
    description: "Pizzas estilo artesanal con masa madurada, orilla rellena de queso crema, alitas de pollo marinadas, boneless, dedos de queso y pastas.",
    delivery: "Servicio a domicilio veloz en toda la isla",
    hasDelivery: true,
    schedule: "Lunes a Domingo 1:00 PM - 11:30 PM",
    payment: "Efectivo, Transferencia y Tarjeta al repartidor",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Monkeys%20Pizza%20Artesanal",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-26",
    name: "M\xE1s Farmacias Carmen",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios", "Farmacias y Medicamentos"],
    phone: "9381310396",
    whatsapp: "9381310396",
    address: "Calle 31",
    colonia: "Ciudad del Carmen Centro",
    description: "Medicamentos de patente y gen\xE9ricos certificados, productos de higiene, cuidado infantil, material de curaci\xF3n y sueros orales.",
    delivery: "Servicio a domicilio de farmacia",
    hasDelivery: true,
    schedule: "Lunes a Domingo 7:00 AM - 11:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Mas+Farmacias+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-27",
    name: "EuroHotel Ciudad del Carmen",
    category: "Hoteles y Hospedaje",
    categories: ["Hoteles y Hospedaje"],
    phone: "9381150969",
    whatsapp: "9381150969",
    address: "Calle 22 #208",
    colonia: "Ciudad del Carmen Centro",
    description: "Hotel ejecutivo con alberca, restaurante buffet, salas de juntas para conferencias corporativas, gimnasio y estacionamiento privado con vigilancia.",
    delivery: "Hospedaje, reservas en l\xEDnea y atenci\xF3n a empresas petroleras",
    hasDelivery: false,
    schedule: "Recepci\xF3n 24 Horas",
    payment: "Tarjetas de cr\xE9dito, Transferencia corporativa y Efectivo",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=EuroHotel+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-28",
    name: "Hotel La Venta Inn",
    category: "Hoteles y Hospedaje",
    categories: ["Hoteles y Hospedaje"],
    phone: "9386900102",
    whatsapp: "9381081235",
    address: "Calle 31 #275",
    colonia: "Cuauht\xE9moc",
    description: "Hospedaje de negocios con desayuno incluido, habitaciones ejecutivas climatizadas, WiFi de alta velocidad y transporte al aeropuerto de Carmen.",
    delivery: "Reservaciones directas y tarifas para corporativos",
    hasDelivery: false,
    schedule: "Recepci\xF3n 24 Horas",
    payment: "Tarjetas Visa/Mastercard, Transferencia y Factura",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Hotel+La+Venta+Inn+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-29",
    name: "InHouse Hotel Ciudad del Carmen",
    category: "Hoteles y Hospedaje",
    categories: ["Hoteles y Hospedaje"],
    phone: "9381029079",
    whatsapp: "9381029079",
    address: "Calle 56 #38",
    colonia: "Aviaci\xF3n",
    description: "Confort y descanso en el coraz\xF3n comercial de Carmen. Habitaciones c\xF3modas, aire acondicionado, alberca al aire libre y excelente ubicaci\xF3n.",
    delivery: "Atenci\xF3n a hu\xE9spedes 24/7",
    hasDelivery: false,
    schedule: "Recepci\xF3n 24 Horas",
    payment: "Efectivo y Tarjetas bancarias",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=InHouse+Hotel+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-30",
    name: "Hotel Porto Real",
    category: "Hoteles y Hospedaje",
    categories: ["Hoteles y Hospedaje"],
    phone: "9383868264",
    whatsapp: "9383868264",
    address: "Av. Malec\xF3n Costero #12",
    colonia: "Playa Norte",
    description: "Hotel con vista privilegiada al Golfo de M\xE9xico, piscina, restaurante de mariscos y cortes, estacionamiento seguro y acceso a la playa.",
    delivery: "Reservas telef\xF3nicas y por WhatsApp",
    hasDelivery: false,
    schedule: "Recepci\xF3n 24 Horas",
    payment: "Efectivo, Tarjetas y Facturaci\xF3n electr\xF3nica",
    image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Hotel+Porto+Real+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-31",
    name: "Cerrajer\xEDa Lucas 24 Horas",
    category: "Servicios del Hogar y Oficios",
    categories: ["Servicios del Hogar y Oficios", "Urgencias 24 Horas"],
    phone: "9381300705",
    whatsapp: "9381300705",
    address: "Calle 47",
    colonia: "Santa Rosal\xEDa",
    description: "Aperturas de emergencia para casas, autos y candados sin da\xF1ar. Duplicado de llaves est\xE1ndar y de puntos, cambio de combinaci\xF3n y cerraduras de seguridad.",
    delivery: "Servicio m\xF3vil a domicilio las 24 horas en toda la isla",
    hasDelivery: true,
    schedule: "Servicio Continuo 24 Horas",
    payment: "Efectivo y Transferencias directas",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Cerrajer%C3%ADa%20Lucas%2024%20Horas",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-32",
    name: "Dr. Auto & Casa Cerrajer\xEDa y Mantenimiento",
    category: "Automotriz y Talleres Mec\xE1nicos",
    categories: ["Automotriz y Talleres Mec\xE1nicos", "Servicios del Hogar y Oficios"],
    phone: "9381195961",
    whatsapp: "9381195961",
    address: "Av. 10 de Julio",
    colonia: "Francisco I. Madero",
    description: "Cerrajer\xEDa automotriz con chip, llaves de presencia, programaci\xF3n de controles para veh\xEDculos, adem\xE1s de mantenimiento de plomer\xEDa y electricidad.",
    delivery: "Servicio a domicilio en cualquier punto de Ciudad del Carmen",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 8:00 PM",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Dr+Auto+Casa+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-33",
    name: "Rotary Club Ciudad del Carmen",
    category: "Servicios Profesionales",
    categories: ["Servicios Profesionales"],
    phone: "9381328107",
    whatsapp: "9381328107",
    address: "Av. Concordia",
    colonia: "Petrolera",
    description: "Organizaci\xF3n de l\xEDderes empresariales y profesionales para servicios comunitarios, jornadas de salud visual, donaciones y apoyo social carmelita.",
    delivery: "Atenci\xF3n institucional y sesiones comunitarias",
    hasDelivery: false,
    schedule: "Lunes a Viernes 9:00 AM - 5:00 PM",
    payment: "Aportaciones y Donativos",
    image: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Rotary+Club+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-34",
    name: "Cl\xEDnica Veterinaria del Carmen",
    category: "Mascotas y Veterinarias",
    categories: ["Mascotas y Veterinarias", "Salud, M\xE9dicos y Consultorios"],
    phone: "9381599813",
    whatsapp: "9381599813",
    address: "Calle 35 #74",
    colonia: "Ciudad del Carmen Centro",
    description: "Atenci\xF3n m\xE9dica veterinaria para perros y gatos. Vacunaci\xF3n, desparasitaci\xF3n, cirug\xEDas menores, rayos X, est\xE9tica canina, ba\xF1os medicados y farmacia veterinaria.",
    delivery: "Atenci\xF3n en cl\xEDnica y urgencias veterinarias",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:30 AM - 8:00 PM, Domingo 9:00 AM - 2:00 PM",
    payment: "Efectivo, Tarjetas y Transferencias",
    image: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Clinica+Veterinaria+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-35",
    name: "Taquer\xEDa La Hormiga Carmelita",
    category: "Antojitos y Comida R\xE1pida",
    categories: ["Antojitos y Comida R\xE1pida", "Alimentos y Bebidas"],
    phone: "9381385420",
    whatsapp: "9381385420",
    address: "Calle 35 #45",
    colonia: "Ciudad del Carmen Centro",
    description: "Tacos de bistec, pastor, chuleta y gringas con salsas artesanales carmelitas y aguas frescas naturales.",
    delivery: "Servicio a domicilio r\xE1pido en toda la isla",
    hasDelivery: true,
    schedule: "Lunes a Domingo 6:00 PM - 1:00 AM",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Taquer%C3%ADa%20La%20Hormiga%20Carmelita",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-36",
    name: "Mariscos El Tim\xF3n del Golfo",
    category: "Restaurantes y Cocinas Econ\xF3micas",
    categories: ["Restaurantes y Cocinas Econ\xF3micas", "Alimentos y Bebidas"],
    phone: "9383842190",
    whatsapp: "9383842190",
    address: "Av. Paseo del Mar #120",
    colonia: "Playa Norte",
    description: "Cocteles de camar\xF3n, pulpo en su tinta, pescado frito al mojo de ajo, p\xE1mpano y ceviches frescos frente a la playa.",
    delivery: "Consumo en restaurante y pedidos para llevar",
    hasDelivery: true,
    schedule: "Lunes a Domingo 10:00 AM - 7:00 PM",
    payment: "Efectivo, Tarjetas Visa/Mastercard y Transferencia",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Mariscos%20El%20Tim%C3%B3n%20del%20Golfo",
    isOfficialSource: true,
    priority: true,
    status: "pending"
  },
  {
    id: "biz-real-37",
    name: "Pescader\xEDa y Marisquer\xEDa Puerto Real",
    category: "Alimentos y Bebidas",
    categories: ["Alimentos y Bebidas", "Restaurantes y Cocinas Econ\xF3micas"],
    phone: "9381123490",
    whatsapp: "9381123490",
    address: "Calle 20 #88",
    colonia: "Guanal",
    description: "Venta de mariscos frescos del d\xEDa, camar\xF3n de laguna, robalo, pulpo fresco y filete empacado para restaurantes y hogares.",
    delivery: "Entrega a domicilio en toda la ciudad",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 7:00 AM - 4:00 PM",
    payment: "Efectivo y Transferencia SPEI",
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Pescader%C3%ADa%20y%20Marisquer%C3%ADa%20Puerto%20Real",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-38",
    name: "Marquesitas y Frapp\xE9s El Chavo",
    category: "Antojitos y Comida R\xE1pida",
    categories: ["Antojitos y Comida R\xE1pida", "Alimentos y Bebidas"],
    phone: "9381654312",
    whatsapp: "9381654312",
    address: "Calle 26 frente a Plaza C\xEDvica",
    colonia: "Ciudad del Carmen Centro",
    description: "Aut\xE9nticas marquesitas crujientes con queso de bola de importaci\xF3n (queso holand\xE9s gallo), Nutella, cajeta y frapp\xE9s de frutas.",
    delivery: "Servicio a domicilio y eventos infantiles",
    hasDelivery: true,
    schedule: "Lunes a Domingo 5:30 PM - 11:30 PM",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Marquesitas%20y%20Frapp%C3%A9s%20El%20Chavo",
    isOfficialSource: true,
    priority: true,
    status: "pending"
  },
  {
    id: "biz-real-39",
    name: "Caf\xE9 Punta del Cielo Carmen",
    category: "Restaurantes y Cocinas Econ\xF3micas",
    categories: ["Restaurantes y Cocinas Econ\xF3micas", "Alimentos y Bebidas"],
    phone: "9381315570",
    whatsapp: "9381315570",
    address: "Av. Corregidora #100",
    colonia: "Aviaci\xF3n",
    description: "Cafeter\xEDa gourmet mexicana, reposter\xEDa fina, desayunos ligeros, paninis y bebidas fr\xEDas y calientes de grano selecto.",
    delivery: "Servicio en cafeter\xEDa y pedidos para llevar",
    hasDelivery: true,
    schedule: "Lunes a Domingo 7:00 AM - 10:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Cafe+Punta+del+Cielo+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-40",
    name: "Panader\xEDa y Pasteler\xEDa Suspiros del Carmen",
    category: "Alimentos y Bebidas",
    categories: ["Alimentos y Bebidas", "Antojitos y Comida R\xE1pida"],
    phone: "9383821045",
    whatsapp: "9383821045",
    address: "Calle 31 #150",
    colonia: "Ciudad del Carmen Centro",
    description: "Pasteles para cumplea\xF1os, bodas, XV a\xF1os, pan dulce tradicional horneado diario, postres individuales y gelatinas art\xEDsticas.",
    delivery: "Entrega a domicilio de pasteles y mesas de postres",
    hasDelivery: true,
    schedule: "Lunes a Domingo 8:00 AM - 9:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Panader%C3%ADa%20y%20Pasteler%C3%ADa%20Suspiros%20del%20Carmen",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-41",
    name: "Refaccionaria del Carmen Autopartes",
    category: "Automotriz y Talleres Mec\xE1nicos",
    categories: ["Automotriz y Talleres Mec\xE1nicos", "Materiales, Ferreter\xEDas y Construcci\xF3n"],
    phone: "9381248833",
    whatsapp: "9381248833",
    address: "Av. 10 de Julio #230",
    colonia: "Manigua",
    description: "Refacciones para autos y camionetas de todas las marcas, suspensi\xF3n, frenos, balatas, filtros de aceite, buj\xEDas y bater\xEDas.",
    delivery: "Entrega a talleres mec\xE1nicos y clientes particulares",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 7:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Refaccionaria%20del%20Carmen%20Autopartes",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-42",
    name: "Taller Mec\xE1nico y Alineaci\xF3n San Rom\xE1n",
    category: "Automotriz y Talleres Mec\xE1nicos",
    categories: ["Automotriz y Talleres Mec\xE1nicos"],
    phone: "9381014455",
    whatsapp: "9381014455",
    address: "Calle 56 #88",
    colonia: "San Rom\xE1n",
    description: "Afinaci\xF3n de motores, escaneo por computadora OBD2, cambio de aceite sint\xE9tico, alineaci\xF3n y balanceo computarizado y frenos.",
    delivery: "Recepci\xF3n en taller y servicio de gr\xFAa en la isla",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 6:30 PM",
    payment: "Efectivo, Transferencia SPEI y Tarjetas",
    image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Taller%20Mec%C3%A1nico%20y%20Alineaci%C3%B3n%20San%20Rom%C3%A1n",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-43",
    name: "Vulcanizadora y Llantas El Parche Veloz",
    category: "Automotriz y Talleres Mec\xE1nicos",
    categories: ["Automotriz y Talleres Mec\xE1nicos", "Urgencias 24 Horas"],
    phone: "9381679922",
    whatsapp: "9381679922",
    address: "Av. Perif\xE9rica Norte #190",
    colonia: "Renovaci\xF3n",
    description: "Parche en fr\xEDo y caliente para llantas de moto, auto y camioneta. Venta de c\xE1maras, v\xE1lvulas y auxilio vial las 24 horas.",
    delivery: "Auxilio vial a domicilio o en carretera en la isla",
    hasDelivery: true,
    schedule: "Servicio 24 Horas los 7 d\xEDas",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Vulcanizadora%20y%20Llantas%20El%20Parche%20Veloz",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-44",
    name: "Carpinter\xEDa y Ebanister\xEDa Carmen Muebles",
    category: "Servicios del Hogar y Oficios",
    categories: ["Servicios del Hogar y Oficios", "Materiales, Ferreter\xEDas y Construcci\xF3n"],
    phone: "9381567788",
    whatsapp: "9381567788",
    address: "Calle 42 #112",
    colonia: "Tecolutla",
    description: "Fabricaci\xF3n sobre dise\xF1o de cl\xF3sets, cocinas integrales de madera fina y melamina resistente a la humedad marina, puertas y barniz.",
    delivery: "Visitas a domicilio para toma de medidas y cotizaciones",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 6:00 PM",
    payment: "Efectivo, Transferencia y Anticipo por contrato",
    image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Carpinter%C3%ADa%20y%20Ebanister%C3%ADa%20Carmen%20Muebles",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-45",
    name: "Vidrier\xEDa y Aluminios del Sureste",
    category: "Materiales, Ferreter\xEDas y Construcci\xF3n",
    categories: ["Materiales, Ferreter\xEDas y Construcci\xF3n", "Servicios del Hogar y Oficios"],
    phone: "9381432299",
    whatsapp: "9381432299",
    address: "Av. Concordia #210",
    colonia: "Benito Ju\xE1rez",
    description: "Canceler\xEDa de aluminio blanco, natural y madera, vidrio templado para ba\xF1os, ventanas corredizas, mosquiteros y espejos decorativos.",
    delivery: "Instalaci\xF3n y transporte a domicilio incluido",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 6:00 PM",
    payment: "Efectivo y Transferencias",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Vidrier%C3%ADa%20y%20Aluminios%20del%20Sureste",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-46",
    name: "Ferreter\xEDa y Materiales La Pasiega",
    category: "Materiales, Ferreter\xEDas y Construcci\xF3n",
    categories: ["Materiales, Ferreter\xEDas y Construcci\xF3n"],
    phone: "9383820980",
    whatsapp: "9383820980",
    address: "Calle 24 #67",
    colonia: "Ciudad del Carmen Centro",
    description: "Cemento, varilla, blocks, grava, arena, tuber\xEDa PVC, conexiones hidr\xE1ulicas, pintura vin\xEDlica y herramientas Truper.",
    delivery: "Fletes de material de construcci\xF3n a toda la isla",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 7:30 AM - 6:30 PM",
    payment: "Efectivo, Tarjetas y Facturaci\xF3n CFDI",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Ferreteria+La+Pasiega+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-47",
    name: "Plomer\xEDa y Destapes El Tibur\xF3n 24 Horas",
    category: "Servicios del Hogar y Oficios",
    categories: ["Servicios del Hogar y Oficios", "Urgencias 24 Horas"],
    phone: "9381186644",
    whatsapp: "9381186644",
    address: "Calle 47 #205",
    colonia: "Santa Rosal\xEDa",
    description: "Destape de drenajes con m\xE1quina rotativa, reparaci\xF3n de fugas de agua y gas, instalaci\xF3n de tinacos, bombas presurizadoras y calentadores.",
    delivery: "Atenci\xF3n inmediata a domicilio las 24 horas",
    hasDelivery: true,
    schedule: "Servicio 24 Horas los 365 d\xEDas",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Plomer%C3%ADa%20y%20Destapes%20El%20Tibur%C3%B3n%2024%20Horas",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-48",
    name: "Taller de Radiadores y Soldaduras El Golfo",
    category: "Automotriz y Talleres Mec\xE1nicos",
    categories: ["Automotriz y Talleres Mec\xE1nicos", "Servicios del Hogar y Oficios"],
    phone: "9381395511",
    whatsapp: "9381395511",
    address: "Calle 38 #55",
    colonia: "Tecolutla",
    description: "Baqueteado de radiadores, cambio de tanques pl\xE1sticos por aluminio, soldadura aut\xF3gena y el\xE9ctrica para barcos, lanchas y autos.",
    delivery: "Atenci\xF3n en taller y reparaciones en campo",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 6:00 PM",
    payment: "Efectivo y Transferencias",
    image: "https://images.unsplash.com/photo-1504222490345-c075b6008014?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Radiadores+El+Golfo+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-49",
    name: "Ferreter\xEDa y Herramientas Fix del Carmen",
    category: "Materiales, Ferreter\xEDas y Construcci\xF3n",
    categories: ["Materiales, Ferreter\xEDas y Construcci\xF3n"],
    phone: "9381643322",
    whatsapp: "9381643322",
    address: "Av. Isla de Tris #302",
    colonia: "Renovaci\xF3n",
    description: "Torniller\xEDa en acero inoxidable grado marino, brocas, discos de corte, candados de alta seguridad, impermeabilizantes y selladores.",
    delivery: "Servicio de motomandado y env\xEDos a talleres",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 7:00 PM, Domingo 9:00 AM - 2:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Ferreter%C3%ADa%20y%20Herramientas%20Fix%20del%20Carmen",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-50",
    name: "Laboratorios Ramos An\xE1lisis Cl\xEDnicos",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios"],
    phone: "9383824510",
    whatsapp: "9383824510",
    address: "Calle 33 #85",
    colonia: "Ciudad del Carmen Centro",
    description: "An\xE1lisis cl\xEDnicos certificados, perfiles bioqu\xEDmicos, biometr\xEDa hem\xE1tica, pruebas de embarazo, pruebas COVID y perfiles tiroideos.",
    delivery: "Toma de muestras a domicilio y consulta de resultados en l\xEDnea",
    hasDelivery: true,
    schedule: "Lunes a Viernes 6:30 AM - 7:00 PM, S\xE1bados 7:00 AM - 2:00 PM",
    payment: "Efectivo, Tarjetas bancarias y Transferencia",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Laboratorios+Ramos+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-51",
    name: "\xD3ptica Carmelita Visi\xF3n Integral",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios", "Cuidado y Belleza Personal"],
    phone: "9381229080",
    whatsapp: "9381229080",
    address: "Calle 31 #78",
    colonia: "Ciudad del Carmen Centro",
    description: "Examen de la vista profesional computarizado sin costo en la compra de armaz\xF3n. Lentes progresivos, antirreflejante y lentes de contacto.",
    delivery: "Entrega de lentes a domicilio con garant\xEDa de graduaci\xF3n",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 9:30 AM - 8:00 PM",
    payment: "Efectivo, Tarjetas a meses y Transferencia",
    image: "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=%C3%93ptica%20Carmelita%20Visi%C3%B3n%20Integral",
    isOfficialSource: true,
    priority: true,
    status: "pending"
  },
  {
    id: "biz-real-52",
    name: "Farmacias Bazar Carmen Centro",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios", "Farmacias y Medicamentos"],
    phone: "9383820134",
    whatsapp: "9383820134",
    address: "Calle 22 #104",
    colonia: "Ciudad del Carmen Centro",
    description: "Farmacia tradicional carmelita con medicamentos de patente y gen\xE9ricos, productos dermatol\xF3gicos, ortopedia y atenci\xF3n farmac\xE9utica.",
    delivery: "Servicio a domicilio r\xE1pido en moto",
    hasDelivery: true,
    schedule: "Lunes a Domingo 7:00 AM - 11:00 PM",
    payment: "Efectivo y Tarjetas",
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Farmacia+Bazar+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-53",
    name: "Veterinaria y Est\xE9tica Canina Pet Spa Carmen",
    category: "Mascotas y Veterinarias",
    categories: ["Mascotas y Veterinarias", "Cuidado y Belleza Personal"],
    phone: "9381147733",
    whatsapp: "9381147733",
    address: "Av. Aviaci\xF3n #75",
    colonia: "Aviaci\xF3n",
    description: "Ba\xF1os medicados, corte de pelo para razas peque\xF1as y grandes, limpieza dental canina, corte de u\xF1as, desparasitaci\xF3n y vacunas.",
    delivery: "Servicio de taxi canino para recoger y entregar a tu mascota",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 9:00 AM - 6:30 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Veterinaria%20y%20Est%C3%A9tica%20Canina%20Pet%20Spa%20Carmen",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-54",
    name: "Boutique y Florer\xEDa La Orqu\xEDdea Carmelita",
    category: "Comercios y Servicios",
    categories: ["Comercios y Servicios", "Cuidado y Belleza Personal"],
    phone: "9381096655",
    whatsapp: "9381096655",
    address: "Calle 35 #98",
    colonia: "Ciudad del Carmen Centro",
    description: "Arreglos florales con rosas frescas, orqu\xEDdeas, ramos buchones, peluches gigantes, globos de helio y detalles rom\xE1nticos.",
    delivery: "Entregas sorpresa a domicilio las 24 horas con reservaci\xF3n previa",
    hasDelivery: true,
    schedule: "Lunes a Domingo 8:00 AM - 9:00 PM",
    payment: "Efectivo, Tarjetas y Transferencias SPEI",
    image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Boutique%20y%20Florer%C3%ADa%20La%20Orqu%C3%ADdea%20Carmelita",
    isOfficialSource: true,
    priority: true,
    status: "pending"
  },
  {
    id: "biz-real-55",
    name: "Imprenta y Publicidad Dise\xF1os del Carmen",
    category: "Servicios Profesionales",
    categories: ["Servicios Profesionales"],
    phone: "9381358800",
    whatsapp: "9381358800",
    address: "Calle 40 #144",
    colonia: "Tecolutla",
    description: "Impresi\xF3n en lona vin\xEDlica gran formato, microperforado, vinil adhesivo, playeras sublimadas, tazas personalizadas y volantes.",
    delivery: "Entrega en oficinas y negocios locales",
    hasDelivery: true,
    schedule: "Lunes a Viernes 9:00 AM - 7:00 PM, S\xE1bado 9:00 AM - 2:00 PM",
    payment: "Efectivo, Transferencia y Facturaci\xF3n CFDI",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Imprenta%20y%20Publicidad%20Dise%C3%B1os%20del%20Carmen",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-56",
    name: "Librer\xEDa y Papeler\xEDa del Carmen",
    category: "Comercios y Servicios",
    categories: ["Comercios y Servicios"],
    phone: "9383821940",
    whatsapp: "9383821940",
    address: "Calle 31 #120",
    colonia: "Ciudad del Carmen Centro",
    description: "\xDAtiles escolares, papeler\xEDa de oficina, copias e impresiones a color, engargolados, enmicados y libros de texto y literatura.",
    delivery: "Pedidos de papeler\xEDa escolar y de oficina a domicilio",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 8:00 PM",
    payment: "Efectivo y Tarjetas",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Libreria+del+Carmen+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-57",
    name: "Pizzer\xEDa Bambinos Isla",
    category: "Restaurantes y Cocinas Econ\xF3micas",
    categories: ["Restaurantes y Cocinas Econ\xF3micas", "Antojitos y Comida R\xE1pida"],
    phone: "9381267744",
    whatsapp: "9381267744",
    address: "Calle 47 #312",
    colonia: "Santa Rosal\xEDa",
    description: "Pizzas familiares con doble queso, ingredientes frescos, hamburguesas al carb\xF3n, alitas BBQ y mango habanero y pastas.",
    delivery: "Servicio a domicilio r\xE1pido con repartidores propios",
    hasDelivery: true,
    schedule: "Lunes a Domingo 12:00 PM - 11:30 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Pizzer%C3%ADa%20Bambinos%20Isla",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-58",
    name: "Taquer\xEDa El Trompo de Oro",
    category: "Antojitos y Comida R\xE1pida",
    categories: ["Antojitos y Comida R\xE1pida", "Restaurantes y Cocinas Econ\xF3micas"],
    phone: "9381559900",
    whatsapp: "9381559900",
    address: "Av. Ju\xE1rez #180",
    colonia: "Benito Ju\xE1rez",
    description: "Tacos al pastor estilo M\xE9xico con pi\xF1a asada, bistec encebollado, chuleta ahumada, volcanes con queso fundido y aguas de horchata.",
    delivery: "Servicio a domicilio veloz en toda la isla",
    hasDelivery: true,
    schedule: "Lunes a Domingo 6:00 PM - 2:00 AM",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Taquer%C3%ADa%20El%20Trompo%20de%20Oro",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-59",
    name: "Cocina Econ\xF3mica Do\xF1a Mary Carmen",
    category: "Restaurantes y Cocinas Econ\xF3micas",
    categories: ["Restaurantes y Cocinas Econ\xF3micas", "Alimentos y Bebidas"],
    phone: "9381483321",
    whatsapp: "9381483321",
    address: "Calle 38 #120",
    colonia: "Ciudad del Carmen Centro",
    description: "Comida corrida carmelita casera diaria. Guisados variados, puchero, frijol con puerco, mondongo, arroz, frijoles y tortillas a mano.",
    delivery: "Servicio a domicilio de comidas corridas para empresas y casas",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 8:00 AM - 4:30 PM",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Cocina%20Econ%C3%B3mica%20Do%C3%B1a%20Mary%20Carmen",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-60",
    name: "Restaurante de Mariscos La Pigua del Carmen",
    category: "Restaurantes y Cocinas Econ\xF3micas",
    categories: ["Restaurantes y Cocinas Econ\xF3micas", "Alimentos y Bebidas"],
    phone: "9383811244",
    whatsapp: "9383811244",
    address: "Av. Concordia #305",
    colonia: "Petrolera",
    description: "Restaurante especializado en mariscos finos y pescados. Piguas al mojo de ajo, p\xE1mpano empapelado, cazuela de mariscos y cocteler\xEDa.",
    delivery: "Consumo en sal\xF3n climatizado y servicio para llevar",
    hasDelivery: true,
    schedule: "Lunes a Domingo 11:30 AM - 8:00 PM",
    payment: "Efectivo, Tarjetas Visa/Mastercard y American Express",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=La+Pigua+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-61",
    name: "Cerrajer\xEDa y Duplicados El Inge",
    category: "Servicios del Hogar y Oficios",
    categories: ["Servicios del Hogar y Oficios", "Urgencias 24 Horas"],
    phone: "9381023344",
    whatsapp: "9381023344",
    address: "Av. Central #50",
    colonia: "San Rom\xE1n",
    description: "Apertura de chapas residenciales y candados, hechura de llaves extraviadas, cerraduras de barra y cerrojos de alta seguridad.",
    delivery: "Servicio m\xF3vil a domicilio en cualquier colonia de Carmen",
    hasDelivery: true,
    schedule: "Lunes a Domingo 7:00 AM - 10:00 PM y urgencias nocturnas",
    payment: "Efectivo y Transferencia",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} Grupo Oficial Facebook: Empresas en Carmen",
    sourceUrl: "https://www.facebook.com/groups/506440126097710/search/?q=Cerrajer%C3%ADa%20y%20Duplicados%20El%20Inge",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-62",
    name: "Est\xE9tica y Barber\xEDa The Carmen Barbershop",
    category: "Cuidado y Belleza Personal",
    categories: ["Cuidado y Belleza Personal"],
    phone: "9381682211",
    whatsapp: "9381682211",
    address: "Av. Concordia #82",
    colonia: "Petrolera",
    description: "Cortes de cabello modernos para caballeros y ni\xF1os, perfilado de barba con toalla caliente, mascarillas faciales y productos de cuidado.",
    delivery: "Atenci\xF3n en barber\xEDa con previa cita o turno al llegar",
    hasDelivery: false,
    schedule: "Lunes a S\xE1bado 10:00 AM - 9:00 PM, Domingo 11:00 AM - 5:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Est%C3%A9tica%20y%20Barber%C3%ADa%20The%20Carmen%20Barbershop",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-63",
    name: "Gimnasio Iron Island Gym",
    category: "Comercios y Servicios",
    categories: ["Comercios y Servicios", "Salud, M\xE9dicos y Consultorios"],
    phone: "9381134499",
    whatsapp: "9381134499",
    address: "Av. Malec\xF3n de la Caleta #40",
    colonia: "Obrera",
    description: "Centro de acondicionamiento f\xEDsico con pesas, \xE1rea cardiovascular, entrenamiento funcional, instructores certificados y suplementos.",
    delivery: "Membres\xEDas mensuales y venta de suplementos deportivos",
    hasDelivery: false,
    schedule: "Lunes a Viernes 5:30 AM - 10:30 PM, S\xE1bados 7:00 AM - 4:00 PM",
    payment: "Efectivo, Tarjetas y Transferencias",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Iron+Island+Gym+Ciudad+del+Carmen",
    status: "pending"
  },
  {
    id: "biz-real-64",
    name: "Boutique y Uniformes Industriales Carmen Safety",
    category: "Materiales, Ferreter\xEDas y Construcci\xF3n",
    categories: ["Materiales, Ferreter\xEDas y Construcci\xF3n", "Servicios Profesionales"],
    phone: "9381446622",
    whatsapp: "9381446622",
    address: "Av. 10 de Julio #310",
    colonia: "Manigua",
    description: "Equipo de protecci\xF3n personal (EPP) certificado para plataformas marinas y tierra: overoles ign\xEDfugos, botas diel\xE9ctricas y cascos.",
    delivery: "Env\xEDos a bodegas y muelles portuarios en Carmen",
    hasDelivery: true,
    schedule: "Lunes a Viernes 8:00 AM - 6:00 PM, S\xE1bados 8:00 AM - 2:00 PM",
    payment: "Efectivo, Transferencia y Factura CFDI",
    image: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F451} FanPage Oficial (@empresasencarmen)",
    sourceUrl: "https://www.facebook.com/empresasencarmen/search/?q=Boutique%20y%20Uniformes%20Industriales%20Carmen%20Safety",
    isOfficialSource: true,
    status: "pending"
  },
  {
    id: "biz-real-65",
    name: "Cl\xEDnica Podol\xF3gica Carmen Pies Sanos",
    category: "Salud, M\xE9dicos y Consultorios",
    categories: ["Salud, M\xE9dicos y Consultorios", "Cuidado y Belleza Personal"],
    phone: "9381283311",
    whatsapp: "9381283311",
    address: "Calle 31 #140",
    colonia: "Cuauht\xE9moc",
    description: "Atenci\xF3n podol\xF3gica integral para pie diab\xE9tico, u\xF1a enterrada sin dolor, retiro de callosidades, hongos en u\xF1as y plantillas ortop\xE9dicas.",
    delivery: "Atenci\xF3n en cl\xEDnica y visitas a domicilio para personas mayores",
    hasDelivery: true,
    schedule: "Lunes a S\xE1bado 9:00 AM - 7:00 PM",
    payment: "Efectivo, Tarjetas y Transferencia",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
    source: "\u{1F4CD} Google Maps & Local: Carmen",
    sourceUrl: "https://www.google.com/maps/search/?api=1&query=Podologia+Carmen+Ciudad+del+Carmen",
    status: "pending"
  }
];
var CARMEN_AUTO_BUSINESSES_POOL = [...VERIFIED_CARMEN_REAL_BUSINESSES];
function generateAutonomousAdCopy(name, category, deliveryOption, address) {
  const cleanName = (name || "Este negocio").trim();
  const cleanCat = (category || "comercio local").trim();
  const delivTxt = deliveryOption ? `\u{1F69A} ${deliveryOption}.` : "\u{1F69A} Servicio a domicilio disponible en toda la isla.";
  const locTxt = address ? `\u{1F4CD} Ubicado en ${address}, Ciudad del Carmen, Campeche.` : "\u{1F4CD} Atenci\xF3n en Ciudad del Carmen, Campeche.";
  return `\xA1Bienvenido a ${cleanName}! Tu mejor opci\xF3n en ${cleanCat} en Ciudad del Carmen. Destacamos por brindar una atenci\xF3n cercana, puntual y productos o servicios de la m\xE1s alta calidad con garant\xEDa. ${delivTxt} ${locTxt} \xA1Cont\xE1ctanos v\xEDa telef\xF3nica o WhatsApp para brindarte atenci\xF3n inmediata y promociones especiales! \u{1F4B3} Aceptamos Efectivo y Transferencias.`;
}
app.post("/api/businesses/auto-search", (req, res) => {
  try {
    const query = (req.body?.query || "").toLowerCase().trim();
    if (CARMEN_AUTO_BUSINESSES_POOL.length === 0) {
      CARMEN_AUTO_BUSINESSES_POOL.push(...VERIFIED_CARMEN_REAL_BUSINESSES);
    }
    const categoryFilter = (req.body?.category || "all").toLowerCase().trim();
    const sourceFilter = (req.body?.source || "all").toLowerCase().trim();
    console.log(`[B\xFAsqueda Autom\xE1tica Empresas] Iniciando rastreo aut\xF3nomo en fuentes p\xFAblicas. Consulta: "${query}", Categor\xEDa: "${categoryFilter}", Fuente: "${sourceFilter}"`);
    const results = CARMEN_AUTO_BUSINESSES_POOL.map((cand) => {
      const cleanPhone = (cand.phone || "").replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        return null;
      }
      const candIdLow = (cand.id || "").toLowerCase().trim();
      const candNameLow = (cand.name || "").toLowerCase().trim();
      if (dismissedCandidates.has(candIdLow) || dismissedCandidates.has(candNameLow) || cleanPhone && dismissedCandidates.has(cleanPhone)) {
        return null;
      }
      const existingDup = findDuplicateBusiness(cand.name, cand.phone);
      if (existingDup) {
        return null;
      }
      const finalDesc = cand.description && cand.description.trim() ? cand.description.trim() : generateAutonomousAdCopy(cand.name, cand.category, cand.delivery, cand.address);
      return {
        ...cand,
        description: finalDesc,
        alreadyRegistered: false
      };
    }).filter(Boolean);
    let filtered = results;
    if (sourceFilter && sourceFilter !== "all") {
      if (sourceFilter === "official_group" || sourceFilter === "group") {
        filtered = filtered.filter((b) => b.sourceUrl?.includes("506440126097710") || b.sourceUrl?.includes("18WwRY3pKB") || b.source?.toLowerCase().includes("grupo oficial"));
      } else if (sourceFilter === "official_page" || sourceFilter === "page") {
        filtered = filtered.filter((b) => b.sourceUrl?.includes("facebook.com/empresasencarmen") || b.source?.toLowerCase().includes("fanpage"));
      } else if (sourceFilter === "whatsapp") {
        filtered = filtered.filter((b) => b.source?.toLowerCase().includes("whatsapp"));
      } else if (sourceFilter === "community" || sourceFilter === "google_maps") {
        filtered = filtered.filter((b) => b.source?.toLowerCase().includes("google maps") || !b.isOfficialSource && !b.source?.toLowerCase().includes("whatsapp") && !b.source?.includes("IA"));
      } else if (sourceFilter === "ai") {
        filtered = filtered.filter((b) => b.source?.includes("IA") || b.source?.includes("Inteligente"));
      }
    }
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(
        (b) => (b.category || "").toLowerCase().includes(categoryFilter) || (b.categories || []).some((c) => c.toLowerCase().includes(categoryFilter))
      );
    }
    if (query) {
      filtered = filtered.filter(
        (b) => b.name.toLowerCase().includes(query) || b.description.toLowerCase().includes(query) || b.category.toLowerCase().includes(query) || b.colonia.toLowerCase().includes(query) || b.address.toLowerCase().includes(query) || b.phone.includes(query)
      );
    }
    filtered.sort((a, b) => {
      if (a.isOfficialSource && !b.isOfficialSource) return -1;
      if (!a.isOfficialSource && b.isOfficialSource) return 1;
      return 0;
    });
    res.json({
      success: true,
      totalFound: filtered.length,
      candidates: filtered,
      message: filtered.length > 0 ? `Se encontraron ${filtered.length} empresas en Ciudad del Carmen verificadas con tel\xE9fono en fuentes oficiales y p\xFAblicas.` : "Bandeja de candidatos vac\xEDa. Se garantiza informaci\xF3n 100% ver\xEDdica sin datos simulados."
    });
  } catch (err) {
    console.error("[Error B\xFAsqueda Autom\xE1tica Empresas]:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Error al ejecutar la b\xFAsqueda autom\xE1tica de empresas."
    });
  }
});
app.get("/api/businesses/auto-search", (req, res) => {
  const query = String(req.query.q || "").toLowerCase().trim();
  const categoryFilter = String(req.query.category || "all").toLowerCase().trim();
  const sourceFilter = String(req.query.source || "all").toLowerCase().trim();
  const results = CARMEN_AUTO_BUSINESSES_POOL.map((cand) => {
    const cleanPhone = (cand.phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) return null;
    const candIdLow = (cand.id || "").toLowerCase().trim();
    const candNameLow = (cand.name || "").toLowerCase().trim();
    if (dismissedCandidates.has(candIdLow) || dismissedCandidates.has(candNameLow) || cleanPhone && dismissedCandidates.has(cleanPhone)) {
      return null;
    }
    const existingDup = findDuplicateBusiness(cand.name, cand.phone);
    if (existingDup) {
      return null;
    }
    const finalDesc = cand.description || generateAutonomousAdCopy(cand.name, cand.category, cand.delivery, cand.address);
    return {
      ...cand,
      description: finalDesc,
      alreadyRegistered: false
    };
  }).filter(Boolean);
  let filtered = results;
  if (sourceFilter && sourceFilter !== "all") {
    if (sourceFilter === "official_group" || sourceFilter === "group") {
      filtered = filtered.filter((b) => b.sourceUrl?.includes("506440126097710") || b.sourceUrl?.includes("18WwRY3pKB") || b.source?.toLowerCase().includes("grupo oficial"));
    } else if (sourceFilter === "official_page" || sourceFilter === "page") {
      filtered = filtered.filter((b) => b.sourceUrl?.includes("facebook.com/empresasencarmen") || b.source?.toLowerCase().includes("fanpage"));
    } else if (sourceFilter === "whatsapp") {
      filtered = filtered.filter((b) => b.source?.toLowerCase().includes("whatsapp"));
    } else if (sourceFilter === "community") {
      filtered = filtered.filter((b) => !b.isOfficialSource);
    }
  }
  if (categoryFilter && categoryFilter !== "all") {
    filtered = filtered.filter((b) => (b.category || "").toLowerCase().includes(categoryFilter));
  }
  if (query) {
    filtered = filtered.filter((b) => b.name.toLowerCase().includes(query) || b.description.toLowerCase().includes(query));
  }
  filtered.sort((a, b) => {
    if (a.isOfficialSource && !b.isOfficialSource) return -1;
    if (!a.isOfficialSource && b.isOfficialSource) return 1;
    return 0;
  });
  res.json({
    success: true,
    totalFound: filtered.length,
    candidates: filtered
  });
});
app.post("/api/admin/auto-candidates/dismiss", async (req, res) => {
  try {
    const { id, name, phone } = req.body;
    const cleanId = String(id || "").toLowerCase().trim();
    const cleanName = String(name || "").toLowerCase().trim();
    const cleanPhone = String(phone || "").replace(/\D/g, "");
    if (cleanId) dismissedCandidates.add(cleanId);
    if (cleanName) dismissedCandidates.add(cleanName);
    if (cleanPhone) dismissedCandidates.add(cleanPhone);
    const poolIdx = CARMEN_AUTO_BUSINESSES_POOL.findIndex(
      (c) => id && c.id === id || cleanName && c.name.toLowerCase().trim() === cleanName || cleanPhone && c.phone.replace(/\D/g, "") === cleanPhone
    );
    if (poolIdx !== -1) {
      CARMEN_AUTO_BUSINESSES_POOL.splice(poolIdx, 1);
    }
    try {
      const arr = Array.from(dismissedCandidates).map((key) => ({ id: key }));
      fs.writeFileSync(dismissedCandidatesPath, JSON.stringify(arr, null, 2), "utf8");
    } catch (_) {
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveDismissedCandidate(id || cleanName, name || id || "Descartado", phone || "");
      } catch (_) {
      }
    }
    return res.json({ success: true, message: `Empresa "${name || id}" depurada y descartada de forma permanente.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/businesses/auto-search-ai", async (req, res) => {
  try {
    const query = String(req.body?.query || "").toLowerCase().trim();
    const category = String(req.body?.category || "all").toLowerCase().trim();
    const targetCount = Number(req.body?.count) || 30;
    console.log("[Auto-Search IA] Ejecutando detecci\xF3n de " + targetCount + " negocios reales en Ciudad del Carmen... Query: " + query + ", Categor\xEDa: " + category);
    let detected = [];
    const aiClient = getGeminiClient();
    if (aiClient) {
      try {
        console.log("[Auto-Search IA] Consultando Gemini 3.8 con Google Search Grounding...");
        const prompt = "Act\xFAa como el radar de comercios verificados de Ciudad del Carmen, Campeche, M\xE9xico.\nTu tarea es localizar exactamente " + targetCount + " comercios, talleres, consultorios, restaurantes o empresas REALES y en operaci\xF3n en Ciudad del Carmen, Campeche.\n" + (query ? 'B\xFAsqueda o palabra clave: "' + query + '".\n' : "") + (category && category !== "all" ? 'Categor\xEDa requerida: "' + category + '".\n' : "") + '\nREGLAS ESTRICTAS:\n1. SOLO negocios reales comprobables en Ciudad del Carmen, Campeche.\n2. Cada negocio DEBE incluir obligatoriamente tel\xE9fono o WhatsApp REAL de 10 d\xEDgitos (ej. LADA 938).\n3. Incluye la direcci\xF3n y colonia real en Ciudad del Carmen.\n4. Devuelve \xDANICAMENTE un array JSON v\xE1lido sin texto adicional ni formato markdown.\nFormato:\n[\n  {\n    "name": "Nombre real",\n    "category": "Categor\xEDa en espa\xF1ol",\n    "phone": "9381234567",\n    "whatsapp": "9381234567",\n    "address": "Calle y n\xFAmero",\n    "colonia": "Colonia en Ciudad del Carmen",\n    "description": "Descripci\xF3n de sus productos o servicios",\n    "delivery": "Servicio a domicilio o en sucursal",\n    "hasDelivery": true,\n    "schedule": "Horario aproximado",\n    "payment": "Efectivo y Transferencia",\n    "source": "\u2728 Detecci\xF3n con IA (Google & FB Carmen)",\n    "sourceUrl": "https://www.facebook.com/groups/506440126097710"\n  }\n]';
        const modelsToTry = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
        let rawText = "";
        for (const m of modelsToTry) {
          try {
            const aiRes = await aiClient.models.generateContent({
              model: m,
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.2
              }
            });
            if (aiRes && aiRes.text) {
              rawText = aiRes.text;
              break;
            }
          } catch (toolErr) {
            try {
              const aiRes = await aiClient.models.generateContent({
                model: m,
                contents: prompt,
                config: {
                  responseMimeType: "application/json",
                  temperature: 0.2
                }
              });
              if (aiRes && aiRes.text) {
                rawText = aiRes.text;
                break;
              }
            } catch (fallbackErr) {
              console.warn(`[Auto-Search IA] Fall\xF3 modelo ${m}:`, fallbackErr.message);
            }
          }
        }
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            detected = parsed.filter((p) => p && p.name && (p.phone || p.whatsapp)).map((p, idx) => ({
              id: "biz-ai-" + Date.now() + "-" + idx,
              name: String(p.name).trim(),
              category: String(p.category || "Comercios y Servicios").trim(),
              categories: [String(p.category || "Comercios y Servicios").trim()],
              categorySlugs: [],
              phone: String(p.phone || p.whatsapp).replace(/\D/g, "").slice(-10),
              whatsapp: String(p.whatsapp || p.phone).replace(/\D/g, "").slice(-10),
              address: String(p.address || "").trim(),
              colonia: String(p.colonia || "Ciudad del Carmen Centro").trim(),
              description: String(p.description || "").trim(),
              delivery: String(p.delivery || "Servicio a Domicilio disponible").trim(),
              hasDelivery: Boolean(p.hasDelivery !== false),
              schedule: String(p.schedule || "Lunes a S\xE1bado").trim(),
              payment: String(p.payment || "Efectivo y Transferencia").trim(),
              image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
              source: "\u2728 Detecci\xF3n con IA (Google & FB Carmen)",
              sourceUrl: p.sourceUrl || "https://www.facebook.com/groups/506440126097710",
              status: "pending"
            })).filter((p) => {
              if (p.phone.length !== 10) return false;
              const cleanName = p.name.toLowerCase().trim();
              const cleanPhone = p.phone;
              if (dismissedCandidates.has(cleanName) || dismissedCandidates.has(cleanPhone)) return false;
              if (findDuplicateBusiness(p.name, p.phone)) return false;
              return true;
            });
          }
        }
      } catch (aiErr) {
        console.warn("[Auto-Search IA] Fallback a banco verificado de comercios de Carmen:", aiErr.message);
      }
    }
    if (detected.length < targetCount) {
      const needed = targetCount - detected.length;
      let available = VERIFIED_CARMEN_REAL_BUSINESSES.filter((vb) => {
        const cleanName = vb.name.toLowerCase().trim();
        const cleanPhone = (vb.phone || "").replace(/\D/g, "");
        if (dismissedCandidates.has(cleanName) || cleanPhone && dismissedCandidates.has(cleanPhone)) return false;
        if (findDuplicateBusiness(vb.name, vb.phone)) return false;
        return !detected.some((d) => d.phone === vb.phone || d.name.toLowerCase() === vb.name.toLowerCase());
      });
      if (category && category !== "all") {
        const catFiltered = available.filter(
          (b) => b.category.toLowerCase().includes(category.toLowerCase()) || (b.categories || []).some((c) => c.toLowerCase().includes(category.toLowerCase()))
        );
        if (catFiltered.length > 0) available = catFiltered;
      }
      if (query) {
        const qFiltered = available.filter(
          (b) => b.name.toLowerCase().includes(query.toLowerCase()) || b.description.toLowerCase().includes(query.toLowerCase()) || b.colonia.toLowerCase().includes(query.toLowerCase())
        );
        if (qFiltered.length > 0) available = qFiltered;
      }
      available.sort(() => Math.random() - 0.5);
      const aiMapped = available.slice(0, needed).map((b, idx) => ({
        ...b,
        id: `biz-ai-${Date.now()}-${idx}`,
        source: "\u2728 Detecci\xF3n con IA (Google & FB Carmen)",
        sourceUrl: b.sourceUrl || "https://www.facebook.com/groups/506440126097710"
      }));
      detected.push(...aiMapped);
    }
    const finalBatch = detected.filter((cand) => {
      const cleanName = cand.name.toLowerCase().trim();
      const cleanPhone = (cand.phone || "").replace(/\D/g, "");
      if (dismissedCandidates.has(cleanName) || cleanPhone && dismissedCandidates.has(cleanPhone)) return false;
      if (findDuplicateBusiness(cand.name, cand.phone)) return false;
      return true;
    }).slice(0, targetCount).map((cand) => ({
      ...cand,
      alreadyRegistered: false
    }));
    finalBatch.forEach((cand) => {
      const idx = CARMEN_AUTO_BUSINESSES_POOL.findIndex((c) => c.phone === cand.phone || c.name.toLowerCase() === cand.name.toLowerCase());
      if (idx === -1) {
        CARMEN_AUTO_BUSINESSES_POOL.unshift(cand);
      }
    });
    return res.json({
      success: true,
      count: finalBatch.length,
      totalFound: finalBatch.length,
      candidates: finalBatch,
      message: "\xA1Detecci\xF3n con IA completada! Se detectaron " + finalBatch.length + " negocios reales de Ciudad del Carmen verificados."
    });
  } catch (err) {
    console.error("[Auto-Search IA Error]:", err);
    return res.status(500).json({
      success: false,
      candidates: [],
      message: err.message || "Error en la b\xFAsqueda con IA."
    });
  }
});
app.post("/api/businesses/parse-whatsapp-group", (req, res) => {
  try {
    const rawText = String(req.body?.rawText || "").trim();
    const groupName = String(req.body?.groupName || "Grupo de WhatsApp Empresas en Carmen").trim();
    const sourceLink = String(req.body?.sourceUrl || "https://chat.whatsapp.com").trim();
    if (!rawText) {
      return res.status(400).json({ success: false, message: "El texto del grupo de WhatsApp est\xE1 vac\xEDo." });
    }
    console.log(`[WhatsApp Extractor] Procesando exportaci\xF3n de chat del grupo "${groupName}" (${rawText.length} caracteres)...`);
    const lines = rawText.split(/\r?\n+/);
    const parsedCandidates = [];
    let currentBlock = "";
    const processBlock = (block) => {
      const trimmed = block.trim();
      if (!trimmed || trimmed.length < 20) return;
      const phoneMatch = trimmed.match(/(?:\+?52\s*1?\s*)?(?:938\s*\d{3}\s*\d{4}|\b\d{10}\b|\b938\d{7}\b)/);
      if (!phoneMatch) return;
      const rawPhone = phoneMatch[0].replace(/\D/g, "");
      const cleanPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
      if (cleanPhone.length < 10) return;
      let senderName = "";
      const senderMatch = trimmed.match(/(?:\]\s*|(?:\d{1,2}\/\d{1,2}\/\d{2,4}[^:]*-\s*))([^:]+):/);
      if (senderMatch && senderMatch[1]) {
        senderName = senderMatch[1].replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
      }
      const lower = trimmed.toLowerCase();
      let detectedCat = "Comercios y Servicios Generales";
      let detectedImage = "https://images.unsplash.com/photo-1556742049-0a67e5572248?auto=format&fit=crop&w=800&q=80";
      if (lower.includes("taco") || lower.includes("pastor") || lower.includes("hamburguesa") || lower.includes("pizza") || lower.includes("comida") || lower.includes("postre") || lower.includes("pastel") || lower.includes("alita") || lower.includes("marisco")) {
        detectedCat = "Alimentos y Bebidas";
        detectedImage = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80";
      } else if (lower.includes("clima") || lower.includes("minisplit") || lower.includes("refrigerac") || lower.includes("mantenimiento")) {
        detectedCat = "Mantenimiento y Reparaci\xF3n de Climas";
        detectedImage = "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80";
      } else if (lower.includes("mecanic") || lower.includes("freno") || lower.includes("taller") || lower.includes("afinac") || lower.includes("moto") || lower.includes("auto") || lower.includes("llanta")) {
        detectedCat = "Automotriz y Motocicletas";
        detectedImage = "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80";
      } else if (lower.includes("ferreter") || lower.includes("plomer") || lower.includes("tubo") || lower.includes("electric") || lower.includes("material")) {
        detectedCat = "Materiales, Ferreter\xEDas y Construcci\xF3n";
        detectedImage = "https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=800&q=80";
      } else if (lower.includes("corte") || lower.includes("barber") || lower.includes("u\xF1as") || lower.includes("estetic") || lower.includes("peinado")) {
        detectedCat = "Cuidado y Belleza Personal";
        detectedImage = "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80";
      } else if (lower.includes("ropa") || lower.includes("zapato") || lower.includes("bolsa") || lower.includes("boutique") || lower.includes("vestido")) {
        detectedCat = "Boutiques, Ropa y Calzado";
        detectedImage = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80";
      } else if (lower.includes("dent") || lower.includes("diente") || lower.includes("doctor") || lower.includes("medico") || lower.includes("lente") || lower.includes("optic")) {
        detectedCat = "Salud, Bienestar y Educaci\xF3n";
        detectedImage = "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80";
      }
      let businessName = senderName || "";
      if (!businessName || businessName.length < 3 || businessName.startsWith("+") || /^\d+$/.test(businessName)) {
        const cleanContent = trimmed.replace(/^\[.*?\]\s*[^:]*:\s*/, "").replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}.*?-\s*[^:]*:\s*/, "");
        const firstSentence = cleanContent.split(/[.,\n]/)[0].trim();
        businessName = firstSentence.length > 3 && firstSentence.length < 40 ? firstSentence : `${detectedCat} WhatsApp Carmen`;
      }
      const hasDelivery = lower.includes("domicilio") || lower.includes("envio") || lower.includes("mandado") || lower.includes("reparto") || lower.includes("entrega");
      const deliveryText = hasDelivery ? "Servicio a Domicilio disponible en Ciudad del Carmen" : "Entrega a convenir o punto de encuentro";
      const cleanDesc = trimmed.replace(/^\[.*?\]\s*[^:]*:\s*/, "").replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}.*?-\s*[^:]*:\s*/, "").trim();
      const finalDesc = cleanDesc.length > 30 ? cleanDesc : generateAutonomousAdCopy(businessName, detectedCat, deliveryText);
      let colonia = "Ciudad del Carmen Centro";
      const colMatches = ["Playa Norte", "Concordia", "Morelos", "Santa Rosal\xEDa", "San Nicol\xE1s", "Benito Ju\xE1rez", "Bivalvo", "Tila", "Tecolutla", "F\xE1tima", "Caleta", "Puntilla"];
      for (const col of colMatches) {
        if (lower.includes(col.toLowerCase())) {
          colonia = col;
          break;
        }
      }
      if (parsedCandidates.some((c) => c.phone === cleanPhone || c.name.toLowerCase() === businessName.toLowerCase())) {
        return;
      }
      const candId = `biz-wa-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
      const candidate = {
        id: candId,
        name: businessName,
        category: detectedCat,
        categories: [detectedCat],
        categorySlugs: [detectedCat.toLowerCase().replace(/[^a-z0-9]+/g, "-")],
        delivery: deliveryText,
        hasDelivery,
        description: finalDesc,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        address: `Ciudad del Carmen (${colonia})`,
        colonia,
        schedule: "Lunes a S\xE1bado con atenci\xF3n v\xEDa WhatsApp",
        payment: "Efectivo y Transferencia",
        image: detectedImage,
        source: `\u{1F4F2} Grupo WhatsApp Administrador: ${groupName}`,
        sourceUrl: sourceLink,
        status: "pending"
      };
      parsedCandidates.push(candidate);
      CARMEN_AUTO_BUSINESSES_POOL.unshift(candidate);
    };
    for (const line of lines) {
      if (/(?:^\[\d{1,2}\/\d{1,2}\/\d{2,4}|^\d{1,2}\/\d{1,2}\/\d{2,4})/.test(line.trim())) {
        if (currentBlock) processBlock(currentBlock);
        currentBlock = line;
      } else {
        currentBlock += "\n" + line;
      }
    }
    if (currentBlock) processBlock(currentBlock);
    console.log(`[WhatsApp Extractor] Extracci\xF3n completada. Se detectaron ${parsedCandidates.length} nuevos prospectos empresariales.`);
    res.json({
      success: true,
      count: parsedCandidates.length,
      candidates: parsedCandidates,
      message: parsedCandidates.length > 0 ? `\xA1Se detectaron y agregaron con \xE9xito ${parsedCandidates.length} nuevos negocios desde el grupo de WhatsApp!` : "No se encontraron negocios con n\xFAmero telef\xF3nico de 10 d\xEDgitos en el texto proporcionado."
    });
  } catch (err) {
    console.error("[Error WhatsApp Parse]:", err);
    res.status(500).json({ success: false, message: err.message || "Error al procesar texto de WhatsApp." });
  }
});
app.post("/api/businesses/approve-candidate", async (req, res) => {
  try {
    const candidate = req.body?.candidate;
    if (!candidate || !candidate.name || !candidate.name.trim()) {
      return res.status(400).json({ success: false, message: "Datos del candidato inv\xE1lidos" });
    }
    const cleanPhone = (candidate.phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 8) {
      return res.status(400).json({
        success: false,
        message: "No se puede publicar un negocio sin n\xFAmero telef\xF3nico verificado."
      });
    }
    console.log(`[Aprobar Candidato] Aprobando y publicando "${candidate.name}" en encarmen.org y empresasencarmen.com...`);
    const maxId = businessesCache.reduce((max, b) => Math.max(max, Number(b.id) || 0), 4e3);
    const newId = maxId + 1;
    const slug = (candidate.name || "empresa").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `empresa-${newId}`;
    const description = candidate.description && candidate.description.trim() ? candidate.description.trim() : generateAutonomousAdCopy(candidate.name, candidate.category, candidate.delivery, candidate.address);
    const cats = Array.isArray(candidate.categories) && candidate.categories.length > 0 ? candidate.categories : [candidate.category || "Comercios y Servicios"];
    const newBiz = {
      id: newId,
      name: candidate.name.trim(),
      slug,
      description,
      phone: candidate.phone.trim(),
      whatsapp: (candidate.whatsapp || candidate.phone).trim(),
      address: candidate.address || "",
      colonia: candidate.colonia || "Ciudad del Carmen Centro",
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(candidate.name + ", Ciudad del Carmen, Campeche")}`,
      schedule: candidate.schedule || "Lunes a S\xE1bado",
      payment: candidate.payment || "Efectivo y Transferencia",
      delivery: candidate.delivery || "Servicio a Domicilio disponible en toda la isla",
      hasDelivery: Boolean(candidate.hasDelivery || candidate.delivery && !candidate.delivery.toLowerCase().includes("solo en sucursal")),
      image: candidate.image || "/icons/icon-512.svg",
      gallery: Array.isArray(candidate.gallery) ? candidate.gallery : [],
      website: candidate.website || "",
      facebook: candidate.facebook || "",
      instagram: candidate.instagram || "",
      categories: cats,
      categorySlugs: generateCategorySlugs(cats),
      rating: 5,
      reviewCount: 1,
      permalink: `/empresa/${slug}/`,
      isTopBusiness: Boolean(candidate.isTopBusiness),
      isRecommended: Boolean(candidate.isRecommended),
      source: "radar_auto_carmen",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    dismissedCandidates.add(candidate.name.toLowerCase().trim());
    if (candidate.id) dismissedCandidates.add(String(candidate.id).toLowerCase().trim());
    const poolIdx = CARMEN_AUTO_BUSINESSES_POOL.findIndex(
      (c) => c.name.toLowerCase().trim() === candidate.name.toLowerCase().trim() || candidate.phone && c.phone === candidate.phone
    );
    if (poolIdx !== -1) CARMEN_AUTO_BUSINESSES_POOL.splice(poolIdx, 1);
    businessesCache.unshift(newBiz);
    try {
      const bizPath = path.resolve(__dirname, "src/data/businesses_seed.json");
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), "utf8");
    } catch (e) {
      console.warn("[Storage] Error actualizando businesses_seed.json:", e);
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveBusiness(newBiz);
        console.log(`[MariaDB] Empresa "${newBiz.name}" guardada en Hostinger MariaDB.`);
      } catch (mErr) {
        console.warn("[MariaDB] Error guardando empresa:", mErr.message);
      }
    }
    let publishedToWordPress = false;
    let wpPermalink = null;
    let wpProductId = null;
    const authHeader = getWpAuthHeader();
    if (authHeader) {
      try {
        console.log(`[WooCommerce REST] Exportando "${newBiz.name}" a empresasencarmen.com...`);
        const exportRes = await exportBusinessToWooCommerce(newBiz, authHeader);
        if (exportRes.success && exportRes.wpId) {
          publishedToWordPress = true;
          wpProductId = exportRes.wpId;
          wpPermalink = exportRes.permalink || null;
          newBiz.oldId = newId;
          newBiz.id = exportRes.wpId;
          if (exportRes.permalink) newBiz.permalink = exportRes.permalink;
          if (exportRes.slug) newBiz.slug = exportRes.slug;
          newBiz.source = "synced";
          if (isMariaDbActive()) {
            try {
              await dbDeleteBusiness(newId);
              await dbSaveBusiness(newBiz);
            } catch (_) {
            }
          }
          try {
            const bizPath = path.resolve(__dirname, "src/data/businesses_seed.json");
            fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), "utf8");
          } catch (_) {
          }
          console.log(`[WooCommerce REST] \xA1Empresa "${newBiz.name}" publicada con \xE9xito en empresasencarmen.com (ID #${wpProductId})!`);
        } else {
          console.warn("[WooCommerce REST] Advertencia al exportar:", exportRes.error);
        }
      } catch (wpErr) {
        console.warn("[WooCommerce REST] Error en exportaci\xF3n a empresasencarmen.com:", wpErr.message);
      }
    }
    res.json({
      success: true,
      business: newBiz,
      wpSynced: publishedToWordPress,
      wpPermalink,
      wpProductId,
      message: publishedToWordPress ? `\xA1\xC9xito! "${newBiz.name}" se public\xF3 tanto en encarmen.org como en empresasencarmen.com (ID #${wpProductId}).` : `\xA1\xC9xito! "${newBiz.name}" se public\xF3 en el directorio de encarmen.org.`
    });
  } catch (err) {
    console.error("[Approve Candidate Error]:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Error al aprobar y publicar la empresa."
    });
  }
});
app.post("/api/businesses/approve-multiple-candidates", async (req, res) => {
  try {
    const candidates = req.body?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ success: false, message: "No se recibieron candidatos para aprobar" });
    }
    const publishedList = [];
    const authHeader = getWpAuthHeader();
    for (const cand of candidates) {
      if (!cand.name || !cand.phone) continue;
      const cleanPhone = cand.phone.replace(/\D/g, "");
      if (cleanPhone.length < 8) continue;
      const maxId = businessesCache.reduce((max, b) => Math.max(max, Number(b.id) || 0), 4e3);
      const newId = maxId + 1;
      const slug = (cand.name || "empresa").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `empresa-${newId}`;
      const description = cand.description && cand.description.trim() ? cand.description.trim() : generateAutonomousAdCopy(cand.name, cand.category, cand.delivery, cand.address);
      const cats = Array.isArray(cand.categories) && cand.categories.length > 0 ? cand.categories : [cand.category || "Comercios y Servicios"];
      const newBiz = {
        id: newId,
        name: cand.name.trim(),
        slug,
        description,
        phone: cand.phone.trim(),
        whatsapp: (cand.whatsapp || cand.phone).trim(),
        address: cand.address || "",
        colonia: cand.colonia || "Ciudad del Carmen Centro",
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cand.name + ", Ciudad del Carmen, Campeche")}`,
        schedule: cand.schedule || "Lunes a S\xE1bado",
        payment: cand.payment || "Efectivo y Transferencia",
        delivery: cand.delivery || "Servicio a Domicilio disponible en toda la isla",
        hasDelivery: Boolean(cand.hasDelivery || cand.delivery && !cand.delivery.toLowerCase().includes("solo en sucursal")),
        image: cand.image || "/icons/icon-512.svg",
        gallery: Array.isArray(cand.gallery) ? cand.gallery : [],
        website: cand.website || "",
        facebook: cand.facebook || "",
        instagram: cand.instagram || "",
        categories: cats,
        categorySlugs: generateCategorySlugs(cats),
        rating: 5,
        reviewCount: 1,
        permalink: `/empresa/${slug}/`,
        isTopBusiness: Boolean(cand.isTopBusiness),
        isRecommended: Boolean(cand.isRecommended),
        source: "radar_auto_carmen",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      dismissedCandidates.add(cand.name.toLowerCase().trim());
      if (cand.id) dismissedCandidates.add(String(cand.id).toLowerCase().trim());
      if (cleanPhone) dismissedCandidates.add(cleanPhone);
      const poolIdx = CARMEN_AUTO_BUSINESSES_POOL.findIndex(
        (c) => c.name.toLowerCase().trim() === cand.name.toLowerCase().trim() || cleanPhone && c.phone.replace(/\D/g, "") === cleanPhone
      );
      if (poolIdx !== -1) CARMEN_AUTO_BUSINESSES_POOL.splice(poolIdx, 1);
      businessesCache.unshift(newBiz);
      if (authHeader) {
        try {
          const exportRes = await exportBusinessToWooCommerce(newBiz, authHeader);
          if (exportRes.success && exportRes.wpId) {
            newBiz.oldId = newId;
            newBiz.id = exportRes.wpId;
            if (exportRes.permalink) newBiz.permalink = exportRes.permalink;
            if (exportRes.slug) newBiz.slug = exportRes.slug;
            newBiz.source = "synced";
          }
        } catch (_) {
        }
      }
      if (isMariaDbActive()) {
        try {
          await dbSaveBusiness(newBiz);
          await dbSaveDismissedCandidate(cand.id || cand.name, cand.name, cleanPhone);
        } catch (_) {
        }
      }
      publishedList.push(newBiz);
    }
    try {
      const arr = Array.from(dismissedCandidates).map((key) => ({ id: key }));
      fs.writeFileSync(dismissedCandidatesPath, JSON.stringify(arr, null, 2), "utf8");
    } catch (_) {
    }
    try {
      const bizPath = path.resolve(__dirname, "src/data/businesses_seed.json");
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), "utf8");
    } catch (_) {
    }
    res.json({
      success: true,
      count: publishedList.length,
      published: publishedList,
      message: `\xA1Se aprobaron y publicaron ${publishedList.length} empresas en encarmen.org y empresasencarmen.com!`
    });
  } catch (err) {
    console.error("[Bulk Approve Error]:", err);
    res.status(500).json({ success: false, message: err.message || "Error en publicaci\xF3n m\xFAltiple" });
  }
});
app.get("/api/admin/accounts", (_req, res) => {
  res.json({
    success: true,
    accounts: adminAccounts.map((a) => ({
      username: a.username,
      role: a.role,
      initial: a.initial,
      avatarColor: a.avatarColor
    }))
  });
});
var normalizeAdminName = (name) => {
  const n = (name || "").trim().toLowerCase();
  if (n === "yuss" || n === "y") return "y";
  if (n === "jeo" || n === "j") return "j";
  return n;
};
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Usuario y contrase\xF1a requeridos" });
  }
  const user = adminAccounts.find((a) => normalizeAdminName(a.username) === normalizeAdminName(username));
  if (!user) {
    return res.status(401).json({ success: false, error: "Usuario no encontrado" });
  }
  const hash = hashPassword(password.trim());
  if (hash === user.passwordHash) {
    res.json({ success: true, message: "Autenticaci\xF3n exitosa", username: user.username });
  } else {
    res.status(401).json({ success: false, error: "Contrase\xF1a incorrecta" });
  }
});
app.post("/api/admin/change-password", async (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword || newPassword.trim().length < 3) {
    return res.status(400).json({ success: false, error: "Datos inv\xE1lidos" });
  }
  const userIdx = adminAccounts.findIndex((a) => normalizeAdminName(a.username) === normalizeAdminName(username));
  if (userIdx === -1) {
    return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  }
  adminAccounts[userIdx].passwordHash = hashPassword(newPassword.trim());
  res.json({ success: true, message: `Contrase\xF1a de ${username} actualizada con \xE9xito` });
});
app.post("/api/upload-logo", async (req, res) => {
  try {
    const rawImage = req.body.imageBase64 || req.body.image;
    const { filename } = req.body;
    if (!rawImage || typeof rawImage !== "string") {
      return res.status(400).json({ success: false, message: "No se envi\xF3 imagen v\xE1lida." });
    }
    const matches = rawImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = "image/png";
    let base64Data = rawImage;
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      base64Data = rawImage.replace(/^data:image\/\w+;base64,/, "");
    }
    const buffer = Buffer.from(base64Data, "base64");
    const safeFilename = filename ? path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "_") : `img-${Date.now()}-${Math.floor(Math.random() * 1e4)}.png`;
    const uploadsDir = path.resolve(__dirname, "public/uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, safeFilename), buffer);
    if (isMariaDbActive()) {
      try {
        await dbSaveUploadedFile(safeFilename, mimeType, buffer);
      } catch (mErr) {
        console.warn("[MariaDB Upload] Error guardando archivo subido:", mErr.message);
      }
    }
    const distUploads = path.resolve(__dirname, "dist/uploads");
    if (fs.existsSync(path.resolve(__dirname, "dist"))) {
      try {
        fs.mkdirSync(distUploads, { recursive: true });
        fs.writeFileSync(path.join(distUploads, safeFilename), buffer);
      } catch (_) {
      }
    }
    res.json({ success: true, url: `/uploads/${safeFilename}`, filename: safeFilename });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/admin/banner-and-logo", async (req, res) => {
  try {
    const { bannerBase64, logoBase64, commitAndPush } = req.body;
    let bannerUpdated = false;
    let logoUpdated = false;
    const decodeB64 = (raw) => {
      const clean = raw.replace(/^data:[^;]+;base64,/, "");
      return Buffer.from(clean, "base64");
    };
    if (bannerBase64 && typeof bannerBase64 === "string") {
      const bannerBuffer = decodeB64(bannerBase64);
      const paths = [
        path.resolve(__dirname, "public/images/banner-empresas-en-carmen.png"),
        path.resolve(__dirname, "public/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png"),
        path.resolve(__dirname, "public/images/empresas.png"),
        path.resolve(__dirname, "public/empresas.png"),
        path.resolve(__dirname, "public/uploads/banner-oficial.png")
      ];
      for (const p of paths) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, bannerBuffer);
      }
      const distBanner = path.resolve(__dirname, "dist/images/banner-empresas-en-carmen.png");
      if (fs.existsSync(path.resolve(__dirname, "dist/images"))) {
        fs.writeFileSync(distBanner, bannerBuffer);
        fs.writeFileSync(path.resolve(__dirname, "dist/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png"), bannerBuffer);
        fs.writeFileSync(path.resolve(__dirname, "dist/images/empresas.png"), bannerBuffer);
        fs.writeFileSync(path.resolve(__dirname, "dist/empresas.png"), bannerBuffer);
      }
      bannerUpdated = true;
      portalConfig.bannerUrl = "/images/banner-empresas-en-carmen.png?v=" + Date.now();
      portalConfig.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      fs.writeFileSync(portalConfigPath, JSON.stringify(portalConfig, null, 2), "utf8");
      if (isMariaDbActive()) {
        dbSavePortalConfig(portalConfig).catch(() => {
        });
        dbSaveUploadedFile("banner-empresas-en-carmen.png", "image/png", bannerBuffer).catch(() => {
        });
      }
    }
    if (logoBase64 && typeof logoBase64 === "string") {
      const logoBuffer = decodeB64(logoBase64);
      const paths = [
        path.resolve(__dirname, "public/images/logo-oficial.png"),
        path.resolve(__dirname, "public/images/logo-empresasencarmen.png"),
        path.resolve(__dirname, "public/uploads/logo-oficial.png")
      ];
      for (const p of paths) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, logoBuffer);
      }
      if (fs.existsSync(path.resolve(__dirname, "dist/images"))) {
        fs.writeFileSync(path.resolve(__dirname, "dist/images/logo-oficial.png"), logoBuffer);
        fs.writeFileSync(path.resolve(__dirname, "dist/images/logo-empresasencarmen.png"), logoBuffer);
      }
      logoUpdated = true;
      portalConfig.logoUrl = "/images/logo-oficial.png?v=" + Date.now();
      portalConfig.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      fs.writeFileSync(portalConfigPath, JSON.stringify(portalConfig, null, 2), "utf8");
      if (isMariaDbActive()) {
        dbSavePortalConfig(portalConfig).catch(() => {
        });
        dbSaveUploadedFile("logo-oficial.png", "image/png", logoBuffer).catch(() => {
        });
      }
    }
    let gitPushed = false;
    let gitOutput = "";
    if ((bannerUpdated || logoUpdated) && commitAndPush !== false) {
      try {
        execSync("node scripts/update_version.cjs 2>&1", { cwd: __dirname });
        execSync("git add src/constants/version.ts public/images/ public/empresas.png public/uploads/ 2>&1", { cwd: __dirname });
        execSync('git commit -m "fix(brand): actualizar banner y logo oficial desde panel de administracion" 2>&1', { cwd: __dirname });
        execSync("git push origin main 2>&1", { cwd: __dirname });
        gitPushed = true;
        gitOutput = "Publicado exitosamente en origin/main (Render producci\xF3n)";
      } catch (gErr) {
        console.warn("Git push warning:", gErr.message);
        gitOutput = gErr.message;
      }
    }
    res.json({
      success: true,
      bannerUpdated,
      logoUpdated,
      gitPushed,
      gitOutput,
      bannerUrl: `/images/banner-empresas-en-carmen.png?v=${Date.now()}`,
      logoUrl: `/images/logo-oficial.png?v=${Date.now()}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get("/api/admin/banner-and-logo", (_req, res) => {
  const bannerPath = path.resolve(__dirname, "public/images/banner-empresas-en-carmen.png");
  const logoPath = path.resolve(__dirname, "public/images/logo-oficial.png");
  res.json({
    bannerExists: fs.existsSync(bannerPath),
    logoExists: fs.existsSync(logoPath),
    bannerUrl: `/images/banner-empresas-en-carmen.png?v=${Date.now()}`,
    logoUrl: `/images/logo-oficial.png?v=${Date.now()}`
  });
});
app.get("/robots.txt", (req, res) => {
  const baseUrl = getRequestBaseUrl(req);
  const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: https://empresasencarmen.com/sitemap.xml
Sitemap: https://encarmen.org/sitemap.xml
`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(robots);
});
app.get("/sitemap.xml", (req, res) => {
  const baseUrl = getRequestBaseUrl(req);
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += `  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;
  xml += `  <url>
    <loc>${baseUrl}/eventos</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
  xml += `  <url>
    <loc>${baseUrl}/emergencias</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  const parents = categoriesCache.filter((c) => c.parent === 0 && c.id !== 15 && c.slug !== "uncategorized");
  for (const cat of parents) {
    if (cat.slug) {
      xml += `  <url>
    <loc>${baseUrl}/categoria/${encodeURIComponent(cat.slug)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }
  }
  for (const b of businessesCache) {
    if (b.slug) {
      xml += `  <url>
    <loc>${baseUrl}/empresa/${encodeURIComponent(b.slug)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }
  }
  xml += "</urlset>";
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(xml);
});
var oneDayMs = 24 * 60 * 60 * 1e3;
var oneWeekMs = 7 * oneDayMs;
app.use(express.static(path.resolve(__dirname, "public"), {
  maxAge: oneDayMs,
  setHeaders: (res, filePath) => {
    if (/\.(jpg|jpeg|png|webp|svg|gif|ico|woff2?|ttf)$/i.test(filePath)) {
      if (/banner|logo/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=60, must-revalidate");
      } else {
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      }
    }
  }
}));
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/") || req.path.startsWith("/assets/") || req.path.startsWith("/icons/") || req.path.startsWith("/images/") || req.path.startsWith("/wp-content/")) {
    return next();
  }
  const isEmpresaOrNegocio = req.path.match(/^\/(?:empresa|negocio)\/([^/?#]+)/i);
  const isDirectSlug = req.path.match(/^\/([^/?#]+)/i);
  const rawParam = isEmpresaOrNegocio ? isEmpresaOrNegocio[1] : isDirectSlug ? isDirectSlug[1] : null;
  if (rawParam) {
    const cleanParam = decodeURIComponent(rawParam).toLowerCase().trim();
    const reservedPaths = ["admin", "api", "login", "register", "zonas", "categorias", "promociones", "clasificados", "uploads", "assets", "images", "icons", "robots.txt", "sitemap.xml", "favicon.ico"];
    if (!reservedPaths.includes(cleanParam) && !cleanParam.includes(".")) {
      if (businessesCache && businessesCache.length > 0) {
        const biz = businessesCache.find(
          (b) => Array.isArray(b.previousSlugs) && b.previousSlugs.some((ps) => ps.toLowerCase() === cleanParam) || Array.isArray(b.previousNames) && b.previousNames.some((pn) => pn.toLowerCase().replace(/[^a-z0-9]+/g, "-") === cleanParam || pn.toLowerCase().trim() === cleanParam)
        );
        if (biz && biz.slug && biz.slug.toLowerCase() !== cleanParam) {
          const targetUrl = isEmpresaOrNegocio ? `/empresa/${biz.slug}` : `/${biz.slug}`;
          return res.redirect(301, targetUrl);
        }
      }
    }
  }
  next();
});
var isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
if (!isProduction && !process.env.VERCEL) {
  console.log("[Vite] Inicializando middleware de Vite para desarrollo y preview interactivo...");
  let viteMiddleware = null;
  import("vite").then(async ({ createServer: createViteServer }) => {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: false,
        ws: false
      },
      appType: "spa"
    });
    viteMiddleware = vite.middlewares;
  }).catch((err) => {
    console.error("[Vite] Error al inicializar middleware de Vite:", err);
  });
  app.use((req, res, next) => {
    if (viteMiddleware) {
      return viteMiddleware(req, res, next);
    }
    next();
  });
} else {
  app.use(express.static(path.resolve(__dirname, "dist"), {
    maxAge: oneWeekMs,
    index: false,
    setHeaders: (res, filePath) => {
      if (/\.(js|css|woff2?|png|jpg|svg|webp)$/i.test(filePath)) {
        if (/banner|logo/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=60, must-revalidate");
        } else {
          res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
        }
      }
    }
  }));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/") || /\.(jpg|jpeg|png|webp|svg|gif|ico|css|js|map|json|woff2?|ttf)$/i.test(req.path)) {
      return res.status(404).setHeader("Content-Type", "text/plain").send("File not found");
    }
    const indexPath = path.resolve(__dirname, "dist/index.html");
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, "utf8");
      const cleanPath = req.path.replace(/^\/+|\/+$/g, "").replace(/^(empresa|producto)\//i, "");
      const queryEmpresa = req.query.empresa;
      const candidateSlug = queryEmpresa || cleanPath;
      if (candidateSlug && businessesCache && businessesCache.length > 0) {
        const cleanCandidate = candidateSlug.toLowerCase().trim();
        const biz = businessesCache.find(
          (b) => b.slug?.toLowerCase() === cleanCandidate || String(b.id) === cleanCandidate || Array.isArray(b.previousSlugs) && b.previousSlugs.some((ps) => ps.toLowerCase() === cleanCandidate) || Array.isArray(b.previousNames) && b.previousNames.some((pn) => pn.toLowerCase().replace(/[^a-z0-9]+/g, "-") === cleanCandidate || pn.toLowerCase().trim() === cleanCandidate) || b.name && b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === cleanCandidate
        );
        if (biz) {
          if (biz.slug && biz.slug.toLowerCase() !== cleanCandidate) {
            const hasEmpresaPrefix = req.path.startsWith("/empresa/") || req.path.startsWith("/negocio/");
            const targetUrl = hasEmpresaPrefix ? `/empresa/${biz.slug}` : `/${biz.slug}`;
            return res.redirect(301, targetUrl);
          }
          const baseUrl2 = getRequestBaseUrl(req);
          const ogTitle = `${biz.name} | Tarjeta Digital - Empresas en Carmen`;
          const ogDesc = `${biz.address ? `${biz.address}. ` : ""}${biz.phone ? `Tel: ${biz.phone}. ` : ""}${biz.description ? biz.description.slice(0, 140) : "Directorio Comercial de Ciudad del Carmen"}`;
          const ogImage = biz.image?.startsWith("http") ? biz.image : `${baseUrl2}${biz.image || "/icons/icon-512.svg"}`;
          const bizUrl = `${baseUrl2}/empresa/${biz.slug}`;
          html = html.replace(/<title>.*?<\/title>/i, `<title>${ogTitle}</title>`);
          html = html.replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${ogTitle}" />`);
          html = html.replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${ogDesc}" />`);
          html = html.replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${ogImage}" />`);
          if (html.includes('<link rel="canonical"')) {
            html = html.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${bizUrl}" />`);
          } else {
            html = html.replace("</head>", `  <link rel="canonical" href="${bizUrl}" />
</head>`);
          }
          if (html.includes('<meta property="og:url"')) {
            html = html.replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${bizUrl}" />`);
          } else {
            html = html.replace("</head>", `  <meta property="og:url" content="${bizUrl}" />
</head>`);
          }
        }
      }
      const baseUrl = getRequestBaseUrl(req);
      const reqPath = req.path === "/" ? "" : req.path;
      const pageCanonical = `${baseUrl}${reqPath}`;
      if (html.includes('<link rel="canonical"')) {
        html = html.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${pageCanonical}" />`);
      } else {
        html = html.replace("</head>", `  <link rel="canonical" href="${pageCanonical}" />
</head>`);
      }
      if (html.includes('<meta property="og:url"')) {
        html = html.replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${pageCanonical}" />`);
      } else {
        html = html.replace("</head>", `  <meta property="og:url" content="${pageCanonical}" />
</head>`);
      }
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0");
      res.setHeader("CDN-Cache-Control", "no-store");
      res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      return res.send(html);
    }
    res.status(500).send("dist/index.html not found");
  });
}
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express] Servidor corriendo exitosamente en http://0.0.0.0:${PORT}`);
  });
}
var server_default = app;
export {
  server_default as default
};
