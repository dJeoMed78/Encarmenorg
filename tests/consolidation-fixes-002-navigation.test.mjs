import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync}from'node:fs';import {transformSync}from'esbuild';
const source=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8'),compile=s=>transformSync(s,{loader:'tsx',format:'cjs'}).code,drain=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const A={id:1,slug:'alpha',phone:'2223334455',whatsapp:'5556667788'},B={id:2,slug:'beta',phone:'3334445566'};let state={landing:A,selected:A,list:[A,B],status:'ready'},slug='alpha';const pending=[],handlers={};
 const setter=k=>value=>state[k]=typeof value==='function'?value(state[k]):value;
 const context={AbortController,useCallback:fn=>fn,setActiveTab(){},setBusinessesReload(){},businessRequestVersion:{current:0},businessRequestController:{current:null},businessesList:[],getBusinessSlugFromUrl:()=>slug,findBusinessInList:(list,key)=>list.find(b=>b.slug===key),setLandingBusiness:setter('landing'),setSelectedBusiness:setter('selected'),setDigitalCardBusiness(){},setBusinessesStatus:setter('status'),setBusinessesList:setter('list'),setBusinessOverrides(){},adminUpdateBusiness:async()=>({success:true,business:{...A,phone:'4445556677',whatsapp:'7778889900'}}),window:{location:{pathname:'/alpha'},history:{pushState(_a,_b,url){context.window.location.pathname=url;slug=url.replace(/^\//,'');},replaceState(_a,_b,url){context.window.location.pathname=url;slug=url.replace(/^\//,'');}},scrollTo(){},addEventListener:(name,fn)=>handlers[name]=fn,removeEventListener:name=>delete handlers[name]},fetch:(url,options)=>new Promise((resolve,reject)=>pending.push({url,options,resolve,reject})),console};
 vm.createContext(context);const run=s=>vm.runInContext(compile(s),context);
 const a=source.indexOf('  const invalidateBusinessRequests ='),b=source.indexOf('\n  }, []);',a)+12;run(source.slice(a,b)+';globalThis.invalidateBusinessRequests=invalidateBusinessRequests;');
 const start=source.indexOf('    let navigationController: AbortController | null = null;'),end=source.indexOf('\n  }, [businessesList]);',start);const cleanup=run('(function(){'+source.slice(start,end)+'})()');
 const saveStart=source.indexOf('  const handleSaveBusiness ='),saveEnd=source.indexOf('\n  const handleSelectNavbarFilter',saveStart);
 const save=run('(function(){const landingBusiness='+JSON.stringify(A)+';const selectedBusiness='+JSON.stringify(A)+';'+source.slice(saveStart,saveEnd)+';return handleSaveBusiness;})()');
 return {A,B,context,pending,save,state:()=>state,run,cleanup,navigate:key=>{slug=key;context.window.location.pathname=key?'/'+key:'/';handlers.popstate();},select:key=>{slug=key;context.window.location.pathname='/'+key;},reply:(index,business)=>pending[index].resolve({ok:true,json:async()=>({business})})};
}
test('H02 GET anterior al guardado no restaura teléfono ni WhatsApp viejos',async()=>{
 const h=setup();h.navigate('alpha');const response=await h.save(1,{});assert.equal(response.success,true);assert.equal(h.pending[0].options.signal.aborted,true);h.reply(0,h.A);await drain();assert.equal(h.state().landing.phone,'4445556677');assert.equal(h.state().landing.whatsapp,'7778889900');h.cleanup();
});
test('H02 cambios rápidos y Back/Forward descartan respuestas fuera de orden',async()=>{
 const h=setup();h.navigate('alpha');h.navigate('beta');h.reply(1,h.B);await drain();h.reply(0,h.A);await drain();assert.equal(h.state().landing.id,2);h.navigate(null);assert.equal(h.state().landing,null);h.cleanup();
});
test('H02 un fallo antiguo no borra una ficha posterior',async()=>{
 const h=setup();h.navigate('alpha');h.navigate('beta');h.reply(1,h.B);await drain();h.pending[0].reject(Error('old failure'));await drain();assert.equal(h.state().landing.id,2);h.cleanup();
});
test('H02 desmontaje aborta e ignora respuesta tardía aunque fetch ignore abort',async()=>{
 const h=setup();h.navigate('alpha');h.cleanup();const before=h.state().landing;h.reply(0,h.A);await drain();assert.equal(h.pending[0].options.signal.aborted,true);assert.equal(h.state().landing,before);
});
test('H02 abrir otra ficha invalida detalle pendiente',async()=>{
 const h=setup();h.navigate('alpha');const start=source.indexOf('  const openBusinessLanding ='),end=source.indexOf('\n  // Negocios con calificaciones',start);const open=h.run('(function(){'+source.slice(start,end)+';return openBusinessLanding;})()');open(h.B);h.reply(0,h.A);await drain();assert.equal(h.state().landing.id,2);h.cleanup();
});
test('H02 guardado de A no modifica ficha/modal B ni su ruta si usuario ya navegó',async()=>{
 const h=setup();h.navigate('beta');h.reply(0,h.B);await drain();h.context.setSelectedBusiness(h.B);await h.save(1,{});assert.equal(h.state().landing.id,2);assert.equal(h.state().selected.id,2);assert.equal(h.context.window.location.pathname,'/beta');h.cleanup();
});
test('H02 catálogo pendiente queda invalidado tras guardado confirmado',async()=>{
 const h=setup();const a=source.indexOf('    let alive = true;',source.indexOf('const businessRequestVersion')),b=source.indexOf('\n  }, [businessesReload]);',a);const cleanup=h.run('(function(){'+source.slice(a,b)+'})()');await h.save(1,{});h.pending[0].resolve({ok:true,json:async()=>({businesses:[h.A,h.B]})});await drain();assert.equal(h.state().list[0].phone,'4445556677');assert.equal(h.state().landing.whatsapp,'7778889900');cleanup();h.cleanup();
});
test('H02 URL actual prevalece sobre slug inicial inyectado tras navegar y volver al directorio',()=>{
 const a=source.indexOf('function getBusinessSlugFromUrl'),b=source.indexOf('\nfunction findBusinessInList',a);assert.ok(a>=0&&b>a);const window={location:{pathname:'/beta',search:''},__INITIAL_BUSINESS_SLUG__:'alpha'};const get=vm.runInNewContext(compile(source.slice(a,b)+';getBusinessSlugFromUrl;'),{window,URLSearchParams});assert.equal(get(),'beta');window.location.pathname='/';assert.equal(get(),null);window.location.pathname='/empresa/991';assert.equal(get(),'991');window.location.search='?empresa=alpha';assert.equal(get(),'alpha');
});
