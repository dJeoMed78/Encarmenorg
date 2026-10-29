import {createStagingBusinessStore as createStoreWithDefaultProof} from '../../src/db/stagingBusinessStore';
export * from '../../src/server/stagingBusinessSecurity';
export * from '../../src/server/stagingBusinessRoutes';
export {BusinessWriteError} from '../../src/db/stagingBusinessStore';
// Las pruebas de este arnés usan conexiones simuladas sin tablas de permisos ni marca de entorno:
// se inyecta un verificador de aislamiento neutro. La comprobación real se prueba en
// tests/staging-isolation-proof.test.mjs y el valor por defecto estricto en tests/staging-store-default-strict.test.mjs.
export function createStagingBusinessStore(deps: any) {
  return createStoreWithDefaultProof({verifyIsolation: async () => ({ok: true, code: 'TEST_HARNESS_STUB'}), ...deps});
}
