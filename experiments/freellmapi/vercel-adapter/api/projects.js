import {createHmac,timingSafeEqual} from 'node:crypto';
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const safe=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)};
const slugify=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48);
const root='experiments/freellmapi/workspace-memory/projects';
async function gh(path,init={}){const token=process.env.GITHUB_MEMORY_TOKEN;if(!token)throw Object.assign(new Error('Falta configurar GITHUB_MEMORY_TOKEN en Vercel'),{status:503});const r=await fetch('https://api.github.com/repos/dJeoMed78/Encarmenorg/contents/'+path,{...init,headers:{accept:'application/vnd.github+json',authorization:'Bearer '+token,'x-github-api-version':'2022-11-28','content-type':'application/json',...(init.headers||{})}});const j=await r.json();if(!r.ok)throw Object.assign(new Error(j.message||'GitHub API error'),{status:r.status});return j}
function auth(req){const token=process.env.PROXY_ACCESS_TOKEN;if(!token)return false;const c=(req.headers.get('cookie')||'').split('; ').find(x=>x.startsWith('ff_session='))?.slice(11)||'';const [exp,sig]=c.split('.');return !!(exp&&Number(exp)>Date.now()&&safe(sig,createHmac('sha256',token).update(exp).digest('hex')))}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({error:'Method not allowed'});if(!auth(req))return res.status(401).json({error:'Unauthorized'});
 try{
  const body=req.method==='POST'?req.body||{}:{};const action=req.method==='GET'?'list':body.action;
  if(action==='list'){const items=await gh(root);return res.status(200).json({projects:items.filter(x=>x.type==='file'&&x.name.endsWith('.md')).map(x=>({id:x.name.slice(0,-3),name:x.name.slice(0,-3).replace(/-/g,' '),path:x.path,sha:x.sha}))})}
  if(action==='create'){
   const name=String(body.name||'').trim();if(name.length<2||name.length>80)return res.status(400).json({error:'Nombre de proyecto inválido'});const id=slugify(name);if(!id)return res.status(400).json({error:'Nombre inválido'});const path=root+'/'+id+'.md';
   const content='# '+name+'\n\n- ID: '+id+'\n- Creado: '+new Date().toISOString()+'\n- Estado: EN CURSO\n\n## Objetivo\nPor definir.\n\n## Historial de trabajo\n\n## Decisiones\n\n## Pendientes\n\n## Siguiente acción\n\n';
   const j=await gh(path,{method:'PUT',body:JSON.stringify({message:'memory: create project '+id,content:btoa(unescape(encodeURIComponent(content))),branch:'experiment/freellmapi-evaluation-20261116'})});return res.status(201).json({project:{id,name,path,sha:j.content?.sha}})
  }
  const id=slugify(body.projectId);if(!id)return res.status(400).json({error:'Proyecto requerido'});const path=root+'/'+id+'.md';
  const current=await gh(path);const content=decodeURIComponent(escape(atob(current.content.replace(/\n/g,''))));
  if(action==='load')return res.status(200).json({id,content});
  if(action==='append'){
   const role=String(body.role||'');const message=String(body.message||'');if(!['user','assistant','system','event'].includes(role)||!message||message.length>12000)return res.status(400).json({error:'Entrada inválida'});
   const safeMessage=message.replace(/\b(AQ\.[A-Za-z0-9._-]{12,}|gsk_[A-Za-z0-9]{12,}|AIza[A-Za-z0-9_-]{20,})\b/g,'[REDACTED_SECRET]').replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi,'$1[REDACTED]');
   const updated=content+'\n### '+new Date().toISOString()+' · '+role+'\n\n'+safeMessage+'\n';
   const j=await gh(path,{method:'PUT',body:JSON.stringify({message:'memory: append '+role+' to '+id,content:btoa(unescape(encodeURIComponent(updated))),sha:current.sha,branch:'experiment/freellmapi-evaluation-20261116'})});return res.status(200).json({ok:true,sha:j.content?.sha})
  }
  return res.status(400).json({error:'Acción inválida'});
 }catch(e){return res.status(e.status||500).json({error:e.message||'Memory operation failed'})}
}