# ENC-BROWSER-E2E-001

Base exacta: `afa344a291a2f64354989c890f8f55dad0a2af7c`.
Rama exclusiva: `work/enc-browser-e2e-001`.

## Hito 1 — Infraestructura preparada (2026-10-29)

Playwright 1.56.1 con lockfile independiente, cinco viewports y servidor Vite local del producto real. Sin ejecutar server.ts ni inicialización de base. Fixture intercepta API y bloquea tráfico externo; datos de contacto sintéticos. Capturas, trazas y reporte JSON/HTML en cada ejecución. Workflow exclusivo de esta rama, contents:read, sin secretos ni despliegue.

Se consultaron los cinco documentos requeridos en la rama de coordinación. SHA base confirmado por GitHub. No se modifican componentes React, persistencia, middleware ni servidor.

Primera configuración local corregida: directorio de trabajo de Vite y sintaxis del fixture. No se cuentan como pruebas aprobadas. Ejecución funcional en progreso; este hito no declara resultados finales.

Reproducción: `npm ci --ignore-scripts`, `npm ci --ignore-scripts --prefix tests/browser`, `cd tests/browser`, `npx playwright install --with-deps chromium`, `npm test`.
Opcional: `ENC_CHROMIUM_PATH` selecciona un Chromium instalado. El servidor escucha solamente en 127.0.0.1:4173.
