import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {
  createClassifiedsService, ClassifiedsError,
  ISOLATION_MARKER, CLASSIFIEDS_TABLE, ISOLATION_TABLE, CLASSIFIED_TTL_DAYS,
} from '../src/server/publicClassifieds.ts';
import { PRODUCTION_DB_NAME } from '../src/db/mariadb.ts';

// ENC-MARIADB-CI-REAL-002 — pruebas SQL REALES contra MariaDB efímera (sin FakePool).
// Requiere el esquema de scripts/mariadb-lab-schema.sql aplicado por el workflow.

const base = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const VALID = {
  title: 'Bicicleta rodada 26',
  description: 'Bicicleta en buen estado, poco uso.',
  category: 'compra-venta',
  price: 1500,
  contactPhone: '9381112233',
  contactWhatsapp: '9382223344',
  idempotencyKey: 'idem-real-0001',
};

const pool = await mysql.createPool(base);
test.after(async () => { await pool.end(); });
const service = createClassifiedsService({ pool });
const rejects = (promise, code) => assert.rejects(promise, (e) => e instanceof ClassifiedsError && e.code === code);
const direct = (sql, params = []) => pool.query(sql, params);
const readRow = async (id) => {
  const [rows] = await direct(`SELECT * FROM ${CLASSIFIEDS_TABLE} WHERE id = ?`, [id]);
  return rows[0] ?? null;
};

test('S. GET sin escrituras: 0 activos y esquema real creado', async () => {
  const { total, classifieds } = await service.getActive();
  assert.equal(total, 0);
  assert.deepEqual(classifieds, []);
  const [engines] = await direct(
    'SELECT ENGINE FROM information_schema.TABLES WHERE table_schema = DATABASE() AND table_name = ?',
    [CLASSIFIEDS_TABLE],
  );
  assert.equal(String(engines[0].ENGINE).toLowerCase(), 'innodb');
});

test('A+B. Creación válida con persistencia y lectura posterior reales', async () => {
  const result = await service.create(VALID);
  assert.equal(result.duplicate, false);
  assert.ok(result.ownerToken);
  const row = await readRow(result.classified.id);
  assert.ok(row, 'la fila debe existir en MariaDB');
  assert.equal(row.title, VALID.title);
  assert.equal(row.contact_phone, VALID.contactPhone);
  assert.equal(row.category, VALID.category);
  assert.equal(row.status, 'active');
});

test('M. Contactos y categoría se conservan tras edición parcial', async () => {
  const { classified, ownerToken } = await service.create({ ...VALID, idempotencyKey: 'idem-real-0002', title: 'Conserva contactos' });
  await service.update(classified.id, ownerToken, { status: 'active', description: 'Descripción actualizada correctamente.' });
  const row = await readRow(classified.id);
  assert.equal(row.contact_phone, VALID.contactPhone);
  assert.equal(row.contact_whatsapp, VALID.contactWhatsapp);
  assert.equal(row.category, VALID.category);
});

test('C+L. Edición con token correcto actualiza precio y confirma lectura', async () => {
  const { classified, ownerToken } = await service.create({ ...VALID, idempotencyKey: 'idem-real-0003', title: 'Precio editable' });
  const updated = await service.update(classified.id, ownerToken, { price: 2000 });
  assert.equal(updated.classified.price, 2000);
  const row = await readRow(classified.id);
  assert.equal(Number(row.price), 2000);
});

test('D. Rechazo de edición con token incorrecto', async () => {
  const { classified } = await service.create({ ...VALID, idempotencyKey: 'idem-real-0004', title: 'Token incorrecto' });
  await rejects(service.update(classified.id, 'token-falso', { status: 'sold' }), 'OWNER_AUTHORIZATION_INVALID');
  const row = await readRow(classified.id);
  assert.equal(row.status, 'active');
});

test('E+F. Retiro lógico confirmado y exclusión del listado', async () => {
  const { classified, ownerToken } = await service.create({ ...VALID, idempotencyKey: 'idem-real-0005', title: 'Retiro lógico' });
  await service.retire(classified.id, ownerToken);
  const row = await readRow(classified.id);
  assert.equal(row.status, 'retired');
  const { classifieds } = await service.getActive();
  assert.ok(!classifieds.some((c) => c.id === classified.id));
});

test('F. Los vendidos se excluyen del listado', async () => {
  const { classified, ownerToken } = await service.create({ ...VALID, idempotencyKey: 'idem-real-0006', title: 'Vendido excluido' });
  await service.update(classified.id, ownerToken, { status: 'sold' });
  const { classifieds } = await service.getActive();
  assert.ok(!classifieds.some((c) => c.id === classified.id));
});

test('G. Vigencia de siete días y expiración real', async () => {
  const { classified } = await service.create({ ...VALID, idempotencyKey: 'idem-real-0007', title: 'Expira en siete días' });
  const row = await readRow(classified.id);
  const expected = Date.now() + CLASSIFIED_TTL_DAYS * 86400000;
  assert.ok(Math.abs(new Date(row.expires_at).getTime() - expected) < 60000);
  await direct(`UPDATE ${CLASSIFIEDS_TABLE} SET expires_at = NOW() - INTERVAL 1 SECOND WHERE id = ?`, [classified.id]);
  const { classifieds } = await service.getActive();
  assert.ok(!classifieds.some((c) => c.id === classified.id));
  const after = await readRow(classified.id);
  assert.equal(after.status, 'expired');
});

