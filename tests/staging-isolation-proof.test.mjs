import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyStagingIsolation, checkStagingConfiguration, parseGrant, evaluateGrants,
  STAGING_DATABASE, PRODUCTION_DATABASE,
} from '../src/server/stagingIsolationProof.ts';

// Todas las conexiones son simuladas: no hay MariaDB real ni credenciales.
const goodEnv = {
  APP_ENV: 'staging', DB_NAME: STAGING_DATABASE, DB_HOST: 'synthetic.invalid', DB_USER: 'synthetic_staging_user',
  DB_PASSWORD: 'synthetic-placeholder', APP_URL: 'https://staging.encarmen.org',
};
const goodGrants = [
  "GRANT USAGE ON *.* TO `synthetic_staging_user`@`%` IDENTIFIED BY PASSWORD '*SYNTHETICHASH'",
  'GRANT SELECT, INSERT, UPDATE ON `' + STAGING_DATABASE + '`.* TO `synthetic_staging_user`@`%`',
];
function conn(overrides = {}) {
  const model = {
    database: STAGING_DATABASE, grants: goodGrants, schemas: ['information_schema', STAGING_DATABASE],
    marker: [{ env_name: 'staging', db_name: STAGING_DATABASE }], markerError: null, failOn: '', ...overrides,
  };
  const queries = [];
  return {
    queries,
    async query(sql) {
      queries.push(sql);
      if (model.failOn && sql.includes(model.failOn)) throw new Error('synthetic failure');
      if (sql === 'SELECT DATABASE() AS db_name') return [[{ db_name: model.database }]];
      if (sql === 'SHOW GRANTS FOR CURRENT_USER()') return [model.grants.map((g) => ({ 'Grants for synthetic@%': g }))];
      if (sql.includes('information_schema.SCHEMATA')) return [model.schemas.map((s) => ({ SCHEMA_NAME: s }))];
      if (sql.includes('encarmen_environment_marker')) {
        if (model.markerError) throw model.markerError;
        return [model.marker];
      }
      throw new Error('Unexpected SQL: ' + sql);
    },
  };
}
const run = (overrides, env = goodEnv, options) => verifyStagingIsolation(conn(overrides), env, options);

test('aislamiento probado: base, permisos, esquemas y marca coinciden con Staging', async () => {
  const c = conn();
  const result = await verifyStagingIsolation(c, goodEnv);
  assert.deepEqual([result.ok, result.code], [true, 'ISOLATION_PROVEN']);
  assert.ok(c.queries.every((q) => /^(SELECT|SHOW) /.test(q)), 'solo consultas de lectura');
  assert.ok(c.queries.every((q) => !/(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|GRANT )/i.test(q.replace('SHOW GRANTS', ''))));
});

test('el resultado nunca contiene grants, hash, host, usuario ni contraseña', async () => {
  const serialized = JSON.stringify(await run());
  for (const secret of ['SYNTHETICHASH', 'synthetic.invalid', 'synthetic_staging_user', 'synthetic-placeholder', 'GRANT']) assert.ok(!serialized.includes(secret), secret);
});

test('configuración incompleta, ambigua o de otro entorno bloquea antes de consultar la base', async () => {
  const cases = [
    [{ APP_ENV: undefined }, 'ENV_NOT_STAGING'], [{ APP_ENV: 'production' }, 'ENV_NOT_STAGING'],
    [{ DB_NAME: undefined }, 'CONFIG_INCOMPLETE'], [{ DB_HOST: '' }, 'CONFIG_INCOMPLETE'], [{ DB_USER: undefined }, 'CONFIG_INCOMPLETE'], [{ DB_PASSWORD: undefined }, 'CONFIG_INCOMPLETE'],
    [{ MYSQL_DATABASE: 'otra_base' }, 'CONFIG_AMBIGUOUS'],
    [{ DB_NAME: PRODUCTION_DATABASE }, 'DB_NAME_NOT_STAGING'], [{ DB_NAME: 'u293982346_otra' }, 'DB_NAME_NOT_STAGING'],
    [{ DB_USER: 'u293982346_appuser' }, 'DB_USER_IS_PRODUCTION'],
    [{ APP_URL: 'https://encarmen.org' }, 'APP_URL_NOT_STAGING'], [{ PUBLIC_URL: 'https://www.encarmen.org' }, 'APP_URL_NOT_STAGING'], [{ APP_URL: 'no es url' }, 'APP_URL_INVALID'],
    [{ ENABLE_WP_SYNC: 'true' }, 'AUTOMATIC_SYNC_OR_DDL_ENABLED'], [{ STAGING_ALLOW_SCHEMA_INIT: 'true' }, 'AUTOMATIC_SYNC_OR_DDL_ENABLED'],
  ];
  for (const [patch, code] of cases) {
    const c = conn();
    const result = await verifyStagingIsolation(c, { ...goodEnv, ...patch });
    assert.deepEqual([result.ok, result.code], [false, code], JSON.stringify(patch));
    assert.equal(c.queries.length, 0, 'sin tocar la base: ' + code);
  }
  assert.equal(checkStagingConfiguration(goodEnv), '');
});

