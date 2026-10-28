# ENC-GLASS-EDITOR-001 — Checkpoints

## Inicio — 2026-10-28T03:15:13.510Z
- Estado EN_PROGRESO. Rama work/enc-glass-editor-001.
- Base/commit inicial: 6004ef637021ee0bea72f5c892a815696c1c8c13.
- Instrucciones tarea (blob): 672c823b4e6f3c2547289cdd72e3f60ecb09f832; generales: c4ef37ba0f690f60cd9fb5189190afd2be9a8faa; especificación ficha: 3f83c83a8cbf6239f779ad7361a0f00dd349b050.
- Alcance exclusivo: EditBusinessModal.tsx, WORK_RESULTADOS.md y este checkpoint. Copia local aislada desde base; sin incorporar calificaciones ni modificar archivos compartidos.
- Leídos contexto/anexos, coordinación y especificación. La referencia aprobada no está en GitHub; implementar especificación textual no equivale a coincidencia píxel a píxel. La especificación de ficha no amplía el alcance del editor.
- Hallazgos iniciales: defaults que sustituyen pagos/entrega/contactos/horarios, regex de horas defectuosa, falta de validación de contacto, selector de pagos con cinco opciones frente a cuatro chips del diseño, fallos de upload ocultos con fallback base64.
- Plan: seis tarjetas compactas Glass; preservar datos sin edición; validaciones/estados reales y controles accesibles; opciones avanzadas plegables. Mantener quinto pago histórico en opciones avanzadas sin modificar constantes compartidas.
- Pruebas aún no ejecutadas. Se prepara Chromium temporal para pruebas locales aisladas; sin conexiones a API/BD real.
- Siguiente hito: implementación y pruebas de consumidor. Sin SQL, despliegue, merge ni cambios a main/ia-desarrollo.

## Hito: implementación y pruebas reales de navegador — 2026-10-28T03:29:14.743Z
- Estado EN_PROGRESO. Commit anterior: cac638abb32569d57933a260bde7fa89e53ac48b.
- Rehecho EditBusinessModal dentro de su contrato de props: seis tarjetas Glass, ambiente azul/rosa, campos blancos, chips azules, horas/días, footer fuera del área desplazable, avanzados plegables y controles accesibles.
- Guardado por delta: datos no editados no se normalizan ni se reemplazan con defaults. Horario libre/alias y métodos desconocidos preservados. Quinto pago histórico en avanzados; no se cambian constantes compartidas.
- Contacto estricto, descripción 500 con conservación de legado no editado, permisos admin preservados, uploads con errores verdaderos (se detecta data URI de fallback del helper sin tocar api.ts), tamaños/límite de galería, protección ante respuestas de otra sesión/negocio.
- 36 comprobaciones iniciales Chromium reales PASAN con callbacks y upload simulados; se amplían controles de categorías/ciudad/tamaño/galería para cierre. Ninguna conexión real a API/BD.
- Capturas reales locales: 1440x1050, 834x1112, 390x844 y 320x700; sin desborde horizontal, footer visible y backdrop-filter efectivo. Falta comparación con imagen aprobada y Safari/iOS real.
- Tipado enfocado del editor/dependencias PASA. Build Vite completo PASA. tsc global falla por TS2339 preexistente de AdminEventsTab.tsx:1499, archivo reservado a coordinación: NO se modifica.
- Errores de preparación/prueba: descarga de Chromium de Playwright inválida; se usó binario temporal de paquete, sin cambiar dependencias del proyecto. Primera prueba detectó nombre accesible ambiguo en textarea (corregido); otra detectó carrera en reset del harness (corregida con cierre renderizado). No se presentan esos intentos como pruebas aprobadas.
- Siguiente hito: terminar batería ampliada, conservar evidencias, verificar diff de tres archivos y registrar resultados. Sin merge/rebase automático, despliegue ni SQL.

