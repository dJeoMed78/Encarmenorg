import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDescription, normalizeDescriptionText, describeLink } from '../src/utils/descriptionLinks.ts';

const links = (parts) => parts.filter((p) => p.type === 'link');
const texts = (parts) => parts.filter((p) => p.type === 'text').map((p) => p.text).join('');

test('reproduce el defecto: la URL multimedia ya no queda como texto crudo', () => {
  const raw = 'Uñas profesionales en Carmen. https://www.youtube.com/watch?v=abc123XYZ_-&list=PLxyz123456789 Agenda tu cita.';
  assert.ok(raw.includes('https://www.youtube.com/watch?v='), 'precondición: el texto original contiene la URL cruda');
  const parts = parseDescription(raw);
  assert.equal(links(parts).length, 1);
  assert.equal(links(parts)[0].label, 'Ver video en YouTube');
  assert.equal(links(parts)[0].kind, 'video');
  assert.ok(!texts(parts).includes('http'), 'ningún texto debe contener la URL cruda');
  assert.ok(texts(parts).includes('Uñas profesionales en Carmen.'));
  assert.ok(texts(parts).includes('Agenda tu cita.'));
});

test('conserva el contenido comercial y el orden', () => {
  const raw = 'Horario 9 a 6.\nTel. 938 123 4567 — precio $50 < $60 y > $20\nVideo: https://youtu.be/abc123\nFin';
  const parts = parseDescription(raw);
  assert.deepEqual(parts.map((p) => p.type), ['text', 'link', 'text']);
  assert.ok(parts[0].text.includes('Tel. 938 123 4567'));
  assert.ok(parts[0].text.includes('$50 < $60 y > $20'));
  assert.equal(parts[2].text, '\nFin');
});

test('descripción solo con texto queda sin cambios', () => {
  const raw = 'Servicio de plomería 24 horas.\nAtendemos toda la ciudad.';
  assert.deepEqual(parseDescription(raw), [{ type: 'text', text: raw }]);
});

test('puntuación final no forma parte del enlace', () => {
  const parts = parseDescription('Mira (https://youtu.be/abc123), o https://ejemplo.com/menu.');
  const hrefs = links(parts).map((p) => p.href);
  assert.deepEqual(hrefs, ['https://youtu.be/abc123', 'https://ejemplo.com/menu']);
  assert.ok(texts(parts).includes('),'));
  assert.ok(texts(parts).trim().endsWith('.'));
});

test('imágenes, video y audio por extensión; consulta ignorada', () => {
  assert.equal(describeLink(new URL('https://empresasencarmen.com/wp-content/uploads/2026/10/foto.JPG?x=1')).label, 'Ver imagen');
  assert.equal(describeLink(new URL('https://cdn.ejemplo.com/clip.mp4')).label, 'Ver video');
  assert.equal(describeLink(new URL('https://cdn.ejemplo.com/jingle.mp3')).label, 'Escuchar audio');
  assert.equal(describeLink(new URL('https://www.facebook.com/negocio/videos/123')).label, 'Ver video en Facebook');
  assert.equal(describeLink(new URL('https://www.facebook.com/negocio')).label, 'Ver en Facebook');
  assert.equal(describeLink(new URL('https://www.instagram.com/negocio/')).label, 'Ver en Instagram');
  assert.equal(describeLink(new URL('https://maps.app.goo.gl/abc')).kind, 'maps');
  assert.equal(describeLink(new URL('https://www.ejemplo.com/ruta/larga/pagina')).label, 'ejemplo.com');
});

test('shortcodes [embed]/[video] de WordPress se convierten en enlaces', () => {
  const parts = parseDescription('Conócenos [embed]https://www.youtube.com/watch?v=abc123[/embed] hoy\n[video src="https://cdn.ejemplo.com/a.mp4"][/video]');
  assert.equal(links(parts).length, 2);
  assert.ok(!texts(parts).includes('[embed'));
  assert.ok(!texts(parts).includes('[video'));
  assert.ok(texts(parts).includes('Conócenos'));
  assert.ok(texts(parts).includes('hoy'));
});

test('HTML heredado: iframe, img y a se convierten sin dejar etiquetas', () => {
  const raw = '<p>Pasteles <strong>artesanales</strong></p><iframe src="https://www.youtube.com/embed/abc123" width="560"></iframe><img src="https://empresasencarmen.com/wp-content/uploads/a.png" alt="x"/><a href="https://ejemplo.com/menu">Ver menú</a>';
  const parts = parseDescription(raw);
  const t = texts(parts);
  assert.ok(!/[<>]/.test(t), 'sin etiquetas: ' + JSON.stringify(t));
  assert.ok(t.includes('Pasteles artesanales'));
  assert.ok(t.includes('Ver menú'));
  assert.deepEqual(links(parts).map((p) => p.href), [
    'https://www.youtube.com/embed/abc123',
    'https://empresasencarmen.com/wp-content/uploads/a.png',
    'https://ejemplo.com/menu',
  ]);
});

test('esquemas peligrosos o con credenciales nunca se vuelven enlaces', () => {
  const raw = 'javascript:alert(1) data:text/html,hola https://usuario:clave@ejemplo.com/x <a href="javascript:alert(2)">Pulsa</a> ftp://ejemplo.com/a';
  const parts = parseDescription(raw);
  assert.equal(links(parts).length, 0);
  assert.ok(texts(parts).includes('Pulsa'));
  assert.ok(!texts(parts).includes('<a'));
});

test('www. sin esquema se normaliza a https y las URL absurdas se ignoran', () => {
  const parts = parseDescription('Visítanos en www.ejemplo.com/tienda y http://localhost/x y https://sinpunto/x');
  assert.deepEqual(links(parts).map((p) => p.href), ['https://www.ejemplo.com/tienda']);
  assert.ok(texts(parts).includes('http://localhost/x'));
});

test('varias URL separadas por saltos excesivos no dejan huecos desordenados', () => {
  const raw = 'Galería\n\n\n\nhttps://ejemplo.com/a.jpg\n\n\n\n\nhttps://ejemplo.com/b.jpg\n\n\n';
  const parts = parseDescription(raw);
  assert.equal(links(parts).length, 2);
  for (const p of parts.filter((x) => x.type === 'text')) assert.ok(!/\n{3,}/.test(p.text), 'bloque con saltos excesivos');
  assert.ok(parts[0].text.startsWith('Galería'));
});

test('dos enlaces contiguos conservan el espacio entre ellos', () => {
  const parts = parseDescription('https://youtu.be/a1 https://youtu.be/b2');
  assert.deepEqual(parts.map((p) => p.type), ['link', 'text', 'link']);
});

test('entradas vacías o no textuales devuelven lista vacía', () => {
  for (const value of [undefined, null, 42, {}, [], '', '   \n  ']) assert.deepEqual(parseDescription(value), []);
  assert.equal(normalizeDescriptionText(undefined), '');
});

test('un enlace nunca produce href fuera de http(s)', () => {
  const raw = 'a https://ejemplo.com/x b www.otro.com/y c https://youtu.be/z';
  for (const p of links(parseDescription(raw))) assert.match(p.href, /^https?:\/\//);
});
