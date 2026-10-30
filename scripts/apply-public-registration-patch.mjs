// ENC-PUBLIC-REGISTRATION-001-R1 — parche idempotente y verificable para server.ts.
// Uso: node scripts/apply-public-registration-patch.mjs server.ts [--check]
// Cada paso exige que su ancla aparezca exactamente una vez; si no, aborta sin escribir nada.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SAVED = "  saved:business=>{businessesCache=[business,...businessesCache.filter(b=>String(b.id)!==String(business.id))];cachedDbSignature=null;}\n});\n";

export const STEPS = [
  {
    name: 'importar el montaje',
    find: "import {registerStagingBusinessRoutes} from './src/server/stagingBusinessRoutes';\n",
    replace: "import {registerStagingBusinessRoutes} from './src/server/stagingBusinessRoutes';\nimport {mountPublicRegistration,publicRegistrationBodyLimit} from './src/server/publicRegistrationWiring.ts';\n",
  },
  {
    name: 'importar getPool',
    find: '  isBusinessWritePermitted,\n  PRODUCTION_DB_USER,\n',
    replace: '  isBusinessWritePermitted,\n  getPool,\n  PRODUCTION_DB_USER,\n',
  },
  {
    name: 'permitir solo el POST público en el guardián de Staging',
    find: "const businessMutation = (req.method === 'POST' && req.path === '/api/submit-business') || (",
    replace: "const businessMutation = (req.method === 'POST' && (req.path === '/api/submit-business' || req.path === '/api/public/business-registrations')) || (",
  },
  {
    name: 'limitar el cuerpo antes del analizador JSON global',
    find: "app.use(express.json({ limit: '50mb' }));\n",
    replace: "app.use('/api/public/business-registrations', publicRegistrationBodyLimit);\napp.use(express.json({ limit: '50mb' }));\n",
  },
  {
    name: 'montar la ruta pública tras registerStagingBusinessRoutes',
    find: SAVED,
    replace: SAVED +
      '\n// ENC-PUBLIC-REGISTRATION-001-R1: el POST anónimo inserta directamente en businesses (solo Staging).\n' +
      'mountPublicRegistration(app, {\n' +
      '  isStaging:isStagingEnvironment, canWrite:isBusinessWritePermitted, getPool,\n' +
      '  businessStore:stagingBusinessStore, categorySlugs:generateCategorySlugs,\n' +
      '  saved:business=>{businessesCache=[business,...businessesCache.filter(b=>String(b.id)!==String(business.id))];cachedDbSignature=null;},\n' +
      "  isVisible:id=>businessesCache.some(b=>String(b.id)===String(id)&&(b.status||'published')==='published')\n" +
      '});\n',
  },
];

const count = (source, part) => (part ? source.split(part).length - 1 : 0);

export function applyPatch(source) {
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
  const [file, flag] = process.argv.slice(2);
  if (!file) { console.error('Uso: node scripts/apply-public-registration-patch.mjs server.ts [--check]'); process.exit(2); }
  try {
    const result = applyPatch(readFileSync(file, 'utf8'));
    if (flag !== '--check') writeFileSync(file, result.source);
    console.log(JSON.stringify({ file, mode: flag === '--check' ? 'check' : 'write', applied: result.applied, skipped: result.skipped }, null, 2));
  } catch (error) { console.error(error.message); process.exit(1); }
}
