import test from 'node:test';
import assert from 'node:assert/strict';
import {loadComponent} from './contacts-r2.test.mjs';

// El almacén real (sin verificador inyectado) debe bloquear toda escritura si el aislamiento no está probado.
const {createStagingBusinessStore, BusinessWriteError} = await loadComponent('src/db/stagingBusinessStore.ts');
const DATABASE = 'u293982346_encarmentest';
const request = '11111111-1111-4111-8111-111111111111';

function connection(proofQueries = {}) {
  const queries = [];
  const state = {released: 0, queries};
  return {
    state,
    async query(sql) {
      queries.push(sql);
      if (sql === 'SELECT DATABASE() AS db_name') return [[{db_name: DATABASE}]];
      if (sql.includes('information_schema.TABLES')) return [[{ENGINE: 'InnoDB'}]];
      if (sql.includes('information_schema.STATISTICS')) return [[{COLUMN_NAME: 'id', NON_UNIQUE: 0, SEQ_IN_INDEX: 1}]];
      if (sql in proofQueries) return proofQueries[sql]();
      throw new Error('Unexpected SQL: ' + sql);
    },
    async beginTransaction() { queries.push('BEGIN'); },
    async commit() { queries.push('COMMIT'); },
    async rollback() { queries.push('ROLLBACK'); },
    release() { state.released++; },
  };
}

async function withEnv(patch, action) {
  const saved = {};
  for (const key of Object.keys(patch)) { saved[key] = process.env[key]; if (patch[key] === undefined) delete process.env[key]; else process.env[key] = patch[key]; }
  try { return await action(); } finally { for (const key of Object.keys(saved)) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } }
}

const draft = {name: 'Empresa sintética', phone: '2223334455', whatsapp: '', categories: ['Servicios'], category: 'Servicios'};

test('sin verificador inyectado, un proceso que no es Staging no puede crear ni editar', async () => {
  await withEnv({APP_ENV: 'production'}, async () => {
    for (const action of [(store) => store.create(draft, request), (store) => store.update(1081, {description: 'x'})]) {
      const conn = connection();
      const store = createStagingBusinessStore({canWrite: () => true, getConnection: async () => conn, serialize: (row) => row});
      await assert.rejects(action(store), (error) => error instanceof BusinessWriteError && error.code === 'STAGING_ISOLATION_UNPROVEN' && error.status === 403);
      assert.equal(conn.state.released, 1, 'la conexión se libera');
      assert.ok(!conn.state.queries.some((sql) => /^(INSERT|UPDATE|BEGIN|COMMIT)/.test(sql)), 'no hay escrituras ni transacciones');
    }
  });
});

test('con configuración de Staging pero sin permisos/marca verificables, el almacén sigue bloqueado', async () => {
  const env = {APP_ENV: 'staging', DB_NAME: DATABASE, DB_HOST: 'synthetic.invalid', DB_USER: 'synthetic_user', DB_PASSWORD: 'synthetic-placeholder', APP_URL: undefined, PUBLIC_URL: undefined, ENABLE_WP_SYNC: undefined, STAGING_ALLOW_SCHEMA_INIT: undefined};
  await withEnv(env, async () => {
    const conn = connection({'SHOW GRANTS FOR CURRENT_USER()': async () => { throw new Error('synthetic denied'); }});
    const store = createStagingBusinessStore({canWrite: () => true, getConnection: async () => conn, serialize: (row) => row});
    await assert.rejects(store.create(draft, request), (error) => error.code === 'STAGING_ISOLATION_UNPROVEN' && /ISOLATION_CHECK_FAILED/.test(error.message));
    assert.ok(!conn.state.queries.some((sql) => /^(INSERT|UPDATE|BEGIN)/.test(sql)));
  });
});
