import express, {type Express,type Request,type Response} from 'express';
import crypto from 'node:crypto';
import {parseGrant} from './stagingIsolationProof';
import {contactDigits} from '../utils/businessContacts';
import {CLASSIFIED_CATEGORIES} from '../data/classifiedCategories';
import COLONIAS from '../data/colonias_carmen.json';
import { getPool, PRODUCTION_DB_NAME, PRODUCTION_DB_USER } from '../db/mariadb';

// ENC-CLASSIFIEDS-BACKEND-001 — carril público aislado de clasificados.
// No usa classified:manage; no modifica permisos administrativos ni los bloques W1 (H01–H04).
// Escrituras solo si: pool activo + base != producción + usuario != producción + marca de aislamiento + InnoDB + privilegios.

export const CLASSIFIEDS_TABLE = 'public_classifieds';
export const ISOLATION_TABLE = 'enc_classifieds_isolation';
export const ISOLATION_MARKER = 'ENC-CLASSIFIEDS-LAB-ISOLATED';
export const CLASSIFIED_TTL_DAYS = 7;
const CATEGORIES = ['inmuebles', 'vehiculos', 'empleos', 'compra-venta', 'mascotas', 'eventos'];

export class ClassifiedsError extends Error {
  constructor(public code: string, public status: number, message: string, public uncertain = false) {
    super(message);
  }
}

const fail = (code: string, status: number, message: string, uncertain = false): never => {
  throw new ClassifiedsError(code, status, message, uncertain);
};
const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const digits = (v: unknown) => String(v ?? '').replace(/[\s\-().]/g, '');

export interface ClassifiedInput {
  title?: unknown; description?: unknown; category?: unknown; price?: unknown;
  contactPhone?: unknown; contactWhatsapp?: unknown; imageUrl?: unknown; idempotencyKey?: unknown;
  subcategory?:unknown;priceType?:unknown;currency?:unknown;location?:unknown;colonia?:unknown;noLocation?:unknown;deliveryCondition?:unknown;contactName?:unknown;email?:unknown;contactMethods?:unknown;videoUrl?:unknown;
}
export interface ClassifiedPatch { status?: unknown; title?: unknown; description?: unknown; price?: unknown; [key:string]:unknown; }
export interface ClassifiedsDeps { pool?: any; now?: () => Date; }

function classifiedDetails(body:ClassifiedInput,category:string,price:number|null) {
  const text=(key:keyof ClassifiedInput,max:number)=>{const value=body[key];if(value===undefined||value===null)return '';if(typeof value!=='string'||value.length>max||/<[^>]*>|[\u0000-\u001f\u007f]/u.test(value))fail('VALIDATION_FAILED',400,'Información adicional inválida.');return String(value).trim();};
  const subcategory=text('subcategory',100);if(subcategory&&!CLASSIFIED_CATEGORIES.find(c=>c.id===category)?.subcategories.some(s=>s.id===subcategory))fail('VALIDATION_FAILED',400,'Subcategoría no corresponde a la categoría.');
  const priceType=text('priceType',20)||(price===null?'consult':'fixed');if(!['fixed','negotiable','consult'].includes(priceType))fail('VALIDATION_FAILED',400,'Tipo de precio inválido.');
  if(body.currency!==undefined&&body.currency!=='MXN')fail('VALIDATION_FAILED',400,'Solo se admite MXN.');
  if(body.noLocation!==undefined&&typeof body.noLocation!=='boolean')fail('VALIDATION_FAILED',400,'Ubicación inválida.');
  const noLocation=body.noLocation===true,location=text('location',100),colonia=text('colonia',120);
  if(location&&location!=='Ciudad del Carmen, Campeche')fail('VALIDATION_FAILED',400,'Localidad no permitida.');
  if(colonia&&!(COLONIAS as string[]).includes(colonia))fail('VALIDATION_FAILED',400,'Colonia no reconocida en Carmen.');
  const deliveryCondition=text('deliveryCondition',20)||'direct';if(!['direct','delivery','shipping'].includes(deliveryCondition))fail('VALIDATION_FAILED',400,'Modalidad inválida.');
  const email=text('email',254);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('VALIDATION_FAILED',400,'Correo inválido.');
  const videoUrl=text('videoUrl',2048);if(videoUrl){try{const u=new URL(videoUrl);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error();}catch{fail('VALIDATION_FAILED',400,'Enlace de video inválido.');}}
  const methods=body.contactMethods ?? [body.contactPhone?'phone':'',body.contactWhatsapp?'whatsapp':''].filter(Boolean);
  if(!Array.isArray(methods)||methods.length>3||methods.some(m=>!['phone','whatsapp','email'].includes(m)))fail('VALIDATION_FAILED',400,'Canales inválidos.');
  const chosen=methods as string[];
  if(chosen.some(m=>m==='phone'?!body.contactPhone:m==='whatsapp'?!body.contactWhatsapp:!email))fail('VALIDATION_FAILED',400,'Canal de contacto sin datos.');
  return {subcategory,priceType,currency:'MXN',location:noLocation?'':location,colonia:noLocation?'':colonia,noLocation,deliveryCondition,contactName:text('contactName',80),email,contactMethods:[...new Set(chosen)],videoUrl};
}
function details(row:any):Record<string,any>{try{const d=JSON.parse(row.details_json||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{};}catch{return {};}}
const ownerProof=(token:unknown)=>typeof token==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(token);
const sameToken=(token:unknown,hash:unknown)=>ownerProof(token)&&typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash)&&crypto.timingSafeEqual(Buffer.from(sha256(token as string),'hex'),Buffer.from(hash,'hex'));

