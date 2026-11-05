import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';

const mariadb = fs.readFileSync(new URL('../src/db/mariadb.ts', import.meta.url), 'utf8');
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
  assert.match(code, /stagingClassifiedLane \? await stagingClassifiedStore\.create\(ad\) : await dbCreateRadarClassifiedOnce\(ad\)/);
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
    AbortSignal,
    fetch: async () => ({ status: 200, headers: { get: key => key === 'content-type' ? 'text/html; charset=utf-8' : null }, text: async () => '<html><title>Anuncio verificado</title> Ciudad del Carmen, Campeche <p>Anuncio verificado</p></html>' }),
    decodeHtmlEntities: text => text,
    classifiedsCache: cache,
    adminSecurity: { isAuthorized: () => authorized },
    isWritePermitted: () => writeEnabled,
    isStagingEnvironment: () => false,
    isStagingClassifiedWritePermitted: () => false,
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

function sqlInsertHarness({ allowed = true, queryImpl = async () => [{ affectedRows: 1 }] } = {}) {
  const start = mariadb.indexOf('export async function dbCreateRadarClassifiedOnce(');
  const end = mariadb.indexOf('export async function dbDeleteClassified(', start);
  assert.ok(start >= 0 && end > start);
  const isolated = stripTypeScriptTypes(mariadb.slice(start,end).replace(/^export /,''), {mode:'strip'});
  const queries = [];
  const context = {
    guardWrite: () => allowed,
    pool: { query: async (sql, params) => {
      queries.push({ sql, params });
      return queryImpl(sql, params);
    } },
    console: { warn() {} },
    JSON
  };
  const fn = vm.runInNewContext(isolated + '\n dbCreateRadarClassifiedOnce', context);
  return { fn, queries };
}

test('alta SQL: INSERT exclusivo no ejecuta UPSERT sobre un anuncio existente', async () => {
  const h = sqlInsertHarness();
  const result = await h.fn({ id:'ad-abc', title:'Aviso', sourceUrl:'https://mx.computrabajo.com/ofertas-de-trabajo/123' });
  assert.equal(result,'created');
  assert.equal(h.queries.length,1);
  assert.match(h.queries[0].sql,/INSERT INTO classifieds/);
  assert.doesNotMatch(h.queries[0].sql,/ON DUPLICATE KEY UPDATE/);
});

test('alta SQL: colisión de clave primaria devuelve duplicate y no sobrescribe', async () => {
  const h = sqlInsertHarness({ queryImpl: async () => { throw {code:'ER_DUP_ENTRY'}; } });
  assert.equal(await h.fn({id:'ad-abc',title:'Aviso'}),'duplicate');
  assert.equal(h.queries.length,1);
});

test('alta SQL: fallo o guardia de escritura no simulan persistencia', async () => {
  const denied = sqlInsertHarness({allowed:false});
  assert.equal(await denied.fn({id:'ad-abc',title:'Aviso'}),'blocked');
  assert.equal(denied.queries.length,0);
  const failed = sqlInsertHarness({queryImpl: async () => { throw {code:'ER_LOCK_DEADLOCK'}; }});
  assert.equal(await failed.fn({id:'ad-abc',title:'Aviso'}),'error');
});

test('los identificadores de origen son deterministas para reintentos', () => {
  const { prepareRadarClassified } = helpers();
  const source = 'https://mx.computrabajo.com/ofertas-de-trabajo/123';
  const a = prepareRadarClassified({title:'Puesto A',sourceUrl:source});
  const b = prepareRadarClassified({title:'Puesto B',sourceUrl:source + '?utm_source=radar'});
  assert.equal(a.ad.id,b.ad.id);
});


function sourceEvidenceHarness({ status = 200, html = '<html><title>Anuncio verificado</title><h1>Anuncio verificado</h1> Ciudad del Carmen, Campeche</html>', type = 'text/html' } = {}) {
  const begin = server.indexOf('function canonicalClassifiedListingUrl(');
  const end = server.indexOf('function buildCandidateFromScrapedItem(', begin);
  const moduleText = stripTypeScriptTypes(server.slice(begin, end), { mode: 'strip' });
  const ctx = {
    URL, AbortSignal,
    fetch: async () => ({
      status, headers: { get: key => key === 'content-type' ? type : null },
      text: async () => html
    })
  };
  return vm.runInNewContext(moduleText + '\nverifyClassifiedListingEvidence', ctx);
}

const sourceCandidate = { title: 'Anuncio verificado', sourceUrl: 'https://mx.computrabajo.com/ofertas-de-trabajo/123' };

test('prueba aislada: fuente directa con encabezado y Ciudad del Carmen se acepta', async () => {
  const verify = sourceEvidenceHarness();
  const result = await verify(sourceCandidate);
  assert.equal(result.verified, true);
  assert.ok(result.checkedAt);
});

test('prueba aislada: fuente HTTP 404 no se acepta', async () => {
  const verify = sourceEvidenceHarness({ status: 404 });
  assert.equal((await verify(sourceCandidate)).verified, false);
});

test('prueba aislada: página no relacionada aunque mencione la ciudad no se acepta', async () => {
  const verify = sourceEvidenceHarness({ html: '<html><title>Otra propiedad</title><h1>Otra propiedad</h1> Ciudad del Carmen</html>' });
  assert.equal((await verify(sourceCandidate)).verified, false);
});

test('prueba aislada: falta de ciudad verificable bloquea anuncio', async () => {
  const verify = sourceEvidenceHarness({ html: '<html><title>Anuncio verificado</title><h1>Anuncio verificado</h1> Mérida, Yucatán</html>' });
  assert.equal((await verify(sourceCandidate)).verified, false);
});

test('prueba aislada: publicación expirada es rechazada', async () => {
  const verify = sourceEvidenceHarness({ html: '<html><title>Anuncio verificado</title><h1>Anuncio verificado</h1> Ciudad del Carmen. Oferta finalizada.</html>' });
  assert.equal((await verify(sourceCandidate)).verified, false);
});

test('prueba aislada: la URL de un dominio desconocido no se consulta', async () => {
  const verify = sourceEvidenceHarness();
  assert.equal((await verify({title:'Anuncio verificado',sourceUrl:'https://example.org/ad/1'})).verified, false);
});


test('candidatos revisados no heredan precios ni contactos no contrastados', () => {
  const code = server.slice(server.indexOf('async function scrapeRealWebClassifieds('),server.indexOf('// ENDPOINT DE CLASIFICADOS CON LAS 2 VERSIONES:'));
  assert.match(code, /sourceVerification: 'direct-page-title-location'/);
  assert.match(code, /price: null/);
  assert.match(code, /phone: ''/);
  assert.match(code, /whatsapp: ''/);
  assert.match(code, /Consulta la publicación original para confirmar/);
});

test('el radar no llama vigentes a anuncios con fecha original desconocida', () => {
  const builder = server.slice(server.indexOf('function buildCandidateFromScrapedItem('),server.indexOf('async function scrapeRealWebClassifieds('));
  assert.match(builder, /sourcePublishedAt: null/);
  assert.match(builder, /discoveredAt: new Date\(\).toISOString\(\)/);
});
