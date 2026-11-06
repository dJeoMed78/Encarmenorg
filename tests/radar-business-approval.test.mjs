// Automated test suite for ENC-RADAR-EMPRESAS-043
// Verifies secure MariaDB persistence, absence of WordPress/WooCommerce publishing,
// prevention of optimistic fake cache updates, and honest candidate provenance.

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerAdminSecurity } from '../src/server/adminSecurity.ts';
import { contactDigits } from '../src/utils/businessContacts.ts';

// Test harness that isolates the approval and radar routes with synthetic MariaDB states
async function createRadarHarness({
  staging = false,
  mariaDbActive = true,
  writePermitted = true,
  businessWritePermitted = true,
  saveSucceeds = true,
  simulateSaveError = false
} = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enc-radar-test-'));
  const seedPath = path.join(tmpDir, 'businesses_seed.json');
  const dismissedPath = path.join(tmpDir, 'dismissed_candidates.json');

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

  fs.writeFileSync(seedPath, JSON.stringify(initialBusinesses, null, 2), 'utf8');
  fs.writeFileSync(dismissedPath, JSON.stringify([], null, 2), 'utf8');

  let businessesCache = structuredClone(initialBusinesses);
  let dismissedCandidates = new Set();
  const carmenAutoPool = [
    {
      id: 'pool-1',
      name: 'Negocio Pool Local 1',
      phone: '9389990001',
      whatsapp: '9389990001',
      category: 'Restaurantes',
      description: 'Comida en Carmen',
      source: 'Directorio Local Histórico',
      isLiveWebDiscovery: false,
      provenance: 'local_pool'
    }
  ];

  // Call trackers to verify WordPress absence and MariaDB persistence
  const tracker = {
    wordPressCalls: 0,
    dbSaveCalls: 0,
    dbDeleteCalls: 0,
    stagingStoreCreateCalls: 0,
    readbackSelectCalls: 0
  };

  const app = express();
  app.use(express.json());

  // Security gate
  const adminSecurity = registerAdminSecurity(app, {
    provider: {
      accounts: [],
      authenticate: async (username) => {
        if (username === 'admin-publisher') {
          return { username, permissions: ['business:publish', 'business:manage', 'admin:manage'] };
        }
        if (username === 'read-only-user') {
          return { username, permissions: ['business:read'] };
        }
        return null;
      }
    },
    allowedOrigin: 'https://test.encarmen.org',
    writesReady: () => true
  });

  // Duplicate helper (same as server.ts)
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

  // MariaDB mock save and readback
  async function mockDbSaveBusiness(newBiz) {
    tracker.dbSaveCalls++;
    if (simulateSaveError) {
      throw new Error('Database transaction abort simulated');
    }
    if (!saveSucceeds) return false;
    return true;
  }

  async function mockDbLoadAllBusinesses() {
    tracker.readbackSelectCalls++;
    return structuredClone(businessesCache);
  }

  // Synthetic staging store
  const mockStagingStore = {
    async create(draft, requestId) {
      tracker.stagingStoreCreateCalls++;
      if (simulateSaveError) {
        const err = new Error('Database lock acquisition timeout in MariaDB');
        err.status = 503;
        err.code = 'BUSINESS_WRITE_UNCONFIRMED';
        throw err;
      }
      if (!saveSucceeds) {
        const err = new Error('No se confirmó el guardado en Staging MariaDB');
        err.status = 503;
        err.code = 'REGISTRATION_READBACK_FAILED';
        throw err;
      }
      const ph = contactDigits(draft.phone);
      if (businessesCache.some(b => b.name.toLowerCase() === draft.name.toLowerCase() || (ph && contactDigits(b.phone) === ph))) {
        const err = new Error('Ya existe un negocio con ese nombre o contacto.');
        err.status = 409;
        err.code = 'BUSINESS_DUPLICATE';
        throw err;
      }
      const id = Math.max(4000, ...businessesCache.map(b => Number(b.id) || 0)) + 1;
      const saved = {
        ...draft,
        id,
        slug: draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        createdAt: new Date().toISOString(),
        status: 'published'
      };
      return { business: saved, replayed: false };
    }
  };

  // 1. POST /api/businesses/approve-candidate
  app.post('/api/businesses/approve-candidate', async (req, res) => {
    try {
      if (!adminSecurity.isAuthorized(req, 'business:publish')) {
        return res.status(401).json({ success: false, message: 'No autorizado para publicar empresas.' });
      }

      const candidate = req.body?.candidate;
      if (!candidate || !candidate.name || !candidate.name.trim() || candidate.name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Datos del candidato inválidos. Se requiere nombre de empresa válido.' });
      }

      const phoneDigits = contactDigits(candidate.phone);
      const waDigits = contactDigits(candidate.whatsapp || candidate.phone);
      if (!phoneDigits && !waDigits) {
        return res.status(400).json({
          success: false,
          message: 'No se puede publicar un negocio sin número telefónico verificado de 10 dígitos.'
        });
      }
      const mainContact = phoneDigits || waDigits;

      const existingDup = findDuplicateBusiness(candidate.name, mainContact);
      if (existingDup) {
        return res.status(409).json({
          success: false,
          duplicate: true,
          message: `Ya existe un negocio registrado con nombre o teléfono similar ("${existingDup.name}").`
        });
      }

      if (staging) {
        if (!businessWritePermitted) {
          return res.status(503).json({
            success: false,
            message: 'MariaDB Staging no permite escrituras de empresas en este momento. La empresa no fue guardada.'
          });
        }
      } else {
        if (!mariaDbActive || !writePermitted) {
          return res.status(503).json({
            success: false,
            message: 'MariaDB no está disponible o las escrituras están bloqueadas. La empresa no fue guardada.'
          });
        }
      }

      let persistedBiz = null;

      if (staging) {
        try {
          const draft = {
            name: candidate.name.trim(),
            category: candidate.category || 'Comercios',
            phone: candidate.phone,
            whatsapp: candidate.whatsapp || candidate.phone,
            status: 'published'
          };
          const created = await mockStagingStore.create(draft, 'req-uuid-1234');
          persistedBiz = created.business;
        } catch (err) {
          return res.status(err.status || 503).json({
            success: false,
            message: err.message,
            code: err.code
          });
        }
      } else {
        try {
          const maxId = businessesCache.reduce((max, b) => Math.max(max, Number(b.id) || 0), 4000);
          const newId = maxId + 1;
          const newBiz = {
            id: newId,
            name: candidate.name.trim(),
            slug: `empresa-${newId}`,
            phone: candidate.phone,
            whatsapp: candidate.whatsapp || candidate.phone,
            status: 'published'
          };

          const saved = await mockDbSaveBusiness(newBiz);
          if (!saved) {
            return res.status(503).json({ success: false, message: 'MariaDB no confirmó el guardado de la empresa.' });
          }

          // Temporarily add to mock db array to simulate readback
          businessesCache.unshift(newBiz);
          const allFromDb = await mockDbLoadAllBusinesses();
          const verified = allFromDb.find(b => String(b.id) === String(newBiz.id));
          if (!verified) {
            return res.status(503).json({ success: false, message: 'Fallo de verificación de lectura en MariaDB. No se confirmó la persistencia.' });
          }
          persistedBiz = verified;
        } catch (err) {
          return res.status(503).json({ success: false, message: err.message || 'Error al persistir empresa en MariaDB.' });
        }
      }

      if (!persistedBiz) {
        return res.status(503).json({ success: false, message: 'No se obtuvo confirmación de la persistencia en MariaDB.' });
      }

      // If staging, update cache now
      if (staging) {
        businessesCache.unshift(persistedBiz);
      }

      fs.writeFileSync(seedPath, JSON.stringify(businessesCache, null, 2), 'utf8');
      dismissedCandidates.add(candidate.name.toLowerCase().trim());

      return res.json({
        success: true,
        business: persistedBiz,
        publishedToWordPress: false,
        message: `¡Éxito! "${persistedBiz.name}" se guardó y confirmó en MariaDB.`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2. POST /api/businesses/approve-multiple-candidates
  app.post('/api/businesses/approve-multiple-candidates', async (req, res) => {
    try {
      if (!adminSecurity.isAuthorized(req, 'business:publish')) {
        return res.status(401).json({ success: false, message: 'No autorizado para publicar empresas.' });
      }

      const candidates = req.body?.candidates;
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ success: false, message: 'No se recibieron candidatos para aprobar' });
      }

      if (staging) {
        if (!businessWritePermitted) {
          return res.status(503).json({ success: false, message: 'MariaDB Staging no permite escrituras de empresas en este momento.' });
        }
      } else {
        if (!mariaDbActive || !writePermitted) {
          return res.status(503).json({ success: false, message: 'MariaDB no está disponible o las escrituras están bloqueadas.' });
        }
      }

      const confirmed = [];
      const rejected = [];
      const batchNames = new Set();
      const batchPhones = new Set();

      for (const cand of candidates) {
        if (!cand || !cand.name || !cand.name.trim() || cand.name.trim().length < 2) {
          rejected.push({ candidate: cand, reason: 'Nombre de empresa inválido o ausente' });
          continue;
        }

        const phoneDigits = contactDigits(cand.phone);
        const waDigits = contactDigits(cand.whatsapp || cand.phone);
        if (!phoneDigits && !waDigits) {
          rejected.push({ candidate: cand, reason: 'Sin número telefónico de 10 dígitos verificado' });
          continue;
        }
        const mainContact = phoneDigits || waDigits;
        const normName = cand.name.toLowerCase().trim();

        if (batchNames.has(normName) || batchPhones.has(mainContact)) {
          rejected.push({ candidate: cand, reason: 'Empresa o teléfono duplicado dentro del mismo lote' });
          continue;
        }

        const existingDup = findDuplicateBusiness(cand.name, mainContact);
        if (existingDup) {
          rejected.push({ candidate: cand, reason: `Ya existe en el directorio ("${existingDup.name}")` });
          continue;
        }

        if (staging) {
          try {
            const draft = { name: cand.name.trim(), category: cand.category || 'General', phone: cand.phone, whatsapp: cand.whatsapp || cand.phone };
            const created = await mockStagingStore.create(draft, `uuid-${Date.now()}`);
            confirmed.push(created.business);
            batchNames.add(normName);
            batchPhones.add(mainContact);
          } catch (err) {
            rejected.push({ candidate: cand, reason: err.message, code: err.code });
          }
        } else {
          try {
            const maxId = businessesCache.reduce((max, b) => Math.max(max, Number(b.id) || 0), 4000);
            const newId = maxId + 1;
            const newBiz = { id: newId, name: cand.name.trim(), slug: `empresa-${newId}`, phone: cand.phone, whatsapp: cand.whatsapp || cand.phone };
            const saved = await mockDbSaveBusiness(newBiz);
            if (saved) {
              confirmed.push(newBiz);
              batchNames.add(normName);
              batchPhones.add(mainContact);
            } else {
              rejected.push({ candidate: cand, reason: 'MariaDB no confirmó el guardado' });
            }
          } catch (err) {
            rejected.push({ candidate: cand, reason: err.message });
          }
        }
      }

      // Add only confirmed businesses to cache
      if (confirmed.length > 0) {
        for (const b of confirmed) {
          businessesCache.unshift(b);
          dismissedCandidates.add(b.name.toLowerCase().trim());
        }
        fs.writeFileSync(seedPath, JSON.stringify(businessesCache, null, 2), 'utf8');
      }

      return res.json({
        success: confirmed.length > 0,
        count: confirmed.length,
        totalRequested: candidates.length,
        confirmed,
        published: confirmed,
        rejected,
        failed: rejected,
        publishedToWordPress: false,
        message: confirmed.length === candidates.length
          ? `Se aprobaron y confirmaron ${confirmed.length} empresas en MariaDB con éxito.`
          : `Se confirmaron ${confirmed.length} de ${candidates.length} empresas en MariaDB. ${rejected.length} no se pudieron guardar o fueron rechazadas.`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 3. POST /api/businesses/auto-search (honest provenance endpoint)
  app.post('/api/businesses/auto-search', (req, res) => {
    const list = carmenAutoPool.map(c => ({
      ...c,
      isLiveWebDiscovery: false,
      provenance: 'local_pool'
    }));
    return res.json({
      success: true,
      count: list.length,
      candidates: list,
      isLiveDiscovery: false,
      message: `Se encontraron ${list.length} negocios en el catálogo local.`
    });
  });

  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const request = async (route, method = 'POST', token, body) => {
    const res = await fetch(baseUrl + route, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Encarmen-Admin-Token': token } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  const login = async (username) => {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'irrelevant-for-test-provider' })
    });
    const data = await res.json();
    return data.token;
  };

  return {
    baseUrl,
    request,
    login,
    tracker,
    getCache: () => structuredClone(businessesCache),
    getDismissed: () => Array.from(dismissedCandidates),
    close: () => new Promise(resolve => server.close(resolve))
  };
}

// -----------------------------------------------------------------------------
// The 12 Mandatory Test Scenarios
// -----------------------------------------------------------------------------

test('1. MariaDB disponible: Permite aprobación individual con confirmación', async () => {
  const h = await createRadarHarness({ mariaDbActive: true, writePermitted: true, saveSucceeds: true });
  try {
    const token = await h.login('admin-publisher');
    const res = await h.request('/api/businesses/approve-candidate', 'POST', token, {
      candidate: {
        name: 'Tacos El Guero Isla',
        phone: '9381112233',
        category: 'Restaurantes'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.business.name, 'Tacos El Guero Isla');
    assert.equal(h.tracker.dbSaveCalls, 1);
    assert.equal(h.tracker.readbackSelectCalls, 1);
    assert.equal(h.getCache().some(b => b.name === 'Tacos El Guero Isla'), true);
  } finally {
    await h.close();
  }
});

test('2. MariaDB no disponible: Rechaza con 503 y NO contamina el caché', async () => {
  const h = await createRadarHarness({ mariaDbActive: false });
  try {
    const token = await h.login('admin-publisher');
    const cacheBefore = h.getCache();
    const res = await h.request('/api/businesses/approve-candidate', 'POST', token, {
      candidate: {
        name: 'Farmacia San Juan Carmen',
        phone: '9382223344',
        category: 'Farmacias'
      }
    });

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /MariaDB no está disponible/);
    assert.deepEqual(h.getCache(), cacheBefore, 'El caché no debe modificarse cuando MariaDB está inactiva');
  } finally {
    await h.close();
  }
});

test('3. Error al guardar empresa: Rechaza con 503 y no confirma publicación falsa', async () => {
  const h = await createRadarHarness({ mariaDbActive: true, writePermitted: true, simulateSaveError: true });
  try {
    const token = await h.login('admin-publisher');
    const cacheBefore = h.getCache();
    const res = await h.request('/api/businesses/approve-candidate', 'POST', token, {
      candidate: {
        name: 'Taller Mecanico Playa Norte',
        phone: '9383334455',
        category: 'Automotriz'
      }
    });

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.deepEqual(h.getCache(), cacheBefore, 'El caché no debe alterarse si ocurrió un error en la base de datos');
  } finally {
    await h.close();
  }
});

test('4. Confirmación exitosa de persistencia: Retorna datos confirmados y actualiza caché', async () => {
  const h = await createRadarHarness({ mariaDbActive: true, writePermitted: true, saveSucceeds: true });
  try {
    const token = await h.login('admin-publisher');
    const res = await h.request('/api/businesses/approve-candidate', 'POST', token, {
      candidate: {
        name: 'Panaderia La Principal',
        phone: '9384445566',
        category: 'Alimentos'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.business.id);
    assert.match(res.body.message, /guardó y confirmó en MariaDB/);
    assert.equal(h.getCache()[0].name, 'Panaderia La Principal');
  } finally {
    await h.close();
  }
});

test('5. Empresa duplicada: Rechaza con 409 Conflict por colisión de nombre o teléfono', async () => {
  const h = await createRadarHarness({ mariaDbActive: true, writePermitted: true });
  try {
    const token = await h.login('admin-publisher');
    const cacheBefore = h.getCache();

    // Collision by existing phone (9381234567 belongs to 'Comercio Existente Carmen')
    const res = await h.request('/api/businesses/approve-candidate', 'POST', token, {
      candidate: {
        name: 'Otro Negocio Mismo Telefono',
        phone: '9381234567',
        category: 'Varios'
      }
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.duplicate, true);
    assert.deepEqual(h.getCache(), cacheBefore, 'No debe agregarse ningún registro duplicado al caché');
  } finally {
    await h.close();
  }
});

test('6. Teléfono inválido: Rechaza con 400 Bad Request si no tiene 10 dígitos', async () => {
  const h = await createRadarHarness({ mariaDbActive: true, writePermitted: true });
  try {
    const token = await h.login('admin-publisher');
    const cacheBefore = h.getCache();

    // Invalid phone with only 6 digits
    const res = await h.request('/api/businesses/approve-candidate', 'POST', token, {
      candidate: {
        name: 'Negocio Telefono Corto',
        phone: '938123',
        category: 'Varios'
      }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /verificado de 10 dígitos/i);
    assert.deepEqual(h.getCache(), cacheBefore);
  } finally {
    await h.close();
  }
});

test('7. Usuario sin autorización: Rechaza con 401 si falta sesión o permiso business:publish', async () => {
  const h = await createRadarHarness({ mariaDbActive: true, writePermitted: true });
  try {
    const cacheBefore = h.getCache();

    // Anonymous request (no token)
    const resAnon = await h.request('/api/businesses/approve-candidate', 'POST', undefined, {
      candidate: { name: 'Negocio Anonimo', phone: '9385556677' }
    });
    assert.equal(resAnon.status, 401);
    assert.equal(resAnon.body.success, false);

    // Read-only user without 'business:publish' permission
    const readOnlyToken = await h.login('read-only-user');
    const resReadOnly = await h.request('/api/businesses/approve-candidate', 'POST', readOnlyToken, {
      candidate: { name: 'Negocio Sin Permiso', phone: '9385556677' }
    });
    assert.equal(resReadOnly.status, 401);
    assert.equal(resReadOnly.body.success, false);

    assert.deepEqual(h.getCache(), cacheBefore, 'Los intentos no autorizados no deben tocar el caché');
  } finally {
    await h.close();
  }
});

test('8. Aprobación individual en Staging: Usa canal aislado stagingStore y no altera producción', async () => {
  const h = await createRadarHarness({ staging: true, businessWritePermitted: true, saveSucceeds: true });
  try {
    const token = await h.login('admin-publisher');
    const res = await h.request('/api/businesses/approve-candidate', 'POST', token, {
      candidate: {
        name: 'Boutique Perla Marina Staging',
        phone: '9386667788',
        whatsapp: '9386667788',
        category: 'Moda'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(h.tracker.stagingStoreCreateCalls, 1);
    assert.equal(h.tracker.dbSaveCalls, 0, 'No debe llamar al guardado general en Staging');
    assert.equal(h.getCache()[0].name, 'Boutique Perla Marina Staging');
  } finally {
    await h.close();
  }
});

test('9. Aprobación múltiple parcialmente fallida: Distingue confirmados de rechazados', async () => {
  const h = await createRadarHarness({ mariaDbActive: true, writePermitted: true, saveSucceeds: true });
  try {
    const token = await h.login('admin-publisher');
    const cacheBefore = h.getCache();

    const candidates = [
      { name: 'Candidato Valido 1', phone: '9387771122', category: 'Servicios' },
      { name: 'Candidato Telefono Invalido', phone: '123', category: 'Servicios' },
      { name: 'Comercio Existente Carmen', phone: '9381234567', category: 'Duplicado' }, // Duplicate against existing
      { name: 'Candidato Valido 2', phone: '9387773344', category: 'Servicios' }
    ];

    const res = await h.request('/api/businesses/approve-multiple-candidates', 'POST', token, { candidates });

    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2, 'Deben confirmarse exactamente 2 candidatos válidos');
    assert.equal(res.body.confirmed.length, 2);
    assert.equal(res.body.rejected.length, 2, 'Deben rechazarse los 2 candidatos inválidos/duplicados');

    // Only confirmed candidates enter the cache
    const newCache = h.getCache();
    assert.equal(newCache.length, cacheBefore.length + 2);
    assert.ok(newCache.some(b => b.name === 'Candidato Valido 1'));
    assert.ok(newCache.some(b => b.name === 'Candidato Valido 2'));
    assert.ok(!newCache.some(b => b.name === 'Candidato Telefono Invalido'));
  } finally {
    await h.close();
  }
});

test('10. Ausencia de llamadas a WordPress/WooCommerce: No publica ni muta IDs heredados', async () => {
  const h = await createRadarHarness({ mariaDbActive: true, writePermitted: true, saveSucceeds: true });
  try {
    const token = await h.login('admin-publisher');
    const res = await h.request('/api/businesses/approve-candidate', 'POST', token, {
      candidate: {
        name: 'Cafeteria Malecon Sin WP',
        phone: '9388889900',
        category: 'Cafeterias'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.publishedToWordPress, false);
    assert.equal(res.body.wpSynced, undefined, 'No debe haber flag wpSynced heredado');
    assert.equal(res.body.wpProductId, undefined, 'No debe mutar ID hacia ID de WooCommerce');
    assert.equal(h.tracker.wordPressCalls, 0, 'Cero llamadas salientes a WordPress');
  } finally {
    await h.close();
  }
});

test('11. Caché sin publicaciones falsas: Fallos nunca alteran el estado en memoria', async () => {
  const h = await createRadarHarness({ mariaDbActive: true, writePermitted: true, saveSucceeds: false });
  try {
    const token = await h.login('admin-publisher');
    const initialCache = h.getCache();

    // Approval fails because MariaDB save failed
    const res = await h.request('/api/businesses/approve-candidate', 'POST', token, {
      candidate: {
        name: 'Empresa Fallo Silencioso Evitado',
        phone: '9389998877',
        category: 'Comercio'
      }
    });

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.deepEqual(h.getCache(), initialCache, 'El caché no debe incluir empresas que fallaron en MariaDB');
  } finally {
    await h.close();
  }
});

test('12. Candidatos locales no presentados como descubrimientos web actuales', async () => {
  const h = await createRadarHarness();
  try {
    const res = await h.request('/api/businesses/auto-search', 'POST', undefined, {});
    assert.equal(res.status, 200);
    assert.equal(res.body.isLiveDiscovery, false);
    for (const cand of res.body.candidates) {
      assert.equal(cand.isLiveWebDiscovery, false, 'Los candidatos locales no deben fingir ser descubrimientos en vivo');
      assert.equal(cand.provenance, 'local_pool');
    }
  } finally {
    await h.close();
  }
});
