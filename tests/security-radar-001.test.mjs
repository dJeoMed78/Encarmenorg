// Actual Express middleware + actual server.ts guard/handlers; only persistence/AI adapters are synthetic.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import express from 'express';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {transformSync} from 'esbuild';
import {registerAdminSecurity,adminPermission} from '../src/server/adminSecurity.ts';import {administrativeWritesReady} from '../src/server/consolidatedWritePolicy.ts';
const source=fs.readFileSync(new URL('../server.ts',import.meta.url),'utf8');
async function harness({staging=false,readOnly=false,policy=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'enc-radar-owned-'));const events=[{id:'radar-search',title:'Reserved event',date:'2099-01-01'},{id:'ordinary',title:'Synthetic event',date:'2099-01-01'}],classifieds=events.map(e=>({...e,status:'active'}));
 for(const [file,data]of [['events_db.json',events],['classifieds_db.json',classifieds]])fs.writeFileSync(path.join(root,file),JSON.stringify(data));
 const calls={files:0,sql:0,prune:0};const app=express();let enabled=true;
 registerAdminSecurity(app,{provider:{accounts:[],authenticate:async username=>({username,permissions:username==='owner'?['event:manage','classified:manage','admin:manage']:['business:manage']})},allowedOrigin:'https://local.example',writesReady:req=>policy?administrativeWritesReady(req,{mutationsEnabled:true,isStaging:staging,businessWrites:true}):enabled});
 const context={app,isStagingEnvironment:()=>staging,isWritePermitted:()=>!readOnly,isBusinessWritePermitted:()=>false,eventsCache:structuredClone(events),classifiedsCache:structuredClone(classifieds),fs:{writeFileSync(...args){calls.files++;fs.writeFileSync(...args);}},path,__dirname:root,isMariaDbActive:()=>true,dbSaveEvent:async()=>calls.sql++,dbDeleteEvent:async()=>calls.sql++,dbSaveClassified:async()=>calls.sql++,dbDeleteClassified:async()=>calls.sql++,pruneExpiredEvents:async()=>{calls.prune++;throw Error('Public search attempted pruning');},dbLoadAllEvents:async()=>[],parseEventStartDate:()=>0,pruneExpiredClassifieds:()=>{throw Error('Public read attempted pruning');},scrapeRealWebClassifieds:async()=>[{title:'Synthetic result',sourceUrl:'https://example.invalid/synthetic'}],isSimilarClassified:()=>false,getGeminiClient:()=>null,CARMEN_RADAR_EVENT_POOL:[],isEventPast:(date)=>date==='2000-01-01',getEventRepresentativeImageServer:()=>'',isSimilarEvent:()=>false,console:{log(){},error(){},warn(){}},Request:undefined};
 vm.createContext(context);const run=code=>vm.runInContext(transformSync(code,{loader:'ts',format:'cjs'}).code,context);
 run(source.slice(source.indexOf('// Staging safety & write protection'),source.indexOf('// 1. REGLA GEOIP')));app.use(express.json());
 for(const anchor of ["app.put('/api/events/:id'","app.delete('/api/events/:id'","app.patch('/api/classifieds/:id'","app.delete('/api/classifieds/:id'","app.post('/api/events/radar-search'","app.post('/api/classifieds/radar-search'","app.get('/api/events'","app.get('/api/classifieds'"]){const a=source.indexOf(anchor);assert.ok(a>=0);run(source.slice(a,source.indexOf('\n});',a)+4));}
 app.post('/api/ratings/get',(_req,res)=>res.json({success:true}));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base='http://127.0.0.1:'+server.address().port;
 const request=async(route,method='GET',token,body={title:'Unauthorized change'},extra={})=>{const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{'X-Encarmen-Admin-Token':token}:{}),...extra},...(['GET','HEAD'].includes(method)?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json().catch(()=>null)};};
 const login=async username=>{const r=await request('/api/admin/login','POST',undefined,{username,password:'Synthetic-password-only'});assert.equal(r.status,200);return r.body.token;};
 return {context,calls,root,request,login,setEnabled:v=>enabled=v,snapshot:()=>JSON.stringify({events:context.eventsCache,classifieds:context.classifiedsCache,files:['events_db.json','classifieds_db.json'].map(f=>fs.readFileSync(path.join(root,f),'utf8')),calls}),close:()=>new Promise(resolve=>server.close(resolve))};
}
test('HTTP negative matrix: methods, paths, encoded reserved IDs and forged identities have zero effects',async()=>{
 const h=await harness();try{const limited=await h.login('limited');const before=h.snapshot();let requests=0;
 for(const prefix of ['/api/events','/api/classifieds'])for(const suffix of ['/radar-search','/radar-search/','/%72adar-search','/RADAR-SEARCH','/nested/radar-search'])for(const method of ['PUT','PATCH','DELETE'])for(const token of [undefined,'f'.repeat(64),limited]){const r=await h.request(prefix+suffix,method,token,{}, {'X-Admin-Role':'admin','X-Is-Admin':'true'});assert.ok([401,403,405].includes(r.status),`${method} ${prefix+suffix} -> ${r.status}`);assert.notEqual(r.body?.success,true);requests++;}
 assert.equal(requests,90);assert.equal(h.snapshot(),before);
 }finally{await h.close();}
});
test('HTTP authorized session still cannot mutate reserved IDs, including Express-decoded IDs',async()=>{
 const h=await harness();try{const token=await h.login('owner'),before=h.snapshot();for(const [prefix,method]of [['events','PUT'],['events','DELETE'],['classifieds','PATCH'],['classifieds','DELETE']])for(const id of ['radar-search','%72adar-search','RADAR-SEARCH','radar-search/','reset','publish-candidates','radar-scan','radar-status'])assert.equal((await h.request('/api/'+prefix+'/'+id,method,token)).status,405);assert.equal(h.snapshot(),before);}finally{await h.close();}
});
test('HTTP Staging and read-only reject mutation while exact POST search and GET remain functional',async()=>{
 for(const settings of [{staging:true},{readOnly:true},{staging:true,policy:true}]){const h=await harness(settings);try{const token=await h.login('owner'),before=h.snapshot();for(const method of ['PUT','PATCH','DELETE'])for(const route of ['/api/events/radar-search','/api/classifieds/radar-search','/api/events/ordinary','/api/ratings/get']){const r=await h.request(route,method,token);assert.ok([403,405,503].includes(r.status),JSON.stringify(r));}
 assert.equal((await h.request('/api/events/radar-search','POST',undefined,{query:'',useAi:false})).status,200);assert.equal((await h.request('/api/ratings/get','POST')).status,200);assert.equal((await h.request('/api/events')).status,200);assert.equal(h.snapshot(),before);
 }finally{await h.close();}}
});
test('HTTP legitimate mutation requires session, permission and write policy together; logout revokes',async()=>{
 const h=await harness();try{const token=await h.login('owner');assert.equal((await h.request('/api/events/ordinary','PUT',token,{title:'Authorized synthetic change'})).status,200);assert.equal(h.context.eventsCache.find(e=>e.id==='ordinary').title,'Authorized synthetic change');assert.equal(h.calls.files,1);assert.equal(h.calls.sql,1);
 h.setEnabled(false);const before=h.snapshot();assert.equal((await h.request('/api/events/ordinary','DELETE',token)).status,503);assert.equal(h.snapshot(),before);assert.equal((await h.request('/api/admin/logout','POST',token)).status,200);assert.equal((await h.request('/api/events/ordinary','PUT',token)).status,401);
 }finally{await h.close();}
});
test('exact read exceptions never authorize suffix-shaped routes or other methods',()=>{
 for(const type of ['events','classifieds']){assert.equal(adminPermission('/api/'+type+'/radar-search','POST'),null);for(const method of ['PUT','PATCH','DELETE'])assert.equal(adminPermission('/api/'+type+'/radar-search',method),type==='events'?'event:manage':'classified:manage');assert.ok(adminPermission('/api/'+type+'/id/radar-search','POST'));}
});

test('HTTP real classified search remains public outside Staging without persistent effects',async()=>{
 const h=await harness();try{const before=h.snapshot();const r=await h.request('/api/classifieds/radar-search','POST',undefined,{query:'synthetic',useAi:false});assert.equal(r.status,200);assert.equal(r.body.candidates.length,1);assert.equal((await h.request('/api/classifieds')).status,200);assert.equal((await h.request('/api/events')).status,200);assert.equal(h.snapshot(),before);}finally{await h.close();}
});
