import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  createPublicRegistrationStore, createAttemptLimiter, validatePublicRegistration, mxDigits, RegistrationError,
} from '../src/server/publicRegistrationCore.ts';
import { registerPublicRegistrationRoutes, PUBLIC_REGISTRATION_PATH, ADMIN_REGISTRATION_PATH } from '../src/server/publicRegistrationRoutes.ts';

// MariaDB y el almacén de negocios están SIMULADOS: estas pruebas no demuestran persistencia real.
const ALL_SQL = [];
const NORM = (sql) => sql.replace(/\s+/g, ' ').trim();
const T = 'business_registration_requests';

function makeDb(initial = {}) {
  const s = {
    requests: [], businesses: initial.businesses ?? [{ id: '1081', name: 'Café Sintético', phone: '1112223344', whatsapp: '5556667788' }],
    queries: [], now: 1_700_000_000_000, fail: '', failTimes: Infinity, commitLost: false, noTable: false, connectFail: false,
    canWrite: true, proof: { ok: true, code: 'OK' }, bizMode: '', insertStatus: '', released: 0, connections: 0,
  };
  const tails = { tx: Promise.resolve(), lock: Promise.resolve() };
  const mutex = async (kind) => { let unlock; const previous = tails[kind]; tails[kind] = new Promise((r) => { unlock = r; }); await previous; return unlock; };
  const getConnection = async () => {
    if (s.connectFail) throw new Error('synthetic connection refused');
    s.connections++;
    let working = null; let committed = false; let unlockTx; let unlockLock;
    const rows = () => working || s.requests;
    const conn = {
      async beginTransaction() { unlockTx = await mutex('tx'); working = structuredClone(s.requests); committed = false; },
      async commit() { s.requests = working; committed = true; unlockTx?.(); unlockTx = null; if (s.commitLost) { s.commitLost = false; throw new Error('synthetic lost commit ack'); } },
      async rollback() { if (!committed) working = null; unlockTx?.(); unlockTx = null; },
      release() { s.released++; unlockTx?.(); unlockLock?.(); unlockTx = null; unlockLock = null; },
      async query(sqlRaw, p = []) {
        const sql = NORM(sqlRaw); s.queries.push(sql); ALL_SQL.push(sql);
        if (s.fail && sql.includes(s.fail) && s.failTimes-- > 0) throw new Error('synthetic query failure');
        if (s.noTable && sql.includes(T)) throw Object.assign(new Error('no table'), { code: 'ER_NO_SUCH_TABLE', errno: 1146 });
        if (sql.startsWith('SELECT GET_LOCK')) { unlockLock = await mutex('lock'); return [[{ acquired: 1 }]]; }
        if (sql.startsWith('SELECT RELEASE_LOCK')) { unlockLock?.(); unlockLock = null; return [[{ released: 1 }]]; }
        if (sql === 'SELECT id, name, phone, whatsapp FROM businesses') return [structuredClone(s.businesses)];
        const R = rows();
        if (sql === `SELECT * FROM ${T} WHERE request_key = ?`) return [structuredClone(R.filter((r) => r.request_key === p[0]))];
        if (sql.includes('WHERE ip_hash = ? AND created_at > (NOW() - INTERVAL 1 HOUR)')) return [[{ total: R.filter((r) => r.ip_hash === p[0] && r.created_at.getTime() > s.now - 3600e3).length }]];
        if (sql.includes('WHERE ip_hash = ? AND created_at > (NOW() - INTERVAL 1 DAY)')) return [[{ total: R.filter((r) => r.ip_hash === p[0] && r.created_at.getTime() > s.now - 86400e3).length }]];
        if (sql.startsWith(`SELECT id, name_norm, phone, whatsapp FROM ${T} WHERE status IN`)) return [structuredClone(R.filter((r) => ['pending', 'approving'].includes(r.status)))];
        if (sql.startsWith(`INSERT INTO ${T}`)) {
          assert.doesNotMatch(sql, /ON DUPLICATE/i);
          if (R.some((r) => r.request_key === p[1])) throw new Error('synthetic duplicate key');
          R.push({ id: p[0], request_key: p[1], digest: p[2], status: s.insertStatus || 'pending', name: p[3], name_norm: p[4], phone: p[5], whatsapp: p[6], applicant_email: p[7], payload: p[8], ip_hash: p[9], business_id: null, reject_reason: null, reviewed_by: null, reviewed_at: null, created_at: new Date(s.now) });
          return [{ affectedRows: 1 }];
        }
        if (sql === `SELECT * FROM ${T} WHERE id = ? FOR UPDATE` || sql === `SELECT * FROM ${T} WHERE id = ?`) return [structuredClone(R.filter((r) => r.id === p[0]))];
        if (sql === `UPDATE ${T} SET status = 'approving', reviewed_by = ? WHERE id = ? AND status IN ('pending','approving')`) { const r = R.find((x) => x.id === p[1] && ['pending', 'approving'].includes(x.status)); if (r) { r.status = 'approving'; r.reviewed_by = p[0]; } return [{ affectedRows: r ? 1 : 0 }]; }
        if (sql === `UPDATE ${T} SET status = 'pending' WHERE id = ? AND status = 'approving'`) { const r = R.find((x) => x.id === p[0] && x.status === 'approving'); if (r) r.status = 'pending'; return [{ affectedRows: r ? 1 : 0 }]; }
        if (sql === `UPDATE ${T} SET status = 'approved', business_id = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = 'approving'`) { const r = R.find((x) => x.id === p[2] && x.status === 'approving'); if (r) { r.status = 'approved'; r.business_id = p[0]; r.reviewed_by = p[1]; r.reviewed_at = new Date(s.now); } return [{ affectedRows: r ? 1 : 0 }]; }
        if (sql === `UPDATE ${T} SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = 'pending'`) { const r = R.find((x) => x.id === p[2] && x.status === 'pending'); if (r) { r.status = 'rejected'; r.reject_reason = p[0]; r.reviewed_by = p[1]; r.reviewed_at = new Date(s.now); } return [{ affectedRows: r ? 1 : 0 }]; }
        let m = sql.match(new RegExp(`^SELECT \\* FROM ${T}( WHERE status = \\?)? ORDER BY created_at ASC, id ASC LIMIT \\? OFFSET \\?$`));
        if (m) { const filtered = m[1] ? R.filter((r) => r.status === p[0]) : R; const [limit, offset] = p.slice(-2); return [structuredClone(filtered.slice(offset, offset + limit))]; }
        m = sql.match(new RegExp(`^SELECT COUNT\\(\\*\\) AS total FROM ${T}( WHERE status = \\?)?$`));
        if (m) return [[{ total: (m[1] ? R.filter((r) => r.status === p[0]) : R).length }]];
        throw new Error('Unexpected SQL in isolated model: ' + sql);
      },
    };
    return conn;
  };
  return { s, getConnection };
}

