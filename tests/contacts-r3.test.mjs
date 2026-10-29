import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React, {act} from 'react';
import {execute,read,repository,contacts,fixture,routeHarness,loadComponent} from './contacts-r2.test.mjs';

// Importing the R2 helpers executes its nine regression groups as part of this suite.
test('R3 configuration matrix and readonly connection never invoke schema initialization',async()=>{
 const source=read('src/db/mariadb.ts');
 const prefix=source.slice(source.indexOf('export interface MariaDbConfig'),source.indexOf('export function isMariaDbActive'));
 const security=await loadComponent('src/server/stagingBusinessSecurity.ts');
 const base={APP_ENV:'staging',NODE_ENV:'production',DB_NAME:'u293982346_encarmentest',DB_HOST:'synthetic.invalid',DB_USER:'synthetic_reader',DB_PASSWORD:'synthetic-placeholder',STAGING_READ_ONLY:'true'};
 const cases=[
  {env:{},valid:true,write:false,ddl:0},
  {env:{STAGING_ALLOW_SCHEMA_INIT:'true'},valid:true,write:false,ddl:0},
  {env:{STAGING_DB_CONFIRMED:'true',STAGING_ALLOW_SCHEMA_INIT:'true'},valid:true,write:false,ddl:0},
  {env:{STAGING_READ_ONLY:'false'},valid:false,write:false,ddl:0},
  {env:{STAGING_READ_ONLY:'false',STAGING_DB_CONFIRMED:'true'},valid:true,write:false,ddl:0},
  {env:{STAGING_READ_ONLY:'false',STAGING_DB_CONFIRMED:'true',STAGING_ALLOW_SCHEMA_INIT:'true'},valid:true,write:false,ddl:0},
  {env:{DB_NAME:''},valid:false,write:false,ddl:0},
  {env:{DB_HOST:''},valid:false,write:false,ddl:0},
  {env:{DB_USER:''},valid:false,write:false,ddl:0},
  {env:{DB_PASSWORD:''},valid:false,write:false,ddl:0},
  {env:{STAGING_READ_ONLY:'TRUE'},valid:false,write:false,ddl:0}
 ];
 for(const item of cases){
  let ddl=0,pools=0;const queries=[];
  const api=execute(prefix,{...security,process:{env:{...base,...item.env}},console:{log(){},warn(){},error(){}},mysql:{createPool:()=>{pools++;return {query:async sql=>{queries.push(sql);return sql==='SELECT DATABASE() AS db_name'?[[{db_name:base.DB_NAME}]]:[[{test:1}]];},end:async()=>{}};}},createTablesIfNotExist:async()=>{ddl++;}});
  assert.equal(api.isStagingEnvironment(),true);
  assert.equal(api.validateStagingDbConfiguration().valid,item.valid);
  assert.equal(api.isWritePermitted(),item.write);
  assert.equal(await api.initMariaDb(),item.valid);
  assert.equal(pools,item.valid?1:0);assert.equal(ddl,item.ddl);
  assert.ok(queries.every(sql=>['SELECT 1 as test','SELECT DATABASE() AS db_name'].includes(sql)));
 }
});

test('R3 rejects object/array contacts and verifies requested contact readback independently',()=>{
 for(const input of [[1112223344],{toString:()=>fixture.phone},true,NaN,Infinity])assert.equal(contacts.contactDigits(input),'');
 assert.equal(contacts.contactDigits(1112223344),fixture.phone);
 assert.equal(contacts.contactsMatchReadback({phone:'2223334455'},{phone:'+52 222 333 4455'}),true);
 assert.equal(contacts.contactsMatchReadback({phone:''},{phone:fixture.phone}),false);
 assert.equal(contacts.contactsMatchReadback({phone:''},{phone:null}),true);
 assert.equal(contacts.contactsMatchReadback({whatsapp:fixture.whatsapp},{phone:'old unrelated value',whatsapp:fixture.whatsapp}),true);
});

