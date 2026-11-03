import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const editor=readFileSync(new URL('../src/components/EditBusinessModal.tsx',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.ts',import.meta.url),'utf8');
const patch=server.slice(server.indexOf("app.patch(['/api/businesses/:id'"),server.indexOf("// Force sync a single business to WordPress WooCommerce"));
test('solo el administrador puede seleccionar una imagen existente como logo',()=>{
 assert.match(editor,/isAdmin && \(\s*<button[\s\S]*?handlePromoteGalleryPhotoToLogo\(idx\)/);
 assert.match(editor,/!logoAllowed \|\| isSaving/);
 assert.match(editor,/Usar como logotipo/);
 assert.match(patch,/El cambio de logotipo requiere una sesión administrativa válida/);
});
test('mueve una sola URL sin borrar archivos y guarda logo y galería juntos',()=>{
 assert.match(editor,/logo_url: selected,\s*gallery: gallery\.filter\(\(_, i\) => i !== index\)/);
 assert.match(editor,/const response = await onSave\(id, payload\)/);
 assert.match(patch,/String\(confirmed\.logo_url \|\| ''\) !== String\(safeBody\.logo_url \|\| ''\)/);
 assert.match(patch,/JSON\.stringify\(confirmed\.gallery \|\| \[\]\) !== JSON\.stringify\(safeBody\.gallery \|\| \[\]\)/);
});
test('no ejecuta sincronización de cambios a WordPress legado',()=>{
 assert.doesNotMatch(patch,/getWpAuthHeader|exportBusinessToWooCommerce|empresasencarmen\.com/);
});
