import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDescription, describeLink, normalizeDescriptionText } from '../src/utils/descriptionLinks.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('ENC-F007A: orden móvil estipulado en CSS para pantallas <= 700px', () => {
  const css = read('src/components/BusinessPublicDetail.css');
  const mobileQuery = css.match(/@media\s*\(max-width:\s*700px\)\s*\{([\s\S]*?)\}\s*@media\s*\(max-width:\s*360px\)/);
  assert.ok(mobileQuery, 'bloque @media (max-width: 700px) localizado');
  const rules = mobileQuery[1];

  // 1. Heading
  assert.match(rules, /\.bpd-heading\s*\{[^}]*order:\s*1/, 'heading debe tener order: 1');
  // 2. Identity / Logo
  assert.match(rules, /\.bpd-identity\s*\{[^}]*order:\s*2/, 'identity debe tener order: 2');
  // 3. Media & Contact
  assert.match(rules, /\.bpd-media\s*\{[^}]*order:\s*3/, 'media debe tener order: 3');
  // 4. Description
  assert.match(rules, /\.bpd-story-description\s*\{[^}]*order:\s*4/, 'description debe tener order: 4');
  // 5. Promotion
  assert.match(rules, /\.bpd-story-promotion\s*\{[^}]*order:\s*5/, 'promotion debe tener order: 5');
  // 6. Facts (Ubicación, Horarios, Pagos, Entrega)
  assert.match(rules, /\.bpd-facts\s*\{[^}]*order:\s*6/, 'facts debe tener order: 6');
  // 7. Reviews (Opiniones comunitarias)
  assert.match(rules, /\.bpd-reviews\s*\{[^}]*order:\s*7/, 'reviews debe tener order: 7');
});

