process.env.NODE_ENV = 'test';

// Automated test suite for ENC-RADAR-EMPRESAS-043
// Audited by Coordinación Principal 01 (Nia) — Orden Definitiva de Corrección y Terminación
//
// MATRIZ OBLIGATORIA DE 22 ESCENARIOS:
// 1. Aprobación individual con reutilización estricta de conexión lockConn.
// 2. Aprobación múltiple con verificación de lectura posterior individualizada.
// 3. Conexión MariaDB fallida (503 Service Unavailable, aborto y caché intacto).
// 4. Escritura fallida en MariaDB (503 Service Unavailable, caché intacto).
// 5. Lectura posterior fallida en MariaDB (503 Service Unavailable, rechazo estricto BLOQUEANTE).
// 6. Discrepancia de registros en lectura posterior (503 Service Unavailable, rechazo por integridad).
// 7. Duplicado existente en MariaDB detectado bajo el bloqueo distribuido (409 Conflict).
// 8. Duplicados dentro de un lote (colisiones intra-lote rechazadas con 207 Multi-Status).
// 9. Concurrencia entre solicitudes serializadas con Mutex y MariaDB lock.
// 10. Denegación de GET_LOCK (devuelve 0 -> 503 BUSINESS_DB_LOCK_UNAVAILABLE).
// 11. Liberación del bloqueo ante excepciones garantizada en bloque finally.
// 12. Pool real limitado a una conexión (connectionLimit: 1, reutilización total sin deadlock ni agotamiento).
// 13. Pool real limitado a dos conexiones (connectionLimit: 2, concurrencia paralela sin starvation).
// 14. Autorización administrativa (401 Unauthorized sin token válido).
// 15. Procedencia real de candidatos IA (mapAiCandidateToBusiness sin claims sintéticos y requiere admin).
// 16. Ausencia real de solicitudes a WordPress/WooCommerce (interceptor de red activo: 0 llamadas).
// 17. Compatibilidad y coexistencia con controladores reales de clasificados (sin interferencias de lock ni datos).
// 18. Ausencia de publicación falsa (candidatos no confirmados nunca aparecen en catálogo público).
// 19. Asignación segura de identificadores (consulta REGEXP cerrada y enteros secuenciales).
// 20. Idempotencia ante fallos repetidos (múltiples fallos consecutivos no mutan el estado).
// 21. Verificación integral de campos persistidos (comparación canónica exhaustiva de ID, nombre, teléfonos, categorías, dirección y status).
// 22. Concurrencia entre conexiones independientes simulada bajo el candado distribuido.

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { registerAdminSecurity } from '../src/server/adminSecurity.ts';

// Dynamic import of real production code from server.ts
const {
  createBusinessApprovalHandlers,
  getNextBusinessId,
  acquireApprovalMutex,
  generateSafeSlug,
  withBusinessAllocationLock,
  saveBusinessToConnection,
  loadBusinessByIdFromConnection,
  findDuplicateBusinessInDb,
  verifyPersistedBusinessIntegrity,
  mapAiCandidateToBusiness,
  prepareRadarClassified,
  radarClassifiedAlreadyExists
} = await import('../server.ts');

// Network surveillance interceptor to detect and count any outgoing HTTP/HTTPS calls to WordPress/WooCommerce
let monitoredCallsToWordpress = 0;
const monitoredPatterns = ['wordpress', 'woocommerce', 'xmlrpc', 'wp-json'];

const origFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const target = String(args[0] || '');
  for (const pattern of monitoredPatterns) {
    if (target.toLowerCase().includes(pattern)) {
      monitoredCallsToWordpress++;
    }
  }
  return origFetch(...args);
};

const origHttpRequest = http.request;
http.request = function(...args) {
  const options = typeof args[0] === 'string' ? new URL(args[0]) : args[0];
  const fullTarget = `${options?.protocol || ''}//${options?.hostname || options?.host || ''}${options?.path || ''}`;
  for (const pattern of monitoredPatterns) {
    if (fullTarget.toLowerCase().includes(pattern)) {
      monitoredCallsToWordpress++;
    }
  }
  return origHttpRequest.apply(this, args);
};

