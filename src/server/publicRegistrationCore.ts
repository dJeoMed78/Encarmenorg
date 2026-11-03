/**
 * ENC-PUBLIC-REGISTRATION-001-R1 — registro público directo de empresas (núcleo sin dependencias).
 * Flujo: validación -> INSERT en businesses mediante el almacén de Staging (sin upsert, duplicados, idempotencia,
 * aislamiento y lectura posterior ya incluidos) -> segunda lectura SQL independiente -> respuesta con el ID.
 * No existe etapa de revisión: la empresa queda publicada al confirmarse la lectura.
 * ENC-STAGING-PUBLIC-MEDIA-001: admite un logotipo y hasta 10 fotografías ya subidas y verificadas en uploaded_files.
 */
import {contactDigits} from '../utils/businessContacts.ts';
import {STANDARDIZED_DELIVERY_OPTIONS, STANDARDIZED_PAYMENT_OPTIONS} from '../constants/businessOptions.ts';
import {PUBLIC_REGISTRATION_FIELDS} from '../constants/publicRegistration.ts';
import {MEDIA_MAX_GALLERY, MEDIA_UUID_V4, attemptPrefix, parseMediaUrl} from './publicMediaCore.ts';

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
const ALLOWED_FIELDS = new Set(PUBLIC_REGISTRATION_FIELDS);

function fail(status: number, code: string, message: string, maybeWritten = false): never {
  throw new RegistrationError(status, code, message, maybeWritten);
}

export function mxDigits(value: any): string {
  return contactDigits(value);
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

/** Un logotipo y hasta 10 fotografías: solo rutas /uploads/ emitidas por el servidor para este mismo intento. */
function mediaFields(body: any): any {
  const logoRaw = body.logo_url === undefined || body.logo_url === null ? '' : body.logo_url;
  const imageRaw = body.image === undefined || body.image === null ? '' : body.image;
  const coverRaw = body.cover_url === undefined || body.cover_url === null ? '' : body.cover_url;
  const galleryRaw = body.gallery === undefined || body.gallery === null ? [] : body.gallery;
  if (typeof logoRaw !== 'string' || typeof imageRaw !== 'string' || typeof coverRaw !== 'string') fail(400, 'INVALID_REGISTRATION', 'Imagen de logotipo inválida.');
  if (!Array.isArray(galleryRaw)) fail(400, 'INVALID_REGISTRATION', 'La galería debe ser una lista.');
  if (logoRaw && imageRaw && logoRaw !== imageRaw) fail(400, 'INVALID_REGISTRATION', 'image y logo_url deben coincidir.');
  const logo = logoRaw || imageRaw;
  if (!logo && !coverRaw && galleryRaw.length === 0) return null;
  if (galleryRaw.length > MEDIA_MAX_GALLERY) fail(400, 'INVALID_REGISTRATION', 'Máximo ' + MEDIA_MAX_GALLERY + ' fotografías.');
  const attempt = body.mediaAttempt;
  if (typeof attempt !== 'string' || !MEDIA_UUID_V4.test(attempt)) fail(400, 'INVALID_REGISTRATION', 'Falta el identificador del intento de carga de imágenes.');
  const prefix = attemptPrefix(attempt);
  const filenames: string[] = [];
  if (logo) {
    const parsed = parseMediaUrl(logo);
    if (!parsed || parsed.role !== 'logo' || parsed.prefix !== prefix) fail(400, 'INVALID_REGISTRATION', 'El logotipo no es una imagen subida en este registro.');
    filenames.push(parsed.filename);
  }
  const seen = new Set();
  if (coverRaw) {
    const parsed = parseMediaUrl(coverRaw);
    if (!parsed || parsed.role !== 'cover' || parsed.prefix !== prefix) fail(400, 'INVALID_REGISTRATION', 'La portada no es una imagen subida en este registro.');
    if (seen.has(parsed.filename)) fail(400, 'INVALID_REGISTRATION', 'Imagen repetida.');
    seen.add(parsed.filename);
    filenames.push(parsed.filename);
  }
  for (const entry of galleryRaw) {
    const parsed = parseMediaUrl(entry);
    if (!parsed || parsed.role !== 'gallery' || parsed.prefix !== prefix) fail(400, 'INVALID_REGISTRATION', 'Una fotografía no es una imagen subida en este registro.');
    if (seen.has(parsed.filename)) fail(400, 'INVALID_REGISTRATION', 'Fotografía repetida.');
    seen.add(parsed.filename);
    filenames.push(parsed.filename);
  }
  return {logo, cover: coverRaw, gallery: galleryRaw.slice(), prefix, filenames};
}

/** Valida y normaliza el envío público. Teléfono y WhatsApp son independientes; nada se infiere ni se recorta en silencio. */
export function validatePublicRegistration(body: any): any {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'INVALID_REGISTRATION', 'Se requiere un objeto de registro.');
  for (const key of Object.keys(body)) if (!ALLOWED_FIELDS.has(key as any)) fail(400, 'INVALID_REGISTRATION', 'El envío contiene campos no permitidos.');
  if (body.hp !== undefined && body.hp !== '') fail(400, 'SPAM_REJECTED', 'Registro rechazado.');
  const category = text(body, 'category', 100, true);
  const postalCode = text(body, 'postalCode', 5);
  if (postalCode && !/^\d{5}$/.test(postalCode)) fail(400, 'INVALID_REGISTRATION', 'Código postal inválido.');
  const options = (key: string, allowed: string[]) => {
    const value = text(body, key, 255);
    const entries = value ? value.split(',').map(entry => entry.trim()) : [];
    if (entries.some(entry => !allowed.includes(entry))) fail(400, 'INVALID_REGISTRATION', 'Opción no permitida en ' + key + '.');
    return [...new Set(entries)].join(', ');
  };
  const payment = options('payment', STANDARDIZED_PAYMENT_OPTIONS);
  const delivery = options('delivery', [...STANDARDIZED_DELIVERY_OPTIONS, 'No Aplica']);
  const media = mediaFields(body);
  const draft: any = {
    name: text(body, 'name', 160, true),
    category,
    categories: [category],
    subcategory: text(body, 'subcategory', 100),
    description: text(body, 'description', 500, false, true),
    address: text(body, 'address', 255),
    colonia: text(body, 'colonia', 100),
    postalCode,
    phone: contact(body, 'phone'),
    whatsapp: contact(body, 'whatsapp'),
    schedule: text(body, 'schedule', 255),
    payment,
    delivery,
    deliveryOption: delivery,
    hasDelivery: delivery.split(', ').some(option => /domicilio|envíos/i.test(option)),
    facebook: link(body, 'facebook'),
    instagram: link(body, 'instagram'),
    website: link(body, 'website'),
  };
  if (!draft.phone && !draft.whatsapp) fail(400, 'INVALID_REGISTRATION', 'Se requiere teléfono o WhatsApp mexicano válido.');
  if (!media) return {draft};
  if (media.logo) {
    draft.logo_url = media.logo;
    draft.image = media.logo;
  }
  if (media.cover) {
    draft.cover_url = media.cover;
    if (!media.logo) draft.image = media.cover;
  }
  if (media.gallery.length > 0) draft.gallery = media.gallery;
  return {draft, media: {prefix: media.prefix, filenames: media.filenames}};
}