function fakeBusinessStore(db) {
  const calls = [];
  const err = (status, code, may) => Object.assign(new Error(code), { status, code, writeMayHaveSucceeded: may });
  const insert = (draft, key) => {
    const id = String(Math.max(4000, ...db.s.businesses.map((r) => Number(r.id)).filter(Number.isSafeInteger)) + 1);
    db.s.businesses.push({ id, name: draft.name, phone: draft.phone, whatsapp: draft.whatsapp, _key: key });
    return { business: { id: Number(id), name: draft.name }, replayed: false };
  };
  return {
    calls,
    async create(draft, key) {
      calls.push({ draft, key });
      if (db.s.bizMode === 'down') throw err(503, 'BUSINESS_WRITE_UNCONFIRMED', false);
      const replay = db.s.businesses.find((r) => r._key === key);
      if (replay) return { business: { id: Number(replay.id), name: replay.name }, replayed: true };
      const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (db.s.businesses.some((r) => norm(r.name) === norm(draft.name) || [draft.phone, draft.whatsapp].filter(Boolean).some((d) => d === r.phone || d === r.whatsapp))) throw err(409, 'BUSINESS_DUPLICATE', false);
      const created = insert(draft, key);
      if (db.s.bizMode === 'lost-ack') throw err(503, 'BUSINESS_WRITE_UNCONFIRMED', true);
      return created;
    },
  };
}

