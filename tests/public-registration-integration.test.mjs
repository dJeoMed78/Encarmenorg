import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import express from 'express';
import {transformSync} from 'esbuild';
import {createStagingBusinessStore} from '../src/db/stagingBusinessStore.ts';
import {businessFromRow} from '../src/db/mariadb.ts';
import {mountPublicRegistration,publicRegistrationBodyLimit} from '../src/server/publicRegistrationWiring.ts';
import {validatePublicRegistration} from '../src/server/publicRegistrationCore.ts';
import {contactDigits,contactCounts,matchesContactFilter,CONTACT_FILTERS} from '../src/utils/businessContacts.ts';
import {submitBusinessRegistration} from '../src/services/api.ts';
import {applyPatch} from '../scripts/apply-public-registration-patch.mjs';

const source = readFileSync(new URL('../server.ts',import.meta.url),'utf8');
const DATABASE = 'u293982346_encarmentest';
const input = {name:'Registro Sintético Integrado',category:'Servicios',description:'Datos de prueba',address:'Ubicación sintética',colonia:'Centro',postalCode:'24100',phone:'2223334455',whatsapp:'5556667788',schedule:'Lunes a viernes 09:00 - 18:00',delivery:'Servicio a domicilio gratis',payment:'Efectivo, CoDi / QR',website:'https://example.test'};

