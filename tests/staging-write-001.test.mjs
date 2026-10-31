import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import crypto from 'node:crypto';
import {JSDOM} from 'jsdom';
import {execute,read,loadComponent} from './contacts-r2.test.mjs';
const modules=await loadComponent('tests/support/staging-write-entry.ts');
const {createStagingBusinessStore,registerStagingBusinessRoutes,stagingBusinessConfiguration,verifyStagingAdmin,createLoginLimiter,STAGING_BUSINESS_DATABASE}=modules;
const source=read('src/db/mariadb.ts');
const serialize=execute(source.slice(source.indexOf('export function businessFromRow'),source.indexOf('export async function dbLoadAllBusinesses'))).businessFromRow;
const fixture={id:'1081',name:'Empresa sintética',phone:'1112223344',whatsapp:'5556667788',raw_data:JSON.stringify({id:1081,name:'Empresa sintética',phone:'9998887766',whatsapp:'9998887766',slug:'sintetica',categories:['Servicios'],schedule:'Horario heredado'})};
const columns=['id','name','category','subcategory','description','address','colonia','phone','whatsapp','email','website','facebook','instagram','schedule','image','rating','reviews_count','verified','featured','status','raw_data'];
const key=()=>crypto.randomUUID();
function database(initial=[fixture]){
 const state={rows:structuredClone(initial),queries:[],database:STAGING_BUSINESS_DATABASE,canWrite:true,fail:'',commitLost:false,denyLock:false,engine:'InnoDB',primary:true};
 let lockTail=Promise.resolve(),txTail=Promise.resolve();
 const mutex=async(kind)=>{let unlock;const previous=kind==='lock'?lockTail:txTail;const next=new Promise(r=>unlock=r);if(kind==='lock')lockTail=next;else txTail=next;await previous;return unlock;};
 const getConnection=async()=>{
  let working=null,committed=false,unlockTx,unlockLock;
  const conn={
   async beginTransaction(){unlockTx=await mutex('tx');working=structuredClone(state.rows);committed=false;},
   async commit(){state.rows=working;committed=true;unlockTx?.();unlockTx=null;if(state.commitLost){state.commitLost=false;throw new Error('synthetic lost commit acknowledgement');}},
   async rollback(){if(!committed)working=null;unlockTx?.();unlockTx=null;},
   release(){unlockTx?.();unlockLock?.();unlockTx=null;unlockLock=null;},
   async query(sql,params=[]){
    state.queries.push({sql,params});
    if(state.fail && sql.includes(state.fail))throw new Error('synthetic query failure');
    if(sql==='SELECT DATABASE() AS db_name')return [[{db_name:state.database}]];
    if(sql.includes('information_schema.TABLES'))return [[{ENGINE:state.engine}]];
    if(sql.includes('information_schema.STATISTICS'))return [state.primary?[{COLUMN_NAME:'id',NON_UNIQUE:0,SEQ_IN_INDEX:1}]:[]];
    if(sql.startsWith('SELECT GET_LOCK')){if(state.denyLock)return [[{acquired:0}]];unlockLock=await mutex('lock');return [[{acquired:1}]];}
    if(sql.startsWith('SELECT RELEASE_LOCK')){unlockLock?.();unlockLock=null;return [[{released:1}]];}
    const rows=working||state.rows;
    if(sql==='SELECT * FROM businesses ORDER BY id ASC')return [structuredClone(rows)];
    if(sql.startsWith('SELECT * FROM businesses WHERE id = ?'))return [structuredClone(rows.filter(r=>String(r.id)===String(params[0])))];
    if(sql.startsWith('SELECT id FROM businesses WHERE id = ?'))return [structuredClone(rows.filter(r=>String(r.id)===String(params[0])).map(r=>({id:r.id})))];
    if(sql.startsWith('DELETE FROM businesses WHERE id = ?')){
     const index=rows.findIndex(r=>String(r.id)===String(params[0]));
     if(index<0)return [{affectedRows:0}];
     rows.splice(index,1);return [{affectedRows:1}];
    }
    if(sql.startsWith('INSERT INTO businesses')){
     assert.doesNotMatch(sql,/ON DUPLICATE/i);const row=Object.fromEntries(columns.map((c,i)=>[c,params[i]]));
     if(rows.some(r=>String(r.id)===String(row.id)))throw new Error('synthetic duplicate key');rows.push(row);return [{affectedRows:1}];
    }
    if(sql.startsWith('UPDATE businesses SET')){
     const row=rows.find(r=>String(r.id)===String(params.at(-1)));if(!row)return [{affectedRows:0}];
     const fields=sql.match(/^UPDATE businesses SET (.*), updated_at = NOW\(\) WHERE id = \?$/)[1].split(', ').map(value=>value.split(' = ')[0]);
     fields.forEach((field,i)=>row[field]=params[i]);return [{affectedRows:1}];
    }
    throw new Error('Unexpected SQL in isolated model');
   }
  };return conn;
 };
 const store=createStagingBusinessStore({getConnection,canWrite:()=>state.canWrite,serialize});
 return {state,store};
}
const draft=(n=1)=>({name:`Nueva sintética ${n}`,phone:`222333${String(n).padStart(4,'0')}`,whatsapp:'',categories:['Servicios'],category:'Servicios',description:'Datos de prueba'});
const env={APP_ENV:'staging',STAGING_READ_ONLY:'false',STAGING_DB_CONFIRMED:'true',STAGING_BUSINESS_WRITES_ENABLED:'true',DB_NAME:STAGING_BUSINESS_DATABASE,DB_USER:'synthetic-staging-user',DB_HOST:'synthetic.invalid',DB_PASSWORD:'synthetic-placeholder'};
const derived=()=>`scrypt$${'ab'.repeat(16)}$${crypto.scryptSync('Synthetic-password-only',Buffer.from('ab'.repeat(16),'hex'),64,{N:16384,r:8,p:1}).toString('hex')}`;

