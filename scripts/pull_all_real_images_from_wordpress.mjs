import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const seedFile = path.resolve(rootDir, 'src/data/businesses_seed.json');
const publicWpUploads = path.resolve(rootDir, 'public/wp-content/uploads');
const rootWpUploads = path.resolve(rootDir, 'wp-content/uploads');

const WC_KEY = process.env.WC_CONSUMER_KEY || 'ck_c4b9fbcece06a5839b2ae14d593e981da95bda6e';
const WC_SECRET = process.env.WC_CONSUMER_SECRET || 'cs_09d158f8fb9fa6728f27ef718f21c7503429b0f7';
const WC_BASE = 'https://www.empresasencarmen.com';

function getLocalRelativePath(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    let subpath = parsed.pathname;
    if (subpath.startsWith('/wp-content/uploads/')) {
      subpath = subpath.replace('/wp-content/uploads/', '');
    } else if (subpath.startsWith('/uploads/')) {
      subpath = subpath.replace('/uploads/', '');
    }
    const cleanSubpath = decodeURIComponent(subpath).replace(/^\/+/, '');
    return `/wp-content/uploads/${cleanSubpath}`;
  } catch (_) {
    return null;
  }
}

async function downloadFile(url, targetDiskPath) {
  try {
    const dir = path.dirname(targetDiskPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(targetDiskPath)) {
      const stats = fs.statSync(targetDiskPath);
      if (stats.size > 200) {
        return { success: true, cached: true, size: stats.size };
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ImageBackup/2.0'
      }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 50) {
      return { success: false, error: 'File too small' };
    }

    fs.writeFileSync(targetDiskPath, buffer);

    // Also mirror to root wp-content/uploads
    const relativeToPublic = path.relative(publicWpUploads, targetDiskPath);
    const rootMirrorPath = path.resolve(rootWpUploads, relativeToPublic);
    const rootMirrorDir = path.dirname(rootMirrorPath);
    if (!fs.existsSync(rootMirrorDir)) {
      fs.mkdirSync(rootMirrorDir, { recursive: true });
    }
    fs.writeFileSync(rootMirrorPath, buffer);

    return { success: true, cached: false, size: buffer.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('========================================================');
  console.log('DESCARGANDO TODAS LAS FOTOS REALES DE EMPRESASENCARMEN');
  console.log('========================================================');

  // 1. Obtener todos los productos de WooCommerce
  const allWcProducts = [];
  let page = 1;
  const authHeader = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

  while (true) {
    console.log(`Consultando WooCommerce API (Página ${page})...`);
    const res = await fetch(`${WC_BASE}/wp-json/wc/v3/products?per_page=100&page=${page}`, {
      headers: { Authorization: authHeader }
    });

    if (!res.ok) {
      console.warn(`Página ${page} devolvió status ${res.status}. Terminando consulta.`);
      break;
    }

    const products = await res.json();
    if (!Array.isArray(products) || products.length === 0) {
      break;
    }

    allWcProducts.push(...products);
    console.log(`Recibidos ${products.length} productos (Total acumulado: ${allWcProducts.length})`);
    if (products.length < 100) break;
    page++;
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\nTotal de empresas encontradas en WooCommerce: ${allWcProducts.length}`);

  // 2. Preparar catálogo de seed actual
  const businesses = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  const bizById = new Map();
  businesses.forEach(b => bizById.set(Number(b.id), b));

  // 3. Procesar y descargar imágenes
  let totalDownloaded = 0;
  let totalCached = 0;
  let totalFailed = 0;
  const updatesForDb = []; // { id, image, gallery }

  for (let i = 0; i < allWcProducts.length; i++) {
    const prod = allWcProducts[i];
    const biz = bizById.get(Number(prod.id));

    const wcImages = Array.isArray(prod.images) ? prod.images : [];
    if (wcImages.length === 0) {
      console.log(`[${i + 1}/${allWcProducts.length}] ${prod.name} (ID: ${prod.id}): Sin imágenes en WC`);
      continue;
    }

    const primaryWcImg = wcImages[0]?.src;
    let localPrimaryPath = null;

    if (primaryWcImg) {
      const relPath = getLocalRelativePath(primaryWcImg);
      if (relPath) {
        const diskPath = path.resolve(publicWpUploads, relPath.replace('/wp-content/uploads/', ''));
        const dl = await downloadFile(primaryWcImg, diskPath);
        if (dl.success) {
          localPrimaryPath = relPath;
          if (dl.cached) totalCached++;
          else totalDownloaded++;
        } else {
          totalFailed++;
          console.warn(`Error descargando principal de ${prod.name}: ${dl.error}`);
        }
      }
    }

    // Galería
    const localGallery = [];
    for (let g = 1; g < wcImages.length; g++) {
      const gUrl = wcImages[g]?.src;
      if (!gUrl) continue;
      const relPath = getLocalRelativePath(gUrl);
      if (relPath) {
        const diskPath = path.resolve(publicWpUploads, relPath.replace('/wp-content/uploads/', ''));
        const dl = await downloadFile(gUrl, diskPath);
        if (dl.success) {
          localGallery.push(relPath);
          if (dl.cached) totalCached++;
          else totalDownloaded++;
        } else {
          totalFailed++;
        }
      }
    }

    if (localPrimaryPath) {
      console.log(`[${i + 1}/${allWcProducts.length}] OK: ${prod.name} -> ${localPrimaryPath} (Galería: ${localGallery.length})`);

      if (biz) {
        biz.image = localPrimaryPath;
        if (localGallery.length > 0) {
          biz.gallery = localGallery;
        }
      }

      updatesForDb.push({
        id: prod.id,
        name: prod.name,
        image: localPrimaryPath,
        gallery: localGallery
      });
    }
  }

  console.log('\n========================================================');
  console.log('RESUMEN DE DESCARGA:');
  console.log(`- Nuevas fotos descargadas a disco: ${totalDownloaded}`);
  console.log(`- Fotos ya presentes: ${totalCached}`);
  console.log(`- Fallidas: ${totalFailed}`);
  console.log(`- Empresas listas para actualizar en DB: ${updatesForDb.length}`);
  console.log('========================================================\n');

  // 4. Guardar businesses_seed.json actualizado
  fs.writeFileSync(seedFile, JSON.stringify(businesses, null, 2), 'utf8');
  console.log('src/data/businesses_seed.json actualizado con rutas locales.');

  // 5. Generar archivo SQL
  const sqlLines = [
    '-- Script de actualización masiva de fotos reales para Hostinger MariaDB',
    '-- Generado automáticamente desde empresasencarmen.com',
    'SET NAMES utf8mb4;'
  ];

  for (const item of updatesForDb) {
    const escapedImage = item.image.replace(/'/g, "''");
    const escapedGallery = JSON.stringify(item.gallery).replace(/'/g, "''");
    sqlLines.push(
      `UPDATE businesses SET image = '${escapedImage}', gallery = '${escapedGallery}' WHERE id = '${item.id}';`
    );
  }

  const sqlFile = path.resolve(rootDir, 'public/mariadb_update_all_real_images.sql');
  fs.writeFileSync(sqlFile, sqlLines.join('\n'), 'utf8');
  console.log(`Archivo SQL generado en: ${sqlFile}`);

  // 6. Actualizar directamente en la base de datos MariaDB de Hostinger
  console.log('\nConectando a Hostinger MariaDB para actualizar las fotos en vivo...');
  try {
    const conn = await mysql.createConnection({
      host: 'srv1356.hstgr.io',
      user: 'u293982346_appuser',
      password: process.env.DB_PASSWORD,
      database: 'u293982346_encarmenapp',
      connectTimeout: 8000
    });

    let dbUpdatedCount = 0;
    for (const item of updatesForDb) {
      await conn.query(
        'UPDATE businesses SET image = ?, gallery = ? WHERE id = ?',
        [item.image, JSON.stringify(item.gallery), String(item.id)]
      );
      dbUpdatedCount++;
    }

    console.log(`¡Éxito! ${dbUpdatedCount} empresas actualizadas con sus fotos reales en Hostinger MariaDB.`);
    await conn.end();
  } catch (dbErr) {
    console.error('Aviso al conectar con MariaDB remota:', dbErr.message);
    console.log('El archivo SQL fue generado para ejecución manual si fuera necesario.');
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
