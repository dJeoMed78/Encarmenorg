import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../src/components/AdminClassifiedsTab.tsx', import.meta.url), 'utf8');

function helpers(cache = []) {
  const begin = server.indexOf('function prepareRadarClassified(');
  const end = server.indexOf("app.post(['/api/classifieds/approve-candidate'", begin);
  assert.ok(begin >= 0 && end > begin, 'Helpers de aprobación no encontrados');
  const js = stripTypeScriptTypes(server.slice(server.indexOf('function canonicalClassifiedListingUrl('), server.indexOf('function decodeHtmlEntities(')) + '\n' + server.slice(begin, end), { mode: 'strip' });
  return vm.runInNewContext(js + '\n({ prepareRadarClassified, radarClassifiedAlreadyExists })', {
    crypto, URL, classifiedsCache: cache
  });
}

test('búsqueda Sin IA no activa Gemini por omisión', () => {
  assert.match(api, /useAi:\s*boolean\s*=\s*false/);
  assert.match(api, /useAi:\s*useAi === true/);
  const route = server.slice(server.indexOf("app.post('/api/classifieds/radar-search'"));
  assert.ok(route.indexOf('if (!useAi) {') < route.indexOf('const aiClient = getGeminiClient()'));
});

test('el cliente conserva los errores HTTP del radar', () => {
  const route = api.slice(api.indexOf('export async function searchClassifiedRadarCandidates('), api.indexOf('export async function approveClassifiedCandidate('));
  assert.match(route, /!res\.ok\s*\|\|\s*!data\s*\|\|\s*data\.success !== true/);
  assert.match(route, /typeof data\?\.message === 'string'/);
});

test('valida el anuncio y evita candidatos sin fuente HTTPS', () => {
  const { prepareRadarClassified } = helpers();
  assert.ok(prepareRadarClassified({title:'',sourceUrl:'https://mx.computrabajo.com/ofertas-de-trabajo/123'}).error);
  assert.ok(prepareRadarClassified({title:'Aviso',sourceUrl:'http://mx.computrabajo.com/ofertas-de-trabajo/123'}).error);
  const { ad } = prepareRadarClassified({
    title: '  Aviso  ', sourceUrl:'https://mx.computrabajo.com/ofertas-de-trabajo/123#foo',
    pendingApproval:true, alreadyPublished:false
  });
  assert.equal(ad.title, 'Aviso');
  assert.equal(ad.sourceUrl, 'https://mx.computrabajo.com/ofertas-de-trabajo/123');
  assert.equal(ad.pendingApproval, undefined);
  assert.equal(ad.alreadyPublished, undefined);
  assert.ok(ad.id.startsWith('ad-'));
});

test('detecta duplicados ya presentes en caché', () => {
  const {prepareRadarClassified, radarClassifiedAlreadyExists} = helpers([
    {title:'Aviso',sourceUrl:'https://mx.computrabajo.com/ofertas-de-trabajo/123'}
  ]);
  const {ad} = prepareRadarClassified({title:'Aviso',sourceUrl:'https://mx.computrabajo.com/ofertas-de-trabajo/123'});
  assert.equal(radarClassifiedAlreadyExists(ad), true);
});

test('aprobación individual confirma SQL antes de actualizar caché', () => {
  const start = server.indexOf("app.post(['/api/classifieds/approve-candidate'");
  const end = server.indexOf("app.post(['/api/classifieds/batch-approve'",start);
  const code = server.slice(start,end);
  assert.match(code, /adminSecurity\.isAuthorized\(req, 'admin:manage'\)/);
  assert.match(code, /saved !== 'created'/);
  assert.match(code, /dbLoadAllClassifieds\(\)/);
  assert.ok(code.indexOf('dbCreateRadarClassifiedOnce(ad)') < code.indexOf('classifiedsCache.unshift(verified)'));
});

