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
