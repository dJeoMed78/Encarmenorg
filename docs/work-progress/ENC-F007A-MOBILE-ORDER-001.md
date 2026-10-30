# ENC-F007A-MOBILE-ORDER-001 — orden móvil de la ficha empresarial

Rama `work/enc-f007a-mobile-order-001`, base `work/enc-consolidation-fixes-002` (`e60582e971f4f8cb56ea56191d33d91824f3fc5e`).

## Diagnóstico

- En móvil (<=700px) el orden visual ya estaba resuelto por `work/enc-public-detail-ux-001`: `.bpd-reviews { order: 7 }`.
- Defecto residual 1: entre 701 y 1100px las opiniones quedaban antes de ubicación, horarios, pagos y entrega.
- Defecto residual 2: el orden del DOM/teclado/lectores de pantalla no coincidía con el orden visual en móvil (opiniones antes de datos en el DOM).

## Antecedentes revisados

- `coord/encarmen-work-control-001`: registro maestro confirma ENC-F007A ABIERTA.
- `work/enc-public-detail-ux-001`: introdujo el orden móvil <=700px (`order: 7`) y pruebas.
- `work/enc-glass-logo-maps-002`: ajustes de mapa/logotipo; no resolvían el orden 701-1100px ni el DOM.
- Prueba existente `tests/public-detail-ux-001.test.mjs` ya validaba el orden <=700px; se conserva.

## Solución aplicada

- `BusinessPublicDetail.tsx`: la sección `bpd-reviews` se movió a después de `bpd-facts` (ubicación, horarios, pagos, entrega) dentro de `.bpd-grid`. Esto corrige DOM, teclado y lectores de pantalla en todas las anchuras, sin duplicar la sección.
- `BusinessPublicDetail.css`: en escritorio `.bpd-reviews` ocupa fila 3 completa; en 701-1100px ocupa fila 4 completa (después de datos); en <=700px conserva `order: 7`.
- No se tocaron `api.ts`, `mariadb.ts`, `server.ts`, `App.tsx`, contactos, calificaciones, Maps ni logotipo.

## Pruebas

`tests/enc-f007a-mobile-order-001.test.mjs` — 7 pruebas:

1. Defecto presente en la base (opiniones antes de datos en DOM).
2. Tras el parche, opiniones después de datos en DOM.
3. Móvil <=700px conserva order 7.
4. 701-1100px: opiniones en fila 4, después de datos.
5. Escritorio: opiniones en fila 3 completa.
6. Contactos, mapa y accesibilidad se conservan.
7. Parche idempotente.

## Estado de ejecución

**NO se ejecutaron `tsc`, `vite build`, la suite ni pruebas de navegador en este entorno** (no hay Node/navegador disponibles para el agente). Comandos listos:

    node scripts/apply-f007a-mobile-order-patch.mjs --check
    node scripts/apply-f007a-mobile-order-patch.mjs
    npx tsx --test tests/enc-f007a-mobile-order-001.test.mjs
    npx tsx --test tests/public-detail-ux-001.test.mjs
    npx tsc --noEmit
    npx vite build

No se declaran como probados la compilación, la suite ni la validación visual. Capturas: no disponibles (sin navegador).

## Límites

- El parche debe aplicarse a `src/components/BusinessPublicDetail.tsx` y `.css` antes de compilar.
- La incidencia ENC-F007A continúa abierta hasta validación del propietario.