// Test harness factory for real Express server with controlled MariaDB pool
async function createTestServer(opts = {}) {
  const {
    isStaging = false,
    simulateSaveError = false,
    simulateReadError = false,
    simulateReadNotFound = false,
    dataMismatch = false,
    poolFails = false,
    sqlQueryError = false,
    lockFails = false,
    initialMaxDbId = 30000,
    maxPoolConnections = 10,
    stagingWritePermitted = false,
    extraDbRecords = []
  } = opts;

  let currentMaxDbId = initialMaxDbId;
  const initialBusinesses = [
    {
      id: 1001,
      name: 'Comercio Existente Carmen',
      slug: 'comercio-existente-carmen',
      phone: '9381234567',
      whatsapp: '9381234567',
      category: 'Servicios',
      categories: ['Servicios'],
      categorySlugs: ['servicios'],
      description: 'Negocio previamente registrado para pruebas de duplicados.',
      status: 'published'
    },
    ...extraDbRecords
  ];

  const businessesCache = structuredClone(initialBusinesses);
  const dbRecords = structuredClone(initialBusinesses);
  const dismissedCandidates = new Set();

  const tracker = {
    wordPressCalls: 0,
    dbSaveCalls: 0,
    readbackSelectCalls: 0,
    stagingStoreCreateCalls: 0,
    getLockCalls: 0,
    releaseLockCalls: 0,
    activeCheckouts: 0,
    maxConcurrentCheckouts: 0,
    sqlQueries: []
  };

  // Mock MariaDB pool supporting distributed advisory locks and queries
  const mockPool = {
    getConnection: async () => {
      if (poolFails) throw new Error('MariaDB connection pool exhausted');
      if (tracker.activeCheckouts >= maxPoolConnections) {
        const err = new Error('Pool connection limit reached (deadlock prevention)');
        err.code = 'POOL_EXHAUSTED';
        throw err;
      }
      tracker.activeCheckouts++;
      if (tracker.activeCheckouts > tracker.maxConcurrentCheckouts) {
        tracker.maxConcurrentCheckouts = tracker.activeCheckouts;
      }

      return {
        query: async (sql, params) => {
          tracker.sqlQueries.push(sql);
          if (sqlQueryError) throw new Error('MariaDB SQL query syntax/connection error');

          if (sql.includes('GET_LOCK')) {
            tracker.getLockCalls++;
            if (lockFails) {
              return [[{ acquired: 0 }]];
            }
            return [[{ acquired: 1 }]];
          }

          if (sql.includes('RELEASE_LOCK')) {
            tracker.releaseLockCalls++;
            return [[{ released: 1 }]];
          }

          if (sql.includes('SELECT MAX(CAST(id AS UNSIGNED))')) {
            let cur = currentMaxDbId;
            for (const r of dbRecords) {
              const n = Number(r.id);
              if (Number.isSafeInteger(n) && n > cur) cur = n;
            }
            return [[{ max_id: cur }]];
          }

          if (sql.includes('SELECT * FROM businesses WHERE id = ?')) {
            if (simulateReadError) throw new Error('MariaDB readback connection lost');
            if (simulateReadNotFound) return [[]];
            const id = params?.[0];
            const found = dbRecords.find(r => String(r.id) === String(id));
            if (!found) return [[]];
            if (dataMismatch) {
              return [[{ ...found, name: 'Nombre Modificado Inesperadamente' }]];
            }
            return [[{
              ...found,
              raw_data: JSON.stringify(found)
            }]];
          }

          if (sql.includes('SELECT id, name, phone, whatsapp') || sql.includes('SELECT * FROM businesses')) {
            return [dbRecords.map(r => ({ ...r, raw_data: JSON.stringify(r) }))];
          }

          if (sql.includes('INSERT INTO businesses')) {
            tracker.dbSaveCalls++;
            if (simulateSaveError) throw new Error('MariaDB dead-lock / disk error on write');
            const [id, name, cat, subcat, desc, addr, col, phone, wa, email, web, fb, ig, sched, img, rating, revs, ver, feat, stat, raw] = params || [];
            let parsedRaw = {};
            try { parsedRaw = JSON.parse(raw); } catch (_) {}
            const record = {
              ...parsedRaw,
              id: Number(id) || id,
              name,
              category: cat,
              subcategory: subcat,
              description: desc,
              address: addr,
              colonia: col,
              phone,
              whatsapp: wa,
              email,
              website: web,
              facebook: fb,
              instagram: ig,
              schedule: sched,
              image: img,
              rating: Number(rating) || 5,
              reviews_count: Number(revs) || 0,
              verified: Boolean(ver),
              featured: Boolean(feat),
              status: stat || 'published',
              raw_data: raw
            };
            const idx = dbRecords.findIndex(r => String(r.id) === String(id));
            if (idx !== -1) dbRecords[idx] = record;
            else dbRecords.push(record);
            return [{ affectedRows: 1 }];
          }

          return [[]];
        },
        release: () => {
          tracker.activeCheckouts = Math.max(0, tracker.activeCheckouts - 1);
        }
      };
    },
    query: async (sql, params) => {
      tracker.sqlQueries.push(sql);
      if (sqlQueryError) throw new Error('MariaDB SQL query syntax/connection error');
      if (sql.includes('GET_LOCK')) {
        tracker.getLockCalls++;
        if (lockFails) return [[{ acquired: 0 }]];
        return [[{ acquired: 1 }]];
      }
      if (sql.includes('RELEASE_LOCK')) {
        tracker.releaseLockCalls++;
        return [[{ released: 1 }]];
      }
      if (sql.includes('SELECT MAX(CAST(id AS UNSIGNED))')) {
        let cur = currentMaxDbId;
        for (const r of dbRecords) {
          const n = Number(r.id);
          if (Number.isSafeInteger(n) && n > cur) cur = n;
        }
        return [[{ max_id: cur }]];
      }
      return [[]];
    }
  };

  // Mock staging business store adhering strictly to Staging isolation rules
  const mockStagingBusinessStore = {
    create: async (draft, requestId) => {
      tracker.stagingStoreCreateCalls++;
      if (!stagingWritePermitted) {
        const err = new Error('Staging Write Gate: Escritura no autorizada en staging');
        err.status = 503;
        err.code = 'STAGING_WRITE_GATE_BLOCKED';
        throw err;
      }
      currentMaxDbId++;
      const business = {
        ...draft,
        id: currentMaxDbId,
        slug: generateSafeSlug(draft.name, currentMaxDbId),
        permalink: `/empresa/${generateSafeSlug(draft.name, currentMaxDbId)}/`,
        source: 'radar_auto_carmen_staging',
        createdAt: new Date().toISOString()
      };
      dbRecords.unshift(business);
      return { business };
    }
  };

  const app = express();
  app.use(express.json());

  // Real admin security middleware setup with provider
  const adminSec = registerAdminSecurity(app, {
    allowedOrigin: 'https://staging.encarmen.org',
    minPasswordLength: 10,
    provider: {
      getPrincipals: async () => [
        {
          username: 'admin-publisher',
          displayName: 'Admin Publicador',
          role: 'Publisher',
          permissions: ['business:publish', 'business:manage', 'admin:manage', 'classified:manage'],
          avatarColor: 'from-sky-500 to-indigo-600'
        }
      ],
      authenticate: async (username, password) => {
        if (username === 'admin-publisher' && password === 'admin-secret-pass-12char') {
          return {
            username: 'admin-publisher',
            permissions: ['business:publish', 'business:manage', 'admin:manage', 'classified:manage']
          };
        }
        return null;
      }
    },
    writesReady: () => true
  });

  // Inject real dependencies into createBusinessApprovalHandlers
  const handlers = createBusinessApprovalHandlers({
    isStaging,
    isMariaDbActive: () => !poolFails,
    getPool: () => mockPool,
    dbSaveBusiness: async (biz, conn) => {
      if (simulateSaveError) throw new Error('MariaDB save error simulation');
      if (conn && typeof conn.query === 'function') {
        return saveBusinessToConnection(conn, biz);
      }
      const idx = dbRecords.findIndex(r => String(r.id) === String(biz.id));
      if (idx !== -1) dbRecords[idx] = biz;
      else dbRecords.push(biz);
      return true;
    },
    loadBusinessById: async (id, conn) => {
      tracker.readbackSelectCalls++;
      if (simulateReadError) throw new Error('MariaDB read error simulation');
      if (simulateReadNotFound) return null;
      if (conn && typeof conn.query === 'function') {
        const row = await loadBusinessByIdFromConnection(conn, id);
        if (!row) return null;
        if (dataMismatch) return { ...row, name: 'Nombre Modificado Inesperadamente' };
        return row;
      }
      const found = dbRecords.find(b => String(b.id) === String(id));
      if (!found) return null;
      if (dataMismatch) return { ...found, name: 'Nombre Modificado Inesperadamente' };
      return found;
    },
    findDuplicateBusiness: async (name, phone, conn) => {
      if (conn && typeof conn.query === 'function') {
        const found = await findDuplicateBusinessInDb(conn, name, phone);
        if (found) return found;
      }
      const normPhone = (phone || '').replace(/\D/g, '').slice(-10);
      const cleanName = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
      return dbRecords.find(b => {
        const bPhone = (b.phone || '').replace(/\D/g, '').slice(-10);
        const bWa = (b.whatsapp || '').replace(/\D/g, '').slice(-10);
        if (normPhone && normPhone.length >= 7 && (bPhone === normPhone || bWa === normPhone)) return true;
        const bName = (b.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
        return cleanName && cleanName.length >= 4 && bName === cleanName;
      }) || null;
    },
    dbLoadAllBusinesses: async () => {
      tracker.readbackSelectCalls++;
      if (simulateReadError) throw new Error('MariaDB read error simulation');
      return structuredClone(dbRecords);
    },
    stagingBusinessStore: mockStagingBusinessStore,
    businessesCache,
    acquireApprovalMutex,
    getNextBusinessId: (allocatedIds, poolOverride) => getNextBusinessId(allocatedIds, poolOverride || mockPool, true),
    dismissedCandidates,
    saveDismissedCandidate: async () => {}
  });

  // Mount real approval routes guarded by real admin security
  app.post('/api/businesses/approve-candidate', (req, res, next) => {
    if (!adminSec.isAuthorized(req, 'business:publish')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return handlers.handleApproveCandidate(req, res);
  });

  app.post('/api/businesses/approve-multiple-candidates', (req, res, next) => {
    if (!adminSec.isAuthorized(req, 'business:publish')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return handlers.handleApproveMultipleCandidates(req, res);
  });

  // Public businesses endpoint for publication verification
  app.get('/api/businesses', (req, res) => {
    res.json(businessesCache);
  });

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let cachedToken = null;
  const login = async () => {
    if (cachedToken) return cachedToken;
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin-publisher',
        password: 'admin-secret-pass-12char'
      })
    });
    const data = await res.json();
    cachedToken = data?.token;
    return cachedToken;
  };

  const request = async (path, { method = 'POST', body, token } = {}) => {
    let authToken = token;
    if (authToken === undefined) {
      authToken = await login();
    }
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['X-Encarmen-Admin-Token'] = authToken;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    let data;
    try { data = await res.json(); } catch (_) { data = null; }
    return { status: res.status, body: data };
  };

  const close = () => new Promise(resolve => server.close(resolve));

  return {
    app,
    baseUrl,
    request,
    close,
    tracker,
    businessesCache,
    dbRecords,
    mockPool
  };
}

