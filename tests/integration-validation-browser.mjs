// Real Chromium, actual built React application; synthetic HTTP fixtures and SQL simulator explicitly.
import express from 'express';import {createServer} from 'node:http';import {resolve} from 'node:path';import {mkdirSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {registerPublicClassifieds} from '../src/server/publicClassifieds.ts';import {FakePool} from './support/classifiedsMemoryPool.mjs';
const {chromium}=await import(process.env.ENC_IV_PLAYWRIGHT_MODULE || 'playwright');
const output=resolve(process.argv[3]||'../iv-lab/browser');mkdirSync(output,{recursive:true});
const app=express(),pool=new FakePool({now:new Date()});registerPublicClassifieds(app,{pool});
const rows=[{id:991,name:'Negocio Alfa Sintético',slug:'alfa-sintetico',category:'Servicios',description:'Negocio ficticio para pruebas locales.',phone:'2223334455',whatsapp:'5556667788',status:'published',address:'Ubicación sintética',rating:4.5,ratingCount:2},{id:992,name:'Negocio Beta Sintético',slug:'beta-sintetico',category:'Servicios',phone:'2223334455',whatsapp:'',status:'published'}];
app.get('/api/businesses',(req,res)=>res.json({success:true,total:rows.length,businesses:rows}));
app.get('/api/businesses/:id',(req,res)=>{const business=rows.find(b=>String(b.id)===req.params.id||b.slug===req.params.id);res.status(business?200:404).json({success:!!business,business});});
app.all('/api/*',(req,res)=>{if(req.path.includes('version'))return res.json({version:'local-isolated'});if(req.path.includes('categories'))return res.json({total:0,topCategories:[],allCategories:[]});if(req.path.includes('reports'))return res.status(403).json({success:false});res.json({success:true,businesses:rows,total:rows.length,events:[],promotions:[],reports:[],classifieds:[]});});
app.use(express.static(resolve('../iv-lab/frontend')));app.get('*',(req,res)=>res.sendFile(resolve('../iv-lab/frontend/index.html')));
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base=`http://127.0.0.1:${server.address().port}`;
let browser;const errors=[],blocked=[],checks=[];
try{
 browser=await chromium.launch({executablePath:resolve(process.argv[2]),headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,LD_LIBRARY_PATH:resolve('../iv-lab/chromium/usr/lib/x86_64-linux-gnu')}});
 const context=await browser.newContext();await context.route('**/*',route=>{if(route.request().url().startsWith(base))return route.continue();blocked.push(route.request().url());return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const width of [320,360,390,834,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/clasificados');await page.getByRole('button',{name:'+ Publicar Vacante o Anuncio',exact:true}).click();
  await page.getByPlaceholder('Ej. Técnico en mantenimiento industrial o Chevrolet Aveo 2018').fill('Bicicleta de prueba sintética');
  await page.getByPlaceholder('Explica las características completas', {exact:false}).fill('Anuncio ficticio para prueba aislada del formulario.');
  const phones=page.getByPlaceholder('9381234567');await phones.nth(0).fill('2223334455');await phones.nth(1).fill('5556667788');
  assert.ok(await page.locator('input[type=file]').isDisabled());
  const overflow=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));assert.ok(overflow.document<=width+1,JSON.stringify({width,overflow}));
  await page.screenshot({path:output+`/classified-form-${width}.png`,fullPage:true});checks.push({width,form:true,overflow:false,uploadsDisabled:true});
  await page.getByRole('button',{name:'Cerrar modal',exact:true}).click();
 }
 await page.setViewportSize({width:390,height:900});await page.goto(base+'/alfa-sintetico');await page.getByText('Negocio Alfa Sintético',{exact:true}).first().waitFor();await page.screenshot({path:output+'/business-390.png',fullPage:true});
 assert.equal(errors.length,0,JSON.stringify(errors));writeFileSync(output+'/results.json',JSON.stringify({browser:'Chromium real',backend:'HTTP local / SQL simulator',checks,errors,blockedExternalRequests:blocked,productionAccessed:false},null,2));console.log(JSON.stringify({checks,errors,blocked:blocked.length},null,2));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
