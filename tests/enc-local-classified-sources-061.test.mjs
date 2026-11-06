import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalClassifiedListingUrl, resolveSourceSiteName, verifyClassifiedListingEvidence } from '../server.ts';

const locanto='https://www.locanto.com.mx/ciudaddelcarmen/ID_8636608796/DiDi-Conductor-para-Ciudad-del-Carmen.html';
const ciudad='https://carmen.ciudadanuncios.com.mx/item/769350/';
test('only direct listings from verified Carmen sources are accepted', () => {
  assert.equal(canonicalClassifiedListingUrl(locanto),locanto);
  assert.equal(canonicalClassifiedListingUrl(ciudad),ciudad);
  for (const url of [
    'https://www.locanto.com.mx/ciudaddelcarmen/',
    'https://www.locanto.com.mx/campeche/ID_8636608796/x.html',
    'https://carmen.ciudadanuncios.com.mx/',
    'https://campeche.ciudadanuncios.com.mx/item/769350/',
    'http://carmen.ciudadanuncios.com.mx/item/769350/',
    'https://evil.example/item/769350/'
  ]) assert.equal(canonicalClassifiedListingUrl(url),null,url);
  assert.equal(resolveSourceSiteName(locanto),'Locanto Ciudad del Carmen');
  assert.equal(resolveSourceSiteName(ciudad),'Ciudad Anuncios Carmen');
});

test('direct listing title and location must both be confirmed by origin HTML',async () => {
  const oldFetch=globalThis.fetch;
  try {
    globalThis.fetch=async()=>new Response('<html><head><title>Venta de bandas de pvc - Carmen</title></head><body><h1>Venta de bandas de pvc - Carmen</h1>Ciudad: Carmen, Campeche</body></html>',{status:200,headers:{'content-type':'text/html'}});
    assert.equal((await verifyClassifiedListingEvidence({sourceUrl:ciudad,title:'Venta de bandas de pvc'})).verified,true);
    globalThis.fetch=async()=>new Response('<html><head><title>Venta de bandas de pvc</title></head><body><h1>Venta de bandas de pvc</h1>Ciudad: Mérida, Yucatán</body></html>',{status:200,headers:{'content-type':'text/html'}});
    assert.equal((await verifyClassifiedListingEvidence({sourceUrl:ciudad,title:'Venta de bandas de pvc'})).verified,false);
    globalThis.fetch=async()=>new Response('blocked',{status:403,headers:{'content-type':'text/html'}});
    assert.equal((await verifyClassifiedListingEvidence({sourceUrl:locanto,title:'DiDi Conductor para Ciudad del Carmen'})).verified,false);
  } finally {globalThis.fetch=oldFetch;}
});
