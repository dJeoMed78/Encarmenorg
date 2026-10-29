import test from 'node:test';
import assert from 'node:assert/strict';
import { MARIADB_STEPS, SERVER_STEPS, applyMariadbPatch, applyServerPatch, applySteps } from '../scripts/apply-data-integrity-patch.mjs';
import { runSeedInit, planSeedInit, confirmationPhrase, rowValues, SeedInitError, PRODUCTION_DATABASE } from '../scripts/catalog-seed-init.mjs';

// MariaDB y el servidor completo NO se ejecutan aquí: se usan los fragmentos EXACTOS de src/db/mariadb.ts (ia-desarrollo) y del
// arranque de server.ts, se aplican los parches y se ejecuta el código resultante contra simuladores en memoria.
const BT = '`';
const unmask = (text) => text.replaceAll('@@BT@@', BT).replaceAll('@@D@@', '$');

const MARIADB_ORIGINAL = unmask(String.raw`let pool: mysql.Pool | null = null;
function guardWrite(operationName: string): boolean {
  return true;
}

// MariaDB CRUD Operations
export async function dbLoadAllBusinesses(): Promise<any[]> {
  if (!pool) return [];
  try {
    const [rows]: any = await pool.query('SELECT * FROM businesses ORDER BY id ASC');
    return rows.map((r: any) => {
      let extra: any = {};
      if (r.raw_data) {
        try { extra = JSON.parse(r.raw_data); } catch (_) {}
      }
      return {
        ...extra,
        id: isNaN(Number(r.id)) ? r.id : Number(r.id),
        name: r.name || extra.name || '',
        category: extra.category || r.category || '',
        categories: Array.isArray(extra.categories) && extra.categories.length > 0
          ? extra.categories
          : (r.category ? [r.category] : ['Servicios']),
        categorySlugs: Array.isArray(extra.categorySlugs) ? extra.categorySlugs : [],
        subcategory: extra.subcategory || r.subcategory || '',
        description: extra.description || r.description || '',
        address: extra.address || r.address || '',
        colonia: extra.colonia || r.colonia || '',
        postalCode: extra.postalCode || '',
        phone: extra.phone || r.phone || '',
        whatsapp: extra.whatsapp || r.whatsapp || '',
        email: extra.email || r.email || '',
        website: extra.website || r.website || '',
        facebook: extra.facebook || r.facebook || '',
        instagram: extra.instagram || r.instagram || '',
        schedule: extra.schedule || r.schedule || '',
        image: extra.image || r.image || '',
        gallery: Array.isArray(extra.gallery) ? extra.gallery : [],
        delivery: extra.delivery || '',
        hasDelivery: Boolean(extra.hasDelivery),
        payment: extra.payment || '',
        rating: Number(extra.rating || r.rating || 5.0),
        reviews_count: Number(extra.reviews_count || r.reviews_count || 0),
        verified: Boolean(extra.verified ?? r.verified ?? true),
        featured: Boolean(extra.featured ?? r.featured ?? false),
        isRecommended: Boolean(extra.isRecommended ?? false),
        isTopBusiness: Boolean(extra.isTopBusiness ?? false),
        status: extra.status || r.status || 'published'
      };
    });
  } catch (err: any) {
    console.warn('[MariaDB] Error cargando businesses:', err.message);
    return [];
  }
}

// Ultra-lightweight query (~30 bytes) to detect changes in 1ms without loading full table
export async function dbGetBusinessesSignature(): Promise<{ lastUpdate: string | null; total: number } | null> {
  if (!pool) return null;
  try {
    const [rows]: any = await pool.query('SELECT MAX(updated_at) AS last_update, COUNT(*) AS total FROM businesses');
    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        lastUpdate: row.last_update ? String(row.last_update) : null,
        total: Number(row.total || 0)
      };
    }
    return null;
  } catch (_) {
    return null;
  }
}

export async function dbSaveBusiness(biz: any): Promise<boolean> {
  if (!guardWrite('dbSaveBusiness')) return false;
  if (!pool) return false;
  try {
    const id = String(biz.id);
    const rawData = JSON.stringify(biz);
    const query = @@BT@@
      INSERT INTO businesses (
        id, name, category, subcategory, description, address, colonia,
        phone, whatsapp, email, website, facebook, instagram, schedule,
        image, rating, reviews_count, verified, featured, status, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        subcategory = VALUES(subcategory),
        description = VALUES(description),
        address = VALUES(address),
        colonia = VALUES(colonia),
        phone = VALUES(phone),
        whatsapp = VALUES(whatsapp),
        email = VALUES(email),
        website = VALUES(website),
        facebook = VALUES(facebook),
        instagram = VALUES(instagram),
        schedule = VALUES(schedule),
        image = VALUES(image),
        rating = VALUES(rating),
        reviews_count = VALUES(reviews_count),
        verified = VALUES(verified),
        featured = VALUES(featured),
        status = VALUES(status),
        raw_data = VALUES(raw_data),
        updated_at = NOW();
    @@BT@@;
    await pool.query(query, [
      id,
      biz.name || '',
      biz.category || '',
      biz.subcategory || '',
      biz.description || '',
      biz.address || '',
      biz.colonia || '',
      biz.phone || '',
      biz.whatsapp || '',
      biz.email || '',
      biz.website || '',
      biz.facebook || '',
      biz.instagram || '',
      biz.schedule || '',
      biz.image || '',
      biz.rating || 5.0,
      biz.reviews_count || 0,
      biz.verified ? 1 : 0,
      biz.featured ? 1 : 0,
      biz.status || 'published',
      rawData
    ]);
    return true;
  } catch (err: any) {
    console.warn('[MariaDB] Error guardando empresa:', err.message);
    return false;
  }
}

// Dismissed candidate persistence in MariaDB
export async function dbSaveDismissedCandidate(id: string, name: string, phone: string = ''): Promise<boolean> {
  return true;
}
`);