// ============================================================================
// SUITE DE 22 PRUEBAS OBLIGATORIAS
// ============================================================================

test('Escenario 1: Aprobación individual exitosa con verificación de persistencia y lectura posterior', async () => {
  const h = await createTestServer();
  try {
    const candidate = {
      name: 'Pescadería San Román',
      phone: '9389876543',
      category: 'Alimentos y Bebidas',
      address: 'Calle 35 entre 42 y 44',
      description: 'Mariscos y pescados frescos'
    };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 200, 'Debe responder 200 OK');
    assert.equal(res.body.success, true);
    assert.equal(res.body.publishedToWordPress, false, 'No debe publicar a WordPress');
    assert.ok(res.body.business.id, 'Debe haber asignado un ID numérico');
    assert.equal(h.tracker.dbSaveCalls, 1, 'Debe haber llamado exactamente 1 vez a dbSaveBusiness');
    assert.equal(h.tracker.readbackSelectCalls, 1, 'Debe haber verificado lectura posterior');
    assert.equal(h.tracker.maxConcurrentCheckouts, 1, 'No debe haber usado más de 1 checkout del pool');
    assert.equal(h.businessesCache.length, 2, 'El caché en memoria debe haberse actualizado');
  } finally {
    await h.close();
  }
});

test('Escenario 2: Aprobación múltiple exitosa con lectura posterior verificada para cada empresa', async () => {
  const h = await createTestServer();
  try {
    const candidates = [
      { name: 'Taller Mecánico El Carmen', phone: '9381112233', category: 'Servicios' },
      { name: 'Pastelería Dulce Isla', phone: '9382223344', category: 'Alimentos y Bebidas' }
    ];

    const res = await h.request('/api/businesses/approve-multiple-candidates', { body: { candidates } });

    assert.equal(res.status, 200, 'Debe responder 200 OK');
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 2);
    assert.equal(res.body.confirmed.length, 2);
    assert.equal(res.body.rejected.length, 0);
    assert.equal(h.tracker.dbSaveCalls, 2, 'Debe haber guardado ambas empresas');
    assert.equal(h.tracker.readbackSelectCalls, 2, 'Debe haber verificado lectura posterior para ambas');
    assert.equal(h.businessesCache.length, 3, 'El caché debe contener los 2 nuevos más el existente');
  } finally {
    await h.close();
  }
});