export function validateClassifiedInput(body: ClassifiedInput) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('VALIDATION_FAILED', 400, 'Datos de anuncio inválidos.');
  const allowed = new Set(['title','description','category','price','contactPhone','contactWhatsapp','imageUrl','idempotencyKey','subcategory','priceType','currency','location','colonia','noLocation','deliveryCondition','contactName','email','contactMethods','videoUrl']);
  if (Object.keys(body).some(key => !allowed.has(key))) fail('VALIDATION_FAILED', 400, 'El anuncio contiene campos no permitidos.');
  for (const key of ['title','description','category','contactPhone','contactWhatsapp','imageUrl','idempotencyKey'] as const) {
    const value = body[key];
    if (value !== undefined && value !== null && typeof value !== 'string') fail('VALIDATION_FAILED', 400, 'Tipo de campo inválido.');
  }
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  const category = String(body.category ?? '').trim();
  if (title.length < 5 || title.length > 120) fail('VALIDATION_FAILED', 400, 'El título debe tener entre 5 y 120 caracteres.');
  if (description.length < 10 || description.length > 2000) fail('VALIDATION_FAILED', 400, 'La descripción debe tener entre 10 y 2000 caracteres.');
  if (!CATEGORIES.includes(category)) fail('VALIDATION_FAILED', 400, 'Categoría no permitida.');
  const contactPhone = body.contactPhone ? contactDigits(body.contactPhone) : '';
  if (body.contactPhone && !contactPhone) fail('VALIDATION_FAILED', 400, 'Teléfono de contacto inválido.');
  const contactWhatsapp = body.contactWhatsapp == null || body.contactWhatsapp === '' ? '' : contactDigits(body.contactWhatsapp);
  if (contactWhatsapp && !/^\d{10}$/.test(contactWhatsapp)) fail('VALIDATION_FAILED', 400, 'WhatsApp inválido.');
  if (body.contactWhatsapp && !contactWhatsapp) fail('VALIDATION_FAILED',400,'WhatsApp inválido.');
  if (!contactPhone && !contactWhatsapp) fail('VALIDATION_FAILED',400,'Se requiere teléfono o WhatsApp válido.');
  let price: number | null = null;
  if (body.price !== undefined && body.price !== null && body.price !== '') {
    if (!['number','string'].includes(typeof body.price)) fail('VALIDATION_FAILED',400,'Precio inválido.');
    price = Number(body.price);
    if (!Number.isFinite(price) || price < 0 || price > 9999999.99) fail('VALIDATION_FAILED', 400, 'Precio inválido.');
  }
  const imageUrl = String(body.imageUrl ?? '').trim();
  if (imageUrl) {
    fail('VALIDATION_FAILED', 400, 'Las fotografías públicas requieren almacenamiento seguro y aún no están habilitadas.');
  }
  const details = classifiedDetails(body,category,price);
  if (/<[^>]*>|[\u0000-\u0008\u000b-\u001f\u007f]/u.test(title+description)) fail('VALIDATION_FAILED',400,'Solo se permite texto puro.');
  const idempotencyKey = String(body.idempotencyKey ?? '').trim();
  if (!idempotencyKey || !/^[A-Za-z0-9_-]{8,64}$/.test(idempotencyKey)) fail('VALIDATION_FAILED', 400, 'Clave de idempotencia inválida.');
  return { title, description, category, price, contactPhone, contactWhatsapp, imageUrl, idempotencyKey, details };
}