function setup(options = {}) {
  const db = makeDb(options.db);
  const businessStore = fakeBusinessStore(db);
  const store = createPublicRegistrationStore({
    getConnection: db.getConnection, canWrite: () => db.s.canWrite, verifyIsolation: async () => db.s.proof,
    businessStore, ipSalt: () => 'synthetic-salt-0123456789', limits: options.limits,
  });
  return { db, store, businessStore };
}
const phoneFor = (n) => `93${String(10000000 + n)}`;
const body = (n = 1, extra = {}) => ({ name: `Empresa Sintética ${n}`, category: 'Servicios', colonia: 'Centro', phone: phoneFor(n), applicantEmail: 'dueno@example.com', ...extra });
const submit = (store, n = 1, { key = randomUUID(), ip = '203.0.113.5', extra } = {}) => store.submit({ validated: validatePublicRegistration(body(n, extra)), requestKey: key, ip });
const writes = (db) => db.s.queries.filter((q) => /^(INSERT|UPDATE)/.test(q));
const rejectsWith = (promise, code, extra = () => true) => assert.rejects(promise, (e) => e.code === code && extra(e));

test('validación: acepta datos mínimos, normaliza contactos y nunca infiere WhatsApp del teléfono', () => {
  const { draft, applicantEmail } = validatePublicRegistration(body(1, { phone: '+52 1 938 111 2233', whatsapp: '' }));
  assert.equal(draft.phone, '9381112233'); assert.equal(draft.whatsapp, ''); assert.deepEqual(draft.categories, ['Servicios']); assert.equal(applicantEmail, 'dueno@example.com');
  assert.equal(validatePublicRegistration({ name: 'Solo WhatsApp', category: 'Servicios', whatsapp: '52 938 111 2233' }).draft.phone, '');
  assert.equal(mxDigits('5219381112233'), '9381112233');
  assert.equal(draft.isTopBusiness, undefined);
});

test('validación: rechaza campos desconocidos, honeypot, marcado, contactos y URL inválidos, sin recortar en silencio', () => {
  const bad = [
    { isTopBusiness: true }, { id: 99 }, { hp: 'bot' }, { name: '<script>alert(1)</script>' }, { name: 'A' }, { name: 'x'.repeat(161) },
    { description: 'y'.repeat(501) }, { phone: '123' }, { phone: undefined, whatsapp: undefined }, { phone: phoneFor(1), whatsapp: 'abc' },
    { website: 'javascript:alert(1)' }, { website: 'https://user:pass@example.com' }, { facebook: 'no es url' }, { applicantEmail: 'sin-arroba' },
    { category: undefined }, { name: 'Con\u0000control' }, { colonia: 5 },
  ];
  for (const extra of bad) assert.throws(() => validatePublicRegistration({ ...body(1), ...extra }), (e) => e instanceof RegistrationError && e.status === 400, JSON.stringify(extra));
  assert.throws(() => validatePublicRegistration(null), RegistrationError); assert.throws(() => validatePublicRegistration([]), RegistrationError);
});

test('alta anónima: guarda solicitud pending con lectura posterior, no toca businesses ni publica', async () => {
  const { db, store } = setup();
  const before = JSON.stringify(db.s.businesses);
  const out = await submit(store);
  assert.deepEqual([out.request.status, out.replayed], ['pending', false]);
  assert.equal(db.s.requests.length, 1); assert.equal(db.s.requests[0].status, 'pending'); assert.equal(JSON.stringify(db.s.businesses), before);
  assert.deepEqual(Object.keys(out.request).sort(), ['createdAt', 'id', 'status']);
  const i = db.s.queries.findIndex((q) => q.startsWith('INSERT')); assert.ok(db.s.queries.slice(i + 1).some((q) => q === `SELECT * FROM ${T} WHERE request_key = ?`), 'lectura posterior');
  assert.ok(!JSON.stringify(out).match(/ip_hash|digest|203\.0\.113/));
  assert.notEqual(db.s.requests[0].ip_hash, '203.0.113.5');
});

