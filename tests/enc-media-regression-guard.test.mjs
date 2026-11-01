import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const publicView = read('src/components/RegisterBusinessView.tsx');
const editView = read('src/components/EditBusinessModal.tsx');
const server = read('server.ts');
const wiring = read('src/server/publicRegistrationWiring.ts');
const store = read('src/db/stagingMediaStore.ts');
const client = read('src/services/publicMediaClient.ts');

test('public form file selectors remain enabled and wired to upload callbacks', () => {
  for (const callback of ['handleLogoUpload', 'handleGalleryUpload']) {
    const tag = publicView.match(new RegExp('<input\\s+[^>]*onChange=\\{' + callback + '\\}[^>]*>', 's'));
    assert.ok(tag, 'missing file input for ' + callback);
    assert.match(tag[0], /type="file"/);
    assert.doesNotMatch(tag[0], /\bdisabled(?:\s|=\{true\}|>)/);
  }
  assert.doesNotMatch(publicView, /Carga pública de logotipo y galería no disponible todavía|La galería está deshabilitada hasta disponer de una carga pública segura/);
  assert.match(publicView, /uploadRegistrationImage\(file, 'logo'/);
  assert.match(publicView, /uploadRegistrationImage\(file, 'gallery'/);
});

test('public form submits media references and prevents sending while uploads remain pending', () => {
  assert.match(publicView, /logoPending\.current > 0/);
  assert.match(publicView, /galleryPending\.current > 0/);
  assert.match(publicView, /logo_url: formData\.image/);
  assert.match(publicView, /gallery: galleryImages/);
  assert.match(publicView, /mediaAttempt: mediaAttemptId\.current/);
});

test('admin editor uses verified database-backed media upload, not legacy uploader', () => {
  assert.match(editView, /uploadRegistrationImage\(file,/);
  assert.doesNotMatch(editView, /uploadBusinessLogo\(/);
  assert.doesNotMatch(editView, /import\s*\{\s*uploadBusinessLogo\s*\}/);
  assert.match(editView, /uploadBusy\.current = true/);
  assert.match(editView, /uploadBusy\.current = false/);
});

test('staging write gate remains restricted to approved media and business operations', () => {
  assert.match(server, /req\.path === '\/api\/public\/registration-media'/);
  assert.match(server, /adminSecurity\.isAuthorized\(req, 'business:delete'\)/);
  assert.match(server, /isBusinessWritePermitted\(\)/);
  assert.match(server, /STAGING_READ_ONLY/);
});

test('media storage continues verifying isolation, actual BLOB and ownership', () => {
  assert.match(wiring, /privatePublicRegistrationEnabled\(snapshot\(\)\)/);
  assert.match(store, /verifyStagingIsolation/);
  assert.match(store, /STAGING_BUSINESS_DATABASE/);
  assert.match(store, /await conn\.beginTransaction\(\)/);
  assert.match(store, /await conn\.commit\(\)/);
  assert.match(store, /await conn\.rollback\(\)/);
  assert.match(store, /sha256\(bytes\) !== digest/);
  assert.match(store, /async verifyOwned/);
});

test('media client never silently falls back to local success', () => {
  assert.match(client, /fetch\('\/api\/public\/registration-media'/);
  assert.match(client, /response\.ok/);
  assert.match(client, /result\.success !== true/);
  assert.doesNotMatch(client, /localStorage\.setItem\(/);
});

test('PI administration callbacks reach both public business views', () => {
  for (const view of ['src/components/DirectBusinessView.tsx', 'src/components/BusinessDetailModal.tsx']) {
    const code = read(view);
    for (const callback of ['onEditBusiness', 'onDeleteBusiness', 'onToggleTop', 'onToggleRecommended']) {
      assert.match(code, new RegExp(callback + '={'), view + ' must wire ' + callback);
    }
  }
});

test('PI checks server session, exposes independent badges and confirms deletion', () => {
  const detail = read('src/components/BusinessPublicDetail.tsx');
  assert.match(detail, /const allowed = await verifyAdminSession\(\)/);
  assert.match(detail, /type="checkbox" checked=\{Boolean\(b\.isRecommended\)\}/);
  assert.match(detail, /type="checkbox" checked=\{Boolean\(b\.isTopBusiness\)\}/);
  assert.match(detail, /window\.confirm\(/);
  const app = read('src/App.tsx');
  assert.match(app, /await adminUpdateBusiness\(id, \{ \[field\]: next \}/);
  assert.match(app, /if \(!result\.success\)/);
  assert.match(read('server.ts'), /El distintivo no coincide con lo guardado en MariaDB/);
});