export function validateClassifiedPatch(patch: ClassifiedPatch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) fail('VALIDATION_FAILED', 400, 'Actualización inválida.');
  const allowed = new Set(['status','title','description','price','category','contactPhone','contactWhatsapp','subcategory','priceType','currency','location','colonia','noLocation','deliveryCondition','contactName','email','contactMethods','videoUrl']);
  if (Object.keys(patch).some(key => !allowed.has(key))) fail('VALIDATION_FAILED', 400, 'Actualización contiene campos no permitidos.');
  for (const key of ['status','title','description'] as const) {
    if (patch[key] !== undefined && typeof patch[key] !== 'string') fail('VALIDATION_FAILED', 400, 'Tipo de campo inválido.');
  }
  const next:Record<string,any> = {};
  for(const [key,value] of Object.entries(patch))if(!['status','title','description','price'].includes(key))next[key]=value;
  if (patch.status !== undefined) {
    const status = String(patch.status);
    if (!['active', 'sold', 'retired'].includes(status)) fail('VALIDATION_FAILED', 400, 'Estado no permitido.');
    next.status = status;
  }
  if (patch.title !== undefined) {
    const title = String(patch.title ?? '').trim();
    if (title.length < 5 || title.length > 120) fail('VALIDATION_FAILED', 400, 'El título debe tener entre 5 y 120 caracteres.');
    next.title = title;
  }
  if (patch.description !== undefined) {
    const description = String(patch.description ?? '').trim();
    if (description.length < 10 || description.length > 2000) fail('VALIDATION_FAILED', 400, 'La descripción debe tener entre 10 y 2000 caracteres.');
    next.description = description;
  }
  if (patch.price !== undefined) {
    if (patch.price !== null && !['number','string'].includes(typeof patch.price)) fail('VALIDATION_FAILED',400,'Precio inválido.');
    const price = patch.price === null || patch.price === '' ? null : Number(patch.price);
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 9999999.99)) fail('VALIDATION_FAILED', 400, 'Precio inválido.');
    next.price = price;
  }
  return next;
}

