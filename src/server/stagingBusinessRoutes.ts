import type {Express,Request,Response,NextFunction} from 'express';
import {prepareContactPatch,ContactPatchError,contactDigits} from '../utils/businessContacts';
import {BusinessWriteError} from '../db/stagingBusinessStore';
const strings=['name','category','subcategory','description','address','colonia','postalCode','city','schedule','openingHours','payment','delivery','deliveryOption','facebook','instagram','website','mapsUrl','image','logo_url'];
const arrays=['categories','categorySlugs','gallery','paymentMethods'];
const booleans=['hasDelivery','isTopBusiness','isRecommended'];
function invalid(message:string):never{throw new BusinessWriteError(400,'INVALID_BUSINESS',message);}
export function validateBusinessInput(body:unknown,creating=false){
 if(!body||typeof body!=='object'||Array.isArray(body))invalid('Se requiere un objeto de negocio.');
 const data=body as Record<string,unknown>;const patch:Record<string,any>={};
 const allowed=new Set([...strings,...arrays,...booleans,'phone','whatsapp','clearContacts',...(creating?['ownerName','ownerEmail','allowDuplicate']:['slug'])]);
 for(const key of Object.keys(data))if(!allowed.has(key))invalid('El envío contiene campos no editables.');
 if(creating&&(data.allowDuplicate===true||data.ownerName||data.ownerEmail||Object.hasOwn(data,'isTopBusiness')||Object.hasOwn(data,'isRecommended')))invalid('La fase controlada no permite duplicados ni datos personales del propietario.');
 for(const key of strings)if(Object.hasOwn(data,key)){
  if(typeof data[key]!=='string'||String(data[key]).length>(key==='name'?160:key==='description'?500:2048))invalid('Campo de texto inválido o demasiado largo.');
  patch[key]=String(data[key]).trim();
 }
 if((creating||Object.hasOwn(data,'name'))&&(!patch.name||patch.name.length<2))invalid('El nombre de empresa es obligatorio.');
 for(const key of arrays)if(Object.hasOwn(data,key)){
  if(!Array.isArray(data[key])||data[key].length>20||data[key].some((v:unknown)=>typeof v!=='string'||v.length>2048))invalid('Lista empresarial inválida.');
  patch[key]=[...data[key]];
 }
 for(const key of booleans)if(Object.hasOwn(data,key)){if(typeof data[key]!=='boolean')invalid('Indicador empresarial inválido.');patch[key]=data[key];}
 if(!creating&&Object.hasOwn(data,'slug')){if(typeof data.slug!=='string'||!(/^[a-z0-9][a-z0-9_-]{0,159}$/).test(data.slug))invalid('Enlace personalizado inválido.');patch.slug=data.slug;}
 const contacts=prepareContactPatch(data,true);Object.assign(patch,contacts.patch);
 if(creating){if(data.clearContacts!==undefined)invalid('No se retiran contactos en un alta.');patch.phone=contactDigits(data.phone);patch.whatsapp=contactDigits(data.whatsapp);if(!patch.phone&&!patch.whatsapp)invalid('Se requiere teléfono o WhatsApp mexicano válido.');}
 for(const value of [patch.website,patch.facebook,patch.instagram,patch.mapsUrl,patch.image,patch.logo_url,...(patch.gallery||[])])if(value){
  if(typeof value!=='string')invalid('URL inválida.');
  if(value.startsWith('/uploads/')&&!value.includes('..'))continue;
  try{const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)invalid('URL inválida.');}catch{invalid('URL inválida.');}
 }
 if(patch.categories&&!patch.category)patch.category=patch.categories[0]||'';
 if(patch.category&&!patch.categories)patch.categories=[patch.category];
 return patch;
}
export function registerStagingBusinessRoutes(app:Express,deps:{isStaging:()=>boolean;canWrite:()=>boolean;isAdmin:(req:Request)=>boolean;canPublish?:(req:Request)=>boolean;readAll:()=>Promise<any[]>;store:{create:(draft:any,key:string)=>Promise<any>;update:(id:string|number,patch:any)=>Promise<any>};saved:(b:any)=>void;categorySlugs?:(categories:string[])=>string[]}){
 const failure=(res:Response,error:unknown)=>{
  if(error instanceof ContactPatchError)return res.status(error.status).json({success:false,message:error.message});
  if(error instanceof BusinessWriteError)return res.status(error.status).json({success:false,error:error.code,message:error.message,writeMayHaveSucceeded:error.writeMayHaveSucceeded});
  return res.status(503).json({success:false,message:'No se confirmó el guardado. Reintenta con la misma clave de registro.'});
 };
 const authorize=(req:Request)=>{if(!deps.canWrite())throw new BusinessWriteError(403,'STAGING_BUSINESS_READ_ONLY','Las escrituras controladas no están habilitadas.');if(!deps.isAdmin(req))throw new BusinessWriteError(401,'ADMIN_SESSION_REQUIRED','Se requiere sesión administrativa vigente del servidor.');};
 app.post('/api/submit-business',async(req:Request,res:Response,next:NextFunction)=>{
  if(!deps.isStaging())return next();
  try{authorize(req);const draft=validateBusinessInput(req.body,true);if(draft.categories&&deps.categorySlugs)draft.categorySlugs=deps.categorySlugs(draft.categories);const result=await deps.store.create(draft,req.get('Idempotency-Key')||'');deps.saved(result.business);return res.status(result.replayed?200:201).json({success:true,business:result.business,replayed:result.replayed,message:'Empresa confirmada en MariaDB de Staging.',publishedToWordPress:false});}catch(error){return failure(res,error);}
 });
 app.patch(['/api/businesses/:id','/businesses/:id'],async(req:Request,res:Response,next:NextFunction)=>{
  if(!deps.isStaging())return next();
  try{authorize(req);const patch=validateBusinessInput(req.body);if(['isTopBusiness','isRecommended'].some(key=>Object.hasOwn(patch,key))&&!deps.canPublish?.(req))throw new BusinessWriteError(403,'PUBLISH_PERMISSION_REQUIRED','Se requiere permiso de publicación para modificar distintivos.');if(patch.categories&&deps.categorySlugs)patch.categorySlugs=deps.categorySlugs(patch.categories);const id=String(req.params.id).toLowerCase();const list=await deps.readAll();const current=list.find(b=>String(b.id)===id||b.slug?.toLowerCase()===id||b.previousSlugs?.includes(id));if(!current)throw new BusinessWriteError(404,'BUSINESS_NOT_FOUND','Empresa no encontrada.');const result=await deps.store.update(current.id,patch);deps.saved(result.business);return res.json({success:true,business:result.business,message:'Edición confirmada en MariaDB de Staging.'});}catch(error){return failure(res,error);}
 });
}
