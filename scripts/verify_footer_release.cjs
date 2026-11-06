#!/usr/bin/env node
// Fail closed: a release cannot ship with an unverified footer identity.
const fs = require('node:fs');
const path = require('node:path');

const sha = (process.env.ENCARMEN_EXPECTED_SHA || process.env.GITHUB_SHA || '').toLowerCase();
if (!/^[0-9a-f]{40}$/.test(sha)) {
  console.error('FOOTER_RELEASE_SHA_INVALID');
  process.exit(1);
}
const root = path.resolve(__dirname, '..');
const versionPath = path.join(root, 'src/constants/version.ts');
const dist = path.join(root, 'dist');
const source = fs.readFileSync(versionPath, 'utf8');
const version = source.match(/export const APP_VERSION = "([^"]+)";/);
const commit = source.match(/export const APP_COMMIT_SHA: string \| null = "([0-9a-f]{40})";/);
if (!version || !commit || commit[1] !== sha || !version[1].includes(sha.slice(0, 12)) ||
    version[1].includes('SIN-COMPILAR') || version[1].includes('SIN-SHA')) {
  console.error('FOOTER_VERSION_SOURCE_MISMATCH');
  process.exit(1);
}
const index = path.join(dist, 'index.html');
if (!fs.existsSync(index)) {
  console.error('FOOTER_DIST_INDEX_MISSING');
  process.exit(1);
}
const assets = path.join(dist, 'assets');
const files = fs.existsSync(assets) ? fs.readdirSync(assets).filter(f => f.endsWith('.js')) : [];
if (!files.length) {
  console.error('FOOTER_DIST_JS_MISSING');
  process.exit(1);
}
const bundles = files.map(f => fs.readFileSync(path.join(assets, f), 'utf8'));
if (!bundles.some(x => x.includes(sha) && x.includes(version[1]))) {
  console.error('FOOTER_DIST_IDENTITY_MISSING');
  process.exit(1);
}
if (bundles.some(x => x.includes('SIN-COMPILAR') || x.includes('Commit: no verificado'))) {
  console.error('FOOTER_DIST_UNVERIFIED_PLACEHOLDER');
  process.exit(1);
}
console.log('FOOTER_RELEASE_IDENTITY=VERIFIED');
console.log('FOOTER_RELEASE_SHA=' + sha);