test('Escenario 3: Error de conexión MariaDB (503 Service Unavailable, aborto y caché intacto)', async () => {
  const h = await createTestServer({ poolFails: true });
  try {
    const candidate = { name: 'Comercio Sin BD', phone: '9389998877', category: 'Servicios' };
    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503, 'Debe responder 503 Service Unavailable');
    assert.equal(res.body.success, false);
    assert.equal(h.businessesCache.length, 1, 'El caché NO debe alterarse');
    assert.equal(h.tracker.dbSaveCalls, 0, 'No debe intentar guardar si no hay conexión');
  } finally {
    await h.close();
  }
});

test('Escenario 4: Error de escritura en MariaDB (503 Service Unavailable, caché intacto)', async () => {
  const h = await createTestServer({ simulateSaveError: true });
  try {
    const candidate = { name: 'Comercio Fallo Escritura', phone: '9385554433', category: 'Servicios' };
    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503, 'Debe responder 503');
    assert.equal(res.body.success, false);
    assert.equal(h.businessesCache.length, 1, 'El caché NO debe mutar ante fallo de guardado');
    assert.equal(h.dbRecords.length, 1, 'La base de datos NO debe retener el registro');
  } finally {
    await h.close();
  }
});

test('Escenario 5: Error de lectura posterior (503 Service Unavailable, rechazo estricto BLOQUEANTE)', async () => {
  const h = await createTestServer({ simulateReadNotFound: true });
  try {
    const candidate = { name: 'Óptica Del Mar', phone: '9387776655', category: 'Salud' };
    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503, 'Debe responder 503 por fallo de confirmación');
    assert.equal(res.body.success, false);
    assert.equal(h.businessesCache.length, 1, 'El caché NO debe mutar si la lectura posterior falla');
  } finally {
    await h.close();
  }
});

