import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  createPublicRegistrationService, createPoolReaders, createAttemptLimiter, createCreationLimiter, validatePublicRegistration, mxDigits, RegistrationError, PUBLIC_SOURCE,
} from '../src/server/publicRegistrationCore.ts';
import { registerPublicRegistrationRoutes, publicRegistrationBodyLimit, PUBLIC_REGISTRATION_PATH, PUBLIC_BODY_LIMIT_BYTES } from '../src/server/publicRegistrationRoutes.ts';
import { mountPublicRegistration } from '../src/server/publicRegistrationWiring.ts';

// MariaDB y el almacén de negocios están SIMULADOS: estas pruebas no demuestran persistencia real.
const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const phoneFor = (n) => `93${String(10000000 + n)}`;
const body = (n = 1, extra = {}) => ({ name: `Empresa Sintética ${n}`, category: 'Servicios', colonia: 'Centro', phone: phoneFor(n), ...extra });
const err = (status, code, may) => Object.assign(new Error(code), { status, code, writeMayHaveSucceeded: may });

function makeWorld(options = {}) {
  const w = {
    rows: options.rows ?? [{ id: 1081, name: 'Café Sintético', phone: '1112223344', whatsapp: '5556667788', status: 'published', _key: null }],
    directory: [], storeCalls: [], readCalls: 0, savedCalls: 0, mode: '', readMode: '', counts: { hour: 0, day: 0 }, countFails: false, canWrite: true, cacheThrows: false,
  };
  w.store = {
    async create(draft, key) {
      w.storeCalls.push({ draft: structuredClone(draft), key });
      if (w.mode === 'down') throw err(503, 'BUSINESS_WRITE_UNCONFIRMED', false);
      if (w.mode === 'raw') throw new Error('driver exploded');
      const digest = createHash('sha256').update(JSON.stringify(draft)).digest('hex');
      const replay = w.rows.find((r) => r._key === key);
      if (replay) { if (replay._digest !== digest) throw err(409, 'IDEMPOTENCY_CONFLICT', false); return { business: { ...replay }, replayed: true }; }
      if (w.rows.some((r) => norm(r.name) === norm(draft.name) || [draft.phone, draft.whatsapp].filter(Boolean).some((d) => d === r.phone || d === r.whatsapp))) throw err(409, 'BUSINESS_DUPLICATE', false);
      const id = Math.max(4000, ...w.rows.map((r) => Number(r.id))) + 1;
      const row = { ...draft, id, status: 'published', slug: norm(draft.name), _key: key, _digest: digest };
      w.rows.push(row);
      if (w.mode === 'lost-ack') throw err(503, 'BUSINESS_WRITE_UNCONFIRMED', true);
      return { business: { ...row }, replayed: false };
    },
  };
  const service = createPublicRegistrationService({
    canWrite: () => w.canWrite, businessStore: w.store, limits: options.limits,
    hasPublicReplay: async key=>w.rows.some(row=>row._key===key),
    countRecentPublic: async () => { if (w.countFails) throw err(503, 'STORAGE_UNAVAILABLE', false); return w.counts; },
    readBusiness: async (id) => {
      w.readCalls++;
      if (w.readMode === 'missing') return null;
      if (w.readMode === 'throw') throw new Error('read exploded');
      const row = w.rows.find((r) => String(r.id) === String(id));
      if (!row) return null;
      return w.readMode === 'mismatch' ? { ...row, whatsapp: '9999999999' } : { id: row.id, name: row.name, phone: row.phone, whatsapp: row.whatsapp, status: row.status };
    },
    onSaved: (b) => { w.savedCalls++; if (w.cacheThrows) throw new Error('cache'); w.directory = [b, ...w.directory.filter((x) => String(x.id) !== String(b.id))]; },
    isVisible: (id) => w.directory.some((b) => String(b.id) === String(id) && (b.status || 'published') === 'published'),
    categorySlugs: (cats) => cats.map((c) => norm(c)),
  });
  w.service = service;
  return w;
}
const submit = (w, n = 1, { key = randomUUID(), extra } = {}) => w.service.submit({ validated: validatePublicRegistration(body(n, extra)), requestKey: key });
const rejectsWith = (promise, code, check = () => true) => assert.rejects(promise, (e) => e.code === code && check(e));

