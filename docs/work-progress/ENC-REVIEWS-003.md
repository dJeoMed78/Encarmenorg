# ENC-REVIEWS-003 — Puntos de control

## Inicio — 2026-10-28T02:00:53.291Z
- Estado: EN_PROGRESO.
- Rama: work/enc-reviews-003.
- Base y commit actual al iniciar: 6004ef637021ee0bea72f5c892a815696c1c8c13 (ia-desarrollo).
- Instrucciones generales: c4ef37ba0f690f60cd9fb5189190afd2be9a8faa (blob).
- Tarea: 0ed0c6e179cb6f415ffe57944c679c01699e63b3 (blob).
- Leídos tarea, antecedentes, coordinación, contexto y auditoría aportada por el coordinador.
- Revisados consumidores autorizados, BusinessCard, ClientBusinessPageView y utilidad ratings (estos tres últimos solo lectura).
- Pruebas: ninguna ejecutada todavía; revisión estática no equivale a integración.
- Siguiente hito: unificar consumidor, esperar POST confirmado y consumir agregados reales.
- Dependencia: backend a6819631fb9925deb5aeedce7b9b9b40e77454e7 no integrado; no iniciar servidor ni conectar BD.
- Sin cambios en producción, Staging, main o ia-desarrollo. Sin bloqueos de alcance detectados hasta este punto.

## Implementación y validación de consumidor — 2026-10-28T02:07:45.687Z
- Estado: EN_PROGRESO; implementación frontend preparada para revisión, sin integración.
- Commit anterior: 7b16fbbf103530358d59c0727467450796e6c439. Base: 6004ef637021ee0bea72f5c892a815696c1c8c13.
- Modificados exclusivamente los ocho archivos fuente autorizados: consumidor API/hook compartido, widget, modal, ficha directa, App, banner de recientes y alta administrativa.
- POST esperado antes de confirmar; visitorId auxiliar válido; agregados exclusivamente por GET/POST reales; errores y cero votos diferenciados; 409 consulta voto original; respuestas de otro negocio descartadas.
- 23 comprobaciones HTTP/React simuladas aprobadas. Hubo un fallo inicial: tras 409 se ocultaba el promedio reconciliado por confundir error de envío con consulta no disponible; corregido y batería repetida con éxito.
- Vite 8.3.5 build directo: 1720 módulos, salida temporal, éxito; advertencia de chunk superior a 500 kB.
- tsc 7.0.2 --noEmit: falla por TS2339 en AdminEventsTab.tsx:1499 (AIRadarCandidate.source). Reproducido con los ocho archivos originales de ia-desarrollo y ratings_db.json original; sin diagnósticos adicionales en la versión modificada. No se modifica ese archivo fuera de alcance.
- No se ejecutaron npm run build/prebuild, servidor, BD, migración, integración ni despliegue.
- Riesgos externos: backend ENC-REVIEWS-001 pendiente de revisión, índice único y normalización de IDs; catálogo/esquema/backend conservan datos históricos o defaults de cinco estrellas. index.html también conserva JSON-LD fijo (4.9, 3920 votos), fuera del alcance. Este subtrabajo queda pendiente de autorización.
- Próximo paso: consolidar evidencia reproducible, resultados y verificación final de diff y SHA base.

## Cierre de implementación — 2026-10-28T02:09:57.570Z
- Estado: IMPLEMENTADO_SIN_VERIFICAR (validación integrada pendiente; pruebas de consumidor sí ejecutadas).
- Implementación publicada: 75301fe955d9eda492d462624524eda40ef0615a; este cierre conserva el diseño existente del widget e incorpora evidencia reproducible.
- Validación final: 26 comprobaciones simuladas aprobadas; Vite directo repetido con éxito, 1720 módulos. tsc repetido: único TS2339 preexistente en AdminEventsTab.tsx:1499.
- Archivos de implementación: los ocho autorizados. Documentación: este checkpoint y WORK_RESULTADOS.md. No se agregan scripts de prueba al repositorio fuera del alcance.
- Sin integración real API/MariaDB ni validación visual en navegador; no declarar aptitud de Staging ni revisión del coordinador.
- Rollback propuesto: revertir commits de esta tarea en su rama o descartar la rama, sin force push; coordinar cualquier integración futura. No hay datos que revertir porque no se escribió en BD.
- Queda pendiente autorización independiente para corregir datos/defaults backend, JSON-LD fijo de index.html y error de tipado fuera de alcance. Ninguno fue modificado.

