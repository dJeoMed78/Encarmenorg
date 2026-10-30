import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyPromoImageSource} from '../scripts/apply-promo-image-integrity-patch.mjs';

const source=readFileSync(new URL('../src/components/AdminPromotionsTab.tsx',import.meta.url),'utf8');
const upload=source.slice(source.indexOf('const handlePromoImageUpload'),source.indexOf('// Helper to extract'));
const save=source.slice(source.indexOf('const handleSavePromo'),source.indexOf('const handleDeletePromo'));

test('the committed functional source contains the safeguards',()=>{
  assert.ok(Object.values(verifyPromoImageSource(source)).every(Boolean));
});
test('failed upload never changes remote image or historical data',()=>{
  assert.doesNotMatch(upload,/setPromoImage\(compressedDataUrl\)/);
  assert.doesNotMatch(upload,/setPromoImageData\(compressedDataUrl\)/);
  assert.match(upload,/setPromoImage\(confirmedUrl\);\s*setPromoImageData\(''\)/);
  assert.match(upload,/if \(res\.success && /);
});
test('concurrent uploads cannot apply stale results after compression or remote upload',()=>{
  assert.equal((upload.match(/uploadId !== promoUploadSeq\.current/g)||[]).length,2);
  assert.match(upload,/if \(uploadId === promoUploadSeq\.current\) \{[\s\S]*setPromoImagePreview\(''\)/);
});
test('switching/resetting a form invalidates in-flight uploads',()=>{
  for(const h of ['handleEditPromo','handleResetForm']){
    const chunk=source.slice(source.indexOf('const '+h),source.indexOf('};',source.indexOf('const '+h)));
    assert.match(chunk,/promoUploadSeq\.current \+= 1/);
    assert.match(chunk,/setPromoImagePreview\(''\)/);
  }
});
test('saving cannot substitute a dataURI for remote image',()=>{
  assert.match(save,/if \(isUploadingPromoImg\)/);
  assert.doesNotMatch(save,/promoImage:\s*promoImage\.trim\(\) \|\| promoImageData/);
  assert.match(save,/promoImageData:\s*promoImageData \|\| null/);
});
test('temporary preview appears in UI but does not appear in payload',()=>{
  assert.match(source,/src=\{promoImagePreview \|\| promoImage \|\| promoImageData\}/);
  assert.doesNotMatch(save,/promoImagePreview/);
});
test('a failed upload reports a visible error',()=>{
  assert.match(upload,/setErrorMsg\(res\.error \|\|/);
  assert.match(upload,/setErrorMsg\(err\?\.message \|\|/);
});
