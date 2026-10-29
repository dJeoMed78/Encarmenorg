import type { Express, Request, Response } from 'express';
import crypto from 'node:crypto';
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
}
export interface ClassifiedPatch { status?: unknown; title?: unknown; description?: unknown; price?: unknown; }
export interface ClassifiedsDeps { pool?: any; now?: () => Date; }

export function validateClassifiedInput(body: ClassifiedInput) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('VALIDATION_FAILED', 400, 'Datos de anuncio inválidos.');
  const allowed = new Set(['title','description','category','price','contactPhone','contactWhatsapp','imageUrl','idempotencyKey']);
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
  const contactPhone = digits(body.contactPhone);
  if (!/^\d{10}$/.test(contactPhone)) fail('VALIDATION_FAILED', 400, 'Teléfono de contacto inválido.');
  const contactWhatsapp = body.contactWhatsapp == null || body.contactWhatsapp === '' ? '' : digits(body.contactWhatsapp);
  if (contactWhatsapp && !/^\d{10}$/.test(contactWhatsapp)) fail('VALIDATION_FAILED', 400, 'WhatsApp inválido.');
  let price: number | null = null;
  if (body.price !== undefined && body.price !== null && body.price !== '') {
    price = Number(body.price);
    if (!Number.isFinite(price) || price < 0 || price > 9999999.99) fail('VALIDATION_FAILED', 400, 'Precio inválido.');
  }
  const imageUrl = String(body.imageUrl ?? '').trim();
  if (imageUrl) {
    fail('VALIDATION_FAILED', 400, 'Las fotografías públicas requieren almacenamiento seguro y aún no están habilitadas.');
  }
  const idempotencyKey = String(body.idempotencyKey ?? '').trim();
  if (idempotencyKey && !/^[A-Za-z0-9_-]{8,64}$/.test(idempotencyKey)) fail('VALIDATION_FAILED', 400, 'Clave de idempotencia inválida.');
  return { title, description, category, price, contactPhone, contactWhatsapp, imageUrl, idempotencyKey };
}

