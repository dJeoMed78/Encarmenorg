import { createPublicRegistrationStore, createAttemptLimiter, validatePublicRegistration } from './publicRegistrationCore';
import { registerPublicRegistrationRoutes } from './publicRegistrationRoutes';
import { verifyStagingIsolation } from './stagingIsolationProof';

/**
 * Montaje exclusivo de Staging. Debe invocarse junto a registerStagingBusinessRoutes y, si el guardián global
 * de métodos de Staging bloquea rutas desconocidas, esas cuatro rutas deben permitirse allí (ver documento).
 * businessStore: el almacén de createStagingBusinessStore (reutilizado para la aprobación).
 */
export function mountPublicRegistration(app: any, deps: { isStaging: () => boolean; canWrite: () => boolean; isAdmin: (req: any) => boolean; getPool: () => any; businessStore: any }): void {
  if (!deps.isStaging()) return;
  const store = createPublicRegistrationStore({
    canWrite: deps.canWrite,
    getConnection: async () => {
      const pool = deps.getPool();
      if (!pool) throw new Error('POOL_UNAVAILABLE');
      return pool.getConnection();
    },
    verifyIsolation: (conn: any) => verifyStagingIsolation(conn, process.env),
    businessStore: deps.businessStore,
    ipSalt: () => process.env.PUBLIC_REGISTRATION_IP_SALT || '',
  });
  registerPublicRegistrationRoutes(app, {
    store,
    isAdmin: deps.isAdmin,
    enabled: () => deps.canWrite() && process.env.PUBLIC_REGISTRATION_ENABLED === 'true',
    attempts: createAttemptLimiter(20, 15 * 60 * 1000),
    validate: validatePublicRegistration,
  });
}
