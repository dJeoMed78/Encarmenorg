import test from 'node:test';
import assert from 'node:assert/strict';
import { extractClassifiedOriginFields, verifyClassifiedListingEvidence } from '../server.ts';

const source='https://carmen.ciudadanuncios.com.mx/item/769350/';
test('extracts only origin HTML metadata and does not invent missing seller',()=>{
  const html='<html><head><meta name="description" content="Reja de acero nueva, entrega en Carmen, Campeche, se ofrece venta directa"></head><body><h1>Reja de acero fabrica venta - Carmen</h1>Ubicación: Ciudad del Carmen. Precio: $4,500. Teléfono: 9381234567. Anunciante: Juan Pérez</body></html>';
  const f=extractClassifiedOriginFields(html);
  assert.match(f.description,/Reja de acero nueva/);
  assert.equal(f.price,4500);
  assert.equal(f.phone,'9381234567');
  assert.equal(f.location,'Ciudad del Carmen, Campeche');
  assert.equal(f.contactName,'Juan Pérez');
  const missing=extractClassifiedOriginFields('<h1>Reja de acero</h1>');
  assert.equal(missing.price,null);
  assert.equal(missing.phone,'');
  assert.equal(missing.contactName,'');
  assert.equal(missing.location,'');
});
test('origin title and city are required; reject other city',async()=>{
  const old=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response('<html><head><title>Reja de acero fabrica venta - Carmen</title></head><body><h1>Reja de acero fabrica venta - Carmen</h1>Ubicación: Ciudad del Carmen. Precio: $4,500. Teléfono: 9381234567</body></html>',{status:200,headers:{'content-type':'text/html'}});
    const valid=await verifyClassifiedListingEvidence({sourceUrl:source,title:'Reja de acero fabrica venta'});
    assert.equal(valid.verified,true);
    assert.equal(valid.fields?.price,4500);
    globalThis.fetch=async()=>new Response('<html><title>Reja de acero fabrica venta</title><body>Ubicación: Mérida, Yucatán</body></html>',{status:200,headers:{'content-type':'text/html'}});
    assert.equal((await verifyClassifiedListingEvidence({sourceUrl:source,title:'Reja de acero fabrica venta'})).verified,false);
  }finally{globalThis.fetch=old;}
});