test('R3 PATCH refuses false contact confirmation and reports uncertain writes after readback failure',async()=>{
 const repo=repository([fixture]);
 const notApplied=await routeHarness({...repo,dbSaveBusiness:async()=>true});
 try {
  let result=await notApplied.request('/api/businesses/1081',{phone:'2223334455'});
  assert.equal(result.status,409);assert.equal(result.body.success,false);assert.equal(result.body.writeMayHaveSucceeded,true);
  notApplied.session('synthetic-admin',Date.now()+60000);
  result=await notApplied.request('/api/businesses/1081',{clearContacts:['phone']},'synthetic-admin');
  assert.equal(result.status,409);assert.equal(result.body.success,false);
 } finally {await notApplied.close();}
 const lost=repository([fixture]);
 const lostAck=await routeHarness({...lost,dbSaveBusiness:async(...args)=>{await lost.dbSaveBusiness(...args);return false;}});
 try {
  const result=await lostAck.request('/api/businesses/1081',{phone:'2223334455'});
  assert.equal(result.status,503);assert.equal(result.body.success,false);assert.equal(result.body.writeMayHaveSucceeded,true);
  assert.equal(lost.state.rows[0].phone,'2223334455');
 } finally {await lostAck.close();}
 const second=repository([fixture]);
 const uncertain=await routeHarness({...second,dbSaveBusiness:async(...args)=>{const saved=await second.dbSaveBusiness(...args);second.state.fail=true;return saved;}});
 try {
  const result=await uncertain.request('/api/businesses/1081',{phone:'2223334455'});
  assert.equal(result.status,503);assert.equal(result.body.success,false);assert.equal(result.body.writeMayHaveSucceeded,true);
  assert.match(result.body.message,/escritura fue aceptada/);
  second.state.fail=false;const after=await uncertain.request('/api/businesses/1081');assert.equal(after.body.business.phone,'2223334455');
 } finally {await uncertain.close();}
});

test('R3 parallel stale imports and independent explicit updates preserve both contact channels in mocked repository',async()=>{
 const repo=repository([fixture]);
 await Promise.all([
  repo.dbSaveBusiness({id:1081,name:fixture.name,phone:'2223334455'},{updateContacts:true}),
  ...Array.from({length:12},()=>repo.dbSaveBusiness({id:1081,name:fixture.name,phone:'9998887766',whatsapp:'9998887766'})),
  repo.dbSaveBusiness({id:1081,name:fixture.name,whatsapp:'3334445566'},{updateContacts:true})
 ]);
 const row=(await repo.dbLoadAllBusinesses())[0];assert.equal(row.phone,'2223334455');assert.equal(row.whatsapp,'3334445566');
});

function domEnvironment(url='https://encarmen.test/'){
 const dom=new JSDOM('<!doctype html><html><body><div id="test"></div></body></html>',{url});
 const saved={};for(const key of ['window','document','navigator','HTMLElement','localStorage','sessionStorage','Event','MouseEvent','Image']){saved[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:dom.window[key]});}
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.scrollTo=()=>{};
 return {container:document.getElementById('test'),restore(){for(const key in saved){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];}dom.window.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT;}};
}
const business={...fixture,description:'Prueba R3 sintética',category:'Servicios',categories:['Servicios'],categorySlugs:['servicios'],gallery:[],colonia:'Centro',image:'',slug:'fixture-1081',oldId:'legacy-1081'};
const genericResponse=url=>new Response(JSON.stringify(String(url).includes('ratings')?{success:true,ratings:{},stats:{average:0,count:0}}:String(url).includes('promotions')?{promotions:[]}:{}));

