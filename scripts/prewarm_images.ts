import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const cacheDir = path.resolve(rootDir, 'public/cache/img');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

async function run() {
  console.log('[Image Optimizer] Iniciando optimización proactiva de imágenes...');

  // 1. Optimize heavy local images in public/uploads (> 200KB)
  const uploadsDir = path.resolve(rootDir, 'public/uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      const fullPath = path.join(uploadsDir, f);
      const stat = fs.statSync(fullPath);
      if (!stat.isDirectory() && (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))) {
        if (stat.size > 200 * 1024) {
          try {
            const buf = fs.readFileSync(fullPath);
            const optimized = await sharp(buf)
              .rotate()
              .resize({ width: 1200, withoutEnlargement: true, fit: 'inside' })
              .jpeg({ quality: 80, mozjpeg: true })
              .toBuffer();
            if (optimized.length < stat.size) {
              fs.writeFileSync(fullPath, optimized);
              console.log(`[Image Optimizer] Reducido ${f}: ${(stat.size / 1024).toFixed(0)}KB -> ${(optimized.length / 1024).toFixed(0)}KB`);
            }
          } catch (err: any) {
            // Skip on error
          }
        }
      }
    }
  }

  // 2. Pre-generate WebP 480px thumbnails for all businesses in businesses_seed.json
  const seedPath = path.resolve(rootDir, 'src/data/businesses_seed.json');
  if (fs.existsSync(seedPath)) {
    const businesses = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    let prewarmed = 0;

    for (const b of businesses) {
      if (!b.image) continue;
      const rawUrl = b.image;
      const width = 480;
      const quality = 80;
      const format = 'webp';
      const hash = crypto.createHash('sha1').update(`${rawUrl}_w${width}_q${quality}_f${format}`).digest('hex');
      const targetFile = path.join(cacheDir, `${hash}.${format}`);

      if (fs.existsSync(targetFile)) continue;

      let buf: Buffer | null = null;
      if (rawUrl.startsWith('/uploads/')) {
        const local = path.resolve(rootDir, 'public', rawUrl.replace(/^\/+/, ''));
        if (fs.existsSync(local)) {
          buf = fs.readFileSync(local);
        }
      } else if (rawUrl.includes('/wp-content/')) {
        const rel = rawUrl.replace(/https?:\/\/[^\/]+/, '').replace(/^\/+/, '');
        const local = path.resolve(rootDir, 'public', rel);
        if (fs.existsSync(local)) {
          buf = fs.readFileSync(local);
        }
      }

      if (buf) {
        try {
          const webpBuf = await sharp(buf)
            .rotate()
            .resize({ width, withoutEnlargement: true, fit: 'inside' })
            .webp({ quality, effort: 4 })
            .toBuffer();
          fs.writeFileSync(targetFile, webpBuf);
          prewarmed++;
        } catch (_) {}
      }
    }
    console.log(`[Image Optimizer] ${prewarmed} miniaturas WebP de alta velocidad pre-generadas en disco.`);
  }

  console.log('[Image Optimizer] Optimización completada con éxito.');
}

run().catch(console.error);
