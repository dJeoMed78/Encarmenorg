import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let version = '061026-1355';
try {
  const versionFile = path.resolve(rootDir, 'src/constants/version.ts');
  if (fs.existsSync(versionFile)) {
    const match = fs.readFileSync(versionFile, 'utf8').match(/APP_VERSION = '([^']+)'/);
    if (match) version = match[1].replace(/[:/]/g, '-');
  }
} catch (_) {}

const targetZipPath = path.resolve(rootDir, `public/codigo-fuente-empresasencarmen-${version}.zip`);

console.log('Generando ZIP oficial en:', targetZipPath);

const output = fs.createWriteStream(targetZipPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  const sizeMb = (archive.pointer() / (1024 * 1024)).toFixed(2);
  console.log(`¡ZIP generado con éxito! Tamaño: ${sizeMb} MB (${archive.pointer()} bytes)`);

  // Duplicar con nombres alternativos para garantizar que cualquier URL o botón descargue esta versión actualizada
  const aliases = [
    'public/codigo-fuente-empresasencarmen.zip',
    'public/backup.zip',
    'public/codigo-fuente-empresasencarmen-061026-0915.zip',
    'public/codigo-fuente-empresasencarmen-051026-1324.zip'
  ];

  for (const alias of aliases) {
    const aliasPath = path.resolve(rootDir, alias);
    fs.copyFileSync(targetZipPath, aliasPath);
    console.log(`Copiado alias: ${alias}`);
  }

  // Copiar también a dist/ si existe
  const distDir = path.resolve(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.copyFileSync(targetZipPath, path.resolve(distDir, `codigo-fuente-empresasencarmen-${version}.zip`));
    fs.copyFileSync(targetZipPath, path.resolve(distDir, 'codigo-fuente-empresasencarmen.zip'));
    fs.copyFileSync(targetZipPath, path.resolve(distDir, 'backup.zip'));
    fs.copyFileSync(targetZipPath, path.resolve(distDir, 'codigo-fuente-empresasencarmen-061026-0915.zip'));
    fs.copyFileSync(targetZipPath, path.resolve(distDir, 'codigo-fuente-empresasencarmen-051026-1324.zip'));
    console.log('Copiado a dist/ para servicio web estático instantáneo.');
  }

  process.exit(0);
});

archive.on('error', (err) => {
  console.error('Error al generar ZIP:', err);
  process.exit(1);
});

archive.pipe(output);

// Empaquetar todo el código fuente del proyecto excluyendo binarios pesados para respetar el límite de 32MB de Cloud Run
archive.glob('**/*', {
  cwd: rootDir,
  ignore: [
    'node_modules/**',
    '.git/**',
    'dist/**',
    '*.zip',
    '**/*.zip',
    'public/*.zip',
    'public/wp-content/**',
    'public/uploads/**',
    '.cache/**',
    '.next/**',
    'tmp/**'
  ],
  dot: true
});

archive.finalize();
