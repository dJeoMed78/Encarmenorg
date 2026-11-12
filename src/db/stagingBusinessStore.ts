import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {contactDigits, contactsMatchReadback} from '../utils/businessContacts';
import {STAGING_BUSINESS_DATABASE} from '../server/stagingBusinessSecurity';
import {verifyStagingIsolation} from '../server/stagingIsolationProof';
export class BusinessWriteError extends Error {
  constructor(public status:number, public code:string, message:string, public writeMayHaveSucceeded=false){super(message);}
}
const columns=['id','name','category','subcategory','description','address','colonia','phone','whatsapp','email','website','facebook','instagram','schedule','image','rating','reviews_count','verified','featured','status','raw_data'];
const raw=(row:any)=>{try {const data=JSON.parse(row.raw_data || '{}');return data && typeof data==='object' && !Array.isArray(data) ? data : {};}catch{return {};}};
const values=(b:any,metadata:any={})=>[String(b.id),b.name||'',b.category||'',b.subcategory||'',b.description||'',b.address||'',b.colonia||'',b.phone||'',b.whatsapp||'',b.email||'',b.website||'',b.facebook||'',b.instagram||'',b.schedule||'',b.image||'',b.rating??0,b.reviews_count??0,b.verified?1:0,b.featured?1:0,b.status||'published',JSON.stringify({...b,...metadata})];
const norm=(s:unknown)=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
// Verify the actual SQL columns as well as raw_data before COMMIT. A projected
// object can hide a discarded column behind its raw_data alias (e.g. a trigger).
function matchesWrittenValues(row:any, fields:string[], data:any[]):boolean {
 if(!row || String(row.id)!==String(data[0]))return false;
 return fields.every(field=>{
  const expected=data[columns.indexOf(field)];
  if(field==='raw_data'){
   try{return isDeepStrictEqual(JSON.parse(row.raw_data),JSON.parse(expected));}catch{return false;}
  }
  if(['rating','reviews_count','verified','featured'].includes(field))return Number(row[field])===Number(expected);
  return String(row[field] ?? '')===String(expected ?? '');
 });
}
export function createStagingBusinessStore(deps:{canWrite:()=>boolean;getConnection:()=>Promise<any>;serialize:(row:any)=>any;verifyIsolation?:(conn:any)=>Promise<{ok:boolean;code:string}>}) {
 const verify=deps.verifyIsolation ?? ((conn:any)=>verifyStagingIsolation(conn,process.env));
 const assertWrite=()=>{if(!deps.canWrite())throw new BusinessWriteError(403,'STAGING_BUSINESS_READ_ONLY','Escritura de negocios no habilitada de forma segura.');};
 async function connection(){assertWrite();const conn=await deps.getConnection();try {const [rows]=await conn.query('SELECT DATABASE() AS db_name');if(rows[0]?.db_name!==STAGING_BUSINESS_DATABASE)throw new BusinessWriteError(403,'DATABASE_TARGET_MISMATCH','La conexión no corresponde a la base autorizada.');
    const [engine]=await conn.query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'businesses'");
    if(String(engine[0]?.ENGINE||'').toLowerCase()!=='innodb')throw new BusinessWriteError(503,'BUSINESS_ENGINE_UNVERIFIED','Se requiere businesses transaccional InnoDB; no se modificó el esquema.');
    const [primary]=await conn.query("SELECT COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'businesses' AND INDEX_NAME = 'PRIMARY'");
    if(primary.length!==1||primary[0].COLUMN_NAME!=='id'||Number(primary[0].NON_UNIQUE)!==0)throw new BusinessWriteError(503,'BUSINESS_PRIMARY_KEY_UNVERIFIED','Se requiere clave primaria única id; no se modificó el esquema.');
    const proof=await verify(conn);if(!proof.ok)throw new BusinessWriteError(403,'STAGING_ISOLATION_UNPROVEN',`No se comprobó el aislamiento de Staging (${proof.code}); escritura bloqueada.`);return conn;}catch(e){conn.release();throw e;}}
 async function transaction<T>(conn:any, action:()=>Promise<T>){let committing=false;try {await conn.beginTransaction();const value=await action();assertWrite();committing=true;await conn.commit();return value;}catch(e){try{await conn.rollback();}catch{}if(e instanceof BusinessWriteError)throw e;throw new BusinessWriteError(503,'BUSINESS_WRITE_UNCONFIRMED','No se confirmó el guardado. Recarga antes de reintentar; conserva la clave de registro.',committing);} }
 return {
  async create(draft:any,requestId:string,duplicateCheck?:(records:any[])=>boolean){
   if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId))throw new BusinessWriteError(400,'REQUEST_ID_REQUIRED','Se requiere una clave de registro UUID para reintentos seguros.');
   const digest=createHash('sha256').update(JSON.stringify(draft)).digest('hex');const conn=await connection();let locked=false;
   try {
    const [lock]=await conn.query('SELECT GET_LOCK(?, 5) AS acquired',['encarmen:staging:business-create']);
    if(Number(lock[0]?.acquired)!==1)throw new BusinessWriteError(409,'REGISTRATION_BUSY','Otro registro está en curso; reintenta con la misma clave.');locked=true;
    return await transaction(conn,async()=>{
     const [rows]=await conn.query('SELECT * FROM businesses ORDER BY id ASC');
     const replay=rows.find((r:any)=>raw(r)._stagingRegistrationId===requestId);
     if(replay){if(raw(replay)._stagingRegistrationDigest!==digest)throw new BusinessWriteError(409,'IDEMPOTENCY_CONFLICT','La clave ya corresponde a otros datos.');return {business:deps.serialize(replay),replayed:true};}
     const digits=[contactDigits(draft.phone),contactDigits(draft.whatsapp)].filter(Boolean);
     if(duplicateCheck ? duplicateCheck(rows.map(deps.serialize)) : rows.some((r:any)=>norm(r.name)===norm(draft.name)||digits.some(n=>n===contactDigits(r.phone)||n===contactDigits(r.whatsapp))))throw new BusinessWriteError(409,'BUSINESS_DUPLICATE','Ya existe un negocio con ese nombre o contacto.');
     const id=Math.max(4000,...rows.map((r:any)=>Number(r.id)).filter(Number.isSafeInteger))+1;
     if(!Number.isSafeInteger(id))throw new BusinessWriteError(409,'ID_EXHAUSTED','No se pudo asignar un ID seguro.');
     const base=String(draft.name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'empresa';
     let slug=base;let suffix=0;while(rows.some((r:any)=>{const b=deps.serialize(r);return b.slug===slug||b.previousSlugs?.includes(slug);})){slug=`${base}-${id}${suffix?'-'+suffix:''}`;suffix++;}
     const business={...draft,id,slug,createdAt:new Date().toISOString(),isTopBusiness:false,isRecommended:false,rating:0,reviewCount:0,status:'published'};
     assertWrite();await conn.query(`INSERT INTO businesses (${columns.join(', ')}) VALUES (${columns.map(()=>'?').join(', ')})`,values(business,{_stagingRegistrationId:requestId,_stagingRegistrationDigest:digest}));
     const [saved]=await conn.query('SELECT * FROM businesses WHERE id = ?',[String(id)]);
     if(!saved[0]||!contactsMatchReadback({phone:business.phone,whatsapp:business.whatsapp},saved[0]))throw new BusinessWriteError(503,'REGISTRATION_READBACK_FAILED','No se verificó el negocio; no se confirmó el registro.');
     if(!matchesWrittenValues(saved[0],columns,values(business,{_stagingRegistrationId:requestId,_stagingRegistrationDigest:digest})))throw new BusinessWriteError(503,'REGISTRATION_READBACK_FAILED','Los campos persistidos no coinciden con el registro; no se confirmó el guardado.');
     return {business:deps.serialize(saved[0]),replayed:false};
    });
   } finally {if(locked){try{await conn.query('SELECT RELEASE_LOCK(?)',['encarmen:staging:business-create']);}catch{}}conn.release();}
  },
  async delete(id:string|number){
   const businessId=String(id);
   if(!/^[0-9]+$/.test(businessId))throw new BusinessWriteError(400,'BUSINESS_ID_INVALID','Identificador empresarial inválido.');
   const conn=await connection();
   try{return await transaction(conn,async()=>{
    const [locked]=await conn.query('SELECT id FROM businesses WHERE id = ? FOR UPDATE',[businessId]);
    if(locked.length!==1)throw new BusinessWriteError(404,'BUSINESS_NOT_FOUND','La empresa ya no existe.');
    assertWrite();
    const [removed]=await conn.query('DELETE FROM businesses WHERE id = ?',[businessId]);
    if(Number(removed.affectedRows)!==1)throw new BusinessWriteError(503,'BUSINESS_DELETE_UNCONFIRMED','MariaDB no confirmó una sola eliminación.');
    const [remaining]=await conn.query('SELECT id FROM businesses WHERE id = ?',[businessId]);
    if(remaining.length)throw new BusinessWriteError(503,'BUSINESS_DELETE_READBACK_FAILED','El registro permanece en MariaDB; no se confirmó su eliminación.');
    return {deleted:true};
   });}finally{conn.release();}
  },
  async update(id:string|number,patch:any){
   const conn=await connection();
   try{return await transaction(conn,async()=>{
    const [rows]=await conn.query('SELECT * FROM businesses WHERE id = ? FOR UPDATE',[String(id)]);
    if(!rows[0])throw new BusinessWriteError(404,'BUSINESS_NOT_FOUND','El negocio ya no existe.');
    const current=deps.serialize(rows[0]);const previous=raw(rows[0]);
    const merged={...current,...patch,id:current.id,updatedAt:new Date().toISOString()};
    // Explicit changes invalidate stale presentation aliases, never untouched legacy values.
    if(Object.hasOwn(patch,'schedule')&&!Object.hasOwn(patch,'openingHours'))delete merged.openingHours;
    if(Object.hasOwn(patch,'payment')&&!Object.hasOwn(patch,'paymentMethods'))delete merged.paymentMethods;
    if(Object.hasOwn(patch,'delivery')&&!Object.hasOwn(patch,'deliveryOption'))delete merged.deliveryOption;
    if(patch.slug && patch.slug!==current.slug){const [catalog]=await conn.query('SELECT * FROM businesses ORDER BY id ASC');if(catalog.some((r:any)=>{const b=deps.serialize(r);return String(b.id)!==String(current.id)&&(b.slug===patch.slug||b.previousSlugs?.includes(patch.slug));}))throw new BusinessWriteError(409,'SLUG_CONFLICT','Ese enlace ya está reservado.');merged.previousSlugs=[...new Set([...(current.previousSlugs||[]),current.slug].filter(Boolean))];}
    if(patch.name && patch.name!==current.name)merged.previousNames=[...new Set([...(current.previousNames||[]),current.name].filter(Boolean))];
    const metadata=previous._stagingRegistrationId?{_stagingRegistrationId:previous._stagingRegistrationId,_stagingRegistrationDigest:previous._stagingRegistrationDigest}:{};
    // Unedited SQL columns, including ratings and contacts, are never SET from a projected object.
    for(const field of ['rating','reviews_count','verified','featured','status'])if(rows[0][field] !== undefined)merged[field]=rows[0][field];
    const data=values(merged,metadata);const fields=columns.slice(1).filter(field=>field==='raw_data'||Object.hasOwn(patch,field));assertWrite();
    await conn.query(`UPDATE businesses SET ${fields.map(c=>c+' = ?').join(', ')}, updated_at = NOW() WHERE id = ?`,[...fields.map(field=>data[columns.indexOf(field)]),String(current.id)]);
    const [saved]=await conn.query('SELECT * FROM businesses WHERE id = ?',[String(current.id)]);
    const expected=Object.fromEntries(['phone','whatsapp'].filter(k=>Object.hasOwn(patch,k)).map(k=>[k,patch[k]]));
    if(!saved[0]||!contactsMatchReadback(expected,saved[0]))throw new BusinessWriteError(409,'CONTACT_READBACK_CONFLICT','No se pudo confirmar el cambio de contactos.');
    if(!matchesWrittenValues(saved[0],fields,data))throw new BusinessWriteError(503,'BUSINESS_READBACK_FAILED','Los campos persistidos no coinciden con la edición; no se confirmó el guardado.');
    return {business:deps.serialize(saved[0])};
   });}finally{conn.release();}
  }
 };
}
