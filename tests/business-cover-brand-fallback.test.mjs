import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/components/BusinessPublicDetail.tsx',import.meta.url),'utf8');
test('brand image prioritizes explicit logo over existing cover without mutating data',()=>{
 assert.match(src,/registeredLogo = companyLogo\(b\.logo_url\)/);
 assert.match(src,/coverPhoto = companyLogo\(extra\.cover_url \|\| b\.image \|\| b\.imageUrl\)/);
 assert.match(src,/displayBrandImage = registeredLogo \|\| coverPhoto/);
 assert.match(src,/src=\{displayBrandImage\}/);
 assert.match(src,/heroLogoMode && displayBrandImage && !logoFailed/);
 assert.match(src,/displayBrandImage && !logoFailed \?/);
});
test('gallery remains separate and cover is never moved or deleted',()=>{
 assert.match(src,/Array\.isArray\(b\.gallery\) \? b\.gallery : \[\]/);
 assert.doesNotMatch(src,/gallery\.filter|delete b\.image|b\.logo_url\s*=/);
});
