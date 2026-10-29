# ENC-BROWSER-E2E-001

Base exacta: `afa344a291a2f64354989c890f8f55dad0a2af7c`.
Rama exclusiva: `work/enc-browser-e2e-001`.

## Hito 1 — Infraestructura preparada (2026-10-29)

Playwright 1.56.1 con lockfile independiente, cinco viewports y servidor Vite local del producto real. Sin ejecutar server.ts ni inicialización de base. Fixture intercepta API y bloquea tráfico externo; datos de contacto sintéticos. Capturas, trazas y reporte JSON/HTML en cada ejecución. Workflow exclusivo de esta rama, contents:read, sin secretos ni despliegue.

Se consultaron los cinco documentos requeridos en la rama de coordinación. SHA base confirmado por GitHub. No se modifican componentes React, persistencia, middleware ni servidor.

Primera configuración local corregida: directorio de trabajo de Vite y sintaxis del fixture. No se cuentan como pruebas aprobadas. Ejecución funcional en progreso; este hito no declara resultados finales.

Reproducción: `npm ci --ignore-scripts`, `npm ci --ignore-scripts --prefix tests/browser`, `cd tests/browser`, `npx playwright install --with-deps chromium`, `npm test`.
Opcional: `ENC_CHROMIUM_PATH` selecciona un Chromium instalado. El servidor escucha solamente en 127.0.0.1:4173.

## Hito 2 — CI en ejecución

Runs 40952254173 y 40952426710: checkout, npm y Chromium completos; suites en ejecución al registrar este punto. Se amplió a 29 escenarios por cinco resoluciones. La ejecución diagnóstica corta tras seis fallos para localizar errores de arnés; no equivale a una matriz final completa. Se conservan originales los assets locales del producto.

Chromium 150.0.7871.100 local no pudo crear socket Unix por restricción del entorno. Cero escenarios de interfaz aprobados localmente; se utiliza CI para ejecución real. Build Vite local pasó (1726 módulos); fuentes locales utilizadas contrastadas con blobs del SHA base.

## Diagnóstico y correcciones de arnés

Run 40952254173 completó 115 ejecuciones: 80 PASS, 35 FAIL. Los fallos identificados allí corresponden a selectores del arnés: detalle de anuncio es una tarjeta y no botón, mensaje de error empresarial distinto y colonia se llama Ciudad del Carmen Centro (no Centro). Corregidos sin cambiar producto. Run 40953157539: 19 PASS, 6 FAIL por timeout, 4 interrumpidos, 116 sin ejecutar; no es matriz final. Se cambió Vite dev por build+preview y se redujo concurrencia a dos workers.

GitHub rechaza upload-artifact por cuota de almacenamiento de cuenta. No se borran artefactos. Se conserva paso de carga con fallo visible no bloqueante y exportación acotada de resultados/capturas/traza por logs. Matriz final sin parada temprana: 32 escenarios x 5 viewports = 160 ejecuciones previstas. Resultados todavía pendientes.

## Matriz completa comprobada — 2026-10-29

SHA ejecutado: `667eb842978ed84f95bbaa36672362e6d3fa41a1`.
Run: https://github.com/dJeoMed78/Encarmenorg/actions/runs/40954639196
Chromium Headless Shell 141.0.7390.37, Playwright 1.56.1, Node 22.23.4.
165 ejecutadas: **164 PASS, 1 FAIL, 0 omitidas, 0 flaky**. Duración 268.5 s.

| Viewport | PASS | FAIL |
|---|---:|---:|
|320x568|32|1|
|360x800|33|0|
|390x844|33|0|
|768x1024|33|0|
|1440x900|33|0|

Defecto reproducido: el botón SOS/emergencias del encabezado llega a x=352.796875 en viewport de 320 px (tolerancia de prueba: 321). Captura real y aserción fallida. Afecta `src/components/Navbar.tsx:248-277`. El overflow del documento puede estar oculto por CSS; por eso la prueba verifica el botón mismo. No se corrige producto por restricción explícita de alcance. Recomendación: permitir contracción/reflujo del logo/grupo de acciones en 320px manteniendo accesibles alta y emergencias; repetir la aserción y revisión visual.

Los 32 escenarios restantes pasan en todas las resoluciones: registro con lecturas posteriores de API simulada, errores 403/500/no JSON/conexión, ausencia de éxitos falsos, búsqueda, clasificación, formularios, ficha/contactos, historial, respuesta atrasada al abandonar ruta, scroll, teclado y geometría medida.

Se recuperaron por logs 25 JPEG representativos, JSON comprimido, contexto del fallo y traza reducida. La traza omite recursos grandes y contiene manifiesto de omisiones; no sustituye todos los ZIP originales. upload-artifact sigue rechazado por cuota. Sin borrados ni cambios de facturación.

