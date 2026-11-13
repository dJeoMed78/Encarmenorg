import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/control/app.js',import.meta.url),'utf8');

test('Staging permits only admin-authorized control journal POST through global guard',()=>{
 assert.match(server,/req\.method === 'POST' && req\.path === '\/api\/control\/events' &&\s*adminSecurity\.isAuthorized\(req, 'admin:manage'\)/);
 assert.match(server,/registerControlBoard\(app,/);
});
test('control events still require admin and origin and revision checks',()=>{
 const board=readFileSync(new URL('../src/server/controlBoard.mjs',import.meta.url),'utf8');
 assert.match(board,/security\.isAuthorized\(req,'admin:manage'\)/);
 assert.match(board,/req\.get\('Origin'\)/);
 assert.match(board,/journal\.append\(b\.revision,b\.type,b\.taskId,b\.data\|\|\{\},actor\)/);
});
test('instruction UI reports expired session without claiming successful save',()=>{
 assert.match(app,/error\.status=r\.status/);
 assert.match(app,/err\.status===401/);
 assert.match(app,/Tu elección no fue registrada/);
});
