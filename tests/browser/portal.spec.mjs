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
 await page.getByPlaceholder('Buscar por puesto, producto, colonia o palabra clave...').fill('Taladro');await page.getByRole('heading',{name:'Taladro sintético de prueba'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
});
test('modal: campos incompletos y cierre Escape',async({page,lab})=>{await home(page);await openAdForm(page);await page.getByRole('button',{name:'Publicar Anuncio Ahora'}).click();expect(lab.requests.filter(r=>r.method==='POST'&&r.path==='/api/public/classifieds')).toHaveLength(0);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);});
for(const mode of ['403','500','nonjson','abort'])test(`clasificados: rechazo ${mode} nunca anuncia éxito`,async({page,lab})=>{
 lab.postMode=mode;await home(page);await openAdForm(page);const d=await fillAd(page);await d.getByRole('button',{name:'Publicar Anuncio Ahora'}).click();
 await expect(d.getByText(/rechazada|Error del servidor|Failed to fetch|fetch|conexión/i).first()).toBeVisible();await expect(d.getByText(/Anuncio confirmado por fixture/)).toHaveCount(0);await expect(d).toBeVisible();expect(lab.requests.filter(r=>r.method==='POST'&&r.path==='/api/public/classifieds')).toHaveLength(1);
});
test('clasificados: envío lento, doble clic y confirmación',async({page,lab})=>{lab.delay=500;await home(page);await openAdForm(page);const d=await fillAd(page);const b=d.getByRole('button',{name:'Publicar Anuncio Ahora'});const box=await b.boundingBox();await b.click();await expect(d.locator('button[type=submit]')).toBeDisabled();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await expect(d.getByText('Anuncio confirmado por fixture')).toBeVisible();expect(lab.requests.filter(r=>r.method==='POST'&&r.path==='/api/public/classifieds')).toHaveLength(1);});
for(const mode of ['403','500','nonjson','abort'])test(`lectura clasificados ${mode}: error visible`,async({page,lab})=>{lab.mode=mode;await home(page);await classifieds(page);await expect(page.getByText(/Error al consultar|Unexpected token|Failed to fetch|JSON|conexión/i).first()).toBeVisible();await page.screenshot({path:test.info().outputPath('error.png'),fullPage:true});});
test('catálogo vacío legítimo',async({page,lab})=>{lab.businesses=[];lab.ads=[];await home(page);await expect(page.getByText('No se encontraron empresas con los filtros seleccionados.')).toBeVisible();await classifieds(page);await expect(page.getByRole('heading',{name:'Taladro sintético de prueba'})).toHaveCount(0);});
test('API empresarial caída no muestra catálogo semilla',async({page,lab})=>{lab.catalogMode='500';await page.goto('/');await expect(page.getByText(/No se pudieron consultar los negocios vigentes|No se pudo cargar|No fue posible|Error.*catálogo|catálogo.*disponible/i).first()).toBeVisible();await expect(page.getByRole('heading',{name:business.name})).toHaveCount(0);});
test('registro público: validación sin enviar',async({page,lab})=>{await home(page);await register(page);await page.getByRole('button',{name:'Registrar y Publicar Negocio en Carmen'}).click();expect(lab.requests.filter(r=>r.path==='/api/public/business-registrations')).toHaveLength(0);});
for(const mode of ['403','500','nonjson','abort'])test(`registro público ${mode}: sin éxito falso`,async({page,lab})=>{lab.postMode=mode;await home(page);await fillBusiness(page);await page.getByRole('button',{name:'Registrar y Publicar Negocio en Carmen'}).click();await expect(page.getByText(/Registro rechazado|Error HTTP|Failed to fetch|confirmación|conexión/i).first()).toBeVisible();expect(lab.requests.filter(r=>r.path==='/api/public/business-registrations')).toHaveLength(1);});
test('registro público: confirmación con ficha y directorio',async({page,lab})=>{await home(page);await fillBusiness(page);await page.getByRole('button',{name:'Registrar y Publicar Negocio en Carmen'}).click();await expect(page.getByText(/registrado|publicado/i).first()).toBeVisible();await expect.poll(()=>lab.requests.filter(r=>r.path==='/api/businesses/900003').length).toBeGreaterThan(0);expect(lab.requests.find(r=>r.path==='/api/public/business-registrations').key).toBeTruthy();});
test('geometría medible: inicio, clasificados y modal dentro del viewport',async({page,lab})=>{
 await home(page);const measure=async label=>{await page.screenshot({path:test.info().outputPath(label+'.png'),fullPage:true});const dims=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));expect(dims.width,`${label}: overflow horizontal`).toBeLessThanOrEqual(dims.viewport+1);};
 await measure('inicio');await classifieds(page);await measure('clasificados');await page.getByRole('button',{name:/Publicar Vacante o Anuncio/}).click();await measure('formulario');
 const box=await page.getByRole('dialog').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.width).toBeLessThanOrEqual(page.viewportSize().width);
});