test('R3 direct legacy ID route renders canonical SQL/API contact values',async()=>{
 const source=read('src/App.tsx');const find=execute(source.slice(source.indexOf('function findBusinessInList'),source.indexOf('export default function App'))+'\nexport {findBusinessInList};').findBusinessInList;
 assert.equal(find([{...business,oldId:null}], 'null'),null);
 assert.equal(find([{...business,oldId:undefined}], 'undefined'),null);
 assert.equal(find([business],'legacy-1081').id,1081);
 const env=domEnvironment('https://encarmen.test/empresa/legacy-1081');const savedFetch=globalThis.fetch;
 globalThis.fetch=async url=>String(url)==='/api/businesses'?new Response(JSON.stringify({businesses:[business]})):genericResponse(url);
 const {createRoot}=await import('react-dom/client');const root=createRoot(env.container);
 try {
  const {default:App}=await loadComponent('src/App.tsx');await act(async()=>root.render(React.createElement(App)));
  assert.ok(env.container.querySelector('a[href="tel:+521112223344"]'));
  assert.ok(env.container.querySelector('a[href="https://wa.me/525556667788"]'));
 } finally {await act(async()=>root.unmount());globalThis.fetch=savedFetch;env.restore();}
});

test('R3 PIN delivery never infers WhatsApp from voice phone and never duplicates +52',async()=>{
 const env=domEnvironment();const savedFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,pins:{1081:{pin:'0123456789',expiresAt:Date.now()+60000}}}));
 const {createRoot}=await import('react-dom/client');const root=createRoot(env.container);
 try {
  const {AdminBusinessesTab}=await loadComponent('src/components/AdminBusinessesTab.tsx');
  await act(async()=>root.render(React.createElement(AdminBusinessesTab,{businesses:[{...business,whatsapp:''}]})));
  assert.equal(env.container.querySelector('a[title="Enviar código al dueño por WhatsApp"]'),null);
  await act(async()=>root.render(React.createElement(AdminBusinessesTab,{businesses:[{...business,whatsapp:'+52 555 666 7788'}]})));
  assert.match(env.container.querySelector('a[title="Enviar código al dueño por WhatsApp"]').href,/^https:\/\/wa.me\/525556667788\?/);
 } finally {await act(async()=>root.unmount());globalThis.fetch=savedFetch;env.restore();}
});

