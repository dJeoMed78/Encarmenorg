import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {transformSync, build} from 'esbuild';
import express from 'express';
import {JSDOM} from 'jsdom';
import React, {act} from 'react';
const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
function execute(source, globals={}) {
 const module={exports:{}};
 const code=transformSync(source,{loader:'ts',format:'cjs',target:'node22'}).code;
 vm.runInNewContext(code,{module,exports:module.exports,require,console,...globals});
 return module.exports;
}
const contacts=execute(read('src/utils/businessContacts.ts'));
const db=read('src/db/mariadb.ts');
const dbFragment=db.slice(db.indexOf('export async function dbLoadAllBusinesses'),db.indexOf('// Ultra-lightweight query')) + db.slice(db.indexOf('export async function dbSaveBusiness('),db.indexOf('export async function dbSaveDismissedCandidate'));
function repository(rows=[]) {
 const state={rows:structuredClone(rows), fail:false, queries:[], writeAllowed:true};
 const pool={query:async (sql, params=[])=>{
  state.queries.push({sql,params});
  if(state.fail) throw new Error('simulated database outage');
  if(sql.startsWith('SELECT * FROM businesses')) return [structuredClone(state.rows)];
  assert.ok(sql.includes("phone = IF(?, '', IF(?, COALESCE(NULLIF(TRIM(VALUES(phone)), ''), phone), phone))"));
  assert.ok(sql.includes("whatsapp = IF(?, '', IF(?, COALESCE(NULLIF(TRIM(VALUES(whatsapp)), ''), whatsapp), whatsapp))"));
  assert.equal(params.length,25);
  const existing=state.rows.find(row=>String(row.id)===params[0]);
  const row=existing || {id:params[0]};
  row.name=params[1]; row.raw_data=params[20];
  row.phone=params[21] ? '' : (params[22] ? String(params[7] || '').trim() || row.phone || '' : existing ? row.phone : params[7] || '');
  row.whatsapp=params[23] ? '' : (params[24] ? String(params[8] || '').trim() || row.whatsapp || '' : existing ? row.whatsapp : params[8] || '');
  if(!existing)state.rows.push(row);
  return [{affectedRows:1}];
 }};
 const api=execute(dbFragment,{pool,guardWrite:()=>state.writeAllowed});
 return {...api,state};
}
const fixture={id:1081,name:'Negocio sintético F008',phone:'1112223344',whatsapp:'5556667788',raw_data:JSON.stringify({phone:'9998887766',whatsapp:'9998887766',slug:'f008-fixture',categories:['Servicios']})};

test('MX contacts: independent fields, international and legacy prefix; invalid values absent',()=>{
 for(const value of ['1112223344','+52 (111) 222-3344','5211112223344'])assert.equal(contacts.contactDigits(value),'1112223344');
 for(const value of [null,'','1234','999999999999999','correo@example.test','https://evil.test/1112223344'])assert.equal(contacts.contactDigits(value),'');
 assert.equal(contacts.matchesContactFilter({phone:fixture.phone},'no-whatsapp'),true);
 assert.equal(contacts.matchesContactFilter({whatsapp:fixture.whatsapp},'no-phone'),true);
});

test('MariaDB serialization uses columns rather than stale raw_data; empty never resurrected',async()=>{
 const repo=repository([fixture]); let rows=await repo.dbLoadAllBusinesses(true);
 assert.equal(rows[0].phone,fixture.phone); assert.equal(rows[0].whatsapp,fixture.whatsapp);
 repo.state.rows[0].phone='';repo.state.rows[0].whatsapp=null;
 rows=await repo.dbLoadAllBusinesses(true);assert.equal(rows[0].phone,'');assert.equal(rows[0].whatsapp,'');
 repo.state.fail=true;await assert.rejects(repo.dbLoadAllBusinesses(true),/UNAVAILABLE/);
});

