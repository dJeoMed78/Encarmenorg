# NIA — Operación directa del portal de control

## Autorización del propietario, 13-nov-2026

El propietario pidió que una nueva NIA pueda actualizar y modificar directamente https://staging.encarmen.org/control para mostrar avances visuales. Autorizó agregar, por tarea, tres acciones sugeridas y una cuarta acción escrita por él, y proporcionar a NIA los permisos y detalles de modificación.

Alcance autorizado: mantener el código del portal; crear ramas y PR; integrar cambios revisados y con CI satisfactorio a ia-desarrollo; publicar y probar Staging con respaldo y reversión; crear/actualizar tareas, evidencias, fallas, decisiones, instrucciones atendidas y checkpoints. No repetir solicitudes de permiso para estas operaciones dentro de este alcance. Main, encarmen.org, credenciales, datos productivos y migraciones destructivas siguen protegidos. Esta autorización no equivale a nuevos secretos o permisos de infraestructura: se utiliza el acceso GitHub ya conectado y el secreto SSH existente, nunca su valor en prompts o bitácoras.

## Interfaz del propietario

En cada expediente: «Tus instrucciones para NIA» → «Indicar siguiente acción». Tres sugerencias contextuales + opción 4 con texto libre. El servidor resuelve el texto elegido y guarda actor, hora y estado pendiente. Una instrucción guardada constituye una orden operativa del propietario para NIA: debe ser leída, analizada, puesta en ejecución y llevada hasta implementación, pruebas, despliegue autorizado y verificación, cuando corresponda. La selección no ejecuta por sí sola código ni despliegues en el navegador: activa la obligación de atención en la siguiente sesión de NIA o en una automatización explícitamente configurada. No se debe confundir registro con ejecución. Vista global «Tus instrucciones». NIA registra en_curso, bloqueada o realizada, con detalle y enlace probatorio para realizada. Una tarea con instrucciones no atendidas no puede cerrarse.

El portal relee los avances cada 30 segundos mientras está visible, sin un formulario abierto y con actividad reciente; también dispone de Recargar. No hay vigilancia autónoma de conversaciones ni ejecución de órdenes mientras NIA está inactiva.

## Código y persistencia

Repositorio: dJeoMed78/Encarmenorg. Integración: ia-desarrollo.
- public/control/index.html, app.js, style.css: interfaz.
- src/server/controlBoard.mjs: reglas, autorización, bitácora y cierre.
- src/server/controlSeed.mjs: antecedentes iniciales; no editar sin migración de historial.
- tests/control-board.test.mjs, tests/control-instructions.test.mjs: 19 pruebas.
- .github/workflows/enc-control-board-ci.yml: validación.
- .github/workflows/enc-radars-041-043-staging-deploy.yml: despliegue reversible autorizado.
- .github/workflows/enc-control-operations.yml: canal de operación de NIA.
- ops/control/run-request.mjs: intérprete de solicitudes permitidas, no shell arbitrario.

La API autenticada usa GET /api/control/state y POST /api/control/events, con X-Encarmen-Admin-Token emitido por la autenticación administrativa existente. No insertar tokens en código, prompt ni archivo de solicitud. Bitácora privada persistente: ~/domains/staging.encarmen.org/hbuilds/control-data/journal.json. No editarla directamente, borrarla o sustituirla. API y canal NIA comparten validación, lock, control de revisión y relectura.

## Canal NIA sin pedir contraseña al propietario

Rama de operaciones: work/enc-control-ops. Actualizar únicamente ops/control/request.json en esa rama mediante el conector GitHub, conservando el SHA del archivo como condición de escritura. Cada cambio dispara «ENC control authenticated Staging operations». No modificar ia-desarrollo ni desplegar por cada avance narrativo.

Primero leer:
```json
{"requestId":"enc-control-AAAA-MM-DD-lectura-IDUNICO","op":"read"}
```
Consultar la ejecución GitHub Actions del commit publicado (evento push), su job y logs. El resultado debe concluir SUCCESS y contener ENC_CONTROL_REQUEST=VERIFIED. La línea ENC_CONTROL_STATE_JSON contiene revision, tareas, instrucciones, evidencias y últimos 30 eventos. No interpretar solamente el push como éxito.

Después actualizar con la revisión exacta leída:
```json
{"requestId":"enc-control-AAAA-MM-DD-checkpoint-IDUNICO","op":"event","expectedRevision":0,"type":"checkpoint","taskId":"ID_REAL_DE_TAREA","data":{"details":"Avance comprobado, evidencia, bloqueo y siguiente paso."}}
```
El 0 es ejemplo: reemplazar por revision REAL. requestId debe ser único y cumplir ^enc-control-[a-zA-Z0-9_-]{8,90}$. Reintentar el mismo requestId no duplica eventos. Ante conflicto, leer de nuevo y reformular, no sobrescribir a ciegas.

