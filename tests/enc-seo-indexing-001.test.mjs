import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SEO_PRIMARY_ORIGIN, SEO_STAGING_HOST, normalizeSeoHost, isStagingSeoRequest, isCanonicalSeoHost, getCanonicalSeoOrigin, buildSeoRobotsTxt } from '../src/server/seoIndexing.ts';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const deploy = fs.readFileSync(new URL('../.github/workflows/enc-radars-041-043-staging-deploy.yml', import.meta.url), 'utf8');

test('production aliases converge to the official canonical origin', () => {
  for (const host of ['encarmen.org', 'www.encarmen.org', 'empresasencarmen.com', 'www.empresasencarmen.com']) assert.equal(getCanonicalSeoOrigin(host, 'production'), SEO_PRIMARY_ORIGIN);
  assert.equal(isCanonicalSeoHost('www.encarmen.org'), false);
  assert.equal(isCanonicalSeoHost('encarmen.org:443'), true);
  assert.equal(normalizeSeoHost('WWW.EmpresasEnCarmen.com:443'), 'www.empresasencarmen.com');
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
  assert.equal((robots.match(/Sitemap:/g) || []).length, 1);
  assert.ok(robots.includes('Sitemap: https://encarmen.org/sitemap.xml'));
  assert.ok(!robots.includes('empresasencarmen.com'));
});

test('Staging robots remains crawlable for noindex discovery and advertises no sitemap', () => {
  const robots = buildSeoRobotsTxt(SEO_STAGING_HOST, 'staging');
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(!robots.includes('Sitemap:'));
});

test('Express applies noindex header and HTML meta on Staging and disables its sitemap', () => {
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
