/**
 * ENC-STAGING-PUBLIC-MEDIA-001 — POST /api/public/registration-media (anónima, solo Staging, separada de /api/upload-logo).
 * Cuerpo binario image/jpeg|png|webp; cabeceras X-Registration-Attempt (UUID v4) y X-Media-Role (logo|gallery).
 */
import {MEDIA_ALLOWED_TYPES, MEDIA_MAX_BYTES} from './publicMediaCore.ts';

export const PUBLIC_MEDIA_PATH = '/api/public/registration-media';

function coded(status: number, code: string, message: string): any {
  const error: any = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function describe(error: any): any {
  if (error && typeof error.status === 'number' && typeof error.code === 'string') {
    return {status: error.status, body: {success: false, error: error.code, message: error.message, writeMayHaveSucceeded: Boolean(error.writeMayHaveSucceeded)}};
  }
  return {status: 503, body: {success: false, error: 'STORAGE_UNAVAILABLE', message: 'No se pudo completar la carga; no se guardó nada.', writeMayHaveSucceeded: false}};
}

async function readLimited(req: any, max: number): Promise<any> {
  const chunks: any[] = [];
  let total = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += part.length;
    if (total > max) throw coded(413, 'PAYLOAD_TOO_LARGE', 'La imagen supera el límite de 3 MB.');
    chunks.push(part);
  }
  return Buffer.concat(chunks);
}

export function registerPublicMediaRoutes(app: any, deps: any): void {
  app.post(PUBLIC_MEDIA_PATH, async (req: any, res: any) => {
    try {
      if (!deps.enabled()) throw coded(403, 'PUBLIC_MEDIA_DISABLED', 'La carga pública de imágenes no está habilitada.');
      if (!deps.attempts(String(req.ip || ''))) throw coded(429, 'RATE_LIMITED', 'Demasiados intentos; intenta más tarde.');
      const type = String(req.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
      if (!MEDIA_ALLOWED_TYPES.includes(type)) throw coded(415, 'UNSUPPORTED_MEDIA_TYPE', 'Solo se aceptan imágenes JPEG, PNG o WebP.');
      const length = Number(req.get('Content-Length'));
      if (!Number.isFinite(length) || length <= 0) throw coded(411, 'LENGTH_REQUIRED', 'Se requiere Content-Length.');
      if (length > MEDIA_MAX_BYTES) throw coded(413, 'PAYLOAD_TOO_LARGE', 'La imagen supera el límite de 3 MB.');
      const body = await readLimited(req, MEDIA_MAX_BYTES);
      const result = await deps.service.upload({attemptId: req.get('X-Registration-Attempt') || '', role: req.get('X-Media-Role') || '', declaredType: type, body});
      res.set('Cache-Control', 'no-store');
      return res.status(201).json({success: true, ...result});
    } catch (error) {
      const failure = describe(error);
      if (failure.status === 413) res.set('Connection', 'close');
      return res.status(failure.status).json(failure.body);
    }
  });
}