test('upsert preserves omitted/null/empty/whitespace contacts, supports independent replacement and explicit removal',async()=>{
 const repo=repository([fixture]);
 for(const patch of [{},{phone:'',whatsapp:''},{phone:null,whatsapp:null},{phone:'  ',whatsapp:'\t'}]){
  assert.equal(await repo.dbSaveBusiness({id:1081,name:fixture.name,...patch}),true);
  assert.equal(repo.state.rows[0].phone,fixture.phone);assert.equal(repo.state.rows[0].whatsapp,fixture.whatsapp);
 }
 await repo.dbSaveBusiness({id:1081,name:fixture.name,phone:'9998887766',whatsapp:'9998887766'});
 assert.equal(repo.state.rows[0].phone,fixture.phone);assert.equal(repo.state.rows[0].whatsapp,fixture.whatsapp);
 await repo.dbSaveBusiness({id:1081,name:fixture.name,phone:'2223334455'},{updateContacts:true});
 assert.equal(repo.state.rows[0].phone,'2223334455');assert.equal(repo.state.rows[0].whatsapp,fixture.whatsapp);
 await repo.dbSaveBusiness({id:1081,name:fixture.name},{clearContacts:['phone']});
 const readback=(await repo.dbLoadAllBusinesses(true))[0];assert.equal(readback.phone,'');assert.equal(readback.whatsapp,fixture.whatsapp);
 repo.state.writeAllowed=false;assert.equal(await repo.dbSaveBusiness({id:1081,phone:'1112223344'}),false);
 repo.state.writeAllowed=true;repo.state.fail=true;assert.equal(await repo.dbSaveBusiness({id:1081}),false);
});

test('contact deletion intent rejects invalid, unauthenticated and conflicting requests',()=>{
 assert.equal(Object.keys(contacts.prepareContactPatch({phone:'',whatsapp:null},false).patch).length,0);
 assert.throws(()=>contacts.prepareContactPatch({clearContacts:['phone']},false),error=>error.status===403);
 assert.throws(()=>contacts.prepareContactPatch({clearContacts:['email']},true),error=>error.status===400);
 assert.throws(()=>contacts.prepareContactPatch({clearContacts:['phone'],phone:fixture.phone},true),error=>error.status===400);
 assert.throws(()=>contacts.prepareContactPatch({phone:'123'},false),error=>error.status===400);
 assert.equal(contacts.prepareContactPatch({clearContacts:['phone']},true).patch.phone,'');
});

test('startup/restart does not seed businesses after failed or legitimately empty reads', async()=>{
 const source=read('server.ts');
 const block=source.slice(source.indexOf('    // 1. Businesses:'), source.indexOf('    // 2. Reports'));
 for(const mode of ['failure','empty','restored']){
  let writes=0;
  const loaded=execute(`export async function boot(){let businessesCache=[{id:1081,phone:'outdated'}]; ${block} return businessesCache;}`,{
   dbLoadAllBusinesses:async(strict)=>{assert.equal(strict,true);if(mode==='failure')throw new Error('isolated read failure');return mode==='empty'?[]:[fixture];},
   dbSaveBusiness:()=>{writes++;throw new Error('Startup business writes forbidden');}
  });
  const result=await loaded.boot();assert.equal(writes,0);assert.equal(result.length,mode==='restored'?1:0);
  if(mode==='restored')assert.equal(result[0].phone,fixture.phone);
 }
});