### Herramientas de validación aisladas
Dependencias instaladas únicamente en /tmp/enc-reviews-tools, con --ignore-scripts --no-audit --no-fund. No se modifica package.json ni lockfile; no se afirma instalación reproducida con npm ci del proyecto. Se usaron versiones compatibles con las restricciones declaradas cuando aplican; react-test-renderer es herramienta temporal y emite aviso de deprecación.

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
enc-reviews-tools@ /tmp/enc-reviews-tools
├── @emnapi/runtime@1.11.3 extraneous
├── @google/genai@2.31.0
├── @img/sharp-wasm32@0.35.5 extraneous
├── @tailwindcss/vite@4.3.3
├── @types/archiver@8.0.0
├── @types/express@4.17.25
├── @types/node@22.20.5
├── @types/react-dom@19.3.0
├── @types/react@19.3.0
├── @vitejs/plugin-react@6.1.2
├── archiver@8.0.0
├── dotenv@17.4.2
├── esbuild@0.28.2
├── express@4.22.3
├── lucide-react@0.546.0
├── motion@12.43.0
├── mysql2@3.24.6
├── react-dom@19.3.1
├── react-test-renderer@19.3.1
├── react@19.3.1
├── sharp@0.35.5
├── tailwindcss@4.3.3
├── tsx@4.23.15
├── typescript@7.0.2
└── vite@8.3.5

