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

// Ejecutar el verificador por defecto junto al almacén; no sustituirlo por un stub positivo.
const isolatedEnv = {APP_ENV: 'staging', DB_NAME: DATABASE, DB_HOST: 'synthetic.invalid', DB_USER: 'synthetic_user', DB_PASSWORD: 'synthetic-placeholder', APP_URL: 'https://staging.encarmen.org', PUBLIC_URL: undefined, ENABLE_WP_SYNC: 'false', STAGING_ALLOW_SCHEMA_INIT: 'false', STAGING_REQUIRE_MINIMAL_GRANTS: 'true', MYSQL_DATABASE: undefined, MARIADB_DATABASE: undefined};
function provenConnection({productionGrant = false, marker = 'staging'} = {}) {
  const conn = connection();
  const original = conn.query.bind(conn);
  const rows = [];
  conn.query = async (sql, params = []) => {
    if (sql === 'SHOW GRANTS FOR CURRENT_USER()') {conn.state.queries.push(sql); return [[{grant: `GRANT SELECT, INSERT, UPDATE ON \`${productionGrant ? 'u293982346_encarmenapp' : DATABASE}\`.* TO \`synthetic_user\`@\`%\``}]];}
    if (sql.includes('information_schema.SCHEMATA')) {conn.state.queries.push(sql); return [[{SCHEMA_NAME: DATABASE}]];}
    if (sql.includes('encarmen_environment_marker')) {conn.state.queries.push(sql); return [[{env_name: marker, db_name: DATABASE}]];}
    if (sql.startsWith('SELECT GET_LOCK')) {conn.state.queries.push(sql); return [[{acquired: 1}]];}
    if (sql.startsWith('SELECT RELEASE_LOCK')) {conn.state.queries.push(sql); return [[{released: 1}]];}
    if (sql === 'SELECT * FROM businesses ORDER BY id ASC') {conn.state.queries.push(sql); return [structuredClone(rows)];}
    if (sql.startsWith('INSERT INTO businesses')) {conn.state.queries.push(sql); const fields = sql.match(/\(([^)]+)\)/)[1].split(', '); rows.push(Object.fromEntries(fields.map((f,i)=>[f,params[i]]))); return [{affectedRows: 1}];}
    if (sql.startsWith('SELECT * FROM businesses WHERE id = ?')) {conn.state.queries.push(sql); return [structuredClone(rows.filter(row=>String(row.id)===String(params[0])))];}
    if (sql.startsWith('UPDATE businesses SET')) {conn.state.queries.push(sql); const row = rows.find(row=>String(row.id)===String(params.at(-1))); sql.match(/^UPDATE businesses SET (.*), updated_at/)[1].split(', ').forEach((part,i)=>row[part.split(' = ')[0]]=params[i]); return [{affectedRows: 1}];}
    return original(sql, params);
  };
  return conn;
}

test('verificador real y almacén permiten alta/edición únicamente después de probar aislamiento', async () => {
  await withEnv(isolatedEnv, async () => {
    const conn = provenConnection();
    const store = createStagingBusinessStore({canWrite: ()=>true, getConnection: async ()=>conn, serialize: row=>({...JSON.parse(row.raw_data), ...row})});
    const created = await store.create(draft, request);
    const edited = await store.update(created.business.id, {description: 'Edición sintética'});
    assert.equal(edited.business.phone, draft.phone);
    assert.equal(edited.business.whatsapp, '');
    assert.equal(edited.business.description, 'Edición sintética');
    assert.equal(conn.state.queries.filter(sql=>sql === 'SHOW GRANTS FOR CURRENT_USER()').length, 2);
    assert.equal(conn.state.queries.filter(sql=>sql === 'COMMIT').length, 2);
    assert.ok(conn.state.queries.indexOf('SHOW GRANTS FOR CURRENT_USER()') < conn.state.queries.indexOf('BEGIN'));
  });
});

test('permisos de producción o marca incorrecta bloquean alta y edición antes de BEGIN', async () => {
  await withEnv(isolatedEnv, async () => {
    for (const model of [{productionGrant: true}, {marker: 'production'}]) {
      for (const action of [store=>store.create(draft,request), store=>store.update(1081,{description:'x'})]) {
        const conn = provenConnection(model);
        const store = createStagingBusinessStore({canWrite: ()=>true, getConnection: async ()=>conn, serialize: row=>row});
        await assert.rejects(action(store), error=>error.code === 'STAGING_ISOLATION_UNPROVEN');
        assert.equal(conn.state.released, 1);
        assert.ok(!conn.state.queries.some(sql=>/^(BEGIN|INSERT|UPDATE|COMMIT)/.test(sql)));
      }
    }
  });
});

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

