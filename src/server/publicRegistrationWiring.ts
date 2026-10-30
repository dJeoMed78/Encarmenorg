import { createPublicRegistrationService, createPoolReaders, createAttemptLimiter, createCreationLimiter, validatePublicRegistration } from './publicRegistrationCore.ts';
import { registerPublicRegistrationRoutes, publicRegistrationBodyLimit } from './publicRegistrationRoutes.ts';

export { publicRegistrationBodyLimit };

/**
 * Montaje exclusivo de Staging del registro público directo. En otros entornos no registra nada.
 * businessStore: el almacén de createStagingBusinessStore (INSERT sin upsert, duplicados, idempotencia, aislamiento).
 */
export function mountPublicRegistration(app: any, deps: { isStaging: () => boolean; canWrite: () => boolean; getPool: () => any; businessStore: any; categorySlugs?: (categories: string[]) => string[]; saved: (business: any) => void; isVisible: (id: any) => boolean }): void {
  if (!deps.isStaging()) return;
  const readers = createPoolReaders(deps.getPool);
  const service = createPublicRegistrationService({
    canWrite: deps.canWrite,
    businessStore: deps.businessStore,
    countRecentPublic: readers.countRecentPublic,
    readBusiness: readers.readBusiness,
    hasPublicReplay: readers.hasPublicReplay,
    categorySlugs: deps.categorySlugs,
    onSaved: deps.saved,
    isVisible: deps.isVisible,
  });
  registerPublicRegistrationRoutes(app, {
    service,
    enabled: () => deps.canWrite() && process.env.PUBLIC_REGISTRATION_ENABLED === 'true',
    attempts: createAttemptLimiter(20, 15 * 60 * 1000),
    creations: createCreationLimiter(3, 60 * 60 * 1000),
    validate: validatePublicRegistration,
  });
}
