#!/usr/bin/env node
// ENC-MARIADB-REAL-TEST-001 — Laboratorio reproducible y aislado contra una MariaDB DESECHABLE.
//
// Prueba la CAPA CONSOLIDADA real (src/db/mariadb.ts, commit W1 a16ca710449eda3c68f26016b91ce59d55b95b2b)
// sin modificar server.ts ni ninguna fuente funcional. Crea una base nueva enc_lab_<timestamp>, ejecuta los
// escenarios y la elimina al terminar (--keep la conserva para inspección).
//
//   Plan:     DB_HOST=127.0.0.1 DB_USER=lab DB_PASSWORD=*** npx tsx scripts/mariadb-real-lab.mjs
//   Ejecutar: DB_HOST=127.0.0.1 DB_USER=lab DB_PASSWORD=*** LAB_CONFIRM="<frase del plan>" npx tsx scripts/mariadb-real-lab.mjs
//   Conservar: añadir --keep
//
// Nunca usa Hostinger, producción ni Staging real: si DB_NAME/DB_USER coinciden con los de producción, aborta.
// Credenciales SOLO desde el entorno del operador; nunca en el código ni en el repositorio.
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);

export const LAB_DB_PREFIX = 'enc_lab_';
export const SCENARIOS = [
  'catalogo_vacio', 'registro_persistencia', 'telefono_whatsapp', 'edicion_parcial',
  'edicion_contactos_nuevos', 'eliminacion_confirmada', 'reinicio_sin_resurreccion',
  'fallo_sql_recuperacion', 'idempotencia', 'actualizacion_cache',
];

