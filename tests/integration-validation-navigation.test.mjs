// Executes the actual App effects/handlers with controlled deferred HTTP, not a browser/DOM claim.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {transformSync} from 'esbuild';
const source=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const drain=()=>new Promise(resolve=>setImmediate(resolve));
const compile=s=>transformSync(s,{loader:'tsx',format:'cjs'}).code;
test('H02: Back/Forward B gana a respuesta tardía A incluso si el transporte ignora abort',async()=>{
 const pending=[],handlers={},version={current:0};let slug='alpha',landing;const list=[];
 const context={businessRequestController:{current:null},businessRequestVersion:version,AbortController,businessesList:list,getBusinessSlugFromUrl:()=>slug,findBusinessInList:()=>null,setLandingBusiness:value=>landing=value,setActiveTab(){},window:{location:{pathname:'/alpha'},addEventListener:(name,handler)=>handlers[name]=handler,removeEventListener(){}},fetch:(url,options)=>new Promise(resolve=>pending.push({url,options,resolve}))};
 const start=source.indexOf('    let navigationController: AbortController | null = null;');const end=source.indexOf('\n  }, [businessesList]);',start);
 const cleanup=vm.runInNewContext(compile('(function(){'+source.slice(start,end)+'})()'),context);
 handlers.popstate();slug='beta';context.window.location.pathname='/beta';handlers.popstate();assert.equal(pending[0].options.signal.aborted,true);
 pending[1].resolve({ok:true,json:async()=>({business:{id:2,name:'Beta'}})});await drain();assert.equal(landing.name,'Beta');
 pending[0].resolve({ok:true,json:async()=>({business:{id:1,name:'Alpha'}})});await drain();assert.equal(landing.name,'Beta');
 slug=null;context.window.location.pathname='/';handlers.popstate();assert.equal(landing,null);cleanup();
});
test('H02: catálogo pendiente no reemplaza alta confirmada al avanzar versión compartida',async()=>{
 let resolveRequest,list=['original'],status;const version={current:0};const context={AbortController,businessRequestController:{current:null},businessRequestVersion:version,setBusinessesStatus:value=>status=value,setBusinessesList:value=>list=value,setBusinessOverrides(){},getBusinessSlugFromUrl:()=>null,setLandingBusiness(){},setSelectedBusiness(){},fetch:()=>new Promise(resolve=>resolveRequest=resolve)};
 const start=source.indexOf('    let alive = true;',source.indexOf('const businessRequestVersion'));const end=source.indexOf('\n  }, [businessesReload]);',start);
 const cleanup=vm.runInNewContext(compile('(function(){'+source.slice(start,end)+'})()'),context);
 version.current++;context.businessRequestController.current.abort();list=['confirmed-new-business'];status='ready';
 resolveRequest({ok:true,json:async()=>({businesses:['stale-catalog']})});await drain();assert.deepEqual(list,['confirmed-new-business']);assert.equal(status,'ready');cleanup();
});

test('retiro UI espera confirmación, impide doble envío y conserva ficha en error',async()=>{
 const detail=readFileSync(new URL('../src/components/ClassifiedDetailModal.tsx',import.meta.url),'utf8');
 const start=detail.indexOf('                        if (deleteBusy.current || !onDelete)');
 const end=detail.indexOf('\n                      }}',start);assert.ok(start>0&&end>start);
 let resolve,reject,calls=0,closed=0,error='';const context={ad:{id:'synthetic'},deleteBusy:{current:false},setDeleting(){},setDeleteError:value=>error=value,onClose:()=>closed++,onDelete:()=>{calls++;return new Promise((yes,no)=>{resolve=yes;reject=no;});}};
 const handler=vm.runInNewContext(compile('(async function(){'+detail.slice(start,end)+'})'),context);
 const pending=handler();await handler();assert.equal(calls,1);assert.equal(closed,0);
 reject(new Error('Synthetic server failure'));await pending;assert.equal(closed,0);assert.ok(error);assert.equal(context.deleteBusy.current,false);
 const retry=handler();resolve();await retry;assert.equal(closed,1);assert.equal(calls,2);
});
