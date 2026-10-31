import { createPublicRegistrationService, createPoolReaders, createAttemptLimiter, createCreationLimiter, validatePublicRegistration } from './publicRegistrationCore.ts';
import { registerPublicRegistrationRoutes, publicRegistrationBodyLimit } from './publicRegistrationRoutes.ts';
import { registerPublicMediaRoutes } from './publicMediaRoutes.ts';
import { createPublicMediaService } from './publicMediaCore.ts';
import { recodePublicImage } from './publicMediaRecode.ts';
import { verifyStagingIsolation } from './stagingIsolationProof.ts';
import { createStagingMediaStore } from '../db/stagingMediaStore.ts';
import {getPrivateStagingSnapshot, STAGING_BUSINESS_DATABASE} from './stagingBusinessSecurity.ts';

export { publicRegistrationBodyLimit };


/** Exige autorización explícita, exclusivamente desde el archivo privado de Staging.
 * process.env no puede habilitar la ruta anónima por sí mismo.
 */
export function privatePublicRegistrationEnabled(config: Record<string,string|undefined> | null): boolean {
  return Boolean(config &&
    config.APP_ENV === 'staging' &&
    config.DB_NAME === STAGING_BUSINESS_DATABASE &&
    config.PUBLIC_REGISTRATION_ENABLED === 'true');
}

/**
 * Montaje exclusivo de Staging del registro público directo y de su carga de imágenes. En otros entornos no registra nada.
 * businessStore: el almacén de createStagingBusinessStore (INSERT sin upsert, duplicados, idempotencia, aislamiento).
 * La carga de imágenes usa su propio almacén autorizado (uploaded_files) y los mismos controles privados; no relaja guardWrite().
 */
export function mountPublicRegistration(app: any, deps: any): void {
  if (!deps.isStaging()) return;
  const readers = createPoolReaders(deps.getPool);
  const snapshot = () => (deps.privateRegistrationSnapshot ? deps.privateRegistrationSnapshot() : getPrivateStagingSnapshot());
  const enabled = () => deps.canWrite() && privatePublicRegistrationEnabled(snapshot());

  // Entorno para la prueba de aislamiento: process.env con la configuración privada validada encima.
  const isolationEnv = () => {
    const env: Record<string, string | undefined> = { ...process.env };
    const priv = snapshot();
    if (priv) for (const [key, value] of Object.entries(priv)) if (typeof value === 'string' && value !== '') env[key] = value;
    return env;
  };
  const mediaStore = deps.mediaStore || createStagingMediaStore({
    canWrite: enabled,
    getPool: deps.getPool,
    getConnection: deps.getConnection || (async () => {
      const pool = deps.getPool();
      if (!pool) throw new Error('POOL_UNAVAILABLE');
      return pool.getConnection();
    }),
    verifyIsolation: deps.verifyIsolation || ((conn: any) => verifyStagingIsolation(conn, isolationEnv())),
  });
  const mediaService = createPublicMediaService({ canWrite: enabled, store: mediaStore, recode: deps.recode || recodePublicImage });

  const service = createPublicRegistrationService({
    canWrite: deps.canWrite,
    businessStore: deps.businessStore,
    countRecentPublic: readers.countRecentPublic,
    readBusiness: readers.readBusiness,
    hasPublicReplay: readers.hasPublicReplay,
    verifyMedia: (prefix: string, filenames: string[]) => mediaStore.verifyOwned(prefix, filenames),
    categorySlugs: deps.categorySlugs,
    onSaved: deps.saved,
    isVisible: deps.isVisible,
  });
  registerPublicMediaRoutes(app, {
    service: mediaService,
    enabled,
    attempts: createAttemptLimiter(60, 15 * 60 * 1000),
  });
  registerPublicRegistrationRoutes(app, {
    service,
    enabled,
    attempts: createAttemptLimiter(20, 15 * 60 * 1000),
    creations: createCreationLimiter(3, 60 * 60 * 1000),
    validate: validatePublicRegistration,
  });
}