test('idempotencia: misma clave y datos repiten sin duplicar; otros datos con la misma clave dan 409; clave inválida 400', async () => {
  const { db, store } = setup(); const key = randomUUID();
  const first = await submit(store, 1, { key }); const again = await submit(store, 1, { key });
  assert.deepEqual([again.replayed, again.request.id, db.s.requests.length], [true, first.request.id, 1]);
  await rejectsWith(submit(store, 1, { key, extra: { description: 'distinta' } }), 'IDEMPOTENCY_CONFLICT');
  await rejectsWith(store.submit({ validated: validatePublicRegistration(body(2)), requestKey: 'no-uuid', ip: '1.1.1.1' }), 'REQUEST_KEY_REQUIRED');
  const parallel = await Promise.all([submit(store, 3, { key: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }), submit(store, 3, { key: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })]);
  assert.equal(parallel[0].request.id, parallel[1].request.id); assert.equal(db.s.requests.length, 2);
});

test('duplicados: contra empresas existentes y contra solicitudes pendientes (nombre sin acentos o cualquier contacto)', async () => {
  const { db, store } = setup();
  await rejectsWith(submit(store, 1, { extra: { name: 'CAFE sintetico' } }), 'BUSINESS_DUPLICATE');
  await rejectsWith(submit(store, 1, { extra: { phone: '1112223344' } }), 'BUSINESS_DUPLICATE');
  await rejectsWith(submit(store, 1, { extra: { phone: undefined, whatsapp: '+52 555 666 7788' } }), 'BUSINESS_DUPLICATE');
  await submit(store, 1);
  await rejectsWith(submit(store, 2, { extra: { name: 'empresa sintética 1' } }), 'REQUEST_ALREADY_PENDING');
  await rejectsWith(submit(store, 3, { extra: { phone: phoneFor(1) } }), 'REQUEST_ALREADY_PENDING');
  await rejectsWith(submit(store, 4, { extra: { phone: undefined, whatsapp: phoneFor(1) } }), 'REQUEST_ALREADY_PENDING');
  assert.equal(db.s.requests.length, 1);
  const race = await Promise.allSettled([submit(store, 7), submit(store, 7)]);
  assert.deepEqual(race.map((r) => r.status).sort(), ['fulfilled', 'rejected']); assert.equal(db.s.requests.length, 2);
});

test('antiabuso persistente: límite por IP por hora y por día, cola máxima y IP sin guardar en claro', async () => {
  const { db, store } = setup();
  for (let n = 1; n <= 3; n++) await submit(store, n);
  await rejectsWith(submit(store, 4), 'RATE_LIMITED', (e) => e.status === 429);
  await submit(store, 5, { ip: '198.51.100.9' });
  db.s.now += 61 * 60e3; for (let n = 6; n <= 8; n++) await submit(store, n);
  db.s.now += 61 * 60e3; await rejectsWith(submit(store, 9), 'RATE_LIMITED');
  db.s.now += 25 * 3600e3; await submit(store, 9);
  const small = setup({ limits: { maxPending: 2 } });
  await submit(small.store, 1, { ip: '10.0.0.1' }); await submit(small.store, 2, { ip: '10.0.0.2' });
  await rejectsWith(submit(small.store, 3, { ip: '10.0.0.3' }), 'REGISTRATION_QUEUE_FULL', (e) => e.status === 503);
  assert.ok(db.s.requests.every((r) => /^[a-f0-9]{64}$/.test(r.ip_hash)));
  const limiter = createAttemptLimiter(2, 1000); assert.deepEqual([limiter('a', 0), limiter('a', 1), limiter('a', 2), limiter('b', 2), limiter('a', 1500)], [true, true, false, true, true]);
});

