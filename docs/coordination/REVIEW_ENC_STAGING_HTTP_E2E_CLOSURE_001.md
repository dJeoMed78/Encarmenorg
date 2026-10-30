# ENCARMEN — Revisión independiente W5 HTTP E2E
Fecha: 2026-10-30
Tarea: ENC-STAGING-HTTP-E2E-CLOSURE-001
Ejecutor: W5 Codex
Rama evaluada: work/enc-staging-http-e2e-closure-001
Base: 4407e6aeb08b52cc750c952735467a0e04fe19cc
Entrega: 07d90c1bc4726c3088d815d922b1951bf5ccc736

## Estado de revisión
**REVISIÓN ESTÁTICA INDEPENDIENTE FAVORABLE, CONDICIONADA.**
NO INTEGRADO. NO DESPLEGADO. NO VALIDADO POST/PATCH EN STAGING PÚBLICO. NO CERRADA LA INCIDENCIA DEL PROPIETARIO.

Comparación independiente GitHub: 5 commits, 12 archivos afectados, uno operativo `src/db/stagingBusinessStore.ts` (+16 líneas, sin supresiones), un harness `scripts/test-staging-http-e2e.mjs` y 10 artefactos documentales/evidencias. No se observaron cambios en `main` ni `ia-desarrollo`.

## Hallazgo confirmado por código y evidencia
El readback previo solo contrastaba contactos; una columna SQL no persistida podía ser enmascarada por alias de `raw_data` y devolver 200/success. Codex publica una prueba reproducida en `before-fix.json`: trigger descartando `description`, HTTP PATCH 200 y SQL sin cambio. La modificación introduce `matchesWrittenValues`, verifica ID, campos SQL realmente escritos y `raw_data` por comparación JSON profunda antes del COMMIT; en discrepancia, `BusinessWriteError` 503 y rollback.

## Evidencia examinada
- `docs/work-progress/ENC-STAGING-HTTP-E2E-CLOSURE-001.md`
- `docs/work-progress/ENC-STAGING-HTTP-E2E-CLOSURE-001-evidence/before-fix.json`
- `docs/work-progress/ENC-STAGING-HTTP-E2E-CLOSURE-001-evidence/http-sql-results.json`
- `docs/work-progress/ENC-STAGING-HTTP-E2E-CLOSURE-001-evidence/validation.json`
- `docs/work-progress/ENC-STAGING-HTTP-E2E-CLOSURE-001-evidence/interruption-recovery.json`
- `scripts/test-staging-http-e2e.mjs`
- `src/db/stagingBusinessStore.ts`
Los resultados del ejecutor incluyen POST 201, replay 200, PATCH 200, lectura SQL independiente, GET desde MariaDB tras reinicio, rechazo 503 bajo trigger, bloqueos 401/403 y limpieza sintética verificada. Su entorno declara Node24/MariaDB11.4 Docker tmpfs, 43/43 regresiones, lint/build EXIT0.

## Límites y acciones obligatorias
1. Las pruebas de Codex son **evidencia del ejecutor**: Coordinación inspeccionó código y artefactos en GitHub pero **no reejecutó** el harness real. El entorno actual de Coordinación tiene Node22 y carece de Docker; no simular ejecución independiente.
2. `npm ci` falló por lockfile desincronizado/incompleto. Corrección del lockfile en tarea aparte, con pruebas de instalación limpia y verificación de diff antes de integración.
3. Ensayar el candidato con Node22 (Staging Hostinger); la ejecución de Codex fue Node24. No inferir compatibilidad runtime plena solo de TypeScript/build.
4. Revisar minuciosamente harness y cambios de persistencia ante posibles casos límite; no integrar ni publicar hasta aceptación de coordinación con pruebas suficientes.
5. Confirmar SHA real desplegado por Hostinger; el endpoint `/api/version` no da SHA Git verificable.
6. Validar POST/PATCH contra el Staging público, con identificación SQL exclusiva, credencial temporal, respaldo, limpieza y restauración; requiere autorización y control operacional explícitos. **Ninguna acción contra producción.**
7. Mantener incidencia original abierta hasta validación del propietario.

## Decisión actual
Aceptada como **candidata técnica de código con prueba integrada de ejecutor**, no como cierre final de persistencia en Hostinger. Siguiente paso: revisar Node22/lockfile en rama aislada, conciliar y autorizar integración a `ia-desarrollo` únicamente después de comprobaciones, luego despliegue y prueba pública segura.
