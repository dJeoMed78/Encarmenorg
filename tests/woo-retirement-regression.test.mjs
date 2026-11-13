import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../server.ts',import.meta.url),'utf8');
test('legacy mutation routes deny synchronization before any old handler',()=>{
 assert.match(source,/app\.post\(\['\/api\/sync', '\/api\/webhook\/woocommerce', '\/api\/businesses\/:id\/sync-wp'\]/);
 assert.match(source,/Sincronización WooCommerce retirada/);
});
test('no executable WordPress export/import, webhook, or remote cache purge code remains',()=>{
 for(const name of ['exportBusinessToWooCommerce','syncAllWooCommerceProducts','getWpAuthHeader','parseWooCommerceProduct','purgeWordPressCache','IS_WP_SYNC_ENABLED']) assert.ok(!source.includes(name),name);
 assert.ok(!source.includes("'https://empresasencarmen.com/wp-json/wc/v3/products'"));
 assert.ok(!source.includes('api.cloudflare.com/client/v4/zones'));
});
test('retired cache purge reports failure and health does not perform remote requests',()=>{
 assert.match(source,/app\.post\('\/api\/admin\/purge-cache',[\s\S]{0,250}res\.status\(410\)/);
 assert.match(source,/app\.get\('\/api\/health-wp',[\s\S]{0,300}status:'retired'/);
});
