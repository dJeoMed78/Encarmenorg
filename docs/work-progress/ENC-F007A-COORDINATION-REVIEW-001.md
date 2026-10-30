# ENC-F007A — Revisión independiente y subsanación de Jefa 3
Fecha: 2026-10-29. Trabajo de Perplexity: `work/enc-f007a-mobile-order-001` SHA `18668778bcce0a179c66ae5540de909da478c8f0`.
Rama de corrección de coordinación: `coord/enc-f007a-completion-001`, basada exactamente en el SHA publicado por Perplexity.

## Dictamen de la entrega original
**INCOMPLETA.** GitHub confirmó que Perplexity solo publicó tres archivos nuevos: un script de parche, una suite y una bitácora; no modificó `src/components/BusinessPublicDetail.tsx` ni `.css`. Por ello, la incidencia F007A **no quedó resuelta en el código funcional**. Perplexity declaró explícitamente que no había ejecutado las pruebas. Además, su suite exigía que los archivos base conservaran el error y calculaba el resultado aplicando un parche en memoria, por lo que no verificaba el código efectivamente integrado. La función de parche original tampoco reconocía correctamente la idempotencia del paso de eliminación de la sección.

## Corrección directa de Jefa 3
- Se movió el bloque `bpd-reviews` desde la sección `bpd-story` hasta después de `bpd-facts` (antes del footer) dentro del grid. Esto alinea orden DOM/lectura con la visualización y conserva un único widget de calificación.
- CSS: en escritorio se asignó a opiniones fila 3; en tabletas de 701–1100px fila 4 después de los datos (fila 3); en <=700px se conserva orden 7, luego de datos (orden 6).
- Script de parche: ahora reconoce el estado aplicado; la segunda invocación no intenta eliminar un bloque ausente, manteniendo función de comprobación idempotente.
- Suite de 6 pruebas reescrita para validar el código funcional publicado y no solo el resultado esperado de un parche hipotético. Incluye estructura DOM, filas de CSS, orden móvil, contactos/servicios y no-op del script ya aplicado.

## Verificación y límites
Comparación GitHub de rama contra base y lectura de fuentes; no se han ejecutado Node, tsc, Vite, Playwright/Chromium ni navegador real en esta sesión. La corrección se clasifica como **IMPLEMENTADA Y PUBLICADA, pendiente de pruebas ejecutables e inspección visual**. Para validación: `node --test tests/enc-f007a-mobile-order-001.test.mjs`, `node scripts/apply-f007a-mobile-order-patch.mjs --check`, `npx tsc --noEmit`, `npx vite build`; inspección visual 320,360,390,430,768,1024,1440px. Las pruebas deben ejecutar los scripts adecuados del package.json tras revisarlos.

## Restricciones
No se modificaron API, MariaDB, contactos, H01-H04, main, ia-desarrollo ni servidor real. No se integró ni desplegó. La incidencia **ENC-F007A permanece ABIERTA** hasta aceptación expresa del propietario en Staging. La rama contiene los commits de Perplexity como antecedente más correcciones directas de coordinación; no hacer merge automático.
