import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { seedTasks } from './controlSeed.mjs';
export const stages=['implementado','integrado','desplegado','probado','validado manualmente'];
const scopes=['local','github','ia-desarrollo','staging','produccion'];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=m=>{throw new Error(m);};
const text=(v,max=6000)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():fail('Campo obligatorio o demasiado largo.');
const sha=v=>/^[a-f0-9]{40}$/.test(v||'')?v:fail('Se requiere el SHA completo de 40 caracteres.');
const url=v=>{let u;try{u=new URL(v);}catch{fail('Enlace HTTPS inválido.');}if(u.protocol!=='https:'||u.username||u.password)fail('Usa un enlace HTTPS sin credenciales.');return u.href;};
export function suggestedActions(t) {
 if(t.failures.some(f=>!f.resolved)||t.status==='bloqueado')return [
  'Investigar el bloqueo, reproducir la falla y documentar su causa antes de modificar.',
  'Preparar y probar una corrección aislada; publicar en Staging únicamente después de CI satisfactorio.',
  'Revisar evidencias y dependencias; informar qué dato o acceso falta para continuar.'];
 const focus=t.id.includes('REGISTRO')?'el alta pública y la persistencia tras recarga':t.id.includes('EMPRESAS-043')?'las fuentes DENUE y la aprobación con lectura posterior':t.id.includes('CLASIFICADOS')?'la localidad, los datos originales y la aprobación de clasificados':t.id.includes('MEDIOS')?'la carga independiente de logotipo, fachada y galería':t.id.includes('COMENTARIOS')?'el envío, la visualización y la moderación de comentarios':t.id.includes('BUILD')?'la identidad del proceso Node, el bundle y la release activa':'el flujo funcional y la persistencia';
 if(!t.evidence.some(e=>e.kind==='integrado'&&e.verified&&e.sha===t.sha))return [
  'Revisar la entrega, sus cambios y CI; documentar con precisión lo que falta.',
  'Preparar la integración a ia-desarrollo y publicación en Staging con pruebas y reversión verificadas.',
  'Verificar '+focus+' y registrar el resultado real sin cerrar anticipadamente.'];
 return ['Verificar '+focus+' en Staging y registrar pruebas funcionales reales.',
  'Cotejar rama, commit, PR y versión activa; completar únicamente las evidencias comprobadas.',
  closureGaps(t).length?'Resolver los criterios faltantes y preparar una revisión manual de cierre.':'Revisar el expediente completo y cerrar solo si todas las evidencias siguen siendo válidas.'];
}
export function toClientState(s){return {...s,tasks:s.tasks.map(t=>({...t,suggestions:suggestedActions(t),instructions:t.instructions||[]}))};}
export function closureGaps(t) {
 const gaps=[];
 if(!/^[a-f0-9]{40}$/.test(t.sha))gaps.push('Falta el SHA de la versión objetivo.');
 for(const kind of stages){
  const scope=kind==='integrado'?'ia-desarrollo':kind==='implementado'?'github':t.target;
  if(!t.evidence.some(e=>e.kind===kind&&e.sha===t.sha&&e.scope===scope&&e.verified&&e.result==='PASS'))gaps.push(`${kind}: falta evidencia verificada de la versión objetivo en ${scope}.`);
 }
 if(t.failures.some(f=>!f.resolved))gaps.push('Hay fallas abiertas.');
 if((t.instructions||[]).some(i=>i.status!=='realizada'))gaps.push('Hay instrucciones pendientes de atender.');
 if(t.status==='bloqueado')gaps.push('La tarea está bloqueada.');
 if(t.target==='produccion')gaps.push('Producción protegida: este tablero no autoriza ni certifica cierres en producción.');
 return gaps;
}
export function initialState(){return {version:1,revision:0,tasks:structuredClone(seedTasks),events:[]};}
export function applyEvent(state,event) {
 const s=structuredClone(state);const {type,taskId,data,actor,at,id}=event;
 if(type==='create'){
  if(s.tasks.length>=500)fail('Límite de tareas alcanzado.');
  const key=text(data.id,100);if(!/^[A-Za-z0-9_-]+$/.test(key)||s.tasks.some(t=>t.id===key))fail('ID inválido o duplicado.');
  s.tasks.push({id:key,title:text(data.title,180),owner:text(data.owner,100),priority:['P1','P2','P3'].includes(data.priority)?data.priority:'P2',branch:text(data.branch,200),target:'staging',sha:'',status:'pendiente',updatedAt:at,notes:text(data.notes),evidence:[],failures:[],closed:false});
 }else{
  const t=s.tasks.find(t=>t.id===taskId);if(!t)fail('Tarea inexistente.');
  if(type==='checkpoint'||type==='decision'){text(data.details);}
  else if(type==='instruction'){
   if(!['1','2','3','custom'].includes(data.choice))fail('Elige una de las tres opciones o escribe una acción.');
   const instruction={id,choice:data.choice,text:text(data.text),actor,at,status:'pendiente',updates:[]};
   t.instructions=t.instructions||[];t.instructions.push(instruction);t.closed=false;
  }else if(type==='instruction_result'){
   const instruction=(t.instructions||[]).find(i=>i.id===data.instructionId);if(!instruction)fail('Instrucción no encontrada.');
   if(!['en_curso','realizada','bloqueada'].includes(data.status))fail('Estado de instrucción inválido.');
   const update={status:data.status,details:text(data.details),url:data.url?url(data.url):'',actor,at};
   if(data.status==='realizada'&&!update.url)fail('La acción realizada requiere enlace a evidencia.');
   instruction.status=data.status;instruction.updates.push(update);t.closed=false;
  }else if(type==='meta'){
   t.owner=text(data.owner,100);t.branch=text(data.branch,200);t.priority=['P1','P2','P3'].includes(data.priority)?data.priority:fail('Prioridad inválida.');
   t.sha=data.sha?sha(data.sha):'';t.target=['staging','produccion'].includes(data.target)?data.target:fail('Entorno inválido.');
   t.status=['pendiente','bloqueado'].includes(data.status)?data.status:fail('Estado inválido.');t.notes=text(data.notes);t.closed=false;
  }else if(type==='evidence'){
   const kind=[...stages,'referencia','captura','prueba local'].includes(data.kind)?data.kind:fail('Tipo inválido.');
   const scope=scopes.includes(data.scope)?data.scope:fail('Entorno inválido.');
   const e={id,kind,scope,branch:text(data.branch,200),sha:data.sha?sha(data.sha):'',url:url(data.url),observedAt:text(data.observedAt,50),details:text(data.details),actor,verified:data.verified===true,result:['PASS','FAIL','PENDIENTE'].includes(data.result)?data.result:fail('Resultado inválido.')};
   if(!Number.isFinite(Date.parse(e.observedAt))||Date.parse(e.observedAt)>Date.parse(at)+60000)fail('Fecha de observación inválida o futura.');
   if(stages.includes(kind)&&(!e.sha||!e.verified||e.result!=='PASS'))fail('Un hito exige SHA, resultado PASS y confirmación explícita de revisión de evidencia real. Usa referencia para lo no verificado.');
   if(kind==='integrado'&&(scope!=='ia-desarrollo'||e.branch!=='ia-desarrollo'||!/^https:\/\/github.com\/dJeoMed78\/Encarmenorg\/(pull\/\d+|commit\/[a-f0-9]{40})(?:[/?#]|$)/.test(e.url)))fail('Integración requiere PR o commit del repositorio y rama ia-desarrollo.');
   if(kind==='implementado'&&scope!=='github')fail('Registra el trabajo local como prueba local; implementado requiere publicación en GitHub.');
   if(['desplegado','probado','validado manualmente'].includes(kind)&&!['staging','produccion'].includes(scope))fail('Este hito requiere un entorno real.');
   t.evidence.push(e);t.closed=false;
   if(e.result==='FAIL'){t.failures.push({id,details:e.details,url:e.url,actor,at,resolved:false});t.status='bloqueado';}
  }else if(type==='failure'){
   t.failures.push({id,details:text(data.details),url:url(data.url),actor,at,resolved:false});t.status='bloqueado';t.closed=false;
  }else if(type==='resolve'){
   const f=t.failures.find(f=>f.id===data.failureId&&!f.resolved);if(!f)fail('Falla no encontrada.');
   f.resolved=true;f.resolution={details:text(data.details),url:url(data.url),actor,at};t.closed=false;
   if(!t.failures.some(f=>!f.resolved))t.status='pendiente';
  }else if(type==='close'){
   const gaps=closureGaps(t);if(gaps.length)fail(gaps.join(' '));text(data.details);t.closed=true;t.closedAt=at;
  }else if(type==='reopen'){text(data.details);t.closed=false;t.status='pendiente';}
  else fail('Acción desconocida.');
  t.updatedAt=at;
 }
 s.revision++;s.events.push(event);return s;
}
// Durable append-only logical journal, outside Hostinger release directories.
// Exclusive mkdir lock + optimistic revision prevents lost updates across workers.
export function createJournal(dir){
 const file=path.join(dir,'journal.json'), lock=path.join(dir,'.write-lock');
 function prepare(){fs.mkdirSync(dir,{recursive:true,mode:0o700});if(fs.lstatSync(dir).isSymbolicLink()||(fs.statSync(dir).mode&0o077))fail('Directorio de control no privado.');}
 function read(){
  prepare();if(!fs.existsSync(file))return initialState();
  if(fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>30*1024*1024)fail('Bitácora inválida.');
  const events=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(events))fail('Bitácora inválida.');
  let s=initialState(),previous='0';
  for(const event of events){const {digest,...payload}=event;if(payload.previous!==previous||hash(payload)!==digest)fail('Integridad de bitácora inválida.');s=applyEvent(s,event);previous=digest;}
  return s;
 }
 function append(revision,type,taskId,data,actor,requestId){
  prepare();try{fs.mkdirSync(lock,{mode:0o700});}catch{fail('Otra escritura está en curso; vuelve a cargar.');}
  let temp;
  try{
   const s=read();if(requestId&&s.events.some(e=>e.requestId===requestId))return s;
   if(revision!==s.revision)fail('La sesión cambió. Vuelve a cargar antes de guardar.');
   if(type==='instruction'){
    const task=s.tasks.find(t=>t.id===taskId);if(!task)fail('Tarea inexistente.');
    if(!['1','2','3','custom'].includes(data.choice))fail('Selecciona una acción.');
    data={choice:data.choice,text:data.choice==='custom'?text(data.custom):suggestedActions(task)[Number(data.choice)-1]};
   }
   const e={id:randomUUID(),type,taskId,data,actor,at:new Date().toISOString(),previous:s.events.at(-1)?.digest||'0',...(requestId?{requestId}: {})};e.digest=hash(e);
   const next=applyEvent(s,e);temp=path.join(dir,'.journal-'+randomUUID());
   const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(next.events));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
   fs.renameSync(temp,file);temp=null;const dfd=fs.openSync(dir,'r');try{fs.fsyncSync(dfd);}finally{fs.closeSync(dfd);}
   const verified=read();if(verified.revision!==next.revision)fail('No fue posible confirmar el guardado.');return verified;
  }finally{if(temp)fs.rmSync(temp,{force:true});fs.rmdirSync(lock);}
 }
 return {read,append};
}
export function registerControlBoard(app,{security,enabled,directory,jsonParser,htmlPath}){
 const journal=createJournal(directory);
 app.get(['/control','/control/'],(_req,res)=>res.set({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}).sendFile(htmlPath));
 const gate=(req,res,next)=>{
  res.set({'Cache-Control':'no-store','X-Encarmen-Control':'ENC-CONTROL-20261113'});
  if(!enabled())return res.status(403).json({message:'Control disponible únicamente en Staging aislado.'});
  if(!security.isAuthorized(req,'admin:manage'))return res.status(401).json({message:'Inicia sesión administrativa para consultar el control.'});
  if(req.get('Origin')&&req.get('Origin')!=='https://staging.encarmen.org')return res.status(403).json({message:'Origen no permitido.'});
  next();
 };
 app.get('/api/control/state',gate,(_req,res)=>{try{res.json(toClientState(journal.read()));}catch{res.status(503).json({message:'No se pudo leer la bitácora. No se reemplazaron los datos.'});}});
 app.post('/api/control/events',gate,jsonParser, (req,res)=>{
  try{
   if(!req.is('application/json'))return res.status(415).json({message:'Se requiere JSON.'});
   const b=req.body;if(!b||JSON.stringify(b).length>24000)return res.status(400).json({message:'Registro inválido o demasiado grande.'});
   const actor=security.getPrincipal(req)?.username;if(!actor)return res.status(401).json({message:'Sesión vencida.'});
   const next=journal.append(b.revision,b.type,b.taskId,b.data||{},actor);res.json(toClientState(next));
  }catch(e){res.status(409).json({message:e.message||'No se guardó el registro.'});}
 });
}
