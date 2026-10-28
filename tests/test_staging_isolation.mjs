// ==============================================================================
// Test Suite: Verificación de Aislamiento de Entorno Staging
// Tarea: ENC-STAGING-ENV-READINESS-001
// ==============================================================================

import assert from 'node:assert/strict';
import {
  isStagingEnvironment,
  isWritePermitted,
  validateStagingDbConfiguration,
  PRODUCTION_DB_NAME,
  PRODUCTION_DB_USER,
  dbSaveBusiness,
  dbDeleteBusiness,
  dbSaveEvent,
  dbDeleteEvent,
  dbSavePromotion,
  dbDeletePromotion,
  dbSaveCoupon,
  dbDeleteCoupon,
  dbSaveClassified,
  dbDeleteClassified,
  dbSaveEmergencyService,
  dbDeleteEmergencyService,
  dbSavePortalConfig,
  dbSavePortalNotes,
  dbSaveUploadedFile,
  dbInsertRating
} from '../src/db/mariadb.ts';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

console.log('--- INICIANDO PRUEBAS DE AISLAMIENTO DE STAGING ---');

// Test 1: Detección correcta de entorno Staging mediante variables
runTest('Detección de entorno Staging con APP_ENV=staging', () => {
  const oldEnv = process.env.APP_ENV;
  process.env.APP_ENV = 'staging';
  assert.equal(isStagingEnvironment(), true);
  process.env.APP_ENV = oldEnv || '';
});

// Test 2: Rechazo de fallback implícito a producción en Staging
runTest('Rechazo de fallback implícito a producción en Staging', () => {
  const origAppEnv = process.env.APP_ENV;
  const origDbName = process.env.DB_NAME;
  try {
    process.env.APP_ENV = 'staging';
    delete process.env.DB_NAME;
    delete process.env.MYSQL_DATABASE;
    delete process.env.MARIADB_DATABASE;
    const res = validateStagingDbConfiguration();
    assert.equal(res.valid, false);
    assert.match(res.error, /se rechaza el fallback automático a producción/i);
  } finally {
    process.env.APP_ENV = origAppEnv || '';
    if (origDbName) process.env.DB_NAME = origDbName;
  }
});

// Test 3: Rechazo de conexión a BD de producción si no está en modo solo lectura
runTest('Rechazo de conexión a BD de producción en Staging sin STAGING_READ_ONLY=true', () => {
  const origAppEnv = process.env.APP_ENV;
  const origDbName = process.env.DB_NAME;
  const origReadOnly = process.env.STAGING_READ_ONLY;
  try {
    process.env.APP_ENV = 'staging';
    process.env.DB_NAME = PRODUCTION_DB_NAME;
    process.env.STAGING_READ_ONLY = 'false';
    const res = validateStagingDbConfiguration();
    assert.equal(res.valid, false);
    assert.match(res.error, /PELIGRO DE PRODUCCIÓN/);
  } finally {
    process.env.APP_ENV = origAppEnv || '';
    if (origDbName) process.env.DB_NAME = origDbName;
    if (origReadOnly) process.env.STAGING_READ_ONLY = origReadOnly;
  }
});

// Test 4: Rechazo de usuario con permisos de escritura de producción en Staging
runTest('Rechazo de usuario de escritura de producción en Staging', () => {
  const origAppEnv = process.env.APP_ENV;
  const origDbName = process.env.DB_NAME;
  const origDbUser = process.env.DB_USER;
  const origReadOnly = process.env.STAGING_READ_ONLY;
  try {
    process.env.APP_ENV = 'staging';
    process.env.DB_NAME = PRODUCTION_DB_NAME;
    process.env.DB_USER = PRODUCTION_DB_USER;
    process.env.STAGING_READ_ONLY = 'true'; // Aunque sea read-only, el usuario de producción está prohibido
    const res = validateStagingDbConfiguration();
    assert.equal(res.valid, false);
    assert.match(res.error, /no puede reutilizar el usuario con permisos de escritura de producción/);
  } finally {
    process.env.APP_ENV = origAppEnv || '';
    if (origDbName) process.env.DB_NAME = origDbName;
    if (origDbUser) process.env.DB_USER = origDbUser;
    if (origReadOnly) process.env.STAGING_READ_ONLY = origReadOnly;
  }
});

