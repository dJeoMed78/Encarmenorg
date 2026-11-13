# ENC-CONTROL-20261113 — Control de entregas en Staging

Solicitud del propietario: tablero en https://staging.encarmen.org/control. Autorizada su integración a ia-desarrollo y publicación en Staging; main y producción excluidos.

## Implementación

Interfaz es-MX, tablero/expediente/cierre/bitácora, filtros responsable/prioridad/rama/entorno/fecha, evidencias HTTPS (incluidas capturas enlazadas), fallas y soluciones, decisiones, checkpoints, nuevas tareas y exportación JSON. No consulta GitHub ni despliega automáticamente. Hitos históricos se separan por SHA y entorno.

API /api/control usa la identidad administrativa existente: requiere admin:manage y origen de Staging. Se monta antes del gate general con guardia propia, sin habilitar escrituras empresariales o SQL. Entorno aislado comprobado por stagingDynamicIdentity y snapshot privado. Producción no puede usar la API.

La bitácora se guarda en ~/domains/staging.encarmen.org/hbuilds/control-data/journal.json (directorio 0700, archivo 0600), fuera de public/dist y de las releases. Registro de eventos con actor servidor, hora servidor, hash encadenado, revisión optimista, lock entre procesos y escritura atómica/fsync/relectura. No se guardan contraseñas ni tokens. Sesión en sessionStorage; exportación no incluye credenciales.

Un bloqueo .write-lock tras caída abrupta falla cerrado. Debe comprobarse ausencia de proceso escritor antes de retirar el bloqueo, conservando journal.json. No se recupera sobreescribiendo datos. Mantener seedTasks estable: cambiar semillas requiere migración de versión explícita para preservar replay. La copia exportada es respaldo de consulta, no importación automática de evidencia confiable.

## Cierre

Requiere SHA completo objetivo, cinco evidencias revisadas PASS del mismo SHA: implementación publicada GitHub, integración ia-desarrollo (enlace PR/commit del repositorio), despliegue, funcionamiento y validación manual del entorno objetivo. Ninguna falla abierta ni bloqueo. Producción excluida del cierre. Trabajo local, evidencia sin revisar, URL sola, referencia histórica y otros SHA no completan hitos. El administrador atestigua haber revisado fuentes reales; no se presenta esa atestación como consulta automática a las fuentes. Cambios de versión/evidencia/falla reabren el expediente.

## Datos iniciales comprobados 13-nov-2026

GitHub API: PR #25, #54, #67, #84, #94 merged a ia-desarrollo. PR #93 abierta. PR #68 permanece abierta, distinta de #94. No se infiere despliegue o E2E de un merge.
Registro maestro (rama coord/encarmen-work-control-001): cierre histórico del build server el 12-nov, Actions 43277110058, SHA 830602beb0a0b59f009458c5bce8f0a22f46e46a. Se conserva como antecedente, sin extrapolar a una release nueva. No se declara ninguna tarea cerrada automáticamente al importar antecedentes.

## Validación

12 pruebas Node locales PASS: compuerta de cierre, SHA/entorno, producción protegida, evidencia no revisada, fechas y enlaces, reapertura por fallo, guardado/relectura tras reinicio, conflicto de revisiones, detección de corrupción, lock concurrente y autorización API. JavaScript syntax PASS. CI de Node22, tipos, build y despliegue se verifican por separado antes de declarar publicación. Las pruebas usan temporales, no crean evidencia ficticia en la bitácora real. Validación manual con cuenta real permanece separada.
