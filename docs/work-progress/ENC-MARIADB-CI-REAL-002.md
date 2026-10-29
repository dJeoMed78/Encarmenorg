# ENC-MARIADB-CI-REAL-002 — laboratorio MariaDB real en CI

Rama `work/enc-mariadb-ci-real-002`, base `afa344a291a2f64354989c890f8f55dad0a2af7c` (`coord/encarmen-classifieds-integration-001`).

## Alcance

- Pruebas SQL REALES contra MariaDB efímera (imagen `mariadb:11.4`) en GitHub Actions.
- Ejercitan el servicio público real (`src/server/publicClassifieds.ts`) con `mysql2/promise`, sin FakePool.
- No modifica `server.ts`, `src/server/publicClassifieds.ts`, `src/services/api.ts`, `src/App.tsx`, componentes React ni middleware administrativo.
- No usa secretos de Hostinger; no conecta a Staging ni producción; no integra ni despliega.

## Workflow

`.github/workflows/enc-mariadb-ci-real-002.yml`

- Disparadores: `push` a `work/enc-mariadb-ci-real-002` y `workflow_dispatch`.
- `permissions: contents: read`.
- Servicio efímero `mariadb:11.4` con healthcheck; se destruye al terminar el job.
- Prepara `scripts/mariadb-lab-schema.sql` como root del contenedor.
- Ejecuta `npx tsx --test tests/mariadb-real-classifieds.test.mjs`.

## Esquema efímero

- `enc_classifieds_lab`: base del laboratorio; usuario `enc_lab` con privilegios sobre esa base solamente.
- `enc_classifieds_lab_nomarker`: base sin marcador (caso negativo P).
- `u293982346_encarmenapp`: base con nombre de producción, solo para comprobar el rechazo Q dentro del contenedor efímero.
- `enc_classifieds_isolation` con marcador `ENC-CLASSIFIEDS-LAB-ISOLATED`.
- `public_classifieds` la crea el servicio real (`ensureSchema`) con InnoDB.
- Usuario `enc_ro` con solo SELECT para el caso R.

## Casos cubiertos

A creación válida; B lectura posterior; C edición con token correcto; D rechazo con token incorrecto; E retiro lógico; F exclusión de vendidos y retirados; G vigencia de siete días y expiración; H idempotencia; I conflicto de clave; J duplicados concurrentes; K restricción UNIQUE real; L actualización de precio; M conservación de contactos y categoría; N error SQL real (marcador ausente); O verificación de aislamiento; P ausencia de marcador; Q rechazo por base de producción; R rechazo por privilegios insuficientes; S GET sin escrituras; T sin éxito falso (la fila existe realmente tras crear).

## Estado de ejecución

El workflow está configurado para ejecutarse automáticamente al publicar en esta rama. La evidencia de ejecución corresponde a la corrida de GitHub Actions asociada al commit que incluye estos archivos; los resultados (aprobados/fallidos y logs sin secretos) quedan en la pestaña Actions del repositorio.

## Límites

- La base `u293982346_encarmenapp` existe solo dentro del contenedor efímero de CI para validar el rechazo por nombre; no es la base real de producción.
- El caso de resultado incierto (`writeMayHaveSucceeded`) no es forzable de forma determinista contra MariaDB real sin manipular la red; se cubre por diseño del servicio y por las pruebas simuladas previas.