test('SW explicit configuration, selected database and production account guards fail closed',async()=>{
 assert.equal(stagingBusinessConfiguration(env,'production-user'),true);
 for(const patch of [{STAGING_READ_ONLY:'true'},{STAGING_DB_CONFIRMED:'false'},{STAGING_BUSINESS_WRITES_ENABLED:undefined},{DB_NAME:'u293982346_encarmenapp'},{DB_USER:'production-user'}])assert.equal(stagingBusinessConfiguration({...env,...patch},'production-user'),false);
 const prefix=source.slice(source.indexOf('export interface MariaDbConfig'),source.indexOf('export function isMariaDbActive'));
 const permission=source.slice(source.indexOf('export function isBusinessWritePermitted'),source.indexOf('export const stagingBusinessStore'));
 for(const target of [STAGING_BUSINESS_DATABASE,'u293982346_encarmenapp']){
  const queries=[];const api=execute(prefix+permission,{...modules,process:{env},console:{log(){},warn(){},error(){}},mysql:{createPool:()=>({query:async sql=>{
   queries.push(sql);
   if(sql.includes('CURRENT_USER()')&&sql.includes('DATABASE()'))return [[{effective_user:env.DB_USER,db_name:target}]];
   if(sql.startsWith('SHOW GRANTS'))return [[{'Grants':'GRANT SELECT, INSERT, UPDATE, DELETE ON '+STAGING_BUSINESS_DATABASE+".* TO synthetic-staging-user"}]];
   return [[{test:1}]];
  },end:async()=>{}})},createTablesIfNotExist:()=>{throw new Error('DDL forbidden');},getPrivateStagingSnapshot:()=>env,privateStagingBusinessWindowOpen:()=>true});
  // The minimal VM connection model is not a complete grant/identity proof: fail closed.
  assert.equal(await api.initMariaDb(),false);
  assert.equal(api.isWritePermitted(),false);
  assert.equal(api.isBusinessWritePermitted(),false);
  assert.ok(queries.every(q=>q.startsWith('SELECT')||q.startsWith('SHOW GRANTS')));
 }
 const classification=execute(prefix,{...modules,process:{env:{NODE_ENV:'production',DB_NAME:STAGING_BUSINESS_DATABASE}}});assert.equal(classification.isStagingEnvironment(),true);assert.equal(classification.isWritePermitted(),false);
 const wrongTarget=execute(prefix,{...modules,process:{env:{...env,APP_ENV:undefined,DB_NAME:'u293982346_encarmenapp'}}});assert.equal(wrongTarget.isStagingEnvironment(),true);assert.equal(wrongTarget.validateStagingDbConfiguration().valid,false);
 const db=database();db.state.database='u293982346_encarmenapp';await assert.rejects(db.store.create(draft(),key()),e=>e.code==='DATABASE_TARGET_MISMATCH');assert.equal(db.state.queries.filter(q=>/^(INSERT|UPDATE)/.test(q.sql)).length,0);
 db.state.database=STAGING_BUSINESS_DATABASE;db.state.engine='MyISAM';await assert.rejects(db.store.create(draft(),key()),e=>e.code==='BUSINESS_ENGINE_UNVERIFIED');
 db.state.engine='InnoDB';db.state.primary=false;await assert.rejects(db.store.create(draft(),key()),e=>e.code==='BUSINESS_PRIMARY_KEY_UNVERIFIED');
 db.state.canWrite=false;await assert.rejects(db.store.update(1081,{name:'Nunca'}),e=>e.status===403);
});

