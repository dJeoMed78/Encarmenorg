import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyTsxPatch, applyCssPatch } from '../scripts/apply-f007a-mobile-order-patch.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const tsx = read('src/components/BusinessPublicDetail.tsx');
const css = read('src/components/BusinessPublicDetail.css');

const domOrder = (source) => {
  const reviews = source.indexOf('bpd-reviews');
  const facts = source.indexOf('bpd-facts');
  return { reviews, facts, after: reviews > facts };
};

test('ENC-F007A: defecto presente en la base — opiniones antes de datos en el DOM', () => {
  const before = domOrder(tsx);
  assert.ok(before.reviews > -1 && before.facts > -1);
  assert.ok(before.reviews < before.facts, 'el bloque de opiniones aparece antes de bpd-facts en el DOM base');
});

test('ENC-F007A: tras el parche, opiniones quedan después de ubicación/horarios/pagos/entrega en el DOM', () => {
  const patched = applyTsxPatch(tsx).source;
  const after = domOrder(patched);
  assert.ok(after.after, 'bpd-reviews debe aparecer después de bpd-facts');
  assert.equal((patched.match(/bpd-reviews/g) || []).length, (tsx.match(/bpd-reviews/g) || []).length, 'no se duplica la sección de opiniones');
  assert.match(patched, /<section className="bpd-card bpd-reviews" id="bpd-ratings">/);
  assert.match(patched, /<StarRatingWidget businessId=\{b\.id\} businessName=\{b\.name\} \/>/);
});

test('ENC-F007A: en móvil (<=700px) las opiniones conservan order 7', () => {
  const patched = applyCssPatch(css).source;
  const mobile = patched.match(/@media\s*\(max-width:\s*700px\)\s*\{([\s\S]*?)\}\s*@media\s*\(max-width:\s*360px\)/);
  assert.ok(mobile);
  assert.match(mobile[1], /\.bpd-reviews\s*\{[^}]*order:\s*7/);
});

test('ENC-F007A: en 701-1100px las opiniones quedan después de los datos (fila 4)', () => {
  const patched = applyCssPatch(css).source;
  const medium = patched.match(/@media\s*\(max-width:\s*1100px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(medium);
  assert.match(medium[1], /\.bpd-reviews\s*\{[^}]*grid-row:\s*4/);
  assert.match(medium[1], /\.bpd-reviews\s*\{[^}]*grid-column:\s*1 \/ -1/);
});

test('ENC-F007A: en escritorio las opiniones ocupan una fila completa al final', () => {
  const patched = applyCssPatch(css).source;
  assert.match(patched, /\/\* ENC-F007A: opiniones al final en escritorio[^*]*\*\/\s*\.bpd-reviews\s*\{[^}]*grid-row:\s*3/);
});

test('contactos, mapa y accesibilidad se conservan', () => {
  const patched = applyTsxPatch(tsx).source;
  assert.match(patched, /href=\{`https:\/\/wa\.me\/\$\{wa\}`\}/);
  assert.match(patched, /href=\{`tel:\+\$\{tel\}`\}/);
  assert.match(patched, /<MapPin \/> Ubicación/);
  assert.match(patched, /<Clock \/> Horario de atención/);
  assert.match(patched, /<CreditCard \/> Formas de pago/);
  assert.match(patched, /<Truck \/> Entrega y servicio/);
  assert.equal((patched.match(/id="bpd-ratings"/g) || []).length, 1, 'un solo ancla de opiniones');
});

test('el parche es idempotente', () => {
  const once = applyTsxPatch(tsx);
  const twice = applyTsxPatch(once.source);
  assert.deepEqual(twice.applied, []);
  assert.equal(twice.skipped.length, 2);
  const cssOnce = applyCssPatch(css);
  const cssTwice = applyCssPatch(cssOnce.source);
  assert.deepEqual(cssTwice.applied, []);
  assert.equal(cssTwice.skipped.length, 2);
});
