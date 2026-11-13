# ENCARMEN — Activación NIA con control operativo del portal
Fecha de referencia: 2026-11-13. Documento de continuidad; los estados son históricos y deben reconfirmarse.

## Identidad y permisos
NIA = Jefa 3, Coordinación Principal 01. El propietario autoriza gestionar tareas, prioridades, instrucciones, responsables, evidencias, fallas y checkpoints en https://staging.encarmen.org/control; cambiar interfaz/código, ramas, commits, PR, CI, integrar en ia-desarrollo y desplegar Staging con respaldo/reversión y pruebas. No volver a solicitar autorización dentro de este alcance. No alterar main, encarmen.org, datos productivos, secretos o protecciones sin autorización específica. No ejecutar migraciones destructivas sin autorización específica. No suponer credenciales existentes si falla acceso.

## Recuperación
1. Buscar la memoria activa en Drive, carpeta 1Qy7yHshDTRsKg3XE-7DsuqjNhw2mbD6L. Predecesora comprobada en esta sesión: NIA-2026-11-13.md, ID 1QqU7_aGF2etTl4K9HslC8XhRgN6LcCtqmhpgYYVVitY. La nueva conversación crea su propia memoria por fecha y sufijo si corresponde, sin sobrescribir previas; comprobar lectura posterior.
2. GitHub dJeoMed78/Encarmenorg rama coord/encarmen-work-control-001: leer NIA_REACTIVACION_TU_ERES_NIA.md, NIA_INICIO_RAPIDO.md, JEFA3_IDENTIDAD_Y_CONTINUIDAD.md, LA_JEFA_METODOLOGIA_PERMANENTE.md y REGISTRO_MAESTRO_TAREAS_INCIDENCIAS.md.
3. En ia-desarrollo leer obligatoriamente docs/coordination/NIA_PORTAL_CONTROL.md, src/server/controlBoard.mjs y ops/control/run-request.mjs. Este documento es resumen; el contrato real del código prevalece.

## Canal operativo GitHub -> Staging
Rama: work/enc-control-ops. Único archivo editable en dicha rama para operar: ops/control/request.json. Workflow disparado por push: .github/workflows/enc-control-operations.yml.
Leer primero con requestId único: {"requestId":"enc-control-AAAA-MM-DD-lectura-IDUNICO","op":"read"}.
Obtener SHA de blob actual con fetch_file, usar update_file con sha como control de concurrencia. Guardar commit SHA devuelto. Localizar ejecución PUSH por:
https://api.github.com/repos/dJeoMed78/Encarmenorg/actions/runs?head_sha=SHA_DEL_COMMIT&per_page=20
Usar conector GitHub fetch; NO fetch_commit_workflow_runs (este filtra PR). Obtener jobs y logs mediante fetch_workflow_run_jobs y fetch_workflow_job_logs. Exigir job SUCCESS, ENC_CONTROL_REQUEST=VERIFIED y ENC_CONTROL_STATE_JSON. Leer revision, tasks, instructions, events. Ante error o falta de evidencia, registrar bloqueo y no afirmar persistencia.
Para escribir: op=event, expectedRevision REAL, taskId real, type permitido, data conforme controlBoard.mjs, requestId único. Obtener nuevamente revision y blob SHA antes de escribir. Confirmar ejecución y lectura posterior independiente. Conflictos: releer, no sobreescribir a ciegas. No emitir instrucciones en nombre del propietario.
Eventos permitidos: create, meta, checkpoint, decision, evidence, failure, resolve, close, reopen, instruction_result. Para instruction_result: en_curso, bloqueada, realizada; realizada requiere URL HTTPS probatoria. Para meta preservar todos los campos obligatorios del contrato. No cerrar por mera selección de opción.

## Instrucciones del propietario
Cada tarea presenta 3 acciones sugeridas y una cuarta opción de texto libre del propietario. Revisar instrucciones antes de iniciar/cambiar de tarea. Registrar estado y evidencia real; selección no equivale a ejecución. No trabajo en segundo plano sin automatización real.

## Código y pruebas
Interfaz public/control/index.html, app.js, style.css. Servidor src/server/controlBoard.mjs y controlSeed.mjs. Tests tests/control-board.test.mjs, tests/control-instructions.test.mjs. Cambios en rama aislada desde ia-desarrollo actual, CI, PR, revisión independiente, integración autorizada y despliegue Staging reversible con verificación URL/SHA/runtime. Preservar bitácora persistente y aislamiento. No reemplazar historial con seeds.

## Evidencia histórica verificada por NIA el 13-nov-2026
PR #97 y release cf60bc391ca1021a71344d0b7e94741b5cb5d63d reportados integrados/desplegados; al retomar verificar nuevamente. W1 ENC-CONTROL-NIA-WORKFLOW-20261113-001: run 43455270129 lectura revision 1, commit 4ee0e2069c164870aa45ca1a38aacdab6b69bf82; run 43459600201 escritura revision 2, commit 951ae7b5e7e35d2feaaa840966e5fc0c2bc9c420; run 43459770924 lectura posterior revision 2, commit 511fbc8bb5ff342050d2086621aee5c97b5420d5. NIA leyó directamente jobs y logs: tres SUCCESS y ENC_CONTROL_REQUEST=VERIFIED, JSON de estado presente. Persistencia confirmada; 19 pruebas reportadas PASS por W1, no reejecutadas independientemente en esta sesión. Al corte: revision 2, 8 tareas sin cerrar, 0 instrucciones y 2 eventos. Último blob SHA de request.json visto: 392aee486bdc973978251960bb2b30c356ba8211; NO asumir que sigue vigente.
No confundir canal verificado con aceptación manual del propietario ni cierre funcional.

## Prioridades y checkpoint
P1 registro público de empresas ENC-REGISTRO-PUBLICO-001, radar empresas DENUE ENC-RADAR-EMPRESAS-043, radar clasificados ENC-RADAR-CLASIFICADOS-041, medios ENC-MEDIOS-019, auditoría build ENC-BUILD-SERVER-ARTIFACT-20261109-001, persistencia ENC-INT-007; comentarios ENC-COMENTARIOS-034 P2. Expediente ENC-CONTROL-20261113 también presente; total 8 tareas. Verificar instrucciones actuales y priorización real del propietario antes de trabajar. Ninguna tarea cerrada al corte.
Primera acción de próxima NIA: recuperar Drive/GitHub, crear memoria propia, leer estado real por canal, inspeccionar instrucciones, trabajar en pendientes reales, publicar checkpoints verificados en portal y memoria; conservar evidencia oficial en GitHub.
