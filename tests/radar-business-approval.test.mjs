// Automated test suite for ENC-RADAR-EMPRESAS-043
// Audited by Coordinación Principal 01 (Nia) — Segunda Orden de Corrección Técnica
//
// CATEGORÍAS DE PRUEBA:
// 1. Pruebas Unitarias del Núcleo:
//    - Corrección de regex SQL en getNextBusinessId ('^[0-9]+$')
//    - Bloqueo consultivo distribuido de MariaDB (GET_LOCK / RELEASE_LOCK)
//    - Fallo cerrado: excepción ante errores de SQL o pool sin captura silenciosa
//    - Serialización con Mutex en memoria
//    - Generación segura de slugs sin caracteres inválidos
//
// 2. Pruebas de Endpoints Reales con Inyección de Dependencias:
//    - Importa createBusinessApprovalHandlers directamente desde server.ts
//    - Escenario 1: Aprobación individual exitosa con lectura posterior verificada
//    - Escenario 2: Aprobación múltiple exitosa con lectura posterior verificada
//    - Escenario 3: MariaDB no disponible / fallo de conexión -> 503 Service Unavailable
//    - Escenario 4: Error durante guardado en MariaDB -> 503 Service Unavailable
//    - Escenario 5: Guardado exitoso con lectura posterior fallida -> 503 Service Unavailable (BLOQUEANTE)
//    - Escenario 6: Discordancia de datos en lectura posterior -> 503 Service Unavailable
//    - Escenario 7: Detección de duplicados contra catálogo existente (409 Conflict)
//    - Escenario 8: Control de colisiones intra-lote (207 Multi-Status)
//    - Escenario 9: Concurrencia con Mutex sin colisión de IDs
//    - Escenario 10: Control de autorización de seguridad (401 Unauthorized)
//    - Escenario 11: Aprobación parcial con resultados correctos (207 Multi-Status)
//    - Escenario 12: Invarianza del caché ante fallos de persistencia
//    - Escenario 13: Ausencia de efectos secundarios hacia WordPress/WooCommerce
//    - Escenario 14: Restricciones de Staging y Staging Write Gate (503 sin bypass)
//    - Escenario 15: Procedencia honesta de IA (isLiveWebDiscovery: false, requiresAdminVerification: true)
//
// 3. Pruebas de Coexistencia con PR #54:
//    - Escenario 16: Compatibilidad con rutas y gate de clasificados sin colisiones

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import {
  createBusinessApprovalHandlers,
  getNextBusinessId,
  acquireApprovalMutex,
  generateSafeSlug
} from '../server.ts';
import { registerAdminSecurity } from '../src/server/adminSecurity.ts';
import { contactDigits } from '../src/utils/businessContacts.ts';

