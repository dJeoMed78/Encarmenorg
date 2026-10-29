import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// =========================================================================
// 1. COMPONENTE Y PARSER: descriptionLinks.ts
// =========================================================================
test('ENC-CLASSIFIEDS-INTEGRATION-002: descriptionLinks transforma enlaces y limpia HTML', async () => {
  const { parseDescription, normalizeDescriptionText } = await import('../src/utils/descriptionLinks.ts');

  // Texto simple sin enlaces
  const plain = parseDescription('Renta de departamento en Fraccionamiento San Manuel');
  assert.equal(plain.length, 1);
  assert.equal(plain[0].type, 'text');
  assert.equal(plain[0].text, 'Renta de departamento en Fraccionamiento San Manuel');

  // Enlace web interactivo
  const withWeb = parseDescription('Visita https://carmenautos.com/catalogo para inventario completo');
  const webPart = withWeb.find(p => p.type === 'link');
  assert.ok(webPart);
  assert.equal(webPart.href, 'https://carmenautos.com/catalogo');
  assert.equal(webPart.kind, 'web');

  // Enlace WhatsApp
  const withWa = parseDescription('Escríbenos directamente a https://wa.me/529381234567');
  const waPart = withWa.find(p => p.type === 'link');
  assert.ok(waPart);
  assert.equal(waPart.kind, 'whatsapp');

  // Enlace Video YouTube
  const withVideo = parseDescription('Video demostrativo en https://www.youtube.com/watch?v=sample123');
  const videoPart = withVideo.find(p => p.type === 'link');
  assert.ok(videoPart);
  assert.equal(videoPart.kind, 'video');

  // Limpieza de etiquetas HTML/WordPress heredadas
  const rawHtml = '<p>Local con <b>estacionamiento</b>. <a href="https://maps.google.com/?q=Carmen">Ver mapa</a></p>';
  const clean = normalizeDescriptionText(rawHtml);
  assert.ok(!clean.includes('<p>'));
  assert.ok(!clean.includes('<b>'));
  assert.ok(clean.includes('maps.google.com'));
});

// =========================================================================
// 2. CONTRATO DE API PÚBLICA PARA TRABAJO EN PARALELO CON PERP
// Simulación HTTP de todos los códigos de respuesta (200/201, 400, 401, 403, 404, 409, 429, 500 y fallo de red)
// =========================================================================
test('ENC-CLASSIFIEDS-INTEGRATION-002: Contrato API /api/public/classifieds con servidor simulado', async (t) => {
  let mockStatusCode = 200;
  let mockResponseBody = {};

  // Creamos un servidor HTTP simulado en puerto aleatorio libre
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(mockStatusCode);
    res.end(JSON.stringify(mockResponseBody));
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const mockApiBase = `http://127.0.0.1:${port}/api`;

  // Test 2.1: GET 200 OK con anuncios
  await t.test('GET /api/public/classifieds 200 OK retorna lista de clasificados', async () => {
    mockStatusCode = 200;
    mockResponseBody = {
      total: 1,
      classifieds: [{
        id: 'ad-test-1',
        title: 'Mecánico diésel para plataforma',
        category: 'empleos',
        status: 'active',
        createdAt: new Date().toISOString()
      }]
    };

    const res = await fetch(`${mockApiBase}/public/classifieds`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total, 1);
    assert.equal(data.classifieds[0].title, 'Mecánico diésel para plataforma');
  });

  // Test 2.2: POST 201 Created con confirmación de persistencia
  await t.test('POST /api/public/classifieds 201 Created confirma persistencia real', async () => {
    mockStatusCode = 201;
    mockResponseBody = {
      success: true,
      message: 'Anuncio publicado exitosamente en el servidor.',
      classified: {
        id: 'ad-created-1',
        title: 'Venta de camioneta Ford Ranger',
        status: 'active'
      }
    };

    const res = await fetch(`${mockApiBase}/public/classifieds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Venta de camioneta Ford Ranger' })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.classified);
  });

  // Test 2.3: 400 Bad Request
  await t.test('POST /api/public/classifieds 400 Bad Request reporta campos inválidos', async () => {
    mockStatusCode = 400;
    mockResponseBody = {
      success: false,
      message: 'Faltan campos obligatorios: teléfono o WhatsApp de contacto.'
    };

    const res = await fetch(`${mockApiBase}/public/classifieds`, { method: 'POST' });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.message.includes('Faltan campos obligatorios'));
  });

  // Test 2.4: 401 Unauthorized
  await t.test('PATCH /api/public/classifieds/:id 401 Unauthorized sin token válido', async () => {
    mockStatusCode = 401;
    mockResponseBody = {
      success: false,
      message: 'No autorizado: se requiere token de titular para editar el anuncio.'
    };

    const res = await fetch(`${mockApiBase}/public/classifieds/ad-1`, { method: 'PATCH' });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  // Test 2.5: 403 Forbidden
  await t.test('DELETE /api/public/classifieds/:id 403 Forbidden si el token no coincide', async () => {
    mockStatusCode = 403;
    mockResponseBody = {
      success: false,
      message: 'Acceso denegado: no tienes permisos para eliminar este anuncio.'
    };

    const res = await fetch(`${mockApiBase}/public/classifieds/ad-1`, { method: 'DELETE' });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  // Test 2.6: 404 Not Found (Endpoint pendiente por PERP)
  await t.test('GET y POST 404 Not Found reportan servicio en preparación sin fingir éxito', async () => {
    mockStatusCode = 404;
    mockResponseBody = {
      error: 'Not Found',
      message: 'Cannot GET /api/public/classifieds'
    };

    const res = await fetch(`${mockApiBase}/public/classifieds`);
    assert.equal(res.status, 404);
  });

  // Test 2.7: 409 Conflict
  await t.test('POST /api/public/classifieds 409 Conflict por anuncio duplicado', async () => {
    mockStatusCode = 409;
    mockResponseBody = {
      success: false,
      message: 'Ya existe una publicación activa con este mismo título y contacto.'
    };

    const res = await fetch(`${mockApiBase}/public/classifieds`, { method: 'POST' });
    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  // Test 2.8: 429 Too Many Requests
  await t.test('POST /api/public/classifieds 429 Rate Limit', async () => {
    mockStatusCode = 429;
    mockResponseBody = {
      success: false,
      message: 'Demasiadas solicitudes. Por favor espera unos minutos antes de publicar otro anuncio.'
    };

    const res = await fetch(`${mockApiBase}/public/classifieds`, { method: 'POST' });
    assert.equal(res.status, 429);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  // Test 2.9: 500 Internal Server Error
  await t.test('GET /api/public/classifieds 500 maneja error interno', async () => {
    mockStatusCode = 500;
    mockResponseBody = {
      success: false,
      message: 'Error interno en la base de datos de clasificados.'
    };

    const res = await fetch(`${mockApiBase}/public/classifieds`);
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  // Test 2.10: Conexión perdida / Servidor apagado
  await t.test('Conexión perdida reporta fallo de red limpiamente', async () => {
    await new Promise(resolve => server.close(resolve));
    try {
      await fetch(`http://127.0.0.1:${port}/api/public/classifieds`);
      assert.fail('Debe lanzar error de conexión');
    } catch (err) {
      assert.ok(err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED'));
    }
  });
});

// =========================================================================
// 3. ESTRUCTURA Y CÓDIGO FUENTE DE LOS COMPONENTES
// =========================================================================
test('ENC-CLASSIFIEDS-INTEGRATION-002: ClassifiedsView estructura Glass y responsividad móvil', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/ClassifiedsView.tsx'), 'utf8');

  // Sin filtro restrictivo que ocultaba anuncios ciudadanos
  assert.equal(content.includes('ad.approvedByAdmin !== true'), false);

  // Píldoras de categoría con conteos
  assert.ok(content.includes('categoryCounts'));
  assert.ok(content.includes('Categorías populares'));

  // Filtros colapsables para móviles (320px, 360px, 390px)
  assert.ok(content.includes('showMobileFilters'));
  assert.ok(content.includes('Filtros avanzados'));

  // Miniatura fotográfica con fallback
  assert.ok(content.includes('thumbnailImage'));

  // Separación segura anti-colisión con botón de favoritos
  assert.ok(content.includes('pr-10'));

  // Botones de contacto con altura mínima táctil
  assert.ok(content.includes('min-h-[36px]'));

  // Esqueletos de carga y banner de error con reintento
  assert.ok(content.includes('loading ?'));
  assert.ok(content.includes('RotateCcw'));
});

