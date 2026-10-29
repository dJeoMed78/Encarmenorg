import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClassifiedsService, registerPublicClassifieds, validateClassifiedInput,
  ClassifiedsError, ISOLATION_MARKER, CLASSIFIED_TTL_DAYS,
} from '../src/server/publicClassifieds.ts';

const NOW = new Date('2026-01-01T00:00:00Z');
const VALID = { title: 'Bicicleta rodada 26', description: 'Bicicleta en buen estado, poco uso.', category: 'compra-venta', price: 1500, contactPhone: '9381112233', contactWhatsapp: '9382223344', idempotencyKey: 'idem-12345678' };

class FakePool {
  constructor(opts = {}) {
    this.database = opts.database || 'enc_lab_classifieds';
    this.user = opts.user || 'lab@localhost';
    this.marker = opts.marker === undefined ? ISOLATION_MARKER : opts.marker;
    this.engine = opts.engine || 'InnoDB';
    this.grants = opts.grants || 'GRANT SELECT, INSERT, UPDATE, DELETE ON *.* TO `lab`@`localhost`';
    this.rows = new Map();
    this.failInsert = false; this.failReadback = false; this.failSelect = false;
  }
  async query(sql, params = []) {
    if (this.failOn && this.failOn.test(sql)) throw this.failError || new Error('fallo sql');
    if (/SELECT DATABASE\(\)/.test(sql)) return [[{ db_name: this.database }]];
    if (/CURRENT_USER\(\)/.test(sql)) return [[{ 'CURRENT_USER()': this.user }]];
    if (/marker_value FROM/.test(sql)) return this.marker ? [[{ marker_value: this.marker }]] : [[]];
    if (/information_schema\.TABLES/.test(sql)) return this.engine ? [[{ ENGINE: this.engine }]] : [[]];
    if (/SHOW GRANTS/.test(sql)) return [[this.grants]];
    if (/CREATE TABLE/.test(sql)) return [{ affectedRows: 0 }];
    if (/INSERT INTO public_classifieds/.test(sql)) {
      if (this.failInsert) throw new Error('insert failed');
      const [id, idem, title, description, category, price, phone, wa, image, hash, expires] = params;
      if (this.rows.has(id)) { const e = new Error('dup'); e.code = 'ER_DUP_ENTRY'; throw e; }
      this.rows.set(id, { id, idempotency_key: idem, title, description, category, price, contact_phone: phone, contact_whatsapp: wa, image_url: image, status: 'active', owner_token_hash: hash, expires_at: expires, created_at: NOW });
      return [{ affectedRows: 1 }];
    }
    if (/SELECT \* FROM public_classifieds WHERE idempotency_key/.test(sql)) {
      for (const row of this.rows.values()) if (row.idempotency_key === params[0]) return [[row]];
      return [[]];
    }
    if (/SELECT \* FROM public_classifieds WHERE id = \?/.test(sql)) {
      if (this.failReadback) throw new Error('readback failed');
      const row = this.rows.get(params[0]);
      return [row ? [row] : []];
    }
    if (/UPDATE public_classifieds SET status = 'expired'/.test(sql)) {
      for (const row of this.rows.values()) if (row.status === 'active' && new Date(row.expires_at) <= NOW) row.status = 'expired';
      return [{ affectedRows: 0 }];
    }
    if (/SELECT \* FROM public_classifieds WHERE status = 'active'/.test(sql)) {
      if (this.failSelect) throw new Error('select failed');
      return [[...this.rows.values()].filter((r) => r.status === 'active' && new Date(r.expires_at) > NOW)];
    }
    if (/UPDATE public_classifieds/.test(sql) && /COALESCE/.test(sql)) {
      const row = this.rows.get(params[4]);
      if (!row) return [{ affectedRows: 0 }];
      if (params[0] != null) row.title = params[0];
      if (params[1] != null) row.description = params[1];
      if (params[2] != null) row.price = params[2];
      if (params[3] != null) row.status = params[3];
      return [{ affectedRows: 1 }];
    }
    throw new Error('SQL no simulado: ' + sql.slice(0, 80));
  }
}

const service = (pool) => createClassifiedsService({ pool, now: () => NOW });
const rejects = (promise, code, extra) => assert.rejects(promise, (e) => e instanceof ClassifiedsError && e.code === code && (!extra || extra(e)));

test('validación cerrada rechaza campos inválidos', async () => {
  for (const bad of [
    { ...VALID, title: 'corto' },
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
});

test('POST válido persiste, confirma con lectura posterior y devuelve contrato', async () => {
  const pool = new FakePool();
  const result = await service(pool).create(VALID);
  assert.equal(result.duplicate, false);
  assert.equal(result.classified.status, 'active');
  assert.equal(result.classified.contactPhone, '9381112233');
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

test('fallo SQL en INSERT: error confirmado, sin mutación de caché', async () => {
  const pool = new FakePool();
  pool.failInsert = true;
  await rejects(service(pool).create(VALID), 'PERSISTENCE_FAILED', (e) => e.uncertain === false);
  assert.equal(pool.rows.size, 0);
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
  const active = await s.create({ ...VALID, idempotencyKey: 'idem-activo001', title: 'Anuncio vigente' });
  const { classifieds, total } = await s.getActive();
  assert.equal(total, 1);
  assert.equal(classifieds[0].id, active.classified.id);
  assert.equal(pool.rows.get(expired.classified.id).status, 'expired');
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
  const app = { get: (p) => routes.push(['GET', p]), post: (p) => routes.push(['POST', p]), patch: (p) => routes.push(['PATCH', p]), delete: (p) => routes.push(['DELETE', p]) };
  registerPublicClassifieds(app, { pool: new FakePool(), now: () => NOW });
  assert.deepEqual(routes.map(([m, p]) => `${m} ${p}`), [
    'GET /api/public/classifieds', 'POST /api/public/classifieds',
    'PATCH /api/public/classifieds/:id', 'DELETE /api/public/classifieds/:id',
  ]);
  assert.ok(!routes.some(([, p]) => String(p).includes('/api/admin')));
});
