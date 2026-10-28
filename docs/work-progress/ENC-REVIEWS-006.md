# ENC-REVIEWS-006 — Checkpoints

## Inicio — 2026-10-28T02:40:46.807Z
- Estado EN_PROGRESO. Rama work/enc-reviews-006.
- Base y commit actual al iniciar: 6004ef637021ee0bea72f5c892a815696c1c8c13.
- Instrucciones generales (blob): c4ef37ba0f690f60cd9fb5189190afd2be9a8faa; tarea (blob): d81c21af1676ff8cfd26a23c5f2e85b73f6521c7.
- Leídos contexto, coordinación, antecedentes 001/002/003/004 y tarea 005 disponible. No hay informe de ejecución 005 aportado; no se inventa.
- Se incorporarán cambios seleccionados de a681963 y 2e0d007 sin merges, únicamente en archivos autorizados.
- No se detectó mariadbd ni Docker local; se usarán mocks aislados, sin abrir conexiones reales. Integración MariaDB pendiente.
- Plan: canonicalizar IDs, serializar votos únicamente mediante recursos de ratings sin bloquear/modificar businesses, validar esquema existente, separar SQL propuesto de arranque, consolidar consumidores y pruebas.
- Riesgos vigentes: esquema/permiso/backup de hosting no verificados, arranque histórico con efectos laterales ajenos que no se ejecutará.

## Hito: implementación coherente y pruebas aisladas — 2026-10-28T02:47:24.393Z
- Estado EN_PROGRESO. Commit anterior: d0bfc1e5b330b034eacea3747842231caefe9336. Base sin modificar: 6004ef637021ee0bea72f5c892a815696c1c8c13.
- Incorporados cambios seleccionados 001/003, sin merge. IDs canónicos, UNIQUE/NOT NULL y datos comprobados antes de operar. Serialización de ratings con GET_LOCK por esquema/negocio, liberado tras commit; nunca FOR UPDATE sobre businesses.
- Se requiere RATINGS_SCHEMA_APPROVED=true después de aprobación posterior; ausente, GET/POST falla 503. Esta tarea no cambia ninguna configuración de hosting.
- Se retiró exclusivamente la creación automática de business_ratings del arranque. Las inicializaciones históricas de otros módulos siguen intactas y no se ejecutaron.
- Frontend sin autoridad local, errores/409 y cargas tardías; diseño conservado. JSON-LD falso retirado, TS2339 corregido sin cambiar lógica de Radar. Defaults de nuevos objetos de negocios pasan a cero sin migrar datos.
- Esquema SQL comentado: tabla inexistente y ALTER UNIQUE conservador de tabla existente. Sin DDL activo ni DROP/TRUNCATE de tablas. Propuesta 001 redirige a 006.
- tsc --noEmit PASA; Vite frontend PASA (1720 módulos, advertencia chunk >500kB); esbuild backend PASA.
- 26 comprobaciones frontend y 26 backend PASAN, ambas con mocks. Backend prueba rutas extraídas sin arrancar servidor y repositorio inyectado sin crear pool real. No se ha probado SQL/GET_LOCK/snapshots de MariaDB real.
- Riesgos: no hay motor local; falta esquema/permisos/backup de hosting verificados. Sin FK para no cambiar lifecycle de businesses; un borrado externo concurrente puede crear huérfanos, detectados en auditoría posterior. Identificador no es identidad humana; no se añade antibot/rate limit en esta entrega.
- Siguiente paso: revisión estática del diff, escenarios de fallos adicionales, evidencia reproducible y cierre. Sin bloqueos de edición; validación real pendiente.

