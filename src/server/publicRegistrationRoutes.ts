/**
 * ENC-PUBLIC-REGISTRATION-001 — rutas HTTP. Sin importaciones en tiempo de ejecución: el almacén y los guardas se inyectan.
 * Público (anónimo): solo POST /api/public/business-registrations. Administración: sesión de servidor obligatoria.
 */
export const PUBLIC_REGISTRATION_PATH = '/api/public/business-registrations';
export const ADMIN_REGISTRATION_PATH = '/api/admin/business-registrations';

function describe(error: any): any {
  if (error && typeof error.status === 'number' && typeof error.code === 'string') {
    return { status: error.status, body: { success: false, error: error.code, message: error.message, writeMayHaveSucceeded: Boolean(error.writeMayHaveSucceeded) } };
  }
  return { status: 503, body: { success: false, error: 'STORAGE_UNAVAILABLE', message: 'No se pudo completar la operación; no se guardó nada.', writeMayHaveSucceeded: false } };
}

export function registerPublicRegistrationRoutes(app: any, deps: any): void {
  const send = (res: any, error: any) => {
    const failure = describe(error);
    return res.status(failure.status).json(failure.body);
  };
  const requireAdmin = (req: any) => {
    if (!deps.isAdmin(req)) {
      const error: any = new Error('Se requiere sesión administrativa vigente del servidor.');
      error.status = 401;
      error.code = 'ADMIN_SESSION_REQUIRED';
      throw error;
    }
    return deps.actor ? String(deps.actor(req)) : 'admin-session';
  };

  app.post(PUBLIC_REGISTRATION_PATH, async (req: any, res: any) => {
    try {
      if (!deps.enabled()) {
        const error: any = new Error('El registro público no está habilitado.');
        error.status = 403;
        error.code = 'PUBLIC_REGISTRATION_DISABLED';
        throw error;
      }
      if (!deps.attempts(String(req.ip || ''))) {
        const error: any = new Error('Demasiados intentos; intenta más tarde.');
        error.status = 429;
        error.code = 'RATE_LIMITED';
        throw error;
      }
      const validated = deps.validate(req.body);
      const result = await deps.store.submit({ validated, requestKey: req.get('Idempotency-Key') || '', ip: req.ip || '' });
      return res.status(result.replayed ? 200 : 201).json({
        success: true,
        replayed: result.replayed,
        request: result.request,
        message: 'Solicitud recibida y guardada en espera de revisión. La empresa todavía no está publicada.',
      });
    } catch (error) {
      return send(res, error);
    }
  });

  app.get(ADMIN_REGISTRATION_PATH, async (req: any, res: any) => {
    try {
      requireAdmin(req);
      const result = await deps.store.list({ status: req.query && req.query.status, limit: req.query && req.query.limit, offset: req.query && req.query.offset });
      return res.json({ success: true, ...result });
    } catch (error) {
      return send(res, error);
    }
  });

  app.post(ADMIN_REGISTRATION_PATH + '/:id/approve', async (req: any, res: any) => {
    try {
      const actor = requireAdmin(req);
      const result = await deps.store.approve(req.params.id, actor);
      return res.json({ success: true, ...result, message: 'Solicitud aprobada y empresa confirmada en MariaDB de Staging.' });
    } catch (error) {
      return send(res, error);
    }
  });

  app.post(ADMIN_REGISTRATION_PATH + '/:id/reject', async (req: any, res: any) => {
    try {
      const actor = requireAdmin(req);
      const result = await deps.store.reject(req.params.id, actor, req.body && req.body.reason);
      return res.json({ success: true, ...result, message: 'Solicitud rechazada.' });
    } catch (error) {
      return send(res, error);
    }
  });
}
