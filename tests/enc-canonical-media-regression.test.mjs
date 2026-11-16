import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
test('canonical media handler never redirects back to legacy image path', () => {
  const start = source.indexOf("app.get('/media/*'");
  const end = source.indexOf('// Direct download routes', start);
  assert.ok(start >= 0 && end > start);
  const handler = source.slice(start, end);
  assert.ok(!handler.includes('res.redirect(301'));
  assert.match(handler, /dbGetUploadedFile/);
  assert.match(handler, /sendImagePlaceholder/);
});