test('lote informa fallos parciales y comprueba escritura', () => {
  const start = server.indexOf("app.post(['/api/classifieds/batch-approve'");
  const code = server.slice(start,server.indexOf('// GUÍA DE EMERGENCIAS',start));
  assert.match(code, /candidates\.length > 50/);
  assert.match(code, /failed\.push/);
  assert.match(code, /saved = await dbSaveClassified\(ad\)/);
  assert.match(code, /success = failed\.length === 0/);
});

test('interfaz no muestra éxito antes de respuesta', () => {
  const code = ui.slice(ui.indexOf('const handleApprove = async'),ui.indexOf('const handleDismissCandidate'));
  assert.ok(code.indexOf('await approveClassifiedCandidate(cand)') < code.indexOf("type: 'success'"));
  assert.ok(code.indexOf('await batchApproveClassifiedCandidates(toApprove)') < code.lastIndexOf("type: 'success'"));
});

test('Staging permite búsqueda autenticada pero no publicación', () => {
  const guard = server.slice(server.indexOf('// Staging safety & write protection'),server.indexOf('// 1. REGLA GEOIP'));
  assert.match(guard, /req\.path === '\/api\/classifieds\/radar-search' && adminSecurity\.isAuthorized/);
  assert.doesNotMatch(guard, /req\.path === '\/api\/classifieds\/approve-candidate'/);
  assert.doesNotMatch(guard, /req\.path === '\/api\/classifieds\/batch-approve'/);
});


function approvalHarness({ authorized = true, writeEnabled = true, dbActive = true, readBack = true, onSave = async () => 'created' } = {}) {
  const begin = server.indexOf('function prepareRadarClassified(');
  const end = server.indexOf('// GUÍA DE EMERGENCIAS', begin);
  assert.ok(begin !== -1 && end > begin);
  const code = stripTypeScriptTypes(server.slice(server.indexOf('function canonicalClassifiedListingUrl('), server.indexOf('function decodeHtmlEntities(')) + '\n' + server.slice(begin, end), { mode: 'strip' });
  const handlers = new Map();
  const cache = [];
  const stored = [];
  const context = {
    app: { post(routes, handler) { for (const route of routes) handlers.set(route, handler); } },
    crypto,
    URL,
    classifiedsCache: cache,
    adminSecurity: { isAuthorized: () => authorized },
    isWritePermitted: () => writeEnabled,
    isMariaDbActive: () => dbActive,
    dbCreateRadarClassifiedOnce: async ad => {
      const result = await onSave(ad);
      if (result === 'created') stored.push(ad);
      return result;
    },
    dbLoadAllClassifieds: async () => readBack ? [...stored] : [],
    fs: { writeFileSync() {} },
    path: { resolve: () => '/tmp/not-written.json' },
    __dirname: '/tmp',
    console: { log() {}, warn() {}, error() {} }
  };
  vm.runInNewContext(code, context);
  async function post(url, body) {
    const handler = handlers.get(url);
    assert.ok(handler, 'No está registrada la ruta ' + url);
    const res = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(value) { this.body = value; return this; }
    };
    await handler({ body }, res);
    return res;
  }
  return { post, cache, stored };
}

const classified = (sourceUrl = 'https://mx.computrabajo.com/ofertas-de-trabajo/1') => ({
  title: 'Anuncio verificado', sourceUrl, category: 'ventas'
});

test('HTTP 403: aprobación no autorizada no escribe SQL', async () => {
  let attempts = 0;
  const h = approvalHarness({ authorized: false, onSave: async () => { attempts++; return 'created'; } });
  const result = await h.post('/api/classifieds/approve-candidate', { candidate: classified() });
  assert.equal(result.statusCode, 403);
  assert.equal(result.body.success, false);
  assert.equal(attempts, 0);
  assert.equal(h.cache.length, 0);
});

test('HTTP 503: guardia sin permiso de escritura mantiene caché intacta', async () => {
  const h = approvalHarness({ writeEnabled: false });
  const result = await h.post('/api/classifieds/approve-candidate', { candidate: classified() });
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.success, false);
  assert.equal(h.cache.length, 0);
});

