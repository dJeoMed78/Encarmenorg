import test from 'node:test';
import assert from 'node:assert/strict';
import {
  uploadBusinessLogo, checkBusinessDuplicate,
  updateReportStatus, deleteReport
} from '../src/services/api.ts';

const response = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json'}});
async function withFetch(handler, fn) {
  const previous = globalThis.fetch;
  globalThis.fetch = handler;
  try { return await fn(); } finally { globalThis.fetch = previous; }
}

test('upload never claims remote persistence on errors or local data URIs', async () => {
  for (const handler of [
    async () => response({success:false}, 503),
    async () => response({success:true,url:'data:image/png;base64,AAAA'}),
    async () => response({success:true}),
    async () => { throw new Error('disconnected'); }
  ]) {
    const result = await withFetch(handler, ()=>uploadBusinessLogo('data:image/png;base64,AAAA','a.png'));
    assert.equal(result.success,false);
    assert.equal(result.url,undefined);
  }
  const ok = await withFetch(async()=>response({success:true,url:'/media/logo.png'}),()=>uploadBusinessLogo('x','a.png'));
  assert.equal(ok.success,true);
  assert.equal(ok.url,'/media/logo.png');
});

test('duplicate check fails closed on HTTP error, invalid response or network failure', async()=>{
  for(const handler of [
    async()=>response({isDuplicate:false},503),
    async()=>response({success:true}),
    async()=>{throw new Error('network failed')}
  ]) await assert.rejects(withFetch(handler,()=>checkBusinessDuplicate('Empresa sintética')), /duplicad|network failed/i);
  const ok = await withFetch(async()=>response({isDuplicate:false}),()=>checkBusinessDuplicate('Empresa sintética'));
  assert.equal(ok.isDuplicate,false);
});

test('report operations demand success:true body, not just HTTP 200',async()=>{
  const patched = await withFetch(async()=>response({success:false}),()=>updateReportStatus('r1','resolved'));
  assert.equal(patched,false);
  const missing = await withFetch(async()=>response({success:true}),()=>updateReportStatus('r1','resolved'));
  assert.equal(missing,false);
  const confirmed = await withFetch(async()=>response({success:true,report:{id:'r1',status:'resolved'}}),()=>updateReportStatus('r1','resolved'));
  assert.equal(confirmed,true);
  const noDelete = await withFetch(async()=>response({success:false}),()=>deleteReport('r1'));
  assert.equal(noDelete,false);
  const deleted = await withFetch(async()=>response({success:true}),()=>deleteReport('r1'));
  assert.equal(deleted,true);
});