test('validación: acepta datos mínimos, teléfono y WhatsApp independientes, sin campos administrativos', () => {
  const { draft } = validatePublicRegistration(body(1, { phone: '+52 1 938 111 2233', whatsapp: '' }));
  assert.deepEqual([draft.phone, draft.whatsapp, draft.categories], ['9381112233', '', ['Servicios']]);
  assert.equal(validatePublicRegistration({ name: 'Solo WhatsApp', category: 'Servicios', whatsapp: '52 938 111 2233' }).draft.phone, '');
  const both = validatePublicRegistration(body(2, { whatsapp: '9381234567' })).draft; assert.deepEqual([both.phone, both.whatsapp], [phoneFor(2), '9381234567']);
  assert.equal(mxDigits('5219381112233'), '9381112233'); assert.equal(draft.isTopBusiness, undefined); assert.equal(draft.status, undefined);
});

test('validación: rechaza campos desconocidos o privilegiados, honeypot, marcado, contactos y URL inválidos', () => {
  const bad = [
    { isTopBusiness: true }, { isRecommended: true }, { id: 99 }, { status: 'published' }, { slug: 'x' }, { rating: 5 }, { applicantEmail: 'a@b.co' }, { clearContacts: ['phone'] },
    { hp: 'bot' }, { name: '<script>alert(1)</script>' }, { name: 'A' }, { name: 'x'.repeat(161) }, { description: 'y'.repeat(501) },
    { phone: '123' }, { phone: undefined, whatsapp: undefined }, { phone: phoneFor(1), whatsapp: 'abc' },
    { website: 'javascript:alert(1)' }, { website: 'https://user:pass@example.com' }, { facebook: 'no es url' }, { category: undefined }, { name: 'Con\u0000control' }, { colonia: 5 },
  ];
  for (const extra of bad) assert.throws(() => validatePublicRegistration({ ...body(1), ...extra }), (e) => e instanceof RegistrationError && e.status === 400, JSON.stringify(extra));
  assert.throws(() => validatePublicRegistration(null), RegistrationError); assert.throws(() => validatePublicRegistration([]), RegistrationError);
});

test('flujo completo: INSERT mediante el almacén, lectura independiente, publicado y visible, ID en la respuesta', async () => {
  const w = makeWorld(); const key = randomUUID();
  const out = await submit(w, 1, { key });
  assert.equal(w.rows.length, 2); const row = w.rows[1];
  assert.deepEqual([out.business.id, out.replayed, out.directoryVisible], [row.id, false, true]);
  assert.equal(w.storeCalls.length, 1); assert.equal(w.storeCalls[0].key, key);
  const sent = w.storeCalls[0].draft;
  assert.deepEqual([sent.registrationSource, sent.categorySlugs, sent.phone, sent.whatsapp], [PUBLIC_SOURCE, ['servicios'], phoneFor(1), '']);
  assert.equal(w.readCalls, 1, 'lectura de confirmación posterior al INSERT');
  assert.equal(row.status, 'published'); assert.equal(w.directory[0].id, row.id); assert.equal(w.savedCalls, 1);
  assert.deepEqual([w.rows[0].name, w.rows[0].phone, w.rows[0].whatsapp], ['Café Sintético', '1112223344', '5556667788']);
});

test('sin etapa de revisión: ni tabla de solicitudes, ni estados, ni permisos administrativos, ni SQL propio de escritura', () => {
  for (const file of ['publicRegistrationCore', 'publicRegistrationRoutes', 'publicRegistrationWiring']) {
    const source = readFileSync(new URL(`../src/server/${file}.ts`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /pending|approv|business_registration_requests|isAdmin|x-encarmen-admin-token/i, file);
    assert.doesNotMatch(source, /\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|ON\s+DUPLICATE|DROP|ALTER|CREATE\s+TABLE)\b/i, file);
  }
});

