import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SEO_PRIMARY_ORIGIN,
  SEO_STAGING_HOST,
  normalizeSeoHost,
  isStagingSeoRequest,
  isCanonicalSeoHost,
  getCanonicalSeoOrigin,
  getSeoCanonicalRedirect,
  buildSeoRobotsTxt,
  getLegacyWordPressRetirement,
  getMissingBusinessRoute,
  getMissingCategoryRoute,
  isGoogleCrawlerUserAgent,
  isGoogleCrawlerHostname,
  isVerifiedGoogleCrawlerDns
} from '../src/server/seoIndexing.ts';

import { getCategoryRouteName } from '../src/utils/categoryRoutes.ts';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const rootRobots = fs.readFileSync(new URL('../robots.txt', import.meta.url), 'utf8');
const publicRobots = fs.readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');

test('all public host aliases converge on the official canonical origin', () => {
  for (const host of ['encarmen.org', 'www.encarmen.org', 'empresasencarmen.com', 'www.empresasencarmen.com']) {
    assert.equal(getCanonicalSeoOrigin(host, 'production'), SEO_PRIMARY_ORIGIN);
  }
  assert.equal(normalizeSeoHost('WWW.EmpresasEnCarmen.com:443'), 'www.empresasencarmen.com');
  assert.equal(isCanonicalSeoHost('encarmen.org:443'), true);
  assert.equal(isCanonicalSeoHost('www.encarmen.org'), false);
  assert.equal(getSeoCanonicalRedirect('empresasencarmen.com', '/empresa/negocio?ref=google'), 'https://encarmen.org/empresa/negocio?ref=google');
  assert.equal(getSeoCanonicalRedirect('www.empresasencarmen.com', '/?q=1'), 'https://encarmen.org/?q=1');
  assert.equal(getSeoCanonicalRedirect('www.encarmen.org', '/categoria/servicios'), 'https://encarmen.org/categoria/servicios');
  assert.equal(getSeoCanonicalRedirect('encarmen.org', '/empresa/negocio'), null);
  assert.equal(getSeoCanonicalRedirect(SEO_STAGING_HOST, '/empresa/negocio', 'staging'), null);
});

test('production robots exposes only one canonical sitemap', () => {
  const robots = buildSeoRobotsTxt('empresasencarmen.com', 'production');
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(robots.includes('Disallow: /admin/'));
  assert.equal((robots.match(/Sitemap:/g) || []).length, 1);
  assert.ok(robots.includes('Sitemap: https://encarmen.org/sitemap.xml'));
  assert.ok(!robots.includes('empresasencarmen.com'));
  for (const file of [rootRobots, publicRobots]) {
    assert.equal((file.match(/Sitemap:/g) || []).length, 1);
    assert.ok(file.includes('Sitemap: https://encarmen.org/sitemap.xml'));
    assert.ok(!file.includes('empresasencarmen.com'));
  }
});

test('Staging remains crawlable for noindex discovery but publishes no sitemap', () => {
  const robots = buildSeoRobotsTxt(SEO_STAGING_HOST, 'staging');
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(!robots.includes('Sitemap:'));
  assert.equal(isStagingSeoRequest('staging.encarmen.org:443', 'production'), true);
  assert.equal(isStagingSeoRequest('encarmen.org', 'staging'), true);
  assert.equal(isStagingSeoRequest('notstaging.encarmen.org', 'production'), false);
  assert.ok(server.includes("res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')"));
  assert.ok(server.includes('<meta name="robots" content="noindex, nofollow, noarchive" />'));
});

test('legacy WordPress and WooCommerce URLs return explicit retirement statuses', () => {
  assert.deepEqual(getLegacyWordPressRetirement('/wp-admin/admin-ajax.php?action=rest-nonce'), {
    status: 410, reason: 'legacy-wordpress-admin-retired'
  });
  assert.deepEqual(getLegacyWordPressRetirement('/product-category/servicios-logisticos/mandaditos-a-domicilio/'), {
    status: 410, reason: 'legacy-woocommerce-category-retired'
  });
  assert.deepEqual(getLegacyWordPressRetirement('/wp-content/uploads'), {
    status: 404, reason: 'legacy-uploads-directory-not-public'
  });
  assert.equal(getLegacyWordPressRetirement('/wp-content/uploads/2026/10/logo.png'), null);
  assert.equal(getLegacyWordPressRetirement('/empresa/negocio-ejemplo'), null);
  const retirementIndex = server.indexOf('Retire public WordPress/WooCommerce endpoints');
  const scannerIndex = server.indexOf('Bot & Scanner Protection Middleware');
  const uploadsStaticIndex = server.indexOf("app.use('/wp-content', express.static");
  assert.ok(retirementIndex > 0 && retirementIndex < scannerIndex && retirementIndex < uploadsStaticIndex);
});