async function routeHarness(repo) {
 const source=read('server.ts');
 const app=express(); app.use(express.json());
 const refresh=source.slice(source.indexOf('let lastDbPollTime = 0;'),source.indexOf('// ==========================================\n// BASE DE DATOS Y GESTIÓN DE CALIFICACIONES'));
 const get=source.slice(source.indexOf("app.get('/api/businesses',"),source.indexOf('// Endpoint to purge cache on demand'));
 const patch=source.slice(source.indexOf('const privilegedAdminSessions = new Map'),source.indexOf('// Force sync a single business'));
 const containment=source.slice(source.indexOf('// WordPress is retired.'),source.indexOf('// Download SQL dump'));
 const state={active:true,cache:[]};
 const module=execute(`${refresh}\n${get}\n${patch}\n${containment}\nexport function session(token:string, expires:number){privilegedAdminSessions.set(token,expires);}`,{
  app, ...contacts, ...repo,
  isMariaDbActive:()=>state.active,
  dbGetBusinessesSignature:async()=>({lastUpdate:'unchanged',total:repo.state.rows.length}),
  businessesCache:state.cache,
  generateCategorySlugs:()=>['servicios'],getWpAuthHeader:()=>null,
  fs:{writeFileSync:()=>{}},path:{resolve:()=>'/synthetic-seed-never-written'},__dirname:'/synthetic'
 });
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base=`http://127.0.0.1:${server.address().port}`;
 const request=async (url,body,token,method)=>{
  const response=await fetch(base+url,body===undefined?{}:{method:method || 'PATCH',headers:{'Content-Type':'application/json',...(token?{'X-Encarmen-Admin-Token':token}:{})},body:JSON.stringify(body)});
  return {status:response.status,cache:response.headers.get('cache-control'),body:await response.json()};
 };
 return {request,state,session:module.session,close:()=>new Promise(resolve=>server.close(resolve))};
}

test('real Express GET/PATCH handlers with mocked DB: fresh reads despite unchanged signature; failures and authorization',async()=>{
 const repo=repository([fixture]);const api=await routeHarness(repo);
 try {
  let result=await api.request('/api/businesses/1081');assert.equal(result.status,200);assert.equal(result.body.business.phone,fixture.phone);assert.match(result.cache,/no-store/);
  repo.state.rows[0].phone='2223334455';
  result=await api.request('/api/businesses');assert.equal(result.body.businesses[0].phone,'2223334455');
  result=await api.request('/api/businesses?q=sint%C3%A9tico&contacts=phone&offset=0&limit=1');assert.equal(result.status,200);assert.equal(result.body.total,1);assert.equal(result.body.contactCounts.phone,1);assert.equal(result.body.count,1);assert.equal(result.body.source,'mariadb');
  result=await api.request('/api/businesses?contacts=none');assert.equal(result.body.total,0);assert.equal(result.body.contactCounts.all,1);
  for(const query of ['contacts=unknown','limit=0','offset=-1','limit=999']){result=await api.request('/api/businesses?'+query);assert.equal(result.status,400);}
  for(const patch of [{name:'Cambio mínimo'},{phone:'',whatsapp:null}]){
   result=await api.request('/api/businesses/1081',patch);assert.equal(result.status,200);assert.equal(result.body.business.phone,'2223334455');
  }
  result=await api.request('/api/businesses/1081',{clearContacts:['phone']});assert.equal(result.status,403);
  api.session('expired-test-session',Date.now()-1000);
  result=await api.request('/api/businesses/1081',{clearContacts:['phone']},'expired-test-session');assert.equal(result.status,403);
  result=await api.request('/api/businesses/1081',{clearContacts:['phone']},'invented-test-session');assert.equal(result.status,403);
  api.session('valid-test-session',Date.now()+60000);
  result=await api.request('/api/businesses/1081',{clearContacts:['phone']},'valid-test-session');assert.equal(result.status,200);assert.equal(result.body.business.phone,'');assert.equal(result.body.business.whatsapp,fixture.whatsapp);
  result=await api.request('/api/businesses/1081',{phone:'123'});assert.equal(result.status,400);
  result=await api.request('/api/businesses/99999');assert.equal(result.status,404);
  repo.state.fail=true;result=await api.request('/api/businesses');assert.equal(result.status,503);assert.equal(result.body.businesses,undefined);
  repo.state.fail=false;
  for(const route of ['/api/sync','/api/webhook/woocommerce','/api/businesses/1081/sync-wp','/api/mariadb/sync-catalog']) {
   const count=repo.state.queries.length;result=await api.request(route,{},undefined,'POST');assert.equal(result.status,410);assert.equal(repo.state.queries.length,count);
  }
  const restarted=repository(repo.state.rows);const restored=(await restarted.dbLoadAllBusinesses())[0];assert.equal(restored.phone,'');assert.equal(restored.whatsapp,fixture.whatsapp);
  repo.state.rows=[];result=await api.request('/api/businesses');assert.equal(result.status,200);assert.equal(result.body.total,0);
  api.state.active=false;result=await api.request('/api/businesses/1081');assert.equal(result.status,503);
 } finally {await api.close();}
});

