import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  createClassifiedsService, registerPublicClassifieds, validateClassifiedInput,
  ClassifiedsError, ISOLATION_MARKER, CLASSIFIED_TTL_DAYS, validateClassifiedPatch,
} from '../src/server/publicClassifieds.ts';

const NOW = new Date('2026-01-01T00:00:00Z');
const VALID = { title: 'Bicicleta rodada 26', description: 'Bicicleta en buen estado, poco uso.', category: 'compra-venta', price: 1500, contactPhone: '9381112233', contactWhatsapp: '9382223344', idempotencyKey: 'idem-12345678' };

import {FakePool} from './support/classifiedsMemoryPool.mjs';

const service = (pool) => createClassifiedsService({ pool, now: () => NOW });
const rejects = (promise, code, extra) => assert.rejects(promise, (e) => e instanceof ClassifiedsError && e.code === code && (!extra || extra(e)));

test('validación cerrada rechaza campos inválidos', async () => {
  for (const bad of [
    { ...VALID, title: 'abc' },
    { ...VALID, description: 'corta' },
    { ...VALID, category: 'x' },
    { ...VALID, contactPhone: '123' },
    { ...VALID, imageUrl: 'https://evil.example/x.png' },
    { ...VALID, idempotencyKey: 'corto' },
    { ...VALID, price: -1 },
  ]) {
    await rejects(service(new FakePool()).create(bad), 'VALIDATION_FAILED');
  }
  const norm = validateClassifiedInput(VALID);
  assert.equal(norm.contactPhone, '9381112233');
  assert.equal(validateClassifiedInput({ ...VALID, category: 'mascotas' }).category, 'mascotas');
  assert.equal(validateClassifiedInput({ ...VALID, category: 'eventos' }).category, 'eventos');
  await rejects(service(new FakePool()).create({ ...VALID, imageUrl: '/uploads/photo.jpg' }), 'VALIDATION_FAILED');
});

test('POST válido persiste, confirma con lectura posterior y devuelve contrato', async () => {
  const pool = new FakePool();
  const result = await service(pool).create(VALID);
  assert.equal(result.duplicate, false);
  assert.equal(result.classified.status, 'active');
  assert.equal(result.classified.contactPhone, '9381112233');
  assert.equal(result.classified.phone, '9381112233');
  assert.equal(result.classified.whatsapp, '9382223344');
  assert.ok(result.ownerToken);
  assert.equal(pool.rows.size, 1);
});

test('idempotencia: misma clave devuelve el mismo anuncio sin duplicar', async () => {
  const pool = new FakePool();
  const s = service(pool);
  const first = await s.create(VALID);
  const second = await s.create(VALID);
  assert.equal(first.classified.id, second.classified.id);
  assert.equal(second.duplicate, true);
  assert.equal(pool.rows.size, 1);
});

test('duplicado: misma clave con datos distintos se rechaza', async () => {
  const pool = new FakePool();
  const s = service(pool);
  await s.create(VALID);
  await rejects(s.create({ ...VALID, title: 'Otro título distinto' }), 'IDEMPOTENCY_CONFLICT');
});

test('idempotencia: misma clave pero distinta descripción o precio no es replay', async () => {
  const pool = new FakePool();
  const s = service(pool);
  await s.create(VALID);
  await rejects(s.create({ ...VALID, description: 'Otro artículo y descripción diferente' }), 'IDEMPOTENCY_CONFLICT');
  await rejects(s.create({ ...VALID, price: 1800 }), 'IDEMPOTENCY_CONFLICT');
  assert.equal(pool.rows.size, 1);
});

test('anuncio vencido no puede editarse o reactivarse por titular', async () => {
  const pool = new FakePool();
  const s = service(pool);
  const { classified, ownerToken } = await s.create(VALID);
  pool.rows.get(classified.id).expires_at = new Date(NOW.getTime() - 1000);
  await rejects(s.update(classified.id, ownerToken, { status: 'active' }), 'CLASSIFIED_EXPIRED');
});

test('fallo SQL en INSERT: error confirmado, sin mutación de caché', async () => {
  const pool = new FakePool();
  pool.failInsert = true;
  await rejects(service(pool).create(VALID), 'CLASSIFIEDS_WRITE_UNCONFIRMED', (e) => e.uncertain === true);
  assert.equal(pool.rows.size, 0);
});

test('fallo de lectura tras UPDATE responde incertidumbre, no falso éxito', async () => {
  const pool = new FakePool();
  const s = service(pool);
  const { classified, ownerToken } = await s.create(VALID);
  const originalQuery = pool.query.bind(pool);
  pool.query = async (sql, params) => {
    const result = await originalQuery(sql, params);
    if (/UPDATE public_classifieds/.test(sql)) pool.failReadback = true;
    return result;
  };
  await rejects(s.update(classified.id, ownerToken, { title: 'Título actualizado' }), 'CLASSIFIEDS_WRITE_UNCONFIRMED', e => e.uncertain === true);
});