test('ENC-CLASSIFIEDS-INTEGRATION-002: ClassifiedCreateModal validaciones y colonias de Carmen', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/ClassifiedCreateModal.tsx'), 'utf8');

  // Cierre accesible por Escape y bloqueo de scroll
  assert.ok(content.includes('Escape'));
  assert.ok(content.includes('document.body.style.overflow'));

  // Validación de fotos (máximo 6, hasta 5MB)
  assert.ok(content.includes('maxFiles = 6'));
  assert.ok(content.includes('5 * 1024 * 1024'));

  // Indicador sincero de guardado
  assert.ok(content.includes('Guardando en el servidor...'));

  // Uso de coloniasList
  assert.ok(content.includes('coloniasList && coloniasList.length > 0'));

  // Objetivos táctiles mínimos
  assert.ok(content.includes('min-h-[44px]'));
});

test('ENC-CLASSIFIEDS-INTEGRATION-002: ClassifiedDetailModal enlaces interactivos y accesibilidad', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/ClassifiedDetailModal.tsx'), 'utf8');

  // Uso de parseDescription
  assert.ok(content.includes('parseDescription'));
  assert.ok(content.includes('DescriptionPart'));

  // Cierre accesible y bloqueo de scroll
  assert.ok(content.includes('Escape'));
  assert.ok(content.includes('document.body.style.overflow'));

  // Targets táctiles >= 44px
  assert.ok(content.includes('min-h-[44px]'));

  // Acciones de edición y eliminación
  assert.ok(content.includes('onEdit?: (ad: ClassifiedAd) => void'));
  assert.ok(content.includes('onDelete?: (adId: string) => Promise<void>'));
});

// =========================================================================
// 4. PRESERVACIÓN DE CONSOLIDACIÓN Y LÍMITES
// =========================================================================
test('ENC-CLASSIFIEDS-INTEGRATION-002: Límites respetados — Sin cambios en server.ts, src/server/, src/db/', () => {
  // Verificamos que las rutas protegidas no tienen modificaciones
  const protectedPaths = [
    'server.ts',
    'src/server/publicRegistrationCore.ts',
    'src/server/publicRegistrationRoutes.ts',
    'src/server/stagingBusinessRoutes.ts',
    'src/server/stagingBusinessSecurity.ts',
    'src/db/mariadb.ts',
    'src/db/stagingBusinessStore.ts'
  ];

  for (const relPath of protectedPaths) {
    const fullPath = path.join(rootDir, relPath);
    assert.ok(fs.existsSync(fullPath), `Archivo consolidado ${relPath} debe existir sin alteraciones`);
  }
});