```

### Comandos principales ejecutados
```sh
/tmp/enc-reviews-tools/node_modules/.bin/tsc --noEmit
/tmp/enc-reviews-tools/node_modules/.bin/vite build --outDir /tmp/enc-reviews-tools/vite-dist --emptyOutDir
/tmp/enc-reviews-tools/node_modules/.bin/esbuild src/services/api.ts --bundle --platform=node --format=cjs --outfile=/tmp/enc-reviews-tools/api.cjs
/tmp/enc-reviews-tools/node_modules/.bin/esbuild src/components/StarRatingWidget.tsx --bundle --platform=node --format=cjs --packages=external --outfile=/tmp/enc-reviews-tools/widget.cjs
node /tmp/enc-reviews-tools/test-ratings.cjs
```
La copia de validación local contiene las fuentes originales necesarias y node_modules enlazado a las herramientas temporales. Vite usa la configuración original inspeccionada; no ejecuta prebuild ni actualización de versión. Esbuild del App con paquetes externos también pasó; no sustituye el build Vite. Salidas de compilación siempre temporales; no se publican artefactos generados.

Para contrastar tsc se preparó /tmp/enc-reviews-tools/baseline con fuentes de ia-desarrollo, se repusieron los ocho archivos originales y ratings_db.json, y se ejecutó `tsc --noEmit --project /tmp/enc-reviews-tools/baseline/tsconfig.json`: mismo único TS2339. Un intento previo con API programática del compilador no fue utilizable (ts.sys no disponible en esa distribución); el contraste válido es la ejecución física posterior.

### Resultados finales de pruebas de consumidor
Todos usan datos sintéticos identificados como prueba. No constituyen reinicio, persistencia, concurrencia ni integración reales de MariaDB; el remontaje consulta una respuesta HTTP simulada conservada por el guion.

```text
PASS API rechaza HTTP 400 aunque JSON diga success=true
PASS API rechaza HTTP 404 aunque JSON diga success=true
PASS API rechaza HTTP 409 aunque JSON diga success=true
PASS API rechaza HTTP 503 aunque JSON diga success=true
PASS GET falla de red no genera cinco estrellas
PASS Agregados nulos o incoherentes rechazados
PASS GET global conserva agregados reales
PASS GET global inválido produce error
PASS Cliente rechaza ratings fuera de rango, fraccionarios y no numéricos
PASS HTTP 200 sin confirmación success=true no confirma voto
PASS Cero votos ignora catálogo y votos históricos locales
PASS POST confirmado envía visitorId válido y muestra agradecimiento
PASS No reescribe ni usa promedios locales
PASS POST pendiente no altera promedio ni muestra éxito
PASS Remontaje consulta voto y agregado persistidos por servidor simulado
PASS Consumidor 400: error visible sin éxito ficticio
PASS Consumidor 404: error visible sin éxito ficticio
PASS Consumidor 409: error visible sin éxito ficticio, reconciliación GET conserva voto original
PASS Consumidor 503: error visible sin éxito ficticio
PASS Consumidor network: error visible sin éxito ficticio
PASS Error de lectura se distingue de cero votos
PASS Respuesta nula visible como error
PASS Dos vistas se reconcilian tras POST confirmado
PASS GET tardío de otro negocio no contamina el negocio actual
PASS POST tardío no confirma ni ejecuta callback sobre otro negocio
PASS Almacenamiento bloqueado con sesión nueva no impide consulta
RESULTADO: 26 comprobaciones aprobadas. Mocks HTTP/React; sin servidor ni MariaDB.
```

### Guion reproducible de consumidor (guardar temporalmente como test-ratings.cjs junto a api.cjs y widget.cjs)
```javascript
const assert = require('node:assert/strict');
const React = require('react');
const {create, act} = require('react-test-renderer');
const api = require('./api.cjs');
const {StarRatingWidget} = require('./widget.cjs');
global.IS_REACT_ACT_ENVIRONMENT = true;
global.window = new EventTarget();
const storage = new Map([['encarmen_real_ratings_v3', '{"42":[5,5,5]}'], ['eec_rated_businesses','{"42":5}']]);
global.localStorage = {getItem:k=>storage.get(k)||null, setItem:(k,v)=>storage.set(k,v)};
const empty = {average:0,count:0,distribution:{1:0,2:0,3:0,4:0,5:0},hasRated:false,userRating:null};
const voted = {average:3,count:1,distribution:{1:0,2:0,3:1,4:0,5:0},hasRated:true,userRating:3};
const success = {success:true,rating:3,reviewCount:1,stats:voted};
const response = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const text = r=>JSON.stringify(r.toJSON());
let count=0;
const pass = name=>{count++; console.log('PASS',name)};
const flush = async ()=>act(async()=>{await new Promise(r=>setImmediate(r))});
const mount = async props=>{let r; await act(async()=>{r=create(React.createElement(StarRatingWidget,{businessId:'42',businessName:'Prueba',...props}));}); await flush();return r;};
const click = async (r,star)=>act(async()=>{r.root.findAllByType('button').find(b=>b.props['aria-label']===`Calificar con ${star} estrellas`).props.onClick();});
const unmount = async r=>act(async()=>r.unmount());
(async()=>{
 for(const status of [400,404,409,503]){
  global.fetch=async()=>response({success:true,message:'Error de prueba'},status);
  await assert.rejects(()=>api.submitBusinessRating({businessId:'42',rating:3,visitorId:'vis_test'}),e=>e.status===status);
  pass(`API rechaza HTTP ${status} aunque JSON diga success=true`);
 }
 global.fetch=async()=>{throw Error('offline')};
 await assert.rejects(()=>api.fetchBusinessRating('42'));pass('GET falla de red no genera cinco estrellas');
 for(const value of [null,{}, {average:null,count:0},{average:5,count:0},{average:2,count:-1}]) assert.throws(()=>api.parseRatingStats(value));
 pass('Agregados nulos o incoherentes rechazados');
 global.fetch=async()=>response({stats:{'42':{average:2.5,count:2}}});
 assert.equal((await api.fetchAllBusinessRatings())['42'].average,2.5);pass('GET global conserva agregados reales');
 global.fetch=async()=>response({stats:null});await assert.rejects(()=>api.fetchAllBusinessRatings());pass('GET global inválido produce error');
 for(const rating of [0,6,1.5,'3',null]) await assert.rejects(()=>api.submitBusinessRating({businessId:'42',rating,visitorId:'vis_test'}),e=>e.status===400);
 pass('Cliente rechaza ratings fuera de rango, fraccionarios y no numéricos');
 global.fetch=async()=>response({success:false,rating:5,reviewCount:1,stats:{average:5,count:1}});
 await assert.rejects(()=>api.submitBusinessRating({businessId:'42',rating:3,visitorId:'vis_test'}));pass('HTTP 200 sin confirmación success=true no confirma voto');
 let posted;
 global.fetch=async(url,opts={})=>{if(opts.method==='POST'){posted=JSON.parse(opts.body);return response(success)}return response(empty)};
 let r=await mount({initialRating:5,initialReviewCount:1});
 assert.match(text(r),/Sin calificaciones/);assert.doesNotMatch(text(r),/5\.0/);pass('Cero votos ignora catálogo y votos históricos locales');
 await click(r,3);await flush();
 assert.equal(posted.rating,3);assert.equal(typeof posted.rating,'number');assert.match(posted.visitorId,/^[A-Za-z0-9_-]{1,100}$/);assert.match(text(r),/servidor confirmó/);pass('POST confirmado envía visitorId válido y muestra agradecimiento');
 assert.equal(storage.get('encarmen_real_ratings_v3'),'{"42":[5,5,5]}');pass('No reescribe ni usa promedios locales');await unmount(r);
 let release;let stored=empty;
 global.fetch=async(url,opts={})=>opts.method==='POST'?new Promise(resolve=>{release=()=>{stored=voted;resolve(response(success));}}):response(stored);
 r=await mount(); await click(r,3);assert.doesNotMatch(text(r),/servidor confirmó/);assert.match(text(r),/Guardando/);assert.match(text(r),/Sin calificaciones/);pass('POST pendiente no altera promedio ni muestra éxito');
 await act(async()=>release());await flush();assert.match(text(r),/3\.0/);await unmount(r);
 r=await mount();assert.match(text(r),/3\.0/);assert.match(text(r),/Voto registrado/);pass('Remontaje consulta voto y agregado persistidos por servidor simulado');await unmount(r);
 for(const status of [400,404,409,503,'network']){
  global.fetch=async(url,opts={})=>{if(opts.method==='POST'){if(status==='network')throw Error('offline');return response({success:false,message:`HTTP ${status}`},status)}return response(status===409?voted:empty)};
  // For duplicate, first read must allow attempting; reconciliation then returns original 3, not attempted 5.
  let reads=0;const fetchImpl=global.fetch;
  global.fetch=async(url,opts={})=>{if(!opts.method&&status===409&&reads++===0)return response(empty);return fetchImpl(url,opts)};
  r=await mount();await click(r,5);await flush();assert.doesNotMatch(text(r),/servidor confirmó/);assert.match(text(r),/role.*alert/);
  if(status===409){assert.match(text(r),/3\.0/);assert.doesNotMatch(text(r),/5\.0/);assert.match(text(r),/Voto registrado/);}
  pass(`Consumidor ${status}: error visible sin éxito ficticio${status===409?', reconciliación GET conserva voto original':''}`);await unmount(r);
 }
 global.fetch=async()=>{throw Error('offline')};r=await mount();assert.match(text(r),/no disponibles/);assert.doesNotMatch(text(r),/Sin calificaciones|5\.0/);pass('Error de lectura se distingue de cero votos');await unmount(r);
 global.fetch=async()=>response(null);r=await mount();assert.match(text(r),/no disponibles/);pass('Respuesta nula visible como error');await unmount(r);
 let votes=empty;
 global.fetch=async(url,opts={})=>{if(opts.method==='POST'){votes=voted;return response(success)}return response(votes)};
 let a=await mount(),b=await mount();await click(a,3);await flush();assert.match(text(a),/3\.0/);assert.match(text(b),/3\.0/);assert.match(text(b),/Voto registrado/);pass('Dos vistas se reconcilian tras POST confirmado');await unmount(a);await unmount(b);
 let resolveOld;
 global.fetch=async url=>String(url).includes('/old')?new Promise(resolve=>{resolveOld=()=>resolve(response(voted))}):response(empty);
 r=await mount({businessId:'old'});await act(async()=>r.update(React.createElement(StarRatingWidget,{businessId:'new',businessName:'Nuevo'})));await flush();await act(async()=>resolveOld());await flush();assert.match(text(r),/Sin calificaciones/);assert.doesNotMatch(text(r),/3\.0/);pass('GET tardío de otro negocio no contamina el negocio actual');await unmount(r);
 let finishPost;let callbacks=0;
 global.fetch=async(url,opts={})=>opts.method==='POST'?new Promise(resolve=>{finishPost=()=>resolve(response(success))}):response(empty);
 r=await mount({businessId:'old',onRatingUpdated:()=>callbacks++});await click(r,3);
 await act(async()=>r.update(React.createElement(StarRatingWidget,{businessId:'new',businessName:'Nuevo',onRatingUpdated:()=>callbacks++})));await flush();
 await act(async()=>finishPost());await flush();assert.equal(callbacks,0);assert.match(text(r),/Sin calificaciones/);assert.doesNotMatch(text(r),/servidor confirmó/);pass('POST tardío no confirma ni ejecuta callback sobre otro negocio');await unmount(r);
 // Storage denial must not prevent generating an auxiliary session ID.
 global.localStorage={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 delete require.cache[require.resolve('./widget.cjs')];const FreshWidget=require('./widget.cjs').StarRatingWidget;
 global.fetch=async()=>response(empty);await act(async()=>{r=create(React.createElement(FreshWidget,{businessId:'42',businessName:'Prueba'}))});await flush();assert.match(text(r),/Sin calificaciones/);pass('Almacenamiento bloqueado con sesión nueva no impide consulta');await unmount(r);
 console.log(`RESULTADO: ${count} comprobaciones aprobadas. Mocks HTTP/React; sin servidor ni MariaDB.`);
})().catch(e=>{console.error(e);process.exitCode=1});
```