Cierre de infraestructura en `0b05f9a14ffb58270fb9f7356d839aa2fc55a407`: situar el botón de envío dentro del viewport antes del segundo clic real y exportar también vistas de clasificados/formulario (no solo inicio). Se repite toda la matriz antes del cierre final; sus resultados siguen pendientes en este punto.

## Cierre final — probado y publicado para revisión

SHA final de infraestructura ejecutado: `0b05f9a14ffb58270fb9f7356d839aa2fc55a407`.
Run final: https://github.com/dJeoMed78/Encarmenorg/actions/runs/40955633868
Inicio de pruebas: 2026-10-29 15:12:21 America/Mexico_City.
Duración: 354.8 s. **165 ejecutadas, 164 PASS, 1 FAIL, 0 omitidas, 0 flaky**.
Se repitió toda la matriz después del ajuste del segundo clic, con el mismo único defecto de producto. El doble envío real bajo solicitud lenta no produjo una segunda petición. El workflow final queda en FAILURE por el defecto visual, no se convierte a PASS ni se usa expectedFailure.

Resultados por viewport: 320x568 = 32 PASS/1 FAIL; 360x800, 390x844, 768x1024 y 1440x900 = 33 PASS/0 FAIL cada uno. Capturas inspeccionadas: encabezado recortado a 320 y ficha móvil. También se conservan vistas de inicio, resultados de búsqueda, clasificados, formulario, errores y escritorio.

Evidencia durable: [índice](../../tests/browser/evidence/README.md), [resumen](../../tests/browser/evidence/summary.json), [JSON completo gzip](../../tests/browser/evidence/results.json.gz), [manifiesto SHA256](../../tests/browser/evidence/manifest.json) y [traza reducida](../../tests/browser/evidence/representative-trace-reduced.zip).
35 JPEG, contexto DOM del fallo, JSON comprimido y traza reducida recuperados de logs. `recover-evidence.py` ejecutado sobre el log real: 38 archivos recuperados; base64/JSON/ZIP verificados. El manifiesto e índice se añaden después. GitHub puede insertar BOM en límites de segmentos del log; el recuperador lo contempla.

### Alcance y límites finales

- Navegador real: PROBADO. Chromium Headless Shell 141.0.7390.37 (Playwright build 1194), Playwright 1.56.1, Node 22.23.4 en GitHub Actions Ubuntu.
- React y CSS reales del SHA base; build+preview local al runner. API simulada con fixtures sintéticos, independiente por caso. Sin SQL, servidor Express completo, Hostinger, Staging ni producción.
- Clics, escritura, formularios, historial real, enlaces, Escape, foco, scroll, medidas de bounding boxes y estado visible. No se contaron lecturas JSX como E2E.
- H02: probado abandono de ruta con respuesta atrasada y guard de navegación; NO se reprodujo un guardado administrativo real ni todas las carreras históricas.
- Registro empresarial comprueba idempotencia al reintentar después de 502 y lectura posterior de ficha/directorio simuladas. No acredita persistencia MariaDB.
- Subcategorías comprobadas en el formulario; sin afirmar filtro de subcategorías en el listado. Teclado y medidas táctiles son comprobaciones puntuales, no certificación completa de accesibilidad.
- Cinco viewports Chromium, no dispositivos físicos ni Safari/Firefox. Recursos externos, mapas y fuentes remotas bloqueados: geometría comprobada con las fuentes de respaldo del navegador. Assets locales originales conservados.
- Reportes HTML, todos los PNG originales y todas las trazas se generan en el runner, pero upload-artifact fue rechazado por cuota. Carga marcada no bloqueante, con fallo visible y evidencia alternativa por logs. No se borraron artefactos ni se cambió facturación.
- JPEG reducidos a máximo 640 px/ancho y calidad 55. La traza recuperada es representativa del rechazo de API; omite recursos grandes según manifiesto interno. No sustituye todos los ZIP originales.
- Build Vite PASS; aviso de chunk mayor a 500 kB. No se ejecutaron pruebas SQL ni TypeScript/backend adicionales en esta tarea de infraestructura E2E.

### Entrega y recomendación concreta

Infraestructura y ejecución completadas; único fallo funcional/visual confirmado en estos escenarios: recorte del botón de emergencias a 320 px. Coordinar corrección localizada de Navbar sin perder acciones de alta/emergencias. Repetir test `encabezado` y matriz completa. No se aprobó integración ni despliegue.

Los commits de cierre agregan únicamente documentación, recuperador validado y evidencia de la ejecución citada; usan [skip ci] para evitar ejecutar otra vez la misma aplicación al guardar capturas. No cambian configuración ni escenarios de navegador probados. Fuente de producto intacta; ninguna corrección de producto implementada.
