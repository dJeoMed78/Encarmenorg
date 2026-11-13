import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
test('retired WordPress scripts with embedded credentials must never ship',()=>{
 for(const p of ['scripts/repair_all_wordpress_products.ts','scripts/pull_all_real_images_from_wordpress.mjs'])
  assert.equal(existsSync(new URL(p,root)),false,p);
});
