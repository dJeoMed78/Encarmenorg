# ENCARMEN — Primera validación CI integral de integración aislada
Fecha de ejecución: 2026-10-29 (registros UTC de GitHub Actions).
Responsable: Coordinación Principal 01 («La Jefa»).
Repositorio: dJeoMed78/Encarmenorg
Rama VALIDADA EN CI: coord/encarmen-classifieds-integration-001
SHA EXACTO: 434b1f93f3258065a870cd240ba0a5fa9d436e31
Ejecución GitHub Actions: https://github.com/dJeoMed78/Encarmenorg/actions/runs/40933545853
Estado verificado: **COMPLETED / SUCCESS**. GitHub ha devuelto el mismo SHA para HEAD de rama y ejecución.

## Qué se ejecutó realmente
GitHub-hosted runner ubuntu-latest, checkout commit exacto, Node 22, npm ci --ignore-scripts.
1. npx tsc --noEmit — PASS.
2. npx tsx --test tests/public-classifieds.test.mjs tests/enc-consolidation-h01-regression.test.mjs — 24/24 PASS, 0 fallos. Backend usa FakePool, no MariaDB real; H01 prueba métodos de autorización y estructura de guard.
3. npx tsx --test tests/business-description-links.test.mjs tests/public-registration.test.mjs tests/public-registration-server-patch.test.mjs — 30/30 PASS, 0 fallos. Estas pruebas incluyen simulaciones y no validan una instancia real.
4. npx vite build — PASS, 1726 módulos transformados.
5. npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/encarmen-coord-server.js — PASS.
Todas las etapas del workflow reportadas SUCCESS. Total de pruebas de las dos suites: **54 de 54**.
Workflow: .github/workflows/encarmen-coordination-validation.yml, solo se activa por push a rama de coordinación (rutas de código y configuración) o ejecución manual. permissions.contents: read; no secretos, deploy ni acciones SQL.

## Defectos encontrados y corregidos gracias a CI
- Ejecución 40932570626: 3 errores TS en publicClassifieds.ts — corregidos en a9e632d26e275b01cc49d42de5b95d64fd2baa67.
- Ejecución 40932788273: simulador FakePool confundía SELECT CURRENT_USER() con SHOW GRANTS FOR CURRENT_USER(); fixture de título de cinco caracteres no era inválida — corregidos en ee8e17eca6c53524e7003c76b1d7181068f9b924.
- Ejecución 40932965934: 22/24, dos casos de test defectuosos (readback fallaba antes de UPDATE, fixture expirado seguía vigente) — corregidos en 2d4592143b87b18843b5f66b609914abb746d3d4.
- Ejecución 40933147339: 24/24 pruebas backend/H01 PASS pero regresión empresarial fallaba por invocación node --test sin loader TS, no por defecto de producto; corregida a npx tsx --test en 234d571317280cbe1551988672098cf9734eac26.
- Ejecución 40933342683: pruebas 54/54, TypeScript y Vite PASS. Se amplió validación con esbuild servidor en 434b1f93f3258065a870cd240ba0a5fa9d436e31.
- Ejecución 40933545853: **SUCCESS de todas las etapas**, incluyendo server bundle.

## Qué NO demuestra este éxito
- NO se ha conectado ni probado MariaDB real; FakePool y otras simulaciones no prueban integridad SQL, concurrencia, DDL/migraciones, rendimiento ni aislamiento auténtico de Staging.
- NO se ha ejecutado un navegador real, comprobado render 320/360/390px ni flujos de usuario integrales.
- NO se ha servido el bundle en Hostinger, ni probado contra un servicio HTTP real con la infraestructura destino.
- NO se han revalidado de manera independiente todas las rutas de seguridad y problemas de auditoría W2 en HTTP real.
- El carril público de escritura de clasificados continúa bloqueado en guard de Staging; no habilitar antes de verificar aislamiento real, permisos y autorización.
- No confundir compilación con integración o despliegue. No se ha modificado main, ia-desarrollo, Staging ni producción.

## Recomendación de Coordinación
El código es ahora **CANDIDATO TÉCNICO A EVALUACIÓN**, no aprobado para integración/deploy. Prioridad: verificación HTTP integrada en entorno temporal sin DB real, auditoría de rutas H01 y persistencia MariaDB local en ambiente desechable acreditado. Revisar gestión de titular ante reintento y autorización, así como H02-H04 con tests funcionales reales. Mantener producción protegida.
