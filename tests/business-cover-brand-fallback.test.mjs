import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/components/BusinessPublicDetail.tsx', import.meta.url), 'utf8');

test('a registered logo wins over cover; missing/failed logo uses cover', () => {
  assert.match(src, /registeredLogo = companyLogo\(b\.logo_url\)/);
  assert.match(src, /coverPhoto = companyLogo\(extra\.cover_url\) \|\| companyLogo\(b\.image\) \|\| companyLogo\(b\.imageUrl\)/);
  assert.match(src, /registeredLogo && !logoFailed \? registeredLogo : undefined/);
  assert.match(src, /coverPhoto && !coverFailed \? coverPhoto : undefined/);
  assert.match(src, /setCoverFailed\(false\)/);
  assert.match(src, /displayBrandImage === registeredLogo \? setLogoFailed\(true\) : setCoverFailed\(true\)/);
});

test('hero and identity use same resolved brand image but gallery remains separate', () => {
  assert.match(src, /heroLogoMode && displayBrandImage/);
  assert.match(src, /displayBrandImage && \(heroLogoMode \|\| !photos\.length\)/);
  assert.match(src, /className="bpd-hero-logo"/);
  assert.match(src, /className="bpd-card bpd-identity"/);
  assert.match(src, /src=\{displayBrandImage\}/);
  assert.match(src, /Array\.isArray\(b\.gallery\) \? b\.gallery : \[\]/);
  assert.doesNotMatch(src, /gallery\.filter|delete b\.image|b\.logo_url\s*=/);
});
