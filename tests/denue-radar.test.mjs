import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import express from 'express';
import {transformSync} from 'esbuild';
import {createDenueClient,normalizeDenue,denueSourceUrl,classifyDenueDuplicate,denueDraft,denueRequestId,createDenueRadar} from '../src/server/denueRadar.ts';
import {createStagingBusinessStore} from '../src/db/stagingBusinessStore.ts';
import {registerAdminSecurity} from '../src/server/adminSecurity.ts';

// Entirely synthetic fixtures, never advertised as consulted INEGI establishments.
export const row=(patch={})=>({Id:'90000000001',Nombre:'Empresa sintética A',Razon_social:'',Clase_actividad:'Actividad de prueba',
  Tipo_vialidad:'CALLE',Calle:'PRUEBA',Num_Exterior:'10',Num_Interior:'',Colonia:'SINTÉTICA',CP:'24100',
  Ubicacion:'Ciudad del Carmen, Carmen, CAMPECHE',AreaGeo:'040030001',Telefono:'9380000001',Correo_e:'',Sitio_internet:'',CLEE:'TEST-CLEE-1',Latitud:'18.64',Longitud:'-91.82',...patch});
const client=(fetcher,other={})=>createDenueClient({token:()=> 'synthetic-test-only',fetcher,...other});
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
test('DENUE official area parameters, paging, token confined to upstream and exact source link',async()=>{
  let url;const c=client(async u=>{url=u;return json([row()]);});const [candidate]=await c.search('Prueba',2);
  assert.match(url,/BuscarAreaAct\/04\/003\/0001\/0\/0\/0\/0\/0\/0\/Prueba\/21\/40\/0\/synthetic-test-only$/);
  assert.equal(candidate.areaGeo,'040030001');assert.equal(candidate.geography,'VERIFICADA');
  assert.equal(candidate.sourceUrl,'https://www.inegi.org.mx/app/mapa/denue/default.aspx?idee=90000000001');
  assert.doesNotMatch(JSON.stringify(candidate),/synthetic-test-only/);assert.equal(denueSourceUrl('../evil'),'');
});
test('DENUE absent token never calls network',async()=>{
  let calls=0;await assert.rejects(client(async()=>{calls++;},{token:()=>undefined}).search(),/DENUE_TOKEN_NOT_CONFIGURED/);assert.equal(calls,0);
});
for(const [name,fetcher,code] of [
  ['invalid token',async()=>new Response('',{status:401}),'DENUE_TOKEN_REJECTED'],
  ['upstream failure',async()=>new Response('',{status:500}),'DENUE_UPSTREAM_ERROR'],
  ['invalid JSON',async()=>new Response('<html>'),'DENUE_INVALID_RESPONSE'],
  ['network error',async()=>{throw Error('https://secret-token/');},'DENUE_UNAVAILABLE'],
  ['object response',async()=>json({error:'bad token'}),'DENUE_INVALID_RESPONSE'],
  ['oversize',async()=>new Response('x',{headers:{'content-length':'2000001'}}),'DENUE_RESPONSE_TOO_LARGE']
])test('DENUE '+name+' is explicit and sanitized',async()=>{await assert.rejects(client(fetcher).search(),e=>e.code===code&&!e.message.includes('secret-token'));});
test('DENUE timeout aborts request',async()=>{
  await assert.rejects(client((_u,{signal})=>new Promise((_r,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout')))),{timeoutMs:5}).search(),/DENUE_TIMEOUT/);
});
test('empty response is legitimate; volume and rate limits are bounded',async()=>{
  const c=client(async()=>json([]),{limitPerMinute:1});assert.deepEqual(await c.search(),[]);await assert.rejects(c.search(),/DENUE_RATE_LIMIT/);
  await assert.rejects(client(async()=>json([])).search('',101),/DENUE_QUERY_INVALID/);
});
test('normalization never infers WhatsApp, descriptions, images or source update date',()=>{
  const c=normalizeDenue(row({Telefono:'',Sitio_internet:'javascript:alert(1)',Fecha_Alta:'2020-01'}));
  const draft=denueDraft(c);for(const key of ['phone','whatsapp','description','schedule','image'])assert.equal(draft[key],'');
  assert.equal(c.sourceUpdatedAt,'');assert.equal(c.sourceRegisteredAt,'2020-01');assert.equal(c.website,'');
  assert.deepEqual(draft.gallery,[]);assert.equal(normalizeDenue(row({Latitud:''})).latitude,null);
});
for(const code of ['040030002','040030086','040020001','090030001',''])test('rejects or quarantines geography '+code,()=>{
  assert.notEqual(normalizeDenue(row({AreaGeo:code})).geography,'VERIFICADA');
});
test('conflicting locality is not accepted on name Carmen alone',()=>assert.notEqual(normalizeDenue(row({Ubicacion:'Isla Aguada, Carmen, CAMPECHE'})).geography,'VERIFICADA'));
test('missing identifiers and names rejected; Ficha mismatch and deleted source rejected',async()=>{
  for(const r of [row({Id:'abc'}),row({Nombre:''}),null])assert.throws(()=>normalizeDenue(r));
  await assert.rejects(client(async()=>json([row({Id:'2'})])).ficha('1'),/DENUE_SOURCE_MISMATCH/);
  await assert.rejects(client(async()=>json([])).ficha('1'),/DENUE_SOURCE_MISMATCH/);
});
test('duplicates by DENUE ID, CLEE, name/address; distinct branches and incomplete matches',()=>{
  const c=normalizeDenue(row());
  for(const b of [{denue:{denueId:c.denueId}},{denue:{clee:c.clee}},{name:c.name,address:c.address}])assert.equal(classifyDenueDuplicate(c,[b]),'DUPLICADO CONFIRMADO');
  assert.equal(classifyDenueDuplicate(c,[{name:c.name,phone:c.phone,address:'Otra calle'}]),'POSIBLE DUPLICADO');
  assert.equal(classifyDenueDuplicate(c,[{name:c.name,phone:'9380000002',address:'Otra calle'}]),'NUEVO');
  assert.equal(classifyDenueDuplicate(c,[{name:'Nombre distinto',phone:c.phone,address:'Otra calle'}]),'NUEVO');
});

const columns=['id','name','category','subcategory','description','address','colonia','phone','whatsapp','email','website','facebook','instagram','schedule','image','rating','reviews_count','verified','featured','status','raw_data'];
const serialize=r=>({...JSON.parse(r.raw_data||'{}'),...Object.fromEntries(Object.entries(r).filter(([k])=>k!=='raw_data'))});
async function harness(){
  const state={rows:[],cache:[],inserts:0,commits:0,fail:false,readFail:false,readbackBad:false,enabled:true,area:'040030001',fichaWrong:false,lostCommit:false};
  let tail=Promise.resolve();
  const store=createStagingBusinessStore({canWrite:()=>state.enabled,serialize,verifyIsolation:async()=>({ok:true,code:'SYNTHETIC'}),getConnection:async()=>{
    let release,working;
    return {async query(sql,params=[]){
      if(sql==='SELECT DATABASE() AS db_name')return [[{db_name:'u293982346_encarmentest'}]];
      if(sql.includes('information_schema.TABLES'))return [[{ENGINE:'InnoDB'}]];
      if(sql.includes('information_schema.STATISTICS'))return [[{COLUMN_NAME:'id',NON_UNIQUE:0,SEQ_IN_INDEX:1}]];
      if(sql.startsWith('SELECT GET_LOCK')){const prev=tail;tail=new Promise(r=>release=r);await prev;return [[{acquired:1}]];}
      if(sql.startsWith('SELECT RELEASE_LOCK')){release?.();release=null;return [[{released:1}]];}
      if(sql==='SELECT * FROM businesses ORDER BY id ASC')return [structuredClone(working)];
      if(sql.startsWith('INSERT INTO businesses')){if(state.fail)throw Error('SYNTHETIC SQL failure');state.inserts++;working.push(Object.fromEntries(columns.map((c,i)=>[c,params[i]])));return [{affectedRows:1}];}
      if(sql.startsWith('SELECT * FROM businesses WHERE id = ?'))return [state.readbackBad?[]:structuredClone(working.filter(r=>String(r.id)===String(params[0])))];
      throw Error('UNEXPECTED SQL');
    },async beginTransaction(){working=structuredClone(state.rows);},async commit(){state.rows=working;state.commits++;if(state.lostCommit){state.lostCommit=false;throw Error('Lost COMMIT acknowledgement');}},async rollback(){working=null;},release(){release?.();}};
  }});
  const app=express();app.use(express.json());
  const auth=registerAdminSecurity(app,{provider:{accounts:[],authenticate:async username=>({username,permissions:username==='owner'?['business:publish']:['business:manage']})},writesReady:()=>state.enabled});
  // Execute the real staging guard, not a rewritten permission expression.
  const source=fs.readFileSync(new URL('../server.ts',import.meta.url),'utf8');
  const guard=source.slice(source.indexOf('// Staging safety & write protection'),source.indexOf('// 1. REGLA GEOIP'));
  vm.runInNewContext(transformSync(guard,{loader:'ts'}).code,{app,isStagingEnvironment:()=>true,isBusinessWritePermitted:()=>state.enabled,
    adminSecurity:auth,getPrivateStagingSnapshot:()=>({ENC_ADMIN_MUTATIONS_ENABLED:state.enabled?'true':'false'})});
  const c=client(async url=>json([row({AreaGeo:state.area,...(state.fichaWrong&&url.includes('/Ficha/')?{Nombre:'OTRA EMPRESA'}:{})})]),{limitPerMinute:1000});
  const radar=createDenueRadar({client:c,authorized:req=>auth.isAuthorized(req,'business:publish'),canWrite:()=>state.enabled,
    readAll:async()=>{if(state.readFail)throw Error('SQL unavailable');return state.rows.map(serialize);},
    create:(...args)=>store.create(...args),publishCache:b=>{if(!state.cache.some(x=>x.id===b.id))state.cache.push(b);}});
  app.get('/api/business-radar/denue',radar.search);
  app.post('/api/businesses/approve-candidate',radar.single);app.post('/api/businesses/approve-multiple-candidates',radar.batch);
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const request=async(path,method='GET',body,token)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}`+path,{method,headers:{'Content-Type':'application/json',...(token?{'X-Encarmen-Admin-Token':token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
  const login=async username=>(await request('/api/admin/login','POST',{username,password:'Synthetic-password-only'})).body.token;
  const token=await login('owner');let revision;const search=async()=>{const result=await request('/api/business-radar/denue','GET',undefined,token);revision=result.body.candidates?.[0]?.revision;return result;};
  const approve=()=>request('/api/businesses/approve-candidate','POST',{candidate:{denueId:row().Id,revision},sourceReviewed:true},token);
  return {state,token,login,request,search,approve,getRevision:()=>revision,close:()=>new Promise(r=>server.close(r))};
}
test('HTTP real auth and staging guard: no token/forged/limited identity cannot search or approve',async()=>{
  const h=await harness();try{for(const token of [undefined,'f'.repeat(64),await h.login('limited')]){
    assert.ok([401,403].includes((await h.request('/api/business-radar/denue','GET',undefined,token)).status));
    assert.ok([401,403].includes((await h.request('/api/businesses/approve-candidate','POST',{candidate:{denueId:row().Id}},token)).status));
  }assert.equal(h.state.inserts,0);}finally{await h.close();}
});
test('HTTP search only, explicit review, commit, independent readback and retry without duplicate insert',async()=>{
  const h=await harness();try{assert.equal((await h.search()).status,200);assert.equal(h.state.inserts,0);
    assert.equal((await h.request('/api/businesses/approve-candidate','POST',{candidate:{denueId:row().Id}},h.token)).status,422);
    const first=await h.approve();assert.equal(first.status,200);assert.equal(h.state.inserts,1);assert.equal(h.state.commits,1);
    assert.equal(first.body.business.whatsapp,'');assert.equal(first.body.business.description,'');assert.equal(h.state.cache.length,1);
    const repeat=await h.approve();assert.equal(repeat.body.replayed,true);assert.equal(h.state.inserts,1);
    assert.equal((await h.search()).body.candidates[0].duplicate,'DUPLICADO CONFIRMADO');
  }finally{await h.close();}
});
for(const kind of ['fail','readbackBad','readFail','fichaWrong'])test('HTTP fail closed '+kind+' without public cache mutation',async()=>{
  const h=await harness();try{await h.search();h.state[kind]=true;const r=await h.approve();assert.ok([422,503].includes(r.status));assert.equal(r.body.success,false);assert.equal(h.state.cache.length,0);}finally{await h.close();}
});
test('HTTP disabled write window blocks approvals but preserves authenticated discovery',async()=>{
  const h=await harness();try{h.state.enabled=false;assert.equal((await h.search()).status,200);assert.ok([403,503].includes((await h.approve()).status));assert.equal(h.state.inserts,0);}finally{await h.close();}
});
test('HTTP incomplete/outside geography cannot publish',async()=>{
  const h=await harness();try{h.state.area='040030002';await h.search();assert.equal((await h.approve()).status,422);assert.equal(h.state.inserts,0);}finally{await h.close();}
});
test('HTTP mixed batch reports each outcome; rejects unselected/unknown and repeated IDs',async()=>{
  const h=await harness();try{await h.search();const r=await h.request('/api/businesses/approve-multiple-candidates','POST',{candidates:[{denueId:row().Id,revision:h.getRevision(),sourceReviewed:true},{denueId:row().Id,revision:h.getRevision(),sourceReviewed:true},{denueId:'1234',sourceReviewed:true}]},h.token);
    assert.equal(r.status,207);assert.equal(r.body.confirmed.length,1);assert.equal(r.body.failed.length,2);assert.equal(h.state.inserts,1);
  }finally{await h.close();}
});
test('HTTP concurrent approvals use transactional lock and stable idempotency key',async()=>{
  const h=await harness();try{await h.search();const results=await Promise.all([h.approve(),h.approve()]);
    assert.ok(results.every(r=>r.status===200),JSON.stringify(results));assert.equal(h.state.inserts,1);assert.equal(h.state.rows.length,1);
    assert.equal(denueRequestId(row().Id),denueRequestId(row().Id));
  }finally{await h.close();}
});

 test('HTTP lost COMMIT acknowledgement does not claim success; retry reads the one committed record',async()=>{
 const h=await harness();try{await h.search();h.state.lostCommit=true;assert.equal((await h.approve()).status,503);assert.equal(h.state.cache.length,0);assert.equal(h.state.rows.length,1);const retry=await h.approve();assert.equal(retry.status,200);assert.equal(retry.body.replayed,true);assert.equal(h.state.inserts,1);}finally{await h.close();}
 });
 test('HTTP stale reviewed snapshot is rejected before SQL',async()=>{
 const h=await harness();try{await h.search();const r=await h.request('/api/businesses/approve-candidate','POST',{candidate:{denueId:row().Id,revision:'outdated'},sourceReviewed:true},h.token);assert.equal(r.status,422);assert.equal(h.state.inserts,0);}finally{await h.close();}
 });