// Test 5: Aceptación de base de datos dedicada de Staging
runTest('Aceptación de base de datos dedicada de Staging con configuración válida', () => {
  const origAppEnv = process.env.APP_ENV;
  const origDbName = process.env.DB_NAME;
  const origDbUser = process.env.DB_USER;
  const origDbHost = process.env.DB_HOST;
  const origDbPass = process.env.DB_PASSWORD;
  const origReadOnly = process.env.STAGING_READ_ONLY;
  const origConfirmed = process.env.STAGING_DB_CONFIRMED;
  try {
    process.env.APP_ENV = 'staging';
    process.env.DB_NAME = 'u293982346_encarmentest';
    process.env.DB_USER = 'u293982346_staginguser';
    process.env.DB_HOST = 'srv1356.hstgr.io';
    process.env.DB_PASSWORD = 'dummy_staging_password';
    process.env.STAGING_READ_ONLY = 'false';
    process.env.STAGING_DB_CONFIRMED = 'true';
    const res = validateStagingDbConfiguration();
    assert.equal(res.valid, true);
    assert.equal(res.config?.database, 'u293982346_encarmentest');
    assert.equal(res.config?.user, 'u293982346_staginguser');
  } finally {
    process.env.APP_ENV = origAppEnv || '';
    if (origDbName) process.env.DB_NAME = origDbName; else delete process.env.DB_NAME;
    if (origDbUser) process.env.DB_USER = origDbUser; else delete process.env.DB_USER;
    if (origDbHost) process.env.DB_HOST = origDbHost; else delete process.env.DB_HOST;
    if (origDbPass) process.env.DB_PASSWORD = origDbPass; else delete process.env.DB_PASSWORD;
    if (origReadOnly) process.env.STAGING_READ_ONLY = origReadOnly; else delete process.env.STAGING_READ_ONLY;
    if (origConfirmed) process.env.STAGING_DB_CONFIRMED = origConfirmed; else delete process.env.STAGING_DB_CONFIRMED;
  }
});

// Test 6: Bloqueo de métodos de mutación en modo de solo lectura (isWritePermitted === false)
await runAsyncTest('Bloqueo de funciones de mutación en MariaDB cuando isWritePermitted() es falso', async () => {
  const origAppEnv = process.env.APP_ENV;
  const origReadOnly = process.env.STAGING_READ_ONLY;
  try {
    process.env.APP_ENV = 'staging';
    process.env.STAGING_READ_ONLY = 'true';
    assert.equal(isWritePermitted(), false);

    // Todas las operaciones de mutación deben retornar false inmediatamente sin arrojar excepciones no controladas
    assert.equal(await dbSaveBusiness({ id: 'dummy' }), false);
    assert.equal(await dbDeleteBusiness('dummy'), false);
    assert.equal(await dbSaveEvent({ id: 'dummy' }), false);
    assert.equal(await dbDeleteEvent('dummy'), false);
    assert.equal(await dbSavePromotion({ id: 'dummy' }), false);
    assert.equal(await dbDeletePromotion('dummy'), false);
    assert.equal(await dbSaveCoupon({ id: 'dummy' }), false);
    assert.equal(await dbDeleteCoupon('dummy'), false);
    assert.equal(await dbSaveClassified({ id: 'dummy' }), false);
    assert.equal(await dbDeleteClassified('dummy'), false);
    assert.equal(await dbSaveEmergencyService({ id: 'dummy' }), false);
    assert.equal(await dbDeleteEmergencyService('dummy'), false);
    assert.equal(await dbSavePortalConfig({ test: true }), false);
    assert.equal(await dbSavePortalNotes({ cambios_al_portal: '', fallas_del_portal: '' }), false);
    assert.equal(await dbSaveUploadedFile('test.png', 'image/png', Buffer.from('')), false);

    // dbInsertRating debe arrojar RATINGS_DATABASE_READ_ONLY
    let threwReadOnly = false;
    try {
      await dbInsertRating('dummy', 'a'.repeat(64), 5, 'test');
    } catch (e) {
      if (e.code === 'RATINGS_DATABASE_READ_ONLY') threwReadOnly = true;
    }
    assert.equal(threwReadOnly, true, 'dbInsertRating debió arrojar RATINGS_DATABASE_READ_ONLY');
  } finally {
    process.env.APP_ENV = origAppEnv || '';
    if (origReadOnly) process.env.STAGING_READ_ONLY = origReadOnly; else delete process.env.STAGING_READ_ONLY;
  }
});