test('errores reales: sin conexión, tabla ausente, INSERT fallido, ACK de commit perdido, escritura deshabilitada o sin sal', async () => {
  let ctx = setup(); ctx.db.s.connectFail = true;
  await rejectsWith(submit(ctx.store), 'STORAGE_UNAVAILABLE', (e) => e.status === 503 && e.writeMayHaveSucceeded === false);
  ctx = setup(); ctx.db.s.noTable = true; await rejectsWith(submit(ctx.store), 'REGISTRATION_STORAGE_NOT_READY');
  ctx = setup(); ctx.db.s.fail = `INSERT INTO ${T}`; await rejectsWith(submit(ctx.store), 'REGISTRATION_WRITE_UNCONFIRMED', (e) => e.writeMayHaveSucceeded === false); assert.equal(ctx.db.s.requests.length, 0);
  ctx = setup(); ctx.db.s.insertStatus = 'approved'; await rejectsWith(submit(ctx.store), 'REGISTRATION_READBACK_FAILED', (e) => e.status === 503); assert.equal(ctx.db.s.requests.length, 0);
  ctx = setup(); ctx.db.s.commitLost = true; const key = randomUUID();
  await rejectsWith(submit(ctx.store, 1, { key }), 'REGISTRATION_WRITE_UNCONFIRMED', (e) => e.writeMayHaveSucceeded === true); assert.equal(ctx.db.s.requests.length, 1);
  assert.equal((await submit(ctx.store, 1, { key })).replayed, true); assert.equal(ctx.db.s.requests.length, 1);
  ctx = setup(); ctx.db.s.canWrite = false; await rejectsWith(submit(ctx.store), 'REGISTRATION_WRITES_DISABLED', (e) => e.status === 403); assert.equal(ctx.db.s.connections, 0);
  const noSalt = createPublicRegistrationStore({ getConnection: ctx.db.getConnection, canWrite: () => true, verifyIsolation: async () => ({ ok: true }), businessStore: ctx.businessStore, ipSalt: () => 'corta' });
  await rejectsWith(noSalt.submit({ validated: validatePublicRegistration(body(1)), requestKey: randomUUID(), ip: 'x' }), 'REGISTRATION_NOT_CONFIGURED');
});

test('aislamiento: sin prueba de aislamiento no hay escrituras; el almacén no se construye sin verificador', async () => {
  const ctx = setup(); ctx.db.s.proof = { ok: false, code: 'CONNECTED_TO_PRODUCTION' };
  const id = randomUUID();
  await rejectsWith(submit(ctx.store), 'STAGING_ISOLATION_UNPROVEN', (e) => e.status === 403 && /CONNECTED_TO_PRODUCTION/.test(e.message));
  await rejectsWith(ctx.store.approve(id, 'admin'), 'STAGING_ISOLATION_UNPROVEN');
  await rejectsWith(ctx.store.reject(id, 'admin', 'motivo'), 'STAGING_ISOLATION_UNPROVEN');
  assert.equal(writes(ctx.db).length, 0); assert.equal(ctx.db.s.released, ctx.db.s.connections);
  const throwing = createPublicRegistrationStore({ getConnection: ctx.db.getConnection, canWrite: () => true, verifyIsolation: async () => { throw new Error('boom'); }, businessStore: ctx.businessStore, ipSalt: () => 'synthetic-salt-0123456789' });
  await rejectsWith(throwing.submit({ validated: validatePublicRegistration(body(1)), requestKey: randomUUID(), ip: 'x' }), 'STAGING_ISOLATION_UNPROVEN');
  for (const deps of [{}, { getConnection() {}, canWrite() {}, businessStore: { create() {} } }, { getConnection() {}, canWrite() {}, verifyIsolation() {} }]) assert.throws(() => createPublicRegistrationStore(deps), /PUBLIC_REGISTRATION_DEPENDENCIES_REQUIRED/);
});

