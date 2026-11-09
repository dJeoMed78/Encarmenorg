import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SEO_PRIMARY_ORIGIN, SEO_STAGING_HOST, normalizeSeoHost, isStagingSeoRequest, isCanonicalSeoHost, getCanonicalSeoOrigin, getSeoCanonicalRedirect, buildSeoRobotsTxt } from '../src/server/seoIndexing.ts';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const deploy = fs.readFileSync(new URL('../.github/workflows/enc-radars-041-043-staging-deploy.yml', import.meta.url), 'utf8');
const rootRobots = fs.readFileSync(new URL('../robots.txt', import.meta.url), 'utf8');
const publicRobots = fs.readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');

test('production aliases converge to the official canonical origin', () => {
  for (const host of ['encarmen.org', 'www.encarmen.org', 'empresasencarmen.com', 'www.empresasencarmen.com']) assert.equal(getCanonicalSeoOrigin(host, 'production'), SEO_PRIMARY_ORIGIN);
  assert.equal(isCanonicalSeoHost('www.encarmen.org'), false);
  assert.equal(isCanonicalSeoHost('encarmen.org:443'), true);
  assert.equal(normalizeSeoHost('WWW.EmpresasEnCarmen.com:443'), 'www.empresasencarmen.com');
});

test('known duplicate hosts redirect permanently while Staging and official host stay put', () => {
  assert.equal(getSeoCanonicalRedirect('www.empresasencarmen.com', '/negocio/prueba?ref=google', 'production'), 'https://encarmen.org/negocio/prueba?ref=google');
  assert.equal(getSeoCanonicalRedirect('empresasencarmen.com', '/', 'production'), 'https://encarmen.org/');
  assert.equal(getSeoCanonicalRedirect('encarmen.org', '/empresas', 'production'), null);
  assert.equal(getSeoCanonicalRedirect(SEO_STAGING_HOST, '/empresas', 'staging'), null);
});

test('Staging is detected by exact host or trusted APP_ENV', () => {
  assert.equal(isStagingSeoRequest(SEO_STAGING_HOST, 'production'), true);
  assert.equal(isStagingSeoRequest('staging.encarmen.org:443', ''), true);
  assert.equal(isStagingSeoRequest('encarmen.org', 'staging'), true);
  assert.equal(isStagingSeoRequest('notstaging.encarmen.org', 'production'), false);
  assert.equal(getCanonicalSeoOrigin(SEO_STAGING_HOST, 'production'), `https://${SEO_STAGING_HOST}`);
});

test('production robots exposes only the official sitemap and disallows private routes', () => {
  const robots = buildSeoRobotsTxt('www.empresasencarmen.com', 'production');
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(robots.includes('Disallow: /admin/'));
  assert.ok(robots.includes('\n'), 'robots directives must be separated by real newline characters');
  assert.ok(!robots.includes('\\n'), 'robots must not contain literal backslash-n sequences');
  assert.equal((robots.match(/Sitemap:/g) || []).length, 1);
  assert.ok(robots.includes('Sitemap: https://encarmen.org/sitemap.xml'));
  assert.ok(!robots.includes('empresasencarmen.com'));
  for (const file of [rootRobots, publicRobots]) {
    assert.equal((file.match(/Sitemap:/g) || []).length, 1);
    assert.ok(file.includes('Sitemap: https://encarmen.org/sitemap.xml'));
    assert.ok(!file.includes('empresasencarmen.com'));
  }
});

test('Staging robots remains crawlable for noindex discovery and advertises no sitemap', () => {
  const robots = buildSeoRobotsTxt(SEO_STAGING_HOST, 'staging');
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(!robots.includes('Sitemap:'));
});

test('Express redirects alias requests before static serving and adds noindex to Staging', () => {
  const redirectIndex = server.indexOf('getSeoCanonicalRedirect(');
  const staticIndex = server.indexOf('app.use(express.static(path.resolve(__dirname, \'public\')');
  assert.ok(redirectIndex > 0 && staticIndex > redirectIndex, 'domain redirect must run before static files');
  assert.ok(server.includes("if (req.method !== 'GET' && req.method !== 'HEAD') return next();"));
  assert.ok(server.includes('return res.redirect(301, redirectUrl);'));
  assert.ok(server.includes("res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')"));
  assert.ok(server.includes('<meta name="robots" content="noindex, nofollow, noarchive" />'));
  assert.ok(server.includes('return res.status(410).type(\'text/plain\').send(\'Sitemap is disabled on Staging.\')'));
  assert.ok(server.includes('return res.redirect(301, `${SEO_PRIMARY_ORIGIN}/sitemap.xml`)'));
});

test('Server canonical and sitemap use fixed SEO origin, not incoming production host', () => {
  assert.ok(server.includes('getCanonicalSeoOrigin(req.get(\'x-forwarded-host\') || req.get(\'host\'), process.env.APP_ENV)'));
  assert.ok(server.includes('const baseUrl = SEO_PRIMARY_ORIGIN;'));
  assert.ok(deploy.includes('tests/enc-seo-indexing-001.test.mjs'));
});