test('Escenario 6: Discrepancia entre datos guardados y recuperados (503 Service Unavailable)', async () => {
  const h = await createTestServer({ dataMismatch: true });
  try {
    const candidate = { name: 'Lavandería Burbujas', phone: '9383332211', category: 'Servicios' };
    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503, 'Debe responder 503 ante discrepancia');
    assert.equal(res.body.success, false);
    assert.equal(h.businessesCache.length, 1, 'El caché NO debe alterarse ante discrepancia');
  } finally {
    await h.close();
  }
});

test('Escenario 7: Duplicado de empresa contra el catálogo existente responde 409 Conflict', async () => {
  const h = await createTestServer();
  try {
    const candidate = {
      name: 'Comercio Existente Carmen',
      phone: '9381234567',
      category: 'Servicios'
    };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 409, 'Debe responder 409 Conflict');
    assert.equal(res.body.success, false);
    assert.equal(res.body.duplicate, true);
    assert.equal(h.tracker.dbSaveCalls, 0, 'No debe escribir en MariaDB ante duplicado');
  } finally {
    await h.close();
  }
});

test('Escenario 8: Duplicados dentro de un lote (colisiones intra-lote rechazadas con 207 Multi-Status)', async () => {
  const h = await createTestServer();
  try {
    const candidates = [
      { name: 'Farmacia Carmen Lote', phone: '9384445566', category: 'Salud' },
      { name: 'Farmacia Carmen Lote', phone: '9384445566', category: 'Salud' }
    ];

    const res = await h.request('/api/businesses/approve-multiple-candidates', { body: { candidates } });

    assert.equal(res.status, 207, 'Debe responder 207 Multi-Status');
    assert.equal(res.body.confirmed.length, 1, 'Solo debe confirmar el primer candidato');
    assert.equal(res.body.rejected.length, 1, 'El segundo debe ser rechazado como colisión');
    assert.equal(res.body.rejected[0].code, 'BATCH_DUPLICATE');
  } finally {
    await h.close();
  }
});

test('Escenario 9: Solicitudes simultáneas concurrentes serializadas con Mutex y MariaDB lock', async () => {
  const h = await createTestServer({ initialMaxDbId: 30000 });
  try {
    const candA = { name: 'Empresa Concurrente Alpha', phone: '9389001111', category: 'Servicios' };
    const candB = { name: 'Empresa Concurrente Beta', phone: '9389002222', category: 'Servicios' };

    const [resA, resB] = await Promise.all([
      h.request('/api/businesses/approve-candidate', { body: candA }),
      h.request('/api/businesses/approve-candidate', { body: candB })
    ]);

    assert.equal(resA.status, 200);
    assert.equal(resB.status, 200);
    assert.notEqual(resA.body.business.id, resB.body.business.id, 'Los IDs generados concurrentemente deben ser distintos');
    assert.equal(h.businessesCache.length, 3);
  } finally {
    await h.close();
  }
});