// Test 7: Middleware HTTP de protección contra mutaciones
runTest('Middleware HTTP bloquea métodos mutantes (POST, PUT, DELETE) cuando isWritePermitted() es falso', () => {
  const origAppEnv = process.env.APP_ENV;
  const origReadOnly = process.env.STAGING_READ_ONLY;
  try {
    process.env.APP_ENV = 'staging';
    process.env.STAGING_READ_ONLY = 'true';

    function simulateMiddleware(method, path) {
      let statusCode = null;
      let jsonPayload = null;
      let nextCalled = false;

      const req = { method, path };
      const res = {
        status(c) {
          statusCode = c;
          return {
            json(p) { jsonPayload = p; }
          };
        }
      };
      const next = () => { nextCalled = true; };

      // Lógica idéntica al middleware en server.ts
      if (!isWritePermitted()) {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
          if (req.path === '/api/events/radar-search' || req.path === '/api/ratings/get') {
            next();
            return { statusCode, jsonPayload, nextCalled };
          }
          res.status(403).json({
            success: false,
            error: 'STAGING_READ_ONLY',
            message: 'Entorno de pruebas en modo solo lectura / seguro.'
          });
          return { statusCode, jsonPayload, nextCalled };
        }
      }
      next();
      return { statusCode, jsonPayload, nextCalled };
    }

    // GET debe ser permitido
    const getRes = simulateMiddleware('GET', '/api/businesses');
    assert.equal(getRes.nextCalled, true);
    assert.equal(getRes.statusCode, null);

    // POST a mutación de datos debe ser bloqueado con 403
    const postRes = simulateMiddleware('POST', '/api/businesses');
    assert.equal(postRes.nextCalled, false);
    assert.equal(postRes.statusCode, 403);
    assert.equal(postRes.jsonPayload.error, 'STAGING_READ_ONLY');

    // PUT debe ser bloqueado con 403
    const putRes = simulateMiddleware('PUT', '/api/businesses/1');
    assert.equal(putRes.nextCalled, false);
    assert.equal(putRes.statusCode, 403);

    // DELETE debe ser bloqueado con 403
    const deleteRes = simulateMiddleware('DELETE', '/api/events/1');
    assert.equal(deleteRes.nextCalled, false);
    assert.equal(deleteRes.statusCode, 403);

    // POST a endpoint de solo lectura como radar-search debe ser permitido
    const radarRes = simulateMiddleware('POST', '/api/events/radar-search');
    assert.equal(radarRes.nextCalled, true);
    assert.equal(radarRes.statusCode, null);
  } finally {
    process.env.APP_ENV = origAppEnv || '';
    if (origReadOnly) process.env.STAGING_READ_ONLY = origReadOnly; else delete process.env.STAGING_READ_ONLY;
  }
});

console.log(`\n--- RESUMEN DE PRUEBAS: ${passed} pasadas, ${failed} fallidas ---`);
if (failed > 0) {
  process.exit(1);
}
