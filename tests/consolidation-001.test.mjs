import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
import express from 'express';
import React,{act} from 'react';
import {JSDOM} from 'jsdom';
import {administrativeWritesReady} from '../src/server/consolidatedWritePolicy.ts';
import {loadComponent} from './contacts-r2.test.mjs';

const source=readFileSync(new URL('../server.ts',import.meta.url),'utf8');
const run=(text,context)=>vm.runInNewContext(transformSync(text,{loader:'ts',format:'cjs'}).code,context);

test('la habilitación administrativa nunca concede escrituras generales ni operaciones fuera de Staging',()=>{
 const ready={mutationsEnabled:true,isStaging:true,businessWrites:true};
 for(const req of [{path:'/api/submit-business',method:'POST'},{path:'/api/businesses/1081',method:'PATCH'},{path:'/businesses/1081',method:'PATCH'}]){
  assert.equal(administrativeWritesReady(req,ready),true);
  for(const field of Object.keys(ready))assert.equal(administrativeWritesReady(req,{...ready,[field]:false}),false);
 }
 for(const [path,method] of [['/api/admin/banner-and-logo','POST'],['/api/mariadb/sync-catalog','POST'],['/api/upload-logo','POST'],['/api/businesses/1081','DELETE'],['/api/events','POST'],['/api/public/business-registrations','POST']])assert.equal(administrativeWritesReady({path,method},ready),false,path);
});

test('sondeo real sustituye catálogo vacío y detecta cambios sin firma; un fallo SQL no confirma caché antigua',async()=>{
 let rows=[{id:1081,phone:'2223334455'}],failed=false,calls=0;
 const context={businessesCache:[{id:9999}],cachedDbSignature:{lastUpdate:'same',total:1},lastDbPollTime:0,DB_POLL_INTERVAL_MS:20000,isMariaDbActive:()=>true,dbLoadAllBusinesses:async strict=>{assert.equal(strict,true);calls++;if(failed)throw Error('synthetic SQL failure');return structuredClone(rows);}};
 const start=source.indexOf('async function refreshBusinessesFromDbIfNeeded(');run(source.slice(start,source.indexOf('\n}',start)+2),context);
 await context.refreshBusinessesFromDbIfNeeded();assert.equal(context.businessesCache[0].phone,'2223334455');
 rows=[{id:1081,phone:'3334445566'}];context.lastDbPollTime=0;await context.refreshBusinessesFromDbIfNeeded();assert.equal(context.businessesCache[0].phone,'3334445566');
 rows=[];context.lastDbPollTime=0;await context.refreshBusinessesFromDbIfNeeded();assert.equal(context.businessesCache.length,0);
 failed=true;context.businessesCache=[{id:1081}];context.lastDbPollTime=0;await context.refreshBusinessesFromDbIfNeeded();assert.equal(context.businessesCache.length,1);
 await assert.rejects(context.refreshBusinessesFromDbIfNeeded(true),/synthetic SQL failure/);assert.equal(calls,5);
});

test('baja heredada: SQL fallido o lectura contradictoria devuelven error sin alterar caché',async()=>{
 const app=express();let mode='false',read=0;const original={id:1081,name:'Sintético'};
 const context={app,businessesCache:[original],cachedDbSignature:null,refreshBusinessesFromDbIfNeeded:async()=>{},dbDeleteBusiness:async()=>{if(mode==='throw')throw Error('synthetic failure');return mode!=='false';},dbLoadAllBusinesses:async strict=>{read++;assert.equal(strict,true);return mode==='confirmed'?[]:[original];}};
 const start=source.indexOf("app.delete(['/api/businesses/:id'");run(source.slice(start,source.indexOf('\n});',start)+4),context);
 const server=await new Promise(resolve=>{const value=app.listen(0,'127.0.0.1',()=>resolve(value));});
 try{
  for(mode of ['false','throw','mismatch']){const response=await fetch(`http://127.0.0.1:${server.address().port}/api/businesses/1081`,{method:'DELETE'});assert.equal(response.status,503);assert.equal((await response.json()).success,false);assert.equal(context.businessesCache.length,1);}
  assert.equal(read,1);
  mode='confirmed';const response=await fetch(`http://127.0.0.1:${server.address().port}/api/businesses/1081`,{method:'DELETE'});assert.equal(response.status,200);assert.equal((await response.json()).success,true);assert.equal(context.businessesCache.length,0);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('ficha montada en viewport sintético móvil: enlaces seguros, contactos independientes, galería, fallback de mapa y retorno',async()=>{
 const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'https://encarmen.test'});Object.defineProperty(dom.window,'innerWidth',{value:390});
 // jsdom no tiene motor de layout: ancho sintético para probar consentimiento, no geometría visual.
 Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{configurable:true,get:()=>320});
 const saved={};for(const key of ['window','document','navigator','HTMLElement','localStorage','sessionStorage','Event','MouseEvent','Image']){saved[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:dom.window[key]});}
 const nativeFetch=globalThis.fetch;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 globalThis.fetch=async(url)=>{assert.ok(String(url).startsWith('/api/'));return new Response(JSON.stringify({success:true,businessId:1081,stats:{average:0,count:0},average:0,count:0}));};
 const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));let back=0;
 try{
  const {BusinessPublicDetail}=await loadComponent('src/components/BusinessPublicDetail.tsx');
  const business={id:1081,name:'Ficha sintética',categories:['Servicios'],phone:'2223334455',whatsapp:'',description:'Consulta https://example.test/video.mp4 javascript:alert(1)',image:'/uploads/synthetic-one.jpg',gallery:['/uploads/synthetic-two.jpg'],latitude:19,longitude:-91,mapsUrl:'https://www.google.com/maps/search/?api=1&query=19,-91',logo_url:'/uploads/synthetic-logo.png'};
  await act(async()=>root.render(React.createElement(BusinessPublicDetail,{business,onBack:()=>back++,modal:true})));
  const container=document.getElementById('root');assert.ok(container.querySelector('a[href="tel:+522223334455"]'));assert.equal(container.querySelector('a[href^="https://wa.me/"]'),null);
  const link=container.querySelector('a[href="https://example.test/video.mp4"]');assert.ok(link);assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);assert.equal(container.querySelector('a[href^="javascript:"]'),null);
  assert.equal(container.querySelector('iframe'),null);
  await act(async()=>[...container.querySelectorAll('button')].find(button=>button.textContent.includes('Ver todas las fotos')).click());assert.ok(container.querySelector('[aria-label="Galería del negocio"]'));
  await act(async()=>container.querySelector('[aria-label="Foto siguiente"]').click());
  await act(async()=>container.querySelector('[aria-label="Cerrar galería"]').click());assert.equal(container.querySelector('[aria-label="Galería del negocio"]'),null);
  assert.equal(container.querySelector('iframe'),null);assert.match(container.textContent,/Vista incrustada no disponible/);assert.ok(container.querySelector('a[href^="https://www.google.com/maps/search/"]'));
  await act(async()=>container.querySelector('[aria-label="Cerrar ficha"]').click());assert.equal(back,1);
 }finally{await act(async()=>root.unmount());globalThis.fetch=nativeFetch;for(const key in saved){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];}dom.window.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