/** Límite en memoria por clave (por IP). Complementa el tope global persistente calculado sobre businesses. */
export function createAttemptLimiter(max = 20, windowMs = 15 * 60 * 1000) {
  const attempts = new Map();
  return (key: string, now = Date.now()) => {
    for (const [id, entry] of attempts) if (entry.expires <= now) attempts.delete(id);
    const current = attempts.get(key);
    if ((current ? current.count : 0) >= max || (!current && attempts.size >= 10000)) return false;
    attempts.set(key, {count: (current ? current.count : 0) + 1, expires: current ? current.expires : now + windowMs});
    return true;
  };
}

/** El mismo UUID no consume nuevamente el cupo de altas; los intentos HTTP siguen limitados por separado. */
export function createCreationLimiter(max = 3, windowMs = 60 * 60 * 1000) {
  const reservations = new Map();
  return (ip: string, now = Date.now(), requestKey = '') => {
    if (!UUID_V4.test(requestKey)) return true; // El servicio responderá 400; no es un alta válida.
    for (const [key, entry] of reservations) if (entry.expires <= now) reservations.delete(key);
    const entry = reservations.get(ip);
    if (entry && entry.keys.has(requestKey)) return true;
    if ((entry && entry.keys.size >= max) || (!entry && reservations.size >= 10000)) return false;
    const current = entry || {keys: new Set(), expires: now + windowMs};
    current.keys.add(requestKey);
    reservations.set(ip, current);
    return true;
  };
}