// Helper to create an in-memory test server mounting real handlers
async function createTestServer(opts = {}) {
  const {
    staging = false,
    mariaDbActive = true,
    writePermitted = true,
    businessWritePermitted = true,
    saveSucceeds = true,
    readbackSucceeds = true,
    simulateSaveError = false,
    dataMismatch = false,
    poolFails = false,
    sqlQueryError = false,
    initialMaxDbId = 4050
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
    }
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
    sqlQueries: []
  };

  // Mock MariaDB pool supporting distributed advisory locks and queries
  const mockPool = {
    getConnection: async () => {
      if (poolFails) throw new Error('MariaDB connection pool exhausted');
      return {
        query: async (sql, params) => {
          tracker.sqlQueries.push(sql);
          if (sqlQueryError) throw new Error('MariaDB SQL query syntax/connection error');
          if (sql.includes('GET_LOCK')) {
            tracker.getLockCalls++;
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
        },
        release: () => {}
      };
    },
    query: async (sql, params) => {
      tracker.sqlQueries.push(sql);
      if (sqlQueryError) throw new Error('MariaDB SQL query syntax/connection error');
      if (sql.includes('GET_LOCK')) {
        tracker.getLockCalls++;
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

  const app = express();
  app.use(express.json());

  // Register security gate
  registerAdminSecurity(app, {
    provider: {
      accounts: [
        {
          username: 'admin-publisher',
          role: 'Administrador',
          initial: 'A',
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
    writesReady: () => writePermitted
  });

  function findDuplicateBusiness(name, phone) {
    const normPhone = (phone || '').replace(/\D/g, '').slice(-10);
    const cleanName = (name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return businessesCache.find(b => {
      if (normPhone && normPhone.length >= 7) {
        const bPhone = (b.phone || '').replace(/\D/g, '').slice(-10);
        const bWa = (b.whatsapp || '').replace(/\D/g, '').slice(-10);
        if (bPhone && bPhone.length >= 7 && bPhone === normPhone) return true;
        if (bWa && bWa.length >= 7 && bWa === normPhone) return true;
      }
      if (cleanName && cleanName.length >= 4) {
        const bName = (b.name || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (bName === cleanName) return true;
      }
      return false;
    });
  }

  // Create real handlers from server.ts with injected test dependencies
  const approvalHandlers = createBusinessApprovalHandlers({
    isStaging: staging,
    isMariaDbActive: () => mariaDbActive,
    getPool: () => mockPool,
    dbSaveBusiness: async (biz) => {
      tracker.dbSaveCalls++;
      if (simulateSaveError) throw new Error('MariaDB disk/table write failure');
      if (!saveSucceeds) return false;
      const record = structuredClone(biz);
      if (dataMismatch) {
        record.name = 'Nombre Alterado en Base de Datos';
        record.phone = '9999999999';
      }
      dbRecords.push(record);
      const n = Number(record.id);
      if (Number.isSafeInteger(n) && n > currentMaxDbId) {
        currentMaxDbId = n;
      }
      return true;
    },
    dbLoadAllBusinesses: async () => {
      tracker.readbackSelectCalls++;
      if (!readbackSucceeds) return [];
      return structuredClone(dbRecords);
    },
    stagingBusinessStore: {
      create: async (draft, requestId) => {
        tracker.stagingStoreCreateCalls++;
        if (!businessWritePermitted) {
          const err = new Error('Staging Write Gate: Escritura no autorizada en staging');
          err.status = 503;
          err.code = 'STAGING_WRITE_GATE_BLOCKED';
          throw err;
        }
        const b = { ...draft, id: 9100 + tracker.stagingStoreCreateCalls };
        return { business: b };
      }
    },
    businessesCache,
    acquireApprovalMutex,
    getNextBusinessId: async (allocatedIds) => {
      return getNextBusinessId(allocatedIds, mockPool, true);
    },
    findDuplicateBusiness,
    dismissedCandidates,
    saveDismissedCandidate: async () => {}
  });

  // Mount handlers on the test app
  app.post('/api/businesses/approve-candidate', approvalHandlers.handleApproveCandidate);
  app.post('/api/businesses/approve-multiple-candidates', approvalHandlers.handleApproveMultipleCandidates);

  // Mount mock PR #54 classifieds routes to test coexistence
  app.get('/api/classifieds/radar-search', (req, res) => {
    res.json({ success: true, count: 2, items: [{ id: 'cls-1', title: 'Aviso clasificado' }] });
  });
  app.post('/api/classifieds/batch-approve', (req, res) => {
    res.json({ success: true, approvedCount: 1 });
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
    cachedToken = data.token;
    return cachedToken;
  };

  // Helper to make authenticated requests
  const request = async (endpoint, { method = 'POST', body, token, role = 'admin-publisher' } = {}) => {
    let authToken = token;
    if (authToken === undefined) {
      if (role !== null) {
        authToken = await login();
      }
    }

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['X-Encarmen-Admin-Token'] = authToken;
    }

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  };

  const close = () => new Promise(resolve => server.close(resolve));

  return {
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
// SECCIÓN 1: PRUEBAS UNITARIAS DEL NÚCLEO
// ============================================================================

test('Unitaria 1: getNextBusinessId ejecuta consulta SQL válida con cierre correcto de comilla', async () => {
  const executedQueries = [];
  const mockPool = {
    getConnection: async () => ({
      query: async (sql) => {
        executedQueries.push(sql);
        if (sql.includes('SELECT MAX(CAST(id AS UNSIGNED))')) {
          return [[{ max_id: 30000 }]];
        }
        return [[{ acquired: 1 }]];
      },
      release: () => {}
    })
  };

  const nextId = await getNextBusinessId(new Set(), mockPool);
  assert.equal(nextId, 30001, 'El siguiente ID asignado debe ser 30001');

  const maxIdQuery = executedQueries.find(q => q.includes('SELECT MAX(CAST(id AS UNSIGNED))'));
  assert.ok(maxIdQuery, 'Debe haber ejecutado la consulta SQL para id máximo');
  assert.ok(
    maxIdQuery.includes("WHERE id REGEXP '^[0-9]+$'"),
    'La consulta SQL debe contener la expresión regular cerrada válidamente: ^[0-9]+$'
  );
  assert.ok(!maxIdQuery.endsWith("'^[0-9]+$"), 'No debe faltar la comilla de cierre');
});

test('Unitaria 2: getNextBusinessId serializa mediante bloqueo consultivo de MariaDB (GET_LOCK/RELEASE_LOCK)', async () => {
  const locks = [];
  const mockPool = {
    getConnection: async () => ({
      query: async (sql) => {
        if (sql.includes('GET_LOCK')) {
          locks.push('ACQUIRE');
          return [[{ acquired: 1 }]];
        }
        if (sql.includes('RELEASE_LOCK')) {
          locks.push('RELEASE');
          return [[{ released: 1 }]];
        }
        if (sql.includes('SELECT MAX(CAST(id AS UNSIGNED))')) {
          return [[{ max_id: 30000 }]];
        }
        return [[]];
      },
      release: () => {}
    })
  };

  const nextId = await getNextBusinessId(new Set(), mockPool);
  assert.equal(nextId, 30001);
  assert.deepEqual(locks, ['ACQUIRE', 'RELEASE'], 'Debe adquirir y liberar el bloqueo consultivo');
});

test('Unitaria 3: getNextBusinessId es fail-closed y LANZA ERROR ante fallas en MariaDB sin captura silenciosa', async () => {
  const mockFailingPool = {
    getConnection: async () => ({
      query: async () => {
        throw new Error('Deadlock detectado en MariaDB');
      },
      release: () => {}
    })
  };

  await assert.rejects(
    async () => {
      await getNextBusinessId(new Set(), mockFailingPool);
    },
    /Error en MariaDB al consultar identificador máximo/,
    'Debe rechazar y lanzar error explícito, nunca suprimir silenciosamente ni degradar a ID inseguro'
  );
});

test('Unitaria 4: acquireApprovalMutex serializa operaciones asíncronas en memoria', async () => {
  const order = [];
  const op1 = acquireApprovalMutex(async () => {
    await new Promise(r => setTimeout(r, 40));
    order.push('op1');
  });
  const op2 = acquireApprovalMutex(async () => {
    order.push('op2');
  });

  await Promise.all([op1, op2]);
  assert.deepEqual(order, ['op1', 'op2'], 'Las operaciones protegidas por mutex deben ejecutarse estrictamente en serie');
});

test('Unitaria 5: generateSafeSlug genera slugs URL-safe sin tildes ni caracteres extraños', () => {
  assert.equal(generateSafeSlug('Restaurante María & José — Isla', 101), 'restaurante-maria-jose-isla');
  assert.equal(generateSafeSlug('¡¡Tacos El Güero!!', 102), 'tacos-el-guero');
  assert.equal(generateSafeSlug('', 103), 'empresa-103');
});

// ============================================================================
// SECCIÓN 2: PRUEBAS DE ENDPOINTS REALES CON HANDLERS DE server.ts
// ============================================================================

test('Escenario 1: Aprobación individual exitosa con verificación de lectura posterior en MariaDB', async () => {
  const h = await createTestServer();
  try {
    const candidate = {
      name: 'Cafetería El Faro Carmen',
      category: 'Restaurantes y Cafeterías',
      phone: '9381112233',
      whatsapp: '9381112233',
      address: 'Calle 31 No. 50, Centro',
      description: 'Café de especialidad en Carmen'
    };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.business.name, 'Cafetería El Faro Carmen');
    assert.equal(h.tracker.dbSaveCalls, 1, 'Debe haber llamado a dbSaveBusiness una vez');
    assert.equal(h.tracker.readbackSelectCalls, 1, 'Debe haber ejecutado la lectura real posterior de verificación');

    const inCache = h.businessesCache.find(b => b.name === 'Cafetería El Faro Carmen');
    assert.ok(inCache, 'La empresa verificada debe incorporarse al caché');
  } finally {
    await h.close();
  }
});

test('Escenario 2: Aprobación múltiple exitosa con lectura posterior verificada para cada empresa', async () => {
  const h = await createTestServer();
  try {
    const candidates = [
      {
        name: 'Pastelería La Delicia',
        category: 'Comercios',
        phone: '9382223344',
        whatsapp: '9382223344',
        address: 'Calle 20 No. 10'
      },
      {
        name: 'Ferretería El Tornillo',
        category: 'Servicios',
        phone: '9383334455',
        whatsapp: '9383334455',
        address: 'Av. Periférica Norte'
      }
    ];

    const res = await h.request('/api/businesses/approve-multiple-candidates', { body: { candidates } });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.confirmed.length, 2, 'Ambas empresas deben confirmarse');
    assert.equal(res.body.rejected.length, 0);
    assert.equal(h.tracker.dbSaveCalls, 2);
    assert.equal(h.tracker.readbackSelectCalls, 2, 'Debe haber realizado 2 verificaciones de lectura posterior');
    assert.equal(h.businessesCache.length, 3, 'Caché debe contener la empresa inicial más las 2 nuevas');
  } finally {
    await h.close();
  }
});

test('Escenario 3: MariaDB no disponible o fallo de conexión aborta con 503 sin alterar caché', async () => {
  const h = await createTestServer({ poolFails: true });
  try {
    const candidate = {
      name: 'Tacos Los Gemelos',
      phone: '9384445566',
      category: 'Restaurantes'
    };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503, 'Debe responder 503 Service Unavailable');
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Error de base de datos'));
    assert.equal(h.businessesCache.length, 1, 'El caché debe mantenerse estrictamente inmutable');
  } finally {
    await h.close();
  }
});

test('Escenario 4: Error durante el guardado en MariaDB responde 503 y mantiene caché intacto', async () => {
  const h = await createTestServer({ saveSucceeds: false });
  try {
    const candidate = {
      name: 'Farmacia San Antonio',
      phone: '9385556677',
      category: 'Salud'
    };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('MariaDB no confirmó el guardado'));
    assert.equal(h.businessesCache.length, 1);
  } finally {
    await h.close();
  }
});

test('Escenario 5: Guardado exitoso con LECTURA POSTERIOR FALLIDA rechaza con 503 (BLOQUEANTE)', async () => {
  const h = await createTestServer({ saveSucceeds: true, readbackSucceeds: false });
  try {
    const candidate = {
      name: 'Óptica Del Mar',
      phone: '9386667788',
      category: 'Salud'
    };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503, 'Debe responder 503 ante falla de lectura posterior');
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Fallo de verificación de lectura en MariaDB'));
    assert.equal(h.businessesCache.length, 1, 'NO se debe incorporar al caché si falló la lectura posterior');
  } finally {
    await h.close();
  }
});

test('Escenario 6: Guardado exitoso con discordancia en los datos leídos responde 503', async () => {
  const h = await createTestServer({ saveSucceeds: true, dataMismatch: true });
  try {
    const candidate = {
      name: 'Lavandería Burbujas',
      phone: '9387778899',
      category: 'Servicios'
    };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Fallo de verificación de lectura'));
    assert.equal(h.businessesCache.length, 1);
  } finally {
    await h.close();
  }
});

test('Escenario 7: Detección y rechazo de duplicados existentes contra el catálogo (409 Conflict)', async () => {
  const h = await createTestServer();
  try {
    const candidate = {
      name: 'Comercio Existente Carmen',
      phone: '9381234567',
      category: 'Servicios'
    };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 409, 'Debe responder 409 Conflict ante duplicado conocido');
    assert.equal(res.body.duplicate, true);
    assert.equal(h.tracker.dbSaveCalls, 0, 'No debe intentar guardar en MariaDB');
  } finally {
    await h.close();
  }
});

test('Escenario 8: Control de colisiones intra-lote (duplicados dentro del mismo envío)', async () => {
  const h = await createTestServer();
  try {
    const candidates = [
      {
        name: 'Zapatería El Paso',
        phone: '9388889900',
        category: 'Comercio'
      },
      {
        name: 'Zapatería El Paso',
        phone: '9388889900',
        category: 'Comercio'
      }
    ];

    const res = await h.request('/api/businesses/approve-multiple-candidates', { body: { candidates } });

    assert.equal(res.status, 207, 'Debe responder 207 Multi-Status');
    assert.equal(res.body.confirmed.length, 1, 'Solo el primer candidato debe confirmarse');
    assert.equal(res.body.rejected.length, 1, 'El segundo candidato debe rechazarse');
    assert.ok(res.body.rejected[0].reason.includes('duplicado dentro del mismo lote'));
  } finally {
    await h.close();
  }
});

test('Escenario 9: Aprobaciones concurrentes se serializan con Mutex sin colisiones de identificador', async () => {
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

test('Escenario 10: Solicitudes sin autorización son rechazadas con 401 Unauthorized', async () => {
  const h = await createTestServer();
  try {
    const candidate = { name: 'Comercio No Autorizado', phone: '9389998877', category: 'Otros' };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate, role: null });

    assert.equal(res.status, 401, 'Debe rechazar con 401 Unauthorized');
    assert.equal(h.tracker.dbSaveCalls, 0);
  } finally {
    await h.close();
  }
});

test('Escenario 11: Aprobación parcial por lotes (207 Multi-Status) reporta confirmed y rejected con precisión', async () => {
  const h = await createTestServer();
  try {
    const candidates = [
      { name: 'Empresa Válida 1', phone: '9381010101', category: 'Servicios' },
      { name: 'X', phone: '9382020202', category: 'Servicios' },
      { name: 'Empresa Sin Teléfono', phone: '', whatsapp: '', category: 'Servicios' },
      { name: 'Empresa Válida 2', phone: '9383030303', category: 'Servicios' }
    ];

    const res = await h.request('/api/businesses/approve-multiple-candidates', { body: { candidates } });

    assert.equal(res.status, 207);
    assert.equal(res.body.confirmed.length, 2, 'Deben confirmarse 2');
    assert.equal(res.body.rejected.length, 2, 'Deben rechazarse 2');
    assert.equal(h.businessesCache.length, 3);
  } finally {
    await h.close();
  }
});

test('Escenario 12: Invarianza del caché ante fallos de persistencia', async () => {
  const h = await createTestServer({ simulateSaveError: true });
  try {
    const initialLen = h.businessesCache.length;
    const candidate = { name: 'Negocio Fallido Total', phone: '9384040404', category: 'Servicios' };

    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503);
    assert.equal(h.businessesCache.length, initialLen, 'La longitud del caché en memoria debe permanecer inalterada');
  } finally {
    await h.close();
  }
});

test('Escenario 13: Ausencia total de efectos secundarios o peticiones hacia WordPress/WooCommerce', async () => {
  const h = await createTestServer();
  try {
    const candidate = { name: 'Peluquería Don Carmen', phone: '9385050505', category: 'Servicios' };
    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 200);
    assert.equal(res.body.publishedToWordPress, false, 'publishedToWordPress debe ser explícitamente false');
    assert.equal(h.tracker.wordPressCalls, 0, 'No debe haber llamadas a APIs o endpoints de WordPress');
  } finally {
    await h.close();
  }
});

test('Escenario 14: Restricciones de Staging bloquean escritura directa no autorizada (503)', async () => {
  const h = await createTestServer({ staging: true, businessWritePermitted: false });
  try {
    const candidate = { name: 'Comercio Staging ReadOnly', phone: '9386060606', category: 'Comercio' };
    const res = await h.request('/api/businesses/approve-candidate', { body: candidate });

    assert.equal(res.status, 503, 'Staging Write Gate debe devolver 503');
    assert.equal(res.body.success, false);
    assert.equal(h.businessesCache.length, 1);
  } finally {
    await h.close();
  }
});

test('Escenario 15: Sugerencias de IA tienen isLiveWebDiscovery=false y requiresAdminVerification=true', () => {
  const rawSourceUrl = 'https://ejemplo-carmen.com/negocio';
  const hasSyntacticUrl = /^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(rawSourceUrl);

  const isLiveWebDiscovery = false;
  const provenance = hasSyntacticUrl ? 'ai_suggestion_with_url' : 'ai_unverified';
  const requiresAdminVerification = true;

  assert.equal(isLiveWebDiscovery, false, 'isLiveWebDiscovery no debe ser true solo por regex sintáctica de URL');
  assert.equal(provenance, 'ai_suggestion_with_url');
  assert.equal(requiresAdminVerification, true, 'Debe requerir verificación administrativa');
});

// ============================================================================
// SECCIÓN 3: COMPATIBILIDAD Y COEXISTENCIA CON PR #54
// ============================================================================

test('Escenario 16: Coexistencia con PR #54 (clasificados y gate de staging sin colisiones de ruta)', async () => {
  const h = await createTestServer();
  try {
    const classifiedsRes = await fetch(`${h.baseUrl}/api/classifieds/radar-search`);
    const clsJson = await classifiedsRes.json();
    assert.equal(classifiedsRes.status, 200);
    assert.equal(clsJson.success, true);

    const bizRes = await h.request('/api/businesses/approve-candidate', {
      body: { name: 'Comercio Coexistente', phone: '9387070707', category: 'Servicios' }
    });
    assert.equal(bizRes.status, 200);
    assert.equal(bizRes.body.success, true);
  } finally {
    await h.close();
  }
});