test('idempotencia: misma clave repite sin duplicar; otros datos con la misma clave dan 409 sin tocar la fila', async () => {
  const w = makeWorld(); const key = randomUUID();
  const first = await submit(w, 1, { key }); const again = await submit(w, 1, { key });
  assert.deepEqual([again.replayed, again.business.id, w.rows.length], [true, first.business.id, 2]);
  const snapshot = JSON.stringify(w.rows);
  await rejectsWith(submit(w, 1, { key, extra: { description: 'distinta' } }), 'IDEMPOTENCY_CONFLICT', (e) => e.status === 409);
  assert.equal(JSON.stringify(w.rows), snapshot);
  await rejectsWith(w.service.submit({ validated: validatePublicRegistration(body(2)), requestKey: 'no-uuid' }), 'REQUEST_KEY_REQUIRED');
  assert.equal(w.storeCalls.length, 3);
});

test('duplicados: nombre (sin acentos/mayúsculas) o cualquier contacto; nunca sobrescribe empresas existentes', async () => {
  const w = makeWorld(); const snapshot = JSON.stringify(w.rows);
  await rejectsWith(submit(w, 1, { extra: { name: 'CAFE sintetico' } }), 'BUSINESS_DUPLICATE', (e) => e.status === 409);
  await rejectsWith(submit(w, 1, { extra: { phone: '1112223344' } }), 'BUSINESS_DUPLICATE');
  await rejectsWith(submit(w, 1, { extra: { phone: undefined, whatsapp: '+52 555 666 7788' } }), 'BUSINESS_DUPLICATE');
  assert.equal(JSON.stringify(w.rows), snapshot); assert.equal(w.savedCalls, 0); assert.equal(w.directory.length, 0);
  await submit(w, 1); await rejectsWith(submit(w, 1), 'BUSINESS_DUPLICATE'); assert.equal(w.rows.length, 2);
});

test('reintento idempotente funciona con cupo global agotado y no consume nuevos cupos por IP', async () => {
  const w=makeWorld();const key=randomUUID();await submit(w,1,{key});w.counts={hour:30,day:200};
  assert.equal((await submit(w,1,{key})).replayed,true);assert.equal(w.rows.length,2);
  await rejectsWith(submit(w,2),'REGISTRATION_CAPACITY');
  const limit=createCreationLimiter(1,1000);const other=randomUUID();
  assert.equal(limit('ip',0,key),true);assert.equal(limit('ip',1,key),true);assert.equal(limit('ip',2,other),false);assert.equal(limit('ip',1001,other),true);
});

test('errores reales de MariaDB: nada se guarda, nada se publica y nunca hay éxito simulado', async () => {
  let w = makeWorld(); w.mode = 'down';
  await rejectsWith(submit(w), 'BUSINESS_WRITE_UNCONFIRMED', (e) => e.status === 503); assert.deepEqual([w.rows.length, w.savedCalls, w.directory.length], [1, 0, 0]);
  w = makeWorld(); w.mode = 'raw'; await rejectsWith(submit(w), 'STORAGE_UNAVAILABLE', (e) => e.status === 503 && e.writeMayHaveSucceeded === true); assert.equal(w.savedCalls, 0);
  w = makeWorld(); w.countFails = true; await rejectsWith(submit(w), 'STORAGE_UNAVAILABLE'); assert.equal(w.storeCalls.length, 0);
  for (const readMode of ['missing', 'mismatch', 'throw']) {
    w = makeWorld(); w.readMode = readMode;
    await rejectsWith(submit(w), 'REGISTRATION_READBACK_FAILED', (e) => e.status === 503 && e.writeMayHaveSucceeded === true);
    assert.deepEqual([w.savedCalls, w.directory.length], [0, 0], readMode);
  }
  w = makeWorld(); const key = randomUUID(); w.mode = 'lost-ack';
  await rejectsWith(submit(w, 1, { key }), 'BUSINESS_WRITE_UNCONFIRMED', (e) => e.writeMayHaveSucceeded === true); assert.equal(w.rows.length, 2);
  w.mode = ''; const retry = await submit(w, 1, { key }); assert.deepEqual([retry.replayed, w.rows.length, retry.directoryVisible], [true, 2, true]);
});

test('sin visibilidad confirmada no se anuncia publicación exitosa', async () => {
  const w = makeWorld(); w.cacheThrows = true;
  await rejectsWith(submit(w), 'REGISTRATION_VISIBILITY_UNCONFIRMED', e=>e.status===503 && e.writeMayHaveSucceeded===true);
});