test('aprobación: crea la empresa con el almacén existente (clave = id de solicitud), cierra la solicitud y no toca empresas previas', async () => {
  const { db, store, businessStore } = setup();
  const { request } = await submit(store); const before = JSON.stringify(db.s.businesses[0]);
  const out = await store.approve(request.id, 'admin-1');
  assert.equal(out.request.status, 'approved'); assert.equal(out.request.businessId, String(out.business.id)); assert.equal(out.request.reviewedBy, 'admin-1');
  assert.equal(businessStore.calls.length, 1); assert.equal(businessStore.calls[0].key, request.id); assert.equal(businessStore.calls[0].draft.name, 'Empresa Sintética 1');
  assert.equal(db.s.businesses.length, 2); assert.equal(JSON.stringify(db.s.businesses[0]), before);
  assert.equal(db.s.requests[0].status, 'approved');
  const again = await store.approve(request.id, 'admin-2'); assert.equal(again.replayed, true); assert.equal(db.s.businesses.length, 2);
  await rejectsWith(store.reject(request.id, 'admin', 'tarde'), 'REQUEST_NOT_PENDING');
  await rejectsWith(store.approve(randomUUID(), 'admin'), 'REQUEST_NOT_FOUND', (e) => e.status === 404);
  await rejectsWith(store.approve('no-uuid', 'admin'), 'INVALID_REQUEST_ID');
});

test('aprobación concurrente: dos administradores crean una sola empresa', async () => {
  const { db, store } = setup(); const { request } = await submit(store);
  const [a, b] = await Promise.all([store.approve(request.id, 'a'), store.approve(request.id, 'b')]);
  assert.equal(db.s.businesses.length, 2); assert.equal(a.request.businessId, b.request.businessId); assert.equal(db.s.requests[0].status, 'approved');
});

test('aprobación con duplicado nuevo: error real, solicitud vuelve a pending, no se crea ni sobrescribe nada y puede rechazarse', async () => {
  const { db, store } = setup(); const { request } = await submit(store);
  db.s.businesses.push({ id: '5000', name: 'Empresa Sintética 1', phone: '0000000000', whatsapp: '' }); const snapshot = JSON.stringify(db.s.businesses);
  await rejectsWith(store.approve(request.id, 'admin'), 'BUSINESS_DUPLICATE', (e) => e.status === 409);
  assert.equal(db.s.requests[0].status, 'pending'); assert.equal(JSON.stringify(db.s.businesses), snapshot);
  const out = await store.reject(request.id, 'admin', 'Ya existe en el directorio'); assert.equal(out.request.status, 'rejected'); assert.equal(out.request.rejectReason, 'Ya existe en el directorio');
});

test('aprobación con fallo incierto: queda approving, reintento converge sin duplicar la empresa', async () => {
  let { db, store } = setup(); let { request } = await submit(store);
  db.s.bizMode = 'down'; await rejectsWith(store.approve(request.id, 'admin'), 'BUSINESS_WRITE_UNCONFIRMED', (e) => e.status === 503);
  assert.equal(db.s.requests[0].status, 'approving'); assert.equal(db.s.businesses.length, 1);
  await rejectsWith(store.reject(request.id, 'admin', 'nop'), 'REQUEST_APPROVAL_IN_PROGRESS');
  db.s.bizMode = ''; assert.equal((await store.approve(request.id, 'admin')).request.status, 'approved'); assert.equal(db.s.businesses.length, 2);
  ({ db, store } = setup()); ({ request } = await submit(store));
  db.s.bizMode = 'lost-ack'; await rejectsWith(store.approve(request.id, 'admin'), 'BUSINESS_WRITE_UNCONFIRMED', (e) => e.writeMayHaveSucceeded === true);
  assert.equal(db.s.businesses.length, 2); assert.equal(db.s.requests[0].status, 'approving');
  db.s.bizMode = ''; const healed = await store.approve(request.id, 'admin'); assert.equal(healed.replayed, true); assert.equal(db.s.businesses.length, 2); assert.equal(db.s.requests[0].status, 'approved');
});

