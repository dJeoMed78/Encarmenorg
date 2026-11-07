import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/components/BusinessPublicDetail.tsx', import.meta.url), 'utf8');
const start = source.indexOf('export function businessMapPresentation(');
const end = source.indexOf('\nfunction Photo(', start);
assert.ok(start >= 0 && end > start, 'map helper must exist');
const isolated = source.slice(start, end).replace('export function', 'function');
const js = transformSync(isolated, { loader: 'ts', target: 'es2022' }).code;
const context = vm.createContext({ URL, Number, encodeURIComponent });
vm.runInContext(js + '\nthis.present = businessMapPresentation;', context);
const present = (value) => context.present(value);

test('coordinates create a keyless Google Maps iframe and a precise external link', () => {
  const result = present({ latitude: '18.638', longitude: '-91.832' });
  assert.equal(result.link, 'https://www.google.com/maps/search/?api=1&query=18.638,-91.832');
  const url = new URL(result.embed);
  assert.equal(url.origin, 'https://maps.google.com');
  assert.equal(url.pathname, '/maps');
  assert.equal(url.searchParams.get('q'), '18.638,-91.832');
  assert.equal(url.searchParams.get('output'), 'embed');
  assert.equal(url.searchParams.has('key'), false);
});

test('zero and extreme valid coordinates remain valid', () => {
  assert.ok(present({ latitude: 0, longitude: 0 }).embed);
  assert.ok(present({ latitude: -90, longitude: 180 }).embed);
});

test('invalid coordinates never create an iframe', () => {
  for (const value of ['NaN', '12,34', 'Infinity', '', 91, null]) {
    assert.equal(present({ latitude: value, longitude: 1 }).embed, undefined);
  }
  assert.equal(present({ latitude: 1, longitude: 181 }).embed, undefined);
});

test('registered Google Maps embed is retained when coordinates are absent', () => {
  const result = present({ mapsUrl: 'https://www.google.com/maps/embed?pb=!1m1!1sabc' });
  assert.equal(new URL(result.embed).searchParams.get('pb'), '!1m1!1sabc');
});

test('coordinate embed takes precedence over a registered embed', () => {
  const result = present({
    latitude: 18.63, longitude: -91.83,
    mapsUrl: 'https://www.google.com/maps/embed?pb=!1m1!1sabc',
  });
  assert.equal(new URL(result.embed).searchParams.get('output'), 'embed');
});

test('untrusted domains cannot become iframe sources', () => {
  for (const mapsUrl of [
    'https://evil.example/maps/embed?pb=!abc',
    'javascript:alert(1)',
    'https://www.google.com.evil.example/maps/embed?pb=!abc',
  ]) {
    assert.equal(present({ mapsUrl }).embed, undefined);
  }
});

test('business media roles remain separated in the existing component', () => {
  assert.match(source, /const photos = media\.gallery/);
  assert.match(source, /heroBrandImage = \(coverPhoto && !coverFailed \? coverPhoto : undefined\) \|\| displayBrandImage/);
  assert.match(source, /displayBrandImage = registeredLogo && !logoFailed \? registeredLogo : undefined/);
  assert.match(source, /onError=\{\(\) => setLogoFailed\(true\)\}/);
});
test('iframe loads automatically with lazy loading and preserves external fallback', () => {
  assert.doesNotMatch(source, /mapConsent/);
  assert.doesNotMatch(source, /Cargar mapa de Google/);
  assert.match(source, /src=\{mapPresentation\.embed\}/);
  assert.match(source, /loading="lazy"/);
  assert.match(source, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(source, /onError=\{\(\) => setMapFailed\(true\)\}/);
  assert.match(source, /Abrir mapa/);
});

test('business name and address provide a free map search without coordinates', () => {
  const result = present({ name: 'Cafetería Ejemplo', address: 'Calle 31 número 42', colonia: 'Centro' });
  const link = new URL(result.link);
  const embed = new URL(result.embed);
  assert.match(link.searchParams.get('query'), /Cafetería Ejemplo/);
  assert.match(link.searchParams.get('query'), /Ciudad del Carmen/);
  assert.match(link.searchParams.get('query'), /Campeche/);
  assert.equal(embed.searchParams.get('output'), 'embed');
  assert.match(embed.searchParams.get('q'), /Calle 31 número 42/);
});

test('phone is not disclosed to Google Maps as part of the query', () => {
  const result = present({ name: 'Ejemplo', address: 'Calle 31 número 42', phone: '9381234567' });
  assert.doesNotMatch(result.link, /9381234567/);
  assert.doesNotMatch(result.embed, /9381234567/);
});

test('name alone or neighborhood alone cannot be presented as a location', () => {
  assert.equal(present({ name: 'Cafetería Ejemplo' }).embed, undefined);
  assert.equal(present({ name: 'Cafetería Ejemplo', colonia: 'Centro' }).embed, undefined);
});

test('registered embed remains preferred to unverified address search', () => {
  const result = present({ address: 'Calle 31 número 42', mapsUrl: 'https://www.google.com/maps/embed?pb=!1m1!1sabc' });
  assert.equal(new URL(result.embed).searchParams.get('pb'), '!1m1!1sabc');
});
