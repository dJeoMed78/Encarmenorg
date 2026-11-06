import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBusinessAllocationLock } from '../server.ts';

// No real database, external network, staging writes or deployment.
test('GET_LOCK se mantiene hasta finalizar persistencia y lectura posterior', async () => {
  const events = [];
  const pool = { getConnection: async () => ({
    query: async sql => {
      if (sql.includes('GET_LOCK')) { events.push('lock'); return [[{acquired:1}]]; }
      if (sql.includes('RELEASE_LOCK')) { events.push('unlock'); return [[{released:1}]]; }
      throw new Error('Unexpected SQL');
    },
    release: () => events.push('release-connection')
  }) };
  const value = await withBusinessAllocationLock(pool, async () => {
    events.push('allocate');
    await Promise.resolve();
    events.push('persist');
    await Promise.resolve();
    events.push('readback');
    return 42;
  });
  assert.equal(value, 42);
  assert.deepEqual(events, ['lock','allocate','persist','readback','unlock','release-connection']);
});

for (const acquired of [0, null]) {
  test('Bloqueo denegado '+String(acquired)+' impide toda escritura', async () => {
    let invoked = false;
    const pool = { getConnection: async () => ({
      query: async () => [[{acquired}]],
      release: () => {}
    }) };
    await assert.rejects(withBusinessAllocationLock(pool, async () => {
      invoked = true;
    }), /No se adquirió/);
    assert.equal(invoked, false);
  });
}

test('Error al adquirir bloqueo impide publicación', async () => {
  let invoked = false;
  const pool = { getConnection: async () => ({
    query: async () => { throw new Error('MariaDB desconectado'); },
    release: () => {}
  }) };
  await assert.rejects(withBusinessAllocationLock(pool, async () => { invoked = true; }), /MariaDB desconectado/);
  assert.equal(invoked, false);
});

test('Excepción durante guardado libera bloqueo en finally', async () => {
  const events = [];
  const pool = { getConnection: async () => ({
    query: async sql => {
      if (sql.includes('GET_LOCK')) { events.push('lock'); return [[{acquired:1}]]; }
      events.push('unlock');
      return [[{released:1}]];
    },
    release: () => events.push('release-connection')
  }) };
  await assert.rejects(withBusinessAllocationLock(pool, async () => {
    events.push('persist');
    throw new Error('Falla de escritura');
  }), /Falla de escritura/);
  assert.deepEqual(events, ['lock','persist','unlock','release-connection']);
});

test('Coexistencia: código combinado conserva las rutas reales de ambos radares', () => {
  const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  for (const route of [
    "/api/classifieds/radar-search",
    "/api/classifieds/batch-approve",
    "/api/businesses/approve-candidate",
    "/api/businesses/approve-multiple-candidates"
  ]) assert.ok(source.includes(route), 'Ruta faltante: '+route);
  assert.match(source, /dbCreateRadarClassifiedOnce/);
  assert.match(source, /createBusinessApprovalHandlers/);
});