test('compuertas: sin escritura habilitada no se consulta ni se escribe; tope global por hora y por día', async () => {
  let w = makeWorld(); w.canWrite = false; await rejectsWith(submit(w), 'PUBLIC_REGISTRATION_DISABLED', (e) => e.status === 403);
  assert.deepEqual([w.storeCalls.length, w.readCalls], [0, 0]);
  w = makeWorld(); w.counts = { hour: 30, day: 30 }; await rejectsWith(submit(w), 'REGISTRATION_CAPACITY', (e) => e.status === 429); assert.equal(w.storeCalls.length, 0);
  w = makeWorld(); w.counts = { hour: 1, day: 200 }; await rejectsWith(submit(w), 'REGISTRATION_CAPACITY');
  w = makeWorld({ limits: { perHour: 2 } }); w.counts = { hour: 1, day: 1 }; await submit(w);
  for (const deps of [{}, { canWrite() {}, businessStore: { create() {} }, countRecentPublic() {} }, { canWrite() {}, countRecentPublic() {}, readBusiness() {} }]) assert.throws(() => createPublicRegistrationService(deps), /PUBLIC_REGISTRATION_DEPENDENCIES_REQUIRED/);
  const limiter = createAttemptLimiter(2, 1000); assert.deepEqual([limiter('a', 0), limiter('a', 1), limiter('a', 2), limiter('b', 2), limiter('a', 1500)], [true, true, false, true, true]);
});

function harness(options = {}) {
  const w = makeWorld(options); const routes = {}; let enabled = true;
  const app = { post: (path, fn) => { routes[`POST ${path}`] = fn; }, get: (path, fn) => { routes[`GET ${path}`] = fn; }, put: (p) => { routes[`PUT ${p}`] = true; }, patch: (p) => { routes[`PATCH ${p}`] = true; }, delete: (p) => { routes[`DELETE ${p}`] = true; } };
  registerPublicRegistrationRoutes(app, { service: w.service, enabled: () => enabled, attempts: createAttemptLimiter(options.attempts ?? 50, 60000), creations: createAttemptLimiter(options.creations ?? 50, 60000), validate: validatePublicRegistration });
  const call = async (payload, { key, ip = '203.0.113.5' } = {}) => {
    const out = { status: 200 }; const res = { status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } };
    await routes[`POST ${PUBLIC_REGISTRATION_PATH}`]({ body: payload, ip, get: (h) => (h === 'Idempotency-Key' ? key : undefined) }, res); return out;
  };
  return { w, routes, call, setEnabled: (v) => { enabled = v; } };
}

test('ruta pública: una sola ruta anónima; 201 con ID solo tras confirmar; la empresa aparece de inmediato en el directorio', async () => {
  const h = harness();
  assert.deepEqual(Object.keys(h.routes), [`POST ${PUBLIC_REGISTRATION_PATH}`]);
  const created = await h.call(body(1), { key: randomUUID() });
  assert.equal(created.status, 201); assert.equal(created.body.success, true); assert.equal(created.body.directoryVisible, true);
  assert.equal(created.body.business.status, 'published'); assert.equal(created.body.business.whatsapp, ''); assert.equal(created.body.business.phone, phoneFor(1));
  assert.ok(h.w.directory.some((b) => b.id === created.body.business.id)); assert.match(created.body.message, /publicada/);
  const key = randomUUID(); assert.equal((await h.call(body(2), { key })).status, 201); assert.equal((await h.call(body(2), { key })).status, 200);
});

test('ruta pública: errores HTTP reales, abuso limitado, sin filtrar detalles internos y sin escrituras en rechazos', async () => {
  const h = harness({ attempts: 8, creations: 4 }); const k = () => randomUUID();
  assert.equal((await h.call(body(1))).body.error, 'REQUEST_KEY_REQUIRED');
  assert.equal((await h.call(body(1, { hp: 'x' }), { key: k() })).body.error, 'SPAM_REJECTED');
  assert.equal((await h.call(body(1, { isTopBusiness: true }), { key: k() })).status, 400);
  assert.equal(h.w.storeCalls.length, 0);
  assert.equal((await h.call(body(1, { name: 'Café Sintético' }), { key: k() })).status, 409);
  h.w.mode = 'down'; const down = await h.call(body(2), { key: k() }); assert.deepEqual([down.status, down.body.success, down.body.error], [503, false, 'BUSINESS_WRITE_UNCONFIRMED']);
  h.w.mode = 'raw'; const raw = await h.call(body(3), { key: k() }); assert.equal(raw.status, 503); assert.doesNotMatch(JSON.stringify(raw.body), /exploded/);
  h.w.mode = ''; assert.equal((await h.call(body(4), { key: k() })).status, 429, 'tope por IP de registros válidos');
  const off = harness(); off.setEnabled(false); const disabled = await off.call(body(1), { key: k() });
  assert.deepEqual([disabled.status, disabled.body.error, off.w.storeCalls.length], [403, 'PUBLIC_REGISTRATION_DISABLED', 0]);
  const flood = harness({ attempts: 2 }); await flood.call(body(1), { key: k() }); await flood.call({}, { key: k() }); assert.equal((await flood.call(body(2), { key: k() })).status, 429);
});