test('H. Idempotencia: misma clave y datos devuelve el mismo anuncio', async () => {
  const first = await service.create(VALID);
  const second = await service.create(VALID);
  assert.equal(first.classified.id, second.classified.id);
  assert.equal(second.duplicate, true);
});

test('I. Conflicto: misma clave con datos diferentes', async () => {
  await service.create({ ...VALID, idempotencyKey: 'idem-real-0008', title: 'Conflicto de clave' });
  await rejects(service.create({ ...VALID, idempotencyKey: 'idem-real-0008', title: 'Otro título distinto' }), 'IDEMPOTENCY_CONFLICT');
});

test('J. Duplicados concurrentes: una sola fila gana', async () => {
  const input = { ...VALID, idempotencyKey: 'idem-real-0009', title: 'Concurrencia real' };
  const results = await Promise.allSettled([service.create(input), service.create(input)]);
  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const ok = fulfilled.map((r) => r.value);
  const sameId = new Set(ok.map((r) => r.classified.id));
  assert.ok(ok.length >= 1);
  assert.ok(sameId.size === 1, 'los éxitos deben apuntar al mismo anuncio');
  const [rows] = await direct('SELECT COUNT(*) AS n FROM ' + CLASSIFIEDS_TABLE + ' WHERE idempotency_key = ?', [input.idempotencyKey]);
  assert.equal(rows[0].n, 1);
});

test('K. Restricción UNIQUE real sobre idempotency_key', async () => {
  const sql = `INSERT INTO ${CLASSIFIEDS_TABLE}
    (id, idempotency_key, title, description, category, price, contact_phone, contact_whatsapp, image_url, status, owner_token_hash, expires_at)
    VALUES ('dup-real-1', 'idem-unique-001', 'Unico', 'Descripcion unica suficiente.', 'otros', NULL, '9381112233', '', '', 'active', SHA2('x', 256), NOW() + INTERVAL 7 DAY)`;
  await direct(sql);
  await assert.rejects(direct(sql), (e) => String(e.code).includes('ER_DUP'));
});

test('N. Error SQL real explícito falla, sin afectar integridad del esquema', async () => {
  await assert.rejects(direct('SELECT * FROM enc_tabla_sintetica_inexistente'), e => e.code === 'ER_NO_SUCH_TABLE');
  const [rows] = await direct('SELECT COUNT(*) AS n FROM public_classifieds');
  assert.ok(Number(rows[0].n) >= 0);
});

test('O. Verificación de aislamiento: DATABASE() y CURRENT_USER() reales', async () => {
  const [dbRows] = await direct('SELECT DATABASE() AS db_name');
  const [userRows] = await direct('SELECT CURRENT_USER() AS db_user');
  assert.equal(dbRows[0].db_name, process.env.DB_NAME);
  assert.ok(String(Object.values(userRows[0])[0]).startsWith(process.env.DB_USER.split('@')[0]));
  const [marker] = await direct(`SELECT marker_value FROM ${ISOLATION_TABLE} LIMIT 1`);
  assert.equal(marker[0].marker_value, ISOLATION_MARKER);
});

test('P. Ausencia del marcador de aislamiento se rechaza (base real sin marca)', async () => {
  const poolNoMarker = await mysql.createPool({ ...base, database: process.env.DB_NAME + '_nomarker' });
  try {
    const s = createClassifiedsService({ pool: poolNoMarker });
    await rejects(s.create({ ...VALID, idempotencyKey: 'idem-real-0011', title: 'Sin marcador' }), 'ISOLATION_MARKER_MISSING');
  } finally { await poolNoMarker.end(); }
});

test('Q. Rechazo por base con nombre de producción', async () => {
  const poolProd = await mysql.createPool({ ...base, database: PRODUCTION_DB_NAME });
  try {
    const s = createClassifiedsService({ pool: poolProd });
    await rejects(s.create({ ...VALID, idempotencyKey: 'idem-real-0012', title: 'Base producción' }), 'ISOLATION_REFUSED');
  } finally { await poolProd.end(); }
});

test('R. Rechazo por privilegios insuficientes', async () => {
  const poolRo = await mysql.createPool({
    host: base.host, port: base.port,
    user: process.env.LAB_RO_USER, password: process.env.LAB_RO_PASSWORD, database: base.database,
  });
  try {
    const s = createClassifiedsService({ pool: poolRo });
    await rejects(s.create({ ...VALID, idempotencyKey: 'idem-real-0013', title: 'Sin privilegios' }), 'ISOLATION_PRIVILEGES_REFUSED');
  } finally { await poolRo.end(); }
});

test('T. Sin éxito falso: tras crear, la fila existe realmente en MariaDB', async () => {
  const { classified } = await service.create({ ...VALID, idempotencyKey: 'idem-real-0014', title: 'Persistencia verificable' });
  const row = await readRow(classified.id);
  assert.ok(row);
  assert.equal(row.phone ?? row.contact_phone, VALID.contactPhone);
});