test('SW secure staging credentials and login throttling do not accept embedded/short/client-only credentials',()=>{
 const configured={STAGING_ADMIN_Y_SCRYPT:derived()};
 assert.equal(verifyStagingAdmin('Y','Synthetic-password-only',configured).ok,true);
 assert.equal(verifyStagingAdmin('Y','Wrong-password-only',configured).ok,false);
 assert.equal(verifyStagingAdmin('Y','Synthetic-password-only',{}).configured,false);
 assert.equal(verifyStagingAdmin('Y','short',configured).ok,false);
 const allow=createLoginLimiter();for(let i=0;i<5;i++)assert.equal(allow('synthetic-ip',100),true);assert.equal(allow('synthetic-ip',100),false);assert.equal(allow('synthetic-ip',100+15*60*1000),true);
});

test('SW INSERT/replay/conflict/duplicates and parallel registrations never upsert an existing business',async()=>{
 const db=database();const before=JSON.stringify(db.state.rows[0]);const id=key();
 const first=await db.store.create(draft(),id);assert.equal(first.replayed,false);assert.equal(first.business.whatsapp,'');assert.equal(JSON.stringify(db.state.rows[0]),before);
 const replay=await db.store.create(draft(),id);assert.equal(replay.replayed,true);assert.equal(replay.business.id,first.business.id);assert.equal(db.state.rows.length,2);
 await assert.rejects(db.store.create({...draft(),description:'different'},id),e=>e.code==='IDEMPOTENCY_CONFLICT');
 await assert.rejects(db.store.create(draft(),key()),e=>e.code==='BUSINESS_DUPLICATE');
 const parallel=await Promise.all([db.store.create(draft(2),key()),db.store.create(draft(3),key())]);assert.notEqual(parallel[0].business.id,parallel[1].business.id);
 assert.ok(db.state.queries.filter(q=>q.sql.startsWith('INSERT')).every(q=>!q.sql.includes('DUPLICATE')));
 assert.equal(first.business._stagingRegistrationId,undefined);
});

