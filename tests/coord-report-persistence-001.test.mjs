// Synthetic persistence adapters; actual Express handlers extracted from server.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import crypto from 'node:crypto';
import express from 'express';
import {transformSync} from 'esbuild';

const source = fs.readFileSync(new URL('../server.ts',import.meta.url),'utf8');
const anchors = ["app.post('/api/reports'","app.patch('/api/reports/:id'","app.delete('/api/reports/:id'"];

async function harness({dbActive=true,dbResult=true,existing=[]}={}) {
  const app=express();
  app.use(express.json());
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'enc-reports-owned-'));
  const calls={saves:0,deletes:0,files:0};
  const ctx={
    app,crypto,path,__dirname:root,console:{warn(){}},
    reportsCache:structuredClone(existing),
    isMariaDbActive:()=>dbActive,
    dbSaveReport:async()=>{calls.saves++;return dbResult;},
    dbDeleteReport:async()=>{calls.deletes++;return dbResult;},
    fs:{writeFileSync(...args){calls.files++;fs.writeFileSync(...args);}}
  };
  vm.createContext(ctx);
  for(const anchor of anchors) {
    const start=source.indexOf(anchor);
    assert.ok(start>=0,'Missing handler '+anchor);
    const end=source.indexOf('\n});',start);
    assert.ok(end>start,'Missing handler closure '+anchor);
    vm.runInContext(transformSync(source.slice(start,end+4),{loader:'ts',format:'cjs'}).code,ctx);
  }
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base='http://127.0.0.1:'+server.address().port;
  return {
    ctx,calls,
    request:async(url,method='POST',body={})=>{
      const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      return {status:r.status,body:await r.json()};
    },
    close:()=>new Promise(resolve=>server.close(resolve))
  };
}
const report={id:'existing',status:'pending',reason:'synthetic'};
test('POST fails closed on unavailable or rejected SQL without local mutation',async()=>{
  for(const options of [{dbActive:false},{dbResult:false}]) {
    const h=await harness(options);try {
      const r=await h.request('/api/reports','POST',{reason:'synthetic'});
      assert.equal(r.status,503);
      assert.equal(r.body.success,false);
      assert.equal(h.ctx.reportsCache.length,0);
      assert.equal(h.calls.files,0);
    }finally{await h.close();}
  }
});
test('PATCH does not mutate cached report when SQL rejects or request is invalid',async()=>{
  const h=await harness({dbResult:false,existing:[report]});try {
    const fail=await h.request('/api/reports/existing','PATCH',{status:'resolved'});
    assert.equal(fail.status,503);
    assert.equal(h.ctx.reportsCache[0].status,'pending');
    assert.equal(h.calls.files,0);
    const invalid=await h.request('/api/reports/existing','PATCH',{status:'unrecognized'});
    assert.equal(invalid.status,400);
    assert.equal(h.calls.saves,1);
  }finally{await h.close();}
});
test('DELETE does not mutate cache when SQL fails and reports success only on ack',async()=>{
  for(const dbResult of [false,true]) {
    const h=await harness({dbResult,existing:[report]});try {
      const r=await h.request('/api/reports/existing','DELETE');
      assert.equal(r.status,dbResult?200:503);
      assert.equal(r.body.success,dbResult);
      assert.equal(h.ctx.reportsCache.length,dbResult?0:1);
      assert.equal(h.calls.files,dbResult?1:0);
    }finally{await h.close();}
  }
});
test('Successful POST/PATCH confirm SQL before updating cache',async()=>{
  const h=await harness({existing:[report]});try {
    const p=await h.request('/api/reports','POST',{reason:'synthetic'});
    assert.equal(p.status,200);
    assert.equal(p.body.success,true);
    assert.equal(h.calls.saves,1);
    assert.equal(h.ctx.reportsCache.length,2);
    const update=await h.request('/api/reports/existing','PATCH',{status:'dismissed'});
    assert.equal(update.status,200);
    assert.equal(update.body.report.status,'dismissed');
    assert.equal(h.ctx.reportsCache.find(r=>r.id==='existing').status,'dismissed');
  }finally{await h.close();}
});