// Simulador SQL explícito: no abre sockets de MariaDB ni lee credenciales.
function model(){
 const state={rows:[],queries:[],target:DATABASE,marker:'staging',failRead:false,lostAck:false};
 const conn={
  snapshot:null,
  async beginTransaction(){this.snapshot=structuredClone(state.rows);},
  async commit(){this.snapshot=null;if(state.lostAck){state.lostAck=false;throw Error('synthetic lost acknowledgement');}},
  async rollback(){if(this.snapshot)state.rows=this.snapshot;this.snapshot=null;},release(){},
  async query(sql,params=[]){
   state.queries.push(sql);
   if(sql==='SELECT DATABASE() AS db_name')return [[{db_name:state.target}]];
   if(sql.includes('information_schema.TABLES'))return [[{ENGINE:'InnoDB'}]];
   if(sql.includes('information_schema.STATISTICS'))return [[{COLUMN_NAME:'id',NON_UNIQUE:0,SEQ_IN_INDEX:1}]];
   if(sql==='SHOW GRANTS FOR CURRENT_USER()')return [[{grant:`GRANT SELECT, INSERT, UPDATE ON \`${DATABASE}\`.* TO \`synthetic\`@\`%\``}]];
   if(sql.includes('information_schema.SCHEMATA'))return [[{SCHEMA_NAME:DATABASE}]];
   if(sql.includes('encarmen_environment_marker'))return [[{env_name:state.marker,db_name:DATABASE}]];
   if(sql.startsWith('SELECT GET_LOCK'))return [[{acquired:1}]];
   if(sql.startsWith('SELECT RELEASE_LOCK'))return [[{released:1}]];
   if(sql.startsWith('SELECT id FROM businesses WHERE raw_data LIKE'))return [state.rows.filter(row=>params.every(pattern=>row.raw_data.includes(pattern.slice(1,-1))))];
   if(sql.startsWith('SELECT COALESCE'))return [[{hour_total:state.rows.length,day_total:state.rows.length}]];
   if(sql==='SELECT * FROM businesses ORDER BY id ASC'){if(state.failRead)throw Error('synthetic unavailable');return [structuredClone(state.rows)];}
   if(sql.startsWith('SELECT ')&&sql.includes('FROM businesses WHERE id = ?')){if(state.failRead)throw Error('synthetic unavailable');return [structuredClone(state.rows.filter(row=>String(row.id)===String(params[0])))];}
   if(sql.startsWith('INSERT INTO businesses')){const columns=sql.match(/\(([^)]+)\)/)[1].split(', ');state.rows.push(Object.fromEntries(columns.map((column,index)=>[column,params[index]])));return [{affectedRows:1}];}
   throw Error('Unexpected synthetic SQL: '+sql);
  }
 };
 return {state,conn};
}
async function harness(){
 const env={APP_ENV:'staging',DB_NAME:DATABASE,DB_HOST:'synthetic.invalid',DB_USER:'synthetic',DB_PASSWORD:'synthetic-placeholder',APP_URL:'https://staging.encarmen.org',PUBLIC_URL:undefined,MYSQL_DATABASE:undefined,MARIADB_DATABASE:undefined,MYSQL_HOST:undefined,MARIADB_HOST:undefined,MYSQL_USER:undefined,MARIADB_USER:undefined,ENABLE_WP_SYNC:'false',STAGING_ALLOW_SCHEMA_INIT:'false',STAGING_REQUIRE_MINIMAL_GRANTS:'true',PUBLIC_REGISTRATION_ENABLED:'true'};
 const saved=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
 for(const [key,value] of Object.entries(env)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 const {state,conn}=model();let writable=true,staging=true;
 const app=express();const context={app,businessesCache:[],cachedDbSignature:null,contactDigits,contactCounts,matchesContactFilter,CONTACT_FILTERS,
  isStagingEnvironment:()=>staging,isWritePermitted:()=>false,isBusinessWritePermitted:()=>writable,
  publicRegistrationBodyLimit,mountPublicRegistration,getPool:()=>conn,generateCategorySlugs:categories=>categories.map(c=>c.toLowerCase())};
 context.stagingBusinessStore=createStagingBusinessStore({canWrite:()=>writable,getConnection:async()=>conn,serialize:businessFromRow});
 context.refreshBusinessesFromDbIfNeeded=async()=>{const [rows]=await conn.query('SELECT * FROM businesses ORDER BY id ASC');context.businessesCache=rows.map(businessFromRow);};
 const run=code=>vm.runInNewContext(transformSync(code,{loader:'ts',format:'cjs'}).code,context);
 run(source.slice(source.indexOf('// Staging safety & write protection'),source.indexOf('// 1. REGLA GEOIP')));
 app.use('/api/public/business-registrations',publicRegistrationBodyLimit);app.use(express.json({limit:'50mb'}));
 // Ejecutar exactamente el montaje integrado en el server.ts completo, sin arrancar sus tareas automáticas.
 const start=source.indexOf('mountPublicRegistration(app, {');
 assert.ok(start>=0);run(source.slice(start,source.indexOf('\n});',start)+4));
 run(source.slice(source.indexOf('// Businesses List with search & filters'),source.indexOf('// Endpoint to purge cache')));
 const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
 const base=`http://127.0.0.1:${server.address().port}`;
 return {state,context,base,setWritable:value=>writable=value,setStaging:value=>staging=value,close:async()=>{await new Promise(resolve=>server.close(resolve));for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}};
}

test('server.ts completo contiene el parche aplicado e idempotente',()=>{
 const result=applyPatch(source);assert.equal(result.applied.length,0);assert.equal(result.skipped.length,5);assert.equal(result.source,source);
 assert.ok(source.indexOf("app.use('/api/public/business-registrations', publicRegistrationBodyLimit)")<source.indexOf("app.use(express.json({ limit: '50mb' }))"));
});

test('contrato público valida modalidades/pagos/CP y rechaza imágenes, privilegios y teléfonos contaminados',()=>{
 const {draft}=validatePublicRegistration(input);assert.equal(draft.hasDelivery,true);assert.equal(draft.payment,input.payment);assert.equal(draft.postalCode,'24100');assert.equal(draft.whatsapp,input.whatsapp);
 for(const patch of [{phone:'abc2223334455'},{phone:'https://example.test/2223334455'},{postalCode:'2410'},{payment:'Pago inventado'},{delivery:'Modalidad inventada'},{logo:'data:image/png;base64,x'},{gallery:[]},{status:'published'}])assert.throws(()=>validatePublicRegistration({...input,...patch}),error=>error.status===400);
});

test('cliente público → HTTP real → almacén/verificador reales con SQL simulado → listado/ficha y recarga',async()=>{
 const h=await harness();const nativeFetch=globalThis.fetch;const calls=[];const key=randomUUID();
 globalThis.fetch=(url,options={})=>{assert.ok(String(url).startsWith('/api/'),'sin solicitudes externas');calls.push({url:String(url),options});return nativeFetch(h.base+url,options);};
 try{
  const created=await submitBusinessRegistration(input,key);assert.equal(created.success,true,created.message);assert.equal(created.directoryVisible,true);assert.equal(h.state.rows.length,1);
  assert.equal(calls[0].url,'/api/public/business-registrations');assert.equal(calls[0].options.headers['Idempotency-Key'],key);assert.equal(calls[0].options.headers['X-Encarmen-Admin-Token'],undefined);
  const row=h.state.rows[0];assert.equal(row.phone,input.phone);assert.equal(row.whatsapp,input.whatsapp);assert.equal(row.status,'published');assert.equal(JSON.parse(row.raw_data).payment,input.payment);
  h.context.businessesCache=[];const detail=await (await nativeFetch(`${h.base}/api/businesses/${row.id}`)).json();assert.equal(detail.business.phone,input.phone);
  h.context.businessesCache=[];const list=await (await nativeFetch(`${h.base}/api/businesses`)).json();assert.ok(list.businesses.some(b=>b.id===detail.business.id));
  const replay=await submitBusinessRegistration(input,key);assert.equal(replay.success,true);assert.equal(replay.replayed,true);assert.equal(h.state.rows.length,1);
  h.state.failRead=true;const failed=await submitBusinessRegistration(input,key);assert.equal(failed.success,false);h.state.failRead=false;
  h.setWritable(false);assert.equal((await submitBusinessRegistration(input,randomUUID())).success,false);assert.equal(h.state.rows.length,1);
 }finally{globalThis.fetch=nativeFetch;await h.close();}
});

test('confirmación incierta conserva UUID, reintento no duplica; aislamiento y rutas inseguras bloqueados',async()=>{
 const h=await harness();const key=randomUUID();
 const post=async(body=input,id=key)=>{const r=await fetch(h.base+'/api/public/business-registrations',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try{
  h.state.lostAck=true;const uncertain=await post();assert.equal(uncertain.status,503);assert.equal(uncertain.body.writeMayHaveSucceeded,true);assert.equal(h.state.rows.length,1);
  const replay=await post();assert.equal(replay.status,200);assert.equal(replay.body.replayed,true);assert.equal(h.state.rows.length,1);
  h.state.marker='production';const blocked=await post({...input,name:'Otra sintética',phone:'3334445566',whatsapp:''},randomUUID());assert.equal(blocked.status,403);assert.equal(h.state.rows.length,1);
  h.state.marker='staging';h.state.target='u293982346_encarmenapp';assert.equal((await post(input,randomUUID())).status,403);h.state.target=DATABASE;
  for(const path of ['/api/upload-logo','/api/mariadb/sync-catalog','/api/public/business-registrations/'])assert.equal((await fetch(h.base+path,{method:'POST'})).status,403);
  const oversized=await post({...input,description:'x'.repeat(20000)},randomUUID());assert.equal(oversized.status,413);
  h.setStaging(false);assert.equal((await post()).status,403);assert.equal(h.state.rows.length,1);
 }finally{await h.close();}
});
