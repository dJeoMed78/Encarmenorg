// ENC-DATA-INTEGRITY-001 — inicialización MANUAL del catálogo desde businesses_seed.json.
// Nunca se ejecuta sola: no la importa server.ts, no forma parte del arranque y por defecto solo muestra el plan (dry-run).
//
//   Plan:     node scripts/catalog-seed-init.mjs --mode empty
//             node scripts/catalog-seed-init.mjs --mode ids --ids 1081,1082
//   Aplicar:  node scripts/catalog-seed-init.mjs --mode empty --apply --confirm "INSERTAR-SEMILLA:<base>:empty:<n>"
//
// Credenciales: variables DB_HOST, DB_USER, DB_PASSWORD, DB_NAME del operador en el momento de ejecutar (nunca en el código).
// Reglas: INSERT simple (jamás ON DUPLICATE/UPDATE), una transacción, lectura de confirmación, rechaza la base de producción,
// el modo "empty" exige tabla vacía y el modo "ids" solo inserta los ids pedidos que no existan.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PRODUCTION_DATABASE = 'u293982346_encarmenapp';
const COLUMNS = ['id', 'name', 'category', 'subcategory', 'description', 'address', 'colonia', 'phone', 'whatsapp', 'email', 'website', 'facebook', 'instagram', 'schedule', 'image', 'rating', 'reviews_count', 'verified', 'featured', 'status', 'raw_data'];

export class SeedInitError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const refuse = (code, message) => { throw new SeedInitError(code, message); };

export const confirmationPhrase = ({ database, mode, count }) => `INSERTAR-SEMILLA:${database}:${mode}:${count}`;

export function rowValues(b) {
  return [String(b.id), b.name || '', b.category || '', b.subcategory || '', b.description || '', b.address || '', b.colonia || '', b.phone || '', b.whatsapp || '',
    b.email || '', b.website || '', b.facebook || '', b.instagram || '', b.schedule || '', b.image || '', b.rating || 5.0, b.reviews_count || 0,
    b.verified === false ? 0 : 1, b.featured ? 1 : 0, b.status || 'published', JSON.stringify(b)];
}

/** Calcula, sin tocar la base, qué filas de la semilla se insertarían. */
export function planSeedInit({ seed, existingIds, mode, ids }) {
  if (!Array.isArray(seed)) refuse('SEED_INVALID', 'La semilla debe ser una lista.');
  const existing = new Set([...existingIds].map(String));
  const byId = new Map();
  for (const item of seed) {
    if (!item || item.id === undefined || item.id === null || String(item.id).trim() === '' || !String(item.name || '').trim()) refuse('SEED_INVALID', 'La semilla contiene una empresa sin id o sin nombre.');
    const key = String(item.id);
    if (byId.has(key)) refuse('SEED_INVALID', `Id duplicado en la semilla: ${key}.`);
    byId.set(key, item);
  }
  if (mode === 'empty') {
    if (existing.size > 0) refuse('TABLE_NOT_EMPTY', 'El modo "empty" solo se permite con la tabla businesses vacía.');
    return { mode, insert: [...byId.values()], skippedExisting: [], unknown: [] };
  }
  if (mode === 'ids') {
    const wanted = [...new Set((ids || []).map((v) => String(v).trim()).filter(Boolean))];
    if (!wanted.length) refuse('IDS_REQUIRED', 'El modo "ids" requiere una lista explícita de ids.');
    const unknown = wanted.filter((id) => !byId.has(id));
    if (unknown.length) refuse('UNKNOWN_IDS', `Ids que no existen en la semilla: ${unknown.join(', ')}.`);
    return { mode, insert: wanted.filter((id) => !existing.has(id)).map((id) => byId.get(id)), skippedExisting: wanted.filter((id) => existing.has(id)), unknown: [] };
  }
  return refuse('MODE_REQUIRED', 'Indica --mode empty o --mode ids.');
}

/** pool: objeto compatible con mysql2/promise (query y getConnection). Devuelve un informe; lanza SeedInitError ante cualquier problema. */
export async function runSeedInit({ pool, seed, database, mode, ids, apply = false, confirm = '' }) {
  if (!database || typeof database !== 'string') refuse('DATABASE_REQUIRED', 'Falta el nombre de la base (DB_NAME).');
  if (database === PRODUCTION_DATABASE) refuse('PRODUCTION_REFUSED', 'Esta herramienta no opera sobre la base de producción.');
  const [current] = await pool.query('SELECT DATABASE() AS db_name');
  if (!current[0] || current[0].db_name !== database) refuse('DATABASE_MISMATCH', 'La base conectada no coincide con DB_NAME.');
  const [rows] = await pool.query('SELECT id FROM businesses');
  const plan = planSeedInit({ seed, existingIds: rows.map((r) => r.id), mode, ids });
  const phrase = confirmationPhrase({ database, mode, count: plan.insert.length });
  const report = { database, mode, apply: false, planned: plan.insert.length, skippedExisting: plan.skippedExisting, requiredConfirmation: phrase, inserted: 0 };
  if (!apply) return report;
  if (confirm !== phrase) refuse('CONFIRMATION_MISMATCH', 'La frase de confirmación no coincide con el plan; no se escribió nada.');
  if (!plan.insert.length) return { ...report, apply: true };
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sql = `INSERT INTO businesses (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})`;
    for (const item of plan.insert) await conn.query(sql, rowValues(item));
    await conn.commit();
  } catch (error) {
    try { await conn.rollback(); } catch { /* conexión perdida */ }
    throw new SeedInitError('INSERT_FAILED', `Fallo SQL; se revirtió todo: ${error.message}`);
  } finally { conn.release(); }
  const [after] = await pool.query('SELECT id, phone, whatsapp FROM businesses');
  const present = new Map(after.map((r) => [String(r.id), r]));
  const missing = plan.insert.filter((item) => !present.has(String(item.id)) || present.get(String(item.id)).phone !== (item.phone || '') || present.get(String(item.id)).whatsapp !== (item.whatsapp || ''));
  if (missing.length) refuse('READBACK_FAILED', `La lectura posterior no confirmó ${missing.length} empresas.`);
  return { ...report, apply: true, inserted: plan.insert.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const valueOf = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const env = process.env;
  try {
    const database = (env.DB_NAME || '').trim();
    if (!env.DB_HOST || !env.DB_USER || !env.DB_PASSWORD || !database) refuse('CONFIG_INCOMPLETE', 'Define DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en el entorno del operador.');
    const seed = JSON.parse(readFileSync(valueOf('--seed') || 'src/data/businesses_seed.json', 'utf8'));
    const { default: mysql } = await import('mysql2/promise');
    const pool = mysql.createPool({ host: env.DB_HOST, port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database, connectionLimit: 2, connectTimeout: 5000 });
    try {
      const report = await runSeedInit({ pool, seed, database, mode: valueOf('--mode'), ids: (valueOf('--ids') || '').split(','), apply: args.includes('--apply'), confirm: valueOf('--confirm') || '' });
      console.log(JSON.stringify(report, null, 2));
    } finally { await pool.end(); }
  } catch (error) { console.error(`${error.code || 'ERROR'}: ${error.message}`); process.exit(1); }
}
