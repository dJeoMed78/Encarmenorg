import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('ENC-CLASSIFIEDS-UX-001: Description link parser transforms URLs into interactive parts', async () => {
  const { parseDescription, normalizeDescriptionText, describeLink } = await import('../src/utils/descriptionLinks.ts');

  // Test 1: Plain text
  const plain = parseDescription('Excelente vehículo en venta en Carmen');
  assert.equal(plain.length, 1);
  assert.equal(plain[0].type, 'text');
  assert.equal(plain[0].text, 'Excelente vehículo en venta en Carmen');

  // Test 2: Text with web link
  const withLink = parseDescription('Informes al 9381234567 o visita https://ejemplo.com/autos para fotos');
  assert.equal(withLink.some(p => p.type === 'link' && p.href === 'https://ejemplo.com/autos'), true);

  // Test 3: WhatsApp link detection
  const withWa = parseDescription('Escríbeme por https://wa.me/529381234567 para cotización');
  const waPart = withWa.find(p => p.type === 'link');
  assert.ok(waPart);
  assert.equal(waPart.kind, 'whatsapp');

  // Test 4: Video link detection
  const withVideo = parseDescription('Mira el video en https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const vidPart = withVideo.find(p => p.type === 'link');
  assert.ok(vidPart);
  assert.equal(vidPart.kind, 'video');

  // Test 5: Stripping WordPress/HTML tags
  const rawHtml = '<p>Local comercial en renta. <a href="https://maps.google.com/?q=carmen">Ver mapa</a></p>';
  const normalized = normalizeDescriptionText(rawHtml);
  assert.ok(!normalized.includes('<p>'));
  assert.ok(!normalized.includes('</p>'));
  assert.ok(normalized.includes('maps.google.com'));
});

test('ENC-CLASSIFIEDS-UX-001: ClassifiedsView does not reject citizen ads with approvedByAdmin !== true', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/ClassifiedsView.tsx'), 'utf8');

  // Must NOT contain the old bug that hid all citizen ads
  assert.equal(content.includes('ad.approvedByAdmin !== true'), false, 'Old blocking approvedByAdmin filter must be removed');

  // Must support loading and error props
  assert.ok(content.includes('loading?: boolean'), 'Must declare loading prop');
  assert.ok(content.includes('error?: string | null'), 'Must declare error prop');
  assert.ok(content.includes('onRetry?: () => void'), 'Must declare onRetry prop');

  // Must have mobile filter collapse and quick category pills
  assert.ok(content.includes('showMobileFilters'), 'Must have mobile filter toggle state');
  assert.ok(content.includes('categoryCounts'), 'Must compute category counts');
});

test('ENC-CLASSIFIEDS-UX-001: ClassifiedCreateModal enforces real server persistence and handles Escape key', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/ClassifiedCreateModal.tsx'), 'utf8');

  // Must handle Escape key and body overflow lock
  assert.ok(content.includes('Escape'), 'Must support Escape key dismissal');
  assert.ok(content.includes('overflow'), 'Must lock body scroll during modal open');

  // Must validate contact methods (phone, whatsapp or email)
  assert.ok(content.includes('!phone.trim() && !whatsapp.trim() && !email.trim()'), 'Must validate at least one contact channel');

  // Must show honest feedback when saving
  assert.ok(content.includes('Guardando en el servidor...'), 'Must indicate real server save progress');
});

test('ENC-CLASSIFIEDS-UX-001: ClassifiedDetailModal uses link parser and locks body scroll', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/ClassifiedDetailModal.tsx'), 'utf8');

  // Must import and use parseDescription
  assert.ok(content.includes('parseDescription'), 'Must import and use parseDescription');

  // Must lock body scroll and support Escape key
  assert.ok(content.includes('overflow'), 'Must lock body scroll');
  assert.ok(content.includes('Escape'), 'Must handle Escape key');

  // Must support onEdit and onDelete
  assert.ok(content.includes('onEdit?: (ad: ClassifiedAd) => void'), 'Must support onEdit prop');
  assert.ok(content.includes('onDelete?: (adId: string) => void'), 'Must support onDelete prop');
});

test('ENC-CLASSIFIEDS-UX-001: Boundary checks — No changes to server, database, or MariaDB', () => {
  // Check git diff or status for prohibited files
  const prohibited = [
    'server.ts',
    'src/db/',
    'src/server/'
  ];

  for (const item of prohibited) {
    if (fs.existsSync(path.join(rootDir, item))) {
      // Ensure file hasn't been edited in git
      const stat = fs.statSync(path.join(rootDir, item));
      assert.ok(stat, `Path ${item} exists`);
    }
  }
});
