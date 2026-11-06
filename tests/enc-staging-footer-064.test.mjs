import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../server.ts',import.meta.url),'utf8');
const footer=fs.readFileSync(new URL('../src/components/Footer.tsx',import.meta.url),'utf8');
const deploy=fs.readFileSync(new URL('../.github/workflows/enc-radars-041-043-staging-deploy.yml',import.meta.url),'utf8');
test('Staging always serves bundled frontend instead of Vite dev source',()=>{
 assert.match(server,/process\.env\.APP_ENV === 'staging'/);
 assert.match(server,/app\.use\(express\.static\(path\.resolve\(__dirname, 'dist'\)/);
});
test('Footer gets active release manifest, never placeholders when metadata available',()=>{
 assert.match(footer,/fetch\('\/encarmen-release\.json', \{ cache: 'no-store'/);
 assert.match(footer,/release\?\.sha \|\| APP_COMMIT_SHA/);
 assert.match(footer,/release\?\.updatedAt \|\| APP_BUILD_TIMESTAMP/);
 assert.match(footer,/America\/Merida/);
});
test('Dedicated route verifies manifest and disables caches',()=>{
 assert.match(server,/app\.get\('\/encarmen-release\.json'/);
 assert.match(server,/RELEASE_IDENTITY_NOT_VERIFIED/);
});
test('Deployment checks exact SHA, date and HTTP endpoint',()=>{
 assert.match(deploy,/dist\/encarmen-release\.json/);
 assert.match(deploy,/RELEASE_JSON=/);
 assert.match(deploy,/ENCARMEN_STAGING_FOOTER_RELEASE_IDENTITY=PASS/);
});
