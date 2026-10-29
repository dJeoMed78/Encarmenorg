# ENC-WRITE-VALIDATION-001

Estado: PROBADO LOCALMENTE. Pendiente de revisión. No integrado ni desplegado.
Base: `0e2488f5552bf7768a15711316b0de4d71b5d17e`.
Rama: `work/enc-write-validation-001`.

## Ejecución y correcciones

Se ejecutaron todas las suites staging-write, staging-isolation-proof y el almacén con comprobación estricta por defecto. Resultado final: 40 ejecuciones PASS, 0 FAIL, 0 omitidas. Incluyen regresiones de contactos importadas por dos suites: el total no representa 40 casos distintos. La primera ejecución tuvo 38 PASS; se añadieron dos regresiones y se repitió el conjunto.

Se corrigió una carencia de cobertura: alta y edición ahora se prueban juntas con el verificador de aislamiento real por defecto, sin el stub positivo del arnés general. La conexión sigue siendo simulada. Otra regresión verifica rechazo tanto de alta como de edición ante permisos de producción o marca de producción, sin BEGIN/INSERT/UPDATE/COMMIT y liberando la conexión. No se detectaron defectos funcionales en la base que justificaran modificar la aplicación.

Se añadió `tests/run-write-validation.mjs`: descubre las tres suites, ejecuta pruebas, tsc y vite directamente, conserva logs y códigos de salida y termina con error si falla cualquier comando. Evita los scripts npm de versión y empaquetado. No inicia server.ts ni importa secretos.

Cobertura ejecutada: alta, idempotencia, duplicados y concurrencia simulada; edición y conservación de contactos SQL; eliminación explícita; fallos y confirmación perdida de COMMIT; sesiones, credenciales scrypt sintéticas, autorización HTTP y rechazo de otras mutaciones; controles de registro renderizados; tarjetas y fichas; aislamiento por base, permisos, esquemas y marca; errores de conexión.

## Reproducción

Con dependencias instaladas: `node tests/run-write-validation.mjs`.
Dependencias adicionales de pruebas: jsdom 30.1.3 (no declarado en package.json de la base); instalar localmente con `npm install --no-save --package-lock=false --ignore-scripts jsdom@30.1.3` si falta. No se modificaron manifiestos ni lockfiles. Esta ejecución reutilizó dependencias existentes; no acredita instalación limpia desde lockfile.

Entorno ejecutado: Node 24.22.1, TypeScript 7.0.2, Vite 8.3.5, jsdom 30.1.3.
El ejecutor escribe `validation-results/` y compila en un directorio temporal, sin modificar dist ni binarios desplegables del repositorio.

Resultado final del ejecutor: pruebas exit 0; tsc --noEmit exit 0; vite build exit 0, 1723 módulos. Vite avisa de bundle mayor de 500 kB y salida fuera de raíz; no son errores. Logs completos y results.json en `docs/work-progress/ENC-WRITE-VALIDATION-001-evidence/`.

## Bloqueos y límites

No existen binarios mariadbd/mysqld/mariadb ni Docker disponibles. No se probó persistencia en MariaDB real, reinicio real ni permisos de Hostinger. No se utilizaron credenciales, bases reales, migraciones, despliegues o escrituras externas. Las consultas de prueba se interpretan en modelos en memoria. HTTP de prueba únicamente en loopback.

Recomendación: revisar pruebas y resultados de esta rama. La persistencia real requiere posteriormente un entorno MariaDB local desechable y verificado. No habilitar escrituras reales a partir de estos mocks.