test('cierre de la solicitud fallido tras crear la empresa: APPROVAL_NOT_CONFIRMED (no éxito) y el reintento sana', async () => {
  const { db, store } = setup(); const { request } = await submit(store);
  db.s.fail = "SET status = 'approved'"; db.s.failTimes = 1;
  await rejectsWith(store.approve(request.id, 'admin'), 'APPROVAL_NOT_CONFIRMED', (e) => e.status === 503 && e.writeMayHaveSucceeded === true);
  assert.equal(db.s.businesses.length, 2); assert.equal(db.s.requests[0].status, 'approving');
  const out = await store.approve(request.id, 'admin'); assert.equal(out.request.status, 'approved'); assert.equal(db.s.businesses.length, 2);
});

test('rechazo: exige motivo, solo desde pending y confirma por lectura; listado filtra, pagina y oculta datos internos', async () => {
  const { db, store } = setup(); const ids = [];
  for (let n = 1; n <= 3; n++) ids.push((await submit(store, n, { ip: `10.0.0.${n}` })).request.id);
  for (const reason of [undefined, '', 'ab', 'x'.repeat(501), 'con\u0000control']) await rejectsWith(store.reject(ids[0], 'admin', reason), 'REJECT_REASON_REQUIRED');
  await store.reject(ids[0], 'admin', 'Datos incompletos'); await store.approve(ids[1], 'admin');
  const pending = await store.list({ status: 'pending' }); assert.deepEqual([pending.total, pending.items.map((r) => r.id)], [1, [ids[2]]]);
  const all = await store.list({ status: 'all', limit: 2, offset: 1 }); assert.deepEqual([all.total, all.items.length, all.limit, all.offset], [3, 2, 2, 1]);
  const one = (await store.list({ status: 'rejected' })).items[0];
  assert.deepEqual([one.rejectReason, one.reviewedBy, one.draft.name, one.applicantEmail], ['Datos incompletos', 'admin', 'Empresa Sintética 1', 'dueno@example.com']);
  assert.ok(!JSON.stringify(all).match(/ip_hash|request_key|"digest"/));
  await rejectsWith(store.list({ status: 'otro' }), 'INVALID_STATUS'); assert.equal((await store.list({ limit: 9999 })).limit, 100);
  db.s.noTable = true; await rejectsWith(store.list(), 'REGISTRATION_STORAGE_NOT_READY');
});

function harness(options = {}) {
  const ctx = setup(options); const routes = {}; let admin = false; let enabled = true;
  const app = { post: (path, fn) => { routes[`POST ${path}`] = fn; }, get: (path, fn) => { routes[`GET ${path}`] = fn; } };
  registerPublicRegistrationRoutes(app, { store: ctx.store, isAdmin: (req) => req.admin === true, actor: () => 'sesion-admin', enabled: () => enabled, attempts: createAttemptLimiter(options.attempts ?? 50, 60000), validate: validatePublicRegistration });
  const call = async (method, path, { body: payload, headers = {}, ip = '203.0.113.5', params = {}, query = {}, asAdmin = false } = {}) => {
    const out = { status: 200 }; const res = { status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } };
    await routes[`${method} ${path}`]({ body: payload, ip, params, query, admin: asAdmin, get: (h) => headers[h] }, res); return out;
  };
  return { ...ctx, routes, call, setEnabled: (v) => { enabled = v; } };
}

