// Local containment tests. NEVER imports the application or accesses real backups.
// Run: node --test tests/backup-security-002.test.cjs
// Repeat with ENC_BACKUP_EXECUTABLE=server.js and api/server.bundle.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const express = require('express');
const { transformSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
const cliPath = path.join(root, 'scripts/create_release_zip.js');
const cliSource = fs.readFileSync(cliPath, 'utf8');
const start = '// ENC-BACKUP-SECURITY-002 CONTAINMENT START';
const end = '// ENC-BACKUP-SECURITY-002 CONTAINMENT END';
assert.equal(source.split(start).length, 2);
const block = source.split(start)[1].split(end)[0];
assert.ok(block.endsWith('app.use(backupDownloadContainment);\n'));
const extracted = block.replace('app.use(backupDownloadContainment);', '');
const executable = process.env.ENC_BACKUP_EXECUTABLE;
assert.ok(!executable || ['server.js', 'api/server.bundle.js'].includes(executable));
const compiled = executable ? fs.readFileSync(path.join(root, executable), 'utf8') : null;
// Parse the complete artifacts, but evaluate ONLY the self-contained guard function.
// Never import/evaluate the complete server or any database/startup code.
let guardCode = transformSync(extracted, { loader: 'ts', format: 'cjs', target: 'es2022' }).code;
if (compiled) {
  transformSync(compiled, { loader: 'js', format: 'esm', target: 'es2022' });
  const match = compiled.match(/function backupDownloadContainment\([^]*?\n}/);
  assert.ok(match, 'guard must exist in executable');
  guardCode = 'module.exports.backupDownloadContainment = ' + match[0] + ';';
}
const isolated = new Module('isolated-backup-containment');
isolated._compile(guardCode, 'isolated-backup-containment.cjs');
const guard = isolated.exports.backupDownloadContainment;
const historical = [
  '/api/backup/sitio-completo-hostinger.zip', '/sitio-completo-hostinger.zip',
  '/empresasencarmen-hostinger-completo.zip', '/descargar-sitio-completo.zip',
  '/api/download-hostinger-zip', '/todo-en-uno-hostinger.zip', '/sitio-completo.zip',
  '/api/backup/images-zip', '/api/backup/respaldo_imagenes_encarmen_completo.zip',
  '/respaldo_imagenes_encarmen_completo.zip', '/public/respaldo_imagenes_encarmen_completo.zip',
  '/imagenes.zip', '/backup-imagenes.zip', '/api/backup/migrate-sql',
  '/api/backup/mariadb_migrate_images.sql', '/mariadb_migrate_images.sql',
  '/public/mariadb_migrate_images.sql', '/api/download-hostinger-sql',
  '/api/admin/download-source-zip', '/api/download-backup',
  '/codigo-fuente-empresasencarmen.zip', '/codigo-fuente-completo.zip',
  '/proyecto-completo.zip', '/api/backup/sitio-completo.zip', '/api/backup/codigo-fuente.zip'
];
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'enc-backup-fixture-'));
const files = {
  'public/backup.zip': 'SYNTHETIC_PRIVATE_ARCHIVE',
  'public/new-release.ZIP': 'SYNTHETIC_PRIVATE_ARCHIVE',
  'public/hostinger_mariadb_setup.sql': 'SYNTHETIC_PRIVATE_SQL',
  'dist/backup.zip': 'SYNTHETIC_PRIVATE_ARCHIVE',
  'dist/secret.sql': 'SYNTHETIC_PRIVATE_SQL',
  'public/.env': 'SYNTHETIC_SECRET_NOT_REAL',
  'public/credentials.json': 'SYNTHETIC_SECRET_NOT_REAL',
  'public/ratings_db.json': 'SYNTHETIC_PRIVATE_DATA',
  'public/assets/app.js': 'console.log("public fixture");',
  'public/assets/app.css': 'body { color: black; }',
  'public/manifest.json': '{"name":"Public fixture"}',
  'public/images/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
  'public/uploads/photo.png': 'PUBLIC_IMAGE_FIXTURE',
  'public/.well-known/security.txt': 'Public fixture contact',
  'dist/index.html': '<!doctype html><title>Public fixture</title>',
  'dist/assets/dist-app.js': 'console.log("dist fixture");'
};
for (const [name, value] of Object.entries(files)) {
  const full = path.join(fixture, name);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, value, { flag: 'wx' });
}
function snapshot(directory) {
  const result = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else result[path.relative(directory, full)] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    }
  }
  walk(directory);
  return result;
}
const before = snapshot(fixture);
let downstream = 0;
const app = express();
app.use(guard);
app.use((req, res, next) => { downstream++; next(); });
app.get('/api/health', (req, res) => res.json({ healthy: true }));
app.use(express.static(path.join(fixture, 'public')));
app.use(express.static(path.join(fixture, 'dist')));
const server = http.createServer(app);
let port;
test.before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  // Only files created by this test are removed. No project or existing backup is touched.
  fs.rmSync(fixture, { recursive: true });
});
function request(target, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: target, method }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end();
  });
}
async function denied(target, method = 'GET') {
  const previous = downstream;
  const res = await request(target, method);
  assert.equal(res.status, 403, method + ' ' + target);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(downstream, previous, 'must not reach static or generators');
  if (method === 'HEAD') assert.equal(res.body, '');
  else assert.deepEqual(JSON.parse(res.body), { success: false, error: 'DOWNLOAD_DISABLED', message: 'Descarga no disponible.' });
  assert.ok(!res.body.includes(fixture));
  assert.ok(!/SYNTHETIC_|password|stack|[A-Z]:\\\\/i.test(res.body));
}
test('25 historical routes denied for GET HEAD POST PUT PATCH DELETE OPTIONS (175 requests)', async () => {
  assert.equal(new Set(historical).size, 25);
  for (const target of historical) for (const method of ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS']) await denied(target, method);
});
test('historical route variants: case, trailing slash and query (75 requests)', async () => {
  for (const target of historical) {
    await denied(target.toUpperCase());
    await denied(target + '/');
    await denied(target + '?download=1');
  }
});
test('direct static ZIP SQL and private files denied in public/dist (20 requests)', async () => {
  for (const target of ['/backup.zip','/new-release.ZIP','/secret.sql','/hostinger_mariadb_setup.sql','/assets/dump.sql.gz','/.env','/.env.production','/credentials.json','/ratings_db.json','/api/portal_config.json']) {
    await denied(target); await denied(target, 'HEAD');
  }
});
test('encoding traversal and alternate confidential extensions denied', async () => {
  for (const target of ['/backup%2ezip','/backup%252ezip','/API%2fDOWNLOAD-BACKUP','//api//download-backup','/api/download-backup%20','/x%5cbackup.zip','/%2e%2e/backup.zip','/bad%ZZ','/backup.zip%00.png','/.env_backup','/.ssh/id_rsa','/data.sqlite3','/archive.tar','/archive.tgz','/archive.7z','/archive.rar','/data.bak','/private.pem','/private.key','/logs/private.log']) await denied(target);
});
test('public assets API health and well-known keep working (18 requests)', async () => {
  const targets = ['/assets/app.js','/assets/app.css','/manifest.json','/images/logo.svg','/uploads/photo.png','/.well-known/security.txt','/index.html','/assets/dist-app.js','/api/health'];
  for (const target of targets) for (const method of ['GET','HEAD']) {
    const res = await request(target, method);
    assert.equal(res.status, 200, method + ' ' + target);
    if (method === 'HEAD') assert.equal(res.body, '');
  }
  assert.equal((await request('/missing-public.png')).status, 404);
});
test('no dynamic ZIP generator or legacy download handler remains; guard precedes middleware', () => {
  assert.ok(source.indexOf('app.use(backupDownloadContainment)') < source.indexOf('app.use((req: Request'));
  assert.ok(!/ZipArchive|archive\.glob|archive\.finalize|res\.download\(/.test(source));
  transformSync(source, { loader: 'ts', format: 'esm', target: 'es2022' });
  let registrations = 0;
  for (const match of source.matchAll(/app\.(?:get|all)\(\s*(\[[^]*?\]|['"][^'"]+['"])/g)) {
    for (const literal of match[1].matchAll(/['"]([^'"]+)['"]/g)) {
      if (historical.includes(literal[1])) registrations++;
    }
  }
  assert.equal(registrations, 0);
});
test('disabled CLI fails safely in fixture, preserves all existing files, creates no aliases', () => {
  transformSync(cliSource, { loader: 'js', target: 'es2022' });
  assert.ok(!/require\(|import\s|writeFile|createWriteStream|copyFile|rename|unlink|ZipArchive|archive\./.test(cliSource));
  const result = spawnSync(process.execPath, [cliPath], { cwd: fixture, encoding: 'utf8', env: {} });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.ok(result.stderr.includes('deshabilitada'));
  assert.ok(!result.stderr.includes(fixture));
  assert.deepEqual(snapshot(fixture), before);
});
test('HTTP checks preserve existing fixture backups and create no files', () => {
  assert.deepEqual(snapshot(fixture), before);
});
test('compiled executable is coherent and installs guard before public middleware', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.equal(server, fs.readFileSync(path.join(root, 'api/server.bundle.js'), 'utf8'));
  for (const text of [server, compiled || server]) {
    assert.ok(text.includes('function backupDownloadContainment('));
    assert.ok(text.indexOf('app.use(backupDownloadContainment)') < text.indexOf('app.use((req, res, next)'));
    assert.ok(!/ZipArchive|archive\.glob|archive\.finalize|res\.download\(/.test(text));
    assert.ok(text.includes('STAGING_READ_ONLY') && text.includes('RATINGS_SCHEMA_APPROVED'));
  }
});