/** Lecturas SQL de solo consulta sobre businesses. Cualquier fallo de MariaDB es un error real (503). */
export function createPoolReaders(getPool: any): any {
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
    async hasPublicReplay(key: string): Promise<boolean> {
      const rows = await run('SELECT id FROM businesses WHERE raw_data LIKE ? AND raw_data LIKE ? LIMIT 1', ['%"registrationSource":"' + PUBLIC_SOURCE + '"%', '%"_stagingRegistrationId":"' + key + '"%']);
      return rows.length > 0;
    },
    async countRecentPublic(): Promise<any> {
      const rows = await run(
        'SELECT COALESCE(SUM(created_at > (NOW() - INTERVAL 1 HOUR)), 0) AS hour_total, COUNT(*) AS day_total FROM businesses WHERE created_at > (NOW() - INTERVAL 1 DAY) AND raw_data LIKE ?',
        ['%"registrationSource":"' + PUBLIC_SOURCE + '"%'],
      );
      return {hour: Number(rows[0] && rows[0].hour_total) || 0, day: Number(rows[0] && rows[0].day_total) || 0};
    },
    async readBusiness(id: any): Promise<any> {
      const rows = await run('SELECT id, name, phone, whatsapp, status, image, raw_data FROM businesses WHERE id = ?', [String(id)]);
      return rows[0] || null;
    },
  };
}

/** Las imágenes del borrador deben releerse desde la fila persistida (columna image y raw_data.gallery). */
export function mediaPersisted(row: any, draft: any): boolean {
  const wanted = Array.isArray(draft.gallery) ? draft.gallery : [];
  if (!draft.image && !draft.cover_url && wanted.length === 0) return true;
  let extra: any = {};
  try {
    extra = JSON.parse(String(row.raw_data || '{}'));
  } catch {
    return false;
  }
  const stored = Array.isArray(extra.gallery) ? extra.gallery : [];
  return String(row.image || '') === String(draft.image || '') && String(extra.logo_url || '') === String(draft.logo_url || '') && String(extra.cover_url || '') === String(draft.cover_url || '') && stored.length === wanted.length && wanted.every((url: any, index: number) => stored[index] === url);
}

export function createPublicRegistrationService(deps: any): any {
  if (!deps || typeof deps.canWrite !== 'function' || !deps.businessStore || typeof deps.businessStore.create !== 'function' || typeof deps.countRecentPublic !== 'function' || typeof deps.readBusiness !== 'function') {
    throw new Error('PUBLIC_REGISTRATION_DEPENDENCIES_REQUIRED');
  }
  const limits = {perHour: 30, perDay: 200, ...(deps.limits || {})};
  return {
    async submit(input: any): Promise<any> {
      if (!deps.canWrite()) fail(403, 'PUBLIC_REGISTRATION_DISABLED', 'El registro público no está habilitado.');
      const key = String(input.requestKey || '');
      if (!UUID_V4.test(key)) fail(400, 'REQUEST_KEY_REQUIRED', 'Se requiere una clave de registro UUID para reintentos seguros.');
      const replay = typeof deps.hasPublicReplay === 'function' && await deps.hasPublicReplay(key);
      const recent = replay ? null : await deps.countRecentPublic();
      if (recent && (recent.hour >= limits.perHour || recent.day >= limits.perDay)) fail(429, 'REGISTRATION_CAPACITY', 'Se alcanzó el límite temporal de registros; intenta más tarde.');
      const media = input.validated.media;
      if (media) {
        if (typeof deps.verifyMedia !== 'function') fail(503, 'MEDIA_VERIFIER_UNAVAILABLE', 'No se pueden verificar las imágenes; no se guardó nada.');
        await deps.verifyMedia(media.prefix, media.filenames);
      }
      const draft: any = {...input.validated.draft, registrationSource: PUBLIC_SOURCE};
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
        String(row.phone ?? '') === draft.phone && String(row.whatsapp ?? '') === draft.whatsapp && String(row.status || '') === 'published' &&
        mediaPersisted(row, draft);
      if (!confirmed) fail(503, 'REGISTRATION_READBACK_FAILED', 'No se verificó la empresa en MariaDB; no se confirmó el registro. Reintenta con la misma clave.', true);

      let cacheUpdated = true;
      try {
        if (typeof deps.onSaved === 'function') await deps.onSaved(created.business);
      } catch {
        cacheUpdated = false;
      }
      let visible = false;
      try { visible = typeof deps.isVisible === 'function' && Boolean(await deps.isVisible(id)); } catch {}
      if (!cacheUpdated || !visible) fail(503, 'REGISTRATION_VISIBILITY_UNCONFIRMED', 'El guardado puede haberse completado, pero no se confirmó la publicación. Reintenta con la misma clave.', true);
      return {business: created.business, replayed: Boolean(created.replayed), directoryVisible: true};
    },
  };
}
