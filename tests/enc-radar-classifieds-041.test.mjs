import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../src/components/AdminClassifiedsTab.tsx', import.meta.url), 'utf8');

function helpers(cache = []) {
  const begin = server.indexOf('function prepareRadarClassified(');
  const end = server.indexOf("app.post(['/api/classifieds/approve-candidate'", begin);
  assert.ok(begin >= 0 && end > begin, 'Helpers de aprobación no encontrados');
  const js = ts.transpileModule(server.slice(begin, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }
  }).outputText;
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
  assert.ok(prepareRadarClassified({title:'',sourceUrl:'https://example.com/123'}).error);
  assert.ok(prepareRadarClassified({title:'Aviso',sourceUrl:'http://example.com/123'}).error);
  const { ad } = prepareRadarClassified({
    title: '  Aviso  ', sourceUrl:'https://example.com/123#foo',
    pendingApproval:true, alreadyPublished:false
  });
  assert.equal(ad.title, 'Aviso');
  assert.equal(ad.sourceUrl, 'https://example.com/123');
  assert.equal(ad.pendingApproval, undefined);
  assert.equal(ad.alreadyPublished, undefined);
  assert.ok(ad.id.startsWith('ad-'));
});

test('detecta duplicados ya presentes en caché', () => {
  const {prepareRadarClassified, radarClassifiedAlreadyExists} = helpers([
    {title:'Aviso',sourceUrl:'https://example.com/123'}
  ]);
  const {ad} = prepareRadarClassified({title:'Aviso',sourceUrl:'https://example.com/123'});
  assert.equal(radarClassifiedAlreadyExists(ad), true);
});

test('aprobación individual confirma SQL antes de actualizar caché', () => {
  const start = server.indexOf("app.post(['/api/classifieds/approve-candidate'");
  const end = server.indexOf("app.post(['/api/classifieds/batch-approve'",start);
  const code = server.slice(start,end);
  assert.match(code, /adminSecurity\.isAuthorized\(req, 'admin:manage'\)/);
  assert.match(code, /saved !== true/);
  assert.match(code, /dbLoadAllClassifieds\(\)/);
  assert.ok(code.indexOf('dbSaveClassified(ad)') < code.indexOf('classifiedsCache.unshift(verified)'));
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