## Cierre — 2026-10-28T03:37:48.629Z
- Estado IMPLEMENTADO_SIN_VERIFICAR: frontend local probado, fidelidad exacta y persistencia real pendientes.
- Commit de implementación: 85d02e1d9e0d90c48dc0da7aeb370c903bfd8abc; el cierre añade evidencia completa y formato legible del componente.
- 40 comprobaciones Chromium 153.0.8010.0 APROBADAS; servidor estático solo en 127.0.0.1, peticiones upload interceptadas con respuestas sintéticas; sin errores JS ni solicitudes externas. No se inicia server.ts ni se llama BD.
- Tipado enfocado del editor/dependencias TypeScript 7.0.2 APROBADO. tsc global en base 6004ef6 FALLA solo por TS2339 de AdminEventsTab.tsx:1499; prohibido modificar ese archivo. Vite 8.3.5 completo APROBADO (1719 módulos), advertencia chunk >500kB. Sin npm run build/prebuild, sin cambios de versión.
- Nueve capturas reales de Chromium: inicio/horarios en escritorio 1440x1050, tablet 834x1112, móvil 390x844 y ancho reducido 320x700; más administración/fotos. Datos sintéticos visibles y sin BD.
- Evidencia: [ENC-GLASS-EDITOR-001-capturas.zip](https://chatgpt.com/library?file_id=libfile_94254a3a7a008191b23294484005dfaa&account_id=personal).
- Inspección visual propia: ambiente azul/rosa, blanco translúcido, campos legibles, pie visible al desplazar, cuatro pagos principales con quinto histórico en avanzados, sin superposición horizontal. No se afirma coincidencia con imagen no disponible ni validación Safari/iOS.
- Primera prueba falló al localizar una textarea por etiqueta ambigua: se corrigió su nombre accesible. Otra falló por el reset del harness (cierre/reapertura batidos en la misma actualización); se corrigió la fixture mediante flushSync y se repitió la batería completa. Intentos no aprobados documentados, sin presentarlos como integración.
- La descarga estándar de Chromium falló por ZIP inválido; la extracción de fonts del paquete alternativo dio EINVAL/chown. El ejecutable temporal ya extraído pudo arrancar y ejecutó realmente las pruebas. No se alteraron dependencias del repositorio.
- Campos no editados se omiten del PATCH: horarios/pagos/entrega/galería/categorías/contactos/slug y metadatos ajenos no se sustituyen con defaults. Datos desconocidos y categorías secundarias se conservan; no se inventan días ni ciudad. Descripción heredada >500 se conserva si no se edita; al editar rige límite 500.
- onSave debe confirmar success===true para cerrar. Fallo mantiene borrador; operaciones pendientes bloquean cierre/doble envío. Se ignoran respuestas viejas. Subidas requieren URL de servidor; data URI del helper compartido se trata como falta de confirmación. No se cambió api.ts.
- Carga de imágenes sigue usando servicio existente. Cancelar no puede borrar archivos que el servicio ya recibió; un lote parcialmente fallido puede dejar archivos sin asociar. No se implementa borrado remoto ni se prueba contra hosting. El borrado visual de foto/galería solo actualiza borrador hasta guardar.
- Ciudad es campo opcional adicional enviado solo si se edita; la ruta existente mezcla campos del PATCH y raw_data, revisado estáticamente. Persistencia de ese campo y aliases requiere prueba real autorizada.
- Referencia original, Safari/iOS, teclado móvil y persistencia/recarga con backend real pendientes. Permisos definitivos siguen siendo responsabilidad del backend existente.

### Concurrencia de coordinación
- Base original y única base de esta rama: 6004ef637021ee0bea72f5c892a815696c1c8c13.
- Durante ejecución ia-desarrollo avanzó a 1455e568a93629dcd7ae3f58df61d03c76a64f4d (merge PR #2 de coordinación, observado mediante lectura; NO realizado por Work en esta tarea).
- Sus cambios corresponden a calificaciones; EditBusinessModal.tsx conserva blob 00eeb741068d731988cf13b6ee49edd12182016b, idéntico al inicial.
- Sin rebase/merge automático ni incorporación de código de calificaciones. WORK_RESULTADOS se toma acumulativo desde el SHA concurrente para preservar entradas existentes al agregar esta tarea, sin modificar estados previos.
- La coordinación deberá revisar integración sobre su base actual y conciliar WORK_RESULTADOS, archivo documental compartido. No se infiere despliegue de ese merge.

### Comandos ejecutados
Copia de validación local aislada desde base original. Herramientas temporales: Node 24.22.1, TypeScript 7.0.2, Vite 8.3.5, esbuild 0.28.2, React 19.3.1, Playwright y Chromium temporal. Sin instalación npm ci del lockfile ni equivalencia afirmada con hosting.
```sh
# Desde la copia local de la rama, sin ejecutar scripts de arranque:
/tmp/enc-reviews-tools/node_modules/.bin/tsc --noEmit
/tmp/enc-reviews-tools/node_modules/.bin/tsc --project /tmp/enc-glass-validation/tsconfig.editor.json --noEmit
/tmp/enc-reviews-tools/node_modules/.bin/vite build --outDir /tmp/enc-glass-validation/vite-dist --emptyOutDir
/tmp/enc-reviews-tools/node_modules/.bin/esbuild /tmp/enc-glass-validation/harness.tsx --bundle --platform=browser --outfile=/tmp/enc-glass-validation/harness.js
node /tmp/enc-glass-validation/test-editor.cjs
```
tsconfig.editor.json se genera copiando compilerOptions del tsconfig original y files apuntando solo a EditBusinessModal.tsx (include/exclude vacíos). El compilador recorre sus dependencias reales, sin incluir componentes ajenos al editor.
Para repetir el harness, ajustar rutas absolutas a la copia local y a herramientas temporales, usar un Chromium local instalado y crear index.html estático con root y harness.js. El script no sirve la aplicación Express ni carga .env; solo sirve HTML/JS local y simula respuestas de upload/onSave.
Se formateó únicamente el archivo autorizado con Prettier temporal, incluido su CSS acotado, y se repitieron tipado/build/40 pruebas.

### Salida final del navegador
```text
PASS Seis tarjetas, cinco chips de entrega y cuatro de pago
PASS Opciones avanzadas inicialmente plegadas
PASS Horario estructurado carga días y horas reales
PASS WhatsApp ausente no se rellena con teléfono
PASS Chromium desktop 1440x1050: panel/footer visibles, sin desborde horizontal, blur real
PASS Chromium tablet 834x1112: panel/footer visibles, sin desborde horizontal, blur real
PASS Chromium mobile 390x844: panel/footer visibles, sin desborde horizontal, blur real
PASS Chromium narrow 320x700: panel/footer visibles, sin desborde horizontal, blur real
PASS Pie permanece visible al desplazar el contenido
PASS Clic exterior no cierra durante selección de texto
PASS Foco de teclado contenido dentro del diálogo
PASS Guardado rechazado conserva borrador; sin editar envía delta vacío
PASS Falla de red mantiene edición visible
PASS Sin teléfono ni WhatsApp válido no se invoca guardado
PASS Teléfono largo no se trunca para convertirlo en válido
PASS Normalización explícita +52 sin inventar WhatsApp
PASS Horario libre, pagos, entrega, categorías, multimedia y campos desconocidos no se sobrescriben al editar nombre
PASS Horario semanal incompleto se rechaza sin persistencia
PASS Edición semanal explícita y cierre al día siguiente
PASS Conservar horario original elimina conversión pendiente
PASS Descripción limitada a 500 con contador
PASS Descripción heredada larga se conserva si no fue editada
PASS Chips azules multiselección conservan métodos adicionales
PASS Quinto pago disponible en avanzados; usuario normal no envía privilegios
PASS Admin conserva edición de enlace/distintivos sin reescribir historial
PASS Upload 503 detecta fallback data URI del helper sin cambiar imagen
PASS Upload confirmado actualiza imagen en borrador y payload
PASS Quitar foto conserva galería
PASS Eliminar una foto de galería conserva logotipo
PASS Archivo no permitido se rechaza antes de upload
PASS Cambiar categoría principal conserva categorías secundarias
PASS Ciudad se envía solo al editar sin inventar valor inicial
PASS Límite de galería no recorta ni sustituye fotos existentes
PASS Imagen mayor de 5 MB se rechaza antes de upload
PASS Guardado pendiente bloquea cierre y doble envío
PASS Diálogo cierra únicamente tras success=true confirmado por callback
PASS Refresco de objeto mismo ID no destruye borrador
PASS Respuesta de guardado de otro negocio no cierra el nuevo editor
PASS Escape sin operación pendiente cierra y restaura scroll
PASS Sin errores JavaScript ni solicitudes a servicios externos
RESULTADO: 40 comprobaciones Chromium aprobadas. Callbacks/upload simulados; sin backend/BD/Staging.
```

### SHA-256 de capturas
```json
{
  "admin-avanzados.png": "77cde04fa9faf43f853258cfd2ca06644e90e5df923ce50f91c57a98af98d86d",
  "desktop-horarios.png": "fc3be207570030accbd7f4461ac37de0df4b5988a0d3f2fb16f61ef3807b0b2f",
  "desktop.png": "0033c7c8ecc465e898f3633051ece8a57e1ec4bc4fc72271f4b919907113d953",
  "mobile-horarios.png": "b259b1be7249bec7683910f9b508cbf6f751d1d3298b4b2a352f07c2e1330be5",
  "mobile.png": "7306eacfab1ca3ec527e624bdd5b0e5909f7da4bb4d0df3a3b4a27bdd9ad1694",
  "narrow-horarios.png": "067b76e96f356557ff9d74a2cfeb57b21dc2f7decbbe56df0507a65c6cf77dd8",
  "narrow.png": "5981dce996a914d1ddc7fc6513e56a07aeb6a6226eb82dbd9e29c4204794dd45",
  "tablet-horarios.png": "99354d60be5c7f18f03b320b7e38e5b5a75d7d654d36bd7efa607a3b2a1a443e",
  "tablet.png": "ec01893c0cfb42a9711d66ad06a2e9199e3d5fe14c8e764a9c338bd203c2b0d3"
}
```

### Harness reproducible (datos sintéticos, no incorporar a producción)
```tsx
import React from '/tmp/enc-reviews-tools/node_modules/react/index.js';
import { flushSync } from '/tmp/enc-reviews-tools/node_modules/react-dom/index.js';
import { createRoot } from '/tmp/enc-reviews-tools/node_modules/react-dom/client.js';
import { EditBusinessModal } from '/workspace/scratch/e1cd9bd12722/glass-editor-001/src/components/EditBusinessModal';
const picture='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#7c96bb"/><text x="60" y="74" text-anchor="middle" fill="white" font-family="sans-serif" font-size="42">E</text></svg>');
const fixture={id:4242,name:'Estudio de prueba local',category:'Servicios',categories:['Servicios','Categoría secundaria'],description:'Datos sintéticos para revisar el editor. Esta vista funciona sin conexión a Staging ni producción.',phone:'9381234567',whatsapp:'',address:'Dirección de prueba',colonia:'Colonia heredada de prueba',city:'Ciudad de prueba',postalCode:'',schedule:'Lun, Mar, Mié, Jue, Vie 09:00 - 18:00',payment:'Efectivo, Tarjetas de Débito y Crédito, Vales de prueba',delivery:'Atención en el Local de la empresa, Servicio a domicilio con costo',image:picture,gallery:[picture,picture],slug:'estudio-local',previousSlugs:['anterior-local'],previousNames:['Nombre anterior'],isTopBusiness:true,isRecommended:true,unknownField:'preservar en servidor'};
const state={calls:[] as any[],closes:0,mode:'error',resolve:null as null|((value:any)=>void)};
function App(){
 const [business,setBusiness]=React.useState<any>(fixture),[open,setOpen]=React.useState(true),[admin,setAdmin]=React.useState(false);
 React.useEffect(()=>{(window as any).glassTest={state,fixture,reset:(changes={},isAdmin=false)=>{state.calls=[];state.closes=0;state.mode='error';flushSync(()=>setOpen(false));setTimeout(()=>{setBusiness({...fixture,...changes});setAdmin(isAdmin);setOpen(true)},0)},refresh:(changes:any)=>setBusiness((b:any)=>({...b,...changes})),replace:(changes:any)=>setBusiness({...fixture,...changes}),setMode:(mode:string)=>{state.mode=mode},open:()=>setOpen(true)};},[]);
 return <><div className="validation-notice">PRUEBA LOCAL · DATOS SINTÉTICOS · SIN BD</div><EditBusinessModal business={business} isOpen={open} isAdmin={admin} categories={[{id:1,name:'Servicios',slug:'servicios',count:0},{id:2,name:'Comercio',slug:'comercio',count:0}]} onClose={()=>{state.closes++;setOpen(false)}} onSave={async(id,payload)=>{state.calls.push({id,payload});if(state.mode==='pending')return await new Promise(resolve=>{state.resolve=resolve});if(state.mode==='throw')throw new Error('Falla de red simulada');return {success:state.mode==='success',message:'Error simulado: no se confirmó el guardado.'};}} /></>;
}
createRoot(document.getElementById('root')!).render(<App/>);
```

### Pruebas reproducibles
```javascript
const assert=require('node:assert/strict');const http=require('node:http');const fs=require('node:fs');
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let checks=0;const pass=s=>{checks++;console.log('PASS',s)};
(async()=>{
 const server=http.createServer((req,res)=>{if(req.url==='/harness.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync('/tmp/enc-glass-validation/harness.js'));}else if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('/tmp/enc-glass-validation/index.html'));}else{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[],blocked=[];page.on('pageerror',e=>errors.push(e.message));
 let uploadMode='error',pendingUpload=null;
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.pathname==='/api/upload-logo'){if(uploadMode==='pending'){pendingUpload=route;return;}return route.fulfill({status:uploadMode==='success'?200:503,contentType:'application/json',body:JSON.stringify(uploadMode==='success'?{success:true,url:'/uploaded-test.png'}:{success:false,message:'Falla simulada de imagen'})});}if(url.hostname!=='127.0.0.1'){blocked.push(url.hostname);return route.abort();}return route.continue();});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.getByRole('dialog').waitFor();
 const reset=async(changes={},admin=false)=>{await page.evaluate(({changes,admin})=>window.glassTest.reset(changes,admin),{changes,admin});await page.getByRole('dialog').waitFor();await page.waitForTimeout(35);};
 const setMode=mode=>page.evaluate(m=>window.glassTest.setMode(m),mode);
 const calls=()=>page.evaluate(()=>window.glassTest.state.calls);
 const save=()=>page.getByRole('button',{name:'Guardar Cambios',exact:true}).click();
 const advanced=async()=>{const x=page.locator('details');if(!await x.getAttribute('open')){await x.locator('summary').click();}};
 assert.equal(await page.locator('.enc-glass-card').count(),6);assert.equal(await page.locator('.enc-glass-delivery button').count(),5);assert.equal(await page.locator('.enc-glass-payments button').count(),4);pass('Seis tarjetas, cinco chips de entrega y cuatro de pago');
 assert.equal(await page.locator('details').getAttribute('open'),null);pass('Opciones avanzadas inicialmente plegadas');
 assert.equal(await page.getByLabel('Atención Lun',{exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.getByLabel('Apertura',{exact:true}).inputValue(),'09:00');pass('Horario estructurado carga días y horas reales');
 assert.equal(await page.getByLabel('WhatsApp (10 dígitos)',{exact:true}).inputValue(),'');pass('WhatsApp ausente no se rellena con teléfono');
 for(const [name,width,height] of [['desktop',1440,1050],['tablet',834,1112],['mobile',390,844],['narrow',320,700]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const layout=await page.evaluate(()=>{const panel=document.querySelector('.enc-glass-dialog').getBoundingClientRect(),footer=document.querySelector('.enc-glass-footer').getBoundingClientRect(),scroll=document.querySelector('.enc-glass-scroll');return {panel:{x:panel.x,y:panel.y,right:panel.right,bottom:panel.bottom},footer:{y:footer.y,bottom:footer.bottom},window:{w:innerWidth,h:innerHeight},overflow:scroll.scrollWidth>scroll.clientWidth+1,blur:getComputedStyle(document.querySelector('.enc-glass-dialog')).backdropFilter};});
  assert(layout.panel.x>=0&&layout.panel.right<=width+1&&layout.panel.bottom<=height+1&&layout.footer.bottom<=height+1);assert(!layout.overflow);assert.notEqual(layout.blur,'none');
  await page.screenshot({path:`/tmp/enc-glass-validation/${name}.png`});await page.locator('.enc-glass-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({path:`/tmp/enc-glass-validation/${name}-horarios.png`});await page.locator('.enc-glass-scroll').evaluate(e=>e.scrollTop=0);pass(`Chromium ${name} ${width}x${height}: panel/footer visibles, sin desborde horizontal, blur real`);
 }
 await page.setViewportSize({width:1440,height:1050});
 const footerBefore=await page.locator('.enc-glass-footer').boundingBox();await page.locator('.enc-glass-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);const footerAfter=await page.locator('.enc-glass-footer').boundingBox();assert(Math.abs(footerBefore.y-footerAfter.y)<1);pass('Pie permanece visible al desplazar el contenido');
 await page.mouse.click(4,300);assert.equal(await page.getByRole('dialog').count(),1);pass('Clic exterior no cierra durante selección de texto');
 await page.getByRole('button',{name:'Cerrar editor'}).focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Guardar Cambios');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Cerrar editor');pass('Foco de teclado contenido dentro del diálogo');
 await reset();await save();await page.getByRole('alert').waitFor();assert.equal((await calls()).length,1);assert.deepEqual((await calls())[0].payload,{});assert.equal(await page.getByRole('dialog').count(),1);pass('Guardado rechazado conserva borrador; sin editar envía delta vacío');
 await page.getByLabel('Nombre del negocio *',{exact:true}).fill('Nombre editado');await setMode('throw');await save();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Nombre del negocio *',{exact:true}).inputValue(),'Nombre editado');assert.match(await page.getByRole('alert').innerText(),/red simulada/);pass('Falla de red mantiene edición visible');
 await reset({phone:'',whatsapp:''});await save();assert.equal((await calls()).length,0);assert.match(await page.getByRole('alert').innerText(),/10 dígitos/);pass('Sin teléfono ni WhatsApp válido no se invoca guardado');
 await reset();await page.getByLabel('Teléfono (10 dígitos)',{exact:true}).fill('123456789012345');await save();assert.equal((await calls()).length,0);pass('Teléfono largo no se trunca para convertirlo en válido');
 await page.getByLabel('Teléfono (10 dígitos)',{exact:true}).fill('+52 938 123 4567');await save();assert.equal((await calls())[0].payload.phone,'9381234567');assert(!Object.hasOwn((await calls())[0].payload,'whatsapp'));pass('Normalización explícita +52 sin inventar WhatsApp');
 await reset({schedule:'Lunes 8 a 12; miércoles solo con cita',payment:'Vales especiales',delivery:'Servicio acordado',openingHours:'Texto alternativo',phone:'+52 938 123 4567',whatsapp:''});await page.getByLabel('Nombre del negocio *',{exact:true}).fill('Otro nombre');await save();const untouched=(await calls())[0].payload;assert.deepEqual(untouched,{name:'Otro nombre'});pass('Horario libre, pagos, entrega, categorías, multimedia y campos desconocidos no se sobrescriben al editar nombre');
 await reset({schedule:'Horario libre heredado'});await page.getByLabel('Atención Lun',{exact:true}).click();await save();assert.equal((await calls()).length,0);pass('Horario semanal incompleto se rechaza sin persistencia');
 await page.getByLabel('Apertura',{exact:true}).fill('22:00');await page.getByLabel('Cierre',{exact:true}).fill('02:00');await save();assert.equal((await calls())[0].payload.schedule,'Lun 22:00 - 02:00');pass('Edición semanal explícita y cierre al día siguiente');
 await reset({schedule:'Lunes a Viernes 08:30 - 17:45'});await page.getByLabel('Atención Sáb',{exact:true}).click();await page.getByRole('button',{name:'Conservar horario original'}).click();await save();assert(!Object.hasOwn((await calls())[0].payload,'schedule'));pass('Conservar horario original elimina conversión pendiente');
 await reset();await page.getByLabel('Descripción del negocio',{exact:true}).fill('x'.repeat(501));assert.equal((await page.getByLabel('Descripción del negocio',{exact:true}).inputValue()).length,500);assert.match(await page.locator('.enc-glass-count').innerText(),/500\/500/);pass('Descripción limitada a 500 con contador');
 await reset({description:'x'.repeat(550)});await save();assert(!Object.hasOwn((await calls())[0].payload,'description'));pass('Descripción heredada larga se conserva si no fue editada');
 await reset();await page.getByRole('button',{name:'CoDi / QR',exact:true}).click();assert.equal(await page.getByRole('button',{name:'CoDi / QR',exact:true}).getAttribute('aria-pressed'),'true');await save();assert.match((await calls())[0].payload.payment,/Vales de prueba/);pass('Chips azules multiselección conservan métodos adicionales');
 await reset();await advanced();assert.equal(await page.getByRole('checkbox',{name:'Empresa TOP',exact:true}).count(),0);await page.getByRole('button',{name:'Pago contra entrega',exact:true}).click();await save();assert.match((await calls())[0].payload.payment,/Pago contra entrega/);assert(!Object.hasOwn((await calls())[0].payload,'isTopBusiness'));assert(!Object.hasOwn((await calls())[0].payload,'slug'));pass('Quinto pago disponible en avanzados; usuario normal no envía privilegios');
 await reset({},true);await advanced();await page.getByLabel('Enlace personalizado',{exact:true}).fill('Nueva Ruta');await page.getByRole('checkbox',{name:'Empresa TOP',exact:true}).uncheck();await page.locator('.enc-glass-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({path:'/tmp/enc-glass-validation/admin-avanzados.png'});await save();assert.equal((await calls())[0].payload.slug,'nuevaruta');assert.equal((await calls())[0].payload.isTopBusiness,false);assert(!Object.hasOwn((await calls())[0].payload,'previousSlugs'));pass('Admin conserva edición de enlace/distintivos sin reescribir historial');
 await reset();await advanced();const originalImage=await page.getByLabel('URL de fotografía o logotipo',{exact:true}).inputValue();const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6f8AAAAASUVORK5CYII=','base64');await page.getByLabel('Subir fotografía o logotipo',{exact:true}).setInputFiles({name:'prueba.png',mimeType:'image/png',buffer:png});await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/No se confirmó la carga/);assert.equal(await page.getByLabel('URL de fotografía o logotipo',{exact:true}).inputValue(),originalImage);pass('Upload 503 detecta fallback data URI del helper sin cambiar imagen');
 uploadMode='success';await page.getByLabel('Subir fotografía o logotipo',{exact:true}).setInputFiles({name:'prueba.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.querySelector('input[aria-label="Subir fotografía o logotipo"]').disabled===false&&document.querySelector('.enc-glass-logo').getAttribute('src')==='/uploaded-test.png');await save();assert.equal((await calls())[0].payload.image,'/uploaded-test.png');pass('Upload confirmado actualiza imagen en borrador y payload');
 await reset();await advanced();await page.getByRole('button',{name:'Quitar foto',exact:true}).click();await save();assert.equal((await calls())[0].payload.image,'');assert(!Object.hasOwn((await calls())[0].payload,'gallery'));pass('Quitar foto conserva galería');
 await reset();await advanced();await page.getByRole('button',{name:'Quitar foto de galería 1',exact:true}).click();await save();assert.equal((await calls())[0].payload.gallery.length,1);assert(!Object.hasOwn((await calls())[0].payload,'image'));pass('Eliminar una foto de galería conserva logotipo');
 await reset();await advanced();await page.getByLabel('Subir fotos de galería',{exact:true}).setInputFiles({name:'script.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/5 MB/);pass('Archivo no permitido se rechaza antes de upload');
 await reset();await page.getByLabel('Categoría',{exact:true}).selectOption('Comercio');await save();assert.deepEqual((await calls())[0].payload.categories,['Comercio','Categoría secundaria']);pass('Cambiar categoría principal conserva categorías secundarias');
 await reset();await page.getByLabel('Ciudad',{exact:true}).fill('Ciudad editada de prueba');await save();assert.deepEqual((await calls())[0].payload,{city:'Ciudad editada de prueba'});pass('Ciudad se envía solo al editar sin inventar valor inicial');
 await reset();await advanced();await page.getByLabel('Subir fotos de galería',{exact:true}).setInputFiles(Array.from({length:9},(_,i)=>({name:`extra${i}.png`,mimeType:'image/png',buffer:png})));await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/galería admite 10/);assert.equal(await page.locator('.enc-glass-gallery img').count(),2);pass('Límite de galería no recorta ni sustituye fotos existentes');
 await reset();await advanced();await page.getByLabel('Subir fotografía o logotipo',{exact:true}).setInputFiles({name:'grande.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024+1)});await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/5 MB/);pass('Imagen mayor de 5 MB se rechaza antes de upload');
 await reset();await setMode('pending');await save();assert.equal(await page.getByRole('button',{name:'Cerrar editor'}).isDisabled(),true);await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),1);await page.evaluate(()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal((await calls()).length,1);pass('Guardado pendiente bloquea cierre y doble envío');await page.evaluate(()=>window.glassTest.state.resolve({success:true,message:'Confirmado por mock'}));await page.getByRole('dialog').waitFor({state:'hidden'});pass('Diálogo cierra únicamente tras success=true confirmado por callback');
 await reset();await page.getByLabel('Nombre del negocio *',{exact:true}).fill('Borrador activo');await page.evaluate(()=>window.glassTest.refresh({description:'Refresco concurrente'}));assert.equal(await page.getByLabel('Nombre del negocio *',{exact:true}).inputValue(),'Borrador activo');pass('Refresco de objeto mismo ID no destruye borrador');
 await setMode('pending');await save();await page.evaluate(()=>window.glassTest.replace({id:4243,name:'Otro registro local'}));await page.getByLabel('Nombre del negocio *',{exact:true}).waitFor();await page.waitForTimeout(40);await page.evaluate(()=>window.glassTest.state.resolve({success:true,message:'Respuesta vieja'}));await page.waitForTimeout(40);assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.getByLabel('Nombre del negocio *',{exact:true}).inputValue(),'Otro registro local');pass('Respuesta de guardado de otro negocio no cierra el nuevo editor');
 await reset();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.body.style.overflow),'');pass('Escape sin operación pendiente cierra y restaura scroll');
 assert.equal(errors.length,0);assert.equal(blocked.length,0);pass('Sin errores JavaScript ni solicitudes a servicios externos');
 console.log('RESULTADO:',checks,'comprobaciones Chromium aprobadas. Callbacks/upload simulados; sin backend/BD/Staging.');
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),100)});
```

### Rollback y dictamen
Descartar rama o revertir commits mediante commits normales, sin force push; esta tarea no cambia datos ni requiere rollback SQL. No revertir la integración ajena de calificaciones.
APTO para revisión de implementación y capturas locales. No validado como reproducción exacta de referencia ni como persistencia real; no integrado ni desplegado. Esperar revisión de coordinación.

## Revisión secuencial sin rediseño — inicio 2026-10-28T12:26:53.790Z
Instrucción directa: revisar, no sustituir diseño por PR#3. HEAD Work d49ec7004874a0004bf2cf8f03a67bd8b7a89de0; ia actual cad1222618c94f4eb3dabb589b6e58836191dcb7; PR#3 abierto/no integrado. Comparación diverged, Work3 commits propios/10 detrás. Archivos de la rama: solo editor y dos docs. Fuente Work d80a5a83871f129b7c033343be859c5410830cc9 vs ia00eeb741068d731988cf13b6ee49edd12182016b; NO son el mismo editor. Imagen original específica del editor no disponible en esta tarea; referencia de ficha pública no sustituye esa aprobación. No se alterará código ni se hará reemplazo automático.
Plan: prueba de compatibilidad TypeScript con consumidores actuales en copia aislada, render comparativo sintético y pruebas de callbacks/horarios/contacto/uploads, sin App/servicio/BD/SQL. Findings y recomendaciones documentados únicamente en archivos autorizados. Nueva sección de logo en otra rama NO se copiará ni mezclará con este editor.

## ENC-GLASS-EDITOR-001 — auditoría comparativa sin rediseño (2026-10-28T12:56:25.086Z)
Estado AUDITORÍA COMPLETADA / PRUEBAS LOCALES EJECUTADAS / 7 HALLAZGOS. Sin nuevo código funcional; NO INTEGRADO/NO DESPLEGADO.
Rama work/enc-glass-editor-001. HEAD de código revisado d49ec7004874a0004bf2cf8f03a67bd8b7a89de0, checkpoint de esta revisión b9ecd08e3ddf7a9077df49b37b7106695f01a4d0. ia-desarrollo vigente cad1222618c94f4eb3dabb589b6e58836191dcb7.
PR#3 abierto/no integrado al revisar; rama Work divergía con3 commits propios y10 detrás. No se aplicó PR#3, no se sustituyó el editor aprobado.
Fuentes: Work src/components/EditBusinessModal.tsx d80a5a83871f129b7c033343be859c5410830cc9; ia00eeb741068d731988cf13b6ee49edd12182016b. Se mantienen sin modificación.
Leídas instrucciones de tarea672c823b4e6f3c2547289cdd72e3f60ecb09f832 y ENC-UI-GLASS-001 (especificación de ficha pública, no sustituto de imagen original de editor). Prevalece orden actual de auditar/no rediseñar. La referencia original específica de editor no estaba disponible; no se afirma coincidencia pixel a pixel.

### Pruebas y método
- Copia aislada con consumidores actuales de ia y SOLO la implementación Work de editor sustituida para comprobar contrato, no merge ni checkout íntegro de la rama histórica.
- tsc --noEmit -p editor-audit-001/tsconfig.json: PASS.
- Vite directo en esa copia: PASS,1722 módulos, advertencia chunk>500kb.
- Chromium153/Playwright, node /tmp/enc-editor-audit-validation/test-audit.cjs: auditoría de26 criterios,19 cumplidos y7 hallazgos; adicionalmente control técnico de cero errores JS/solicitudes externas aprobado. EXIT0 del script indica auditoría completada, NO ausencia de regresiones.
- Por variante: ia6 criterios cumplidos/7 hallazgos; Work13 cumplidos/0 hallazgos EN LOS CASOS EXAMINADOS. No prueba exhaustividad ni seguridad backend.
- Datos sintéticos, upload503 interceptado y callbacks onSave en memoria con respuesta error/pendiente. Sin servidor completo, BD, SQL, migración o publicación real.
- SHA256 harness:9c5971d1f69b51d44faa780dacb58dab0ae10a23f62819b4ba545bea2cc471e3.
- Ambos renderizan en1440x1050 y390x844 sin desborde observado; clic exterior no cierra; error y pendiente de onSave no cierran ni muestran guardado confirmado. Horario sin editar se conserva en ambos.

### Siete hallazgos comprobados sobre ia actual
1. Horario de fixture “Lun, Mié, Vie09:15-17:30” precarga controles08:00/18:00. El texto no editado sí se preservó; riesgo de sobrescritura si se cambia el control semanal. La expresión de extracción aparece doble escapada.
2. WhatsApp vacío se rellena con9381234567 del teléfono de fixture. No se demostró que ese teléfono tenga WhatsApp.
3. Pago heredado “Pago corporativo al cierre de mes” se envía como “Efectivo, Transferencia Bancaria (SPEI)” sin editar.
4. Modalidad “Servicio únicamente mediante cita” se envía como “Atención en el Local de la empresa” sin editar.
5. Sin teléfono ni WhatsApp se invoca onSave1 vez; frontend no bloquea ese caso.
6. Doble clic rápido durante pendiente invoca onSave2 veces. No demuestra dos filas ni persistencia duplicada en BD; son dos callbacks.
7. Upload503 sustituye preview por dataURI local. Es observación de fallback del helper, NO prueba de subida remota ni de escritura ficticia en BD. Debe comunicarse como borrador o rechazarse según contrato; verificar persistencia antes de tratarlo como carga remota.
Work supera estos mismos13 criterios: horas09:15/17:30, WA vacío, campos heredados preservados,0 callbacks sin contacto,1 callback en doble envío y preview previo conservado ante upload503.

### Compatibilidad y diferencias visuales
Props onSave/onClose/business y consumidores actuales compilaron. Work usa payload de campos sucios, guardas de guardado/upload y protección de sesión; son mejoras funcionales candidatas a portado selectivo.
Las capturas muestran diferencias materiales de ancho, espaciado, tipografía y ubicación (dirección/CP vs colonia/ciudad), aunque ambas son Glass. Mejor comportamiento en estos casos NO autoriza reemplazar el diseño que el propietario aprobó.
No se incorporó la nueva sección logo de la rama Logo/Maps. Coordinación deberá conciliar preservación de campos, payload de logo y diseño aprobado de forma explícita; copiar un archivo entero puede perder cambios de otra tarea.
Autenticación real/persistencia continúan siendo dependencias; un isAdmin de cliente no sustituye guard servidor. El editor por sí solo no prueba operaciones autorizadas ni MariaDB.

### Evidencia y cambios publicados
Paquete común: https://chatgpt.com/library?file_id=libfile_1d6fb1057d78819184c5920af2051d53&account_id=personal
Carpeta Editor-auditoria:4 PNG (ia y Work en escritorio/móvil), todos sintéticos, Work rotulado NO APLICADA. Capturas desktop revisadas visualmente.
Solo se modifican docs/WORK_RESULTADOS.md y docs/work-progress/ENC-GLASS-EDITOR-001.md en esta revisión. Código de editor intacto. Sin refactor/diseño/cambios API/servidor/App/auth/DB/dependencias.
El entorno local quedó no disponible durante una renovación posterior de capturas de otra tarea. Estos26 criterios ya habían terminado y sus resultados/capturas estaban guardados; no se inventan nuevas ejecuciones.

### Recomendación y dictamen
NO APTO para sustitución automática mediante PR#3 ni despliegue basado solo en esta auditoría.
APTO para revisión de hallazgos/contrato de editor. Preservar diseño aprobado; acordar cuál fuente visual conservar y portar únicamente lógica necesaria con pruebas, sin sobreescribir otros módulos.
Priorizar preservación de pago/modalidad/WA, parser de horarios y exclusión inmediata de doble envío; revisar semántica de uploaddataURI. Persistencia real y pruebas autorizadas de sesión/BD quedan pendientes. No se aplicó ninguna corrección de UI bajo una orden de solo revisión.
Rollback de esta revisión: revertir únicamente commits documentales; no hay código/datos nuevos que revertir. Esperando coordinación, sin PR/merge/despliegue/SQL.

## Recuperación Work 02 — 2026-10-28T17:11:21.871Z
Estado: AUDITORÍA COMPARATIVA PREVIA RECUPERADA, SIN REDISEÑO NI CORRECCIÓN NUEVA. HEAD previo23a4fc1ee4c7e731c3119ab7cdb3504263cb3c23; ia-desarrollo comprobadacad1222618c94f4eb3dabb589b6e58836191dcb7. Comparación remota diverged5 commits propios/10 detrás, base común6004ef637021ee0bea72f5c892a815696c1c8c13. Fuente Workd80a5a83871f129b7c033343be859c5410830cc9 intacta; no copiar PR#3 automáticamente ni la sección logo desde otra rama.
Se conservaron los26 criterios auditados previamente:19 cumplidos/7 hallazgos, no “26 PASS”; TypeScript/Vite y4 capturas anteriores. No se repitieron pruebas porque no cambió código ni se autorizó sustituir diseño. Recuperación documental/GitHub no equivale a verificación de coordinación.
Siete problemas observados en ia: parser horas, WhatsApp inferido, normalización de pagos y modalidad no editados, contacto vacío, doble callback al guardar y fallback dataURI ante upload503. No son prueba de escritura duplicada o persistencia en DB. Work supera casos examinados, pero difiere visualmente del editor aprobado.
Pendiente decisión de coordinación sobre fuente visual y portado selectivo de lógica, conservando diseño aprobado. Esta recuperación no amplía alcance para sustituir el editor. Capturas nuevas del campo de logo pertenecen a ENC-GLASS-LOGO-MAPS-002 y a su rama, no a esta implementación histórica.
Solo se actualizan WORK_RESULTADOS y este checkpoint. Sin código, fusión, SQL, DB, Staging, producción o despliegue. APTO para revisión de hallazgos; NO APTO para sustitución automática/despliegue. Hostinger vigente.
