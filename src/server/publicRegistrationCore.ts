/**
 * ENC-PUBLIC-REGISTRATION-001-R1 — registro público directo de empresas (núcleo sin dependencias).
 * Flujo: validación -> INSERT en businesses mediante el almacén de Staging (sin upsert, duplicados, idempotencia,
 * aislamiento y lectura posterior ya incluidos) -> segunda lectura SQL independiente -> respuesta con el ID.
 * No existe etapa de revisión: la empresa queda publicada al confirmarse la lectura.
 */
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

export const PUBLIC_SOURCE = 'public-form';
const UUID_V4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ALLOWED_FIELDS = new Set(['name', 'category', 'subcategory', 'description', 'address', 'colonia', 'phone', 'whatsapp', 'schedule', 'facebook', 'instagram', 'website', 'hp']);

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

/** Valida y normaliza el envío público. Teléfono y WhatsApp son independientes; nada se infiere ni se recorta en silencio. */
export function validatePublicRegistration(body: any): any {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'INVALID_REGISTRATION', 'Se requiere un objeto de registro.');
  for (const key of Object.keys(body)) if (!ALLOWED_FIELDS.has(key)) fail(400, 'INVALID_REGISTRATION', 'El envío contiene campos no permitidos.');
  if (body.hp !== undefined && body.hp !== '') fail(400, 'SPAM_REJECTED', 'Registro rechazado.');
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
  return { draft };
}

/** Límite en memoria por clave (por IP). Complementa el tope global persistente calculado sobre businesses. */
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

/** Lecturas SQL de solo consulta sobre businesses. Cualquier fallo de MariaDB es un error real (503). */
export function createPoolReaders(getPool: () => any): any {
  async function run(sql: string, params: any[]): Promise<any> {
    const pool = getPool();
    if (!pool) fail(503, 'STORAGE_UNAVAILABLE', 'MariaDB no está disponible; no se guardó nada.');
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch {
      fail(503, 'STORAGE_UNAVAILABLE', 'No se pudo consultar MariaDB; no se guardó nada.');
    }
  }
  return {
    async countRecentPublic(): Promise<any> {
      const rows = await run(
        'SELECT COALESCE(SUM(created_at > (NOW() - INTERVAL 1 HOUR)), 0) AS hour_total, COUNT(*) AS day_total FROM businesses WHERE created_at > (NOW() - INTERVAL 1 DAY) AND raw_data LIKE ?',
        ['%"registrationSource":"' + PUBLIC_SOURCE + '"%'],
      );
      return { hour: Number(rows[0] && rows[0].hour_total) || 0, day: Number(rows[0] && rows[0].day_total) || 0 };
    },
    async readBusiness(id: any): Promise<any> {
      const rows = await run('SELECT id, name, phone, whatsapp, status FROM businesses WHERE id = ?', [String(id)]);
      return rows[0] || null;
    },
  };
}

export function createPublicRegistrationService(deps: any): any {
  if (!deps || typeof deps.canWrite !== 'function' || !deps.businessStore || typeof deps.businessStore.create !== 'function' || typeof deps.countRecentPublic !== 'function' || typeof deps.readBusiness !== 'function') {
    throw new Error('PUBLIC_REGISTRATION_DEPENDENCIES_REQUIRED');
  }
  const limits = { perHour: 30, perDay: 200, ...(deps.limits || {}) };
  return {
    async submit(input: any): Promise<any> {
      if (!deps.canWrite()) fail(403, 'PUBLIC_REGISTRATION_DISABLED', 'El registro público no está habilitado.');
      const key = String(input.requestKey || '');
      if (!UUID_V4.test(key)) fail(400, 'REQUEST_KEY_REQUIRED', 'Se requiere una clave de registro UUID para reintentos seguros.');
      const recent = await deps.countRecentPublic();
      if (recent.hour >= limits.perHour || recent.day >= limits.perDay) fail(429, 'REGISTRATION_CAPACITY', 'Se alcanzó el límite temporal de registros; intenta más tarde.');
      const draft: any = { ...input.validated.draft, registrationSource: PUBLIC_SOURCE };
      if (typeof deps.categorySlugs === 'function') draft.categorySlugs = deps.categorySlugs(draft.categories);

      let created: any;
      try {
        created = await deps.businessStore.create(draft, key);
      } catch (error: any) {
        if (error && typeof error.status === 'number' && typeof error.code === 'string') throw error;
        fail(503, 'STORAGE_UNAVAILABLE', 'No se confirmó el guardado en MariaDB; reintenta con la misma clave.', true);
      }

      const id = created && created.business && created.business.id;
      let row: any = null;
      try {
        row = await deps.readBusiness(id);
      } catch {
        row = null;
      }
      const confirmed = Boolean(row) && String(row.id) === String(id) && normalizeName(row.name) === normalizeName(draft.name) &&
        String(row.phone ?? '') === draft.phone && String(row.whatsapp ?? '') === draft.whatsapp && String(row.status || '') === 'published';
      if (!confirmed) fail(503, 'REGISTRATION_READBACK_FAILED', 'No se verificó la empresa en MariaDB; no se confirmó el registro. Reintenta con la misma clave.', true);

      let cacheUpdated = true;
      try {
        if (typeof deps.onSaved === 'function') deps.onSaved(created.business);
      } catch {
        cacheUpdated = false;
      }
      const visible = typeof deps.isVisible === 'function' ? Boolean(deps.isVisible(id)) : false;
      return { business: created.business, replayed: Boolean(created.replayed), directoryVisible: cacheUpdated && visible };
    },
  };
}
