import { createPublicRegistrationService, createPoolReaders, createAttemptLimiter, createCreationLimiter, validatePublicRegistration } from './publicRegistrationCore.ts';
import { registerPublicRegistrationRoutes, publicRegistrationBodyLimit } from './publicRegistrationRoutes.ts';
import {getPrivateStagingSnapshot, STAGING_BUSINESS_DATABASE} from './stagingBusinessSecurity.ts';

export { publicRegistrationBodyLimit };


/** Exige autorización explícita, exclusivamente desde el archivo privado de Staging.
 * process.env no puede habilitar la ruta anónima por sí mismo.
 */
export function privatePublicRegistrationEnabled(config: Record<string,string|undefined> | null): boolean {
  return Boolean(config &&
    config.APP_ENV === 'staging' &&
    config.DB_NAME === STAGING_BUSINESS_DATABASE &&
    config.STAGING_READ_ONLY === 'false' &&
    config.STAGING_DB_CONFIRMED === 'true' &&
    config.STAGING_BUSINESS_WRITES_ENABLED === 'true' &&
    config.ENC_ADMIN_MUTATIONS_ENABLED === 'true' &&
    config.PUBLIC_REGISTRATION_ENABLED === 'true');
}

/**
 * Montaje exclusivo de Staging del registro público directo. En otros entornos no registra nada.
 * businessStore: el almacén de createStagingBusinessStore (INSERT sin upsert, duplicados, idempotencia, aislamiento).
 */
export function mountPublicRegistration(app: any, deps: { isStaging: () => boolean; canWrite: () => boolean; getPool: () => any; businessStore: any; categorySlugs?: (categories: string[]) => string[]; saved: (business: any) => void; isVisible: (id: any) => boolean; privateRegistrationSnapshot?: () => Record<string,string|undefined> | null }): void {
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
    enabled: () => deps.canWrite() && privatePublicRegistrationEnabled(
      deps.privateRegistrationSnapshot ? deps.privateRegistrationSnapshot() : getPrivateStagingSnapshot()
    ),
    attempts: createAttemptLimiter(20, 15 * 60 * 1000),
    creations: createCreationLimiter(3, 60 * 60 * 1000),
    validate: validatePublicRegistration,
  });
}
