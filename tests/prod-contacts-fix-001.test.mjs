import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {transformSync, buildSync} from 'esbuild';
import express from 'express';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';

// Never import server.ts or the database module: only isolated definitions.
const root = fileURLToPath(new URL('../', import.meta.url));
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const executable = process.env.ENC_PROD_EXECUTABLE;
const server = read(executable || 'server.ts');
const db = read(executable || 'src/db/mariadb.ts');
const require = createRequire(path.join(root,'package.json'));
const quiet = {log(){},info(){},warn(){},error(){}};
function definition(source,name) {
 const start = source.search(new RegExp('(?:export )?(?:async )?function '+name+'\\('));
 assert.ok(start >= 0,name);
 const end=source.indexOf('\n}\n',start)+2;
 assert.ok(end>start,name);
 return source.slice(start,end).replace(/^export /,'');
}
function evaluate(source,extra={}) {
 const context=vm.createContext({console:quiet,require,module:{exports:{}},exports:{},...extra});
 vm.runInContext(transformSync(source,{loader:'ts',target:'node22',format:'cjs'}).code,context);
 return context;
}
const helper=evaluate(read('src/utils/businessContacts.ts').replace(/export /g,''));
const funcs=['contactDigits','prepareContactUpdate','contactsMatchReadback'];
const helpers=Object.fromEntries(funcs.map(k=>[k,helper[k]]));
const row=()=>({id:1081,name:'Synthetic business',phone:'5550000001',whatsapp:'5550000002',raw_data:JSON.stringify({phone:'5559999991',whatsapp:'5559999992'})});
function repository(rows=[row()]) {
 const calls=[];
 const state={rows:structuredClone(rows),fail:false,afterWrite:null};
 const pool={async query(sql,params=[]) {
  calls.push({sql,params}); if(state.fail)throw Error('PRIVATE_CONNECTION_DETAIL');
  if(sql.startsWith('SELECT *'))return [structuredClone(state.rows)];
  if(sql.includes('INSERT INTO businesses')) {
  state.beforeWrite?.();
  const existing=state.rows.find(r=>String(r.id)===String(params[0]));
   if(existing && !sql.includes('ON DUPLICATE'))throw Error('duplicate');
   if(existing) {
    if(params[21] && String(existing.phone??'')===params[22] && params[7].trim())existing.phone=params[7];
    if(params[23] && String(existing.whatsapp??'')===params[24] && params[8].trim())existing.whatsapp=params[8];
    existing.name=params[1];existing.raw_data=params[20];
   }else state.rows.push({id:params[0],name:params[1],phone:params[7],whatsapp:params[8],raw_data:params[20]});
   state.afterWrite?.(); return [{affectedRows:1}];
  }
  throw Error('UNEXPECTED_SQL');
 }};
 const ctx=evaluate(definition(db,'dbLoadAllBusinesses')+'\n'+definition(db,'dbSaveBusiness'),{pool,isConnected:true,...helpers});
 return {state,calls,ctx,load:()=>ctx.dbLoadAllBusinesses(),save:(b,o)=>ctx.dbSaveBusiness(b,o)};
}
function route(method,needle) {
 if(executable) needle=needle.replaceAll("'", '"');
 const start=server.indexOf('app.'+method+'('+needle);assert.ok(start>=0,needle);
 return server.slice(start,server.indexOf('\n});',start)+4);
}
async function harness(run,repo=repository()) {
 const app=express();app.use(express.json());
 const sources=[definition(server,'refreshBusinessesFromDbIfNeeded'),definition(server,'findDuplicateBusiness'),
  route('get',"'/api/businesses',"),route('get',"'/api/businesses/:id',"),route('patch',"['/api/businesses/:id'"),route('post',"'/api/submit-business'"),
  ...['/api/mariadb/sync-catalog','/api/sync','/api/webhook/woocommerce','/api/businesses/:id/sync-wp'].map(p=>route('post',JSON.stringify(p).replaceAll('"',"'")+','))];
 const context=evaluate(sources.join('\n'),{app,...helpers,dbLoadAllBusinesses:repo.load,dbSaveBusiness:repo.save,isMariaDbActive:()=>true,businessesCache:[{id:1081,name:'stale',phone:'',whatsapp:''}],generateCategorySlugs:()=>[],getWpAuthHeader:()=>null});
 const listener=app.listen(0,'127.0.0.1');await new Promise(r=>listener.once('listening',r));
 const request=async(p,method='GET',body)=>{const r=await fetch('http://127.0.0.1:'+listener.address().port+p,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const text=await r.text();return {status:r.status,headers:r.headers,text,json:text?JSON.parse(text):null};};
 try{await run(request,repo,context);}finally{await new Promise(r=>listener.close(r));}
}

test('SQL columns beat contradictory raw_data; null/array/bad JSON cannot break the catalog',async()=>{
 for(const raw of [row().raw_data,'null','[]','{broken']){const r=repository([{...row(),raw_data:raw}]);const [b]=await r.load();assert.equal(b.phone,'5550000001');assert.equal(b.whatsapp,'5550000002');}
 const [b]=await repository([{...row(),phone:null,whatsapp:''}]).load();assert.equal(b.phone,'');assert.equal(b.whatsapp,'');
});
test('Disconnected and failed reads reject; empty table is a legitimate empty catalog',async()=>{
 const r=repository();r.ctx.pool=null;await assert.rejects(r.load,/BUSINESSES_SOURCE_UNAVAILABLE/);
 const bad=repository();bad.state.fail=true;await assert.rejects(bad.load,/BUSINESSES_SOURCE_UNAVAILABLE/);
 assert.equal((await repository([]).load()).length,0);
});
test('Generic upserts preserve both restored columns even with stale nonempty, null or omitted contacts',async()=>{
 for(const incoming of [{},{phone:'',whatsapp:''},{phone:null,whatsapp:null},{phone:'5559999991',whatsapp:'5559999992'}]){
  const r=repository();assert.equal(await r.save({id:1081,name:'edit',...incoming}),true);
  assert.equal(r.state.rows[0].phone,'5550000001');assert.equal(r.state.rows[0].whatsapp,'5550000002');
  const c=r.calls[0];assert.equal((c.sql.match(/\?/g)||[]).length,c.params.length);assert.match(c.sql,/COALESCE\(phone, ''\) <=> \?/);
 }
});
test('Compare-and-set rejects a race; insert-only cannot overwrite a duplicate ID',async()=>{
 const r=repository();await r.save({id:1081,phone:'5550000003'},{expectedContacts:{phone:'old'}});assert.equal(r.state.rows[0].phone,'5550000001');
 assert.equal(await r.save({id:1081,phone:'5550000003'},{createOnly:true}),false);assert.equal(r.state.rows[0].phone,'5550000001');
 await r.save({id:1081,phone:'5550000003'},{expectedContacts:{phone:'5550000001'}});assert.equal(r.state.rows[0].phone,'5550000003');assert.equal(r.state.rows[0].whatsapp,'5550000002');
 const n=repository([{...row(),phone:null}]);await n.save({id:1081,phone:'5550000003'},{expectedContacts:{phone:''}});assert.equal(n.state.rows[0].phone,'5550000003');
});
test('HTTP list and detail use fresh MariaDB reads, include source and support HEAD',async()=>harness(async(request,r)=>{
 for(const p of ['/api/businesses','/api/businesses/1081']){const x=await request(p);assert.equal(x.status,200);assert.equal(x.headers.get('X-Encarmen-Business-Source'),'mariadb');assert.match(x.headers.get('Cache-Control'),/no-store/);}
 r.state.rows[0].phone='5550000009';const x=await request('/api/businesses/1081');assert.equal(x.json.business.phone,'5550000009');assert.equal(r.calls.some(c=>c.sql.includes('MAX(updated_at)')),false);
 const h=await request('/api/businesses/1081','HEAD');assert.equal(h.status,200);assert.equal(h.text,'');
}));
test('HTTP source failures return generic 503 instead of stale seed; empty database returns []',async()=>{
 await harness(async(request,r)=>{r.state.fail=true;for(const p of ['/api/businesses','/api/businesses/1081']){const x=await request(p);assert.equal(x.status,503);assert.equal(x.headers.get('X-Encarmen-Business-Source'),'unavailable');assert.doesNotMatch(x.text,/PRIVATE|stale|\/workspace|password/i);}});
 await harness(async request=>{const x=await request('/api/businesses');assert.equal(x.status,200);assert.equal(x.json.businesses.length,0);},repository([]));
});
test('PATCH preserves restored contacts on unrelated/empty updates and rejects stale clients',async()=>harness(async(request,r)=>{
 for(const body of [{description:'edit'},{phone:'',whatsapp:null},{phone:'   '}]){const x=await request('/api/businesses/1081','PATCH',body);assert.equal(x.status,200);assert.equal(x.json.business.phone,'5550000001');assert.equal(x.json.business.whatsapp,'5550000002');}
 const writes=r.calls.filter(c=>c.sql.includes('INSERT')).length;
 for(const body of [{phone:'5559999991'},{phone:'5550000003',expectedContacts:{phone:'stale'}},{phone:[]},{clearContacts:['phone']}]){const x=await request('/api/businesses/1081','PATCH',body);assert.ok([400,409].includes(x.status));}
 assert.equal(r.calls.filter(c=>c.sql.includes('INSERT')).length,writes);
 const x=await request('/api/businesses/1081','PATCH',{phone:'5550000003',expectedContacts:{phone:'5550000001'}});assert.equal(x.status,200);assert.equal(x.json.business.phone,'5550000003');assert.equal(x.json.business.whatsapp,'5550000002');
}));
test('Lost readback never claims success and reports possible write',async()=>harness(async(request,r)=>{
 r.state.afterWrite=()=>{r.state.fail=true;};const x=await request('/api/businesses/1081','PATCH',{description:'change'});assert.equal(x.status,503);assert.equal(x.json.success,false);assert.equal(x.json.writeMayHaveSucceeded,true);assert.doesNotMatch(x.text,/PRIVATE/);
}));
test('A restore between PATCH read and write is preserved and reported as conflict',async()=>harness(async(request,r)=>{
 r.state.beforeWrite=()=>{r.state.rows[0].phone='5550000099';};
 const x=await request('/api/businesses/1081','PATCH',{phone:'5550000003',expectedContacts:{phone:'5550000001'}});
 assert.equal(x.status,409);assert.equal(x.json.success,false);assert.equal(r.state.rows[0].phone,'5550000099');
}));
test('Registration confirms separate channels; unavailable DB never reports local success',async()=>{
 await harness(async(request,r)=>{const x=await request('/api/submit-business','POST',{name:'Synthetic new',phone:'5550000010',whatsapp:''});assert.equal(x.status,201);assert.equal(x.json.business.phone,'5550000010');assert.equal(x.json.business.whatsapp,'');assert.equal(r.state.rows.length,2);});
 await harness(async(request,r)=>{r.state.fail=true;const x=await request('/api/submit-business','POST',{name:'new',phone:'5550000010'});assert.equal(x.status,503);assert.equal(x.json.success,false);});
});
test('Legacy sync endpoints return 410 with zero database calls; startup never imports businesses',async()=>harness(async(request,r)=>{
 for(const p of ['/api/mariadb/sync-catalog','/api/sync','/api/webhook/woocommerce','/api/businesses/1081/sync-wp'])assert.equal((await request(p,'POST',{})).status,410);
 assert.equal(r.calls.length,0);assert.doesNotMatch(server,/syncAllWooCommerceProducts/);assert.match(server,/(const|var) IS_WP_SYNC_ENABLED = false/);
 const original=read('server.ts');
 const startup=original.slice(original.indexOf('// Businesses are read-only at startup.'),original.indexOf('// 2. Reports'));
 assert.doesNotMatch(startup,/dbSaveBusiness|writeFile/);assert.match(startup,/dbLoadAllBusinesses/);
}));
test('Contact type validation and independent MX normalization',()=>{
 for(const bad of [[],{},true,NaN,'abc',''])assert.equal(helpers.contactDigits(bad),'');
 assert.equal(helpers.contactDigits('+52 555 000 0001'),'5550000001');assert.equal(helpers.contactDigits('5215550000001'),'5550000001');
});
test('Public card renders legitimate actions disabled when contacts absent; no foreign fallback',()=>{
 const result=buildSync({entryPoints:[path.join(root,'src/components/BusinessCard.tsx')],bundle:true,platform:'node',format:'cjs',packages:'external',write:false});
 const context=evaluate(result.outputFiles[0].text);const Card=context.module.exports.BusinessCard;
 const html=renderToStaticMarkup(React.createElement(Card,{business:{id:1081,name:'Synthetic',phone:'',whatsapp:'',categories:[],rating:0},onClick(){},onToggleFavorite(){}}));
 assert.ok((html.match(/disabled=""/g)||[]).length>=2);
 for(const p of ['src/components/BusinessDetailModal.tsx','src/components/DirectBusinessView.tsx'])assert.doesNotMatch(read(p),/business\.whatsapp \|\| business\.phone/);
});
test('API clients fail closed on 403/503 and false success; no registration localStorage fallback',async()=>{
 const source=read('src/services/api.ts');
 const fn=definition(source,'fetchBusinesses');
 const c=evaluate(fn,{API_BASE:'/api',URLSearchParams,fetch:async()=>({ok:false,status:403})});await assert.rejects(()=>c.fetchBusinesses({}),/MariaDB/);
 const reg=definition(source,'submitBusinessRegistration');const bad=evaluate(reg,{API_BASE:'/api',fetch:async()=>({ok:false,status:503,json:async()=>({})})});assert.equal((await bad.submitBusinessRegistration({name:'x'})).success,false);
 assert.doesNotMatch(reg,/localStorage/);
 const a=read('src/App.tsx');assert.match(a,/useState<Business\[\]>\(\[\]\)/);assert.doesNotMatch(a,/Guardado localmente/);assert.match(a,/businessRequestVersion\.current \+= 1/);assert.match(a,/role="alert"/);
});
test('Compiled executables contain the same corrected contract',()=>{
 if(!fs.existsSync(path.join(root,'server.js')))return;
 for(const p of ['server.js','api/server.bundle.js']){const text=read(p);assert.match(text,/X-Encarmen-Business-Source/);assert.match(text,/CONTACT_CONFLICT/);assert.match(text,/expectedContacts/);assert.doesNotMatch(text,/syncAllWooCommerceProducts/);}
 assert.equal(read('server.js'),read('api/server.bundle.js'));
});

test('Real App loading/save hooks reject errors and ignore a late catalog after confirmed save',async()=>{
 const appSource=read('src/App.tsx');
 const loading=appSource.slice(appSource.indexOf('  const [businessesList,'),appSource.indexOf('  // Landing data comes'));
 const saveStart=appSource.indexOf('  const handleSaveBusiness =');
 const save=appSource.slice(saveStart,appSource.indexOf('\n  };',saveStart)+6);
 const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let release;let requests=0;let fail=true;
 const fixture={id:1081,name:'Synthetic',phone:'5550000001',whatsapp:'5550000002'};
 const context=evaluate(`function Harness() {
 const [businessOverrides,setBusinessOverrides]=React.useState({});
 const [selectedBusiness,setSelectedBusiness]=React.useState(null);
 const [landingBusiness,setLandingBusiness]=React.useState(null);
 ${loading}
 ${save}
 capture={businessesList,businessesStatus,save:handleSaveBusiness,retry:()=>setBusinessesReload(n=>n+1)};
 return React.createElement('div',null,businessesStatus);
 }`,{React,useState:React.useState,useEffect:React.useEffect,useRef:React.useRef,window:dom.window,AbortController,getBusinessSlugFromUrl:()=>null,findBusinessInList:()=>null,
 fetch:async()=>{requests++;if(fail)throw Error('network');if(requests===2)return {ok:true,json:async()=>({businesses:[fixture]})};return new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({businesses:[{...fixture,phone:''}]})});});},
 adminUpdateBusiness:async()=>({success:true,business:{...fixture,phone:'5550000003'}}),capture:null});
 const rootElement=createRoot(dom.window.document.getElementById('root'));
 try {
  await React.act(async()=>rootElement.render(React.createElement(context.Harness)));
  assert.equal(context.capture.businessesStatus,'error');assert.equal(context.capture.businessesList.length,0);
  fail=false;await React.act(async()=>context.capture.retry());assert.equal(context.capture.businessesList[0].phone,'5550000001');
  await React.act(async()=>dom.window.dispatchEvent(new dom.window.Event('focus')));
  assert.equal(typeof release,'function');
  await React.act(async()=>context.capture.save(1081,{phone:'5550000003'}));
  await React.act(async()=>release());
  assert.equal(context.capture.businessesList[0].phone,'5550000003');assert.equal(context.capture.businessesStatus,'ready');
 } finally {await React.act(async()=>rootElement.unmount());dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
