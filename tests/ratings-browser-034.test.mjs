import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)('playwright');import http from 'node:http';import fs from 'node:fs';
test('real Chromium: ratings distribution fits 320,390,834,1440px (synthetic API)',async()=>{
 const b=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{StarRatingWidget}from'./src/components/StarRatingWidget';createRoot(document.getElementById('root')).render(<StarRatingWidget businessId="synthetic" businessName="Prueba"/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,plugins:[{name:'synthetic',setup(b){b.onResolve({filter:/realRatings$/},()=>({path:'ratings',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`export const useBusinessRatings=()=>({summary:{average:4,count:2,distribution:{1:0,2:0,3:1,4:0,5:1},hasRated:false},loading:false,available:true,submitting:false,error:null,saved:false,rate:async()=>null,retry(){}});`,loader:'js'}))}}]});
 const dir=process.env.RATINGS_TEST_DIST||'/tmp/034-dist';const css=fs.readFileSync(dir+'/assets/'+fs.readdirSync(dir+'/assets').find(x=>x.endsWith('.css')));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':req.url==='/style.css'?'text/css':'text/html');res.end(req.url==='/app.js'?b.outputFiles[0].text:req.url==='/style.css'?css:'<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/app.js"></script>')}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));let browser;
 try{browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage();await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());for(const width of [320,390,834,1440]){await page.setViewportSize({width,height:900});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByLabel('Distribución de calificaciones').waitFor();assert.equal(await page.locator('progress').count(),5);
const layout=await page.evaluate(()=>{
 const panes=[...document.querySelectorAll('#root section > div > div')].filter(e=>e.className.includes('rounded-'));
 const grid=document.querySelector('#root section > div.grid');
 if(!grid || panes.length<2)return null;
 const a=panes[0].getBoundingClientRect(),b=panes[1].getBoundingClientRect();
 return {sideBySide:Math.abs(a.top-b.top)<5,barWidth:Math.max(...[...document.querySelectorAll('progress')].map(p=>p.getBoundingClientRect().width))};
});
assert.ok(layout,'paneles Glass presentes');
assert.equal(layout.sideBySide,width>=768,'distribución responsive para '+width+'px');
assert.ok(layout.barWidth<=241,'barras compactas');
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'sin overflow '+width);}}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
});