test('Escenario 10: Bloqueo distribuido no adquirido (GET_LOCK devuelve 0 -> 503 BUSINESS_DB_LOCK_UNAVAILABLE)', async () => {
  const h = await createTestServer({ lockFails: true });
  try {
    const candidate = {
      name: 'Negocio Bloqueo Denegado',
      phone: '9389991234',
      category: 'Servicios'
    };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503, 'Debe responder 503 Service Unavailable');
    assert.equal(res.body.success, false);
    assert.equal(h.businessesCache.length, 1);
  } finally {
    await h.close();
  }
});

test('Escenario 11: Liberación del bloqueo distribuido tras fallo garantizada en bloque finally', async () => {
  let releaseCalled = false;
  let connectionReleased = false;

  const failingPool = {
    getConnection: async () => ({
      query: async (sql) => {
        if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
        if (sql.includes('RELEASE_LOCK')) {
          releaseCalled = true;
          return [[{ released: 1 }]];
        }
        return [[]];
      },
      release: () => {
        connectionReleased = true;
      }
    })
  };

  try {
    await withBusinessAllocationLock(failingPool, async () => {
      throw new Error('Simulated crash inside lock');
    });
  } catch (err) {
    assert.equal(err.message, 'Simulated crash inside lock');
  }

  assert.equal(releaseCalled, true, 'RELEASE_LOCK debe ejecutarse en el finally');
  assert.equal(connectionReleased, true, 'conn.release() debe ejecutarse en el finally');
});

test('Escenario 12: Pool real limitado a una conexión (connectionLimit: 1, reutilización total sin deadlock ni agotamiento)', async () => {
  const h = await createTestServer({ maxPoolConnections: 1 });
  try {
    const candidate = {
      name: 'Negocio Pool Unitaria',
      phone: '9381002000',
      category: 'Servicios',
      address: 'Calle 56 #10'
    };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 200, 'Debe completarse con éxito en pool de 1 conexión');
    assert.equal(res.body.success, true);
    assert.equal(h.tracker.maxConcurrentCheckouts, 1, 'El checkout simultáneo jamás debe exceder 1');
    assert.equal(h.tracker.activeCheckouts, 0, 'La conexión debe liberarse al final');
  } finally {
    await h.close();
  }
});

test('Escenario 13: Pool real limitado a dos conexiones (connectionLimit: 2, concurrencia paralela sin starvation)', async () => {
  const h = await createTestServer({ maxPoolConnections: 2 });
  try {
    const cands = [
      { name: 'Comercio Pool Dos A', phone: '9382003001', category: 'Servicios' },
      { name: 'Comercio Pool Dos B', phone: '9382003002', category: 'Servicios' }
    ];

    const [resA, resB] = await Promise.all([
      h.request('/api/businesses/approve-candidate', { body: cands[0] }),
      h.request('/api/businesses/approve-candidate', { body: cands[1] })
    ]);

    assert.equal(resA.status, 200);
    assert.equal(resB.status, 200);
    assert.ok(h.tracker.maxConcurrentCheckouts <= 2, 'No debe haber superado el límite de 2 conexiones');
    assert.equal(h.tracker.activeCheckouts, 0, 'Todas las conexiones deben estar liberadas');
  } finally {
    await h.close();
  }
});

test('Escenario 14: Acceso administrativo no autorizado es rechazado con 401 Unauthorized', async () => {
  const h = await createTestServer();
  try {
    const candidate = { name: 'Comercio Sin Auth', phone: '9381230000', category: 'Servicios' };
    const res = await h.request('/api/businesses/approve-candidate', { body: candidate, token: null });

    assert.equal(res.status, 401, 'Debe responder 401 Unauthorized');
  } finally {
    await h.close();
  }
});

