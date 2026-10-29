import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createClassifiedsService,registerPublicClassifieds,validateClassifiedInput} from '../src/server/publicClassifieds.ts';
import {FakePool} from './support/classifiedsMemoryPool.mjs';
import {submitBusinessRegistration,sendBusinessReport,sendClassifiedReport,createPublicClassified,updatePublicClassified,deletePublicClassified,fetchPublicClassifieds} from '../src/services/api.ts';
const business={name:'Empresa sintética local',phone:'2223334455',whatsapp:'5556667788'};
const input={title:'Bicicleta sintética local',description:'Prueba aislada de anuncio ficticio.',category:'compra-venta',price:100,contactPhone:'2223334455',contactWhatsapp:'5556667788',idempotencyKey:'local-key-123456',subcategory:'bazar-electronica',colonia:'Ciudad del Carmen Centro',location:'Ciudad del Carmen, Campeche',priceType:'negotiable',currency:'MXN',deliveryCondition:'delivery',contactMethods:['phone','whatsapp'],contactName:'Persona sintética'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
function storage(){const values=new Map();return {values,getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}
test('H03: 400/500/502/no JSON/desconexión y lectura fallida conservan incertidumbre e idempotencia',async()=>{
 const native=globalThis.fetch;const key=crypto.randomUUID();const seen=[];
 try{
  for(const [response,uncertain] of [[()=>json({message:'invalid'},400),false],[()=>json({},500),true],[()=>new Response('gateway',{status:502}),true],[()=>new Response('not JSON'),true],[()=>{throw Error('lost acknowledgement')},true]]){
   globalThis.fetch=async(url,options)=>{seen.push(options.headers['Idempotency-Key']);return response();};
   const result=await submitBusinessRegistration(business,key);assert.equal(result.success,false);assert.equal(result.writeMayHaveSucceeded,uncertain);
  }
  const row={...business,id:991,status:'published'};
  globalThis.fetch=async(url,options)=>{if(options?.method==='POST'){seen.push(options.headers['Idempotency-Key']);return json({success:true,directoryVisible:true,business:row});}return json({},503);};
  assert.equal((await submitBusinessRegistration(business,key)).writeMayHaveSucceeded,true);
  globalThis.fetch=async(url,options)=>{if(options?.method==='POST'){seen.push(options.headers['Idempotency-Key']);return json({success:true,directoryVisible:true,replayed:true,business:row});}return String(url).includes('/991?')?json({success:true,business:row}):json({businesses:[row]});};
  const confirmed=await submitBusinessRegistration(business,key);assert.equal(confirmed.success,true);assert.equal(confirmed.replayed,true);assert.ok(seen.every(v=>v===key));
 }finally{globalThis.fetch=native;}
});
test('H04: ambos reportes rechazan 401/403/500/no JSON/red sin éxito local',async()=>{
 const native=globalThis.fetch;const previous=globalThis.localStorage;const local=storage();globalThis.localStorage=local;
 try{for(const send of [sendBusinessReport,sendClassifiedReport]){for(const response of [()=>json({},401),()=>json({},403),()=>json({},500),()=>new Response('not JSON'),()=>json({success:false}),()=>{throw Error('offline')}]){globalThis.fetch=async()=>response();assert.equal((await send({reason:'wrong_info',classifiedId:'synthetic',classifiedTitle:'Sintético'})).success,false);}globalThis.fetch=async()=>json({success:true,message:'Confirmed'});assert.equal((await send({reason:'wrong_info'})).success,true);}assert.equal(local.values.size,0);
 }finally{globalThis.fetch=native;globalThis.localStorage=previous;}
});
test('contrato cerrado: metadatos reales y contactos independientes, tipos y subcategoría inválidos',()=>{
 const normalized=validateClassifiedInput(input);assert.equal(normalized.details.subcategory,input.subcategory);assert.equal(normalized.contactWhatsapp,input.contactWhatsapp);
 for(const patch of [{subcategory:'subcategoria-inexistente'},{colonia:'Madrid'},{price:true},{videoUrl:'javascript:alert(1)'},{contactPhone:'abc2223334455'},{images:['data:image/png;base64,x']},{idempotencyKey:''}])assert.throws(()=>validateClassifiedInput({...input,...patch}),e=>e.status===400);
 const waOnly=validateClassifiedInput({...input,contactPhone:'',contactMethods:['whatsapp']});assert.equal(waOnly.contactPhone,'');assert.equal(waOnly.contactWhatsapp,input.contactWhatsapp);
});
test('titular: respuesta perdida se recupera solo con secreto independiente, nunca con idempotencia',async()=>{
 const pool=new FakePool({now:new Date()});const service=createClassifiedsService({pool});const proof='b'.repeat(64);
 const first=await service.create(input,proof);assert.equal(first.ownerToken,proof);
 const anonymousReplay=await service.create(input);assert.equal(anonymousReplay.ownerToken,'');assert.equal(anonymousReplay.ownerAccess,false);
 const replay=await service.create(input,proof);assert.equal(replay.ownerAccess,true);assert.equal(replay.ownerToken,'');assert.equal(pool.rows.size,1);
 await assert.rejects(service.update(first.classified.id,'c'.repeat(64),{title:'Ataque sintético'}),e=>e.status===403);
 const edited=await service.update(first.classified.id,proof,{price:null,title:'Título editado sintético'});assert.equal(edited.classified.price,null);assert.equal(edited.classified.whatsapp,input.contactWhatsapp);assert.equal(edited.classified.colonia,input.colonia);
 await service.update(first.classified.id,proof,{status:'sold'});assert.equal((await service.getActive()).total,0);
});
test('aislamiento: rechaza privilegios globales, otro esquema y producción',async()=>{
 for(const options of [{grants:'GRANT SELECT, INSERT, UPDATE ON *.* TO `lab`@`localhost`'},{grants:'GRANT SELECT, INSERT, UPDATE ON `other`.`public_classifieds` TO `lab`@`localhost`'},{database:'u293982346_encarmenapp'},{marker:'wrong'}])await assert.rejects(createClassifiedsService({pool:new FakePool(options)}).create(input),e=>e.status===503);
});
test('cliente real → router HTTP real: pérdida de respuesta, reintento, edición completa, retiro, límites y abuso (SQL simulado)',async()=>{
 const pool=new FakePool({now:new Date()});const app=express();registerPublicClassifieds(app,{pool});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base=`http://127.0.0.1:${server.address().port}`;
 const native=globalThis.fetch,previous=globalThis.localStorage;globalThis.localStorage=storage();let lost=true;let firstProof;
 globalThis.fetch=async(url,options)=>{assert.ok(String(url).startsWith('/api/'));if(options?.method==='POST'){const proof=options.headers['x-classified-owner-token'];assert.equal(globalThis.localStorage.getItem('encarmen_classified_pending_'+input.idempotencyKey),proof);if(firstProof)assert.equal(proof,firstProof);firstProof=proof;}const response=await native(base+url,options);if(lost&&options?.method==='POST'){lost=false;await response.text();throw Error('synthetic lost response');}return response;};
 try{
  const ad={...input,phone:input.contactPhone,whatsapp:input.contactWhatsapp};delete ad.contactPhone;delete ad.contactWhatsapp;
  assert.equal((await createPublicClassified(ad)).success,false);assert.equal(pool.rows.size,1);
  const retry=await createPublicClassified(ad);assert.equal(retry.success,true,retry.message);assert.equal(pool.rows.size,1);assert.equal(retry.classified.subcategory,input.subcategory);
  const updated=await updatePublicClassified(retry.classified.id,{title:'Edición desde cliente real',price:null,colonia:'Ciudad del Carmen Centro',phone:'2223334455',whatsapp:'5556667788'});assert.equal(updated.success,true,updated.message);assert.equal(updated.classified.price,null);
  assert.equal((await fetchPublicClassifieds()).total,1);assert.equal((await deletePublicClassified(retry.classified.id)).success,true);assert.equal((await fetchPublicClassifieds()).total,0);
  assert.equal((await native(base+'/api/public/classifieds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,description:'x'.repeat(17000)})})).status,413);
  let limited=false;for(let i=0;i<65;i++){const res=await native(base+'/api/public/classifieds',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(res.status===429){limited=true;break;}}assert.equal(limited,true);
 }finally{globalThis.fetch=native;globalThis.localStorage=previous;await new Promise(resolve=>server.close(resolve));}
});
test('concurrencia de servicio: clave única evita doble alta y diferencia conflicto; TTL de siete días',async()=>{
 const pool=new FakePool({now:new Date()}),service=createClassifiedsService({pool}),proof='d'.repeat(64);
 const attempts=await Promise.all(Array.from({length:8},()=>service.create(input,proof)));
 assert.equal(pool.rows.size,1);assert.equal(attempts.filter(r=>!r.duplicate).length,1);assert.ok(attempts.every(r=>r.ownerAccess));
 await assert.rejects(service.create({...input,title:'Contenido distinto sintético'},proof),e=>e.status===409);
 const row=[...pool.rows.values()][0];assert.ok(Math.abs(new Date(row.expires_at).getTime()-Date.now()-7*86400000)<3000);
 row.expires_at=new Date(pool.now.getTime()-1000);await assert.rejects(service.update(row.id,proof,{title:'No renovar expirado'}),e=>[409,410].includes(e.status));assert.equal((await service.getActive()).total,0);
});
test('filtros usan parámetros SQL antes del límite, sin interpolar términos de búsqueda',async()=>{
 const pool=new FakePool();const calls=[];const query=pool.query.bind(pool);pool.query=async(sql,params)=>{calls.push({sql,params});return query(sql,params);};
 await createClassifiedsService({pool}).getActive({q:"' OR 1=1 --",subcategory:'bazar-electronica',colonia:'Ciudad del Carmen Centro',category:'compra-venta'});
 const select=calls.find(c=>c.sql.startsWith('SELECT *'));assert.ok(select.sql.includes('LIMIT 200'));assert.ok(select.sql.indexOf('category = ?')<select.sql.indexOf('LIMIT 200'));assert.ok(select.params.includes("%' OR 1=1 --%"));assert.ok(!select.sql.includes("' OR 1=1 --"));
});