test('HTTP 503: MariaDB rechaza escritura sin anunciar publicación', async () => {
  const h = approvalHarness({ onSave: async () => 'error' });
  const result = await h.post('/api/classifieds/approve-candidate', { candidate: classified() });
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.success, false);
  assert.equal(h.cache.length, 0);
});

test('HTTP 200: éxito exige escritura y readback', async () => {
  const h = approvalHarness();
  const result = await h.post('/api/classifieds/approve-candidate', { candidate: classified() });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(h.stored.length, 1);
  assert.equal(h.cache.length, 1);
  assert.equal(result.body.classified.id, h.stored[0].id);
});

test('HTTP 409: anuncio repetido no produce una segunda escritura', async () => {
  const h = approvalHarness();
  await h.post('/api/classifieds/approve-candidate', { candidate: classified() });
  const second = await h.post('/api/classifieds/approve-candidate', { candidate: classified() });
  assert.equal(second.statusCode, 409);
  assert.equal(second.body.success, false);
  assert.equal(h.stored.length, 1);
});

test('HTTP 207: lote informa un éxito y un fallo sin falsear el total', async () => {
  const h = approvalHarness({
    onSave: async ad => !ad.sourceUrl.includes('/denegado') ? 'created' : 'error'
  });
  const result = await h.post('/api/classifieds/batch-approve', {
    candidates: [classified(), classified('https://mx.computrabajo.com/ofertas-de-trabajo/denegado')]
  });
  assert.equal(result.statusCode, 207);
  assert.equal(result.body.success, false);
  assert.equal(result.body.count, 1);
  assert.equal(result.body.approved.length, 1);
  assert.equal(result.body.failed.length, 1);
  assert.equal(h.cache.length, 1);
});

test('enlaces externos arbitrarios, búsquedas y raíz no son anuncios verificables', () => {
  const source = server.slice(server.indexOf('function canonicalClassifiedListingUrl('),server.indexOf('function decodeHtmlEntities('));
  const { isDirectListingUrl, canonicalClassifiedListingUrl } = vm.runInNewContext(
    stripTypeScriptTypes(source, { mode: 'strip' }) + '\n({isDirectListingUrl, canonicalClassifiedListingUrl})',
    { URL }
  );
  assert.equal(isDirectListingUrl('https://example.com/articulo/123'), false);
  assert.equal(isDirectListingUrl('https://www.bing.com/search?q=vacante'), false);
  assert.equal(isDirectListingUrl('https://mx.computrabajo.com/empleos'), false);
  assert.equal(isDirectListingUrl('https://mx.computrabajo.com/ofertas-de-trabajo/123'), true);
  assert.equal(canonicalClassifiedListingUrl('https://mx.computrabajo.com/ofertas-de-trabajo/123?utm_source=x#foto'),
    'https://mx.computrabajo.com/ofertas-de-trabajo/123');
});

test('el texto de Gemini no se acepta como evidencia por sí solo', () => {
  const route = server.slice(server.indexOf("app.post('/api/classifieds/radar-search'"),
    server.indexOf('// Classified radar approvals:'));
  assert.match(route, /observedUrls\.has\(canonical\)/);
  assert.match(route, /canonicalClassifiedListingUrl\(urlToCheck\)/);
});

test('HTTP 503: ausencia de readback no confirma la publicación ni modifica caché', async () => {
  const h = approvalHarness({ readBack: false });
  const result = await h.post('/api/classifieds/approve-candidate', { candidate: classified() });
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.success, false);
  assert.equal(h.cache.length, 0);
  assert.equal(h.stored.length, 1, 'El guardado simuló éxito; requiere conciliación antes de reintentar');
});

test('HTTP 400: candidatos sin enlace individual válido se rechazan antes de SQL', async () => {
  const h = approvalHarness();
  const result = await h.post('/api/classifieds/approve-candidate', {
    candidate: { title: 'Publicidad no validada', sourceUrl: 'https://example.com/anuncio/1' }
  });
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.success, false);
  assert.equal(h.stored.length, 0);
});
