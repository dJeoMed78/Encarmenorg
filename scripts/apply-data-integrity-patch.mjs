// ENC-DATA-INTEGRITY-001 — parches exactos, idempotentes y verificables para src/db/mariadb.ts y server.ts.
// Uso: node scripts/apply-data-integrity-patch.mjs [--mariadb src/db/mariadb.ts] [--server server.ts] [--check]
// Cada paso exige que su ancla aparezca exactamente una vez; si algún archivo falla no se escribe NINGUNO.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MARIADB_STEPS = [
  {
    name: 'dbLoadAllBusinesses: modo estricto (un fallo SQL no es una tabla vacía)',
    find: "export async function dbLoadAllBusinesses(): Promise<any[]> {\n  if (!pool) return [];\n  try {\n",
    replace: "export async function dbLoadAllBusinesses(strict = false): Promise<any[]> {\n  if (!pool) {\n    if (strict) throw new Error('BUSINESSES_SOURCE_UNAVAILABLE');\n    return [];\n  }\n  try {\n",
  },
  {
    name: 'dbLoadAllBusinesses: el error estricto se propaga',
    find: "    console.warn('[MariaDB] Error cargando businesses:', err.message);\n    return [];\n",
    replace: "    console.warn('[MariaDB] Error cargando businesses:', err.message);\n    if (strict) throw new Error('BUSINESSES_SOURCE_UNAVAILABLE');\n    return [];\n",
  },
  {
    name: 'dbLoadAllBusinesses: las columnas de contacto mandan sobre raw_data',
    find: "        phone: extra.phone || r.phone || '',\n        whatsapp: extra.whatsapp || r.whatsapp || '',\n",
    replace: "        // Las columnas dedicadas son la fuente de verdad; raw_data solo completa filas heredadas sin columna.\n        phone: String(r.phone || extra.phone || ''),\n        whatsapp: String(r.whatsapp || extra.whatsapp || ''),\n",
  },
  {
    name: 'dbSaveBusiness: opciones explícitas para retirar contactos',
    find: "export async function dbSaveBusiness(biz: any): Promise<boolean> {\n",
    replace: "export async function dbSaveBusiness(biz: any, options: { clearContacts?: readonly ('phone' | 'whatsapp')[] } = {}): Promise<boolean> {\n",
  },
  {
    name: 'dbSaveBusiness: un teléfono o WhatsApp vacío nunca borra el dato guardado',
    find: "        phone = VALUES(phone),\n        whatsapp = VALUES(whatsapp),\n",
    replace: "        phone = IF(?, '', COALESCE(NULLIF(TRIM(VALUES(phone)), ''), phone)),\n        whatsapp = IF(?, '', COALESCE(NULLIF(TRIM(VALUES(whatsapp)), ''), whatsapp)),\n",
  },
  {
    name: 'dbSaveBusiness: parámetros de retiro explícito',
    find: "      biz.status || 'published',\n      rawData\n    ]);\n    return true;\n  } catch (err: any) {\n    console.warn('[MariaDB] Error guardando empresa:', err.message);\n",
    replace: "      biz.status || 'published',\n      rawData,\n      options.clearContacts?.includes('phone') ? 1 : 0,\n      options.clearContacts?.includes('whatsapp') ? 1 : 0\n    ]);\n    return true;\n  } catch (err: any) {\n    console.warn('[MariaDB] Error guardando empresa:', err.message);\n",
  },
  {
    name: 'dbSaveBusinessChecked: guardado con lectura SQL posterior (sin éxito falso)',
    find: "// Dismissed candidate persistence in MariaDB\nexport async function dbSaveDismissedCandidate(",
    replace: [
      "export class BusinessSaveError extends Error {",
      "  code: string;",
      "  constructor(code: string, message: string) {",
      "    super(message);",
      "    this.code = code;",
      "  }",
      "}",
      "",
      "// Guarda y CONFIRMA con una lectura posterior; cualquier fallo lanza BusinessSaveError (nunca devuelve éxito falso).",
      "export async function dbSaveBusinessChecked(biz: any, options: { clearContacts?: readonly ('phone' | 'whatsapp')[] } = {}): Promise<any> {",
      "  const saved = await dbSaveBusiness(biz, options);",
      "  if (!saved || !pool) throw new BusinessSaveError('BUSINESS_SAVE_FAILED', 'No se guardó la empresa en MariaDB.');",
      "  let rows: any;",
      "  try {",
      "    [rows] = await pool.query('SELECT id, name, phone, whatsapp FROM businesses WHERE id = ?', [String(biz.id)]);",
      "  } catch (err: any) {",
      "    throw new BusinessSaveError('BUSINESS_READBACK_FAILED', 'No se pudo confirmar el guardado: ' + err.message);",
      "  }",
      "  const row = rows && rows[0];",
      "  if (!row || row.name !== (biz.name || '')) throw new BusinessSaveError('BUSINESS_READBACK_FAILED', 'La lectura posterior no coincide con lo guardado.');",
      "  for (const field of ['phone', 'whatsapp'] as const) {",
      "    const sent = String(biz[field] || '').trim();",
      "    const cleared = Boolean(options.clearContacts?.includes(field));",
      "    if (cleared ? row[field] !== '' : sent !== '' && row[field] !== sent) throw new BusinessSaveError('BUSINESS_READBACK_FAILED', 'La lectura posterior del contacto no coincide.');",
      "  }",
      "  return { id: row.id, name: row.name, phone: row.phone, whatsapp: row.whatsapp };",
      "}",
      "",
      "// Dismissed candidate persistence in MariaDB",
      "export async function dbSaveDismissedCandidate(",
    ].join('\n'),
  },
  {
    name: 'dbGetBusinessesSignature: la firma detecta altas/bajas/ediciones aunque coincidan conteo y segundo',
    find: "    const [rows]: any = await pool.query('SELECT MAX(updated_at) AS last_update, COUNT(*) AS total FROM businesses');\n    if (rows && rows.length > 0) {\n      const row = rows[0];\n      return {\n        lastUpdate: row.last_update ? String(row.last_update) : null,\n",
    replace: "    const [rows]: any = await pool.query(\"SELECT MAX(updated_at) AS last_update, COUNT(*) AS total, COALESCE(SUM(CRC32(CONCAT(id, '|', COALESCE(updated_at, '')))), 0) AS checksum FROM businesses\");\n    if (rows && rows.length > 0) {\n      const row = rows[0];\n      return {\n        lastUpdate: row.last_update ? String(row.last_update) + '#' + String(row.checksum ?? '') : null,\n",
  },
];