test('resultado incierto: INSERT ok pero lectura posterior falla', async () => {
  const pool = new FakePool();
  pool.failReadback = true;
  await rejects(service(pool).create(VALID), 'CLASSIFIEDS_WRITE_UNCONFIRMED', (e) => e.uncertain === true);
});

test('GET devuelve solo activos vigentes y expira los vencidos', async () => {
  const pool = new FakePool();
  const s = service(pool);
  const created = await s.create(VALID);
  pool.rows.get(created.classified.id).expires_at = new Date(NOW.getTime() - 1000);
  const expired = await s.create({ ...VALID, idempotencyKey: 'idem-expirado1', title: 'Anuncio expirado' });
  pool.rows.get(expired.classified.id).expires_at = new Date(NOW.getTime() - 1000);
  const active = await s.create({ ...VALID, idempotencyKey: 'idem-activo001', title: 'Anuncio vigente' });
  const { classifieds, total } = await s.getActive();
  assert.equal(total, 1);
  assert.equal(classifieds[0].id, active.classified.id);
  assert.equal(pool.rows.get(expired.classified.id).status, 'active', 'GET no debe modificar registros; la fecha controla su visibilidad.');
});

test('GET con fallo SQL responde error y no sirve caché', async () => {
  const pool = new FakePool();
  const s = service(pool);
  await s.create(VALID);
  pool.failSelect = true;
  await rejects(s.getActive(), 'CLASSIFIEDS_READ_FAILED');
});

test('edición y baja exigen token de titular; token inválido se rechaza', async () => {
  const pool = new FakePool();
  const s = service(pool);
  const { classified, ownerToken } = await s.create(VALID);
  await rejects(s.update(classified.id, '', { status: 'sold' }), 'OWNER_AUTHORIZATION_REQUIRED');
  await rejects(s.update(classified.id, 'token-falso', { status: 'sold' }), 'OWNER_AUTHORIZATION_INVALID');
  await rejects(s.retire(classified.id, 'token-falso'), 'OWNER_AUTHORIZATION_INVALID');
  const updated = await s.update(classified.id, ownerToken, { status: 'sold' });
  assert.equal(updated.classified.status, 'sold');
});

test('baja confirmada retirar el anuncio y GET deja de listarlo', async () => {
  const pool = new FakePool();
  const s = service(pool);
  const { classified, ownerToken } = await s.create(VALID);
  await s.retire(classified.id, ownerToken);
  const { total } = await s.getActive();
  assert.equal(total, 0);
  assert.equal(pool.rows.get(classified.id).status, 'retired');
});

test('aislamiento: sin marca, producción o motor incorrecto se niega la escritura', async () => {
  await rejects(service(new FakePool({ marker: null })).create(VALID), 'ISOLATION_MARKER_MISSING');
  await rejects(service(new FakePool({ database: 'u293982346_encarmenapp' })).create(VALID), 'ISOLATION_REFUSED');
  await rejects(service(new FakePool({ engine: 'MyISAM' })).create(VALID), 'ISOLATION_ENGINE_REFUSED');
  await rejects(service(new FakePool({ grants: 'GRANT SELECT ON *.* TO `lab`@`localhost`' })).create(VALID), 'ISOLATION_PRIVILEGES_REFUSED');
});

test('sin pool no hay escritura ni alta en memoria', async () => {
  const s = createClassifiedsService({ pool: null, now: () => NOW });
  await rejects(s.create(VALID), 'PERSISTENCE_UNAVAILABLE');
  await rejects(s.getActive(), 'PERSISTENCE_UNAVAILABLE');
});

test('la vigencia por defecto es de siete días', async () => {
  const pool = new FakePool();
  const { classified } = await service(pool).create(VALID);
  const expected = NOW.getTime() + CLASSIFIED_TTL_DAYS * 86400000;
  assert.equal(new Date(pool.rows.get(classified.id).expires_at).getTime(), expected);
});

test('el carril público no registra rutas administrativas ni usa classified:manage', async () => {
  const routes = [];
  const app = {use(){}, get: (p) => routes.push(['GET', p]), post: (p) => routes.push(['POST', p]), patch: (p) => routes.push(['PATCH', p]), delete: (p) => routes.push(['DELETE', p]) };
  registerPublicClassifieds(app, { pool: new FakePool(), now: () => NOW });
  assert.deepEqual(routes.map(([m, p]) => `${m} ${p}`), [
    'GET /api/public/classifieds', 'POST /api/public/classifieds',
    'PATCH /api/public/classifieds/:id', 'DELETE /api/public/classifieds/:id',
  ]);
  assert.ok(!routes.some(([, p]) => String(p).includes('/api/admin')));
});


