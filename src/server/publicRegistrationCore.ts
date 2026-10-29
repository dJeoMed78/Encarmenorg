/**
 * ENC-PUBLIC-REGISTRATION-001 — solicitudes públicas de registro de empresas (núcleo sin dependencias de framework).
 * Los visitantes anónimos solo crean solicitudes `pending` en business_registration_requests; nada se publica.
 * La aprobación reutiliza el almacén de negocios de Staging (INSERT sin upsert, duplicados, lectura posterior).
 * El aislamiento (verifyIsolation) y el interruptor de escritura (canWrite) son obligatorios por construcción.
 */
import { createHash, randomUUID } from 'node:crypto';

export class RegistrationError extends Error {
  status: number;
  code: string;
  writeMayHaveSucceeded: boolean;
  constructor(status: number, code: string, message: string, writeMayHaveSucceeded = false) {
    super(message);
    this.status = status;
    this.code = code;
    this.writeMayHaveSucceeded = writeMayHaveSucceeded;
  }
}

export const REGISTRATION_TABLE = 'business_registration_requests';
const STATUSES = ['pending', 'approving', 'approved', 'rejected'];
const SUBMIT_LOCK = 'encarmen:staging:registration-submit';
const UUID_V4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ALLOWED_FIELDS = new Set(['name', 'category', 'subcategory', 'description', 'address', 'colonia', 'phone', 'whatsapp', 'schedule', 'facebook', 'instagram', 'website', 'applicantEmail', 'hp']);

function fail(status: number, code: string, message: string, maybeWritten = false): never {
  throw new RegistrationError(status, code, message, maybeWritten);
}

export function mxDigits(value: any): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (/^\d{10}$/.test(digits)) return digits;
  if (/^52\d{10}$/.test(digits)) return digits.slice(2);
  if (/^521\d{10}$/.test(digits)) return digits.slice(3);
  return '';
}

export function normalizeName(value: any): string {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function text(body: any, key: string, max: number, required = false, multiline = false): string {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') {
    if (required) fail(400, 'INVALID_REGISTRATION', 'Falta un campo obligatorio: ' + key + '.');
    return '';
  }
  if (typeof raw !== 'string') fail(400, 'INVALID_REGISTRATION', 'Campo de texto inválido: ' + key + '.');
  const value = raw.replace(/\r\n/g, '\n').trim();
  if (value.length > max || (required && value.length < 2)) fail(400, 'INVALID_REGISTRATION', 'Longitud inválida en ' + key + '.');
  const control = multiline ? /[\u0000-\u0008\u000B-\u001F\u007F]/ : /[\u0000-\u001F\u007F]/;
  if (control.test(value) || /<\s*[a-z!\/]/i.test(value)) fail(400, 'INVALID_REGISTRATION', 'Texto con caracteres o marcado no permitido en ' + key + '.');
  return value;
}

function link(body: any, key: string): string {
  const value = text(body, key, 2048);
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(400, 'INVALID_REGISTRATION', 'URL inválida en ' + key + '.');
  } catch (error) {
    if (error instanceof RegistrationError) throw error;
    fail(400, 'INVALID_REGISTRATION', 'URL inválida en ' + key + '.');
  }
  return value;
}

function contact(body: any, key: string): string {
  const value = body[key];
  if (value === undefined || value === null || value === '') return '';
  const digits = mxDigits(value);
  if (!digits) fail(400, 'INVALID_REGISTRATION', 'Número mexicano de 10 dígitos inválido en ' + key + '.');
  return digits;
}