test('unknown business detail routes return a real 404 instead of a generic directory soft-404', () => {
  assert.deepEqual(getMissingBusinessRoute('/empresa/empresa-3235', false), {
    status: 404,
    reason: 'business-not-found'
  });
  assert.deepEqual(getMissingBusinessRoute('/empresa/empresa-3235?utm_source=google', false), {
    status: 404,
    reason: 'business-not-found'
  });
  assert.equal(getMissingBusinessRoute('/empresa/uniformescddelcarmen', true), null);
  assert.equal(getMissingBusinessRoute('/empresa/unitamp', true), null);
  assert.equal(getMissingBusinessRoute('/categoria/automotriz-y-motocicletas', false), null);
  assert.equal(getMissingBusinessRoute('/empresa', false), null);
  assert.ok(server.includes('getMissingBusinessRoute(req.path, Boolean(matchedBusiness))'));
  assert.ok(server.includes("res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')"));
  assert.ok(server.includes("return res.status(missingBusinessRoute.status).type('text/plain').send(missingBusinessRoute.reason)"));
});

test('published category deep links map to the intended directory filter', () => {
  const categories = [
    { name: 'Automotriz y Motocicletas', slug: 'automotriz-y-motocicletas', parent: 0 },
    { name: 'Renta de Inmuebles, Espacios y Mascotas', slug: 'renta-de-inmuebles-espacios-y-mascotas', parent: 0 },
    { name: 'Talleres Mecánicos y Eléctricos', slug: 'talleres-mecanicos-y-electricos-autos-y-motos', parent: 401 }
  ];
  assert.equal(getCategoryRouteName('/categoria/automotriz-y-motocicletas', categories), 'Automotriz y Motocicletas');
  assert.equal(getCategoryRouteName('/categoria/renta-de-inmuebles-espacios-y-mascotas/', categories), 'Renta de Inmuebles, Espacios y Mascotas');
  assert.equal(getCategoryRouteName('/categoria/talleres-mecanicos-y-electricos-autos-y-motos', categories), null);
  assert.equal(getCategoryRouteName('/categoria/unknown', categories), null);
  assert.equal(getCategoryRouteName('/empresa/empresa-3235', categories), null);
  assert.ok(appSource.includes('getCategoryFromUrl()'));
  assert.ok(appSource.includes('setSelectedCategory(categoryName)'));
  assert.ok(appSource.includes("if (/^categoria\\//i.test(path)) return null;"));
});

test('unknown category routes return a real 404 instead of the generic directory', () => {
  assert.deepEqual(getMissingCategoryRoute('/categoria/no-existe', false), {
    status: 404,
    reason: 'category-not-found'
  });
  assert.deepEqual(getMissingCategoryRoute('/categoria/no-existe?utm_source=google', false), {
    status: 404,
    reason: 'category-not-found'
  });
  assert.equal(getMissingCategoryRoute('/categoria/automotriz-y-motocicletas', true), null);
  assert.equal(getMissingCategoryRoute('/empresa/empresa-3235', false), null);
  assert.ok(server.includes('getMissingCategoryRoute(req.path, categoryExists)'));
  assert.ok(server.includes('Number(category.parent) === 0'));
});

test('Google crawler country bypass requires reverse and forward DNS verification', () => {
  const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
  const ip = '66.249.66.1';
  const host = 'crawl-66-249-66-1.googlebot.com';
  assert.equal(isGoogleCrawlerUserAgent(ua), true);
  assert.equal(isGoogleCrawlerHostname(host), true);
  assert.equal(isVerifiedGoogleCrawlerDns(ua, ip, [host], { [host]: [ip] }), true);
  assert.equal(isVerifiedGoogleCrawlerDns(ua, ip, [host], { [host]: ['66.249.66.2'] }), false);
  assert.equal(isVerifiedGoogleCrawlerDns(ua, ip, ['crawler.example.net'], { 'crawler.example.net': [ip] }), false);
  assert.equal(isVerifiedGoogleCrawlerDns('Mozilla/5.0', ip, [host], { [host]: [ip] }), false);
  assert.ok(server.includes('dnsReverse(clientIp)'));
  assert.ok(server.includes('dnsLookup(host, { all: true, verbatim: true })'));
  assert.ok(server.includes("if (req.method === 'GET' || req.method === 'HEAD')"));
  assert.ok(server.includes('verifyGoogleCrawlerRequest(req)'));
});

test('canonical redirects and legacy retirement run before GeoIP and static/fallback handling', () => {
  const canonicalIndex = server.indexOf('Consolidate public aliases before GeoIP');
  const geoIndex = server.indexOf('REGLA GEOIP CLOUDFLARE');
  const retirementIndex = server.indexOf('Retire public WordPress/WooCommerce endpoints');
  const staticIndex = server.indexOf("app.use(express.static(path.resolve(__dirname, 'public')");
  const fallbackIndex = server.indexOf("app.get('*'");
  assert.ok(canonicalIndex > 0 && canonicalIndex < geoIndex);
  assert.ok(retirementIndex > 0 && retirementIndex < geoIndex);
  assert.ok(retirementIndex < staticIndex && retirementIndex < fallbackIndex);
  assert.ok(server.includes("return res.redirect(301, redirectUrl);"));
  assert.ok(server.includes("getCanonicalSeoOrigin(req.get('x-forwarded-host') || req.get('host'), process.env.APP_ENV)"));
  assert.ok(server.includes('const baseUrl = SEO_PRIMARY_ORIGIN;'));
});