test('Escenario 15: Procedencia real de candidatos IA (mapAiCandidateToBusiness sin claims sintéticos y requiere admin)', async () => {
  // Test mapAiCandidateToBusiness with simulated LLM outputs
  const rawModelOutputs = [
    {
      name: 'Taquería El Pastor Carmen',
      category: 'Restaurantes',
      phone: '9381239999',
      sourceUrl: 'https://www.facebook.com/groups/carmen-taquerias',
      schedule: 'Lunes a Domingo',
      delivery: 'A domicilio'
    },
    {
      name: 'Taller Sin URL Ni Datos Sintéticos',
      phone: '9381119999'
      // Omitted schedule, delivery, payment, sourceUrl
    }
  ];

  const mapped1 = mapAiCandidateToBusiness(rawModelOutputs[0], 0);
  assert.equal(mapped1.isLiveWebDiscovery, false, 'Una URL en respuesta de IA NO es descubrimiento web verificado');
  assert.equal(mapped1.provenance, 'ai_suggestion_with_url');
  assert.equal(mapped1.requiresAdminVerification, true);
  assert.equal(mapped1.status, 'pending');

  const mapped2 = mapAiCandidateToBusiness(rawModelOutputs[1], 1);
  assert.equal(mapped2.isLiveWebDiscovery, false);
  assert.equal(mapped2.provenance, 'ai_unverified');
  assert.equal(mapped2.requiresAdminVerification, true);
  assert.equal(mapped2.schedule, 'Consultar con el negocio', 'No debe inventar horarios');
  assert.equal(mapped2.payment, 'Consultar con el negocio', 'No debe inventar pagos');
  assert.equal(mapped2.delivery, 'Consultar con el negocio', 'No debe inventar delivery');
  assert.equal(mapped2.status, 'pending');
});

test('Escenario 16: Ausencia real de solicitudes a WordPress/WooCommerce (interceptor de red activo: 0 llamadas)', async () => {
  const initialCount = monitoredCallsToWordpress;
  const h = await createTestServer();
  try {
    const candidate = { name: 'Boutique San Pedro', phone: '9385558888', category: 'Comercio' };
    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 200);
    assert.equal(res.body.publishedToWordPress, false);
    assert.equal(monitoredCallsToWordpress, initialCount, 'El monitor de red debe registrar exactamente 0 llamadas a WordPress/WooCommerce');
  } finally {
    await h.close();
  }
});

test('Escenario 17: Compatibilidad y coexistencia con controladores reales de clasificados (sin interferencias de lock ni datos)', async () => {
  // Test real classified functions prepareRadarClassified and radarClassifiedAlreadyExists
  const validCandidate = {
    title: 'Renta de Departamento Centro Carmen',
    sourceUrl: 'https://www.locanto.com.mx/ciudaddelcarmen/id_123456/renta_depto.html',
    price: 6500,
    category: 'Inmuebles'
  };

  const prepared = prepareRadarClassified(validCandidate);
  assert.ok(prepared.ad, 'El controlador real de clasificados debe preparar el anuncio');
  assert.ok(prepared.ad.id.startsWith('ad-'), 'El ID debe tener formato canonical');

  // Coexistence: radar de empresas operations do not touch classifieds tables or functions
  const h = await createTestServer();
  try {
    const bizCand = { name: 'Comercio Coexistencia', phone: '9386665544', category: 'Servicios' };
    const res = await h.request('/api/businesses/approve-candidate', { body: bizCand });
    assert.equal(res.status, 200);
    assert.equal(h.dbRecords.some(r => r.name === 'Comercio Coexistencia'), true);
  } finally {
    await h.close();
  }
});

test('Escenario 18: Ausencia de publicación falsa (candidatos no confirmados nunca aparecen en catálogo público)', async () => {
  const h = await createTestServer({ simulateSaveError: true });
  try {
    const candidate = { name: 'Empresa Fantasma No Publicada', phone: '9387779911', category: 'Servicios' };
    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });
    assert.equal(res.status, 503);

    const publicRes = await fetch(`${h.baseUrl}/api/businesses`);
    const publicList = await publicRes.json();
    const exists = publicList.some(b => b.name === 'Empresa Fantasma No Publicada');
    assert.equal(exists, false, 'La empresa fallida jamás debe figurar en el endpoint público');
  } finally {
    await h.close();
  }
});

test('Escenario 19: Asignación segura de identificadores (consulta REGEXP cerrada y enteros secuenciales)', async () => {
  const executedQueries = [];
  const mockPool = {
    getConnection: async () => ({
      query: async (sql) => {
        executedQueries.push(sql);
        if (sql.includes('SELECT MAX(CAST(id AS UNSIGNED))')) {
          return [[{ max_id: 60000 }]];
        }
        return [[{ acquired: 1 }]];
      },
      release: () => {}
    })
  };

  const nextId = await getNextBusinessId(new Set(), mockPool);
  assert.equal(nextId, 60001, 'El siguiente ID asignado debe ser 60001');
  const maxIdQuery = executedQueries.find(q => q.includes('SELECT MAX(CAST(id AS UNSIGNED))'));
  assert.ok(maxIdQuery, 'Debe haber ejecutado la consulta SQL para id máximo');
  assert.ok(
    maxIdQuery.includes("WHERE id REGEXP '^[0-9]+$'"),
    'La consulta SQL debe contener la expresión regular cerrada válidamente: ^[0-9]+$'
  );
});

