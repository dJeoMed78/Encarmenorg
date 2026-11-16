import {createHash} from 'node:crypto';
import type {Request, Response} from 'express';
import type {DenueCandidate, DenueDuplicate} from '../types/denue';
import {contactDigits} from '../utils/businessContacts';

export const DENUE_AREA = '040030001';
const API = 'https://www.inegi.org.mx/app/api/denue/v1/consulta/';
export class DenueError extends Error {
  constructor(public code:string, public status=503) { super(code); }
}
const clean = (v:unknown, max=300):string => typeof v==='string' || typeof v==='number'
  ? String(v).replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max) : '';
const norm = (v:unknown) => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const denueSourceUrl = (id:string) => /^[1-9]\d{0,11}$/.test(id)
  ? `https://www.inegi.org.mx/app/mapa/denue/default.aspx?idee=${id}` : '';
function website(v:unknown) {
  const text=clean(v,500);if(!text)return '';
  try {const u=new URL(/^https?:\/\//i.test(text)?text:`https://${text}`);
    return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:'';
  }catch{return '';}
}
export function normalizeDenue(row:any, now=new Date().toISOString()):DenueCandidate {
  if(!row || typeof row!=='object' || Array.isArray(row))throw new DenueError('DENUE_INVALID_RESPONSE');
  const denueId=clean(row.Id), sourceUrl=denueSourceUrl(denueId),name=clean(row.Nombre);
  if(!sourceUrl || !name)throw new DenueError('DENUE_INCOMPLETE_RECORD');
  const areaGeo=clean(row.AreaGeo),parts=clean(row.Ubicacion).split(',').map(x=>x.trim());
  const coordinate=(v:unknown,max:number)=>{if(clean(v)==='')return null;const n=Number(v);return Number.isFinite(n)&&Math.abs(n)<=max?n:null;};
  const streetType=clean(row.Tipo_vialidad),street=clean(row.Calle),exterior=clean(row.Num_Exterior),interior=clean(row.Num_Interior);
  const email=clean(row.Correo_e);const activity=clean(row.Clase_actividad);
  return {denueId,name,legalName:clean(row.Razon_social),activity,category:activity,
    streetType,street,exterior,interior,address:[streetType,street,exterior,interior?`Interior ${interior}`:''].filter(Boolean).join(' '),
    colonia:clean(row.Colonia),postalCode:clean(row.CP),locality:parts[0]||'',municipality:parts[1]||'',state:parts[2]||'',areaGeo,
    phone:contactDigits(row.Telefono),email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'',website:website(row.Sitio_internet),
    latitude:coordinate(row.Latitud,90),longitude:coordinate(row.Longitud,180),clee:clean(row.CLEE),
    sourceUpdatedAt:clean(row.Fecha_Actualizacion),sourceRegisteredAt:clean(row.Fecha_Alta),source:'INEGI_DENUE',sourceUrl,consultedAt:now,
    geography:areaGeo===DENUE_AREA && (!parts[0] || norm(parts[0])==='ciudaddelcarmen') && (!parts[1] || norm(parts[1])==='carmen') && (!parts[2] || norm(parts[2])==='campeche')?'VERIFICADA':/^\d{9}$/.test(areaGeo)?'FUERA DE LOCALIDAD':'PENDIENTE DE VERIFICACIÓN GEOGRÁFICA',
    duplicate:'PENDIENTE DE VERIFICACIÓN',sourceReview:'PENDIENTE DE REVISIÓN DEL VISOR'};
}

// A shared phone or a similar name alone never proves a duplicate or a branch.
export function classifyDenueDuplicate(candidate:DenueCandidate, catalog:any[]):DenueDuplicate {
  let possible=false;
  for(const b of catalog){
    if(b.denue?.denueId===candidate.denueId || (candidate.clee && b.denue?.clee===candidate.clee))return 'DUPLICADO CONFIRMADO';
    const sameName=norm(b.name)===norm(candidate.name);
    const sameAddress=Boolean(candidate.address && norm(b.address)===norm(candidate.address));
    const samePhone=Boolean(candidate.phone && [contactDigits(b.phone),contactDigits(b.whatsapp)].includes(candidate.phone));
    const lat=b.denue?.latitude ?? b.latitude, lng=b.denue?.longitude ?? b.longitude;
    const near=candidate.latitude!==null && candidate.longitude!==null && lat!=null && lng!=null &&
      Math.abs(Number(lat)-candidate.latitude)<0.0003 && Math.abs(Number(lng)-candidate.longitude)<0.0003;
    if(sameName && sameAddress)return 'DUPLICADO CONFIRMADO';
    if(sameName && (samePhone || near || !candidate.address || !b.address))possible=true;
    if(!sameName && sameAddress && samePhone)possible=true;
  }
  return possible?'POSIBLE DUPLICADO':'NUEVO';
}

export function createDenueClient(options:{token:()=>string|undefined;fetcher?:typeof fetch;now?:()=>number;timeoutMs?:number;limitPerMinute?:number}) {
  const fetcher=options.fetcher||fetch,clock=options.now||Date.now;
  let calls:number[]=[],active=0;
  async function request(segments:string[]) {
    const token=options.token();
    if(!token || !/^[a-zA-Z0-9-]{8,128}$/.test(token))throw new DenueError('DENUE_TOKEN_NOT_CONFIGURED');
    const now=clock();calls=calls.filter(t=>now-t<60000);
    if(calls.length>=(options.limitPerMinute??30)||active>=2)throw new DenueError('DENUE_RATE_LIMIT',429);
    calls.push(now);active++;
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),options.timeoutMs??8000);
    try {
      // Never return/log this URL: the official API requires the secret in its path.
      const response=await fetcher(API+segments.map(encodeURIComponent).join('/')+'/'+encodeURIComponent(token),
        {signal:controller.signal,redirect:'error',headers:{Accept:'application/json'}});
      if(!response.ok)throw new DenueError(response.status===401||response.status===403?'DENUE_TOKEN_REJECTED':'DENUE_UPSTREAM_ERROR');
      if(Number(response.headers.get('content-length')||0)>2_000_000)throw new DenueError('DENUE_RESPONSE_TOO_LARGE');
      const reader=response.body?.getReader();if(!reader)throw new DenueError('DENUE_INVALID_RESPONSE');
      let bytes=0;const chunks:Uint8Array[]=[];
      while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;
        if(bytes>2_000_000){await reader.cancel();throw new DenueError('DENUE_RESPONSE_TOO_LARGE');}chunks.push(value);}
      const text=Buffer.concat(chunks).toString('utf8');
      // INEGI may return a JSON-encoded JSON string. Never log raw upstream
      // content: it may contain identifying details or a reflected token.
      let rows:any;
      try {
        rows=JSON.parse(text.replace(/^\uFEFF/,''));
        if(typeof rows==='string' && /^[\s]*[\[{]/.test(rows))rows=JSON.parse(rows);
      } catch {
        throw new DenueError(/^\s*</.test(text)?'DENUE_UPSTREAM_NON_JSON_HTML':'DENUE_UPSTREAM_INVALID_JSON');
      }
      if(!Array.isArray(rows))throw new DenueError('DENUE_UPSTREAM_NOT_ARRAY');
      if(rows.length>20)throw new DenueError('DENUE_UPSTREAM_TOO_MANY_ROWS');
      return rows;
    } catch(error){
      if(error instanceof DenueError)throw error;
      throw new DenueError(controller.signal.aborted?'DENUE_TIMEOUT':'DENUE_UNAVAILABLE');
    } finally {clearTimeout(timer);active--;}
  }
  return {
    async search(query='',page=1,id='0') {
      if(!Number.isInteger(page)||page<1||page>100||query.length>80||/[\u0000-\u001f/\\?#]/.test(query)||!(id==='0'||denueSourceUrl(id)))throw new DenueError('DENUE_QUERY_INVALID',400);
      return (await request(['BuscarAreaAct','04','003','0001','0','0','0','0','0','0',query.trim()||'0',String((page-1)*20+1),String(page*20),id])).map(row=>normalizeDenue(row,new Date(clock()).toISOString()));
    },
    async ficha(id:string) {
      if(!denueSourceUrl(id))throw new DenueError('DENUE_ID_INVALID',400);
      const rows=await request(['Ficha',id]);
      if(rows.length!==1||String(rows[0]?.Id)!==id)throw new DenueError('DENUE_SOURCE_MISMATCH',422);
      return normalizeDenue(rows[0],new Date(clock()).toISOString());
    }
  };
}

export function denueDraft(c:DenueCandidate) {
  return {name:c.name,category:c.category,categories:c.category?[c.category]:[],description:'',
    address:c.address,colonia:c.colonia,phone:c.phone,whatsapp:'',email:c.email,website:c.website,
    schedule:'',payment:'',delivery:'',image:'',gallery:[],source:'INEGI_DENUE',denue:c};
}
export function denueRequestId(id:string) {
  const h=createHash('sha256').update('encarmen:denue:'+id).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function createDenueRadar(deps:{client:ReturnType<typeof createDenueClient>;authorized:(req:Request)=>boolean;
  canWrite:()=>boolean;readAll:()=>Promise<any[]>;
  create:(draft:any,key:string,duplicateCheck:(records:any[])=>boolean)=>Promise<{business:any}>;
  publishCache:(business:any)=>void;now?:()=>number}) {
  const pending=new Map<string,{candidate:DenueCandidate;expires:number}>();const now=deps.now||Date.now;
  const error=(res:Response,e:unknown)=>res.status(e instanceof DenueError?e.status:503).json({success:false,code:e instanceof DenueError?e.code:'DENUE_SQL_UNCONFIRMED',message:e instanceof DenueError?e.code:'No se confirmó la operación en MariaDB. Conserva el ID DENUE para conciliar.'});
  const prune=()=>{for(const [id,x]of pending)if(x.expires<now())pending.delete(id);};
  async function approve(id:string,reviewed:boolean,revision:unknown) {
    if(!deps.canWrite())throw new DenueError('DENUE_WRITE_LANE_CLOSED',403);
    prune();const cached=pending.get(id);
    if(!cached||!reviewed||revision!==cached.candidate.revision)throw new DenueError('DENUE_REVIEW_REQUIRED',422);
    const c=cached.candidate;
    if(c.geography!=='VERIFICADA'||!c.address)throw new DenueError('DENUE_GEOGRAPHY_OR_ADDRESS_UNVERIFIED',422);
    // Revalidate against INEGI's official Ficha endpoint. BuscarAreaAct is a
    // paginated discovery endpoint; using it as an ID lookup can return a
    // non-record response even when the official Ficha is valid.
    const ficha=await deps.client.ficha(id);
    if(ficha.denueId!==id||norm(ficha.name)!==norm(c.name)||norm(ficha.address)!==norm(c.address)||
       ['name','address','phone','email','website','activity','clee','colonia'].some(k=>(ficha as any)[k] !== (c as any)[k]))throw new DenueError('DENUE_SOURCE_CHANGED_OR_UNAVAILABLE',422);
    const catalog=await deps.readAll();
    const existing=catalog.find(b=>b.denue?.denueId===id);
    // Readback of an already committed exact import makes retries safe after a lost response.
    const draft=denueDraft(c);
    const matches=(b:any)=>b && b.denue?.denueId===id && ['name','address','phone','whatsapp','email','website','description','colonia'].every(k=>String(b[k]??'')===String((draft as any)[k]??''));
    if(existing){if(!matches(existing))throw new DenueError('DENUE_EXISTING_CONFLICT',409);deps.publishCache(existing);return {business:existing,replayed:true};}
    if(classifyDenueDuplicate(c,catalog)!=='NUEVO')throw new DenueError('DENUE_DUPLICATE_REVIEW_REQUIRED',409);
    const saved=await deps.create(draft,denueRequestId(id),records=>classifyDenueDuplicate(c,records)!=='NUEVO');
    const verified=(await deps.readAll()).find(b=>String(b.id)===String(saved.business?.id));
    if(!matches(verified))throw new DenueError('DENUE_READBACK_UNCONFIRMED');
    deps.publishCache(verified);return {business:verified,replayed:false};
  }
  return {
    async search(req:Request,res:Response) {
      res.set('Cache-Control','no-store');if(!deps.authorized(req))return res.status(403).json({success:false,code:'ADMIN_REQUIRED'});
      try {prune();const catalog=await deps.readAll();const rows=await deps.client.search(String(req.query.query||''),Number(req.query.page||1));
        const candidates=rows.map(c=>({...c,revision:createHash('sha256').update(JSON.stringify(c)).digest('hex'),duplicate:classifyDenueDuplicate(c,catalog)}));
        for(const c of candidates){if(pending.size>=200)pending.delete(pending.keys().next().value!);pending.set(c.denueId,{candidate:c,expires:now()+15*60000});}
        return res.json({success:true,candidates,nextPage:rows.length===20?Number(req.query.page||1)+1:null});
      }catch(e){return error(res,e);}
    },
    async single(req:Request,res:Response) {
      if(!deps.authorized(req))return res.status(403).json({success:false,code:'ADMIN_REQUIRED'});
      try {const id=req.body?.candidate?.denueId;return res.json({success:true,...await approve(id,req.body?.sourceReviewed===true,req.body?.candidate?.revision),publishedToWordPress:false});}catch(e){return error(res,e);}
    },
    async batch(req:Request,res:Response) {
      if(!deps.authorized(req))return res.status(403).json({success:false,code:'ADMIN_REQUIRED'});
      const list=req.body?.candidates;
      if(!Array.isArray(list)||!list.length||list.length>10)return res.status(400).json({success:false,code:'DENUE_BATCH_LIMIT'});
      const confirmed:any[]=[],failed:any[]=[],results:any[]=[];const seen=new Set<string>();
      for(const item of list){try{if(seen.has(item?.denueId))throw new DenueError('DENUE_BATCH_DUPLICATE',409);seen.add(item?.denueId);
        const result=await approve(item?.denueId,item?.sourceReviewed===true,item?.revision);confirmed.push(result.business);results.push({denueId:item.denueId,success:true,replayed:result.replayed});
      }catch(e){const code=e instanceof DenueError?e.code:'DENUE_SQL_UNCONFIRMED';failed.push({denueId:item?.denueId,code});results.push({denueId:item?.denueId,success:false,code});}}
      return res.status(failed.length?207:200).json({success:failed.length===0,confirmed,failed,results,count:confirmed.length,publishedToWordPress:false});
    }
  };
}