test('GET no escribe ni crea tablas: lectura pública no tiene efectos secundarios', async () => {
  const pool = new FakePool();
  const original = pool.query.bind(pool);
  const sqls = [];
  pool.query = async (sql, args) => {
    sqls.push(sql);
    if (/^(UPDATE|CREATE TABLE|DROP|INSERT|DELETE)/i.test(sql.trim())) throw Error('READ_MUST_NOT_WRITE');
    return original(sql, args);
  };
  const { total } = await service(pool).getActive();
  assert.equal(total, 0);
  assert.ok(sqls.every(q => !/^(UPDATE|CREATE TABLE|DROP|INSERT|DELETE)/i.test(q.trim())));
});

test('validación realmente cerrada: campos desconocidos y objetos se rechazan', async () => {
  await rejects(service(new FakePool()).create({ ...VALID, admin: true }), 'VALIDATION_FAILED');
  await rejects(service(new FakePool()).create({ ...VALID, title: { malicious: true } }), 'VALIDATION_FAILED');
  assert.throws(() => validateClassifiedPatch({ status: 'active', owner_token_hash: 'rogue' }), e => e.code === 'VALIDATION_FAILED');
});

test('POST entrega token del titular únicamente al crear (no en respuesta idempotente)', async () => {
  const routes = {};
  const app = {use(){}, get(){}, patch(){}, delete(){}, post(p, handler) { routes[p] = handler; } };
  const pool = new FakePool();
  registerPublicClassifieds(app, { pool, now: () => NOW });
  const res = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(data) { this.body = data; return this; } });
  const first = res();
  await routes['/api/public/classifieds']({body: VALID,header:()=>undefined}, first);
  assert.equal(first.statusCode, 201);
  assert.equal(first.body.success, true);
  assert.ok(typeof first.body.ownerToken === 'string' && first.body.ownerToken.length >= 24);
  const second = res();
  await routes['/api/public/classifieds']({body: VALID,header:()=>undefined}, second);
  assert.equal(second.statusCode, 200);
  assert.equal(second.body.duplicate, true);
  assert.equal(second.body.ownerToken, undefined);
});

test('HTTP Express real: publicar, consultar, proteger titular, editar y retirar', async (t) => {
  const pool = new FakePool();
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  registerPublicClassifieds(app, { pool, now: () => NOW });
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/public/classifieds';
  const request = async (method, suffix = '', body, token) => {
    const response = await fetch(base + suffix, {
      method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'x-classified-owner-token': token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { code: response.status, data: await response.json() };
  };
  const empty = await request('GET');
  assert.equal(empty.code, 200);
  assert.equal(empty.data.total, 0);
  const invalid = await request('POST', '', { ...VALID, category: 'desconocida' });
  assert.equal(invalid.code, 400);
  assert.equal(invalid.data.success, false);
  assert.equal(pool.rows.size, 0);
  const created = await request('POST', '', VALID);
  assert.equal(created.code, 201);
  assert.equal(created.data.success, true);
  assert.ok(created.data.classified.id);
  assert.ok(created.data.ownerToken);
  const id = created.data.classified.id;
  assert.equal(pool.rows.size, 1);
  const visible = await request('GET');
  assert.equal(visible.data.total, 1);
  const unauth = await request('PATCH', '/' + encodeURIComponent(id), { status: 'sold' });
  assert.equal(unauth.code, 403);
  const wrong = await request('DELETE', '/' + encodeURIComponent(id), undefined, 'wrong-owner');
  assert.equal(wrong.code, 403);
  assert.equal(pool.rows.get(id).status, 'active');
  const patched = await request('PATCH', '/' + encodeURIComponent(id), { status: 'sold' }, created.data.ownerToken);
  assert.equal(patched.code, 200);
  assert.equal(patched.data.classified.status, 'sold');
  const soldList = await request('GET');
  assert.equal(soldList.data.total, 0);
  const retired = await request('DELETE', '/' + encodeURIComponent(id), undefined, created.data.ownerToken);
  assert.equal(retired.code, 200);
  assert.equal(pool.rows.get(id).status, 'retired');
});
test('HTTP Express real: fallos de aislamiento rechazan alta y lectura sin éxito falso', async t => {
  const pool = new FakePool({ marker: null });
  const app = express();
  app.use(express.json());
  registerPublicClassifieds(app, { pool, now: () => NOW });
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const url = 'http://127.0.0.1:' + server.address().port + '/api/public/classifieds';
  const get = await fetch(url);
  assert.equal(get.status, 503);
  assert.equal((await get.json()).success, false);
  const post = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(VALID)});
  assert.equal(post.status, 503);
  assert.equal((await post.json()).success, false);
  assert.equal(pool.rows.size, 0);
});
