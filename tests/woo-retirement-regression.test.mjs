import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../server.ts',import.meta.url),'utf8');
test('legacy mutation routes deny synchronization before any old handler',()=>{
 assert.match(source,/app\.post\(\['\/api\/sync', '\/api\/webhook\/woocommerce', '\/api\/businesses\/:id\/sync-wp'\]/);
 assert.match(source,/Sincronización externa retirada/);
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

test('legacy publication metadata and API functions are absent',()=>{
 const api=readFileSync(new URL('../src/services/api.ts',import.meta.url),'utf8');
 const admin=readFileSync(new URL('../src/components/BusinessAdminModal.tsx',import.meta.url),'utf8');
 const menu=readFileSync(new URL('../src/components/AdminWindowsMobileMenu.tsx',import.meta.url),'utf8');
 for(const name of ['syncWordPress','syncSingleBusinessToWordPress','checkWpHealth','publishedToWordPress','wpPermalink','wpProductId']) assert.ok(!api.includes(name),name);
 assert.doesNotMatch(admin,/WooCommerce|WordPress|wp-admin|wp-json\\/wc/);
 assert.doesNotMatch(menu,/WooCommerce|WordPress|Sincronización WP/);
});
test('database administration remains available after retiring the external status panel',()=>{
 const admin=readFileSync(new URL('../src/components/BusinessAdminModal.tsx',import.meta.url),'utf8');
 assert.match(admin,/Estado real de persistencia MariaDB/);
 assert.match(admin,/dbStatus\\?\\.mariadb\\?\\.connected/);
});
