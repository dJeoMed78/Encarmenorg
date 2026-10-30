import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyPatch } from '../scripts/apply-promo-image-integrity-patch.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const original = read('src/components/AdminPromotionsTab.tsx');

const patched = () => applyPatch(original).source;

test('ENC-INT-006: el defecto está presente en la base (dataURI como promoImage al fallar)', () => {
  assert.match(original, /setPromoImage\(compressedDataUrl\)/);
  assert.match(original, /promoImage: promoImage\.trim\(\) \|\| promoImageData \|\| null/);
});

test('la previsualización local es un estado separado y no sustituye la imagen remota', () => {
  const p = patched();
  assert.match(p, /const \[promoImagePreview, setPromoImagePreview\] = useState\(''\)/);
  assert.match(p, /setPromoImagePreview\(compressedDataUrl\)/);
  assert.doesNotMatch(p, /setPromoImage\(compressedDataUrl\)/);
});

test('fallo de subida conserva la imagen anterior y reporta error', () => {
  const p = patched();
  assert.match(p, /No se pudo confirmar la subida de la imagen\. Se conserva la imagen anterior\./);
  assert.match(p, /No se pudo subir la imagen\. Se conserva la imagen anterior\./);
  assert.doesNotMatch(p, /setPromoImage\(''\)/);
});

test('subida fuera de orden: la más reciente manda', () => {
  const p = patched();
  assert.match(p, /const uploadId = \+\+promoUploadSeq\.current/);
  assert.match(p, /if \(uploadId !== promoUploadSeq\.current\) return;/);
});

test('guardado: solo URL remota confirmada como promoImage; dataURI histórico permanece en promoImageData', () => {
  const p = patched();
  assert.match(p, /promoImage: promoImage\.trim\(\) && !promoImage\.startsWith\('data:'\) \? promoImage\.trim\(\) : null/);
  assert.match(p, /promoImageData: promoImageData \|\| \(promoImage\.startsWith\('data:'\) \? promoImage : null\)/);
});

test('guardado bloqueado mientras hay una subida en curso', () => {
  const p = patched();
  assert.match(p, /if \(isUploadingPromoImg\) \{[\s\S]*?Espera a que termine la subida de la imagen/);
});

test('edición histórica y reset manejan la previsualización', () => {
  const p = patched();
  assert.match(p, /setPromoImagePreview\(''\)/);
  assert.equal((p.match(/setPromoImagePreview\(''\)/g) || []).length >= 2, true);
});

test('contrato de uploadBusinessLogo se conserva', () => {
  const p = patched();
  assert.match(p, /uploadBusinessLogo\(compressedDataUrl, file\.name\)/);
  assert.match(p, /res\.success && res\.url && !res\.url\.startsWith\('data:'\)/);
});

test('sin éxito falso: no se muestra éxito de imagen sin confirmación', () => {
  const p = patched();
  assert.doesNotMatch(p, /setPromoImage\(compressedDataUrl\)/);
  assert.match(p, /setErrorMsg\(res\.error \|\| 'No se pudo confirmar la subida de la imagen/);
});

test('el parche es idempotente', () => {
  const once = applyPatch(original);
  const twice = applyPatch(once.source);
  assert.deepEqual(twice.applied, []);
  assert.equal(twice.skipped.length, 7);
});
