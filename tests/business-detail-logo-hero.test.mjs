import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const detail = readFileSync(new URL('../src/components/BusinessPublicDetail.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/components/BusinessPublicDetail.css', import.meta.url), 'utf8');

test('the initial hero uses the cover, or the logo only when the cover is absent', () => {
  assert.match(detail, /heroBrandImage = \(coverPhoto && !coverFailed \? coverPhoto : undefined\) \|\| displayBrandImage/);
  assert.match(detail, /heroBrandMode \?/);
  assert.match(detail, /className=\{heroBrandImage === coverPhoto \? "bpd-hero-cover" : "bpd-hero-logo"\}/);
  assert.match(css, /\.bpd-hero > img\.bpd-hero-logo\s*\{[^}]*object-fit:\s*contain/);
});

test('only product/service gallery entries appear as thumbnails and selecting one changes the hero', () => {
  assert.match(detail, /const photos = media\.gallery/);
  assert.match(detail, /photos\.length > 0 && \(\s*<div className="bpd-thumbnails">/);
  assert.match(detail, /setHeroBrandMode\(false\);\s*setIndex\(i\)/);
  assert.match(detail, /const turn = \(n: number\) => \{[\s\S]*?setHeroBrandMode\(false\)/);
  assert.match(detail, /Ver todas las fotos \(\{photos\.length\}\)/);
});

test('no cover and no logo leaves a placeholder until a service thumbnail is selected', () => {
  assert.match(detail, /heroBrandMode \?/);
  assert.ok(detail.includes('Imagen principal de '));
  assert.match(detail, /<Photo src=\{photos\[index\]\}/);
});

test('changing business media resets the hero to its cover/logo initial state', () => {
  assert.match(detail, /setHeroBrandMode\(true\);\s*setIndex\(0\);[\s\S]*?\[b\.id, registeredLogo, coverPhoto, galleryKey\]/);
});