test('límite de cuerpo: exige Content-Length y rechaza envíos grandes antes del analizador JSON global', () => {
  const run = (req) => { const out = { next: false }; const res = { status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } }; publicRegistrationBodyLimit(req, res, () => { out.next = true; }); return out; };
  assert.equal(run({ method: 'POST', headers: { 'content-length': '900' } }).next, true);
  assert.equal(run({ method: 'POST', headers: { 'content-length': String(PUBLIC_BODY_LIMIT_BYTES + 1) } }).status, 413);
  assert.equal(run({ method: 'POST', headers: {} }).status, 411);
  assert.equal(run({ method: 'GET', headers: {} }).next, true);
});

test('montaje: solo en Staging, una ruta POST, interruptor PUBLIC_REGISTRATION_ENABLED y lecturas SQL de solo consulta', async () => {
  const registered = []; const app = { post: (p, fn) => registered.push([p, fn]), get() { throw new Error('no GET'); }, put() { throw new Error('no PUT'); }, patch() { throw new Error('no PATCH'); }, delete() { throw new Error('no DELETE'); } };
  const queries = []; const rows = [{ id: 4001, name: 'Empresa Sintética 1', phone: phoneFor(1), whatsapp: '', status: 'published' }];
  const pool = { async query(sql, params) { queries.push({ sql, params }); if (sql.startsWith('SELECT COALESCE')) return [[{ hour_total: '2', day_total: 5 }]]; return [rows.filter((r) => String(r.id) === params[0])]; } };
  const store = { async create(draft, key) { return { business: { id: 4001, name: draft.name, status: 'published' }, replayed: false }; } };
  let privateEnabled=false;
  const directory = []; const base = { canWrite: () => true, getPool: () => pool, businessStore: store, saved: (b) => directory.push(b), isVisible: (id) => directory.some((b) => b.id === id),
    privateRegistrationSnapshot:()=>({APP_ENV:'staging',DB_NAME:'u293982346_encarmentest',PUBLIC_REGISTRATION_ENABLED:privateEnabled?'true':'false'}) };
  mountPublicRegistration(app, { ...base, isStaging: () => false }); assert.equal(registered.length, 0);
  mountPublicRegistration(app, { ...base, isStaging: () => true }); assert.deepEqual(registered.map(([p]) => p), [PUBLIC_REGISTRATION_PATH]);
  const call = async () => { const out = { status: 200 }; const res = { status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } }; await registered[0][1]({ body: body(1), ip: '1.1.1.1', get: () => randomUUID() }, res); return out; };
  assert.equal((await call()).body.error, 'PUBLIC_REGISTRATION_DISABLED'); assert.equal(queries.length, 0);
  privateEnabled=true; const ok = await call();
  assert.deepEqual([ok.status, ok.body.business.id, ok.body.directoryVisible], [201, 4001, true]);
  assert.ok(queries.length === 3 && queries.every((q) => /^SELECT /.test(q.sql)));
  assert.match(queries[0].params[0], /"registrationSource":"public-form"/); assert.deepEqual(queries[2].params, ['4001']);
  const readers = createPoolReaders(() => null); await rejectsWith(readers.readBusiness(1), 'STORAGE_UNAVAILABLE');
  const broken = createPoolReaders(() => ({ query: async () => { throw new Error('conn lost'); } })); await rejectsWith(broken.countRecentPublic(), 'STORAGE_UNAVAILABLE', (e) => e.status === 503);
});
