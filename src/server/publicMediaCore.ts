/**
 * ENC-STAGING-PUBLIC-MEDIA-001 — núcleo de la carga pública de imágenes del registro (sin dependencias de Express).
 * Solo JPEG/PNG/WebP reales (firma binaria), máximo 3 MB, recodificación obligatoria a WebP, nombres aleatorios
 * asociados al intento de registro y confirmación de la lectura del BLOB antes de responder éxito.
 */
import {createHash, randomBytes} from 'node:crypto';

export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;
export const MEDIA_MAX_GALLERY = 10;
export const MEDIA_UPLOADS_PER_ATTEMPT = {logo: 3, cover: 3, gallery: 20};
export const MEDIA_HOURLY_CAP = 300;
export const MEDIA_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MEDIA_UUID_V4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const MEDIA_FILENAME = /^pub-([a-f0-9]{12})-(l|c|g)-([a-f0-9]{32})\.webp$/;

export class MediaError extends Error {
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

export function mediaFail(status: number, code: string, message: string, maybeWritten = false): never {
  throw new MediaError(status, code, message, maybeWritten);
}

export function sha256(buffer: any): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** El prefijo público del intento no revela el UUID; solo permite asociar y contar archivos. */
export function attemptPrefix(attemptId: any): string {
  if (typeof attemptId !== 'string' || !MEDIA_UUID_V4.test(attemptId)) mediaFail(400, 'MEDIA_ATTEMPT_REQUIRED', 'Se requiere un identificador de intento UUID válido.');
  return createHash('sha256').update(attemptId.toLowerCase()).digest('hex').slice(0, 12);
}

/** Identifica el formato por su firma binaria. SVG, HTML, GIF y data URI nunca coinciden. */
export function sniffImage(buffer: any): string | null {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

export function newMediaFilename(prefix: string, role: string): string {
  return 'pub-' + prefix + '-' + (role === 'logo' ? 'l' : role === 'cover' ? 'c' : 'g') + '-' + randomBytes(16).toString('hex') + '.webp';
}

export function mediaUrl(filename: string): string {
  return '/uploads/' + filename;
}

/** Solo acepta exactamente /uploads/<nombre emitido por el servidor>. Nada de URLs externas, data URI ni rutas relativas. */
export function parseMediaUrl(value: any): any {
  if (typeof value !== 'string' || !value.startsWith('/uploads/')) return null;
  const filename = value.slice('/uploads/'.length);
  const match = MEDIA_FILENAME.exec(filename);
  if (!match) return null;
  return {filename, prefix: match[1], role: match[2] === 'l' ? 'logo' : match[2] === 'c' ? 'cover' : 'gallery'};
}

export function createPublicMediaService(deps: any): any {
  if (!deps || typeof deps.canWrite !== 'function' || !deps.store || typeof deps.store.saveVerified !== 'function' || typeof deps.store.readBack !== 'function' || typeof deps.recode !== 'function') {
    throw new Error('PUBLIC_MEDIA_DEPENDENCIES_REQUIRED');
  }
  return {
    async upload(input: any): Promise<any> {
      if (!deps.canWrite()) mediaFail(403, 'PUBLIC_MEDIA_DISABLED', 'La carga pública de imágenes no está habilitada.');
      const prefix = attemptPrefix(input.attemptId);
      const role = input.role;
      if (role !== 'logo' && role !== 'cover' && role !== 'gallery') mediaFail(400, 'INVALID_MEDIA_ROLE', 'El rol de la imagen debe ser logo, cover o gallery.');
      const body = input.body;
      if (!Buffer.isBuffer(body) || body.length === 0) mediaFail(400, 'EMPTY_FILE', 'El archivo está vacío.');
      if (body.length > MEDIA_MAX_BYTES) mediaFail(413, 'PAYLOAD_TOO_LARGE', 'La imagen supera el límite de 3 MB.');
      const kind = sniffImage(body);
      if (!kind) mediaFail(415, 'UNSUPPORTED_MEDIA_TYPE', 'Solo se aceptan imágenes JPEG, PNG o WebP.');
      if (String(input.declaredType || '').toLowerCase() !== 'image/' + kind) mediaFail(415, 'MEDIA_TYPE_MISMATCH', 'El tipo declarado no coincide con el contenido de la imagen.');
      let data: any = null;
      try {
        data = await deps.recode(body);
      } catch {
        mediaFail(422, 'IMAGE_UNPROCESSABLE', 'No se pudo procesar la imagen.');
      }
      if (!Buffer.isBuffer(data) || data.length === 0 || data.length > MEDIA_MAX_BYTES || sniffImage(data) !== 'webp') mediaFail(422, 'IMAGE_UNPROCESSABLE', 'No se pudo procesar la imagen.');
      const filename = newMediaFilename(prefix, role);
      const digest = sha256(data);
      await deps.store.saveVerified({filename, mimeType: 'image/webp', data, prefix, role, digest});
      let stored: any = null;
      try {
        stored = await deps.store.readBack(filename);
      } catch {
        stored = null;
      }
      if (!stored || stored.mimeType !== 'image/webp' || !Buffer.isBuffer(stored.data) || stored.data.length !== data.length || sha256(stored.data) !== digest) {
        mediaFail(503, 'MEDIA_READBACK_FAILED', 'No se verificó la imagen en MariaDB; vuelve a intentarlo.', true);
      }
      return {url: mediaUrl(filename), role, bytes: data.length, sha256: digest};
    },
  };
}