test('historial real atrás y adelante conserva destino',async({page,lab})=>{
 await home(page);await page.getByRole('heading',{name:business.name}).click();await page.getByRole('link',{name:/Visitar ficha pública/}).click();
 await expect(page).toHaveURL(/taller-sintetico-e2e/);await page.goBack();await expect(page).toHaveURL(/\/$/);await expect(page.getByRole('heading',{name:'Directorio de Empresas'})).toBeVisible();await page.goForward();await expect(page.getByRole('heading',{name:business.name}).last()).toBeVisible();
});
test('navegación pendiente: respuesta atrasada no reemplaza destino (H02)',async({page,lab})=>{
 await home(page);let release;const gate=new Promise(r=>release=r);let arrived=false;
 await page.route('**/api/businesses/e2e-ausente',async route=>{arrived=true;await gate;await route.fulfill({json:{success:true,business:{...business,id:999999,name:'Respuesta atrasada indebida',slug:'e2e-ausente'}}}).catch(()=>{});});
 // pushState+popstate emula la transición de historial a una ficha fuera del catálogo.
 // La respuesta se retiene; los clics y el historial posteriores son del navegador real.
 await page.evaluate(()=>{history.pushState({},'', '/e2e-ausente');dispatchEvent(new PopStateEvent('popstate'));});await expect.poll(()=>arrived).toBe(true);
 await page.goBack();await expect(page).toHaveURL(/\/$/);release();await page.waitForTimeout(200);await expect(page.getByRole('heading',{name:'Respuesta atrasada indebida'})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Directorio de Empresas'})).toBeVisible();
});
test('categorías y subcategorías del formulario son seleccionables',async({page,lab})=>{await home(page);await openAdForm(page);const d=page.getByRole('dialog');await d.locator('select').nth(0).selectOption('vehiculos');await d.locator('select').nth(1).selectOption('vehiculos-motos');await expect(d.locator('select').nth(1)).toHaveValue('vehiculos-motos');await d.getByRole('button',{name:'Cerrar modal'}).click();});
test('filtro avanzado de clasificados por categoría',async({page,lab})=>{await home(page);await classifieds(page);const toggle=page.getByText('Filtros avanzados (Ubicación, Modalidad, Fuente)');if(await toggle.isVisible())await toggle.click();const category=page.locator('select').filter({has:page.locator('option[value="empleos"]')});await category.selectOption('empleos');await expect(page.getByRole('heading',{name:'Taladro sintético de prueba'})).toHaveCount(0);await category.selectOption('compra-venta');await expect(page.getByRole('heading',{name:'Taladro sintético de prueba'})).toBeVisible();});
test('contacto obligatorio impide publicación',async({page,lab})=>{await home(page);await openAdForm(page);const d=await fillAd(page);await d.getByPlaceholder('9381234567').first().fill('');await d.getByRole('button',{name:'Publicar Anuncio Ahora'}).click();await expect(d.getByText(/se requiere teléfono o WhatsApp/)).toBeVisible();expect(lab.requests.filter(r=>r.path==='/api/public/classifieds'&&r.method==='POST')).toHaveLength(0);});
test('objetivo táctil principal y formulario con scroll',async({page,lab})=>{await home(page);await openAdForm(page);const d=page.getByRole('dialog');const submit=d.getByRole('button',{name:'Publicar Anuncio Ahora'});await submit.scrollIntoViewIfNeeded();const box=await submit.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);await expect(submit).toBeInViewport();await submit.focus();await expect(submit).toBeFocused();});

test('clasificados: HTTP 200 incompleto no confirma publicación',async({page,lab})=>{lab.postMode='unconfirmed';await home(page);await openAdForm(page);const d=await fillAd(page);await d.getByRole('button',{name:'Publicar Anuncio Ahora'}).click();await expect(d.getByText('El servidor no confirmó la publicación del anuncio.')).toBeVisible();});
test('registro: falta lectura posterior impide éxito',async({page,lab})=>{lab.postMode='unconfirmed';await home(page);await fillBusiness(page);await page.getByRole('button',{name:'Registrar y Publicar Negocio en Carmen'}).click();await expect(page.getByText(/No se pudo consultar la publicación|La ficha o el directorio no confirman/)).toBeVisible();await expect(page.getByRole('heading',{name:'¡Tu negocio ya está publicado en el directorio!'})).toHaveCount(0);});
test('registro: reintento tras 502 conserva idempotencia',async({page,lab})=>{lab.postMode='nonjson';await home(page);await fillBusiness(page);const submit=page.getByRole('button',{name:'Registrar y Publicar Negocio en Carmen'});await submit.click();await expect(page.getByText(/Error HTTP 502/)).toBeVisible();lab.postMode='ok';await submit.click();await expect(page.getByRole('heading',{name:'¡Tu negocio ya está publicado en el directorio!'})).toBeVisible();const posts=lab.requests.filter(r=>r.path==='/api/public/business-registrations');expect(posts).toHaveLength(2);expect(posts[0].key).toBeTruthy();expect(posts[1].key).toBe(posts[0].key);});

test('encabezado: acciones principales sin recorte lateral',async({page,lab})=>{
 await home(page);await page.screenshot({path:test.info().outputPath('encabezado.png')});
 for(const name of [/Subir Mi Negocio/,/Números de Emergencia 911|Núm. Emergencia/]){
  const button=page.getByRole('button',{name}).first();const box=await button.boundingBox();
  expect(box,`Botón ${name}`).not.toBeNull();expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width,`Acción ${name} recortada por el borde derecho`).toBeLessThanOrEqual(page.viewportSize().width+1);
 }
});
