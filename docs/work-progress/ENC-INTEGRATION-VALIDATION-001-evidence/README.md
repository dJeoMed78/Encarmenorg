# Evidencia ejecutada, 2026-10-29 UTC

- `suites.log`: 128 tests PASS, 0 FAIL. Incluye 26 regresiones de clasificados/H01, contratos empresariales, H02/H03/H04, controles de Staging y nuevas regresiones. No son 128 pruebas MariaDB ni navegador.
- `runner-results.json`: TypeScript, suites, Vite, esbuild y servidor completo HTTP: exit 0. Log TypeScript vacío porque no hubo diagnósticos.
- `full-http.json`: servidor COMPLETO compilado, datos sintéticos, sin configuración SQL ni red saliente; 6 grupos PASS, incluyendo 60 intentos de mutación Radar con métodos/rutas/identidades alternativos. No sumar grupos y solicitudes como escenarios únicos.
- `mariadb-bootstrap.json`: motor MariaDB 10.11.14 REAL, 10 comprobaciones, datadir nuevo por ejecución. SQL entre procesos bootstrap; NO conexión mysql2/HTTP, NO concurrencia SQL y NO sesión con usuario mínimo por protocolo.
- `browser-blocked.txt`: Chromium real no pudo crear socket Unix (EPERM). No hay PNG ni validación responsive ejecutada.
- `frontend.log`, `backend.log`: compilaciones temporales; Vite advierte chunk >500 kB. Los archivos compilados no se incorporaron al repositorio.

Las rutas absolutas de logs identifican únicamente el laboratorio temporal de esta ejecución. No hay tokens, contraseñas o datos reales. Los fallos HTTP/SQL impresos por suites son inducidos y esperados; el resumen final es la autoridad del resultado.
