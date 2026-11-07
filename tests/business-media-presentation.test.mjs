import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBusinessMedia } from '../src/utils/businessMediaPresentation.ts';

const origin = 'https://staging.encarmen.org';

test('cover is the initial hero; logo remains separate; gallery contains only service photos', () => {
  const media = resolveBusinessMedia({
    logo_url: '/uploads/logo.webp',
    image: '/uploads/logo.webp',
    cover_url: '/uploads/facade.webp',
    gallery: ['/uploads/service-1.webp', '/uploads/service-2.webp', '/uploads/service-3.webp'],
  }, origin);
  assert.equal(media.logo, origin + '/uploads/logo.webp');
  assert.equal(media.cover, origin + '/uploads/facade.webp');
  assert.equal(media.hero, media.cover);
  assert.deepEqual(media.gallery, [origin + '/uploads/service-1.webp', origin + '/uploads/service-2.webp', origin + '/uploads/service-3.webp']);
  assert.ok(!media.gallery.includes(media.logo));
  assert.ok(!media.gallery.includes(media.cover));
});

test('logo appears in the hero only when no cover was registered', () => {
  const media = resolveBusinessMedia({ logo_url: '/uploads/logo.webp', gallery: ['/uploads/service.webp'] }, origin);
  assert.equal(media.hero, media.logo);
  assert.deepEqual(media.gallery, [origin + '/uploads/service.webp']);
});

test('legacy image and imageUrl fields remain valid logo fallbacks', () => {
  const media = resolveBusinessMedia({ image: '/uploads/legacy-logo.webp' }, origin);
  assert.equal(media.logo, origin + '/uploads/legacy-logo.webp');
  assert.equal(media.hero, media.logo);
  assert.deepEqual(media.gallery, []);
});

test('cover without logo is used in the hero and does not enter the identity logo or gallery', () => {
  const media = resolveBusinessMedia({ cover_url: '/uploads/facade.webp', gallery: ['/uploads/service.webp'] }, origin);
  assert.equal(media.logo, undefined);
  assert.equal(media.hero, media.cover);
  assert.deepEqual(media.gallery, [origin + '/uploads/service.webp']);
});

test('without logo and cover the hero stays empty while service gallery remains selectable', () => {
  const media = resolveBusinessMedia({ gallery: ['/uploads/service-1.webp', '/uploads/service-2.webp'] }, origin);
  assert.equal(media.hero, undefined);
  assert.deepEqual(media.gallery, [origin + '/uploads/service-1.webp', origin + '/uploads/service-2.webp']);
});

test('gallery URLs are safe, unique and limited to ten entries', () => {
  const gallery = ['/uploads/one.webp', '/uploads/one.webp', 'javascript:alert(1)', 'https://user:pass@example.com/photo.webp', 'ftp://example.com/photo.webp', ...Array.from({length: 11}, (_, i) => '/uploads/' + (i + 2) + '.webp')];
  const media = resolveBusinessMedia({ gallery }, origin);
  assert.equal(media.gallery.length, 10);
  assert.equal(new Set(media.gallery).size, 10);
  assert.ok(media.gallery.every(url => url.startsWith(origin + '/uploads/')));
});
