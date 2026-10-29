import {test,expect,business,home,classifieds,openAdForm,fillAd,register,fillBusiness} from './fixtures.mjs';

test('inicio, directorio, búsqueda y restablecer filtros',async({page,lab})=>{
 await home(page);await expect(page.getByRole('heading',{name:business.name})).toBeVisible();
 const search=page.getByPlaceholder('Buscar empresas, productos o servicios...').filter({visible:true});await search.fill('Panadería');await search.press('Enter');
 await expect(page.getByRole('heading',{name:business.name})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Panadería Sintética E2E'})).toBeVisible();
 await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();await expect(page.getByRole('heading',{name:business.name})).toBeVisible();expect(lab.errors).toEqual([]);
});
test('ficha real, contactos independientes y cierre por teclado',async({page,lab})=>{
 await home(page);await page.getByRole('heading',{name:business.name}).click();
 await expect(page.getByRole('link',{name:/Enviar WhatsApp/})).toHaveAttribute('href',/9380000002/);
 await expect(page.getByRole('link',{name:/Llamar al/})).toHaveAttribute('href',/9380000001/);
 await page.screenshot({path:test.info().outputPath('ficha.png'),fullPage:true});await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Cerrar ficha'})).toHaveCount(0);expect(lab.errors).toEqual([]);
});
test('navegación entre secciones y retorno al directorio',async({page,lab})=>{await home(page);for(const name of ['Clasificados','Eventos','Promociones','Negocios'])await page.getByRole('button',{name,exact:true}).click();await expect(page.getByRole('heading',{name:'Directorio de Empresas'})).toBeVisible();});
test('clasificados: búsqueda, categoría, sin imagen y detalle',async({page,lab})=>{
 await home(page);await classifieds(page);await expect(page.getByRole('heading',{name:'Taladro sintético de prueba'})).toBeVisible();
 await page.getByPlaceholder('Buscar por puesto, producto, colonia o palabra clave...').fill('inexistente');await expect(page.getByRole('heading',{name:'Taladro sintético de prueba'})).toHaveCount(0);
 await page.getByPlaceholder('Buscar por puesto, producto, colonia o palabra clave...').fill('Taladro');await page.getByRole('button',{name:/Ver detalles completos/}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
});
test('modal: campos incompletos y cierre Escape',async({page,lab})=>{await home(page);await openAdForm(page);await page.getByRole('button',{name:'Publicar Anuncio Ahora'}).click();expect(lab.requests.filter(r=>r.method==='POST'&&r.path==='/api/public/classifieds')).toHaveLength(0);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);});
for(const mode of ['403','500','nonjson','abort'])test(`clasificados: rechazo ${mode} nunca anuncia éxito`,async({page,lab})=>{
 lab.postMode=mode;await home(page);await openAdForm(page);const d=await fillAd(page);await d.getByRole('button',{name:'Publicar Anuncio Ahora'}).click();
 await expect(d.getByText(/rechazada|Error del servidor|Failed to fetch|fetch|conexión/i).first()).toBeVisible();await expect(d.getByText(/Anuncio confirmado por fixture/)).toHaveCount(0);await expect(d).toBeVisible();expect(lab.requests.filter(r=>r.method==='POST'&&r.path==='/api/public/classifieds')).toHaveLength(1);
});
test('clasificados: envío lento, doble clic y confirmación',async({page,lab})=>{lab.delay=500;await home(page);await openAdForm(page);const d=await fillAd(page);const b=d.getByRole('button',{name:'Publicar Anuncio Ahora'});await b.click();await expect(d.locator('button[type=submit]')).toBeDisabled();await expect(d.getByText('Anuncio confirmado por fixture')).toBeVisible();expect(lab.requests.filter(r=>r.method==='POST'&&r.path==='/api/public/classifieds')).toHaveLength(1);});
for(const mode of ['403','500','nonjson','abort'])test(`lectura clasificados ${mode}: error visible`,async({page,lab})=>{lab.mode=mode;await home(page);await classifieds(page);await expect(page.getByText(/Error al consultar|Unexpected token|Failed to fetch|JSON|conexión/i).first()).toBeVisible();await page.screenshot({path:test.info().outputPath('error.png'),fullPage:true});});
test('catálogo vacío legítimo',async({page,lab})=>{lab.businesses=[];lab.ads=[];await home(page);await expect(page.getByText('No se encontraron empresas con los filtros seleccionados.')).toBeVisible();await classifieds(page);await expect(page.getByRole('heading',{name:'Taladro sintético de prueba'})).toHaveCount(0);});
test('API empresarial caída no muestra catálogo semilla',async({page,lab})=>{lab.catalogMode='500';await page.goto('/');await expect(page.getByText(/No se pudo cargar|No fue posible|Error.*catálogo|catálogo.*disponible/i).first()).toBeVisible();await expect(page.getByRole('heading',{name:business.name})).toHaveCount(0);});
test('registro público: validación sin enviar',async({page,lab})=>{await home(page);await register(page);await page.getByRole('button',{name:'Registrar y Publicar Negocio en Carmen'}).click();expect(lab.requests.filter(r=>r.path==='/api/public/business-registrations')).toHaveLength(0);});
for(const mode of ['403','500','nonjson','abort'])test(`registro público ${mode}: sin éxito falso`,async({page,lab})=>{lab.postMode=mode;await home(page);await fillBusiness(page);await page.getByRole('button',{name:'Registrar y Publicar Negocio en Carmen'}).click();await expect(page.getByText(/Registro rechazado|Error HTTP|Failed to fetch|confirmación|conexión/i).first()).toBeVisible();expect(lab.requests.filter(r=>r.path==='/api/public/business-registrations')).toHaveLength(1);});
test('registro público: confirmación con ficha y directorio',async({page,lab})=>{await home(page);await fillBusiness(page);await page.getByRole('button',{name:'Registrar y Publicar Negocio en Carmen'}).click();await expect(page.getByText(/registrado|publicado/i).first()).toBeVisible();await expect.poll(()=>lab.requests.filter(r=>r.path==='/api/businesses/900003').length).toBeGreaterThan(0);expect(lab.requests.find(r=>r.path==='/api/public/business-registrations').key).toBeTruthy();});
test('geometría medible: inicio, clasificados y modal dentro del viewport',async({page,lab})=>{
 await home(page);const measure=async label=>{await page.screenshot({path:test.info().outputPath(label+'.png'),fullPage:true});const dims=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));expect(dims.width,`${label}: overflow horizontal`).toBeLessThanOrEqual(dims.viewport+1);};
 await measure('inicio');await classifieds(page);await measure('clasificados');await page.getByRole('button',{name:/Publicar Vacante o Anuncio/}).click();await measure('formulario');
 const box=await page.getByRole('dialog').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.width).toBeLessThanOrEqual(page.viewportSize().width);
});