async function loadComponent(file, plugins=[]) {
 const result=await build({entryPoints:[new URL(file,root).pathname],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'},jsx:'automatic',plugins});
 const module={exports:{}};
 vm.runInThisContext(`(function(require,module,exports,setTimeout,setInterval){${result.outputFiles[0].text}\n})`)(require,module,module.exports,()=>0,()=>0);
 return module.exports;
}

test('real rendered cards, Glass contact links and admin filters/pagination use synthetic data only',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="test"></div></body></html>',{url:'https://encarmen.test'});
 const saved={};for(const key of ['window','document','navigator','HTMLElement','localStorage','sessionStorage','Event','MouseEvent']){saved[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:dom.window[key]});}
 const nativeFetch=globalThis.fetch; const calls=[];
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 globalThis.fetch=async(url,options={})=>{calls.push({url:String(url),method:options.method || 'GET'});return new Response(JSON.stringify(String(url).includes('edit-pins')?{success:true,pins:{}}:{success:true,businessId:1081,stats:{average:0,count:0},average:0,count:0}),{status:200});};
 const {createRoot}=await import('react-dom/client');
 const container=document.getElementById('test');const reactRoot=createRoot(container);
 const base={...fixture,description:'Datos sintéticos',category:'Servicios',categories:['Servicios'],gallery:[],colonia:'Centro',image:'',rating:0,reviewCount:0};
 try {
  const {BusinessCard}=await loadComponent('src/components/BusinessCard.tsx');
  const opened=[];window.open=(...args)=>opened.push(args);
  await act(async()=>reactRoot.render(React.createElement(BusinessCard,{business:base,onClick:()=>{}})));
  const buttons=[...container.querySelectorAll('button')];
  const wa=buttons.find(b=>/WhatsApp/.test(b.textContent));const call=buttons.find(b=>/Llamar/.test(b.textContent));
  assert.ok(wa);assert.ok(call);await act(async()=>{wa.click();call.click();});
  assert.match(opened[0][0],/^https:\/\/wa.me\/525556667788\?/);assert.equal(opened[1][0],'tel:+521112223344');
  await act(async()=>reactRoot.render(React.createElement(BusinessCard,{business:{...base,whatsapp:''},onClick:()=>{}})));
  assert.ok([...container.querySelectorAll('button')].find(b=>/WhatsApp/.test(b.textContent)).disabled);
  const {BusinessPublicDetail}=await loadComponent('src/components/BusinessPublicDetail.tsx');
  await act(async()=>reactRoot.render(React.createElement(BusinessPublicDetail,{business:base,onBack:()=>{}})));
  assert.ok(container.querySelector('a[href="tel:+521112223344"]'));
  assert.ok(container.querySelector('a[href^="https://wa.me/525556667788"]'));
  const {AdminBusinessesTab}=await loadComponent('src/components/AdminBusinessesTab.tsx');
  const businesses=Array.from({length:60},(_,i)=>({...base,id:990000+i,name:`Sintético ${i}`,phone:i%2===0?base.phone:'',whatsapp:i%3===0?base.whatsapp:''}));
  await act(async()=>reactRoot.render(React.createElement(AdminBusinessesTab,{businesses})));
  const counts=contacts.contactCounts(businesses);assert.equal(counts.all,60);assert.equal(counts.phone,30);assert.equal(counts.whatsapp,20);assert.equal(counts.none,20);
  const select=container.querySelector('[aria-label="Filtrar contactos"]');assert.ok(select);assert.match(select.options[0].textContent,/60/);
  assert.equal([...container.querySelectorAll('h4')].length,24);
  for(const key of contacts.CONTACT_FILTERS){await act(async()=>{select.value=key;select.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(container.querySelectorAll('h4').length,Math.min(24,counts[key]));}
  await act(async()=>{select.value='all';select.dispatchEvent(new Event('change',{bubbles:true}));});
  await act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent==='Siguiente').click());
  assert.match(container.querySelector('[aria-label="Paginación de negocios"]').textContent,/Página 2 de 3/);
  const input=container.querySelector('input[placeholder^="Buscar por nombre"]');
  await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'Sintético 59');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(container.querySelectorAll('h4').length,1);
  assert.match(container.querySelector('[aria-label="Paginación de negocios"]').textContent,/Página 1 de 1/);
  assert.match(select.options[0].textContent,/\(1\)/);
  // Counts/filtering use the full input collection, never the page slice.
  assert.match(read('src/components/AdminBusinessesTab.tsx'),/contactCounts\(filteredBusinesses\)/);
  assert.ok(calls.every(c=>c.url.startsWith('/api/')));assert.ok(calls.every(c=>c.method==='GET'));
 } finally {await act(async()=>reactRoot.unmount());globalThis.fetch=nativeFetch;for(const key in saved){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];}dom.window.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('API client refuses seed fallback and false success on an HTTP failure',async()=>{
 const api=await loadComponent('src/services/api.ts');
 const savedFetch=globalThis.fetch;const savedSession=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:()=>null};
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,message:'Synthetic inconsistent server'}),{status:503});
 try {
  await assert.rejects(api.fetchBusinesses({}),/503/);
  assert.equal((await api.adminUpdateBusiness(1081,{name:'Cambio sintético'})).success,false);
 } finally {globalThis.fetch=savedFetch;if(savedSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=savedSession;}
});

