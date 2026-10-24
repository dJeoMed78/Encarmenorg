import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const seedFile = path.resolve(rootDir, 'src/data/businesses_seed.json');
const publicWpUploads = path.resolve(rootDir, 'public/wp-content/uploads');
const reportFile = path.resolve(rootDir, 'public/assets/migration_images_report.json');

async function main() {
  console.log('====================================================');
  console.log('INICIANDO RESPALDO Y MIGRACIÓN TOTAL DE IMÁGENES');
  console.log('Objetivo: Cero dependencias de empresasencarmen.com');
  console.log('====================================================');

  if (!fs.existsSync(seedFile)) {
    console.error('Error: no se encontró src/data/businesses_seed.json');
    process.exit(1);
  }

  const businesses = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  console.log(`Cargadas ${businesses.length} empresas del catálogo.`);

  const urlMap = new Map(); // url -> { relativePath, diskPath, businessIds: [] }

  function registerUrl(rawUrl, bizId, bizName) {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    const trimmed = rawUrl.trim();
    if (!trimmed.includes('empresasencarmen.com')) return;

    try {
      const parsed = new URL(trimmed);
      let subpath = parsed.pathname;
      if (subpath.startsWith('/wp-content/uploads/')) {
        subpath = subpath.replace('/wp-content/uploads/', '');
      } else if (subpath.startsWith('/uploads/')) {
        subpath = subpath.replace('/uploads/', '');
      }

      // decode URL components
      const cleanSubpath = decodeURIComponent(subpath);
      const relativePath = `/wp-content/uploads/${cleanSubpath}`;
      const diskPath = path.resolve(publicWpUploads, cleanSubpath);

      if (!urlMap.has(trimmed)) {
        urlMap.set(trimmed, {
          originalUrl: trimmed,
          cleanSubpath,
          relativePath,
          diskPath,
          businesses: []
        });
      }
      urlMap.get(trimmed).businesses.push({ id: bizId, name: bizName });
    } catch (e) {
      console.warn(`Error parseando URL: ${trimmed}`, e.message);
    }
  }

  for (const b of businesses) {
    if (b.image) registerUrl(b.image, b.id, b.name);
    if (Array.isArray(b.gallery)) {
      for (const img of b.gallery) {
        registerUrl(img, b.id, b.name);
      }
    }
  }

  console.log(`Total de URLs únicas de imágenes identificadas: ${urlMap.size}`);

  const items = Array.from(urlMap.values());
  let alreadyPresent = 0;
  let newlyDownloaded = 0;
  let failed = 0;
  const failedList = [];
  let totalBytes = 0;

  // Asegurar que exista directorio base
  fs.mkdirSync(publicWpUploads, { recursive: true });

  // Función de descarga con reintentos
  async function downloadImage(item, attempt = 1) {
    const { originalUrl, diskPath } = item;
    try {
      const dir = path.dirname(diskPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(diskPath)) {
        const stats = fs.statSync(diskPath);
        if (stats.size > 200) {
          totalBytes += stats.size;
          alreadyPresent++;
          return true;
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(originalUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RespaldoEmpresasCarmen/2.0'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 50) {
        throw new Error('Archivo demasiado pequeño o corrupto');
      }

      fs.writeFileSync(diskPath, buffer);
      totalBytes += buffer.length;
      newlyDownloaded++;
      return true;
    } catch (err) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        return downloadImage(item, attempt + 1);
      } else {
        failed++;
        failedList.push({ url: originalUrl, error: err.message, diskPath });
        return false;
      }
    }
  }

  // Descarga con cola de concurrencia controlada (10 peticiones simultáneas)
  const CONCURRENCY = 10;
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const currentIndex = idx++;
      const item = items[currentIndex];
      await downloadImage(item);
      if (currentIndex % 50 === 0 || currentIndex === items.length - 1) {
        const progress = Math.round(((currentIndex + 1) / items.length) * 100);
        console.log(`[${progress}%] Procesadas ${currentIndex + 1}/${items.length} (Descargadas: ${newlyDownloaded}, Ya en disco: ${alreadyPresent}, Fallidas: ${failed})`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log('\n====================================================');
  console.log('RESUMEN DE DESCARGA DE IMÁGENES:');
  console.log(`- Total URLs analizadas: ${items.length}`);
  console.log(`- Ya almacenadas previamente: ${alreadyPresent}`);
  console.log(`- Nuevas imágenes descargadas: ${newlyDownloaded}`);
  console.log(`- Errores de descarga: ${failed}`);
  console.log(`- Espacio total en disco: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log('====================================================\n');

  // Ahora actualizamos src/data/businesses_seed.json para cambiar todas las URLs externas a relativas locales
  console.log('Reescribiendo URLs en src/data/businesses_seed.json a rutas relativas locales...');
  let rewrittenImages = 0;
  let rewrittenGallery = 0;

  const updatedBusinesses = businesses.map((b) => {
    let newImage = b.image;
    if (b.image && typeof b.image === 'string' && b.image.includes('empresasencarmen.com')) {
      const match = urlMap.get(b.image.trim());
      if (match) {
        newImage = match.relativePath;
        rewrittenImages++;
      }
    }

    let newGallery = b.gallery;
    if (Array.isArray(b.gallery)) {
      newGallery = b.gallery.map((img) => {
        if (typeof img === 'string' && img.includes('empresasencarmen.com')) {
          const match = urlMap.get(img.trim());
          if (match) {
            rewrittenGallery++;
            return match.relativePath;
          }
        }
        return img;
      });
    }

    return {
      ...b,
      image: newImage,
      gallery: newGallery
    };
  });

  fs.writeFileSync(seedFile, JSON.stringify(updatedBusinesses, null, 2), 'utf8');
  console.log(`URLs principales de logos reescritas a local: ${rewrittenImages}`);
  console.log(`URLs de galerías reescritas a local: ${rewrittenGallery}`);

  // Guardar reporte formal de auditoría y migración
  const report = {
    timestamp: new Date().toISOString(),
    totalAnalyzed: items.length,
    alreadyPresent,
    newlyDownloaded,
    failed,
    totalDiskBytes: totalBytes,
    totalDiskMB: (totalBytes / (1024 * 1024)).toFixed(2),
    rewrittenImages,
    rewrittenGallery,
    failedList
  };

  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Reporte guardado en: ${reportFile}`);
}

main().catch((err) => {
  console.error('Error fatal durante la migración:', err);
  process.exit(1);
});
