# ENC-STAGING-CANDIDATE-CLOSURE-004-R1

Estado: implementado y probado localmente; pendiente de revisión independiente. No integrado ni desplegado.
Base: c79992a385213b437541cb92954c76a99c2485b1.
Rama: work/enc-staging-candidate-closure-004-r1.

## Correcciones
C4-H01: generación de subida y comprobación después de compresión y carga remota. Invalidación al editar, cancelar/restablecer, quitar imagen, cambiar empresa y desmontar. Las respuestas obsoletas tampoco pueden limpiar el indicador de una subida nueva.
C4-H02: origen histórico separado de preview nueva. Se preservan exactamente promoImage/promoImageData, incluidos null y ausencia, al editar texto. Solo quitar o sustituir deliberadamente cambia los campos. Las cargas nuevas necesitan éxito explícito y URL válida; dataURI no acredita carga.

Dependencia resuelta dentro del componente: getAdminPromotions tenía fallback a semillas; la consulta ahora usa adminFetch y exige respuesta remota válida. Así no se confunden semillas con imágenes históricas recibidas. No se modificó el servicio ni el backend.
Contrato inspeccionado: POST administrativo reemplaza el objeto; dbSavePromotion serializa raw_data. Por ello se conservan ambos campos originales. Se probó la serialización con adaptador SQL simulado, sin conexión real.

## Evidencia
12 pruebas nuevas React/jsdom y adaptadores controlados: compresión tardía, cambio X/Y, cargas A/B en ambos órdenes, fallo tardío, quitar, cancelar, históricos base64 en ambos campos, ausencia original y rechazo de URLs inseguras. Fixture existente actualizado únicamente para las nuevas referencias del handler.
Contra componente C4 original: 12 pruebas, 2 PASS y 10 FAIL. Contra corrección: suite completa 188 PASS, 0 FAIL, 0 omitidas.

Comandos ejecutados:
- node --import tsx --test tests/staging-candidate-closure-004-r1.test.mjs
- npm run lint: PASS (tsc --noEmit).
- node_modules/.bin/vite build --outDir /tmp/enc-c4-r1-frontend: PASS; advertencia de tamaño de chunk >500 kB.
- ENC_R1_COMPONENT_SOURCE=../staging-candidate-closure-004/src/components/AdminPromotionsTab.tsx node --import tsx --test tests/staging-candidate-closure-004-r1.test.mjs: reproducción negativa indicada arriba.

Suite completa ejecutada:
```sh
node --import tsx --test tests/staging-candidate-closure-004*.test.mjs tests/data-integrity-closure-003-*.test.mjs tests/consolidation-fixes-002-*.test.mjs tests/security-radar-001.test.mjs tests/public-registration*.test.mjs tests/consolidation-001.test.mjs tests/contacts-r3.test.mjs tests/staging-write-001.test.mjs tests/staging-isolation-proof.test.mjs tests/security-containment-003.test.mjs tests/backup-security-002.test.cjs tests/coord-api-honest-results-001.test.mjs tests/coord-report-persistence-001.test.mjs tests/enc-f007a-mobile-order-001.test.mjs tests/public-detail-ux-001.test.mjs
```

## Límites y pendientes
No se ejecutó MariaDB real, Hostinger ni navegador visual; interacción React en jsdom. No se recompiló backend porque no cambió. El guardado backend preexistente es best-effort: esta entrega no certifica durabilidad SQL ni corrige ese contrato fuera de alcance. La invalidación lógica no cancela una carga remota ya enviada: puede quedar un archivo huérfano; su limpieza requiere contrato separado. No se habilitaron operaciones bloqueadas.
Main, ia-desarrollo y rama C4 no fueron modificadas por esta tarea. Sin SQL real, migraciones, integración, despliegue, PR ni force push. Paquetes A-D conservados, sin reimplementación.
Recomendación: revisar independientemente el commit R1; comprobar durabilidad backend en tarea autorizada antes de afirmar persistencia real. Reversión del candidato: revertir el commit R1 mediante nuevo commit, sin reescribir historial; ello recuperaría también los defectos C4 conocidos.