test('App shows source error without seed contacts, retries and refreshes an open business from fresh API data',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="test"></div></body></html>',{url:'https://encarmen.test/'});
 const saved={};for(const key of ['window','document','navigator','HTMLElement','localStorage','sessionStorage','Event','MouseEvent','Image']){saved[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:dom.window[key]});}
 const savedFetch=globalThis.fetch;let available=false;let current={...fixture,description:'Prueba sintética',category:'Servicios',categories:['Servicios'],categorySlugs:['servicios'],gallery:[],colonia:'Centro',image:'',slug:'fixture-1081'};
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.scrollTo=()=>{};
 globalThis.fetch=async(url)=>{
  const path=String(url);
  if(path==='/api/businesses')return new Response(JSON.stringify(available?{total:1,businesses:[current]}:{success:false}),{status:available?200:503});
  if(path.includes('/ratings'))return new Response(JSON.stringify({success:true,ratings:{},stats:{average:0,count:0}}));
  if(path.includes('/promotions'))return new Response(JSON.stringify({promotions:[]}));
  return new Response('{}');
 };
 const {createRoot}=await import('react-dom/client');const container=document.getElementById('test');const reactRoot=createRoot(container);
 try {
  const {default:App}=await loadComponent('src/App.tsx');
  await act(async()=>reactRoot.render(React.createElement(App)));
  assert.match(container.textContent,/No se pudieron consultar los negocios vigentes/);
  assert.equal(container.querySelectorAll('h3[title="Negocio sintético F008"]').length,0);
  available=true;
  await act(async()=>container.querySelector('button[aria-label="Reintentar carga de negocios"]').click());
  const card=[...container.querySelectorAll('h3[title]')].find(el=>el.title.toLocaleLowerCase('es')===fixture.name.toLocaleLowerCase('es'));assert.ok(card, JSON.stringify({titles:[...container.querySelectorAll('h3[title]')].map(el=>el.title),statuses:[...container.querySelectorAll('[role=status]')].map(el=>el.textContent),fixtureVisible:container.textContent.includes('F008')}));
  await act(async()=>card.click());
  assert.ok(container.querySelector('a[href="tel:+521112223344"]'));
  current={...current,phone:'2223334455'};
  await act(async()=>window.dispatchEvent(new Event('focus')));
  assert.ok(container.querySelector('a[href="tel:+522223334455"]'));
  assert.equal(container.querySelector('a[href="tel:+521112223344"]'),null);
 } finally {await act(async()=>reactRoot.unmount());globalThis.fetch=savedFetch;for(const key in saved){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];}dom.window.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

export {execute, read, repository, contacts, fixture, routeHarness, loadComponent};