## Revisión y cierre — 2026-10-28T02:51:36.042Z
- Estado IMPLEMENTADO_SIN_VERIFICAR: pruebas de tipos/build y consumidor aprobadas, integración MariaDB pendiente.
- Commit de implementación publicado: 9fcdaeac9165e3b108f3a5fb01622cea28b26d3a. El commit de cierre agrega estas evidencias y los ajustes de revisión.
- Revisión estática propia del diff: solo archivos permitidos; DDL de otras tablas y código de arranque ajeno intactos. No hubo segundo revisor ni integración de ramas. Se seleccionaron cambios de 001/003 manualmente.
- Ajustes de revisión: Cache-Control no-store, mensajes de duplicados sin garantía humana, descarte de sesión si falla SET/BEGIN, pérdida de adquisición de advisory lock o rollback/release fallidos. Se conserva éxito cuando commit fue confirmado aunque falle liberar lock, cerrando esa conexión.
- TypeScript 7.0.2 --noEmit PASA (exit 0). Corrección TS2339: se elimina solo cand.source, propiedad inexistente en AIRadarCandidate, manteniendo badge/organizer y URL.
- Vite 8.3.5 directo PASA (1720 módulos); advertencia preexistente de chunk >500kB. Esbuild 0.28.2 backend PASA. No se ejecutó npm run build/prebuild ni se incrementó versión. Salidas en /tmp/enc-reviews-006 únicamente.
- 26 comprobaciones frontend y 32 backend PASAN. Los locks/transacciones/SQL son un controlador simulado. No hay MariaDB local inequívocamente aislada disponible (mariadbd y Docker no encontrados); no se instaló ni se conectó ninguna BD.
- JSON-LD validado con json.loads: 3 nodos preservados y aggregateRating fijo retirado. SQL propuesto sin sentencias activas tras quitar comentarios.
- Sin datos reales, SQL Hostinger, hPanel, migraciones, merge, PR o despliegue. main, ia-desarrollo, ramas 001/003 y Staging/producción no se modifican.

### Diseño y límites para revisión
- Tabla nueva propuesta: business_ratings InnoDB; id VARCHAR64 ASCII, business_id VARCHAR64 utf8mb4_bin canónico, visitor_id CHAR64 ASCII binario SHA256, rating TINYINT UNSIGNED, comment VARCHAR200 opcional, created_at y UNIQUE completo; CHECK de rango/hash/formato. Confirmar enforcement real según versión.
- Tabla existente: ALTER ADD UNIQUE conservador después de verificar tipos/NOT NULL/engine, procedencia de claves, ausencia de duplicados y respaldo restaurable. No se exige recreación por estar vacía. Ningún dato se transforma automáticamente.
- Runtime acepta tabla histórica compatible con columnas adicionales e índice único completo; comprueba PK, tipos/NOT NULL, engine y datos. Hace auditoría de integridad por petición; medir costo con volumen real antes de habilitar.
- RATINGS_SCHEMA_APPROVED debe permanecer ausente/false hasta revisión explícita de esquema y procedencia. No se cambió configuración de hosting. La bandera no evita efectos históricos de arranque de otros módulos ni acredita aislamiento.
- No FK ni FOR UPDATE sobre businesses: lecturas canónicas y controles detectan huérfanos, pero no impiden un borrado externo concurrente. No se introduce cascade, trigger ni cambio a businesses.
- GET_LOCK es cooperativo y por instancia. Se separa por hash de esquema/ID; UNIQUE sigue siendo la restricción persistente. Validar topología de escritor y replicación, límites y semántica real en MariaDB antes de habilitar. No existe garantía de agregados seriales para escritores externos que ignoren el lock.
- Los defaults y columnas históricas rating/reviews_count de businesses quedan intactos para no cambiar persistencia ajena. Frontend y endpoints /api/ratings no los usan como votos; consumidores externos del catálogo requieren revisión separada.
- El cambio de defaults rating/reviewCount en objetos nuevos evita introducir votos ficticios en esos consumidores; no reescribe registros ni cambia funciones SQL de businesses.
- visitorId es auxiliar rotatorio, hash pseudónimo no identidad ni anonimización. Sin IP guardada por el nuevo flujo; columna IP histórica no se borra. Comentarios no se publican por GET y no se implementa moderación. Definir retención y revisar logs del proveedor: visitorId viaja en query de GET por contrato y podría registrarse fuera de la aplicación. No se añaden antibot ni limitación de frecuencia.
- Falta prueba visual responsive real, restauración, concurrencia, snapshots, DDL y reinicio reales. Mocks no demuestran esas garantías.