test('la identidad efectiva de la base debe ser Staging (no basta el nombre configurado)', async () => {
  assert.equal((await run({ database: PRODUCTION_DATABASE })).code, 'CONNECTED_TO_PRODUCTION');
  assert.equal((await run({ database: 'u293982346_otra' })).code, 'DATABASE_TARGET_MISMATCH');
  assert.equal((await run({ database: null })).code, 'DATABASE_UNKNOWN');
});

test('permisos: cuenta limitada pasa; permisos globales, ajenos, comodín o de producción bloquean', async () => {
  const on = (db, privs) => 'GRANT ' + privs + ' ON `' + db + '`.* TO `u`@`%`';
  const blocked = [
    [[goodGrants[0], on(PRODUCTION_DATABASE, 'SELECT, INSERT, UPDATE')], 'GRANT_ON_PRODUCTION'],
    [[goodGrants[0], on(STAGING_DATABASE, 'SELECT, INSERT, UPDATE'), on(PRODUCTION_DATABASE, 'SELECT')], 'GRANT_ON_PRODUCTION'],
    [[goodGrants[0], on('u293982346_otra', 'SELECT, INSERT, UPDATE')], 'GRANT_ON_OTHER_SCHEMA'],
    [[goodGrants[0], on('u293982346\\_enc%', 'SELECT, INSERT, UPDATE')], 'GRANT_SCHEMA_WILDCARD'],
    [['GRANT ALL PRIVILEGES ON *.* TO `u`@`%`'], 'GLOBAL_PRIVILEGES'],
    [['GRANT SELECT ON *.* TO `u`@`%`', goodGrants[1]], 'GLOBAL_PRIVILEGES'],
    [[goodGrants[0], on(STAGING_DATABASE, 'SELECT, INSERT, UPDATE') + ' WITH GRANT OPTION'], 'GRANT_OPTION_PRESENT'],
    [[goodGrants[0], on(STAGING_DATABASE, 'SELECT')], 'NO_WRITE_PRIVILEGE_ON_STAGING'],
    [[goodGrants[0], 'GRANT `rol` TO `u`@`%`'], 'GRANTS_UNPARSEABLE'],
    [[goodGrants[0], 'GRANT EXECUTE ON PROCEDURE `' + STAGING_DATABASE + '`.`p` TO `u`@`%`'], 'GRANTS_UNPARSEABLE'],
    [[], 'GRANTS_UNREADABLE'],
  ];
  for (const [grants, code] of blocked) assert.equal((await run({ grants })).code, code, code);
  const escaped = [goodGrants[0], on(STAGING_DATABASE.replace('_', '\\_'), 'SELECT, INSERT, UPDATE')];
  assert.equal((await run({ grants: escaped })).ok, true, 'guion bajo escapado en SHOW GRANTS');
});

