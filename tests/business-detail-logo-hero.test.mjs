import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const detail = readFileSync(new URL('../src/components/BusinessPublicDetail.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/components/BusinessPublicDetail.css', import.meta.url), 'utf8');

test('el logotipo registrado se muestra en ambas columnas y el hero inicial', () => {
  assert.match(detail, /displayBrandImage && \(heroLogoMode \|\| !photos\.length\)/);
  assert.match(detail, /className="bpd-hero-logo"[\s\S]*?src=\{displayBrandImage\}/);
  assert.match(detail, /className="bpd-card bpd-identity"[\s\S]*?src=\{displayBrandImage\}/);
  assert.match(css, /\.bpd-hero > img\.bpd-hero-logo\s*\{[^}]*object-fit:\s*contain/);
});

test('seleccionar fotos cambia el hero y conserva el logo lateral', () => {
  assert.match(detail, /setHeroLogoMode\(false\);\s*setIndex\(i\)/);
  assert.match(detail, /const turn = \(n: number\) => \{[\s\S]*?setHeroLogoMode\(false\)/);
  assert.match(detail, /useEffect\(\(\) => \{\s*setLogoFailed\(false\);\s*setCoverFailed\(false\);\s*setHeroLogoMode\(true\);\s*setIndex\(0\);/);
});

test('sin logo se mantiene la foto disponible o el estado vacío', () => {
  assert.match(detail, /\) : \(\s*<Photo src=\{photos\[index\]\}/);
  assert.match(detail, /photos\.length > 1 &&/);
});