const SERVER_ORIGINAL = unmask(String.raw`async function bootCatalog(dbLoadAllBusinesses, dbSaveBusiness, state) {
  let businessesCache = state.cache;
  try {
    // 1. Businesses
    const dbBusinesses = await dbLoadAllBusinesses();
    if (dbBusinesses.length > 0) {
      const dbIdSet = new Set(dbBusinesses.map(b => String(b.id)));
      const missingInDb = businessesCache.filter(b => !dbIdSet.has(String(b.id)));
      if (missingInDb.length > 0) {
        console.log(@@BT@@[MariaDB] Añadiendo @@D@@{missingInDb.length} empresas del catálogo local que no existían en Hostinger MariaDB...@@BT@@);
        for (const b of missingInDb) {
          await dbSaveBusiness(b);
        }
      }
      businessesCache = dbBusinesses;
    } else {
      for (const b of businessesCache) { await dbSaveBusiness(b); state.seededEmpty = true; }
    }
  } catch (e) { state.bootError = e.message; }
  state.cache = businessesCache;
}
`);

function paramNames(params) {
  const parts = []; let depth = 0; let cur = '';
  for (const ch of params) {
    if ('<([{'.includes(ch)) depth++;
    if ('>)]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => {
    const [head, ...rest] = p.trim().split(/(?<![=!<>])=(?![=>])/);
    return head.split(':')[0].replace('?', '').trim() + (rest.length ? ' =' + rest.join('=') : '');
  }).join(', ');
}
function toJs(source) {
  return source.split('\n').filter((line) => !/^\s+code: string;$/.test(line)).map((line) => {
    const m = line.match(/^(\s*)(export )?(async )?(function \w+|constructor)\((.*)\)(?:\s*:\s*Promise<.*>|\s*:\s*boolean)?\s*\{$/);
    return m ? `${m[1]}${m[3] || ''}${m[4]}(${paramNames(m[5])}) {` : line;
  }).join('\n')
    .replace(/^let pool: mysql\.Pool \| null = null;/m, 'let pool = null;')
    .replace(/^export class/gm, 'class').replace(/^export (async )?function/gm, '$1function')
    .replace(/\((\w+): any\) =>/g, '($1) =>').replace(/catch \((\w+): any\)/g, 'catch ($1)')
    .replace(/\b(let|const) (\[?\w+\]?): any(\[\])? =/g, '$1 $2 =').replace(/\blet (\w+): any;/g, 'let $1;')
    .replace(/ as const/g, '');
}
function loadMariadb(source) {
  const body = toJs(source) + '\nreturn { dbLoadAllBusinesses, dbSaveBusiness, dbGetBusinessesSignature, dbSaveBusinessChecked: typeof dbSaveBusinessChecked === "undefined" ? undefined : dbSaveBusinessChecked, BusinessSaveError: typeof BusinessSaveError === "undefined" ? undefined : BusinessSaveError, setPool(p) { pool = p; } };';
  const logs = []; const api = new Function('console', body)({ warn: (...a) => logs.push(a.join(' ')), log() {}, error() {} });
  api.logs = logs; return api;
}
function loadBoot(source) {
  const logs = []; const fn = new Function('console', toJs(source) + '\nreturn bootCatalog;')({ log: (...a) => logs.push(['log', ...a].join(' ')), warn: (...a) => logs.push(['warn', ...a].join(' ')), error: (...a) => logs.push(['error', ...a].join(' ')) });
  fn.logs = logs; return fn;
}

const PATCHED_MARIADB = applyMariadbPatch(MARIADB_ORIGINAL).source;
const PATCHED_SERVER = applyServerPatch(SERVER_ORIGINAL).source;
const norm = (v) => String(v ?? '').trim();

test('los parches aplican con anclas exactas, son idempotentes y se pueden revertir byte a byte', () => {
  const m = applyMariadbPatch(MARIADB_ORIGINAL); const s = applyServerPatch(SERVER_ORIGINAL);
  assert.equal(m.applied.length, MARIADB_STEPS.length); assert.equal(s.applied.length, SERVER_STEPS.length); assert.equal(MARIADB_STEPS.length, 8);
  assert.deepEqual([applyMariadbPatch(m.source).applied.length, applyMariadbPatch(m.source).skipped.length], [0, 8]);
  assert.equal(applyServerPatch(s.source).applied.length, 0);
  for (const [original, steps, patched] of [[MARIADB_ORIGINAL, MARIADB_STEPS, m.source], [SERVER_ORIGINAL, SERVER_STEPS, s.source]]) {
    let back = patched; for (const step of [...steps].reverse()) back = back.replace(step.replace, () => step.find);
    assert.equal(back, original);
  }
  assert.throws(() => applyMariadbPatch(MARIADB_ORIGINAL.replace("return [];\n  }\n}\n\n// Ultra", "return [];\n  }\n}\n\n// Ultra").replace("Error cargando businesses", "Error cargando empresas")), /Ancla no válida.*0 veces/);
  assert.throws(() => applyServerPatch(SERVER_ORIGINAL + SERVER_ORIGINAL), /2 veces/);
  assert.throws(() => applySteps('nada', SERVER_STEPS), /Ancla no válida/);
});

test('control: el código ORIGINAL tiene los defectos (fallo SQL = lista vacía, upsert que pisa contactos, arranque que resucita)', async () => {
  const original = loadMariadb(MARIADB_ORIGINAL);
  original.setPool({ query: async () => { throw new Error('conexión caída'); } });
  assert.deepEqual(await original.dbLoadAllBusinesses(), [], 'un fallo SQL se ve como "no hay empresas"');
  let sql = ''; let params = [];
  original.setPool({ query: async (q, p) => { sql = q; params = p; return [{}]; } });
  await original.dbSaveBusiness({ id: 1, name: 'X', phone: '', whatsapp: '' });
  assert.match(sql, /phone = VALUES\(phone\)/); assert.equal(params.length, 21);
  const state = { cache: [{ id: 1, name: 'Vigente' }, { id: 2, name: 'Eliminada a propósito' }], seededEmpty: false };
  const saved = []; const boot = loadBoot(SERVER_ORIGINAL);
  await boot(async () => [{ id: 1, name: 'Vigente' }], async (b) => { saved.push(b.id); return true; }, state);
  assert.deepEqual(saved, [2], 'el arranque original reinserta la empresa eliminada');
});

test('dbLoadAllBusinesses parcheada: modo estricto lanza ante fallo SQL o sin conexión; el modo normal conserva su contrato', async () => {
  const api = loadMariadb(PATCHED_MARIADB);
  api.setPool(null); await assert.rejects(api.dbLoadAllBusinesses(true), /BUSINESSES_SOURCE_UNAVAILABLE/); assert.deepEqual(await api.dbLoadAllBusinesses(), []);
  api.setPool({ query: async () => { throw new Error('boom'); } });
  await assert.rejects(api.dbLoadAllBusinesses(true), /BUSINESSES_SOURCE_UNAVAILABLE/); assert.deepEqual(await api.dbLoadAllBusinesses(false), []);
  api.setPool({ query: async () => [[{ id: '7', name: 'Ok', phone: '9381112233', whatsapp: '', raw_data: JSON.stringify({ phone: '0000000000' }) }]] });
  const [row] = await api.dbLoadAllBusinesses(true); assert.deepEqual([row.id, row.name, row.phone], [7, 'Ok', '9381112233']);
});

test('contactos al leer: la columna manda; raw_data solo completa filas heredadas; un contacto retirado no resucita', async () => {
  const api = loadMariadb(PATCHED_MARIADB);
  const load = async (r) => { api.setPool({ query: async () => [[{ id: '1', name: 'N', ...r }]] }); return (await api.dbLoadAllBusinesses(true))[0]; };
  let b = await load({ phone: '1111111111', whatsapp: '2222222222', raw_data: JSON.stringify({ phone: '9999999999', whatsapp: '8888888888' }) });
  assert.deepEqual([b.phone, b.whatsapp], ['1111111111', '2222222222']);
  b = await load({ phone: '', whatsapp: '', raw_data: JSON.stringify({ phone: '3333333333', whatsapp: '4444444444' }) });
  assert.deepEqual([b.phone, b.whatsapp], ['3333333333', '4444444444']);
  b = await load({ phone: '', whatsapp: '', raw_data: JSON.stringify({ phone: '', whatsapp: '' }) }); assert.deepEqual([b.phone, b.whatsapp], ['', '']);
  b = await load({ phone: '5555555555', whatsapp: '', raw_data: '{no es json' }); assert.deepEqual([b.phone, b.whatsapp], ['5555555555', '']);
});

test('dbSaveBusiness parcheada: teléfono/WhatsApp vacíos nunca borran; el retiro es explícito; fallos SQL devuelven false', async () => {
  const api = loadMariadb(PATCHED_MARIADB); let call;
  api.setPool({ query: async (sql, params) => { call = { sql, params }; return [{}]; } });
  assert.equal(await api.dbSaveBusiness({ id: 1, name: 'X', phone: '', whatsapp: '' }), true);
  assert.match(call.sql, /phone = IF\(\?, '', COALESCE\(NULLIF\(TRIM\(VALUES\(phone\)\), ''\), phone\)\),/);
  assert.match(call.sql, /whatsapp = IF\(\?, '', COALESCE\(NULLIF\(TRIM\(VALUES\(whatsapp\)\), ''\), whatsapp\)\),/);
  assert.doesNotMatch(call.sql, /phone = VALUES\(phone\)/);
  assert.equal(call.params.length, 23); assert.deepEqual(call.params.slice(-2), [0, 0]);
  assert.equal((call.sql.match(/\?/g) || []).length, call.params.length, 'un parámetro por marcador');
  await api.dbSaveBusiness({ id: 1, name: 'X' }, { clearContacts: ['phone'] }); assert.deepEqual(call.params.slice(-2), [1, 0]);
  await api.dbSaveBusiness({ id: 1, name: 'X' }, { clearContacts: ['whatsapp', 'phone'] }); assert.deepEqual(call.params.slice(-2), [1, 1]);
  api.setPool({ query: async () => { throw new Error('Deadlock'); } }); assert.equal(await api.dbSaveBusiness({ id: 1, name: 'X' }), false);
  api.setPool(null); assert.equal(await api.dbSaveBusiness({ id: 1, name: 'X' }), false);
});

test('semántica de contactos (referencia): vacío conserva, valor nuevo reemplaza, retiro explícito vacía', () => {
  const merge = (existing, incoming, clear) => (clear ? '' : norm(incoming) !== '' ? norm(incoming) : existing);
  assert.deepEqual([merge('111', '', false), merge('111', '   ', false), merge('111', '222', false), merge('111', ' 222 ', false), merge('111', '', true), merge('', '', false)], ['111', '111', '222', '222', '', '']);
});

test('dbSaveBusinessChecked: confirma con lectura SQL; guardado fallido, lectura caída o discordante lanzan error (nunca éxito falso)', async () => {
  const api = loadMariadb(PATCHED_MARIADB); assert.ok(api.dbSaveBusinessChecked && api.BusinessSaveError);
  const stateRow = { id: '5', name: 'Taller', phone: '9381112233', whatsapp: '' };
  const pool = (overrides = {}) => ({ query: async (sql, params) => { if (sql.startsWith('SELECT id, name, phone, whatsapp')) { if (overrides.readFails) throw new Error('read'); return [[overrides.row === undefined ? stateRow : overrides.row]]; } if (overrides.writeFails) throw new Error('write'); return [{}]; } });
  api.setPool(pool()); const ok = await api.dbSaveBusinessChecked({ id: 5, name: 'Taller', phone: ' 9381112233 ', whatsapp: '' }); assert.deepEqual(ok, stateRow);
  const failing = async (biz, overrides, code, options) => { api.setPool(pool(overrides)); await assert.rejects(api.dbSaveBusinessChecked(biz, options), (e) => e instanceof api.BusinessSaveError && e.code === code); };
  await failing({ id: 5, name: 'Taller' }, { writeFails: true }, 'BUSINESS_SAVE_FAILED');
  await failing({ id: 5, name: 'Taller' }, { readFails: true }, 'BUSINESS_READBACK_FAILED');
  await failing({ id: 5, name: 'Taller' }, { row: null }, 'BUSINESS_READBACK_FAILED');
  await failing({ id: 5, name: 'Otro nombre' }, {}, 'BUSINESS_READBACK_FAILED');
  await failing({ id: 5, name: 'Taller', phone: '9990000000' }, {}, 'BUSINESS_READBACK_FAILED');
  await failing({ id: 5, name: 'Taller' }, {}, 'BUSINESS_READBACK_FAILED', { clearContacts: ['phone'] });
  api.setPool(null); await assert.rejects(api.dbSaveBusinessChecked({ id: 5, name: 'Taller' }), /No se guardó/);
});

test('caché: la firma detecta altas, bajas y ediciones aunque coincidan conteo y segundo; conserva el tipo esperado por el sondeo', async () => {
  const api = loadMariadb(PATCHED_MARIADB); const seen = [];
  const sig = async (row) => { api.setPool({ query: async (sql) => { seen.push(sql); return [[row]]; } }); return api.dbGetBusinessesSignature(); };
  const a = await sig({ last_update: '2026-10-29 10:00:00', total: 207, checksum: '1111' });
  const same = await sig({ last_update: '2026-10-29 10:00:00', total: 207, checksum: '1111' });
  const swapped = await sig({ last_update: '2026-10-29 10:00:00', total: 207, checksum: '2222' });
  assert.equal(a.lastUpdate, same.lastUpdate); assert.notEqual(a.lastUpdate, swapped.lastUpdate); assert.equal(swapped.total, 207);
  assert.match(seen[0], /SUM\(CRC32\(CONCAT\(id, '\|', COALESCE\(updated_at, ''\)\)\)\)/);
  assert.deepEqual(await sig({ last_update: null, total: 0, checksum: 0 }), { lastUpdate: null, total: 0 });
  api.setPool({ query: async () => { throw new Error('x'); } }); assert.equal(await api.dbGetBusinessesSignature(), null);
});

const SEED = [{ id: 1, name: 'Vigente', phone: '1111111111' }, { id: 2, name: 'Eliminada a propósito', phone: '2222222222', whatsapp: '3333333333' }, { id: 3, name: 'Semilla con teléfono viejo', phone: '4444444444' }];
function world(dbRows) { return { db: new Map(dbRows.map((r) => [r.id, { ...r }])), saves: [], cache: SEED.map((b) => ({ ...b })) }; }
async function restart(w, patchedSource, { failLoad = false } = {}) {
  const boot = loadBoot(patchedSource); const state = { cache: w.cache, seededEmpty: false };
  await boot(async (strict) => { if (failLoad) { if (strict) throw new Error('BUSINESSES_SOURCE_UNAVAILABLE'); return []; } return [...w.db.values()]; }, async (b) => { w.saves.push(b.id); w.db.set(b.id, { ...b }); return true; }, state);
  w.cache = state.cache; return { boot, state };
}

test('reinicios: la empresa eliminada NO resucita, los contactos de MariaDB no se tocan y no hay escrituras en tres arranques', async () => {
  const w = world([{ id: 1, name: 'Vigente', phone: '9999999999' }, { id: 3, name: 'Semilla con teléfono viejo', phone: '5555555555', whatsapp: '6666666666' }]);
  for (let i = 0; i < 3; i++) await restart(w, PATCHED_SERVER);
  assert.deepEqual(w.saves, []); assert.deepEqual([...w.db.keys()].sort(), [1, 3]);
  assert.deepEqual([w.db.get(3).phone, w.db.get(3).whatsapp, w.db.get(1).phone], ['5555555555', '6666666666', '9999999999']);
  assert.deepEqual(w.cache.map((b) => b.id).sort(), [1, 3], 'la caché queda alineada con MariaDB y la empresa eliminada no vuelve');
  assert.ok(!w.cache.some((b) => b.id === 2));
});

test('reinicio con MariaDB caída o ilegible: ningún write, ninguna siembra y el fallo se registra como error', async () => {
  const w = world([{ id: 1, name: 'Vigente', phone: '9999999999' }]); const { boot, state } = await restart(w, PATCHED_SERVER, { failLoad: true });
  assert.deepEqual(w.saves, []); assert.equal(state.seededEmpty, false); assert.equal(state.bootError, undefined);
  assert.ok(boot.logs.some((l) => l.startsWith('error') && /No se pudo leer businesses/.test(l)));
});

test('reinicio con la tabla vacía: no se siembra automáticamente (solo la herramienta manual puede inicializar)', async () => {
  const w = world([]); const { boot, state } = await restart(w, PATCHED_SERVER);
  assert.deepEqual(w.saves, []); assert.equal(state.seededEmpty, false); assert.equal(w.db.size, 0);
  assert.ok(boot.logs.some((l) => /scripts\/catalog-seed-init\.mjs/.test(l)));
  assert.doesNotMatch(PATCHED_SERVER, /const missingInDb = businessesCache\.filter/);
});

test('edición parcial: aplicar una semilla/actualización con contactos vacíos sobre una empresa existente no los borra (SQL parcheado emulado)', async () => {
  const api = loadMariadb(PATCHED_MARIADB); const row = { id: '10', phone: '9381112233', whatsapp: '9382223344' };
  api.setPool({ query: async (sql, p) => { const [clearP, clearW] = p.slice(-2); const phone = String(p[7]).trim(); const wa = String(p[8]).trim();
    row.phone = clearP ? '' : phone !== '' ? phone : row.phone; row.whatsapp = clearW ? '' : wa !== '' ? wa : row.whatsapp; return [{}]; } });
  await api.dbSaveBusiness({ id: 10, name: 'Sin contactos', phone: '', whatsapp: '' }); assert.deepEqual([row.phone, row.whatsapp], ['9381112233', '9382223344']);
  await api.dbSaveBusiness({ id: 10, name: 'Solo teléfono', phone: '9380000000' }); assert.deepEqual([row.phone, row.whatsapp], ['9380000000', '9382223344']);
  await api.dbSaveBusiness({ id: 10, name: 'Retiro explícito' }, { clearContacts: ['whatsapp'] }); assert.deepEqual([row.phone, row.whatsapp], ['9380000000', '']);
});

function fakePool({ database = 'u1_disposable', ids = [], failInsertAt = -1, dropRows = false } = {}) {
  const log = []; const table = new Map(ids.map((id) => [String(id), { id: String(id), phone: '', whatsapp: '' }])); let staged = null;
  const conn = {
    async beginTransaction() { staged = new Map(); log.push('BEGIN'); }, async commit() { for (const [k, v] of staged) table.set(k, v); if (dropRows) table.clear(); log.push('COMMIT'); }, async rollback() { staged = null; log.push('ROLLBACK'); }, release() { log.push('RELEASE'); },
    async query(sql, p) { log.push(sql); if (/ON DUPLICATE|^UPDATE|^DELETE/i.test(sql)) throw new Error('prohibido'); if (!sql.startsWith('INSERT INTO businesses')) throw new Error('SQL inesperado'); if (failInsertAt >= 0 && staged.size === failInsertAt) throw new Error('synthetic insert failure'); staged.set(String(p[0]), { id: String(p[0]), phone: p[7], whatsapp: p[8] }); return [{ affectedRows: 1 }]; },
  };
  return { log, table, async query(sql) { log.push(sql); if (sql === 'SELECT DATABASE() AS db_name') return [[{ db_name: database }]]; if (sql === 'SELECT id FROM businesses') return [[...table.keys()].map((id) => ({ id }))]; if (sql === 'SELECT id, phone, whatsapp FROM businesses') return [[...table.values()]]; throw new Error('SQL inesperado: ' + sql); }, async getConnection() { return conn; } };
}
const writesIn = (log) => log.filter((q) => /^(INSERT|UPDATE|DELETE|BEGIN|COMMIT)/.test(q));
const refused = (promise, code) => assert.rejects(promise, (e) => e instanceof SeedInitError && e.code === code);

test('inicialización manual: por defecto solo planifica (sin escrituras) y exige la frase exacta del plan para aplicar', async () => {
  const pool = fakePool(); const base = { pool, seed: SEED, database: 'u1_disposable', mode: 'empty' };
  const plan = await runSeedInit(base);
  assert.deepEqual([plan.apply, plan.planned, plan.inserted, plan.requiredConfirmation], [false, 3, 0, confirmationPhrase({ database: 'u1_disposable', mode: 'empty', count: 3 })]);
  assert.deepEqual(writesIn(pool.log), []);
  await refused(runSeedInit({ ...base, apply: true }), 'CONFIRMATION_MISMATCH');
  await refused(runSeedInit({ ...base, apply: true, confirm: 'INSERTAR-SEMILLA:u1_disposable:empty:2' }), 'CONFIRMATION_MISMATCH');
  assert.deepEqual(writesIn(pool.log), []); assert.equal(pool.table.size, 0);
  const done = await runSeedInit({ ...base, apply: true, confirm: plan.requiredConfirmation });
  assert.deepEqual([done.inserted, pool.table.size], [3, 3]);
  assert.ok(pool.log.every((q) => !/ON DUPLICATE|^UPDATE|^DELETE/i.test(q)));
  assert.deepEqual(rowValues({ id: 9, name: 'N', phone: '1', verified: false }).slice(0, 2).concat(rowValues({ id: 9, name: 'N', verified: false })[17]), ['9', 'N', 0]);
});

test('inicialización manual: rechaza producción, base distinta, tabla no vacía, ids desconocidos y semillas inválidas', async () => {
  await refused(runSeedInit({ pool: fakePool({ database: PRODUCTION_DATABASE }), seed: SEED, database: PRODUCTION_DATABASE, mode: 'empty', apply: true, confirm: 'x' }), 'PRODUCTION_REFUSED');
  await refused(runSeedInit({ pool: fakePool({ database: 'otra' }), seed: SEED, database: 'u1_disposable', mode: 'empty' }), 'DATABASE_MISMATCH');
  await refused(runSeedInit({ pool: fakePool(), seed: SEED, database: '', mode: 'empty' }), 'DATABASE_REQUIRED');
  const busy = fakePool({ ids: [1] }); await refused(runSeedInit({ pool: busy, seed: SEED, database: 'u1_disposable', mode: 'empty', apply: true, confirm: 'x' }), 'TABLE_NOT_EMPTY'); assert.deepEqual(writesIn(busy.log), []);
  await refused(runSeedInit({ pool: fakePool(), seed: SEED, database: 'u1_disposable', mode: 'ids', ids: [] }), 'IDS_REQUIRED');
  await refused(runSeedInit({ pool: fakePool(), seed: SEED, database: 'u1_disposable', mode: 'ids', ids: ['99'] }), 'UNKNOWN_IDS');
  await refused(runSeedInit({ pool: fakePool(), seed: SEED, database: 'u1_disposable', mode: 'todo' }), 'MODE_REQUIRED');
  await refused(runSeedInit({ pool: fakePool(), seed: [{ id: 1, name: 'A' }, { id: 1, name: 'B' }], database: 'u1_disposable', mode: 'empty' }), 'SEED_INVALID');
  await refused(runSeedInit({ pool: fakePool(), seed: [{ id: 5 }], database: 'u1_disposable', mode: 'empty' }), 'SEED_INVALID');
  await refused(runSeedInit({ pool: fakePool(), seed: 'no', database: 'u1_disposable', mode: 'empty' }), 'SEED_INVALID');
});

test('inicialización manual por ids: solo los pedidos, nunca sobrescribe los existentes y registra los omitidos', async () => {
  const pool = fakePool({ ids: [2] }); const base = { pool, seed: SEED, database: 'u1_disposable', mode: 'ids', ids: ['1', '2'] };
  const plan = await runSeedInit(base); assert.deepEqual([plan.planned, plan.skippedExisting], [1, ['2']]);
  const done = await runSeedInit({ ...base, apply: true, confirm: plan.requiredConfirmation });
  assert.deepEqual([done.inserted, [...pool.table.keys()].sort()], [1, ['1', '2']]); assert.deepEqual(pool.table.get('2'), { id: '2', phone: '', whatsapp: '' }, 'la existente queda intacta');
  assert.deepEqual(planSeedInit({ seed: SEED, existingIds: [1, 2, 3], mode: 'ids', ids: ['1'] }).insert, []);
});

test('inicialización manual: fallo SQL revierte todo y falla de verdad; lectura posterior discordante también es error', async () => {
  const pool = fakePool({ failInsertAt: 1 }); const base = { pool, seed: SEED, database: 'u1_disposable', mode: 'empty' };
  const plan = await runSeedInit(base);
  await assert.rejects(runSeedInit({ ...base, apply: true, confirm: plan.requiredConfirmation }), (e) => e.code === 'INSERT_FAILED' && /se revirtió todo/.test(e.message));
  assert.equal(pool.table.size, 0); assert.ok(pool.log.includes('ROLLBACK') && !pool.log.includes('COMMIT') && pool.log.at(-1) === 'RELEASE');
  const lossy = fakePool({ dropRows: true }); const p2 = await runSeedInit({ ...base, pool: lossy });
  await refused(runSeedInit({ ...base, pool: lossy, apply: true, confirm: p2.requiredConfirmation }), 'READBACK_FAILED');
});

test('la inicialización del catálogo nunca se invoca sola: ni el servidor parcheado ni los módulos de producción la referencian', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  assert.doesNotMatch(PATCHED_SERVER + PATCHED_MARIADB, /catalog-seed-init(?!\.mjs')[^.]*\.import|import .*catalog-seed-init|require\(.*catalog-seed-init/);
  assert.match(PATCHED_SERVER, /const seedInitRequestedAtBoot = false;/);
  const script = readFileSync(new URL('../scripts/catalog-seed-init.mjs', import.meta.url), 'utf8');
  assert.match(script, /import\.meta\.url === pathToFileURL\(process\.argv\[1\]\)\.href/);
  for (const dir of ['../src/server', '../src/db']) for (const file of readdirSync(new URL(dir + '/', import.meta.url))) assert.doesNotMatch(readFileSync(new URL(`${dir}/${file}`, import.meta.url), 'utf8'), /catalog-seed-init/, file);
});