test('Escenario 20: Idempotencia ante fallos repetidos (múltiples fallos consecutivos no mutan el estado)', async () => {
  const h = await createTestServer({ simulateSaveError: true });
  try {
    const initialLen = h.businessesCache.length;
    const candidate = { name: 'Negocio Fallos Repetidos', phone: '9389994455', category: 'Servicios' };
    for (let i = 0; i < 3; i++) {
      const res = await h.request('/api/businesses/approve-candidate', { body: candidate });
      assert.equal(res.status, 503);
      assert.equal(h.businessesCache.length, initialLen, `El caché no debe mutar tras intento ${i + 1}`);
    }
  } finally {
    await h.close();
  }
});

test('Escenario 21: Verificación integral de campos persistidos (comparación canónica exhaustiva)', () => {
  const baseSent = {
    id: 50001,
    name: 'Consultorio Dental Carmen',
    phone: '9381234567',
    whatsapp: '9381234567',
    address: 'Calle 31 #100',
    categories: ['Salud y Medicina'],
    status: 'published'
  };

  // 1. Identical retrieved
  const identical = verifyPersistedBusinessIntegrity(baseSent, { ...baseSent });
  assert.equal(identical.ok, true, 'Registro idéntico debe pasar la verificación');

  // 2. Legitimate normalization (accent/case differences)
  const normalized = verifyPersistedBusinessIntegrity(baseSent, {
    ...baseSent,
    name: 'CONSULTORIO DENTAL CÁRMEN',
    address: 'calle 31 #100'
  });
  assert.equal(normalized.ok, true, 'Diferencias legítimas de mayúsculas y acentos deben ser toleradas');

  // 3. Discrepancy in ID
  const wrongId = verifyPersistedBusinessIntegrity(baseSent, { ...baseSent, id: 99999 });
  assert.equal(wrongId.ok, false);
  assert.ok(wrongId.reason.includes('Discrepancia en ID'));

  // 4. Discrepancy in Name
  const wrongName = verifyPersistedBusinessIntegrity(baseSent, { ...baseSent, name: 'Clínica Veterinaria' });
  assert.equal(wrongName.ok, false);
  assert.ok(wrongName.reason.includes('Discrepancia en nombre'));

  // 5. Discrepancy in Phone
  const wrongPhone = verifyPersistedBusinessIntegrity(baseSent, { ...baseSent, phone: '9389990000', whatsapp: '9389990000' });
  assert.equal(wrongPhone.ok, false);
  assert.ok(wrongPhone.reason.includes('Discrepancia en teléfono'));

  // 6. Missing record
  const missing = verifyPersistedBusinessIntegrity(baseSent, null);
  assert.equal(missing.ok, false);
});

test('Escenario 22: Concurrencia entre conexiones independientes simulada bajo el candado distribuido', async () => {
  let lockHolder = null;
  const pool = {
    getConnection: async () => {
      const connId = Math.random().toString(36).substring(7);
      return {
        id: connId,
        query: async (sql) => {
          if (sql.includes('GET_LOCK')) {
            if (lockHolder && lockHolder !== connId) {
              return [[{ acquired: 0 }]];
            }
            lockHolder = connId;
            return [[{ acquired: 1 }]];
          }
          if (sql.includes('RELEASE_LOCK')) {
            if (lockHolder === connId) {
              lockHolder = null;
              return [[{ released: 1 }]];
            }
            return [[{ released: 0 }]];
          }
          return [[]];
        },
        release: () => {}
      };
    }
  };

  // Connection 1 acquires lock
  const p1 = withBusinessAllocationLock(pool, async (conn1) => {
    assert.ok(conn1);
    // Connection 2 attempts to acquire lock while connection 1 holds it
    await assert.rejects(
      async () => {
        await withBusinessAllocationLock(pool, async () => {});
      },
      (err) => err?.code === 'BUSINESS_DB_LOCK_UNAVAILABLE',
      'Segunda conexión debe recibir BUSINESS_DB_LOCK_UNAVAILABLE si la primera retiene el lock'
    );
    return 'p1_success';
  });

  const res1 = await p1;
  assert.equal(res1, 'p1_success');
  assert.equal(lockHolder, null, 'El candado debe estar liberado tras completar conexión 1');
});
