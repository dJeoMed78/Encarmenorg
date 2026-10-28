#!/usr/bin/env node
/**
 * scripts/test_package_static_demo.mjs
 * 
 * Automated Test Suite for ENCARMEN Static Demo Packager
 * Task: ENC-DEMO-STATIC-PACKAGER-001
 * 
 * Verifies 12 test scenarios with isolated synthetic fixtures:
 * 1. Valid static bundle packaging
 * 2. SQL file rejection
 * 3. Environment file rejection (.env*)
 * 4. Backup/Archive rejection (.zip, .tar.gz)
 * 5. Private keys / certificates rejection (.key, .pem, id_rsa)
 * 6. Hidden directories / dotfiles exclusion (.git, .secret)
 * 7. Path traversal attempt protection
 * 8. External symlink detection & rejection
 * 9. Content secret scanner aborts on leaked credentials
 * 10. Source directory immutability (unmodified input)
 * 11. Deterministic & reproducible SHA-256 hashing
 * 12. Incomplete build output handling (missing/invalid index.html)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { packageStaticDemo, sha256Buffer } from './package_static_demo.mjs';

// Custom silent or minimal logger for tests
const silentLogger = {
  log: () => {},
  warn: () => {},
  error: () => {}
};

function createTempDir(prefix = 'encarmen-packager-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanTempDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (e) {
    // Ignore cleanup error on windows / busy handles
  }
}

function computeDirectoryHashSnapshot(dirPath) {
  const snapshot = {};
  function walk(currentRel = '') {
    const absPath = path.join(dirPath, currentRel);
    const entries = fs.readdirSync(absPath, { withFileTypes: true });
    for (const entry of entries) {
      const rel = currentRel ? path.join(currentRel, entry.name) : entry.name;
      const full = path.join(dirPath, rel);
      if (entry.isDirectory()) {
        walk(rel);
      } else if (entry.isFile()) {
        snapshot[rel] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      }
    }
  }
  walk();
  return snapshot;
}

// Standard valid HTML fixture
const VALID_INDEX_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>ENCARMEN — Demo</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index.js"></script>
</body>
</html>`;

const results = [];

async function runTest(testName, testFn) {
  const t0 = Date.now();
  process.stdout.write(`• Testing: ${testName} ... `);
  try {
    await testFn();
    const duration = Date.now() - t0;
    console.log(`\x1b[32m[PASS]\x1b[0m (${duration}ms)`);
    results.push({ name: testName, pass: true, duration });
  } catch (err) {
    const duration = Date.now() - t0;
    console.log(`\x1b[31m[FAIL]\x1b[0m (${duration}ms)`);
    console.error(`  Error: ${err.message}`);
    if (err.stack) {
      const frames = err.stack.split('\n').slice(1, 3).join('\n');
      console.error(`  ${frames}`);
    }
    results.push({ name: testName, pass: false, error: err.message, duration });
  }
}

// --- SUITE EXECUTION ---
async function main() {
  console.log(`\n============================================================`);
  console.log(` ENCARMEN Static Demo Packager — Verification Test Suite`);
  console.log(` Target Task: ENC-DEMO-STATIC-PACKAGER-001`);
  console.log(`============================================================\n`);

  // TEST 1: Valid bundle
  await runTest('Case 1: Valid static bundle packaging with SPA redirects and manifests', async () => {
    const testDir = createTempDir('test1-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    fs.mkdirSync(path.join(inputDir, 'assets'), { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);
    fs.writeFileSync(path.join(inputDir, 'assets', 'index.js'), 'console.log("ENCARMEN Visual Demo Loaded");');
    fs.writeFileSync(path.join(inputDir, 'assets', 'style.css'), 'body { background: #0b1329; color: #fff; }');
    fs.writeFileSync(path.join(inputDir, 'favicon.ico'), 'BINARY_ICO_DATA');

    const report = await packageStaticDemo({
      inputDir,
      outputDir,
      cleanOutput: true,
      strictSecrets: true,
      allowSpaRedirects: true,
      logger: silentLogger
    });

    assert.equal(report.success, true, 'Report should indicate success');
    assert.equal(report.exitCode, 0, 'Exit code should be 0');
    assert.equal(fs.existsSync(path.join(outputDir, 'index.html')), true);
    assert.equal(fs.existsSync(path.join(outputDir, 'assets', 'index.js')), true);
    assert.equal(fs.existsSync(path.join(outputDir, 'assets', 'style.css')), true);
    assert.equal(fs.existsSync(path.join(outputDir, '_redirects')), true);
    assert.equal(fs.existsSync(path.join(outputDir, '_headers')), true);
    assert.equal(fs.existsSync(path.join(outputDir, 'manifest.json')), true);
    assert.equal(fs.existsSync(path.join(outputDir, 'SHA256SUMS')), true);
    assert.equal(fs.existsSync(path.join(outputDir, 'packaging-report.json')), true);

    const redirects = fs.readFileSync(path.join(outputDir, '_redirects'), 'utf8');
    assert.match(redirects, /\/\*\s+\/index\.html\s+200/, '_redirects must contain SPA catch-all rule');

    cleanTempDir(testDir);
  });

  // TEST 2: SQL file rejection
  await runTest('Case 2: Prohibited SQL files (.sql) are blocked and rejected', async () => {
    const testDir = createTempDir('test2-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    fs.mkdirSync(inputDir, { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);
    fs.writeFileSync(path.join(inputDir, 'hostinger_mariadb_setup.sql'), 'CREATE TABLE users (id INT, secret VARCHAR);');
    fs.writeFileSync(path.join(inputDir, 'db_dump.sql'), 'INSERT INTO wp_posts VALUES(1);');

    const report = await packageStaticDemo({
      inputDir,
      outputDir,
      logger: silentLogger
    });

    assert.equal(report.success, true);
    assert.equal(fs.existsSync(path.join(outputDir, 'hostinger_mariadb_setup.sql')), false, 'SQL file must NOT exist in output');
    assert.equal(fs.existsSync(path.join(outputDir, 'db_dump.sql')), false, 'SQL file must NOT exist in output');
    assert.ok(report.filesRejected >= 2, 'Rejected count must record prohibited SQL files');
    const rejectedPaths = report.rejectedDetails.map(d => d.path);
    assert.ok(rejectedPaths.includes('hostinger_mariadb_setup.sql'));
    assert.ok(rejectedPaths.includes('db_dump.sql'));

    cleanTempDir(testDir);
  });

  // TEST 3: Environment file rejection
  await runTest('Case 3: Prohibited environment files (.env, .env.production) are rejected', async () => {
    const testDir = createTempDir('test3-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    fs.mkdirSync(inputDir, { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);
    fs.writeFileSync(path.join(inputDir, '.env'), 'DATABASE_PASSWORD=production_secret_pass');
    fs.writeFileSync(path.join(inputDir, '.env.production'), 'API_KEY=prod_key_123');

    const report = await packageStaticDemo({
      inputDir,
      outputDir,
      logger: silentLogger
    });

    assert.equal(fs.existsSync(path.join(outputDir, '.env')), false);
    assert.equal(fs.existsSync(path.join(outputDir, '.env.production')), false);
    assert.ok(report.filesRejected >= 2);

    cleanTempDir(testDir);
  });

  // TEST 4: Archive and backup files rejection
  await runTest('Case 4: Prohibited backup/archive files (.zip, .tar.gz, .bak) are rejected', async () => {
    const testDir = createTempDir('test4-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    fs.mkdirSync(inputDir, { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);
    fs.writeFileSync(path.join(inputDir, 'backup.zip'), 'PK_ZIP_HEADER');
    fs.writeFileSync(path.join(inputDir, 'archive.tar.gz'), 'GZIP_HEADER');
    fs.writeFileSync(path.join(inputDir, 'index.html.bak'), 'OLD_BACKUP');

    const report = await packageStaticDemo({
      inputDir,
      outputDir,
      logger: silentLogger
    });

    assert.equal(fs.existsSync(path.join(outputDir, 'backup.zip')), false);
    assert.equal(fs.existsSync(path.join(outputDir, 'archive.tar.gz')), false);
    assert.equal(fs.existsSync(path.join(outputDir, 'index.html.bak')), false);
    assert.ok(report.filesRejected >= 3);

    cleanTempDir(testDir);
  });

  // TEST 5: Private keys and certificates rejection
  await runTest('Case 5: Prohibited private keys and certificates (.key, .pem, id_rsa) are rejected', async () => {
    const testDir = createTempDir('test5-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    fs.mkdirSync(inputDir, { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);
    fs.writeFileSync(path.join(inputDir, 'server.key'), 'PRIVATE_KEY_CONTENT');
    fs.writeFileSync(path.join(inputDir, 'cert.pem'), 'CERTIFICATE_CONTENT');
    fs.writeFileSync(path.join(inputDir, 'id_rsa'), 'OPENSSH_PRIVATE_KEY');

    const report = await packageStaticDemo({
      inputDir,
      outputDir,
      logger: silentLogger
    });

    assert.equal(fs.existsSync(path.join(outputDir, 'server.key')), false);
    assert.equal(fs.existsSync(path.join(outputDir, 'cert.pem')), false);
    assert.equal(fs.existsSync(path.join(outputDir, 'id_rsa')), false);
    assert.ok(report.filesRejected >= 3);

    cleanTempDir(testDir);
  });

  // TEST 6: Hidden directories exclusion
  await runTest('Case 6: Hidden directories (.git, .secret) are excluded from packaging', async () => {
    const testDir = createTempDir('test6-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    const secretDir = path.join(inputDir, '.secret');
    const gitDir = path.join(inputDir, '.git');
    fs.mkdirSync(secretDir, { recursive: true });
    fs.mkdirSync(gitDir, { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);
    fs.writeFileSync(path.join(secretDir, 'keys.json'), '{"key":"value"}');
    fs.writeFileSync(path.join(gitDir, 'config'), '[core] repositoryformatversion = 0');

    const report = await packageStaticDemo({
      inputDir,
      outputDir,
      logger: silentLogger
    });

    assert.equal(fs.existsSync(path.join(outputDir, '.secret')), false);
    assert.equal(fs.existsSync(path.join(outputDir, '.git')), false);
    assert.equal(fs.existsSync(path.join(outputDir, '.secret', 'keys.json')), false);

    cleanTempDir(testDir);
  });

  // TEST 7: Path traversal attempt protection
  await runTest('Case 7: Path traversal escape attempts are blocked', async () => {
    const testDir = createTempDir('test7-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    fs.mkdirSync(inputDir, { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);
    // Outside file in parent folder
    fs.writeFileSync(path.join(testDir, 'unauthorized_outside.txt'), 'SENSITIVE_OUTSIDE_DATA');

    // Direct classification checks for relative traversal attempts
    const { classifyCandidate } = await import('./package_static_demo.mjs');
    const traversalCheck1 = classifyCandidate('../unauthorized_outside.txt', path.join(testDir, 'unauthorized_outside.txt'), inputDir);
    assert.equal(traversalCheck1.allowed, false);
    assert.match(traversalCheck1.reason, /traversal/i);

    const traversalCheck2 = classifyCandidate('subdir/../../unauthorized_outside.txt', path.join(testDir, 'unauthorized_outside.txt'), inputDir);
    assert.equal(traversalCheck2.allowed, false);
    assert.match(traversalCheck2.reason, /traversal/i);

    const report = await packageStaticDemo({
      inputDir,
      outputDir,
      logger: silentLogger
    });

    assert.equal(fs.existsSync(path.join(outputDir, 'unauthorized_outside.txt')), false);
    assert.equal(report.filesIncluded >= 1, true);

    cleanTempDir(testDir);
  });

  // TEST 8: External symlink detection & rejection
  await runTest('Case 8: Symbolic links pointing outside source directory are detected and rejected', async () => {
    const testDir = createTempDir('test8-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    fs.mkdirSync(inputDir, { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);

    const outsideTarget = path.join(testDir, 'host_secret_config.json');
    fs.writeFileSync(outsideTarget, '{"db_password":"leak"}');

    const symlinkPath = path.join(inputDir, 'leaked_link.json');
    try {
      fs.symlinkSync(outsideTarget, symlinkPath);
    } catch (e) {
      // If symlinks not permitted in test environment, skip gracefully
      console.log(`(symlinks unsupported in this fs: ${e.message})`);
      cleanTempDir(testDir);
      return;
    }

    const report = await packageStaticDemo({
      inputDir,
      outputDir,
      logger: silentLogger
    });

    assert.equal(fs.existsSync(path.join(outputDir, 'leaked_link.json')), false);
    const symlinkAlert = report.rejectedDetails.some(d => d.path === 'leaked_link.json' || d.reason.includes('symlink'));
    assert.equal(symlinkAlert, true, 'Symlink outside must be reported in rejectedDetails');

    cleanTempDir(testDir);
  });

  // TEST 9: Secret scanner aborts on leaked credential
  await runTest('Case 9: Content scanner aborts packaging when hardcoded credentials exist in JS', async () => {
    const testDir = createTempDir('test9-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    fs.mkdirSync(inputDir, { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);
    // Bundle with hardcoded database password
    const contaminatedJs = `
      export const config = {
        MARIADB_PASSWORD: "super_secret_mariadb_password_123",
        dbUri: "mariadb://encarmen_user:secret1234@127.0.0.1:3306/encarmen"
      };
    `;
    fs.writeFileSync(path.join(inputDir, 'main.js'), contaminatedJs);

    const report = await packageStaticDemo({
      inputDir,
      outputDir,
      strictSecrets: true,
      logger: silentLogger
    });

    assert.equal(report.success, false, 'Packager MUST fail if critical secrets are detected');
    assert.equal(report.exitCode, 2, 'Exit code must be 2 for security abort');
    assert.ok(report.securityAlerts.length >= 1, 'Must record security alerts');
    assert.ok(report.errors.some(e => e.includes('Security abort')), 'Error message must reflect security abort');

    cleanTempDir(testDir);
  });

  // TEST 10: Source directory immutability
  await runTest('Case 10: Input source directory remains strictly unmodified (immutability check)', async () => {
    const testDir = createTempDir('test10-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    fs.mkdirSync(path.join(inputDir, 'sub'), { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);
    fs.writeFileSync(path.join(inputDir, 'sub', 'app.js'), 'const a = 1;');
    fs.writeFileSync(path.join(inputDir, 'sub', 'style.css'), '.a { color: red; }');

    // Snapshot before
    const snapshotBefore = computeDirectoryHashSnapshot(inputDir);

    await packageStaticDemo({
      inputDir,
      outputDir,
      logger: silentLogger
    });

    // Snapshot after
    const snapshotAfter = computeDirectoryHashSnapshot(inputDir);

    assert.deepEqual(snapshotBefore, snapshotAfter, 'Source directory snapshot must be 100% identical before and after packaging');

    cleanTempDir(testDir);
  });

  // TEST 11: Idempotency and reproducible hashes
  await runTest('Case 11: Idempotent and deterministic packaging produces identical SHA-256 manifests', async () => {
    const testDir = createTempDir('test11-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir1 = path.join(testDir, 'dist-demo-1');
    const outputDir2 = path.join(testDir, 'dist-demo-2');
    fs.mkdirSync(inputDir, { recursive: true });

    fs.writeFileSync(path.join(inputDir, 'index.html'), VALID_INDEX_HTML);
    fs.writeFileSync(path.join(inputDir, 'app.js'), 'console.log("Deterministic Test");');

    const fixedTimestamp = '2026-10-28T12:00:00.000Z';
    const rep1 = await packageStaticDemo({ inputDir, outputDir: outputDir1, timestamp: fixedTimestamp, logger: silentLogger });
    const rep2 = await packageStaticDemo({ inputDir, outputDir: outputDir2, timestamp: fixedTimestamp, logger: silentLogger });

    assert.equal(rep1.success, true);
    assert.equal(rep2.success, true);

    const sums1 = fs.readFileSync(path.join(outputDir1, 'SHA256SUMS'), 'utf8');
    const sums2 = fs.readFileSync(path.join(outputDir2, 'SHA256SUMS'), 'utf8');
    assert.equal(sums1, sums2, 'SHA256SUMS must be exactly identical across runs');

    const man1 = JSON.parse(fs.readFileSync(path.join(outputDir1, 'manifest.json'), 'utf8'));
    const man2 = JSON.parse(fs.readFileSync(path.join(outputDir2, 'manifest.json'), 'utf8'));
    assert.deepEqual(man1.files, man2.files, 'Manifest files dictionary and hashes must match');

    cleanTempDir(testDir);
  });

  // TEST 12: Incomplete build output handling
  await runTest('Case 12: Incomplete build (missing or empty index.html) fails gracefully with exitCode 1', async () => {
    const testDir = createTempDir('test12-');
    const inputDir = path.join(testDir, 'dist');
    const outputDir = path.join(testDir, 'dist-demo');
    fs.mkdirSync(inputDir, { recursive: true });

    // Missing index.html
    fs.writeFileSync(path.join(inputDir, 'random.js'), 'console.log("no index");');

    const report1 = await packageStaticDemo({
      inputDir,
      outputDir,
      logger: silentLogger
    });

    assert.equal(report1.success, false);
    assert.equal(report1.exitCode, 1);
    assert.ok(report1.errors.some(e => e.includes('index.html is missing')));

    // Empty index.html
    fs.writeFileSync(path.join(inputDir, 'index.html'), '   ');
    const report2 = await packageStaticDemo({
      inputDir,
      outputDir,
      logger: silentLogger
    });

    assert.equal(report2.success, false);
    assert.equal(report2.exitCode, 1);
    assert.ok(report2.errors.some(e => e.includes('index.html:')));

    cleanTempDir(testDir);
  });

  console.log(`\n============================================================`);
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  console.log(` Test Summary: ${passed}/${total} passed (${failed} failed)`);
  console.log(` Total Duration: ${results.reduce((acc, r) => acc + r.duration, 0)}ms`);
  console.log(`============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[FATAL] Test runner crashed:', err);
  process.exit(1);
});
