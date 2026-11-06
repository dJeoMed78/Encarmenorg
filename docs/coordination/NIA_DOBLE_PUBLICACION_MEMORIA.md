# ENCARMEN — Protocolo permanente de doble publicación Nia

**Fecha de aprobación:** 2026-11-06. **Autoridad:** propietario de ENCARMEN. **Ámbito:** coordinación y continuidad entre conversaciones.

## Regla

Cada decisión, avance o checkpoint relevante de Nia debe publicarse en **ambos** destinos y verificarse:

1. **Google Drive:** carpeta privada `memoria NIA` (`1Qy7yHshDTRsKg3XE-7DsuqjNhw2mbD6L`). Memoria narrativa de cada conversación con nombre basado en la **fecha de activación** (`NIA-AAAA-MM-DD.md`); cuando haya varias conversaciones el mismo día, sufijo distintivo. Conservar el ID, actualizar exclusivamente la memoria propia y no duplicar ni sobrescribir archivos históricos.
2. **GitHub:** repositorio `dJeoMed78/Encarmenorg`, rama `coord/encarmen-work-control-001`. Fuente oficial de decisiones técnicas, evidencias, tareas, commits, pruebas, riesgos y pendientes. Registrar aquí el checkpoint técnico pertinente en la documentación de coordinación o de la tarea correspondiente. No tratar Drive como prueba técnica suficiente.

## Procedimiento

- Registrar únicamente hechos comprobados y distinguir propuesto, implementado, probado, integrado, desplegado y aceptado.
- Actualizar Drive y GitHub, comprobar mediante lectura posterior ambos destinos y registrar identificadores/enlaces de los dos registros.
- Si uno falla, declarar **doble publicación incompleta**, conservar lo que sí se verificó y reintentar solo el destino faltante; no afirmar éxito total.
- Mantener secretos, credenciales, datos personales y contenidos sensibles fuera de ambos registros.
- No modificar `main`, producción `https://encarmen.org`, ni ejecutar operaciones destructivas, despliegues o migraciones sin autorización específica y controles de aislamiento/respaldo/reversión.

## Checkpoint inicial — 2026-11-06

Memoria de esta conversación: `NIA-2026-11-06.md`, Google Docs ID `1tbMojdWte6as86rh81W1CO6jMZmxnXCMIoUBuui6jrY`, en la carpeta indicada. Documento nativo Google Docs con nombre `.md`, no Markdown físico. Historial fuente `Nia-0311_2-2026-11-06.md`, Drive ID `1DU8uDFgDYj9tLmsTuNwnNTl8YYa0sbwj`.

Pendientes documentados: #43 recuperar ZIP/parches reales de GAS; #41 completar E2E PR #54; #044 Facebook comprobar acceso navegador autorizado; #19 verificar 12 imágenes y persistencia en Staging; #34 revisar entrega de W1; #42 radar eventos; #6 contactos. No se autoriza integración o despliegue por este registro.

## Auditoría independiente PR #55 — 2026-11-06

PR #55 (`work/enc-radar-empresas-043-gas`), commit `ddd034496317347a9355e1b5cabceb9d66e55ab6`, comparada con `ia-desarrollo` (`9bd1eaba965f82805fa8ba8f74bc6d04b1f7f9e9`): 1 commit adelante, 0 detrás, cinco archivos modificados, 696 líneas cambiadas en `server.ts`. CI media regression gate run `42255561581` SUCCESS; las 12 pruebas nuevas usan harness y mocks, no ejecución real de endpoints con MariaDB.

**Dictamen: NO APROBADA para integración.** Hallazgo bloqueante: `server.ts` líneas aprox. 7638–7643, aprobación múltiple fuera de Staging agrega `newBiz` a `confirmed` solo si `dbSaveBusiness` retorna true, **sin `dbLoadAllBusinesses(true)` ni verificación de lectura**. La aprobación individual sí verifica readback (líneas 7415–7425). Esto contradice la garantía de confirmación fehaciente en MariaDB y puede dar falsos positivos si la escritura no persiste. En Staging se delega a `stagingBusinessStore.create`, cuyo contrato requiere revisión separada. Las pruebas nuevas implementan un servidor simulado en vez de ejecutar las rutas reales, por lo que no demuestran ausencia de regresiones ni persistencia real.

Hallazgos para revisar: `server.ts` ~7376 y ~7599 calcula IDs numéricos mediante máximo del caché fuera de Staging (riesgo de concurrencia); `server.ts` ~7015 marca `isLiveWebDiscovery: true` al mapear resultados IA sin demostrar por candidato la verificación de la fuente; se conservan textos predeterminados de horarios, entrega y pagos que podrían presentarse como datos reales. Conciliar los cambios compartidos en `writesReady` y `src/services/api.ts` con PR #54 mediante comparación real de diffs y pruebas conjuntas; la mera afirmación de GAS de ortogonalidad no basta. Requerir correcciones, pruebas sobre handlers reales y E2E de MariaDB Staging aislado antes de integrar.

**Estado:** auditada parcialmente en código, bloqueada por defectos verificables, sin merge ni despliegue de PR #55. Producción no modificada.

## Segunda auditoría PR #55 — 2026-11-06

GAS entregó commit correctivo `7ff6008dad74a5c97c58501d44f9cb112be56405`, un commit sobre `ddd034496317347a9355e1b5cabceb9d66e55ab6`; GitHub Actions media regression gate run `42260234294` SUCCESS. Revisión directa del código encontró bloqueos nuevos: (1) `server.ts` ~7324 contiene SQL `WHERE id REGEXP '^[0-9]+$` sin comilla de cierre dentro del texto SQL; la excepción se descarta silenciosamente en ~7331, haciendo fallback a máximo de caché y rompiendo la garantía de IDs seguros; (2) `tests/radar-business-approval.test.mjs` crea `createRadarHarness` con una instancia Express separada y rutas/mocks propios, no ejecuta los handlers reales importados de `server.ts`, por lo que el informe '14/14 Handler HTTP' no valida la implementación real. (3) Mutex en memoria no sincroniza múltiples procesos/instancias ni escritores externos; exige garantía de asignación a nivel MariaDB. (4) regex de URL en ~7001 valida formato aparente, no existencia/fiabilidad de fuente ni grounding efectivo. La lectura posterior de lote sí aparece en ~7731, pero falta validación real y comprobación del contrato del pool. Dictamen: NO INTEGRAR, NO DESPLEGAR; solicitar correcciones y pruebas con rutas reales y MariaDB Staging aislado. Estado registrado sin modificaciones a producción.