test('privilegios amplios sobre Staging avisan; con STAGING_REQUIRE_MINIMAL_GRANTS=true bloquean', async () => {
  const grants = [goodGrants[0], 'GRANT ALL PRIVILEGES ON `' + STAGING_DATABASE + '`.* TO `u`@`%`'];
  const lenient = await run({ grants });
  assert.deepEqual([lenient.ok, lenient.warnings], [true, ['BROAD_STAGING_PRIVILEGES']]);
  const strict = await run({ grants }, { ...goodEnv, STAGING_REQUIRE_MINIMAL_GRANTS: 'true' });
  assert.deepEqual([strict.ok, strict.code], [false, 'BROAD_STAGING_PRIVILEGES']);
  const withDelete = [goodGrants[0], 'GRANT SELECT, INSERT, UPDATE, DELETE ON `' + STAGING_DATABASE + '`.* TO `u`@`%`'];
  assert.deepEqual((await run({ grants: withDelete })).warnings, ['BROAD_STAGING_PRIVILEGES']);
});

test('visibilidad de esquemas: producción u otros esquemas de la cuenta bloquean', async () => {
  assert.equal((await run({ schemas: ['information_schema', STAGING_DATABASE, PRODUCTION_DATABASE] })).code, 'PRODUCTION_SCHEMA_VISIBLE');
  assert.equal((await run({ schemas: ['information_schema', STAGING_DATABASE, 'u293982346_otro_sitio'] })).code, 'UNEXPECTED_SCHEMA_VISIBLE');
  assert.equal((await run({ schemas: ['information_schema'] })).code, 'STAGING_SCHEMA_NOT_VISIBLE');
  assert.equal((await run({ schemas: ['information_schema', 'performance_schema', STAGING_DATABASE] })).ok, true);
});

test('marca de entorno dentro de la base: falta, producción, ambigua o de otra base bloquean', async () => {
  const missing = Object.assign(new Error('no table'), { code: 'ER_NO_SUCH_TABLE', errno: 1146 });
  assert.equal((await run({ markerError: missing })).code, 'ENVIRONMENT_MARKER_MISSING');
  assert.equal((await run({ marker: [] })).code, 'ENVIRONMENT_MARKER_MISSING');
  assert.equal((await run({ marker: [{ env_name: 'production', db_name: STAGING_DATABASE }] })).code, 'MARKER_SAYS_PRODUCTION');
  assert.equal((await run({ marker: [{ env_name: 'staging', db_name: STAGING_DATABASE }, { env_name: 'production', db_name: PRODUCTION_DATABASE }] })).code, 'MARKER_SAYS_PRODUCTION');
  assert.equal((await run({ marker: [{ env_name: 'staging', db_name: STAGING_DATABASE }, { env_name: 'staging', db_name: STAGING_DATABASE }] })).code, 'ENVIRONMENT_MARKER_AMBIGUOUS');
  assert.equal((await run({ marker: [{ env_name: 'staging', db_name: 'u293982346_otra' }] })).code, 'ENVIRONMENT_MARKER_MISMATCH');
  assert.equal((await run({ marker: [{ env_name: 'test', db_name: STAGING_DATABASE }] })).code, 'ENVIRONMENT_MARKER_MISMATCH');
});

test('cualquier error de consulta falla cerrado, sin filtrar el mensaje original', async () => {
  for (const failOn of ['DATABASE()', 'SHOW GRANTS', 'SCHEMATA', 'encarmen_environment_marker']) {
    const result = await run({ failOn });
    assert.deepEqual([result.ok, result.code], [false, 'ISOLATION_CHECK_FAILED'], failOn);
    assert.ok(!JSON.stringify(result).includes('synthetic failure'));
  }
  const other = Object.assign(new Error('boom'), { code: 'ER_ACCESS_DENIED_ERROR' });
  assert.equal((await run({ markerError: other })).code, 'ISOLATION_CHECK_FAILED');
});

test('parseGrant interpreta formatos de MariaDB y rechaza lo desconocido', () => {
  const grant = parseGrant('GRANT SELECT (id, name), INSERT ON `' + STAGING_DATABASE.replace('_', '\\_') + '`.`businesses` TO `u`@`%`');
  assert.deepEqual([grant.privileges, grant.schema, grant.table, grant.wildcard], [['SELECT', 'INSERT'], STAGING_DATABASE, 'businesses', false]);
  assert.equal(parseGrant('basura'), null);
  assert.equal(parseGrant('GRANT SELECT ON nodot TO u'), null);
  assert.equal(evaluateGrants(null, STAGING_DATABASE, PRODUCTION_DATABASE, false).code, 'GRANTS_UNREADABLE');
});
