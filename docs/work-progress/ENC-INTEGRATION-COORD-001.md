# ENCARMEN — Integración directa de Coordinación 01
Fecha: 2026-10-29
Rama: coord/encarmen-classifieds-integration-001
Base exacta: coord/encarmen-gas-client-fixes-001 @ df852dc40c323b3b72faa5456ecc4276e28e0301
Estado: código publicado / revisión estática en curso; NO se declara integración validada, NO Staging, NO producción.

## Cambios efectivos
- Incorporados los módulos de backend y pruebas de PERP desde coord/encarmen-classifieds-backend-fixes-001, conservando el frontend GAS corregido.
- server.ts ahora importa y registra registerPublicClassifieds(app) después de los body parsers. Staging continúa bloqueando las escrituras a /api/public/classifieds; NO se ha habilitado DB real.
- H01: src/server/adminSecurity.ts y 2 guards de server.ts limitan excepción radar-search a POST exacto, cerrando bypass PUT/PATCH/DELETE.
- H02: src/App.tsx navegación popstate comparte contador de solicitudes de negocio y AbortController, rechaza respuestas atrasadas y solicitudes de slug obsoleto.
- H03: src/services/api.ts trata HTTP 5xx y errores de confirmación de registro empresarial como resultado potencialmente incierto, preservando clave de idempotencia.
- H04: sendBusinessReport/sendClassifiedReport retornan success:false ante fallos o respuestas no confirmadas; se eliminó fallback localStorage que mentía sobre envío.
- Backend de clasificados: readback tras UPDATE fallido indica incertidumbre y un fallo de INSERT cuyo resultado no se conoce ya no se presenta como fracaso definitivo; pruebas ajustadas.
- Nueva suite H01: tests/enc-consolidation-h01-regression.test.mjs.

## Pruebas y límites
- GitHub confirma commits y contenido; scripts y tests en rama. **No se han ejecutado npm, tsc, tsx, vite ni MariaDB real en esta sesión**.
- Contenedor local tiene Node 22 y git, pero no dispone de repo montado ni acceso DNS a github.com para clonarlo, por lo que las pruebas del proyecto no se reprodujeron.
- La suite del backend PERP usa fake pool, no demuestra persistencia MariaDB real.
- Backend no crea esquema automáticamente ni aplica SQL. Debe prepararse en base desechable previa aprobación.
- El backend de clasificados requiere token de titular y aislamiento DB, y Staging mantiene guard contra mutaciones.
- No ha habido merge de ia-desarrollo o main, deploy, acceso Hostinger ni escrituras reales.

## Pendientes antes de integración
1. Verificar TypeScript, compilación, tests y pruebas HTTP reales en entorno con checkout.
2. Revisar regresiones de H01–H04: sesiones administrativas, rutas radar, carrera popstate, confirmación de empresas y reportes.
3. Crear pruebas E2E frontend+backend con HTTP real y MariaDB desechable aislada; verificar secreto de titular, idempotencia, expiración y errores.
4. Diseñar recuperación del token de titular tras POST incierto; no revelarlo vía replay de idempotencyKey.
5. Confirmar segregación real de datos Staging/producción antes de permitir escrituras y autorizar explícitamente despliegue.
6. Revisar controles antiabuso de creación pública, auditoría de rutas y limpieza de datos/archivos.
