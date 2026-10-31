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
  resolvePrivateStagingConfigPath,
  getPrivateStagingSnapshot,
  privateStagingBusinessWindowOpen,
  stagingBusinessConfiguration,
  verifyStagingAdmin
} from '../src/server/stagingBusinessSecurity.ts';

import { administrativeWritesReady } from '../src/server/consolidatedWritePolicy.ts';
import { checkStagingConfiguration, evaluateMarker, evaluateSchemas, evaluateGrants, parseGrant, verifyStagingIsolation } from '../src/server/stagingIsolationProof.ts';
import { registerAdminSecurity, environmentAdminProvider } from '../src/server/adminSecurity.ts';

function createTempStagingEnv(content, mode = 0o600) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enc-test-window-'));
  const filePath = path.join(tmpDir, '.env');
  fs.writeFileSync(filePath, content, { mode });
  return { tmpDir, filePath };
}

test('1 & 2. Readonly blocks POST and PATCH via administrativeWritesReady & window gate', () => {
  const state = { mutationsEnabled: false, isStaging: true, businessWrites: false };
  assert.equal(administrativeWritesReady({ path: '/api/submit-business', method: 'POST' }, state), false);
  assert.equal(administrativeWritesReady({ path: '/api/businesses/1081', method: 'PATCH' }, state), false);
  assert.equal(administrativeWritesReady({ path: '/businesses/1081', method: 'PATCH' }, state), false);

  const readonlyEnv = {
    APP_ENV: 'staging',
    DB_NAME: STAGING_BUSINESS_DATABASE,
    DB_USER: 'u293982346_testuser',
    STAGING_READ_ONLY: 'true',
    STAGING_DB_CONFIRMED: 'false',
    STAGING_BUSINESS_WRITES_ENABLED: 'false',
    ENC_ADMIN_MUTATIONS_ENABLED: 'false'
  };
  assert.equal(privateStagingBusinessWindowOpen(readonlyEnv), false);
  assert.equal(stagingBusinessConfiguration(readonlyEnv, PRODUCTION_DB_USER), false);
});

test('3 & 4. Secure temporary window permits authorized POST and PATCH', () => {
  const state = { mutationsEnabled: true, isStaging: true, businessWrites: true };
  assert.equal(administrativeWritesReady({ path: '/api/submit-business', method: 'POST' }, state), true);
  assert.equal(administrativeWritesReady({ path: '/api/businesses/1081', method: 'PATCH' }, state), true);
  assert.equal(administrativeWritesReady({ path: '/businesses/1081', method: 'PATCH' }, state), true);
  assert.equal(administrativeWritesReady({ path: '/api/submit-business/', method: 'POST' }, state), true);

  const windowEnv = {
    APP_ENV: 'staging',
    DB_NAME: STAGING_BUSINESS_DATABASE,
    DB_USER: 'u293982346_testuser',
    STAGING_READ_ONLY: 'false',
    STAGING_DB_CONFIRMED: 'true',
    STAGING_BUSINESS_WRITES_ENABLED: 'true',
    ENC_ADMIN_MUTATIONS_ENABLED: 'true'
  };
  assert.equal(privateStagingBusinessWindowOpen(windowEnv), true);
  assert.equal(stagingBusinessConfiguration(windowEnv, PRODUCTION_DB_USER), true);
});