test('Mobile UX: dimensiones proporcionadas de Hero e Identity evitan empuje excesivo', () => {
  const css = read('src/components/BusinessPublicDetail.css');
  const mobileQuery = css.match(/@media\s*\(max-width:\s*700px\)\s*\{([\s\S]*?)\}\s*@media\s*\(max-width:\s*360px\)/)[1];

  // Identity ya no tiene altura fija de 150px
  assert.doesNotMatch(mobileQuery, /\.bpd-identity\s*\{[^}]*height:\s*150px/);
  assert.match(mobileQuery, /\.bpd-identity\s*\{[^}]*height:\s*120px/);

  // Hero utiliza clamp responsivo en lugar de 330px fijo
  assert.doesNotMatch(mobileQuery, /\.bpd-hero\s*\{[^}]*height:\s*330px/);
  assert.match(mobileQuery, /\.bpd-hero\s*\{[^}]*height:\s*clamp\(/);

  // Miniaturas responsivas
  assert.match(mobileQuery, /\.bpd-thumbnails\s+button\s*\{[^}]*height:\s*clamp\(/);
});

test('Prevención de desbordamiento horizontal y safe-area insets', () => {
  const css = read('src/components/BusinessPublicDetail.css');
  assert.match(css, /padding-top:\s*max\(\d+px,\s*env\(safe-area-inset-top\)\)/);
  assert.match(css, /padding-bottom:\s*max\(\d+px,\s*env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /padding-left:\s*max\(\d+px,\s*env\(safe-area-inset-left\)\)/);
  assert.match(css, /padding-right:\s*max\(\d+px,\s*env\(safe-area-inset-right\)\)/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /-webkit-overflow-scrolling:\s*touch/);
});

test('Prevención de desbordamientos en botones dobles (.bpd-pair) y barra de herramientas', () => {
  const css = read('src/components/BusinessPublicDetail.css');
  const mobileQuery = css.match(/@media\s*\(max-width:\s*700px\)\s*\{([\s\S]*?)\}\s*@media\s*\(max-width:\s*360px\)/)[1];

  // bpd-pair tiene text-overflow y no-wrap en móvil
  assert.match(mobileQuery, /\.bpd-pair\s+button,\s*\.bpd-pair\s+a\s*\{[^}]*text-overflow:\s*ellipsis/);
  assert.match(mobileQuery, /\.bpd-pair\s+button,\s*\.bpd-pair\s+a\s*\{[^}]*white-space:\s*nowrap/);

  // bpd-toolbar no permite rotura de línea fea
  assert.match(mobileQuery, /\.bpd-toolbar\s*\{[^}]*flex-wrap:\s*nowrap/);

  // Soporte pantalla extra estrecha <= 360px
  assert.match(css, /@media\s*\(max-width:\s*360px\)/);
});

test('Botones de contacto WhatsApp y Teléfono preservados íntegros con enlaces y fallbacks', () => {
  const detail = code(read('src/components/BusinessPublicDetail.tsx'));
  // Enlace y botón WhatsApp
  assert.match(detail, /href=\{`https:\/\/wa\.me\/\$\{wa\}`\}/);
  assert.match(detail, /<MessageCircle\s*\/>\s*Enviar WhatsApp/);
  assert.match(detail, /WhatsApp no registrado/);

  // Enlace y botón Teléfono
  assert.match(detail, /href=\{`tel:\+\$\{tel\}`\}/);
  assert.match(detail, /<Phone\s*\/>\s*Llamar al\s*\{b\.phone\}/);
  assert.match(detail, /Teléfono no registrado/);

  // Clases bpd-wa y bpd-call
  assert.match(detail, /className="bpd-action bpd-wa"/);
  assert.match(detail, /className="bpd-action bpd-call"/);
});

test('Enlaces y referencias multimedia se transforman en enlaces interactivos legibles', () => {
  const sample = `Restaurante familiar en el malecón.
Visita nuestra web: https://restaurante-carmen.com
Video de platillos: https://youtu.be/carmen123
Síguenos en Facebook: https://facebook.com/restcarmen
Ubicación rápida: https://maps.app.goo.gl/xyz
Escríbenos: https://wa.me/529381234567
Foto del menú: https://cdn.ejemplo.com/menu.jpg`;

  const parts = parseDescription(sample);
  const links = parts.filter(p => p.type === 'link');
  assert.equal(links.length, 6);

  const youtube = links.find(l => l.kind === 'video');
  assert.ok(youtube);
  assert.equal(youtube.label, 'Ver video en YouTube');

  const fb = links.find(l => l.kind === 'social');
  assert.ok(fb);
  assert.equal(fb.label, 'Ver en Facebook');

  const maps = links.find(l => l.kind === 'maps');
  assert.ok(maps);
  assert.equal(maps.label, 'Ver ubicación en Google Maps');

  const wa = links.find(l => l.kind === 'whatsapp');
  assert.ok(wa);
  assert.equal(wa.label, 'Abrir WhatsApp');

  const img = links.find(l => l.kind === 'image');
  assert.ok(img);
  assert.equal(img.label, 'Ver imagen');

  const web = links.find(l => l.kind === 'web');
  assert.ok(web);
  assert.equal(web.label, 'restaurante-carmen.com');
});

test('Seguridad estricta: rechazo de esquemas maliciosos en descripciones', () => {
  const malicious = 'Texto normal javascript:alert("hack") y data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg== y file:///etc/passwd';
  const parts = parseDescription(malicious);
  const links = parts.filter(p => p.type === 'link');
  assert.equal(links.length, 0, 'no debe haber enlaces para esquemas no http(s)');
});

test('No hay modificaciones en sistemas de calificaciones ni base de datos MariaDB', () => {
  const detail = code(read('src/components/BusinessPublicDetail.tsx'));
  assert.doesNotMatch(detail, /\bb\.(rating|reviewCount|reviews_count|reviews)\b/);
  assert.doesNotMatch(detail, /initialRating|initialReviewCount/);

  // StarRatingWidget presente y sin modificaciones
  const widget = read('src/components/StarRatingWidget.tsx');
  assert.match(widget, /useBusinessRatings\(businessId\)/);
});
