import {test as base,expect} from '@playwright/test';
export {expect};
export const business={id:900001,name:'Taller Sintético E2E',slug:'taller-sintetico-e2e',status:'published',description:'Servicios de prueba automatizada. https://example.test/catalogo',categories:['Servicios'],category:'Servicios',categorySlugs:['servicios'],address:'Calle de prueba 1',colonia:'Centro',phone:'9380000001',whatsapp:'9380000002',image:'/e2e-fixture.svg',gallery:[],payment:'Efectivo',delivery:'Atención en el Local de la empresa'};
export const ad={id:'e2e-anuncio-1',title:'Taladro sintético de prueba',description:'Artículo sintético para pruebas del navegador sin usuarios reales.',category:'compra-venta',subcategory:'articulos-electronica',status:'active',createdAt:new Date().toISOString(),price:450,currency:'MXN',priceType:'fixed',phone:'9380000003',whatsapp:'9380000004',contactName:'Contacto sintético',contactMethods:['phone','whatsapp'],colonia:'Centro',location:'Ciudad del Carmen',images:[],image:''};
export const test=base.extend({lab:async({page},use,testInfo)=>{
 const state={businesses:[structuredClone(business),{...business,id:900002,name:'Panadería Sintética E2E',slug:'panaderia-sintetica',categories:['Alimentos'],category:'Alimentos',categorySlugs:['alimentos']}],ads:[structuredClone(ad)],requests:[],unknown:[],external:[],errors:[],mode:'ok',catalogMode:'ok',postMode:'ok',delay:0};
 page.on('pageerror',e=>state.errors.push(e.message));
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin!=='http://127.0.0.1:4173'){state.external.push(u.origin);return route.abort('blockedbyclient');}
  if(!u.pathname.startsWith('/api/')){
   if(/\.(png|jpg|jpeg|webp|svg)$/i.test(u.pathname))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#cbd5e1"/><text x="40" y="180" font-size="28">Imagen sintética E2E</text></svg>'});
   return route.continue();
  }
  state.requests.push({method:req.method(),path:u.pathname,body:req.postData(),key:req.headers()['idempotency-key']});
  const json=(body,status=200)=>route.fulfill({status,json:body});
  if(u.pathname==='/api/businesses'){
   if(state.catalogMode==='abort')return route.abort('connectionfailed');
   if(state.catalogMode==='500')return json({success:false},500);
   return json({success:true,total:state.businesses.length,businesses:state.businesses});
  }
  if(u.pathname.startsWith('/api/businesses/')){const b=state.businesses.find(b=>String(b.id)===u.pathname.split('/').pop()||b.slug===u.pathname.split('/').pop());return json({success:!!b,business:b},b?200:404);}
  if(u.pathname==='/api/public/classifieds'){
   if(req.method()==='GET'){
    if(state.delay)await new Promise(r=>setTimeout(r,state.delay));
    if(state.mode==='abort')return route.abort('connectionfailed');
    if(state.mode==='nonjson')return route.fulfill({status:200,contentType:'text/html',body:'<h1>Error sintético</h1>'});
    if(['403','500'].includes(state.mode))return json({success:false,message:'Rechazo sintético'},Number(state.mode));
    return json({success:true,total:state.ads.length,classifieds:state.ads});
   }
   if(state.delay)await new Promise(r=>setTimeout(r,state.delay));
   if(state.postMode==='abort')return route.abort('connectionfailed');
   if(state.postMode==='nonjson')return route.fulfill({status:502,contentType:'text/html',body:'Error de proxy sintético'});
   if(['403','500'].includes(state.postMode))return json({success:false,message:'Publicación rechazada por fixture'},Number(state.postMode));
   const payload=req.postDataJSON();const created={...ad,...payload,id:'e2e-nuevo',phone:payload.contactPhone,whatsapp:payload.contactWhatsapp};state.ads.unshift(created);return json({success:true,classified:created,ownerToken:'synthetic_owner_token_1234567890',message:'Anuncio confirmado por fixture'},201);
  }
  if(u.pathname==='/api/public/business-registrations'){
   if(state.delay)await new Promise(r=>setTimeout(r,state.delay));
   if(state.postMode==='abort')return route.abort('connectionfailed');
   if(state.postMode==='nonjson')return route.fulfill({status:502,body:'Proxy sintético'});
   if(['403','500'].includes(state.postMode))return json({success:false,message:'Registro rechazado por fixture'},Number(state.postMode));
   const b={...business,...req.postDataJSON(),id:900003,slug:'nuevo-e2e',status:'published',categories:['Servicios']};state.businesses.push(b);return json({success:true,directoryVisible:true,business:b},201);
  }
  const known={
   '/api/version':{version:'E2E-sintético'},'/api/maintenance':{success:true,maintenance:{enabled:false}},
   '/api/categories':{total:2,allCategories:[{id:1,name:'Servicios',slug:'servicios',parent:0},{id:2,name:'Alimentos',slug:'alimentos',parent:0}],topCategories:[]},
   '/api/stats':{totalBusinesses:2,totalCategories:2,withWhatsapp:2,withPhone:2},
   '/api/ratings':{success:true,stats:{},ratings:{}},'/api/promotions':{success:true,promotions:[],count:0},
   '/api/newest-businesses':{success:true,businesses:[]},'/api/check-duplicate':{isDuplicate:false},'/api/analytics/track':{success:true}
  };
  if(Object.hasOwn(known,u.pathname))return json(known[u.pathname]);
  if(u.pathname.startsWith('/api/ratings/'))return json({success:true,stats:{count:0,average:0},reviews:[]});
  state.unknown.push(u.pathname);return json({success:false,message:'API no modelada por el arnés'},503);
 });
 await use(state);
 await testInfo.attach('fixture-requests.json',{body:JSON.stringify(state,null,2),contentType:'application/json'});
}});
export async function home(page){await page.goto('/');await expect(page.getByRole('heading',{name:'Directorio de Empresas'})).toBeVisible();}
export async function classifieds(page){await page.getByRole('button',{name:'Clasificados',exact:true}).click();await expect(page.getByPlaceholder('Buscar por puesto, producto, colonia o palabra clave...')).toBeVisible();}
export async function openAdForm(page){await classifieds(page);await page.getByRole('button',{name:/Publicar Vacante o Anuncio/}).click();await expect(page.getByRole('dialog')).toBeVisible();}
export async function fillAd(page){const d=page.getByRole('dialog');await d.getByPlaceholder('Ej. Técnico en mantenimiento industrial o Chevrolet Aveo 2018').fill('Anuncio sintético nuevo');await d.locator('textarea').fill('Descripción sintética suficientemente extensa para publicación.');await d.getByPlaceholder('Ej. Juan Pérez / Taller El Carmen').fill('Contacto sintético');await d.getByPlaceholder('9381234567').first().fill('9380000003');return d;}
export async function register(page){await page.getByRole('button',{name:/Subir Mi Negocio/i}).click();await expect(page.getByPlaceholder('Ej. Antojitos La Manigua, Brio Cleaner, Taller El Carmen')).toBeVisible();}
export async function fillBusiness(page){await register(page);await page.getByPlaceholder('Ej. Antojitos La Manigua, Brio Cleaner, Taller El Carmen').fill('Negocio Sintético Nuevo');await page.locator('select').first().selectOption({label:'Servicios'});await page.getByPlaceholder('Ej. 938 123 4567').fill('9380000005');await page.getByPlaceholder('Ej. 938 987 6543').fill('9380000006');await page.getByPlaceholder('Buscar colonia...').fill('Centro');await page.getByRole('button',{name:/^Centro/}).first().click();await page.getByPlaceholder('Ej. Calle 31 #145 entre 36 y 38').fill('Calle sintética 2');}