test('rutas: solo cuatro rutas; la pública es anónima y POST; las administrativas exigen sesión', async () => {
  const h = harness();
  assert.deepEqual(Object.keys(h.routes).sort(), [`GET ${ADMIN_REGISTRATION_PATH}`, `POST ${ADMIN_REGISTRATION_PATH}/:id/approve`, `POST ${ADMIN_REGISTRATION_PATH}/:id/reject`, `POST ${PUBLIC_REGISTRATION_PATH}`].sort());
  const created = await h.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(1), headers: { 'Idempotency-Key': randomUUID() } });
  assert.equal(created.status, 201); assert.equal(created.body.request.status, 'pending'); assert.match(created.body.message, /todavía no está publicada/); assert.equal(created.body.business, undefined);
  const id = created.body.request.id;
  assert.equal((await h.call('GET', ADMIN_REGISTRATION_PATH)).status, 401);
  assert.equal((await h.call('POST', `${ADMIN_REGISTRATION_PATH}/:id/approve`, { params: { id } })).status, 401);
  assert.equal((await h.call('POST', `${ADMIN_REGISTRATION_PATH}/:id/reject`, { params: { id }, body: { reason: 'xyz' } })).status, 401);
  assert.equal(h.db.s.requests[0].status, 'pending'); assert.equal(h.db.s.businesses.length, 1);
  const listed = await h.call('GET', ADMIN_REGISTRATION_PATH, { asAdmin: true, query: { status: 'pending' } }); assert.equal(listed.body.total, 1);
  const approved = await h.call('POST', `${ADMIN_REGISTRATION_PATH}/:id/approve`, { params: { id }, asAdmin: true });
  assert.equal(approved.status, 200); assert.equal(approved.body.request.reviewedBy, 'sesion-admin'); assert.equal(h.db.s.businesses.length, 2);
});

test('rutas: errores reales con código HTTP correcto, sin filtrar mensajes internos ni éxitos simulados', async () => {
  const h = harness({ attempts: 7 }); const key = randomUUID();
  assert.equal((await h.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(1) })).body.error, 'REQUEST_KEY_REQUIRED');
  assert.equal((await h.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(1, { hp: 'x' }), headers: { 'Idempotency-Key': key } })).body.error, 'SPAM_REJECTED');
  assert.equal((await h.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(1, { isTopBusiness: true }), headers: { 'Idempotency-Key': key } })).status, 400);
  assert.equal(h.db.s.requests.length, 0);
  assert.equal((await h.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(1), headers: { 'Idempotency-Key': key } })).status, 201);
  assert.equal((await h.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(1), headers: { 'Idempotency-Key': key } })).status, 200);
  assert.equal((await h.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(1, { name: 'Café Sintético' }), headers: { 'Idempotency-Key': randomUUID() } })).status, 409);
  h.db.s.connectFail = true; const down = await h.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(2), headers: { 'Idempotency-Key': randomUUID() } });
  assert.deepEqual([down.status, down.body.success, down.body.error], [503, false, 'STORAGE_UNAVAILABLE']);
  const limited = await h.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(3), headers: { 'Idempotency-Key': randomUUID() } }); assert.equal(limited.status, 429);
  const off = harness(); off.setEnabled(false); const disabled = await off.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(1), headers: { 'Idempotency-Key': randomUUID() } });
  assert.deepEqual([disabled.status, disabled.body.error], [403, 'PUBLIC_REGISTRATION_DISABLED']); assert.equal(off.db.s.connections, 0);
  const odd = harness(); odd.store.submit = async () => { throw new Error('secreto interno de prueba'); };
  const leaked = await odd.call('POST', PUBLIC_REGISTRATION_PATH, { body: body(1), headers: { 'Idempotency-Key': randomUUID() } }); assert.equal(leaked.status, 503); assert.doesNotMatch(JSON.stringify(leaked.body), /secreto/);
});

test('SQL: solo SELECT sobre businesses; escrituras únicamente en business_registration_requests; sin DDL, DELETE ni upsert', () => {
  assert.ok(ALL_SQL.length > 50);
  for (const sql of ALL_SQL) {
    assert.doesNotMatch(sql, /\b(DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE)\b|ON DUPLICATE/i, sql);
    if (/^(INSERT|UPDATE)/.test(sql)) assert.match(sql, new RegExp(`^(INSERT INTO|UPDATE) ${T}\\b`), sql);
    if (/businesses/.test(sql)) assert.equal(sql, 'SELECT id, name, phone, whatsapp FROM businesses');
  }
});
