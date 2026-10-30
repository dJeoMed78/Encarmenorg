import test from'node:test';import assert from'node:assert/strict';import{fetchReports,adminUpdateBusiness}from'../src/services/api.ts';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
test('reportes: colección remota válida, vacía y errores nunca usan históricos locales',async()=>{
 const native=globalThis.fetch,old=globalThis.localStorage;let stored='[{"id":"local-only","reason":"historic","status":"pending"}]',reads=0,writes=0;globalThis.localStorage={getItem(){reads++;return stored},setItem(){writes++},removeItem(){writes++}};
 try{for(const response of [()=>json({},401),()=>json({},403),()=>json({},500),()=>new Response('invalid'),()=>{throw Error('offline')},()=>json({total:2,reports:[]}),()=>json({total:1,reports:[null]})]){globalThis.fetch=async()=>response();const result=await fetchReports();assert.equal(result.status,'error');assert.equal(result.source,'unavailable');assert.equal(result.total,null);assert.deepEqual(result.reports,[]);assert.ok(result.message);}
 globalThis.fetch=async()=>json({total:1,reports:[{id:'remote-only',reason:'wrong_info',status:'pending'}]});let result=await fetchReports();assert.equal(result.status,'ready');assert.equal(result.source,'server');assert.equal(result.reports[0].id,'remote-only');
 globalThis.fetch=async()=>json({total:0,reports:[]});result=await fetchReports();assert.equal(result.status,'ready');assert.equal(result.total,0);assert.equal(reads,0);assert.equal(writes,0);assert.ok(stored.includes('local-only'));
 globalThis.localStorage={getItem(){throw Error('denied')}};globalThis.fetch=async()=>json({},403);assert.equal((await fetchReports()).status,'error');
 }finally{globalThis.fetch=native;globalThis.localStorage=old;}
});
test('edición cliente rechaza éxito falso, parcial y contactos no confirmados',async()=>{
 const native=globalThis.fetch,old=globalThis.sessionStorage;globalThis.sessionStorage={getItem:()=>null};
 try{for(const business of [{id:991},{id:991,phone:'',whatsapp:''},{id:992,phone:'2223334455',whatsapp:'5556667788'}]){globalThis.fetch=async()=>json({success:true,business});assert.equal((await adminUpdateBusiness(991,{phone:'2223334455'})).success,false);}
 globalThis.fetch=async()=>json({success:'true',business:{id:991,phone:'2223334455',whatsapp:'5556667788'}});assert.equal((await adminUpdateBusiness(991,{})).success,false);
 globalThis.fetch=async()=>json({success:true,business:{id:991,phone:'2223334455',whatsapp:'5556667788'}});assert.equal((await adminUpdateBusiness(991,{phone:'+52 2223334455'})).success,true);
 globalThis.fetch=async()=>json({success:true,business:{id:991,phone:'',whatsapp:'5556667788'}});assert.equal((await adminUpdateBusiness(991,{clearContacts:['phone']})).success,true);
 globalThis.fetch=async()=>json({success:true,business:{id:991,phone:'2223334455',whatsapp:'5556667788'}});assert.equal((await adminUpdateBusiness(991,{clearContacts:['phone']})).success,false);
 }finally{globalThis.fetch=native;globalThis.sessionStorage=old;}
});
test('PATCH cliente conserva omisión de canales, cambios independientes y rechazo HTTP',async()=>{
 const native=globalThis.fetch,old=globalThis.sessionStorage;globalThis.sessionStorage={getItem:()=>null};const bodies=[];let status=200;let record={id:991,phone:'2223334455',whatsapp:'5556667788'};globalThis.fetch=async(_url,opts)=>{bodies.push(JSON.parse(opts.body));return json({success:true,business:record},status);};
 try{assert.equal((await adminUpdateBusiness(991,{name:'Nombre sintético'})).success,true);assert.ok(!Object.hasOwn(bodies[0],'phone'));assert.ok(!Object.hasOwn(bodies[0],'whatsapp'));record={...record,whatsapp:'7778889900'};assert.equal((await adminUpdateBusiness(991,{whatsapp:'7778889900'})).success,true);assert.ok(!Object.hasOwn(bodies[1],'phone'));assert.equal(record.phone,'2223334455');assert.equal((await adminUpdateBusiness(991,{phone:'',whatsapp:null})).success,true);status=500;assert.equal((await adminUpdateBusiness(991,{phone:'9998887766'})).success,false);}finally{globalThis.fetch=native;globalThis.sessionStorage=old;}
});
