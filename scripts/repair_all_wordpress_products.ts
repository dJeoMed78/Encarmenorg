import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';

const wcKey = process.env.WC_CONSUMER_KEY || '';
const wcSecret = process.env.WC_CONSUMER_SECRET || '';

if (!wcKey || !wcSecret) {
  console.error('Error: WC_CONSUMER_KEY or WC_CONSUMER_SECRET missing.');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${wcKey}:${wcSecret}`).toString('base64');

// Load seed data for fallback matching
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedPath = path.resolve(__dirname, '../src/data/businesses_seed.json');
const seedBusinesses: any[] = fs.existsSync(seedPath) ? JSON.parse(fs.readFileSync(seedPath, 'utf8')) : [];

function cleanDescription(desc: string): string {
  if (!desc) return '';
  return desc
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<div[^>]*class=["'][^"']*fe-wrapper[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi, '')
    .replace(/<div[^>]*class=["'][^"']*fe-[^"']*["'][\s\S]*?<\/div>/gi, '')
    .replace(/\.fe-wrapper[\s\S]*?\.fe-content[^}]*\}/gi, '')
    .replace(/<p>\.fe-wrapper[\s\S]*?<\/p>/gi, '')
    .replace(/📞\s*Marcar a la empresa[\s\S]*$/i, '')
    .replace(/\[ficha_empresa[^\]]*\]/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFichaEmpresaShortcode(biz: any): string {
  const phone = String(biz.phone || '').trim().replace(/"/g, '');
  let rawWa = String(biz.whatsapp || biz.phone || '').trim().replace(/\D/g, '');
  if (rawWa && !rawWa.startsWith('52') && rawWa.length === 10) {
    rawWa = `52${rawWa}`;
  }
  const wa = rawWa.replace(/"/g, '');
  const fb = String(biz.facebook || '').trim().replace(/"/g, '');
  const ig = String(biz.instagram || '').trim().replace(/"/g, '');
  const web = String(biz.website || '').trim().replace(/"/g, '');

  let direccion = String(biz.address || '').trim();
  const col = String(biz.colonia || '').trim();
  if (col && direccion && !direccion.toLowerCase().includes(col.toLowerCase())) {
    direccion = `${direccion}, Col. ${col}`;
  }
  direccion = direccion.replace(/"/g, '');

  const horario = String(biz.schedule || '').trim().replace(/"/g, '');
  const pagos = String(biz.payment || '').trim().replace(/"/g, '');
  const envio = String(biz.delivery || '').trim().replace(/"/g, '');

  return `[ficha_empresa telefono="${phone}" whatsapp="${wa}" facebook="${fb}" instagram="${ig}" web="${web}" direccion="${direccion}" horario="${horario}" pagos="${pagos}" envio="${envio}"]`;
}

async function repairAll() {
  console.log('--- Iniciando reparación masiva de productos en WordPress (WooCommerce) ---');
  let page = 1;
  const allWpProducts: any[] = [];

  while (true) {
    console.log(`Descargando productos de WooCommerce (página ${page})...`);
    const res = await fetch(`https://empresasencarmen.com/wp-json/wc/v3/products?per_page=100&page=${page}`, {
      headers: { 'Authorization': authHeader }
    });
    if (!res.ok) {
      console.warn(`Respuesta no-ok al obtener página ${page}: HTTP ${res.status}`);
      break;
    }
    const batch: any = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    allWpProducts.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  console.log(`Total de productos encontrados en WooCommerce: ${allWpProducts.length}`);

  const updateBatch: any[] = [];

  for (const wpProduct of allWpProducts) {
    // Find matching business in local seed/db
    const matchingBiz = seedBusinesses.find((b: any) =>
      b.id === wpProduct.id ||
      b.oldId === wpProduct.id ||
      (b.name && b.name.toLowerCase().trim() === wpProduct.name.toLowerCase().trim()) ||
      (b.slug && b.slug.toLowerCase().trim() === wpProduct.slug.toLowerCase().trim())
    );

    // Extract fields
    const getMeta = (k: string) => {
      const found = wpProduct.meta_data?.find((m: any) => m.key === k);
      return found ? found.value : '';
    };

    const bizData = matchingBiz || {
      name: wpProduct.name,
      phone: getMeta('telefono') || getMeta('phone') || '',
      whatsapp: getMeta('whatsapp') || getMeta('telefono') || '',
      address: getMeta('direccion') || getMeta('address') || '',
      colonia: getMeta('colonia') || getMeta('_colonia') || '',
      schedule: getMeta('horario') || '',
      payment: getMeta('pagos') || '',
      delivery: getMeta('envio') || '',
      facebook: getMeta('facebook') || '',
      instagram: getMeta('instagram') || '',
      website: getMeta('website') || '',
      description: cleanDescription(wpProduct.description)
    };

    // Clean description: remove any CSS or .fe-wrapper or style tag
    let cleanDesc = cleanDescription(matchingBiz?.description || wpProduct.description);
    if (!cleanDesc) {
      cleanDesc = wpProduct.name;
    }

    const shortcode = buildFichaEmpresaShortcode(bizData);

    updateBatch.push({
      id: wpProduct.id,
      description: `<p>${cleanDesc}</p>`,
      short_description: shortcode
    });
  }

  console.log(`Preparados ${updateBatch.length} productos para actualizar en lotes...`);

  // Send batch updates in chunks of 50
  const chunkSize = 50;
  let successCount = 0;

  for (let i = 0; i < updateBatch.length; i += chunkSize) {
    const chunk = updateBatch.slice(i, i + chunkSize);
    console.log(`Enviando lote de actualización ${i + 1} a ${Math.min(i + chunkSize, updateBatch.length)}...`);

    const batchRes = await fetch('https://empresasencarmen.com/wp-json/wc/v3/products/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({ update: chunk })
    });

    if (batchRes.ok) {
      const result: any = await batchRes.json();
      const updated = result.update?.length || 0;
      successCount += updated;
      console.log(`Lote completado: ${updated} productos actualizados.`);
    } else {
      console.error(`Error en lote: HTTP ${batchRes.status} - reintentando individualmente...`);
      for (const item of chunk) {
        try {
          const itemRes = await fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${item.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            body: JSON.stringify({
              description: item.description,
              short_description: item.short_description
            })
          });
          if (itemRes.ok) successCount++;
        } catch (e: any) {
          console.warn(`Error al actualizar producto #${item.id}:`, e.message);
        }
      }
    }
  }

  console.log(`\n=== REPARACIÓN FINALIZADA CON ÉXITO ===`);
  console.log(`Total productos actualizados: ${successCount} de ${allWpProducts.length}`);
}

repairAll().catch(console.error);
