import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Pruebas de integración estáticas (sin React ni navegador): fijan el contrato de la ficha pública.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('la ficha pública presenta la descripción mediante BusinessDescription', () => {
  const detail = code(read('src/components/BusinessPublicDetail.tsx'));
  assert.match(detail, /import \{ BusinessDescription \} from ["']\.\/BusinessDescription["'];/);
  assert.match(detail, /<BusinessDescription[\s\S]*?text=\{b\.description\}[\s\S]*?fallback=["']El negocio todavía no ha registrado una descripción\.["']/);
  assert.doesNotMatch(detail, /\{\s*b\.description\s*\|\|/, 'no debe quedar el render de texto plano');
  assert.equal((detail.match(/\bb\.description\b/g) || []).length, 1, 'la descripción solo se usa en el componente nuevo');
  assert.match(detail, /className="bpd-description"/, 'se conserva el contenedor Glass existente');
});

test('el componente de descripción solo crea enlaces con rel seguro y sin iframes', () => {
  const component = code(read('src/components/BusinessDescription.tsx'));
  assert.match(component, /rel="noopener noreferrer nofollow ugc"/);
  assert.match(component, /target="_blank"/);
  assert.doesNotMatch(component, /<iframe|dangerouslySetInnerHTML/);
});

test('la ficha no usa rating/reviewCount del catálogo: solo el sistema oficial de calificaciones', () => {
  const detail = code(read('src/components/BusinessPublicDetail.tsx'));
  assert.doesNotMatch(detail, /\bb\.(rating|reviewCount|reviews_count|reviews)\b/);
  assert.doesNotMatch(detail, /initialRating|initialReviewCount/);
  assert.equal((detail.match(/<StarRatingWidget/g) || []).length, 2, 'resumen compacto y widget completo');
});

test('StarRatingWidget toma el resumen de useBusinessRatings y no de props del catálogo', () => {
  const widget = read('src/components/StarRatingWidget.tsx');
  const body = code(widget);
  assert.match(body, /useBusinessRatings\(businessId\)/);
  const destructured = body.match(/StarRatingWidget: React\.FC<StarRatingWidgetProps> = \(\{([\s\S]*?)\}\) =>/);
  assert.ok(destructured, 'firma del componente localizada');
  assert.doesNotMatch(destructured[1], /initialRating|initialReviewCount/);
  assert.match(body, /stats\.count === 0 \? 'Sin calificaciones'/);
  assert.match(body, /!available \? 'Calificaciones no disponibles'/);
});

test('el estado vacío oficial es cero votos, nunca 5.0 ni 1 voto', () => {
  const ratings = code(read('src/utils/realRatings.ts'));
  assert.match(ratings, /emptyRatingSummary = \(\): BusinessRatingStats => \(\{ average: 0, count: 0, hasRated: false, userRating: null \}\)/);
});