Para atender una instrucción del propietario:
```json
{"requestId":"enc-control-AAAA-MM-DD-avance-IDUNICO","op":"event","expectedRevision":0,"type":"instruction_result","taskId":"ID_REAL_DE_TAREA","data":{"instructionId":"ID_REAL_DE_INSTRUCCION","status":"en_curso","details":"Acción iniciada y siguiente comprobación."}}
```
Estados permitidos: en_curso, bloqueada, realizada. Realizada exige url HTTPS con evidencia. No inventar instrucciones del propietario; el canal NIA no permite crear eventos instruction.

Eventos permitidos: create, meta, checkpoint, decision, evidence, failure, resolve, close, reopen, instruction_result. Ver contrato en controlBoard.mjs antes de construir payloads. Para actualizar texto visual de una tarea, meta requiere todos los campos owner, branch, priority, sha, target, status, notes; conservar valores vigentes no cambiados. Cualquier evidencia positiva exige lectura real y SHA/entorno, no solo un enlace.

El canal valida huella SSH, configuración Staging aislada y coincidencia exacta entre HEAD ia-desarrollo y release desplegada antes de tocar la bitácora. Si falla por CONTROL_DEPLOYED_SOURCE_MISMATCH, terminar/verificar despliegue o diagnosticar la divergencia; no retirar la guardia. No imprime ni copia secretos. No modifica negocios, bases de datos, symlinks de releases ni producción.

## Regla obligatoria de ejecución de instrucciones del propietario (13-nov-2026)

1. Toda instrucción persistida con estado `pendiente` o `bloqueada` es una **orden de trabajo prioritaria**, no una nota informativa. NIA debe consultarla al iniciar o continuar una sesión y atenderla antes de tareas no prioritarias, salvo riesgo superior de seguridad o dependencia explícita.
2. Sin pedir una segunda autorización para actividades ya comprendidas en el alcance vigente, NIA analiza la tarea, comprueba rama, SHA, entorno, dependencias, riesgos, pruebas y criterios de aceptación; registra inmediatamente `en_curso` con el ID real de instrucción y evidencia del inicio.
3. Ejecuta las acciones autorizadas y realiza la implementación completa: rama, cambios, pruebas, PR, CI, integración autorizada, despliegue reversible a Staging y validación de runtime, cuando aplique. Si la instrucción exige acciones fuera del alcance (producción, secretos, operaciones destructivas, gastos, cambio de alcance), se registra `bloqueada` con motivo concreto y se solicita únicamente la autorización indispensable.
4. Tras cada avance significativo, actualizar el expediente mediante `instruction_result`, `checkpoint` y evidencias, con `expectedRevision` real; comprobar SUCCESS, `ENC_CONTROL_REQUEST=VERIFIED` y lectura posterior. No declarar `realizada` sin evidencia HTTPS, pruebas de aceptación y resultados reales. Si hay fallo, corregir y volver a probar; no cerrar anticipadamente.
5. La instrucción permanece en curso hasta su conclusión verificable o bloqueo documentado. No iniciar trabajo no relacionado si hay instrucciones ejecutables pendientes sin atender.
6. **Límite operativo real:** guardar una instrucción en la web no despierta ni ejecuta automáticamente una conversación de ChatGPT. El cumplimiento autónomo entre sesiones requiere una automatización/agente con disparador y credenciales configurados explícitamente. En sesiones activas NIA debe operar sin esperar que el propietario repita la orden. Nunca afirmar ejecución en segundo plano si no hay un proceso activo comprobado.

## Rutina de sesión

1. Recuperar memoria activa de Drive según protocolo NIA y documentos oficiales de coordinación. Crear/reutilizar memoria propia; nunca sobrescribir historia ajena.
2. Leer este documento y estado REAL mediante el canal; revisar instrucciones pendientes y bloqueadas del propietario antes de decidir trabajo.
3. Documentar acción iniciada; ejecutar dentro del alcance autorizado; registrar evidencia y resultado.
4. Actualizar visualmente el portal tras cada avance significativo; conservar estado pendiente/bloqueado cuando corresponda.
5. Verificar respuesta y lectura posterior. Guardar checkpoint útil en memoria narrativa propia de Drive y evidencia oficial en GitHub. El portal complementa ambas fuentes.
6. Para código: rama aislada desde ia-desarrollo vigente, pruebas/CI, PR a ia-desarrollo, merge y despliegue Staging. Verificar HTTP, SHA y funcionamiento. No dar por terminado por una prueba local o un CI aislado.

## Límites de cierre

Conservar los cinco hitos separados; misma versión SHA y entorno, sin fallas abiertas ni instrucciones pendientes. La atestación manual no es una consulta automática a GitHub. No marcar una validación del propietario como realizada por NIA. Producción no se modifica ni se certifica desde este canal.