/** Valida y normaliza el envío público. WhatsApp nunca se infiere del teléfono. */
export function validatePublicRegistration(body: any): any {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'INVALID_REGISTRATION', 'Se requiere un objeto de solicitud.');
  for (const key of Object.keys(body)) if (!ALLOWED_FIELDS.has(key)) fail(400, 'INVALID_REGISTRATION', 'El envío contiene campos no permitidos.');
  if (body.hp !== undefined && body.hp !== '') fail(400, 'SPAM_REJECTED', 'Solicitud rechazada.');
  const category = text(body, 'category', 100, true);
  const draft = {
    name: text(body, 'name', 160, true),
    category,
    categories: [category],
    subcategory: text(body, 'subcategory', 100),
    description: text(body, 'description', 500, false, true),
    address: text(body, 'address', 255),
    colonia: text(body, 'colonia', 100),
    phone: contact(body, 'phone'),
    whatsapp: contact(body, 'whatsapp'),
    schedule: text(body, 'schedule', 255),
    facebook: link(body, 'facebook'),
    instagram: link(body, 'instagram'),
    website: link(body, 'website'),
  };
  if (!draft.phone && !draft.whatsapp) fail(400, 'INVALID_REGISTRATION', 'Se requiere teléfono o WhatsApp mexicano válido.');
  const applicantEmail = text(body, 'applicantEmail', 160);
  if (applicantEmail && !/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(applicantEmail)) fail(400, 'INVALID_REGISTRATION', 'Correo de contacto inválido.');
  return { draft, applicantEmail };
}

/** Límite en memoria de intentos (incluye los rechazados) por clave; complementa el límite persistente por IP. */
export function createAttemptLimiter(max = 20, windowMs = 15 * 60 * 1000): (key: string, now?: number) => boolean {
  const attempts = new Map();
  return (key: string, now = Date.now()) => {
    for (const [id, entry] of attempts) if (entry.expires <= now) attempts.delete(id);
    const current = attempts.get(key);
    if ((current ? current.count : 0) >= max || (!current && attempts.size >= 10000)) return false;
    attempts.set(key, { count: (current ? current.count : 0) + 1, expires: current ? current.expires : now + windowMs });
    return true;
  };
}

function isMissingTable(error: any): boolean {
  return Boolean(error) && (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146);
}

function toIso(value: any): string {
  return value instanceof Date ? value.toISOString() : value ? String(value) : '';
}

function publicRow(row: any): any {
  return { id: row.id, status: row.status, createdAt: toIso(row.created_at) };
}

function adminRow(row: any): any {
  let draft = null;
  try {
    draft = JSON.parse(row.payload);
  } catch {
    draft = null;
  }
  return {
    id: row.id, status: row.status, name: row.name, phone: row.phone, whatsapp: row.whatsapp,
    applicantEmail: row.applicant_email || '', draft, businessId: row.business_id == null ? null : String(row.business_id),
    rejectReason: row.reject_reason || '', reviewedBy: row.reviewed_by || '', reviewedAt: toIso(row.reviewed_at), createdAt: toIso(row.created_at),
  };
}

