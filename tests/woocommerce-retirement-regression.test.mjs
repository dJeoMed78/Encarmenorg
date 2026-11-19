import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../server.ts',import.meta.url),'utf8');
test('retired WooCommerce POST endpoints fail closed before business handlers',()=>{
 assert.match(source,/app\.post\(\['\/api\/sync', '\/api\/webhook\/woocommerce', '\/api\/businesses\/:id\/sync-wp'\]/);
 assert.match(source,/res\.status\(410\)/);
 for(const endpoint of ['/api/sync','/api/webhook/woocommerce','/api/businesses/:id/sync-wp']){
   const matches=[...source.matchAll(new RegExp('app\\.post\\([^\\n]*'+endpoint.replaceAll('/','\\/') ,'g'))];
   assert.equal(matches.length,1,'legacy endpoint must only have one retired handler: '+endpoint);
 }
});
test('legacy destructive webhook is removed and MariaDB ownership retained',()=>{
 assert.doesNotMatch(source,/x-wc-webhook-topic/);
 assert.doesNotMatch(source,/Producto \$\{id\} eliminado en Hostinger MariaDB/);
 assert.doesNotMatch(source,/x-wc-webhook-topic|syncAllWooCommerceProducts|exportBusinessToWooCommerce|WC_CONSUMER_KEY|WC_CONSUMER_SECRET/);
});

test('legacy image compatibility remains local and does not fetch WordPress assets',()=>{
 assert.match(source,/rutas históricas de WordPress se resuelven localmente/);
 assert.match(source,/Compatibilidad con imágenes históricas de WordPress guardadas localmente/);
});