test('SW transactional update preserves fresh SQL contacts, metadata and unrelated fields; missing business never inserts',async()=>{
 const db=database();db.state.rows[0].raw_data=JSON.stringify({...JSON.parse(db.state.rows[0].raw_data),openingHours:'Horario antiguo alias',paymentMethods:['Viejo'],deliveryOption:'Viejo'});
 const first=await db.store.update(1081,{description:'Editada'});
 assert.doesNotMatch(db.state.queries.find(q=>q.sql.startsWith('UPDATE')).sql,/phone =|whatsapp =|rating =/);
 assert.equal(first.business.phone,fixture.phone);assert.equal(first.business.whatsapp,fixture.whatsapp);assert.equal(first.business.schedule,'Horario heredado');
 const explicit=await db.store.update(1081,{schedule:'Nuevo horario',payment:'Nuevo pago',delivery:'Nueva modalidad'});assert.equal(explicit.business.openingHours,undefined);assert.equal(explicit.business.paymentMethods,undefined);assert.equal(explicit.business.deliveryOption,undefined);
 await db.store.update(1081,{phone:'2223334455'});assert.equal(db.state.rows[0].whatsapp,fixture.whatsapp);
 await db.store.update(1081,{whatsapp:''});assert.equal(db.state.rows[0].phone,'2223334455');assert.equal(db.state.rows[0].whatsapp,'');
 await assert.rejects(db.store.update(99999,{name:'No crear'}),e=>e.status===404);assert.equal(db.state.rows.length,1);
 const created=await db.store.create(draft(),key());const metadata=JSON.parse(db.state.rows.find(r=>Number(r.id)===created.business.id).raw_data)._stagingRegistrationId;
 await db.store.update(created.business.id,{description:'Cambio mínimo'});assert.equal(JSON.parse(db.state.rows.find(r=>Number(r.id)===created.business.id).raw_data)._stagingRegistrationId,metadata);
 const restarted=database(JSON.parse(JSON.stringify(db.state.rows)));const reread=serialize(restarted.state.rows[0]);assert.equal(reread.phone,'2223334455');assert.equal(reread.whatsapp,'');
 assert.ok(db.state.queries.some(q=>q.sql.endsWith('FOR UPDATE')));
});

test('SW isolated DELETE only removes exact synthetic PK and checks readback before commit',async()=>{
 const db=database();
 const created=await db.store.create(draft(9),key());
 const savedBefore=structuredClone(db.state.rows[0]);
 const id=created.business.id;
 const done=await db.store.delete(id);
 assert.equal(done.deleted,true);
 assert.equal(db.state.rows.length,1);
 assert.deepEqual(db.state.rows[0],savedBefore);
 assert.ok(db.state.queries.some(q=>q.sql==='DELETE FROM businesses WHERE id = ?' && String(q.params[0])===String(id)));
 assert.ok(db.state.queries.some(q=>q.sql==='SELECT id FROM businesses WHERE id = ?'));
 await assert.rejects(db.store.delete(id),e=>e.code==='BUSINESS_NOT_FOUND'&&e.status===404);
 await assert.rejects(db.store.delete('not-an-id'),e=>e.code==='BUSINESS_ID_INVALID'&&e.status===400);
 db.state.canWrite=false;
 await assert.rejects(db.store.delete(1081),e=>e.code==='STAGING_BUSINESS_READ_ONLY'&&e.status===403);
 assert.equal(db.state.rows.length,1);
 db.state.canWrite=true;
 db.state.database='u293982346_encarmenapp';
 await assert.rejects(db.store.delete(1081),e=>e.code==='DATABASE_TARGET_MISMATCH'&&e.status===403);
 assert.equal(db.state.rows.length,1);
 db.state.database=STAGING_BUSINESS_DATABASE;
 db.state.fail='DELETE FROM businesses';
 await assert.rejects(db.store.delete(1081),e=>e.code==='BUSINESS_WRITE_UNCONFIRMED'&&e.status===503);
 assert.equal(db.state.rows.length,1);
});

