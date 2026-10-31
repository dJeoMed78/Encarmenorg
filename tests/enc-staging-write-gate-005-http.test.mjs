import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import express from 'express';

import {
  STAGING_BUSINESS_DATABASE,
  PRODUCTION_DB_USER,
  getPrivateStagingSnapshot,
  privateStagingBusinessWindowOpen,
  stagingBusinessConfiguration
} from '../src/server/stagingBusinessSecurity.ts';

import { administrativeWritesReady } from '../src/server/consolidatedWritePolicy.ts';
import { registerAdminSecurity, environmentAdminProvider } from '../src/server/adminSecurity.ts';
import { registerStagingBusinessRoutes } from '../src/server/stagingBusinessRoutes.ts';

test('E2E HTTP Pipeline: Dynamic private window opening, mutation authorization, and immediate revocation without restart', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enc-e2e-http-'));
  const configPath = path.join(tmpDir, '.env');

  const salt = crypto.randomBytes(16);
  const password = 'Admin-Password-1234!';
  const ph = `scrypt$${salt.toString('hex')}$${crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex')}`;
  const credsJson = JSON.stringify({
    version: 1,
    accounts: [{ username: 'jeo', passwordHash: ph, permissions: ['admin:manage', 'business:manage', 'business:publish'] }]
  });

  const writeConfigFile = (windowOpen = false) => {
    const lines = [
      'APP_ENV=staging',
      `DB_NAME=${STAGING_BUSINESS_DATABASE}`,
      'DB_USER=u293982346_testuser',
      'DB_HOST=127.0.0.1',
      'DB_PASSWORD=secret_db_pass',
      `STAGING_READ_ONLY=${windowOpen ? 'false' : 'true'}`,
      `STAGING_DB_CONFIRMED=${windowOpen ? 'true' : 'false'}`,
      `ENC_ADMIN_PUBLIC_ORIGIN=https://staging.encarmen.org`,
      `ENC_ADMIN_CREDENTIALS_JSON=${credsJson}`
    ];
    if (windowOpen) {
      lines.push('STAGING_BUSINESS_WRITES_ENABLED=true');
      lines.push('ENC_ADMIN_MUTATIONS_ENABLED=true');
    }
    fs.writeFileSync(configPath, lines.join('\n'), { mode: 0o600 });
  };

  // Start in readonly
  writeConfigFile(false);

  // Setup Express server with exact staging security pipeline
  const app = express();
  app.use(express.json());

  let mockDbWritable = false;
  const mockStore = {
    async create(draft, idKey) {
      return { business: { id: 4001, name: draft.name }, replayed: false };
    },
    async update(id, patch) {
      return { business: { id, ...patch } };
    }
  };

  const isStagingEnv = () => true;
  const isBusinessWritable = () => {
    const snapshot = getPrivateStagingSnapshot({ configPath, connectionUser: 'u293982346_testuser' });
    if (!snapshot) return false;
    return stagingBusinessConfiguration(snapshot, PRODUCTION_DB_USER) &&
      privateStagingBusinessWindowOpen(snapshot, { configPath, connectionUser: 'u293982346_testuser' });
  };

  registerAdminSecurity(app, {
    allowedOrigin: 'https://staging.encarmen.org',
    providerResolver: () => {
      const snap = getPrivateStagingSnapshot({ configPath });
      return snap?.ENC_ADMIN_CREDENTIALS_JSON
        ? environmentAdminProvider({
            ENC_ADMIN_CREDENTIALS_JSON: snap.ENC_ADMIN_CREDENTIALS_JSON,
            ENC_ADMIN_PUBLIC_ORIGIN: snap.ENC_ADMIN_PUBLIC_ORIGIN
          })
        : undefined;
    },
    writesReady: (req) => {
      const isStaging = isStagingEnv();
      const businessWrites = isBusinessWritable();
      const snap = getPrivateStagingSnapshot({ configPath });
      const mutationsEnabled = isStaging && businessWrites && snap?.ENC_ADMIN_MUTATIONS_ENABLED === 'true';
      return administrativeWritesReady(req, {
        mutationsEnabled,
        isStaging,
        businessWrites
      });
    }
  });

  registerStagingBusinessRoutes(app, {
    isStaging: isStagingEnv,
    canWrite: isBusinessWritable,
    isAdmin: () => true,
    canPublish: () => true,
    readAll: async () => [{ id: 1081, name: 'Empresa existente', slug: 'empresa-existente' }],
    store: mockStore,
    saved: () => {}
  });

  const server = await new Promise((res) => {
    const s = app.listen(0, () => res(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. Login with permanent jeo
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://staging.encarmen.org' },
      body: JSON.stringify({ username: 'jeo', password })
    });
    assert.equal(loginRes.status, 200);
    const { token } = await loginRes.json();
    assert.ok(token);

    const authHeaders = {
      'Content-Type': 'application/json',
      Origin: 'https://staging.encarmen.org',
      'X-Encarmen-Admin-Token': token
    };

    // 2. In readonly baseline: probe /api/submit-business -> 503
    const readonlyProbe = await fetch(`${baseUrl}/api/submit-business`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'A' })
    });
    assert.equal(readonlyProbe.status, 503);
    const readonlyBody = await readonlyProbe.json();
    assert.equal(readonlyBody.message, 'Operación bloqueada hasta habilitar administración segura.');

    // In readonly baseline: probe PATCH -> 503
    const readonlyPatch = await fetch(`${baseUrl}/api/businesses/1081`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ description: 'Edición en readonly' })
    });
    assert.equal(readonlyPatch.status, 503);

    // 3. Dynamically OPEN test window (without Node restart)
    writeConfigFile(true);

    // 4. In opened window: invalid payload probe returns 400 (proving gate opened!)
    const openProbe = await fetch(`${baseUrl}/api/submit-business`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'A' }) // Name too short / missing contacts
    });
    assert.equal(openProbe.status, 400);

    // 5. Valid create succeeds with 201 Created
    const validCreate = await fetch(`${baseUrl}/api/submit-business`, {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        name: 'Empresa Dinámica Staging',
        phone: '9381234567',
        category: 'Servicios'
      })
    });
    assert.equal(validCreate.status, 201);
    const createData = await validCreate.json();
    assert.equal(createData.success, true);
    assert.equal(createData.business.name, 'Empresa Dinámica Staging');

    // 6. Valid patch succeeds with 200 OK
    const validPatch = await fetch(`${baseUrl}/api/businesses/1081`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ description: 'Nueva descripción autorizada' })
    });
    assert.equal(validPatch.status, 200);

    // 7. DELETE remains blocked:
    // With business:manage only, adminSecurity blocks with 403 (insufficient permission)
    const deleteRes = await fetch(`${baseUrl}/api/businesses/1081`, {
      method: 'DELETE',
      headers: authHeaders
    });
    assert.equal(deleteRes.status, 403);

    // Even if an administrator had business:delete, administrativeWritesReady strictly denies DELETE
    assert.equal(administrativeWritesReady({ path: '/api/businesses/1081', method: 'DELETE' }, { mutationsEnabled: true, isStaging: true, businessWrites: true }), false);

    // 8. Unrelated mutations like events remain blocked by permission / writesReady -> 403
    const eventRes = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ title: 'Evento no empresarial' })
    });
    assert.equal(eventRes.status, 403);
    assert.equal(administrativeWritesReady({ path: '/api/events', method: 'POST' }, { mutationsEnabled: true, isStaging: true, businessWrites: true }), false);

    // 9. Dynamically RESTORE to readonly (closing the window)
    writeConfigFile(false);

    // 10. Subsequent write attempt is immediately blocked with 503
    const postRestoreRes = await fetch(`${baseUrl}/api/submit-business`, {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        name: 'Empresa Post Restore',
        phone: '9381234567',
        category: 'Servicios'
      })
    });
    assert.equal(postRestoreRes.status, 503);
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
