# ENC-DATA-INTEGRITY-CLOSURE-003

W1. Fecha2026-10-29, America/Mexico_City. Estado IMPLEMENTADO Y PROBADO LOCALMENTE; pendiente revisión independiente. No integrado/desplegado.

## Base y antiduplicidades

Base e60582e971f4f8cb56ea56191d33d91824f3fc5e, work/enc-consolidation-fixes-002 verificada. Rama work/enc-data-integrity-closure-003 creada durante el inicio de esta misma tarea; tras la ampliación adjunta se reutilizó sin recrearla ni sobrescribir historial. HEAD seguía en base antes del checkpoint.

Consultados desde coordinación: metodología permanente, registro maestro, PENDIENTE_W1_ENC_DATA_INTEGRITY_CLOSURE_003, revisiones de fixes002 y seguridadRadar, contexto e instrucciones. Desde candidata: WORK_RESULTADOS acumulativo, informes H01/H02-H04 y ENC-F008-R3. Los registros que decían pendiente por cuota son antecedentes; esta orden autoriza la continuación efectiva.

Recuperación histórica174 negocios por base,206/207 Staging y visualización de producción: reportada/documentada por Coordinación y propietario, NO repetida ni verificada mediante acceso a bases en esta tarea. No restauración, importación, SQL masivo ni consultas a Hostinger.

## Diagnóstico diferencial y cambios

1. fetchReports() mantenía fallback business_reports local. Ahora devuelve unión explícita: source=server/status=ready con total validado, o source=unavailable/status=error con total=null, lista vacía y mensaje. HTTP inválido, JSON inválido, forma incoherente o red no devuelven históricos. No lee/escribe/elimina localStorage; históricos permanecen intactos y no se muestran. source=server confirma origen HTTP, NO persistencia SQL durable: GET backend sigue usando reportsCache.
2. WordPressSyncModal es el único consumidor real en src. Carga limpia lista/contadores previos, muestra consulta/error y solo muestra bandeja vacía tras lectura remota válida. Control de versión evita que una respuesta antigua reponga lista tras error reciente; cierre/logout invalidan estado y peticiones lógicas. No se muestran badges derivados de históricos. Se sustituye texto fijo MariaDB OK por estado administrativo honesto; no se rediseña el panel.
3. Brecha nueva de contactos confirmada: adminUpdateBusiness aceptaba success truthy, respuesta parcial solo con ID o contactos distintos de los solicitados. Puede comunicar éxito y dejar datos incompletos en la ficha. Ahora exige success===true, ID correcto, presencia explícita de ambos canales y readback concordante con contactos editados/borrado explícito. Reutiliza prepareContactPatch y contactsMatchReadback existentes; no duplica normalización ni autorización. El true usado para construir expectativa en cliente NO autoriza nada: backend y sesión siguen siendo autoridad. Vacíos/null heredados continúan no destructivos; omisión no agrega campos al PATCH. Respuesta parcial se rechaza, no se rellena con contactos históricos.

Pruebas antes de corregir: dos grupos API FAIL (fallback local sin estado y edición aceptada indebidamente); después pasan. No se cambia backend, datos SQL, edición pública ni mecanismos seguros de envío H04.

## Defensas correctas conservadas

- businessFromRow prioriza columnasSQL frente a raw_data.
- dbSaveBusiness conserva omitidos/vacíos salvo clearContacts autorizado.
- stagingBusinessStore hace UPDATE parcial sobre fila fresca y mantiene campos no editados; clear explícito tiene validación y autorización servidor.
- Lecturas estrictas y caché fresca, sin fallback de contactos de semilla.
- Importación/sincronizaciónWooCommerce/sync-catalog retiradas410, sin reactivación.
- Canales y enlaces MX independientes, sin números ajenos.
- H02 invalida GET antiguos y evita guardar A sobre B; H03 mantiene idempotencia y resultado incierto; H04 no convierte fallos de envío en éxitos.
Estas defensas se vuelven a probar por regresión del nuevo cliente, no se reprograman ni se restaura información real.

## Compatibilidad Jefa3, solo inspección

Comparados los diffs completos desde base a79757de8cfb07317668553c02a37502de4b64366 y aa5260cf16a08539e04f4225056e152472302c57. No se copian commits ni cambios.
- Upload/duplicados/mutaciones de reportes: comparte api.ts y WordPressSyncModal, pero afecta funciones distintas. La integración futura debe conciliar esos archivos preservando el contrato source/status de fetchReports y el manejo del consumidor, sin sustituirlos completos. No se ejecutaron suites de esa rama ni se atribuye validación propia.
- Persistencia de reportes: cambios server.ts/mariadb y nuevas pruebas no presentes aquí, sin colisión directa de archivos funcionales. GET conserva reportsCache, por tanto esta entrega NO acredita lectura durable de MariaDB. La validación de esa implementación sigue separada.
- updateReportStatus/deleteReport y backend best-effort de la base no se arreglan aquí para no duplicar trabajo. Mantener políticas administrativas cerradas.

## Checkpoint ejecutado

147 PASS /0 FAIL /0 skipped en batería conjunta, incluidos5 tests nuevos (3 API y2 panel/control de respuestas), H01-H04, contactosR3, registro público, escritura controlada, aislamiento y respaldos. Hay suites importadas/cobertura compartida, no147 escenarios únicos.
TypeScript PASS y Vite PASS; detalles de comandos y cierre se añaden tras publicar el checkpoint. Sin SQL real ni servidor completo. Estado para revisión, no aprobación propia.