export function validateClassifiedPatch(patch: ClassifiedPatch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) fail('VALIDATION_FAILED', 400, 'Actualización inválida.');
  const allowed = new Set(['status','title','description','price']);
  if (Object.keys(patch).some(key => !allowed.has(key))) fail('VALIDATION_FAILED', 400, 'Actualización contiene campos no permitidos.');
  for (const key of ['status','title','description'] as const) {
    if (patch[key] !== undefined && typeof patch[key] !== 'string') fail('VALIDATION_FAILED', 400, 'Tipo de campo inválido.');
  }
  const next: { status?: string; title?: string; description?: string; price?: number | null } = {};
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
    if (!db || db === PRODUCTION_DB_NAME) fail('ISOLATION_REFUSED', 503, 'Base no autorizada para clasificados públicos.');
    if (PRODUCTION_DB_USER && user.split('@')[0] === PRODUCTION_DB_USER) fail('ISOLATION_REFUSED', 503, 'Usuario de producción no autorizado.');
    const [markerRows] = await pool.query(`SELECT marker_value FROM ${ISOLATION_TABLE} LIMIT 1`);
    if (!markerRows?.[0] || markerRows[0].marker_value !== ISOLATION_MARKER) fail('ISOLATION_MARKER_MISSING', 503, 'Aislamiento de clasificados no verificado.');
    const [engineRows] = await pool.query('SELECT ENGINE FROM information_schema.TABLES WHERE table_schema = ? AND table_name = ?', [db, CLASSIFIEDS_TABLE]);
    if (!engineRows?.[0] || String(engineRows[0].ENGINE).toLowerCase() !== 'innodb') fail('ISOLATION_ENGINE_REFUSED', 503, 'Motor de almacenamiento no permitido.');
    const [grants] = await pool.query('SHOW GRANTS FOR CURRENT_USER()');
    if (!/INSERT|ALL PRIVILEGES/i.test(JSON.stringify(grants))) fail('ISOLATION_PRIVILEGES_REFUSED', 503, 'Privilegios insuficientes.');
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
    id: row.id, title: row.title, description: row.description, category: row.category,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    contactPhone: row.contact_phone, contactWhatsapp: row.contact_whatsapp || '',
    phone: row.contact_phone, whatsapp: row.contact_whatsapp || '',
    imageUrl: row.image_url || '', image: row.image_url || '', status: row.status, expiresAt: row.expires_at,
    createdAt: row.created_at,
  });

  async function authorizeOwner(pool: any, id: string, token: unknown) {
    if (!token || typeof token !== 'string') fail('OWNER_AUTHORIZATION_REQUIRED', 403, 'Se requiere el token del titular del anuncio.');
    const row = await readback(pool, id);
    if (!row) fail('CLASSIFIED_NOT_FOUND', 404, 'Clasificado no encontrado.');
    if (row.owner_token_hash !== sha256(token)) fail('OWNER_AUTHORIZATION_INVALID', 403, 'Token de titular inválido.');
    return row;
  }

  return {
    async getActive() {
      const pool = getDb();
      if (!pool) fail('PERSISTENCE_UNAVAILABLE', 503, 'Persistencia de clasificados no disponible.');
      await assertIsolation(pool);
      try {
        const [rows] = await pool.query(`SELECT * FROM ${CLASSIFIEDS_TABLE} WHERE status = 'active' AND expires_at > NOW() ORDER BY created_at DESC, id DESC LIMIT 200`);
        const classifieds = (rows ?? []).map(toPublic);
        return { classifieds, total: classifieds.length };
      } catch (e) {
        if (e instanceof ClassifiedsError) throw e;
        fail('CLASSIFIEDS_READ_FAILED', 503, 'No se pudo leer el catálogo de clasificados.');
      }
    },

    async create(input: ClassifiedInput) {
      const pool = getDb();
      if (!pool) fail('PERSISTENCE_UNAVAILABLE', 503, 'Persistencia de clasificados no disponible.');
      const norm = validateClassifiedInput(input);
      await assertIsolation(pool);
      const id = norm.idempotencyKey
        ? 'cls_' + sha256(norm.idempotencyKey).slice(0, 24)
        : 'cls_' + sha256(`${norm.title}|${norm.contactPhone}|${now().toISOString()}`).slice(0, 24);
      if (norm.idempotencyKey) {
        const existing = await readbackByKey(pool, norm.idempotencyKey);
        if (existing) {
          const samePayload =
            existing.title === norm.title &&
            existing.description === norm.description &&
            existing.category === norm.category &&
            existing.contact_phone === norm.contactPhone &&
            (existing.contact_whatsapp || '') === norm.contactWhatsapp &&
            (existing.image_url || '') === norm.imageUrl &&
            (existing.price == null ? null : Number(existing.price)) === norm.price;
          if (!samePayload) {
            fail('IDEMPOTENCY_CONFLICT', 409, 'La clave de idempotencia ya pertenece a otro anuncio.');
          }
          // A replay can confirm the record but cannot recover a lost owner token.
          return { duplicate: true, classified: toPublic(existing), ownerToken: '' };
        }
      }
      const ownerToken = crypto.randomBytes(24).toString('base64url');
      const expiresAt = new Date(now().getTime() + CLASSIFIED_TTL_DAYS * 86400000);
      try {
        await pool.query(
          `INSERT INTO ${CLASSIFIEDS_TABLE} (id, idempotency_key, title, description, category, price, contact_phone, contact_whatsapp, image_url, status, owner_token_hash, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
          [id, norm.idempotencyKey || null, norm.title, norm.description, norm.category, norm.price,
            norm.contactPhone, norm.contactWhatsapp, norm.imageUrl, sha256(ownerToken), expiresAt],
        );
      } catch (e: any) {
        if (String(e?.code ?? '').includes('ER_DUP')) fail('IDEMPOTENCY_CONFLICT', 409, 'Anuncio duplicado.');
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
      if (!row || row.title !== norm.title || row.contact_phone !== norm.contactPhone) {
        fail('CLASSIFIEDS_WRITE_UNCONFIRMED', 503, 'La escritura no pudo confirmarse.', true);
      }
      return { duplicate: false, classified: toPublic(row), ownerToken };
    },

    async update(id: string, token: unknown, patch: ClassifiedPatch) {
      const pool = getDb();
      if (!pool) fail('PERSISTENCE_UNAVAILABLE', 503, 'Persistencia de clasificados no disponible.');
      const next = validateClassifiedPatch(patch);
      await assertIsolation(pool);
      const row = await authorizeOwner(pool, id, token);
      if (row.status === 'expired' || new Date(row.expires_at).getTime() <= now().getTime()) fail('CLASSIFIED_EXPIRED', 409, 'El anuncio expiró.');
      if (!Object.keys(next).length) fail('VALIDATION_FAILED', 400, 'Nada que actualizar.');
      try {
        await pool.query(
          `UPDATE ${CLASSIFIEDS_TABLE}
           SET title = COALESCE(?, title), description = COALESCE(?, description),
               price = COALESCE(?, price), status = COALESCE(?, status)
           WHERE id = ?`,
          [next.title ?? null, next.description ?? null, next.price ?? null, next.status ?? null, id],
        );
      } catch {
        fail('PERSISTENCE_FAILED', 503, 'No se pudo actualizar el clasificado.');
      }
      let after: any = null;
      try { after = await readback(pool, id); } catch {
        fail('CLASSIFIEDS_WRITE_UNCONFIRMED', 503, 'No se pudo confirmar la actualización después de escribir.', true);
      }
      const confirmed = after &&
        (next.title === undefined || after.title === next.title) &&
        (next.description === undefined || after.description === next.description) &&
        (next.status === undefined || after.status === next.status) &&
        (next.price === undefined || (next.price === null ? after.price === null : Number(after.price) === next.price));
      if (!confirmed) fail('CLASSIFIEDS_WRITE_UNCONFIRMED', 503, 'La actualización no pudo confirmarse.', true);
      return { classified: toPublic(after) };
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

  app.get('/api/public/classifieds', async (_req: Request, res: Response) => {
    try {
      const { classifieds, total } = await service.getActive();
      res.json({ success: true, total, classifieds });
    } catch (e) { sendError(res, e); }
  });

  app.post('/api/public/classifieds', async (req: Request, res: Response) => {
    try {
      const result = await service.create((req.body ?? {}) as ClassifiedInput);
      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        message: result.duplicate ? 'Clasificado ya registrado (idempotente).' : 'Clasificado publicado.',
        classified: result.classified,
        ...(result.duplicate ? { duplicate: true } : { ownerToken: result.ownerToken }),
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