test('R3 API refuses success with missing or mismatched readback business',async()=>{
 const api=await loadComponent('src/services/api.ts');const savedFetch=globalThis.fetch;const savedStorage=globalThis.sessionStorage;globalThis.sessionStorage={getItem:()=>null};
 try {
  for(const body of [{success:true},{success:true,business:{id:99999}}]){globalThis.fetch=async()=>new Response(JSON.stringify(body));assert.equal((await api.adminUpdateBusiness(1081,{phone:'2223334455'})).success,false);}
 } finally {globalThis.fetch=savedFetch;if(savedStorage===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=savedStorage;}
});

test('R3 pending old catalog response cannot overwrite a confirmed contact save in real App',async()=>{
 const env=domEnvironment();const savedFetch=globalThis.fetch;let reads=0,release;let current={...business};const opened=[];window.open=url=>opened.push(url);
 globalThis.fetch=async(url,options={})=>{
  if(String(url)==='/api/businesses'){
   reads++;if(reads===2)return new Promise(resolve=>{release=()=>resolve(new Response(JSON.stringify({businesses:[business]})));});
   return new Response(JSON.stringify({businesses:[current]}));
  }
  if(String(url)==='/api/businesses/1081'&&options.method==='PATCH'){current={...current,...JSON.parse(options.body)};return new Response(JSON.stringify({success:true,business:current}));}
  return genericResponse(url);
 };
 // Test-only child adapters invoke real App callbacks; production components are not modified.
 const plugin={name:'isolated-editor-callbacks',setup(build){
  build.onLoad({filter:/BusinessDetailModal\.tsx$/},()=>({loader:'tsx',contents:`import React from 'react';export function BusinessDetailModal(p){return p.isOpen?<button onClick={()=>p.onEditBusiness(p.business)}>Test abrir editor</button>:null;}`}));
  build.onLoad({filter:/EditBusinessModal\.tsx$/},()=>({loader:'tsx',contents:`import React from 'react';export function EditBusinessModal(p){return p.isOpen?<button onClick={()=>p.onSave(p.business.id,{phone:'2223334455'})}>Test guardar contacto</button>:null;}`}));
 }};
 const {createRoot}=await import('react-dom/client');const root=createRoot(env.container);
 try {
  const {default:App}=await loadComponent('src/App.tsx',[plugin]);await act(async()=>root.render(React.createElement(App)));
  await act(async()=>window.dispatchEvent(new Event('focus')));assert.equal(typeof release,'function');
  const card=[...env.container.querySelectorAll('h3[title]')].find(el=>el.title.toLowerCase()===business.name.toLowerCase());assert.ok(card);
  await act(async()=>card.click());
  await act(async()=>[...env.container.querySelectorAll('button')].find(b=>b.textContent==='Test abrir editor').click());
  await act(async()=>[...env.container.querySelectorAll('button')].find(b=>b.textContent==='Test guardar contacto').click());
  await act(async()=>release());
  const call=[...env.container.querySelectorAll('button')].find(b=>b.textContent==='Llamar');assert.ok(call);await act(async()=>call.click());
  assert.equal(opened.at(-1),'tel:+522223334455');assert.doesNotMatch(env.container.textContent,/Consultando negocios vigentes/);
 } finally {await act(async()=>root.unmount());globalThis.fetch=savedFetch;env.restore();}
});

test('R3 isolated continuity: SQL row serializer -> real HTTP handler -> actual Glass and card controls',async()=>{
 const repo=repository([fixture]);const api=await routeHarness(repo);
 const response=await api.request('/api/businesses/1081');assert.equal(response.status,200);
 const fromApi=response.body.business;assert.equal(fromApi.phone,fixture.phone);assert.equal(fromApi.whatsapp,fixture.whatsapp);
 const env=domEnvironment();const savedFetch=globalThis.fetch;const opened=[];window.open=url=>opened.push(url);globalThis.fetch=async url=>genericResponse(url);
 const {createRoot}=await import('react-dom/client');const root=createRoot(env.container);
 try {
  const {BusinessPublicDetail}=await loadComponent('src/components/BusinessPublicDetail.tsx');
  await act(async()=>root.render(React.createElement(BusinessPublicDetail,{business:fromApi,onBack:()=>{}})));
  assert.ok(env.container.querySelector('a[href="tel:+521112223344"]'));assert.ok(env.container.querySelector('a[href="https://wa.me/525556667788"]'));
  assert.equal(env.container.querySelector('a[href*="9998887766"]'),null);
  const {BusinessCard}=await loadComponent('src/components/BusinessCard.tsx');
  await act(async()=>root.render(React.createElement(BusinessCard,{business:fromApi,onClick:()=>{}})));
  await act(async()=>{[...env.container.querySelectorAll('button')].find(b=>b.textContent==='Llamar').click();[...env.container.querySelectorAll('button')].find(b=>b.textContent==='WhatsApp').click();});
  assert.equal(opened[0],'tel:+521112223344');assert.match(opened[1],/^https:\/\/wa.me\/525556667788\?/);
 } finally {await act(async()=>root.unmount());globalThis.fetch=savedFetch;env.restore();await api.close();}
});


test('R3 digital card labels voice and WhatsApp independently without relabeling the other channel',async()=>{
 const env=domEnvironment();const {createRoot}=await import('react-dom/client');const root=createRoot(env.container);
 try {
  const {DigitalCardModal}=await loadComponent('src/components/DigitalCardModal.tsx');
  await act(async()=>root.render(React.createElement(DigitalCardModal,{isOpen:true,business:{...business,phone:'',whatsapp:fixture.whatsapp},onClose:()=>{}})));
  assert.match(env.container.textContent,/Teléfono: No registrado/);assert.match(env.container.textContent,/WhatsApp: 555 666 7788/);
  await act(async()=>root.render(React.createElement(DigitalCardModal,{isOpen:true,business:{...business,phone:fixture.phone,whatsapp:''},onClose:()=>{}})));
  assert.match(env.container.textContent,/Teléfono: 111 222 3344/);assert.match(env.container.textContent,/WhatsApp: No registrado/);
 } finally {await act(async()=>root.unmount());env.restore();}
});
