import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getMissingCategoryRoute, isHostingerPreviewHost, getCanonicalSeoOrigin } from '../src/server/seoIndexing.ts';
import { getCategoryRouteName } from '../src/utils/categoryRoutes.ts';
const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
test('only published top-level category routes resolve', () => {
 const cats=[{name:'Automotriz y Motocicletas',slug:'automotriz-y-motocicletas',parent:0},{name:'Subcat',slug:'subcat',parent:3}];
 assert.equal(getCategoryRouteName('/categoria/automotriz-y-motocicletas',cats),'Automotriz y Motocicletas');
 assert.equal(getCategoryRouteName('/categoria/subcat',cats),null);
 assert.equal(getCategoryRouteName('/categoria/unknown',cats),null);
});
test('unknown category paths return 404 and are excluded from indexing',()=>{
 assert.deepEqual(getMissingCategoryRoute('/categoria/unknown?x=1',false),{status:404,reason:'category-not-found'});
 assert.equal(getMissingCategoryRoute('/categoria/automotriz',true),null);
 assert.ok(server.includes('getMissingCategoryRoute(req.path'));
 assert.ok(server.includes('categoryTitle'));
});
test('Hostinger preview is noindex and never changes canonical origin',()=>{
 assert.equal(isHostingerPreviewHost('test.hostingersite.com'),true);
 assert.equal(isHostingerPreviewHost('encarmen.org'),false);
 assert.equal(getCanonicalSeoOrigin('test.hostingersite.com','production'),'https://encarmen.org');
 assert.ok(server.includes('isHostingerPreviewHost(requestHost)'));
 assert.ok(app.includes('getCategoryFromUrl()'));
});