test('5. Private configuration restoration to readonly immediately revokes write gate', () => {
  const openContent = [
    'APP_ENV=staging',
    `DB_NAME=${STAGING_BUSINESS_DATABASE}`,
    'DB_USER=u293982346_testuser',
    'DB_HOST=127.0.0.1',
    'DB_PASSWORD=secret_test_pw',
    'STAGING_READ_ONLY=false',
    'STAGING_DB_CONFIRMED=true',
    'STAGING_BUSINESS_WRITES_ENABLED=true',
    'ENC_ADMIN_MUTATIONS_ENABLED=true',
    'ENC_ADMIN_PUBLIC_ORIGIN=https://staging.encarmen.org'
  ].join('\n');

  const { tmpDir, filePath } = createTempStagingEnv(openContent);

  try {
    const snapshotOpen = getPrivateStagingSnapshot({ configPath: filePath, connectionUser: 'u293982346_testuser' });
    assert.ok(snapshotOpen);
    assert.equal(privateStagingBusinessWindowOpen(undefined, { configPath: filePath, connectionUser: 'u293982346_testuser' }), true);

    // Restore to readonly
    const restoredContent = [
      'APP_ENV=staging',
      `DB_NAME=${STAGING_BUSINESS_DATABASE}`,
      'DB_USER=u293982346_testuser',
      'DB_HOST=127.0.0.1',
      'DB_PASSWORD=secret_test_pw',
      'STAGING_READ_ONLY=true',
      'STAGING_DB_CONFIRMED=false',
      'ENC_ADMIN_PUBLIC_ORIGIN=https://staging.encarmen.org'
    ].join('\n');
    fs.writeFileSync(filePath, restoredContent, { mode: 0o600 });

    const snapshotRestored = getPrivateStagingSnapshot({ configPath: filePath, connectionUser: 'u293982346_testuser' });
    assert.ok(snapshotRestored);
    assert.equal(snapshotRestored.STAGING_READ_ONLY, 'true');
    assert.equal(privateStagingBusinessWindowOpen(undefined, { configPath: filePath, connectionUser: 'u293982346_testuser' }), false);
    assert.equal(stagingBusinessConfiguration(snapshotRestored, PRODUCTION_DB_USER), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('6. Production MariaDB user is strictly rejected', () => {
  const content = [
    'APP_ENV=staging',
    `DB_NAME=${STAGING_BUSINESS_DATABASE}`,
    `DB_USER=${PRODUCTION_DB_USER}`,
    'DB_HOST=127.0.0.1',
    'DB_PASSWORD=secret_test_pw',
    'STAGING_READ_ONLY=false',
    'STAGING_DB_CONFIRMED=true',
    'STAGING_BUSINESS_WRITES_ENABLED=true',
    'ENC_ADMIN_MUTATIONS_ENABLED=true'
  ].join('\n');
  const { tmpDir, filePath } = createTempStagingEnv(content);
  try {
    const snapshot = getPrivateStagingSnapshot({ configPath: filePath });
    assert.equal(snapshot, null);
    assert.equal(privateStagingBusinessWindowOpen(undefined, { configPath: filePath }), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('7. Production MariaDB database name is strictly rejected', () => {
  const content = [
    'APP_ENV=staging',
    'DB_NAME=u293982346_encarmenapp',
    'DB_USER=u293982346_testuser',
    'DB_HOST=127.0.0.1',
    'DB_PASSWORD=secret_test_pw',
    'STAGING_READ_ONLY=false',
    'STAGING_DB_CONFIRMED=true',
    'STAGING_BUSINESS_WRITES_ENABLED=true',
    'ENC_ADMIN_MUTATIONS_ENABLED=true'
  ].join('\n');
  const { tmpDir, filePath } = createTempStagingEnv(content);
  try {
    const snapshot = getPrivateStagingSnapshot({ configPath: filePath });
    assert.equal(snapshot, null);
    assert.equal(privateStagingBusinessWindowOpen(undefined, { configPath: filePath }), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('8. Missing, incomplete, or malformed private file is rejected', () => {
  assert.equal(getPrivateStagingSnapshot({ configPath: '/non/existent/path/.env' }), null);

  const missingPasswordContent = [
    'APP_ENV=staging',
    `DB_NAME=${STAGING_BUSINESS_DATABASE}`,
    'DB_USER=u293982346_testuser',
    'STAGING_READ_ONLY=false'
  ].join('\n');
  const { tmpDir, filePath } = createTempStagingEnv(missingPasswordContent);
  try {
    assert.equal(getPrivateStagingSnapshot({ configPath: filePath }), null);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('9. Symlinks are strictly rejected', () => {
  const content = [
    'APP_ENV=staging',
    `DB_NAME=${STAGING_BUSINESS_DATABASE}`,
    'DB_USER=u293982346_testuser',
    'DB_PASSWORD=secret',
    'STAGING_READ_ONLY=false'
  ].join('\n');
  const { tmpDir, filePath } = createTempStagingEnv(content);
  const symlinkPath = path.join(tmpDir, '.env-symlink');
  fs.symlinkSync(filePath, symlinkPath);
  try {
    assert.equal(getPrivateStagingSnapshot({ configPath: symlinkPath }), null);
    assert.equal(privateStagingBusinessWindowOpen(undefined, { configPath: symlinkPath }), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('10. Duplicate configuration keys are strictly rejected', () => {
  const content = [
    'APP_ENV=staging',
    `DB_NAME=${STAGING_BUSINESS_DATABASE}`,
    'DB_USER=u293982346_testuser',
    'DB_PASSWORD=secret',
    'STAGING_READ_ONLY=false',
    'STAGING_READ_ONLY=true', // DUPLICATE!
    'STAGING_DB_CONFIRMED=true',
    'STAGING_BUSINESS_WRITES_ENABLED=true',
    'ENC_ADMIN_MUTATIONS_ENABLED=true'
  ].join('\n');
  const { tmpDir, filePath } = createTempStagingEnv(content);
  try {
    assert.equal(getPrivateStagingSnapshot({ configPath: filePath }), null);
    assert.equal(privateStagingBusinessWindowOpen(undefined, { configPath: filePath }), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('11. Unauthenticated or session-less requests are rejected with 401', async () => {
  const app = express();
  registerAdminSecurity(app, {
    provider: {
      accounts: [{ username: 'admin', role: 'Administrador', initial: 'A', avatarColor: '' }],
      authenticate: async () => ({ username: 'admin', permissions: ['business:manage'] })
    },
    writesReady: () => true
  });
  app.post('/api/submit-business', (_req, res) => res.json({ success: true }));

  await new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      const res = await fetch(`http://127.0.0.1:${port}/api/submit-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' })
      });
      assert.equal(res.status, 401);
      server.close(resolve);
    });
  });
});

test('12 & 13. Explicit business DELETE allowed with all gates; unrelated mutations remain blocked', () => {
  const state = { mutationsEnabled: true, isStaging: true, businessWrites: true };
  assert.equal(administrativeWritesReady({ path: '/api/businesses/1081', method: 'DELETE' }, state), true);
  assert.equal(administrativeWritesReady({ path: '/businesses/1081', method: 'DELETE' }, state), true);
  for(const blocked of [
    {...state,mutationsEnabled:false},
    {...state,isStaging:false},
    {...state,businessWrites:false}
  ])assert.equal(administrativeWritesReady({path:'/api/businesses/1081',method:'DELETE'},blocked),false);
  assert.equal(administrativeWritesReady({path:'/api/businesses/1081/sync-wp',method:'DELETE'},state),false);

  assert.equal(administrativeWritesReady({ path: '/api/reports', method: 'POST' }, state), false);
  assert.equal(administrativeWritesReady({ path: '/api/events', method: 'POST' }, state), false);
  assert.equal(administrativeWritesReady({ path: '/api/classifieds', method: 'POST' }, state), false);
  assert.equal(administrativeWritesReady({ path: '/api/businesses/1081', method: 'PUT' }, state), false);
});

test('14. Invalid isolation blocks transaction validation', async () => {
  const fakeConn = {
    query: async (sql) => {
      if (sql.includes('DATABASE()')) return [[{ db_name: 'u293982346_encarmenapp' }]]; // Points to production!
      return [[]];
    }
  };
  const result = await verifyStagingIsolation(fakeConn, {
    APP_ENV: 'staging',
    DB_NAME: STAGING_BUSINESS_DATABASE,
    DB_HOST: '127.0.0.1',
    DB_USER: 'u293982346_test',
    DB_PASSWORD: 'secret_pw'
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'CONNECTED_TO_PRODUCTION');
});

test('15. Authentication controls: permanent jeo account preserved and scrypt works', async () => {
  const salt = crypto.randomBytes(16);
  const password = 'Permanent-jeo-secure-password-2026';
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const scryptHash = `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;

  const credentialsJson = JSON.stringify({
    version: 1,
    accounts: [
      {
        username: 'jeo',
        passwordHash: scryptHash,
        permissions: ['admin:manage', 'business:manage', 'business:publish']
      }
    ]
  });

  const provider = environmentAdminProvider({
    ENC_ADMIN_CREDENTIALS_JSON: credentialsJson,
    ENC_ADMIN_PUBLIC_ORIGIN: 'https://staging.encarmen.org'
  });

  assert.ok(provider);
  const authSuccess = await provider.authenticate('jeo', password);
  assert.ok(authSuccess);
  assert.equal(authSuccess.username, 'jeo');
  assert.ok(authSuccess.permissions.includes('business:manage'));

  const authFail = await provider.authenticate('jeo', 'wrong-password-value');
  assert.equal(authFail, null);

  const authWrongUser = await provider.authenticate('unknown', password);
  assert.equal(authWrongUser, null);
});

test('16. Private snapshot takes strict precedence over stale process.env in verifyStagingIsolation', async () => {
  const privateContent = [
    'APP_ENV=staging',
    `DB_NAME=${STAGING_BUSINESS_DATABASE}`,
    'DB_USER=u293982346_privateuser',
    'DB_HOST=127.0.0.1',
    'DB_PASSWORD=secret_private_pw',
    'STAGING_READ_ONLY=false',
    'STAGING_DB_CONFIRMED=true',
    'STAGING_BUSINESS_WRITES_ENABLED=true',
    'ENC_ADMIN_MUTATIONS_ENABLED=true',
    'ENC_ADMIN_PUBLIC_ORIGIN=https://staging.encarmen.org'
  ].join('\n');

  const { tmpDir, filePath } = createTempStagingEnv(privateContent);

  try {
    const fakeConn = {
      query: async (sql) => {
        if (sql === 'SELECT DATABASE() AS db_name') return [[{ db_name: STAGING_BUSINESS_DATABASE }]];
        if (sql === 'SHOW GRANTS FOR CURRENT_USER()') return [[{ 'Grants': `GRANT SELECT, INSERT, UPDATE ON \`${STAGING_BUSINESS_DATABASE}\`.* TO \`u293982346_privateuser\`@\`%\`` }]];
        if (sql.includes('information_schema.SCHEMATA')) return [[{ SCHEMA_NAME: STAGING_BUSINESS_DATABASE }, { SCHEMA_NAME: 'information_schema' }]];
        if (sql.includes('encarmen_environment_marker')) return [[{ env_name: 'staging', db_name: STAGING_BUSINESS_DATABASE }]];
        return [[]];
      }
    };

    // Stale env with older/mismatched user
    const staleEnv = {
      APP_ENV: 'staging',
      DB_NAME: STAGING_BUSINESS_DATABASE,
      DB_USER: 'u293982346_staleuser',
      DB_HOST: 'stale.host',
      DB_PASSWORD: 'stale_password'
    };

    const res = await verifyStagingIsolation(fakeConn, staleEnv, { configPath: filePath });
    assert.equal(res.ok, true);
    assert.equal(res.code, 'ISOLATION_PROVEN');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('17. STAGING_REQUIRE_MINIMAL_GRANTS in private snapshot strictly blocks broad grants', async () => {
  const privateStrictContent = [
    'APP_ENV=staging',
    `DB_NAME=${STAGING_BUSINESS_DATABASE}`,
    'DB_USER=u293982346_privateuser',
    'DB_HOST=127.0.0.1',
    'DB_PASSWORD=secret_private_pw',
    'STAGING_READ_ONLY=false',
    'STAGING_DB_CONFIRMED=true',
    'STAGING_BUSINESS_WRITES_ENABLED=true',
    'ENC_ADMIN_MUTATIONS_ENABLED=true',
    'STAGING_REQUIRE_MINIMAL_GRANTS=true',
    'ENC_ADMIN_PUBLIC_ORIGIN=https://staging.encarmen.org'
  ].join('\n');

  const { tmpDir, filePath } = createTempStagingEnv(privateStrictContent);

  try {
    const fakeConnBroad = {
      query: async (sql) => {
        if (sql === 'SELECT DATABASE() AS db_name') return [[{ db_name: STAGING_BUSINESS_DATABASE }]];
        if (sql === 'SHOW GRANTS FOR CURRENT_USER()') return [[{ 'Grants': `GRANT ALL PRIVILEGES ON \`${STAGING_BUSINESS_DATABASE}\`.* TO \`u293982346_privateuser\`@\`%\`` }]];
        if (sql.includes('information_schema.SCHEMATA')) return [[{ SCHEMA_NAME: STAGING_BUSINESS_DATABASE }, { SCHEMA_NAME: 'information_schema' }]];
        if (sql.includes('encarmen_environment_marker')) return [[{ env_name: 'staging', db_name: STAGING_BUSINESS_DATABASE }]];
        return [[]];
      }
    };

    // Even if initial env has STAGING_REQUIRE_MINIMAL_GRANTS unset/false, snapshot overrides it to true!
    const res = await verifyStagingIsolation(fakeConnBroad, { APP_ENV: 'staging' }, { configPath: filePath });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'BROAD_STAGING_PRIVILEGES');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('18. CURRENT_USER() effective SQL identity validation rejects production user and mismatches', () => {
  // Parsing and grant evaluation directly testing MariaDB effective identity checks
  const prodGrants = ['GRANT ALL ON `u293982346_encarmenapp`.* TO `u293982346_appuser`@`%`'];
  const resProd = evaluateGrants(prodGrants, STAGING_BUSINESS_DATABASE, 'u293982346_encarmenapp', false);
  assert.equal(resProd.code, 'GRANT_ON_PRODUCTION');

  const validStagingGrants = [
    `GRANT USAGE ON *.* TO \`u293982346_staginguser\`@\`%\``,
    `GRANT SELECT, INSERT, UPDATE ON \`${STAGING_BUSINESS_DATABASE}\`.* TO \`u293982346_staginguser\`@\`%\``
  ];
  const resValid = evaluateGrants(validStagingGrants, STAGING_BUSINESS_DATABASE, 'u293982346_encarmenapp', true);
  assert.equal(resValid.code, '');
});