test('SW rollback and lost commit acknowledgement never report success or duplicate a retried registration',async()=>{
 const db=database();db.state.fail='INSERT INTO';await assert.rejects(db.store.create(draft(),key()),e=>e.status===503);assert.equal(db.state.rows.length,1);
 db.state.fail='';db.state.commitLost=true;const request=key();await assert.rejects(db.store.create(draft(),request),e=>e.status===503&&e.writeMayHaveSucceeded===true);assert.equal(db.state.rows.length,2);
 const retry=await db.store.create(draft(),request);assert.equal(retry.replayed,true);assert.equal(db.state.rows.length,2);
 db.state.denyLock=true;await assert.rejects(db.store.create(draft(4),key()),e=>e.code==='REGISTRATION_BUSY');
});

async function httpHarness(){
 const db=database();const app=express();app.use(express.json());let legacy=0;const sessions=new Map();
 const serverSource=read('server.ts');
 const security=await loadComponent('src/server/adminSecurity.ts');
 const {administrativeWritesReady}=await loadComponent('src/server/consolidatedWritePolicy.ts');
 const start=serverSource.indexOf('const adminSecurity = registerAdminSecurity');
 const registration=serverSource.slice(start,serverSource.indexOf('\n});',start)+4);
 const globalGuard=serverSource.slice(serverSource.indexOf('// Staging safety & write protection'),serverSource.indexOf('// 1. REGLA GEOIP'));
 const effectiveEnv={...env,ENC_ADMIN_MUTATIONS_ENABLED:'true',ENC_ADMIN_PUBLIC_ORIGIN:'https://fixture.invalid',ENC_ADMIN_CREDENTIALS_JSON:JSON.stringify({version:1,accounts:[{username:'Y',passwordHash:derived(),permissions:security.ADMIN_PERMISSIONS}]})};
 let now=Date.now();
 const auth=execute(`${registration}\n${globalGuard}\nexport const isVerifiedAdminSession=(req:any)=>adminSecurity.isAuthorized(req,'business:manage');`,{
  app,...security,administrativeWritesReady,registerAdminSecurity:(app,options)=>security.registerAdminSecurity(app,{...options,now:()=>now}),process:{env:effectiveEnv},isStagingEnvironment:()=>true,isBusinessWritePermitted:()=>db.state.canWrite,isWritePermitted:()=>false,stagingDynamicIdentity:false,getPrivateStagingSnapshot:()=>effectiveEnv,console:{log(){},warn(){},error(){}}
 });
 auth.expire=()=>{now+=7*3600000;};
 registerStagingBusinessRoutes(app,{isStaging:()=>true,canWrite:()=>db.state.canWrite,isAdmin:auth.isVerifiedAdminSession,canPublish:auth.isVerifiedAdminSession,store:db.store,readAll:async()=>db.state.rows.map(serialize),saved:()=>{}});
 app.post('/api/submit-business',(_req,res)=>{legacy++;res.json({success:true,legacy:true});});app.patch(['/api/businesses/:id','/businesses/:id'],(_req,res)=>{legacy++;res.json({legacy:true});});
 app.delete('/api/businesses/:id',(_req,res)=>res.json({success:true,deleted:true}));
 app.post('/api/admin/change-password',(_req,res)=>res.json({unsafe:true}));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base=`http://127.0.0.1:${server.address().port}`;
 const request=async(path,method='GET',body,token,requestId)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{'X-Encarmen-Admin-Token':token}:{}),...(requestId?{'Idempotency-Key':requestId}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
 return {db,request,auth,legacy:()=>legacy,close:()=>new Promise(resolve=>server.close(resolve))};
}