export function createPublicRegistrationStore(deps: any): any {
  if (!deps || typeof deps.getConnection !== 'function' || typeof deps.canWrite !== 'function' || typeof deps.verifyIsolation !== 'function' || !deps.businessStore || typeof deps.businessStore.create !== 'function') {
    throw new Error('PUBLIC_REGISTRATION_DEPENDENCIES_REQUIRED');
  }
  const limits = { perIpPerHour: 3, perIpPerDay: 6, maxPending: 200, ...(deps.limits || {}) };
  const newId = deps.newId || randomUUID;

  function assertWrite(): void {
    if (!deps.canWrite()) fail(403, 'REGISTRATION_WRITES_DISABLED', 'Las escrituras de solicitudes no están habilitadas.');
  }

  async function open(write: boolean): Promise<any> {
    if (write) assertWrite();
    let conn: any;
    try {
      conn = await deps.getConnection();
    } catch {
      fail(503, 'STORAGE_UNAVAILABLE', 'El almacenamiento no está disponible; la solicitud no se guardó.');
    }
    if (write) {
      let proof: any;
      try {
        proof = await deps.verifyIsolation(conn);
      } catch {
        proof = { ok: false, code: 'ISOLATION_CHECK_FAILED' };
      }
      if (!proof || !proof.ok) {
        conn.release();
        fail(403, 'STAGING_ISOLATION_UNPROVEN', 'No se comprobó el aislamiento de Staging (' + (proof && proof.code) + '); escritura bloqueada.');
      }
    }
    return conn;
  }

  function storageError(error: any): never {
    if (error instanceof RegistrationError) throw error;
    if (isMissingTable(error)) fail(503, 'REGISTRATION_STORAGE_NOT_READY', 'La tabla de solicitudes no está preparada; nada se guardó.');
    fail(503, 'STORAGE_UNAVAILABLE', 'No se pudo completar la operación de almacenamiento.');
  }

  async function transaction(conn: any, action: () => Promise<any>): Promise<any> {
    let committing = false;
    try {
      await conn.beginTransaction();
      const value = await action();
      assertWrite();
      committing = true;
      await conn.commit();
      return value;
    } catch (error) {
      try {
        await conn.rollback();
      } catch {
        /* conexión perdida */
      }
      if (error instanceof RegistrationError) throw error;
      if (isMissingTable(error) && !committing) fail(503, 'REGISTRATION_STORAGE_NOT_READY', 'La tabla de solicitudes no está preparada; nada se guardó.');
      fail(503, 'REGISTRATION_WRITE_UNCONFIRMED', 'No se confirmó el guardado. Reintenta con la misma clave.', committing);
    }
  }

  function requireId(id: any): string {
    if (!UUID_V4.test(String(id || ''))) fail(400, 'INVALID_REQUEST_ID', 'Identificador de solicitud inválido.');
    return String(id);
  }

  async function revertClaim(conn: any, id: string): Promise<void> {
    try {
      await conn.query(`UPDATE ${REGISTRATION_TABLE} SET status = 'pending' WHERE id = ? AND status = 'approving'`, [id]);
    } catch {
      /* si no se revierte, la solicitud queda 'approving' y puede reintentarse */
    }
  }

  return {
    async submit(input: any): Promise<any> {
      const salt = deps.ipSalt ? String(deps.ipSalt() || '') : '';
      if (salt.length < 16) fail(503, 'REGISTRATION_NOT_CONFIGURED', 'El registro público no está configurado.');
      const key = String(input.requestKey || '');
      if (!UUID_V4.test(key)) fail(400, 'REQUEST_KEY_REQUIRED', 'Se requiere una clave de solicitud UUID para reintentos seguros.');
      const { draft, applicantEmail } = input.validated;
      const digest = createHash('sha256').update(JSON.stringify({ draft, applicantEmail })).digest('hex');
      const ipHash = createHash('sha256').update(salt + '|' + String(input.ip || '')).digest('hex');
      const nameNorm = normalizeName(draft.name);
      const digits = [draft.phone, draft.whatsapp].filter(Boolean);
      const conn = await open(true);
      let locked = false;
      try {
        const [lock] = await conn.query('SELECT GET_LOCK(?, 5) AS acquired', [SUBMIT_LOCK]);
        if (Number(lock[0] && lock[0].acquired) !== 1) fail(409, 'REGISTRATION_BUSY', 'Hay otro envío en curso; reintenta con la misma clave.');
        locked = true;
        const result = await transaction(conn, async () => {
          const [existing] = await conn.query(`SELECT * FROM ${REGISTRATION_TABLE} WHERE request_key = ?`, [key]);
          if (existing[0]) {
            if (existing[0].digest !== digest) fail(409, 'IDEMPOTENCY_CONFLICT', 'La clave ya corresponde a otros datos.');
            return { row: existing[0], replayed: true };
          }
          const [hour] = await conn.query(`SELECT COUNT(*) AS total FROM ${REGISTRATION_TABLE} WHERE ip_hash = ? AND created_at > (NOW() - INTERVAL 1 HOUR)`, [ipHash]);
          if (Number(hour[0].total) >= limits.perIpPerHour) fail(429, 'RATE_LIMITED', 'Demasiadas solicitudes desde esta conexión; intenta más tarde.');
          const [day] = await conn.query(`SELECT COUNT(*) AS total FROM ${REGISTRATION_TABLE} WHERE ip_hash = ? AND created_at > (NOW() - INTERVAL 1 DAY)`, [ipHash]);
          if (Number(day[0].total) >= limits.perIpPerDay) fail(429, 'RATE_LIMITED', 'Demasiadas solicitudes desde esta conexión; intenta más tarde.');
          const [pending] = await conn.query(`SELECT id, name_norm, phone, whatsapp FROM ${REGISTRATION_TABLE} WHERE status IN ('pending','approving')`);
          if (pending.length >= limits.maxPending) fail(503, 'REGISTRATION_QUEUE_FULL', 'La cola de revisión está llena; intenta más tarde.');
          if (pending.some((r: any) => r.name_norm === nameNorm || digits.some((d) => d === r.phone || d === r.whatsapp))) fail(409, 'REQUEST_ALREADY_PENDING', 'Ya existe una solicitud pendiente con ese nombre o contacto.');
          const [businesses] = await conn.query('SELECT id, name, phone, whatsapp FROM businesses');
          if (businesses.some((r: any) => normalizeName(r.name) === nameNorm || digits.some((d) => d === mxDigits(r.phone) || d === mxDigits(r.whatsapp)))) fail(409, 'BUSINESS_DUPLICATE', 'Ya existe una empresa con ese nombre o contacto.');
          const id = String(newId());
          await conn.query(
            `INSERT INTO ${REGISTRATION_TABLE} (id, request_key, digest, status, name, name_norm, phone, whatsapp, applicant_email, payload, ip_hash) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
            [id, key, digest, draft.name, nameNorm, draft.phone, draft.whatsapp, applicantEmail, JSON.stringify(draft), ipHash],
          );
          const [saved] = await conn.query(`SELECT * FROM ${REGISTRATION_TABLE} WHERE request_key = ?`, [key]);
          if (!saved[0] || saved[0].id !== id || saved[0].status !== 'pending' || saved[0].digest !== digest) fail(503, 'REGISTRATION_READBACK_FAILED', 'No se verificó la solicitud; no se confirmó el envío.');
          return { row: saved[0], replayed: false };
        });
        return { request: publicRow(result.row), replayed: result.replayed };
      } catch (error) {
        return storageError(error);
      } finally {
        if (locked) {
          try {
            await conn.query('SELECT RELEASE_LOCK(?)', [SUBMIT_LOCK]);
          } catch {
            /* el bloqueo se libera al cerrar la conexión */
          }
        }
        conn.release();
      }
    },

    async list(options: any = {}): Promise<any> {
      const status = options.status || 'pending';
      if (status !== 'all' && !STATUSES.includes(status)) fail(400, 'INVALID_STATUS', 'Estado de filtro inválido.');
      const limit = Math.min(100, Math.max(1, Number(options.limit) || 25));
      const offset = Math.max(0, Number(options.offset) || 0);
      const where = status === 'all' ? '' : 'WHERE status = ?';
      const params = status === 'all' ? [] : [status];
      const conn = await open(false);
      try {
        const [rows] = await conn.query(`SELECT * FROM ${REGISTRATION_TABLE} ${where} ORDER BY created_at ASC, id ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);
        const [count] = await conn.query(`SELECT COUNT(*) AS total FROM ${REGISTRATION_TABLE} ${where}`, params);
        return { items: rows.map(adminRow), total: Number(count[0].total), limit, offset };
      } catch (error) {
        return storageError(error);
      } finally {
        conn.release();
      }
    },

    async approve(id: any, actor: string): Promise<any> {
      requireId(id);
      const conn = await open(true);
      try {
        const claimed = await transaction(conn, async () => {
          const [rows] = await conn.query(`SELECT * FROM ${REGISTRATION_TABLE} WHERE id = ? FOR UPDATE`, [id]);
          const row = rows[0];
          if (!row) fail(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe.');
          if (row.status === 'approved') return { row, done: true, draft: null };
          if (row.status === 'rejected') fail(409, 'REQUEST_NOT_PENDING', 'La solicitud ya fue rechazada.');
          let draft: any;
          try {
            draft = JSON.parse(row.payload);
          } catch {
            fail(500, 'REQUEST_PAYLOAD_CORRUPT', 'La solicitud almacenada está dañada; no se aprobó.');
          }
          await conn.query(`UPDATE ${REGISTRATION_TABLE} SET status = 'approving', reviewed_by = ? WHERE id = ? AND status IN ('pending','approving')`, [actor, id]);
          return { row, done: false, draft };
        });
        if (claimed.done) return { request: adminRow(claimed.row), business: null, replayed: true };

        let created: any;
        try {
          created = await deps.businessStore.create(claimed.draft, id);
        } catch (error: any) {
          const definitive = Boolean(error) && error.writeMayHaveSucceeded === false && error.status !== 503;
          if (definitive) await revertClaim(conn, id);
          throw error;
        }

        let finalRow: any = null;
        try {
          await transaction(conn, async () => {
            await conn.query(`UPDATE ${REGISTRATION_TABLE} SET status = 'approved', business_id = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = 'approving'`, [String(created.business.id), actor, id]);
            const [saved] = await conn.query(`SELECT * FROM ${REGISTRATION_TABLE} WHERE id = ?`, [id]);
            if (!saved[0] || saved[0].status !== 'approved' || String(saved[0].business_id) !== String(created.business.id)) {
              fail(503, 'APPROVAL_NOT_CONFIRMED', 'La empresa se creó pero no se confirmó el cierre de la solicitud; reintenta aprobar.', true);
            }
            finalRow = saved[0];
          });
        } catch {
          // La empresa ya existe: cualquier fallo al cerrar la solicitud se informa como no confirmado y es reintentable.
          fail(503, 'APPROVAL_NOT_CONFIRMED', 'La empresa se creó pero no se confirmó el cierre de la solicitud; reintenta aprobar.', true);
        }
        return { request: adminRow(finalRow), business: created.business, replayed: Boolean(created.replayed) };
      } catch (error) {
        if (error instanceof RegistrationError || (error && typeof (error as any).status === 'number' && (error as any).code)) throw error;
        return storageError(error);
      } finally {
        conn.release();
      }
    },

    async reject(id: any, actor: string, reason: any): Promise<any> {
      requireId(id);
      const clean = typeof reason === 'string' ? reason.trim() : '';
      if (clean.length < 3 || clean.length > 500 || /[\u0000-\u0008\u000B-\u001F\u007F]/.test(clean)) fail(400, 'REJECT_REASON_REQUIRED', 'Se requiere un motivo de rechazo de 3 a 500 caracteres.');
      const conn = await open(true);
      try {
        const row = await transaction(conn, async () => {
          const [rows] = await conn.query(`SELECT * FROM ${REGISTRATION_TABLE} WHERE id = ? FOR UPDATE`, [id]);
          if (!rows[0]) fail(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe.');
          if (rows[0].status === 'approving') fail(409, 'REQUEST_APPROVAL_IN_PROGRESS', 'La solicitud está en aprobación; reintenta aprobarla.');
          if (rows[0].status !== 'pending') fail(409, 'REQUEST_NOT_PENDING', 'La solicitud ya fue resuelta.');
          await conn.query(`UPDATE ${REGISTRATION_TABLE} SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = 'pending'`, [clean, actor, id]);
          const [saved] = await conn.query(`SELECT * FROM ${REGISTRATION_TABLE} WHERE id = ?`, [id]);
          if (!saved[0] || saved[0].status !== 'rejected' || saved[0].reject_reason !== clean) fail(503, 'REJECTION_NOT_CONFIRMED', 'No se confirmó el rechazo.');
          return saved[0];
        });
        return { request: adminRow(row) };
      } catch (error) {
        return storageError(error);
      } finally {
        conn.release();
      }
    },
  };
}
