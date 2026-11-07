import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/components/BusinessPublicDetail.tsx', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../src/utils/businessMediaPresentation.ts', import.meta.url), 'utf8');

test('cover has priority in the hero and logo is used only as fallback', () => {
  assert.match(src, /const media = resolveBusinessMedia\(b, window\.location\.origin\)/);
  assert.match(src, /heroBrandImage = \(coverPhoto && !coverFailed \? coverPhoto : undefined\) \|\| displayBrandImage/);
  assert.match(src, /registeredLogo = media\.logo/);
  assert.match(src, /coverPhoto = media\.cover/);
  assert.match(helper, /hero: cover \|\| logo/);
});

test('identity logo and public gallery remain independent from the cover', () => {
  assert.match(src, /const photos = media\.gallery/);
  assert.match(src, /displayBrandImage = registeredLogo && !logoFailed \? registeredLogo : undefined/);
  const identity = src.slice(src.indexOf('<div className="bpd-card bpd-identity">'), src.indexOf('<aside className="bpd-facts">'));
  assert.match(identity, /src=\{displayBrandImage\}/);
  assert.match(identity, /alt=/);
  assert.match(identity, /onError=\{\(\) => setLogoFailed\(true\)\}/);
  assert.doesNotMatch(identity, /coverPhoto|heroBrandImage/);
  assert.doesNotMatch(src, /delete b\.image|b\.logo_url\s*=/);
});
