#!/usr/bin/env node
// ENC-CLASSIFIEDS-BACKEND-001 — integra el carril público de clasificados en server.ts.
// Anclas exactas, idempotente; con --check no escribe. Uso:
//   node scripts/apply-classifieds-backend-patch.mjs --server server.ts --check
//   node scripts/apply-classifieds-backend-patch.mjs --server server.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const IMPORT_ANCHOR = "import { prepareContactPatch, contactsMatchReadback, ContactPatchError, contactDigits, contactCounts, matchesContactFilter, CONTACT_FILTERS, type ContactFilter } from './src/utils/businessContacts';";
const IMPORT_LINE = "\nimport { registerPublicClassifieds } from './src/server/publicClassifieds';";
const REGISTER_ANCHOR = "app.use(express.urlencoded({ extended: true, limit: '50mb' }));";
const REGISTER_LINE = "\n\n// ENC-CLASSIFIEDS-BACKEND-001: carril público aislado de clasificados (no modifica permisos administrativos ni W1).\nregisterPublicClassifieds(app);";

const STEPS = [
  { name: 'import del módulo', find: IMPORT_ANCHOR, replace: IMPORT_ANCHOR + IMPORT_LINE },
  { name: 'registro del router tras el body parser', find: REGISTER_ANCHOR, replace: REGISTER_ANCHOR + REGISTER_LINE },
];

const count = (s, part) => (part ? s.split(part).length - 1 : 0);

export function applyServerPatch(source) {
  let next = source;
  const applied = [];
  const skipped = [];
  for (const step of STEPS) {
    if (count(next, step.replace) === 1) { skipped.push(step.name); continue; }
    const found = count(next, step.find);
    if (found !== 1) throw new Error(`Ancla no válida para "${step.name}": aparece ${found} veces (se esperaba 1). No se modificó nada.`);
    next = next.replace(step.find, () => step.replace);
    applied.push(step.name);
  }
  return { source: next, applied, skipped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const serverPath = args.includes('--server') ? args[args.indexOf('--server') + 1] : undefined;
  if (!serverPath) { console.error('Uso: node scripts/apply-classifieds-backend-patch.mjs --server server.ts [--check]'); process.exit(2); }
  try {
    const result = applyServerPatch(readFileSync(serverPath, 'utf8'));
    if (!args.includes('--check')) writeFileSync(serverPath, result.source);
    console.log(JSON.stringify({ file: serverPath, mode: args.includes('--check') ? 'check' : 'write', applied: result.applied, skipped: result.skipped }, null, 2));
  } catch (error) { console.error(error.message); process.exit(1); }
}
