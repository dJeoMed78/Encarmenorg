import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyTsxPatch,applyCssPatch} from '../scripts/apply-f007a-mobile-order-patch.mjs';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url),'utf8');
const tsx = read('src/components/BusinessPublicDetail.tsx');
const css = read('src/components/BusinessPublicDetail.css');

test('source committed: reviews are after all business facts in DOM', () => {
  const reviews = tsx.indexOf('className="bpd-card bpd-reviews"');
  const facts = tsx.indexOf('className="bpd-facts"');
  const footer = tsx.indexOf('className="bpd-footer"');
  assert.ok(facts>=0 && reviews>facts && footer>reviews);
  assert.equal((tsx.match(/className="bpd-card bpd-reviews"/g)||[]).length,1);
  assert.equal((tsx.match(/id="bpd-ratings"/g)||[]).length,1);
});

test('committed CSS: desktop opinions occupy row 3 after facts', () => {
  assert.match(css,/\/\* ENC-F007A: reviews after business facts on wide screens\. \*\/\s*\.bpd-reviews\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*grid-row:\s*3;/);
});

test('committed CSS: 701-1100px opinions follow facts at row 4', () => {
  const medium = css.match(/@media\s*\(max-width:\s*1100px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(medium);
  assert.match(medium[1],/\.bpd-facts\s*\{[^}]*grid-row:\s*3/);
  assert.match(medium[1],/\.bpd-reviews\s*\{[^}]*grid-row:\s*4/);
});

test('committed CSS: <=700px opinions retain order 7', () => {
  const mobile = css.match(/@media\s*\(max-width:\s*700px\)\s*\{([\s\S]*?)\}\s*@media\s*\(max-width:\s*360px\)/);
  assert.ok(mobile);
  assert.match(mobile[1],/\.bpd-facts\s*\{[^}]*order:\s*6/);
  assert.match(mobile[1],/\.bpd-reviews\s*\{[^}]*order:\s*7/);
});

test('existing contacts, location, payments and services are not removed', () => {
  assert.match(tsx,/href=\{`https:\/\/wa\.me\/\$\{wa\}`\}/);
  assert.match(tsx,/href=\{`tel:\+\$\{tel\}`\}/);
  for(const section of ['<MapPin /> Ubicación','<Clock /> Horario de atención','<CreditCard /> Formas de pago','<Truck /> Entrega y servicio']) {
    assert.ok(tsx.includes(section),section);
  }
  assert.match(tsx,/<StarRatingWidget businessId=\{b\.id\} businessName=\{b\.name\} \/>/);
});

test('patch script is idempotent and does not change committed functional files',()=>{
  const t=applyTsxPatch(tsx), c=applyCssPatch(css);
  assert.equal(t.source,tsx);
  assert.equal(c.source,css);
  assert.equal(t.applied.length,0);
  assert.equal(c.applied.length,0);
  assert.equal(t.skipped.length,2);
  assert.equal(c.skipped.length,2);
});