export function createClassifiedsService(deps: ClassifiedsDeps = {}) {
  const now = deps.now ?? (() => new Date());
  const getDb = () => deps.pool !== undefined ? deps.pool : getPool();

  async function assertIsolation(pool: any): Promise<string> {
    let db = '';
    let user = '';
    try {
      const [dbRows] = await pool.query('SELECT DATABASE() AS db_name');
      db = String(dbRows?.[0]?.db_name ?? '');
      const [userRows] = await pool.query('SELECT CURRENT_USER() AS db_user');
      user = String(Object.values(userRows?.[0] ?? {})[0] ?? '');
    } catch {
      fail('ISOLATION_UNVERIFIABLE', 503, 'No se pudo verificar la base de datos.');
    }
    if (!db || db.toLowerCase() === PRODUCTION_DB_NAME.toLowerCase()) fail('ISOLATION_REFUSED', 503, 'Base no autorizada para clasificados públicos.');
    if (PRODUCTION_DB_USER && user.split('@')[0] === PRODUCTION_DB_USER) fail('ISOLATION_REFUSED', 503, 'Usuario de producción no autorizado.');
    const [markerRows] = await pool.query(`SELECT marker_value FROM ${ISOLATION_TABLE}`);
    if (markerRows?.length!==1 || markerRows[0].marker_value !== ISOLATION_MARKER) fail('ISOLATION_MARKER_MISSING', 503, 'Aislamiento de clasificados no verificado.');
    const [engineRows] = await pool.query('SELECT ENGINE FROM information_schema.TABLES WHERE table_schema = ? AND table_name = ?', [db, CLASSIFIEDS_TABLE]);
    if (!engineRows?.[0] || String(engineRows[0].ENGINE).toLowerCase() !== 'innodb') fail('ISOLATION_ENGINE_REFUSED', 503, 'Motor de almacenamiento no permitido.');
    const [uniqueIndexes]=await pool.query('SELECT INDEX_NAME, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND NON_UNIQUE = 0',[db,CLASSIFIEDS_TABLE]);
    const indexes=new Map<string,string[]>();for(const row of uniqueIndexes||[]){const key=String(row.INDEX_NAME);indexes.set(key,[...(indexes.get(key)||[]),row.COLUMN_NAME]);}
    if(![...indexes.values()].some(columns=>columns.length===1&&columns[0]==='id')||![...indexes.values()].some(columns=>columns.length===1&&columns[0]==='idempotency_key'))fail('ISOLATION_SCHEMA_REFUSED',503,'Faltan restricciones únicas de id e idempotencia.');
    const [grants] = await pool.query('SHOW GRANTS FOR CURRENT_USER()');
    let insert=false,update=false;
    for(const row of grants||[]){const grant=parseGrant(String(Object.values(row)[0]||''));
      if(!grant)return fail('ISOLATION_PRIVILEGES_REFUSED',503,'Permisos no verificables.');
      if(grant.grantOption||grant.wildcard)fail('ISOLATION_PRIVILEGES_REFUSED',503,'Permisos no verificables.');
      if(grant.schema==='*'&&grant.table==='*'&&grant.privileges.every(p=>p==='USAGE'))continue;
      if(grant.schema!==db||grant.privileges.some(p=>!['SELECT','INSERT','UPDATE'].includes(p)))fail('ISOLATION_PRIVILEGES_REFUSED',503,'Permisos demasiado amplios o ajenos.');
      if(grant.table!=='public_classifieds'&&grant.table!=='enc_classifieds_isolation')fail('ISOLATION_PRIVILEGES_REFUSED',503,'Permisos fuera de las tablas autorizadas.');
      if(grant.table==='public_classifieds'){insert ||= grant.privileges.includes('INSERT');update ||= grant.privileges.includes('UPDATE');}
    }
    if(!insert||!update)fail('ISOLATION_PRIVILEGES_REFUSED',503,'Privilegios insuficientes.');
    return db;
  }

  const readback = async (pool: any, id: string) => {
    const [rows] = await pool.query(`SELECT * FROM ${CLASSIFIEDS_TABLE} WHERE id = ? LIMIT 1`, [id]);
    return rows?.[0] ?? null;
  };

  const readbackByKey = async (pool: any, key: string) => {
    const [rows] = await pool.query(`SELECT * FROM ${CLASSIFIEDS_TABLE} WHERE idempotency_key = ? LIMIT 1`, [key]);
    return rows?.[0] ?? null;
  };

  const toPublic = (row: any) => ({
    ...details(row), id: row.id, title: row.title, description: row.description, category: row.category,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    contactPhone: row.contact_phone, contactWhatsapp: row.contact_whatsapp || '',
    phone: row.contact_phone, whatsapp: row.contact_whatsapp || '',
    imageUrl: row.image_url || '', image: row.image_url || '', status: row.status, expiresAt: row.expires_at,
    createdAt: row.created_at,
  });

  async function authorizeOwner(pool: any, id: string, token: unknown) {
    if (!ownerProof(token)) return fail('OWNER_AUTHORIZATION_REQUIRED', 403, 'Se requiere el token del titular del anuncio.');
    const row = await readback(pool, id);
    if (!row) fail('CLASSIFIED_NOT_FOUND', 404, 'Clasificado no encontrado.');
    if (!sameToken(token,row.owner_token_hash)) fail('OWNER_AUTHORIZATION_INVALID', 403, 'Token de titular inválido.');
    return row;
  }

  return {
    async getActive(filters:Record<string,unknown> = {}) {
      const pool = getDb();
      if (!pool) fail('PERSISTENCE_UNAVAILABLE', 503, 'Persistencia de clasificados no disponible.');
      await assertIsolation(pool);
      try {
        const conditions:string[]=[];const params:any[]=[];
        for(const key of ['category','subcategory','colonia','priceType','q'])if(filters[key]!==undefined){if(typeof filters[key]!=='string'||String(filters[key]).length>160)fail('VALIDATION_FAILED',400,'Filtro inválido.');const value=String(filters[key]).trim();if(!value)continue;
          if(key==='category'){if(!CATEGORIES.includes(value))fail('VALIDATION_FAILED',400,'Categoría inválida.');conditions.push('category = ?');params.push(value);}
          else if(key==='q'){conditions.push('(title LIKE ? OR description LIKE ?)');params.push('%'+value+'%','%'+value+'%');}
          else {conditions.push('JSON_UNQUOTE(JSON_EXTRACT(details_json, ?)) = ?');params.push('$.'+key,value);}
        }
        const [rows] = await pool.query(`SELECT * FROM ${CLASSIFIEDS_TABLE} WHERE status = 'active' AND expires_at > NOW() ${conditions.length?'AND '+conditions.join(' AND '):''} ORDER BY created_at DESC, id DESC LIMIT 200`,params);
        const classifieds = (rows ?? []).map(toPublic);
        return { classifieds, total: classifieds.length };
      } catch (e) {
        if (e instanceof ClassifiedsError) throw e;
        return fail('CLASSIFIEDS_READ_FAILED', 503, 'No se pudo leer el catálogo de clasificados.');
      }
    },

    async create(input: ClassifiedInput, proof?:unknown) {
      const pool = getDb();
      if (!pool) fail('PERSISTENCE_UNAVAILABLE', 503, 'Persistencia de clasificados no disponible.');
      const norm = validateClassifiedInput(input);
      await assertIsolation(pool);
      const id = norm.idempotencyKey
        ? 'cls_' + sha256(norm.idempotencyKey).slice(0, 24)
        : 'cls_' + sha256(`${norm.title}|${norm.contactPhone}|${now().toISOString()}`).slice(0, 24);
      if(proof!==undefined&&!ownerProof(proof))fail('VALIDATION_FAILED',400,'Credencial de titular inválida.');
      const replay=(existing:any)=>{
        const same=existing.title===norm.title&&existing.description===norm.description&&existing.category===norm.category&&existing.contact_phone===norm.contactPhone&&(existing.contact_whatsapp||'')===norm.contactWhatsapp&&(existing.image_url||'')===norm.imageUrl&&(existing.price==null?null:Number(existing.price))===norm.price&&JSON.stringify(details(existing))===JSON.stringify(norm.details);
        if(!same)fail('IDEMPOTENCY_CONFLICT',409,'La clave pertenece a otro anuncio.');
        return {duplicate:true,classified:toPublic(existing),ownerToken:'',ownerAccess:sameToken(proof,existing.owner_token_hash)};
      };
      if (norm.idempotencyKey) {
        const existing = await readbackByKey(pool, norm.idempotencyKey);
        if (existing) {
          return replay(existing);
        }
      }
      const ownerToken = ownerProof(proof)?proof as string:crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(now().getTime() + CLASSIFIED_TTL_DAYS * 86400000);
      try {
        await pool.query(
          `INSERT INTO ${CLASSIFIEDS_TABLE} (id, idempotency_key, title, description, category, price, contact_phone, contact_whatsapp, image_url, status, owner_token_hash, expires_at, details_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
          [id, norm.idempotencyKey || null, norm.title, norm.description, norm.category, norm.price,
            norm.contactPhone, norm.contactWhatsapp, norm.imageUrl, sha256(ownerToken), expiresAt,JSON.stringify(norm.details)],
        );
      } catch (e: any) {
        if (String(e?.code ?? '').includes('ER_DUP')) {const existing=await readbackByKey(pool,norm.idempotencyKey);if(existing)return replay(existing);fail('IDEMPOTENCY_CONFLICT',409,'Anuncio duplicado.');}
        // Un fallo de transporte no garantiza que INSERT se haya revertido.
        // Intentar leer sin afirmar éxito; si no hay certeza, conservar la clave idempotente.
        try {
          const possible = await readback(pool, id);
          if (possible) fail('CLASSIFIEDS_WRITE_UNCONFIRMED', 503, 'La escritura pudo haberse completado; no se puede confirmar el resultado.', true);
        } catch (readError) {
          if (readError instanceof ClassifiedsError) throw readError;
          fail('CLASSIFIEDS_WRITE_UNCONFIRMED', 503, 'La escritura pudo haberse completado y la lectura falló.', true);
        }
        fail('CLASSIFIEDS_WRITE_UNCONFIRMED', 503, 'No se confirmó si el servidor guardó el anuncio.', true);
      }
      let row: any = null;
      try { row = await readback(pool, id); } catch { row = null; }
      if (!row || row.title !== norm.title || row.description!==norm.description || row.category!==norm.category || row.contact_phone !== norm.contactPhone || (row.contact_whatsapp||'')!==norm.contactWhatsapp || row.status!=='active' || row.owner_token_hash!==sha256(ownerToken) || JSON.stringify(details(row))!==JSON.stringify(norm.details) || (row.price==null?null:Number(row.price))!==norm.price) {
        fail('CLASSIFIEDS_WRITE_UNCONFIRMED', 503, 'La escritura no pudo confirmarse.', true);
      }
      return { duplicate: false, classified: toPublic(row), ownerToken, ownerAccess:true };
    },

    async update(id: string, token: unknown, patch: ClassifiedPatch):Promise<any> {
      const pool = getDb();
      if (!pool) fail('PERSISTENCE_UNAVAILABLE', 503, 'Persistencia de clasificados no disponible.');
      const next = validateClassifiedPatch(patch);
      await assertIsolation(pool);
      if(!token)fail('OWNER_AUTHORIZATION_REQUIRED',403,'Se requiere el token del titular.');
      const connection=await pool.getConnection();let committed=false;
      try {
        await connection.beginTransaction();
        const [locked]=await connection.query(`SELECT * FROM ${CLASSIFIEDS_TABLE} WHERE id = ? LIMIT 1 FOR UPDATE`,[id]);
        const row=locked?.[0];if(!row)fail('CLASSIFIED_NOT_FOUND',404,'Clasificado no encontrado.');
        if(!sameToken(token,row.owner_token_hash))fail('OWNER_AUTHORIZATION_INVALID',403,'Token inválido.');
        if(!Number.isFinite(new Date(row.expires_at).getTime())||new Date(row.expires_at).getTime()<=now().getTime())fail('CLASSIFIED_EXPIRED',409,'El anuncio expiró.');
        if(row.status==='retired'&&next.status!=='retired')fail('CLASSIFIED_RETIRED',409,'El anuncio fue retirado.');
        if(!Object.keys(next).length)fail('VALIDATION_FAILED',400,'Nada que actualizar.');
        const {status,...changes}=next;
        const norm=validateClassifiedInput({...details(row),title:row.title,description:row.description,category:row.category,price:row.price,contactPhone:row.contact_phone,contactWhatsapp:row.contact_whatsapp,imageUrl:'',idempotencyKey:row.idempotency_key||'legacy-update',...changes});
        const updates:Record<string,any>={title:norm.title,description:norm.description,category:norm.category,price:norm.price,contact_phone:norm.contactPhone,contact_whatsapp:norm.contactWhatsapp,details_json:JSON.stringify(norm.details),status:status??row.status};
        const fields=Object.keys(updates);
        await connection.query(`UPDATE ${CLASSIFIEDS_TABLE} SET ${fields.map(field=>field+' = ?').join(', ')} WHERE id = ?`,[...fields.map(field=>updates[field]),id]);
        const after=await readback(connection,id);
        if(!after||fields.some(field=>field==='price'?(updates.price===null?after.price!==null:Number(after.price)!==updates.price):after[field]!==updates[field]))fail('CLASSIFIEDS_WRITE_UNCONFIRMED',503,'La actualización no pudo confirmarse.',true);
        committed=true;await connection.commit();return {classified:toPublic(after)};
      }catch(error){try{await connection.rollback();}catch{}if(error instanceof ClassifiedsError)throw error;fail('CLASSIFIEDS_WRITE_UNCONFIRMED',503,committed?'Confirmación de COMMIT incierta.':'No se confirmó la actualización.',true);}
      finally{connection.release();}
    },

    async retire(id: string, token: unknown) {
      const { classified } = await this.update(id, token, { status: 'retired' });
      return { classified };
    },
  };
}

function sendError(res: Response, e: unknown) {
  if (e instanceof ClassifiedsError) {
    const body: Record<string, unknown> = { success: false, error: e.code, message: e.message };
    if (e.uncertain) body.writeMayHaveSucceeded = true;
    return res.status(e.status).json(body);
  }
  return res.status(500).json({ success: false, error: 'CLASSIFIEDS_INTERNAL', message: 'Error interno de clasificados.' });
}

export function registerPublicClassifieds(app: Express, deps: ClassifiedsDeps = {}) {
  const service = createClassifiedsService(deps);
  const attempts=new Map<string,{count:number;until:number}>();
  app.use('/api/public/classifieds',(req,res,next)=>{res.setHeader('Cache-Control','no-store');if(!['POST','PATCH','DELETE'].includes(req.method))return next();const now=Date.now();for(const [k,v]of attempts)if(v.until<=now)attempts.delete(k);const ip=req.ip||'unknown';const item=attempts.get(ip)||{count:0,until:now+60000};if(item.count>=60||(!attempts.has(ip)&&attempts.size>=10000))return res.status(429).json({success:false,error:'RATE_LIMITED',message:'Demasiadas solicitudes.'});item.count++;attempts.set(ip,item);next();},express.json({limit:'16kb',strict:true}));
  app.use('/api/public/classifieds',(error:any,_req:Request,res:Response,next:any)=>{if(!error)return next();res.status(error.status===413?413:400).json({success:false,error:'INVALID_BODY',message:'Cuerpo inválido o demasiado grande.'});});

  app.get('/api/public/classifieds', async (req: Request, res: Response) => {
    try {
      const { classifieds, total } = await service.getActive(req.query);
      res.json({ success: true, total, classifieds });
    } catch (e) { sendError(res, e); }
  });

  app.post('/api/public/classifieds', async (req: Request, res: Response) => {
    try {
      const result = await service.create((req.body ?? {}) as ClassifiedInput,req.header('x-classified-owner-token'));
      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        message: result.duplicate ? 'Clasificado ya registrado (idempotente).' : 'Clasificado publicado.',
        classified: result.classified,
        ownerAccess:result.ownerAccess, ...(result.duplicate ? { duplicate: true } : { ownerToken: result.ownerToken }),
      });
    } catch (e) { sendError(res, e); }
  });

  app.patch('/api/public/classifieds/:id', async (req: Request, res: Response) => {
    try {
      const token = req.header('x-classified-owner-token');
      const { classified } = await service.update(req.params.id, token, (req.body ?? {}) as ClassifiedPatch);
      res.json({ success: true, message: 'Clasificado actualizado.', classified });
    } catch (e) { sendError(res, e); }
  });

  app.delete('/api/public/classifieds/:id', async (req: Request, res: Response) => {
    try {
      const token = req.header('x-classified-owner-token');
      await service.retire(req.params.id, token);
      res.json({ success: true, message: 'Clasificado retirado.' });
    } catch (e) { sendError(res, e); }
  });
}
