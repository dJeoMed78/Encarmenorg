/**
 * ENC-PUBLIC-REGISTRATION-001-R1 — ruta HTTP pública. Sin importaciones en tiempo de ejecución.
 * Única ruta: POST /api/public/business-registrations (anónima, sin permisos administrativos).
 */
export const PUBLIC_REGISTRATION_PATH = '/api/public/business-registrations';
export const PUBLIC_BODY_LIMIT_BYTES = 16384;

function coded(status: number, code: string, message: string): any {
  const error: any = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function describe(error: any): any {
  if (error && typeof error.status === 'number' && typeof error.code === 'string') {
    return { status: error.status, body: { success: false, error: error.code, message: error.message, writeMayHaveSucceeded: Boolean(error.writeMayHaveSucceeded) } };
  }
  return { status: 503, body: { success: false, error: 'STORAGE_UNAVAILABLE', message: 'No se pudo completar la operación; no se guardó nada.', writeMayHaveSucceeded: false } };
}

/** Debe montarse ANTES del analizador JSON global (50 MB): exige Content-Length y limita el tamaño del cuerpo. */
export function publicRegistrationBodyLimit(req: any, res: any, next: any): any {
  if (req.method !== 'POST') return next();
  const length = Number(req.headers && req.headers['content-length']);
  if (!Number.isFinite(length)) return res.status(411).json({ success: false, error: 'LENGTH_REQUIRED', message: 'Se requiere Content-Length.' });
  if (length > PUBLIC_BODY_LIMIT_BYTES) return res.status(413).json({ success: false, error: 'PAYLOAD_TOO_LARGE', message: 'El envío es demasiado grande.' });
  return next();
}

export function registerPublicRegistrationRoutes(app: any, deps: any): void {
  app.post(PUBLIC_REGISTRATION_PATH, async (req: any, res: any) => {
    try {
      if (!deps.enabled()) throw coded(403, 'PUBLIC_REGISTRATION_DISABLED', 'El registro público no está habilitado.');
      const ip = String(req.ip || '');
      if (!deps.attempts(ip)) throw coded(429, 'RATE_LIMITED', 'Demasiados intentos; intenta más tarde.');
      const validated = deps.validate(req.body);
      if (!deps.creations(ip, undefined, req.get('Idempotency-Key') || '')) throw coded(429, 'RATE_LIMITED', 'Demasiados registros desde esta conexión; intenta más tarde.');
      const result = await deps.service.submit({ validated, requestKey: req.get('Idempotency-Key') || '' });
      return res.status(result.replayed ? 200 : 201).json({
        success: true,
        replayed: result.replayed,
        business: result.business,
        directoryVisible: result.directoryVisible,
        message: 'Empresa registrada y publicada. El guardado se confirmó con una lectura en MariaDB.',
      });
    } catch (error) {
      const failure = describe(error);
      return res.status(failure.status).json(failure.body);
    }
  });
}