export function labDatabaseName(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${LAB_DB_PREFIX}${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}_${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`;
}

export function confirmationPhrase({ database, scenarioCount = SCENARIOS.length }) {
  return `ENC-LAB:${database}:${scenarioCount}`;
}

export class LabRefusal extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const refuse = (code, message) => { throw new LabRefusal(code, message); };

export function guardLabTarget({ database, user, productionDatabase, productionUser }) {
  if (!database || !user) refuse('CONFIG_INCOMPLETE', 'Se requieren DB_NAME y DB_USER en el entorno.');
  if (database === productionDatabase) refuse('PRODUCTION_REFUSED', `DB_NAME es la base de producción (${productionDatabase}).`);
  if (user === productionUser) refuse('PRODUCTION_REFUSED', `DB_USER es el usuario de producción (${productionUser}).`);
  if (!database.startsWith(LAB_DB_PREFIX) && !database.startsWith('enc_lab')) {
    refuse('NOT_DISPOSABLE', `La base "${database}" no parece desechable; el laboratorio solo crea/usufructúa bases "${LAB_DB_PREFIX}*".`);
  }
}

export const BUSINESSES_DDL = `CREATE TABLE IF NOT EXISTS businesses (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT '',
  category VARCHAR(255) DEFAULT '',
  subcategory VARCHAR(255) DEFAULT '',
  description TEXT,
  address VARCHAR(500) DEFAULT '',
  colonia VARCHAR(255) DEFAULT '',
  phone VARCHAR(64) DEFAULT '',
  whatsapp VARCHAR(64) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  website VARCHAR(500) DEFAULT '',
  facebook VARCHAR(500) DEFAULT '',
  instagram VARCHAR(500) DEFAULT '',
  schedule VARCHAR(500) DEFAULT '',
  image VARCHAR(500) DEFAULT '',
  rating DECIMAL(3,1) DEFAULT 5.0,
  reviews_count INT DEFAULT 0,
  verified TINYINT(1) DEFAULT 1,
  featured TINYINT(1) DEFAULT 0,
  status VARCHAR(32) DEFAULT 'published',
  raw_data LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const BIZ = (over = {}) => ({
  id: 'lab-1', name: 'Taller Lab', category: 'Servicios', subcategory: 'Mecánica',
  description: 'Empresa de laboratorio', address: 'Calle Lab 1', colonia: 'Centro',
  phone: '9381112233', whatsapp: '9382223344', email: 'lab@test.local', website: '',
  facebook: '', instagram: '', schedule: 'L-V 9-18', image: '', rating: 5, reviews_count: 0,
  verified: true, featured: false, status: 'published', ...over,
});
const byId = (list, id) => list.find((b) => String(b.id) === String(id));

/** Ejecuta el laboratorio completo contra una conexión mysql2/promise ya creada y el módulo consolidado real. */
export async function runLab({ adminPool, database, lab, keep = false, log = () => {} }) {
  const results = [];
  const record = (name, passed, detail) => { results.push({ name, passed, detail }); log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
  const biz = BIZ();

  // 0. Base desechable nueva
  await adminPool.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await adminPool.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

  try {
    // 1. Catálogo vacío
    await lab.reload();
    await lab.query(BUSINESSES_DDL);
    let rows = await lab.dbLoadAllBusinesses();
    record('catalogo_vacio', Array.isArray(rows) && rows.length === 0, `filas=${rows.length}`);

    // 2. Registro + persistencia y lectura posterior
    const saved = await lab.dbSaveBusiness(biz);
    rows = await lab.dbLoadAllBusinesses();
    const found = byId(rows, biz.id);
    record('registro_persistencia', Boolean(saved) && Boolean(found) && found.name === biz.name, `saved=${saved}, filas=${rows.length}`);

    // 3. Teléfono y WhatsApp persisten en columnas
    record('telefono_whatsapp', found && found.phone === biz.phone && found.whatsapp === biz.whatsapp,
      `phone=${found && found.phone}, whatsapp=${found && found.whatsapp}`);

    // 4. Edición parcial: contactos vacíos NO borran los guardados
    const partial = await lab.dbSaveBusiness({ ...biz, description: 'Editada parcialmente', phone: '', whatsapp: '' });
    rows = await lab.dbLoadAllBusinesses();
    const afterPartial = byId(rows, biz.id);
    record('edicion_parcial', Boolean(partial) && afterPartial && afterPartial.phone === biz.phone && afterPartial.whatsapp === biz.whatsapp && afterPartial.description === 'Editada parcialmente',
      `phone=${afterPartial && afterPartial.phone}, whatsapp=${afterPartial && afterPartial.whatsapp}`);

    // 5. Edición con contactos nuevos sí los reemplaza
    await lab.dbSaveBusiness({ ...biz, phone: '9389998877', whatsapp: '9388887766' });
    rows = await lab.dbLoadAllBusinesses();
    const afterNew = byId(rows, biz.id);
    record('edicion_contactos_nuevos', afterNew && afterNew.phone === '9389998877' && afterNew.whatsapp === '9388887766',
      `phone=${afterNew && afterNew.phone}, whatsapp=${afterNew && afterNew.whatsapp}`);

    // 6. Firma de caché cambia tras una escritura
    const sigBefore = await lab.dbGetBusinessesSignature();
    await lab.dbSaveBusiness({ ...biz, name: 'Taller Lab v2' });
    const sigAfter = await lab.dbGetBusinessesSignature();
    const changed = JSON.stringify(sigBefore) !== JSON.stringify(sigAfter);
    record('actualizacion_cache', Boolean(sigBefore && sigAfter && changed), `antes=${JSON.stringify(sigBefore)} después=${JSON.stringify(sigAfter)}`);

    // 7. Idempotencia: guardar dos veces la misma empresa deja una sola fila
    await lab.dbSaveBusiness({ ...biz, name: 'Taller Lab v2' });
    rows = await lab.dbLoadAllBusinesses();
    record('idempotencia', rows.filter((b) => String(b.id) === String(biz.id)).length === 1, `filas del id=${rows.filter((b) => String(b.id) === String(biz.id)).length}`);

    // 8. Eliminación confirmada
    const deleted = await lab.dbDeleteBusiness(String(biz.id));
    rows = await lab.dbLoadAllBusinesses();
    record('eliminacion_confirmada', Boolean(deleted) && !byId(rows, biz.id), `deleted=${deleted}, filas=${rows.length}`);

    // 9. Reinicio sin resurrección: reconectar y releer; la eliminada no vuelve
    await lab.reload();
    rows = await lab.dbLoadAllBusinesses();
    record('reinicio_sin_resurreccion', !byId(rows, biz.id), `filas=${rows.length}`);

    // 10. Fallo SQL y recuperación: tabla ausente no corrompe el estado; al recrearla, la capa vuelve a operar
    await lab.query('DROP TABLE businesses');
    let failureObserved = null;
    try { rows = await lab.dbLoadAllBusinesses(); failureObserved = `load devolvió ${Array.isArray(rows) ? rows.length + ' filas' : typeof rows}`; }
    catch (e) { failureObserved = `load lanzó ${e.code || e.message}`; }
    await lab.query(BUSINESSES_DDL);
    const recovered = await lab.dbSaveBusiness(biz);
    rows = await lab.dbLoadAllBusinesses();
    record('fallo_sql_recuperacion', Boolean(recovered) && Boolean(byId(rows, biz.id)), `fallo observado: ${failureObserved}; recuperación=${recovered}`);
  } finally {
    if (!keep) { try { await adminPool.query(`DROP DATABASE IF EXISTS \`${database}\``); } catch (_) {} }
  }
  return { database, kept: keep, scenarios: results, passed: results.filter((r) => r.passed).length, total: results.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env;
  const database = env.LAB_DB_NAME || labDatabaseName();
  const expected = confirmationPhrase({ database });
  try {
    if (!env.DB_HOST || !env.DB_USER || !env.DB_PASSWORD || !env.DB_NAME) {
      refuse('CONFIG_INCOMPLETE', 'Define DB_HOST, DB_USER, DB_PASSWORD y DB_NAME (servidor desechable) en el entorno.');
    }
    guardLabTarget({ database: env.DB_NAME, user: env.DB_USER, productionDatabase: env.ENC_PROD_DB_NAME || '', productionUser: env.ENC_PROD_DB_USER || '' });
    if (!has('--apply')) {
      console.log(JSON.stringify({ mode: 'plan', database, scenarios: SCENARIOS.length, requiredConfirmation: expected, note: 'Sin --apply no se crea ni modifica ninguna base.' }, null, 2));
      process.exit(0);
    }
    if (env.LAB_CONFIRM !== expected) refuse('CONFIRMATION_MISMATCH', `LAB_CONFIRM debe ser exactamente "${expected}".`);
    const { default: mysql } = await import('mysql2/promise');
    const adminPool = mysql.createPool({ host: env.DB_HOST, port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, connectionLimit: 2, connectTimeout: 5000 });
    // El módulo consolidado se importa DESPUÉS de fijar DB_NAME al laboratorio, para que initMariaDb apunte a la base desechable.
    process.env.DB_NAME = database;
    const lab = await import('../src/db/mariadb.ts');
    const labHandle = {
      query: (sql) => adminPool.query(sql),
      reload: async () => { await lab.initMariaDb(); },
      dbLoadAllBusinesses: () => lab.dbLoadAllBusinesses(),
      dbSaveBusiness: (b) => lab.dbSaveBusiness(b),
      dbDeleteBusiness: (id) => lab.dbDeleteBusiness(id),
      dbGetBusinessesSignature: () => lab.dbGetBusinessesSignature(),
    };
    try {
      const report = await runLab({ adminPool, database, lab: labHandle, keep: has('--keep'), log: (m) => console.log(m) });
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.passed === report.total ? 0 : 1;
    } finally { await adminPool.end(); }
  } catch (error) {
    console.error(`${error.code || 'ERROR'}: ${error.message}`);
    process.exit(1);
  }
}
