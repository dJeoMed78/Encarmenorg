import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../server.ts',import.meta.url),'utf8');
for(const route of ["app.get('/api/ai/status'", "app.post('/api/ai/parse-business'"]){
 test(route+' rejects unauthenticated access before Gemini or user input',()=>{
  const start=s.indexOf(route);assert.ok(start>=0);
  const body=s.slice(start,start+380);
  assert.match(body,/adminSecurity\.isAuthorized\(req, 'admin:manage'\)/);
  assert.match(body,/res\.status\(401\)/);
 });
}
