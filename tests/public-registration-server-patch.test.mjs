import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPatch, STEPS } from '../scripts/apply-public-registration-patch.mjs';

// Fragmentos EXACTOS de server.ts en la rama (importaciones, guardián de Staging, analizador JSON y registerStagingBusinessRoutes).
const FIXTURE = String.raw`import {registerStagingBusinessRoutes} from './src/server/stagingBusinessRoutes';
import {verifyStagingAdmin,createLoginLimiter,stagingBusinessConfiguration} from './src/server/stagingBusinessSecurity';
import dotenv from 'dotenv';
import {
  isStagingEnvironment,
  isWritePermitted,
  isBusinessWritePermitted,
  PRODUCTION_DB_USER,
  stagingBusinessStore,
  validateStagingDbConfiguration,
  PRODUCTION_DB_NAME
} from './src/db/mariadb.ts';

// Staging safety & write protection: do not allow requests that can modify shared production data.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (isStagingEnvironment()) {
    if (['GET','HEAD','OPTIONS'].includes(req.method.toUpperCase())) return next();
    if (req.method === 'POST' && req.path === '/api/admin/login') return next();
    const businessMutation = (req.method === 'POST' && req.path === '/api/submit-business') || (req.method === 'PATCH' && /^\/(?:api\/)?businesses\/[^/]+$/.test(req.path));
    if (businessMutation && isBusinessWritePermitted()) return next();
    if (req.path === '/api/ratings/get' || req.path === '/api/events/radar-search') return next();
    return res.status(403).json({success:false,error:'STAGING_READ_ONLY',message:'Solo el carril autorizado de registro y edición puede escribir negocios. Las demás operaciones permanecen bloqueadas.'});
  }
  if (!isWritePermitted()) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
      // Excepción para búsquedas o consultas enviadas por POST que no modifican datos
      if (req.path === '/api/events/radar-search' || req.path === '/api/ratings/get') {
        return next();
      }
      return res.status(403).json({
        success: false,
        error: 'STAGING_READ_ONLY',
        message: 'Entorno de pruebas en modo solo lectura / seguro. No se permiten modificaciones para proteger producción.'
      });
    }
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Controlled Staging routes own these paths before the legacy handlers; normal environments fall through.
registerStagingBusinessRoutes(app, {
  isStaging:isStagingEnvironment, canWrite:isBusinessWritePermitted,
  categorySlugs:generateCategorySlugs,
  isAdmin:req=>isVerifiedAdminSession(req), readAll:()=>dbLoadAllBusinesses(true), store:stagingBusinessStore,
  saved:business=>{businessesCache=[business,...businessesCache.filter(b=>String(b.id)!==String(business.id))];cachedDbSignature=null;}
});

// Submit / Register new Business
app.post('/api/submit-business', async (req: Request, res: Response) => {});
`;

test('el parche aplica los cinco cambios exactos, es idempotente y no toca nada más', () => {
  const first = applyPatch(FIXTURE);
  assert.equal(first.applied.length, 5); assert.equal(first.skipped.length, 0); assert.equal(STEPS.length, 5);
  const patched = first.source;
  assert.match(patched, /import \{mountPublicRegistration,publicRegistrationBodyLimit\} from '\.\/src\/server\/publicRegistrationWiring\.ts';/);
  assert.match(patched, /isBusinessWritePermitted,\n  getPool,\n  PRODUCTION_DB_USER,/);
  assert.ok(patched.indexOf("app.use('/api/public/business-registrations', publicRegistrationBodyLimit);") < patched.indexOf("app.use(express.json({ limit: '50mb' }));"));
  const mountAt = patched.indexOf('mountPublicRegistration(app, {');
  assert.ok(mountAt > patched.indexOf('registerStagingBusinessRoutes(app, {') && mountAt < patched.indexOf("app.post('/api/submit-business'"));
  assert.match(patched, /isStaging:isStagingEnvironment, canWrite:isBusinessWritePermitted, getPool,/);
  assert.match(patched, /businessStore:stagingBusinessStore, categorySlugs:generateCategorySlugs,/);
  const again = applyPatch(patched); assert.equal(again.applied.length, 0); assert.equal(again.skipped.length, 5); assert.equal(again.source, patched);
  let restored = patched;
  for (const step of [...STEPS].reverse()) restored = restored.replace(step.replace, () => step.find);
  assert.equal(restored, FIXTURE, 'revertir los reemplazos devuelve el archivo original exacto');
});

test('si una ancla falta o está duplicada, aborta sin devolver un archivo parcial', () => {
  assert.throws(() => applyPatch(FIXTURE.replace("app.use(express.json({ limit: '50mb' }));\n", '')), /limitar el cuerpo.*0 veces/);
  assert.throws(() => applyPatch(FIXTURE + "\napp.use(express.json({ limit: '50mb' }));\n"), /limitar el cuerpo.*2 veces/);
  assert.throws(() => applyPatch('export {};\n'), /Ancla no válida/);
});

function loadGuard(source, flags) {
  const start = source.indexOf('app.use((req: Request, res: Response, next: NextFunction) => {');
  const end = source.indexOf('\n});\n', start) + 4;
  const code = source.slice(start, end).replace(/: Request|: Response|: NextFunction/g, '');
  let guard; new Function('app', 'isStagingEnvironment', 'isWritePermitted', 'isBusinessWritePermitted', code)({ use: (fn) => { guard = fn; } }, () => flags.staging, () => flags.write, () => flags.business);
  return (method, path) => { const out = { next: false }; const res = { status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } }; guard({ method, path }, res, () => { out.next = true; }); return out; };
}

test('guardián de Staging parcheado: permite exclusivamente el POST público previsto (y lo anterior sigue igual)', () => {
  const patched = applyPatch(FIXTURE).source; const open = loadGuard(patched, { staging: true, write: false, business: true });
  assert.equal(open('POST', '/api/public/business-registrations').next, true);
  for (const [method, path] of [['PUT', '/api/public/business-registrations'], ['DELETE', '/api/public/business-registrations'], ['PATCH', '/api/public/business-registrations'], ['POST', '/api/public/business-registrations/'], ['POST', '/api/public/business-registrations/1'], ['POST', '/api/public/other'], ['POST', '/api/admin/business-registrations'], ['POST', '/api/mariadb/sync-catalog'], ['POST', '/api/businesses/1/generate-pin'], ['DELETE', '/api/businesses/1']]) {
    const result = open(method, path); assert.deepEqual([result.next, result.status, result.body && result.body.error], [false, 403, 'STAGING_READ_ONLY'], `${method} ${path}`);
  }
  for (const [method, path] of [['GET', '/api/businesses'], ['POST', '/api/submit-business'], ['PATCH', '/api/businesses/1081'], ['POST', '/api/admin/login'], ['POST', '/api/ratings/get']]) assert.equal(open(method, path).next, true, `${method} ${path}`);
  const closed = loadGuard(patched, { staging: true, write: false, business: false });
  assert.equal(closed('POST', '/api/public/business-registrations').status, 403, 'sin escritura permitida el POST público queda bloqueado');
  const production = loadGuard(patched, { staging: false, write: false, business: true });
  assert.equal(production('POST', '/api/public/business-registrations').status, 403, 'fuera de Staging con escrituras bloqueadas no se abre nada');
  const original = loadGuard(FIXTURE, { staging: true, write: false, business: true });
  assert.equal(original('POST', '/api/public/business-registrations').status, 403, 'sin parche la ruta estaba bloqueada');
});
