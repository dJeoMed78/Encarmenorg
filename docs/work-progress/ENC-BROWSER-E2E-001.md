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
