# Navegador ENC-BROWSER-E2E-001

Ejecuta desde el checkout de la rama:

```sh
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix tests/browser
cd tests/browser
npx playwright install --with-deps chromium
npm test
```

No ejecutar npm run dev ni server.ts: iniciarían servicios ajenos a este arnés.
Playwright inicia Vite en 127.0.0.1:4173 y lo detiene al terminar. Cada caso recibe
un contexto limpio y estado sintético nuevo. La API es interceptada, no hay SQL.
La aplicación React, sus componentes y CSS son los del checkout sin sustituciones.
Los assets locales del producto se sirven normalmente; solamente /e2e-fixture.svg
es una imagen sintética. Recursos de terceros (fuentes, mapas) se bloquean.

Cinco proyectos Chromium: 320x568, 360x800, 390x844, 768x1024 y 1440x900.
Para una sola resolución: npm test -- --project=chromium-390x844.
ENC_CHROMIUM_PATH permite usar un binario local opcional.

El workflow conserva reporte HTML, JSON, capturas y trazas durante 14 días aun
cuando haya fallos. Abrir reporte: npx playwright show-report report.
Abrir traza: npx playwright show-trace artifacts/<caso>/trace.zip.
fixture-requests.json identifica solicitudes, cuerpos sintéticos y APIs no modeladas.
No contiene credenciales reales. Un API no modelada devuelve 503, nunca éxito.

Las pruebas de confirmación verifican el contrato del cliente con respuestas
sintéticas; no acreditan persistencia MariaDB ni el pipeline de Express completo.
El caso H02 cubre respuesta pendiente al abandonar una ruta; la transición inicial
fuera de catálogo se prepara con history.pushState/popstate en el navegador. No
reproduce un guardado administrativo SQL ni acredita todas las carreras históricas.
Las capturas prueban render real, no equivalencia con un diseño aprobado ni carga
real de mapas/fuentes externos. Las medidas de overflow y objetivo principal son
aserciones puntuales; no certifican todos los objetivos táctiles de la aplicación.

## Recuperación si Actions rechaza artefactos por cuota

El paso export-evidence.mjs emite al log JSON comprimido, JPEG reducidos y una
traza representativa reducida. No publica credenciales ni contacta servicios.
Descargar el log del job de GitHub y ejecutar desde la raíz del checkout:

```sh
python3 tests/browser/recover-evidence.py job.log /tmp/enc-e2e-recuperado
```

El directorio destino debe ser nuevo. Se validan base64, CRC de ZIP y JSON.
La traza reducida incluye e2e-reduced-manifest.json con recursos grandes omitidos;
algunas imágenes/CSS pueden faltar al reproducirla. Los ZIP completos y el reporte
HTML se generan en el runner; su recuperación normal requiere cuota disponible.
Las capturas JPEG recuperadas son evidencia real reducida, sin promesa de fidelidad
de píxeles respecto a los PNG originales. El servidor usa build+preview de Vite.