test('SW real HTTP guard/login/routes enforce authorization and controlled scope with mocked MariaDB',async()=>{
 const api=await httpHarness();try{
  assert.equal((await api.request('/api/submit-business','POST',draft(),undefined,key())).status,401);
  assert.equal((await api.request('/api/businesses/1081','PATCH',{phone:'2223334455'},'invented')).status,401);
  assert.equal((await api.request('/api/admin/login','POST',{username:'Y',password:'Wrong-password-only'})).status,401);
  const login=await api.request('/api/admin/login','POST',{username:'Y',password:'Synthetic-password-only'});assert.equal(login.status,200);const token=login.body.token;assert.match(token,/^[a-f0-9]{64}$/);
  const requestId=key();const created=await api.request('/api/submit-business','POST',draft(),token,requestId);assert.equal(created.status,201);assert.equal(created.body.business.whatsapp,'');
  assert.equal((await api.request('/api/submit-business','POST',draft(),token,requestId)).body.replayed,true);
  for(const body of [{name:'Cambio de nombre'},{phone:'',whatsapp:null}]){const result=await api.request('/api/businesses/1081','PATCH',body,token);assert.equal(result.status,200);assert.equal(result.body.business.phone,fixture.phone);assert.equal(result.body.business.whatsapp,fixture.whatsapp);}
  const removed=await api.request('/api/businesses/1081','PATCH',{clearContacts:['phone']},token);assert.equal(removed.status,200);assert.equal(removed.body.business.phone,'');assert.equal(removed.body.business.whatsapp,fixture.whatsapp);
  for(const body of [{DB_NAME:'u293982346_encarmenapp'},{id:99999},{isAdmin:true},{phone:'invalid'},{name:'A'}])assert.equal((await api.request('/api/businesses/1081','PATCH',body,token)).status,400);
  for(const [path,method] of [['/api/mariadb/sync-catalog','POST'],['/api/mariadb/reconnect','POST'],['/api/sync','POST'],['/api/webhook/woocommerce','POST'],['/api/admin/change-password','POST'],['/api/upload-logo','POST'],['/api/businesses/1081/generate-pin','POST'],['/api/businesses/1081/verify-edit-pin','POST']])assert.ok([403,503].includes((await api.request(path,method,{},token)).status),path);
  // A valid business:delete permission passes the Staging HTTP gate only while the isolated write lane is open.
  assert.equal((await api.request('/api/businesses/1081','DELETE',{},token)).status,200);
  assert.equal((await api.request('/api/businesses/1081','DELETE',{},undefined)).status,401);
  api.db.state.canWrite=false;
  assert.equal((await api.request('/api/businesses/1081','DELETE',{},token)).status,403);
  api.db.state.canWrite=true;
  api.auth.expire();assert.equal((await api.request('/api/businesses/1081','PATCH',{name:'No autorizado'},token)).status,401);
  const relogin=await api.request('/api/admin/login','POST',{username:'Y',password:'Synthetic-password-only'});assert.equal(relogin.status,200);
  api.db.state.canWrite=false;assert.ok([403,503].includes((await api.request('/api/submit-business','POST',draft(8),relogin.body.token,key())).status));
  assert.equal(api.legacy(),0);
 }finally{await api.close();}
});

test('SW browser service has no local success fallback and authentication requires a server token',async()=>{
 const dom=new JSDOM('',{url:'https://encarmen.test'});const saved={};for(const k of ['window','localStorage','sessionStorage']){saved[k]=globalThis[k];globalThis[k]=dom.window[k];}const originalFetch=globalThis.fetch;
 try{
  const api=await loadComponent('src/services/api.ts');const auth=await loadComponent('src/utils/adminAuth.ts');
  globalThis.fetch=async()=>{throw new Error('synthetic offline');};
  const result=await api.submitAdministrativeBusinessRegistration(draft(),key());assert.equal(result.success,false);assert.equal(localStorage.getItem('empresas_local_submissions'),null);
  assert.equal((await auth.loginAdminUser('Y','Synthetic-password-only')).success,false);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:true}));assert.equal((await auth.loginAdminUser('Y','Synthetic-password-only')).success,false);
  const calls=[];sessionStorage.setItem('encarmen_admin_session_token','a'.repeat(64));globalThis.fetch=async(url,options)=>{calls.push(options);return new Response(JSON.stringify({success:true,business:{id:4001}}));};
  const request=key();assert.equal((await api.submitAdministrativeBusinessRegistration(draft(),request)).success,true);assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),request);assert.equal(new Headers(calls[0].headers).get('X-Encarmen-Admin-Token'),'a'.repeat(64));
 }finally{globalThis.fetch=originalFetch;for(const k in saved){if(saved[k]===undefined)delete globalThis[k];else globalThis[k]=saved[k];}dom.window.close();}
});