### Comandos de validación ejecutados
Entorno temporal reutilizado: Node 24.22.1, TypeScript 7.0.2, Vite 8.3.5, esbuild 0.28.2, React y react-test-renderer 19.3.1, mysql2 3.24.6, @types/node 22.20.5. Dependencias instaladas previamente fuera del repositorio con --ignore-scripts; no se afirma npm ci del lockfile. react-test-renderer avisa de deprecación.
```sh
/tmp/enc-reviews-tools/node_modules/.bin/tsc --noEmit
/tmp/enc-reviews-tools/node_modules/.bin/vite build --outDir /tmp/enc-reviews-006/vite-dist --emptyOutDir
/tmp/enc-reviews-tools/node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/enc-reviews-006/server.mjs
/tmp/enc-reviews-tools/node_modules/.bin/esbuild src/db/mariadb.ts --bundle --platform=node --format=cjs --packages=external --outfile=/tmp/enc-reviews-tools/ratings006-db.cjs
/tmp/enc-reviews-tools/node_modules/.bin/esbuild src/services/api.ts --bundle --platform=node --format=cjs --outfile=/tmp/enc-reviews-tools/api.cjs
/tmp/enc-reviews-tools/node_modules/.bin/esbuild src/components/StarRatingWidget.tsx --bundle --platform=node --format=cjs --packages=external --outfile=/tmp/enc-reviews-tools/widget.cjs
node /tmp/enc-reviews-tools/test-ratings.cjs
node /tmp/enc-reviews-tools/test006-backend.cjs
```
Nunca ejecutar server.mjs para repetir estas pruebas. El guion backend extrae solo registerRatingsRoutes entre marcadores del código fuente, lo transpila y lo invoca con repositorio/Request/Response simulados, sin Express escuchando ni arranque histórico. Importar el repositorio no llama initMariaDb ni crea pool.

### Salida final de pruebas
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

