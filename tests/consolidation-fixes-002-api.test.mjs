import test from 'node:test';import assert from 'node:assert/strict';
import {submitBusinessRegistration,sendBusinessReport,sendClassifiedReport} from '../src/services/api.ts';
const business={name:'Empresa sintética',phone:'2223334455',whatsapp:'5556667788'},key='7904b558-02c8-455f-a594-4147e84d7651';const row={...business,id:991,status:'published'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
for(const [name,response,uncertain]of [
 ['400 contractual',()=>json({success:false,error:'VALIDATION_FAILED'},400),false],
 ['409 contractual',()=>json({success:false,error:'BUSINESS_DUPLICATE'},409),false],
 ['500 posterior a posible COMMIT',()=>json({success:false,writeMayHaveSucceeded:false},500),true],
 ['502 no JSON',()=>new Response('gateway',{status:502}),true],
 ['200 incompleto',()=>json({success:true}),true],
 ['200 no JSON',()=>new Response('invalid'),true],
 ['400 no verificable',()=>new Response('invalid',{status:400}),true],
 ['timeout',()=>{throw new DOMException('timeout','AbortError')},true],
 ['desconexión posterior al envío',()=>{throw Error('lost acknowledgement')},true]])test('H03 '+name,async()=>{
 const native=globalThis.fetch;const calls=[];globalThis.fetch=async(url,opts)=>{calls.push({url,opts});return response();};
 try{const result=await submitBusinessRegistration(business,key);assert.equal(result.success,false);assert.equal(result.writeMayHaveSucceeded,uncertain);assert.equal(calls[0].opts.headers['Idempotency-Key'],key);assert.equal(JSON.parse(calls[0].opts.body).whatsapp,business.whatsapp);}finally{globalThis.fetch=native;}
});
test('H03 lectura posterior fallida y replay conservan UUID, sin insertar de nuevo (servidor simulado)',async()=>{
 const native=globalThis.fetch;let stored=false,insertions=0,readable=false;const keys=[];
 globalThis.fetch=async(url,opts)=>{if(opts?.method==='POST'){keys.push(opts.headers['Idempotency-Key']);if(!stored){stored=true;insertions++;}return json({success:true,business:row,directoryVisible:true,replayed:insertions===1&&keys.length>1});}if(!readable)return json({},503);return String(url).includes('/991?')?json({success:true,business:row}):json({businesses:[row]});};
 try{const uncertain=await submitBusinessRegistration(business,key);assert.equal(uncertain.success,false);assert.equal(uncertain.writeMayHaveSucceeded,true);readable=true;const retry=await submitBusinessRegistration(business,key);assert.equal(retry.success,true);assert.equal(retry.replayed,true);assert.equal(insertions,1);assert.deepEqual(keys,[key,key]);}finally{globalThis.fetch=native;}
});
for(const [name,send]of [['negocio',sendBusinessReport],['clasificado',sendClassifiedReport]])test('H04 '+name+' solo acepta confirmación del servidor y nunca crea éxito/borrador local',async()=>{
 const native=globalThis.fetch,previous=globalThis.localStorage;let writes=0;globalThis.localStorage={getItem(){throw Error('storage denied')},setItem(){writes++;throw Error('storage denied')}};
 try{for(const response of [()=>json({success:false},401),()=>json({success:false},403),()=>json({success:false},500),()=>new Response('not-json'),()=>json({}),()=>json({success:false}),()=>{throw Error('offline')}]){globalThis.fetch=async()=>response();assert.equal((await send({reason:'wrong_info',comment:'Texto que debe permanecer',classifiedId:'synthetic',classifiedTitle:'Ficticio'})).success,false);}assert.equal(writes,0);globalThis.fetch=async()=>json({success:true,message:'Servidor confirmó',report:{id:'synthetic'}});assert.equal((await send({reason:'wrong_info'})).success,true);}finally{globalThis.fetch=native;globalThis.localStorage=previous;}
});
test('H04 un borrador histórico local nunca acredita envío remoto',async()=>{
 const native=globalThis.fetch,previous=globalThis.localStorage;const draft='[{"id":"local-draft","status":"pending"}]';let value=draft;globalThis.localStorage={getItem:()=>value,setItem:(_key,next)=>value=next};globalThis.fetch=async()=>new Response('{}',{status:403});try{assert.equal((await sendBusinessReport({reason:'wrong_info'})).success,false);assert.equal((await sendClassifiedReport({reason:'wrong_info',classifiedId:'synthetic',classifiedTitle:'Ficticio'})).success,false);assert.equal(value,draft);}finally{globalThis.fetch=native;globalThis.localStorage=previous;}
});