export const SERVER_STEPS = [
  {
    name: 'arranque: MariaDB es la fuente oficial; la semilla no se reinserta ni se siembra una tabla vacía',
    find: [
      "    const dbBusinesses = await dbLoadAllBusinesses();",
      "    if (dbBusinesses.length > 0) {",
      "      const dbIdSet = new Set(dbBusinesses.map(b => String(b.id)));",
      "      const missingInDb = businessesCache.filter(b => !dbIdSet.has(String(b.id)));",
      "      if (missingInDb.length > 0) {",
      "        console.log(`[MariaDB] Añadiendo ${missingInDb.length} empresas del catálogo local que no existían en Hostinger MariaDB...`);",
      "        for (const b of missingInDb) {",
      "          await dbSaveBusiness(b);",
      "        }",
      "",
    ].join('\n'),
    replace: [
      "    // ENC-DATA-INTEGRITY-001: MariaDB es la fuente oficial. Un fallo SQL no se confunde con \"tabla vacía\" y la semilla",
      "    // local NUNCA se reinserta en el arranque (resucitaría empresas eliminadas y pisaría contactos). La inicialización",
      "    // del catálogo solo existe como herramienta manual y confirmada: scripts/catalog-seed-init.mjs.",
      "    let dbBusinesses: any[] = [];",
      "    let dbBusinessesLoaded = true;",
      "    try {",
      "      dbBusinesses = await dbLoadAllBusinesses(true);",
      "    } catch (e: any) {",
      "      dbBusinessesLoaded = false;",
      "      console.error('[MariaDB] No se pudo leer businesses; el arranque no modifica ni siembra la base:', e.message);",
      "    }",
      "    const seedInitRequestedAtBoot = false;",
      "    if (!dbBusinessesLoaded || (dbBusinesses.length === 0 && !seedInitRequestedAtBoot)) {",
      "      console.warn('[MariaDB] Arranque sin escrituras de catálogo (lectura no confiable o tabla vacía). Inicialización solo con scripts/catalog-seed-init.mjs.');",
      "    } else if (dbBusinesses.length > 0) {",
      "      const dbIdSet = new Set(dbBusinesses.map(b => String(b.id)));",
      "      const missingInDb: any[] = [];",
      "      if (businessesCache.some(b => !dbIdSet.has(String(b.id)))) {",
      "        console.warn('[MariaDB] Hay empresas de la semilla local ausentes en MariaDB: NO se reinsertan (MariaDB es la fuente oficial).');",
      "      }",
      "      if (missingInDb.length > 0) {",
      "        for (const b of missingInDb) {",
      "          await dbSaveBusiness(b);",
      "        }",
      "",
    ].join('\n'),
  },
];

const count = (source, part) => (part ? source.split(part).length - 1 : 0);

export function applySteps(source, steps) {
  let next = source;
  const applied = [];
  const skipped = [];
  for (const step of steps) {
    if (count(next, step.replace) === 1) { skipped.push(step.name); continue; }
    const found = count(next, step.find);
    if (found !== 1) throw new Error(`Ancla no válida para "${step.name}": aparece ${found} veces (se esperaba 1). No se modificó nada.`);
    next = next.replace(step.find, () => step.replace);
    applied.push(step.name);
  }
  return { source: next, applied, skipped };
}

export const applyMariadbPatch = (source) => applySteps(source, MARIADB_STEPS);
export const applyServerPatch = (source) => applySteps(source, SERVER_STEPS);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const valueOf = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const targets = [[valueOf('--mariadb'), applyMariadbPatch], [valueOf('--server'), applyServerPatch]].filter(([file]) => file);
  if (!targets.length) { console.error('Uso: node scripts/apply-data-integrity-patch.mjs [--mariadb src/db/mariadb.ts] [--server server.ts] [--check]'); process.exit(2); }
  try {
    const results = targets.map(([file, apply]) => ({ file, ...apply(readFileSync(file, 'utf8')) }));
    if (!args.includes('--check')) for (const result of results) writeFileSync(result.file, result.source);
    console.log(JSON.stringify(results.map(({ file, applied, skipped }) => ({ file, mode: args.includes('--check') ? 'check' : 'write', applied, skipped })), null, 2));
  } catch (error) { console.error(error.message); process.exit(1); }
}