test('SW registration form retains request key after error, blocks duplicate clicks and keeps WhatsApp independent',async()=>{
 const React=await import('react');const {act}=React;const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'https://encarmen.test/registro'});const saved={};
 for(const k of ['window','document','navigator','HTMLElement','localStorage','sessionStorage','Event','MouseEvent','Image']){saved[k]=Object.getOwnPropertyDescriptor(globalThis,k);Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:dom.window[k]});}
 const originalFetch=globalThis.fetch;globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.scrollTo=()=>{};sessionStorage.setItem('encarmen_admin_session_token','a'.repeat(64));let fail=true,duplicate=true;const attempts=[];
 globalThis.fetch=async(url,options={})=>{
  if(String(url).includes('/check-duplicate'))return new Response(JSON.stringify(duplicate?{isDuplicate:true,existingBusiness:{id:1081,name:'Negocio sintético existente'}}:{isDuplicate:false}));
  if(String(url)==='/api/public/business-registrations'){attempts.push({key:options.headers['Idempotency-Key'],body:JSON.parse(options.body)});return new Response(JSON.stringify(fail?{success:false,message:'Fallo sintético de guardado'}:{success:true,directoryVisible:true,business:{...JSON.parse(options.body),id:4001,status:'published'}}),{status:fail?503:201});}
  const business={...attempts.at(-1)?.body,id:4001,status:'published'};
  if(String(url).startsWith('/api/businesses/')) return new Response(JSON.stringify({success:true,business}));
  if(String(url).startsWith('/api/businesses?')) return new Response(JSON.stringify({businesses:[business]}));
  return new Response('{}');
 };
 const {createRoot}=await import('react-dom/client');const container=document.getElementById('root');const root=createRoot(container);
 try{
  const {RegisterBusinessView}=await loadComponent('src/components/RegisterBusinessView.tsx');await act(async()=>root.render(React.createElement(RegisterBusinessView,{categories:[{id:1,name:'Servicios'}],coloniasList:[],onSuccessReturn:()=>{}})));
  const fill=async(selector,value)=>{const input=container.querySelector(selector);assert.ok(input);await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});};
  await fill('input[placeholder^="Ej. Antojitos"]','Nueva empresa sintética');
  const category=[...container.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.textContent==='Servicios'));await act(async()=>{category.value='Servicios';category.dispatchEvent(new Event('change',{bubbles:true}));});
  await fill('input[placeholder="Ej. 938 123 4567"]','2223334455');await fill('input[placeholder="Buscar colonia..."]','Centro');
  const form=container.querySelector('form');await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(attempts.length,0);assert.match(container.textContent,/Posible negocio duplicado/);
  duplicate=false;await act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent.trim()==='Revisar datos del negocio').click());
  await act(async()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  assert.equal(attempts.length,1);assert.equal(attempts[0].body.whatsapp,'');assert.match(container.textContent,/No se pudo confirmar si el registro quedó publicado/);assert.ok(container.querySelector('form'));
  fail=false;await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(attempts.length,2);assert.equal(attempts[0].key,attempts[1].key);assert.equal(container.querySelector('form'),null);assert.match(container.textContent,/Nueva Empresa Sintética/i);
 }finally{await act(async()=>root.unmount());globalThis.fetch=originalFetch;for(const k in saved){if(saved[k])Object.defineProperty(globalThis,k,saved[k]);else delete globalThis[k];}dom.window.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
