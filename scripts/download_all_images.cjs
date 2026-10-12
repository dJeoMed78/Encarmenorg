const https = require('https');
const fs = require('fs');
const path = require('path');

const bizList = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/businesses_seed.json'), 'utf-8'));
const urls = new Set();

bizList.forEach(b => {
  if (b.image && b.image.includes('empresasencarmen.com/wp-content/uploads/')) {
    urls.add(b.image);
  }
  if (Array.isArray(b.gallery)) {
    b.gallery.forEach(img => {
      if (img && img.includes('empresasencarmen.com/wp-content/uploads/')) {
        urls.add(img);
      }
    });
  }
});

const urlList = Array.from(urls);
console.log(`Encontradas ${urlList.length} imágenes para descargar desde Hostinger...`);

let completed = 0;
let failed = 0;

function downloadImage(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const filePath = parsed.pathname;
      const targetLocal = path.resolve(__dirname, '../public', filePath.replace(/^\//, ''));

      if (fs.existsSync(targetLocal) && fs.statSync(targetLocal).size > 1000) {
        completed++;
        return resolve();
      }

      fs.mkdirSync(path.dirname(targetLocal), { recursive: true });
      const file = fs.createWriteStream(targetLocal);

      const req = https.get({
        hostname: '45.137.159.114',
        port: 443,
        path: filePath,
        headers: {
          'Host': 'empresasencarmen.com',
          'User-Agent': 'Mozilla/5.0'
        },
        rejectUnauthorized: false,
        timeout: 10000
      }, res => {
        if (res.statusCode === 200) {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            completed++;
            resolve();
          });
        } else {
          file.close();
          try { fs.unlinkSync(targetLocal); } catch(_) {}
          failed++;
          resolve();
        }
      });

      req.on('error', () => {
        file.close();
        try { fs.unlinkSync(targetLocal); } catch(_) {}
        failed++;
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        file.close();
        try { fs.unlinkSync(targetLocal); } catch(_) {}
        failed++;
        resolve();
      });
    } catch (_) {
      failed++;
      resolve();
    }
  });
}

// Concurrency of 15
async function run() {
  const queue = [...urlList];
  const workers = Array(15).fill(0).map(async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) await downloadImage(item);
    }
  });
  await Promise.all(workers);
  console.log(`Descarga finalizada: ${completed} descargadas/existentes, ${failed} fallidas.`);
}

run();