PASS Sin pool no hay JSON/memoria ni conexión automática
PASS Negocio sin votos devuelve cero y estado personal vacío
PASS GET global vacío sin semillas
PASS Inserción canónica, comentario privado y sin IP tras commit
PASS Variantes de ID devuelven el voto real
PASS Duplicado secuencial no incrementa filas y libera lock
PASS Un visitante puede votar en negocios distintos
PASS Esquema/datos incompatibles rechazados: unique
PASS Esquema/datos incompatibles rechazados: engine
PASS Esquema/datos incompatibles rechazados: nullable
PASS Esquema/datos incompatibles rechazados: prefix
PASS Esquema/datos incompatibles rechazados: invalid
PASS Validación de repositorio rechaza rating, HTML, longitud y token sin hash
PASS Concurrencia simulada mismo par: un voto y siete duplicados
PASS Visitantes distintos serializan agregados simulados sin perder votos
PASS Fallo de commit devuelve 503, rollback y ausencia de éxito ficticio
PASS Respuesta de commit perdida: error y GET reconcilia el voto simulado
PASS Fallo al liberar lock destruye conexión sin negar commit confirmado
PASS Timeout de advisory lock falla sin insertar
PASS Pérdida de respuesta al adquirir lock destruye conexión y libera recurso simulado
PASS ID histórico no canónico bloquea sin reescribirlo
PASS Clave histórica cruda exige revisión y no se hashea automáticamente
PASS Fallo de BEGIN descarta sesión con aislamiento pendiente, sin afectar otros módulos
PASS Fallo de BEGIN tras advisory lock libera recurso y descarta sesión
PASS Fallo de rollback descarta conexión
PASS Rutas POST 400 para entradas inválidas
PASS Ruta negocio inexistente 404
PASS Ruta POST 200 solo después de commit
PASS Ruta duplicado 409
PASS Ruta GET individual consistente con voto original
PASS GET global conserva contrato sin exponer hashes
PASS Repositorio solo inserta en business_ratings, sin DDL ni bloqueos de businesses
RESULTADO: 32 comprobaciones backend aprobadas; SQL/locks/commit son simulados, SIN MariaDB ni servidor de aplicación.
```

### Guion frontend reproducible
Guardar temporalmente junto a api.cjs y widget.cjs en /tmp/enc-reviews-tools. Los ejemplos y votos son únicamente datos sintéticos en memoria.
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

### Guion backend reproducible
Guardar como /tmp/enc-reviews-tools/test006-backend.cjs y ejecutar desde la raíz de la copia de código.
```javascript
const assert=require('node:assert/strict');
const fs=require('node:fs');
const esbuild=require('esbuild');
const {createRatingsRepository,dbGetRatingStats}=require('./ratings006-db.cjs');
const source=fs.readFileSync(process.cwd()+'/server.ts','utf8');
const section=source.split('// ENC-REVIEWS-006 RATINGS ROUTES START\n')[1].split('// ENC-REVIEWS-006 RATINGS ROUTES END')[0];
assert(section.includes('export function registerRatingsRoutes'));
const transformed=esbuild.transformSync("import crypto from 'node:crypto';\n"+section,{loader:'ts',format:'cjs'}).code;
const routesModule={exports:{}};new Function('require','module','exports',transformed)(require,routesModule,routesModule.exports);
const register=routesModule.exports.registerRatingsRoutes;
const hash=s=>require('node:crypto').createHash('sha256').update(s).digest('hex');
let checks=0;const pass=s=>{console.log('PASS',s);checks++};
class Pool{
 constructor(){this.rows=[];this.businesses=['ABC','B2'];this.queries=[];this.locks=new Map();this.next=0;this.engine='InnoDB';this.unique=true;this.nullable=false;this.prefix=false;this.invalid=false;this.failCommit=false;this.commitThenFail=false;this.failRelease=false;this.failRollback=false;this.destroyed=0;}
 async getConnection(){return new Connection(this,++this.next)}
}
class Connection{
 constructor(p,id){this.p=p;this.id=id;this.pending=[];this.tx=false;this.lock=null;this.destroyed=false;}
 async beginTransaction(){this.p.queries.push('BEGIN');if(this.p.failBegin)throw Error('synthetic begin failure');this.tx=true;}
 async commit(){this.p.queries.push('COMMIT');if(this.p.failCommit)throw Error('synthetic commit failure');this.p.rows.push(...this.pending);this.pending=[];this.tx=false;if(this.p.commitThenFail)throw Error('synthetic lost commit reply');}
 async rollback(){this.p.queries.push('ROLLBACK');if(this.p.failRollback)throw Error('synthetic rollback failure');this.pending=[];this.tx=false;}
 release(){assert(!this.lock,'No lock may return to pool');assert(!this.destroyed);}
 destroy(){this.destroyed=true;this.p.destroyed++;this.pending=[];this.unlock();}
 unlock(){if(!this.lock)return;const name=this.lock;this.lock=null;const entry=this.p.locks.get(name);if(entry.waiters.length){const next=entry.waiters.shift();entry.owner=next.c;next.c.lock=name;next.resolve([[{acquired:1}]]);}else this.p.locks.delete(name);}
 async query(sql,args=[]){
  this.p.queries.push(sql);
  if(sql.includes('information_schema.TABLES'))return [[{ENGINE:this.p.engine}]];
  if(sql==='SHOW FULL COLUMNS FROM business_ratings')return [[...['id','business_id','visitor_id','rating'].map(Field=>({Field,Null:this.p.nullable&&Field==='visitor_id'?'YES':'NO',Type:Field==='rating'?'tinyint unsigned':Field==='visitor_id'?'char(64)':'varchar(64)'}))]];
  if(sql==='SHOW INDEX FROM business_ratings')return [[{Key_name:'PRIMARY',Non_unique:0,Column_name:'id',Sub_part:null,Seq_in_index:1},...[{Column_name:'business_id',Seq_in_index:1},{Column_name:'visitor_id',Seq_in_index:2}].map(v=>({...v,Key_name:'uq',Non_unique:this.p.unique?0:1,Sub_part:this.p.prefix?32:null}))]];
  if(sql.includes('AS invalid_count')){const invalid=this.p.invalid||this.p.rows.some(r=>!this.p.businesses.includes(r.business_id)||!/^[0-9a-f]{64}$/.test(r.visitor_id)||r.rating<1||r.rating>5||r.comment.length>200);return [[{invalid_count:invalid?1:0}]];}
  if(sql==='SELECT id FROM businesses WHERE id = ? LIMIT 1'){const id=this.p.businesses.find(b=>b.toLowerCase()===String(args[0]).toLowerCase());return [id?[{id}]:[]];}
  if(sql==='SELECT DATABASE() AS db_name')return [[{db_name:'isolated_synthetic_schema'}]];
  if(sql.startsWith('SELECT GET_LOCK')){if(this.p.timeout)return [[{acquired:0}]];const name=args[0];let entry=this.p.locks.get(name);if(!entry){this.lock=name;this.p.locks.set(name,{owner:this,waiters:[]});if(this.p.lostAcquire)throw Error('synthetic lost acquire reply');return [[{acquired:1}]];}return new Promise(resolve=>entry.waiters.push({c:this,resolve}));}
  if(sql.startsWith('SELECT RELEASE_LOCK')){if(this.p.failRelease)throw Error('synthetic release failure');this.unlock();return [[{released:1}]];}
  if(sql.startsWith('SET TRANSACTION'))return [[]];
  if(sql.startsWith('INSERT INTO business_ratings')){
   assert(this.tx);assert(this.lock);const[id,business_id,rating,visitor_id,comment]=args;
   if([...this.p.rows,...this.pending].some(r=>r.business_id===business_id&&r.visitor_id===visitor_id))throw Object.assign(Error('duplicate'),{code:'ER_DUP_ENTRY'});
   this.pending.push({id,business_id,rating,visitor_id,comment});return [{affectedRows:1}];
  }
  if(sql.startsWith('SELECT business_id, rating, COUNT(*) AS votes')){let rows=[...this.p.rows,...this.pending];if(sql.includes(' WHERE '))rows=rows.filter(r=>r.business_id===args[0]);const grouped=new Map();for(const r of rows){const k=r.business_id+':'+r.rating;const item=grouped.get(k)||{business_id:r.business_id,rating:r.rating,votes:0};item.votes++;grouped.set(k,item);}return [[...grouped.values()]];}
  if(sql.startsWith('SELECT rating FROM business_ratings'))return [[...this.p.rows,...this.pending].filter(r=>r.business_id===args[0]&&r.visitor_id===args[1]).map(r=>({rating:r.rating}))];
  throw Error('Unexpected SQL: '+sql);
 }
}
async function request(repo,method,url,{body={},query={},params={}}={}){
 const handlers={};const app={get:(path,fn)=>handlers['GET '+path]=fn,post:(path,fn)=>handlers['POST '+path]=fn};register(app,repo);
 const res={headers:{},setHeader(k,v){this.headers[k]=v},statusCode:200,status(n){this.statusCode=n;return this},json(data){this.data=data;return this}};
 await handlers[method+' '+url]({body,query,params},res);return res;
}
(async()=>{
 await assert.rejects(()=>dbGetRatingStats(),e=>e.code==='RATINGS_DATABASE_UNAVAILABLE');pass('Sin pool no hay JSON/memoria ni conexión automática');
 let p=new Pool(),r=createRatingsRepository(p);
 const zero=await r.getBusiness('abc',hash('vis_a'));assert.deepEqual([zero.average,zero.count,zero.hasRated,zero.userRating],[0,0,false,null]);pass('Negocio sin votos devuelve cero y estado personal vacío');
 assert.deepEqual(Object.keys(await r.getAll()),[]);pass('GET global vacío sin semillas');
 let stats=await r.insert('abc',hash('vis_a'),3,' comentario ');assert.equal(stats.average,3);assert.equal(stats.count,1);assert.equal(p.rows[0].business_id,'ABC');assert.equal(p.rows[0].comment,'comentario');assert.equal('ip' in p.rows[0],false);pass('Inserción canónica, comentario privado y sin IP tras commit');
 let personal=await r.getBusiness('AbC',hash('vis_a'));assert.equal(personal.userRating,3);assert.equal(personal.count,1);pass('Variantes de ID devuelven el voto real');
 await assert.rejects(()=>r.insert('ABC',hash('vis_a'),5,''),e=>e.code==='ER_DUP_ENTRY');assert.equal(p.rows.length,1);assert.equal(p.locks.size,0);pass('Duplicado secuencial no incrementa filas y libera lock');
 await r.insert('B2',hash('vis_a'),4,'');pass('Un visitante puede votar en negocios distintos');
 for(const property of ['unique','engine','nullable','prefix','invalid']){const q=new Pool();q[property]=property==='unique'?false:property==='engine'?'MyISAM':true;await assert.rejects(()=>createRatingsRepository(q).insert('ABC',hash('x'),4,''));assert.equal(q.rows.length,0);pass('Esquema/datos incompatibles rechazados: '+property);}
 for(const [rating,comment,key] of [[1.5,'',hash('a')],[6,'',hash('a')],[3,'<script>',hash('a')],[3,'x'.repeat(201),hash('a')],[3,'','rawvisitor']])await assert.rejects(()=>r.insert('ABC',key,rating,comment));pass('Validación de repositorio rechaza rating, HTML, longitud y token sin hash');
 p=new Pool();r=createRatingsRepository(p);const many=await Promise.allSettled(Array.from({length:8},()=>r.insert('abc',hash('same'),4,'')));assert.equal(many.filter(x=>x.status==='fulfilled').length,1);assert.equal(many.filter(x=>x.status==='rejected'&&x.reason.code==='ER_DUP_ENTRY').length,7);assert.equal(p.rows.length,1);assert.equal(p.locks.size,0);pass('Concurrencia simulada mismo par: un voto y siete duplicados');
 p=new Pool();r=createRatingsRepository(p);const different=await Promise.all(Array.from({length:5},(_,i)=>r.insert('ABC',hash('v'+i),i+1,'')));assert.deepEqual(different.map(s=>s.count),[1,2,3,4,5]);assert.equal((await r.getAll()).ABC.average,3);pass('Visitantes distintos serializan agregados simulados sin perder votos');
 p=new Pool();p.failCommit=true;r=createRatingsRepository(p);let answer=await request(r,'POST','/api/ratings',{body:{businessId:'abc',rating:3,visitorId:'v_commit'}});assert.equal(answer.statusCode,503);assert.equal(answer.data.success,false);assert.equal(p.rows.length,0);assert.equal(p.locks.size,0);pass('Fallo de commit devuelve 503, rollback y ausencia de éxito ficticio');
 p=new Pool();p.commitThenFail=true;r=createRatingsRepository(p);answer=await request(r,'POST','/api/ratings',{body:{businessId:'ABC',rating:3,visitorId:'v_ambiguous'}});assert.equal(answer.statusCode,503);assert.equal(p.rows.length,1);p.commitThenFail=false;assert.equal((await r.getBusiness('abc',hash('v_ambiguous'))).userRating,3);pass('Respuesta de commit perdida: error y GET reconcilia el voto simulado');
 p=new Pool();p.failRelease=true;r=createRatingsRepository(p);stats=await r.insert('abc',hash('v_release'),4,'');assert.equal(stats.count,1);assert.equal(p.destroyed,1);assert.equal(p.locks.size,0);pass('Fallo al liberar lock destruye conexión sin negar commit confirmado');
 p=new Pool();p.timeout=true;r=createRatingsRepository(p);answer=await request(r,'POST','/api/ratings',{body:{businessId:'ABC',rating:3,visitorId:'v_timeout'}});assert.equal(answer.statusCode,503);assert.equal(p.rows.length,0);assert.equal(p.locks.size,0);pass('Timeout de advisory lock falla sin insertar');
 p=new Pool();p.lostAcquire=true;r=createRatingsRepository(p);await assert.rejects(()=>r.insert('ABC',hash('x'),4,''));assert.equal(p.destroyed,1);assert.equal(p.locks.size,0);pass('Pérdida de respuesta al adquirir lock destruye conexión y libera recurso simulado');
 p=new Pool();p.rows.push({id:'legacy',business_id:'abc',visitor_id:hash('x'),rating:3,comment:''});r=createRatingsRepository(p);await assert.rejects(()=>r.getAll(),e=>e.code==='RATINGS_DATA_REVIEW_REQUIRED');pass('ID histórico no canónico bloquea sin reescribirlo');
 p=new Pool();p.rows.push({id:'legacy',business_id:'ABC',visitor_id:'rawvisitor',rating:3,comment:''});r=createRatingsRepository(p);await assert.rejects(()=>r.getAll(),e=>e.code==='RATINGS_DATA_REVIEW_REQUIRED');pass('Clave histórica cruda exige revisión y no se hashea automáticamente');
 p=new Pool();p.failBegin=true;r=createRatingsRepository(p);await assert.rejects(()=>r.getBusiness('ABC',hash('x')));assert.equal(p.destroyed,1);pass('Fallo de BEGIN descarta sesión con aislamiento pendiente, sin afectar otros módulos');
 p=new Pool();p.failBegin=true;r=createRatingsRepository(p);await assert.rejects(()=>r.insert('ABC',hash('x'),4,''));assert.equal(p.destroyed,1);assert.equal(p.locks.size,0);pass('Fallo de BEGIN tras advisory lock libera recurso y descarta sesión');
 p=new Pool();p.failCommit=true;p.failRollback=true;r=createRatingsRepository(p);await assert.rejects(()=>r.insert('ABC',hash('x'),4,''));assert.equal(p.destroyed,1);pass('Fallo de rollback descarta conexión');
 p=new Pool();r=createRatingsRepository(p);
 for(const body of [{businessId:'ABC',rating:'3',visitorId:'v'},{businessId:'ABC',rating:3},{businessId:'ABC',rating:3,visitorId:'bad id'},{businessId:'ABC',rating:3,visitorId:'v',comment:'<b>x</b>'}]){answer=await request(r,'POST','/api/ratings',{body});assert.equal(answer.statusCode,400);}assert.equal(p.rows.length,0);pass('Rutas POST 400 para entradas inválidas');
 answer=await request(r,'POST','/api/ratings',{body:{businessId:'missing',rating:3,visitorId:'v'}});assert.equal(answer.statusCode,404);pass('Ruta negocio inexistente 404');
 answer=await request(r,'POST','/api/ratings',{body:{businessId:'abc',rating:3,visitorId:'v'}});assert.equal(answer.statusCode,200);assert.equal(answer.data.success,true);assert.equal(answer.data.stats.count,1);pass('Ruta POST 200 solo después de commit');
 answer=await request(r,'POST','/api/ratings',{body:{businessId:'ABC',rating:5,visitorId:'v'}});assert.equal(answer.statusCode,409);assert.equal(answer.data.success,false);pass('Ruta duplicado 409');
 answer=await request(r,'GET','/api/ratings/:businessId',{params:{businessId:'abc'},query:{visitorId:'v'}});assert.equal(answer.data.userRating,3);assert.equal(answer.data.average,3);pass('Ruta GET individual consistente con voto original');
 answer=await request(r,'GET','/api/ratings');assert.equal(answer.data.stats.ABC.count,1);assert.equal(answer.headers['Cache-Control'],'no-store');assert(!JSON.stringify(answer.data).includes(hash('v')));pass('GET global conserva contrato sin exponer hashes');
 const sql=p.queries.join('\n');assert(!/\b(?:UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)\b|FOR UPDATE/.test(sql));assert(!p.queries.filter(q=>q.startsWith('INSERT')).some(q=>!q.startsWith('INSERT INTO business_ratings')));pass('Repositorio solo inserta en business_ratings, sin DDL ni bloqueos de businesses');
 console.log(`RESULTADO: ${checks} comprobaciones backend aprobadas; SQL/locks/commit son simulados, SIN MariaDB ni servidor de aplicación.`);
})().catch(e=>{console.error(e);process.exitCode=1});
```

### Migración, respaldo y reversión (propuestos, NO ejecutados)
Consultar docs/sql/enc_reviews_006.sql: verificar destinos/permisos reales, COUNT(*) e integridad; pausar todos los escritores; respaldo actualizado con hash y ensayo de restauración; elegir UNA alternativa, con versión/recursos/ventana/operador aprobados; verificar filas completas, índices y agregados después. No importar stats de JSON.
DDL implica commit: no se promete ROLLBACK. Retirar solo el UNIQUE recién creado requiere bandera deshabilitada y escritores pausados; conservar votos nuevos y conciliar antes de cualquier restauración. Para código, revertir commits normalmente o descartar rama; sin force push. No activar automáticamente la versión anterior basada en JSON ni prometer recuperación de datos con solo revertir código.

### Dictamen
APTO para revisión técnica de código y propuesta. NO APTO para autorizar SQL, integración o despliegue con la evidencia disponible. Esperar revisión de coordinación.
Referencias técnicas primarias consultadas:
- https://mariadb.com/docs/server/reference/sql-functions/secondary-functions/miscellaneous-functions/get_lock
- https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/set-commands/set-transaction

### Verificación estática adicional de cierre
- Tres controles PASAN: solo JSON-LD fijo retirado (otros nodos/metadatos/HTML preservados), DDL y funciones SQL ajenas a ratings idénticos a base, propuesta SQL sin sentencias activas.
- Primer intento del control de HTML no pudo ejecutarse porque faltaba la copia original temporal; se obtuvo por lectura de GitHub del SHA base y el control completo pasó. No fue una falla de código ni se ocultó el intento.
