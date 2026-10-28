# ENC-RADAR-RELIABILITY-002

## Inicio — 2026-10-28T11:08:18.889Z
Estado EN_PROGRESO. Rama work/enc-radar-reliability-002, base actual cad1222618c94f4eb3dabb589b6e58836191dcb7. Instrucción blob 8f08849510d17a31f4e104ba344f12f5826ea217. Comentarios cerró trabajo seguro en be987c9703329488a66b9f6367fb83cbd9c3cf7d con activación/moderación bloqueadas; sigue sin mezclar ramas.
Cambio concurrente: ia-desarrollo incorporó Glass por coordinación mientras se ejecutaba Comentarios; esta tarea nace del HEAD nuevo, sin rebase/merge de Work.
Revisión previa coord/radar-classifieds-fix-001: 3 commits propios/10 detrás de base nueva; modifica Classifieds, Events y eventsService.ts. Sus cambios esperan success/count, pero NO garantizan transacción ni autenticación; no se copiarán ni fusionarán. Se documentará PR posterior de servicio tras resolver persistencia.
Bloqueos backend confirmados por lectura: classifieds approve/batch captura y silencia error DB; businesses approve/multiple hace lo mismo y fabrica campos/llama legado WP; events publish/scan sin autorización fiable y silencia DB; dismiss negocio sin autorización y persistencia best-effort. eventsService retorna candidatos/publicación/scan de respaldo como success. Cambiar servidor/api/servicio está fuera de alcance.
Decisión segura: deshabilitar aprobaciones individuales/lotes y scan que publica; cero requests de mutación desde Radar. Mantener candidatos ante supuestos éxitos/respuestas parciales; rechazo solo sesión, sin localStorage ni endpoint destructivo. Lecturas de búsqueda con timeout/abort/validación y generaciones; events evita servicio con fallback ficticio y consulta endpoint de candidatos directamente. Ningún dato faltante será rellenado como verificado.
Solo archivos de escritura: AdminClassifiedsTab.tsx, AdminEventsTab.tsx, AdminAutoBusinessesModal.tsx, WORK_RESULTADOS, este progreso. No cambios de servicio/backend/auth/dependencias/Glass/calificaciones/comentarios/editor.

## Hito frontend — 2026-10-28T11:17:45.299Z
Tres componentes corregidos sobre HEAD cad1222618c94f4eb3dabb589b6e58836191dcb7. Publicación y scan mutativo bloqueados incluso invocando el handler tras manipular disabled. Consultas directas sin fallback local, timeout 15s, validación de esquema/URLs/IDs duplicados, busy ref y generación/abort para sesión obsoleta; 0 candidatos es respuesta válida, errores conservan lista. Ocultar clasificados/negocios solo sesión sin endpoint ni almacenamiento persistente. Adaptador de edición local elimina contactos/dirección/horarios/pago/entrega predeterminados y verified=true. Se eliminan promesas de persistencia del footer de negocios. No editar servidor/API/eventsService.
Pruebas: tsc PASS, Vite PASS (advertencia chunk>500kb), Chromium real 57 PASS con API interceptada: 400/401/403/409/429/500/503, parcial/vacía/duplicada/red, 0 resultados, doble clic, timeout, reintento, cambio de pestaña y ocultamiento local. Cero endpoints mutativos y cero errores JS. Falta cierre documental, paquete de 9 capturas y propuesta backend autorizada como documentación.

## ENC-RADAR-RELIABILITY-002 — frontend seguro y bloqueos (2026-10-28T11:20:19.886Z)
Estado: PROBADO_POR_WORK, PUBLICACIÓN RADAR BLOQUEADA por contrato backend no fiable.
Rama work/enc-radar-reliability-002; base cad1222618c94f4eb3dabb589b6e58836191dcb7.
Checkpoint dc8012662303d50aee9beb8aa6d1d4beedd11bd1; implementación 5ff67cbd1dd05a668574205f0f4ad62779969b0e.
Leídos CONTEXTO, WORK_INSTRUCCIONES, ENC-RADAR-COORD-001 y tarea 8f08849510d17a31f4e104ba344f12f5826ea217.
Trabajo previo coord/radar-classifieds-fix-001 revisado: AdminClassifiedsTab, AdminEventsTab y eventsService.ts (blob  de servicio disponible en esa rama). Espera API y elimina fallback ficticio del servicio, pero sigue confiando en success/count aunque servidor silencie DB y no autorice. No fue fusionado, copiado ni sobrescrito.

### Código y resultado
- Modificados exclusivamente AdminClassifiedsTab.tsx, AdminEventsTab.tsx, AdminAutoBusinessesModal.tsx, WORK_RESULTADOS y progreso de esta tarea.
- Aprobación individual/lote de clasificados y negocios, publicación de candidatos de eventos y scan automático que publica: deshabilitados con aviso visible. Handlers también bloqueados, sin invocar API incluso si se manipula disabled. NO se presenta persistencia ni éxito.
- Se conserva consulta/revisión de candidatos. Fetch directo en componentes evita helpers de servicio con fallback de candidatos/publicación ficticios. Timeout 15 segundos, controlador Abort, guardia inmediata de doble envío, generación para cerrar/cambiar de pestaña y validación de respuesta.
- Una respuesta debe tener success===true y array de candidatos; máximo 1000, IDs/título-nombre válidos, fuentes HTTP(S) si existen, sin IDs duplicados. Respuesta inválida/parcial, 4xx/5xx, error JSON/red o timeout conserva candidatos anteriores y muestra error/reintento. Array vacío válido muestra 0 candidatos.
- Fuentes originales y fechas recibidas permanecen sin modificación; no se proclaman verificadas. Los conteos mostrados son tamaños reales de las listas recibidas, no publicaciones ni resultados inventados de BD.
- Clasificados y negocios: ocultamiento solo en la sesión montada, declarado expresamente. Sin localStorage ni endpoint de rechazo. Reload de búsqueda en esa sesión conserva ocultamiento; nuevo montaje puede volver a mostrar candidatos.
- Negocios: edición de candidato se declara borrador local; no servidor. Adaptador deja vacíos contactos/dirección/colonia/código postal/horario/pagos/entrega ausentes en lugar de valores inventados; no marca verified=true. No se editó el editor.
- Eliminadas afirmaciones falsas de persistencia del footer de negocios; estados aria-live/status/alert para búsquedas y errores.
- Lectura de estado de Radar eventos usa respuesta HTTP real sin fallback del servicio; los contadores describen estado del proceso/caché, NO confirmación de MariaDB.
- Cambios de formato en estos tres TSX también aparecen en el diff; no se alteraron backend, API, eventsService, App, auth, comentarios/calificaciones, Glass ni dependencias.

### Bloqueos de backend confirmados por lectura, sin ejecutar rutas
- /api/classifieds/approve-candidate y batch-approve añaden caché/JSON y capturan errores DB, pudiendo responder success:true; sin autorización fiable.
- /api/businesses/approve-candidate y approve-multiple-candidates: guardado best-effort, campos de respaldo inventados y camino legado de WordPress; no se invocó.
- /api/events/publish-candidates y radar-scan: sin comprobación administrativa fiable y sin contrato que acredite commit durable; el servicio cliente actual también fabrica éxitos de respaldo.
- /api/admin/auto-candidates/dismiss: cambia memoria/archivo con DB best-effort, sin autorización suficiente; no se utiliza.
- Las rutas siguen existiendo y siguen siendo riesgos fuera de alcance. Deshabilitar UI NO protege el servidor contra clientes directos. CRUD manual de cartelera y otros consumidores de eventsService permanecen fuera de esta corrección.

### Pruebas ejecutadas
- tsc --noEmit -p radar-002/tsconfig.json: PASS.
- vite build directo a /tmp/enc-radar-validation/vite-dist: PASS, 1722 módulos; advertencia >500kb.
- node /tmp/enc-radar-validation/test-radar.cjs: 57 PASS en Chromium 153 / Playwright.
- Tres módulos: respuestas 400/401/403/409/429/500/503, parcial, vacía, IDs duplicados, fallo de red; candidatos anteriores conservados.
- Respuesta válida 0 resultados, latencia/doble clic (una sola consulta), timeout de 15s con reloj de navegador, reintento posterior y cambio de pestaña con respuesta tardía.
- Ocultamiento local sin almacenamiento/rechazo; publicación bloqueada incluso invocando handlers tras alterar disabled.
- Cero solicitudes a approve/publish/dismiss/radar-scan, cero errores JS, cero solicitudes externas.
- Primer harness detectó falta de aria-live en el resultado vacío de clasificados: corregido. Selectores ambiguos de dos botones existentes se ajustaron en el harness. La batería final completa pasó 57/57.
- El primer ajuste automático de JSX de disabled produjo error de sintaxis; corregido antes de publicar, TypeScript y build finales pasan.
- Harness SHA256 89be9f14cdf9d4dbf09f4f4c6b1173e0bb55063cf2b1f556fc043289e6e6042f.
- Datos/API sintéticos interceptados. No servidor completo, fuentes reales, scraping, WordPress, servicios pagos, SQL, BD ni Staging. Los casos de aprobación real/lote parcial con commit NO son aplicables: deliberadamente bloqueados; no se simula que estén implementados.

### Evidencia
9 PNG sintéticos: classifieds/events/businesses en desktop 1440x1050, mobile 390x844 y error.
https://chatgpt.com/library?file_id=libfile_15ae8a4dfd6881918ac064f62f284f99&account_id=personal
Inspeccionadas visualmente capturas de eventos móvil y negocios con error. Commit remoto de implementación leído de vuelta: contenido de los tres archivos coincide exactamente con la copia probada.

### Propuesta backend segura — DOCUMENTAL, NO IMPLEMENTADA
1. Autorización: reparar cambio de credenciales y sesión antes de habilitar mutaciones; sesión validada por servidor, permisos por acción, expiración/revocación, protección CSRF/origin según transporte y rate limit. Nunca isAdmin enviado por cliente ni header arbitrario.
2. Separar buscar candidatos de publicar. Buscar no debe escribir catálogo ni declarar publicación; responder jobId, estado (running/completed/failed), fuentes originales, fetchedAt, fecha de publicación verificable o null, localidad/evidencia y contadores cuya procedencia se conozca.
3. Validación de candidato: esquema estricto y límites de cuerpo/lote; datos faltantes permanecen null/vacíos. No inferir teléfono/WhatsApp, dirección, precios, horarios, fotografías o fechas. Source URL validada, fecha/localidad verificadas y duplicados por claves documentadas. Ninguna sincronización WordPress.
4. Persistencia única: MariaDB debe ser autoridad. No responder éxito si está inactiva, falta esquema o falla commit; no fallback JSON/caché como publicación. Caché solo después de commit; documentar degradación de lectura.
5. Idempotencia de aprobación: clave de operación + candidato + versión verificadas por servidor. Transacción y unicidad con clasificación explícita del conflicto; timeout se consulta por operationId antes de reintentar. Evitar ID por max(cache)+1 o Math.random como garantía de concurrencia.
6. Individual: respuesta solo tras commit con operationId, candidateId, publishedId, persisted:true y revisión/fecha de commit verificable. Esto es PROPUESTA de contrato; no campos implementados actualmente.
7. Lotes: resultados por candidateId (persisted/already_exists/failed/pending) y IDs de publicación, no solo count. Contadores deben cuadrar con resultados; atomicidad total o transacción por elemento decidida y documentada. Solo retirar elementos confirmados; conservar fallidos/ambiguos y consultar operación antes de repetir.
8. Rechazo: endpoint autenticado con motivo, alcance/retención e idempotencia; registro de rechazo y auditoría durable. No prometer “nunca volverá” por localStorage. Si requiere esquema nuevo, inventariar primero y presentar migración y reversión para autorización independiente, sin SQL en esta tarea.
9. Auditoría mínima: actor/operación/resultado/ID técnico, sin secretos ni payloads personales completos. No exponer SQL/stack. Taxonomía: 400 validación, 401/403 autorización, 409 duplicado/conflicto, 429 cuota, 503 DB/servicio indisponible, fallo ambiguo consultable.
10. Servicio frontend: coordinación puede abrir PR posterior para coord/radar-classifieds-fix-001, revisando únicamente los cambios de eventsService que eliminan fallbacks, con tests. No aplicar sus handlers de aprobación que vuelven a habilitar escrituras antes de corregir backend. Resolver contra HEAD nuevo; no merge ciego. Después consolidar transporte duplicado temporalmente en componentes bajo autorización de archivos más amplia.
11. Plan de pruebas autorizado por separado: fixtures aislados en DB de pruebas expresamente autorizada, fallo antes/después de commit, pérdida de respuesta, dos workers/doble clic, idempotencia, duplicados, lote parcial, DB inaccesible, reinicio, permisos/CSRF/abuso, lectura desde segundo cliente y verificación de tablas no relacionadas. Nada de esto fue ejecutado contra una BD real.
12. Habilitación posterior: solo tras revisión de auth, esquema, transacciones/operaciones y pruebas reales documentadas; retirar bloqueo frontend en tarea posterior específica. Rollback: restaurar bloqueos y revertir cambios revisados; no borrar publicaciones como forma de rollback automático.

### Concurrencia y dictamen
ia-desarrollo pasó de 1455e568... a cad1222618c94f4eb3dabb589b6e58836191dcb7 por integración de PR #4 realizada por coordinación, verificada después; Work no fusionó ramas. Radar nació del nuevo HEAD y Comentarios conserva su base anterior explícita. No rebase, force ni PR de Work.
APTO PARA REVISIÓN DEL FRONTEND PREVENTIVO. NO APTO PARA REHABILITAR PUBLICACIÓN RADAR, RECHAZO PERSISTENTE O SCAN MUTATIVO hasta resolver backend. Sin integración/despliegue. Esperando coordinación.

## Revisión secuencial vigente — 2026-10-28T11:58:19.859Z
Estado PROBADO LOCALMENTE (revalidación), sin nuevas funciones duplicadas.
HEAD revisado 1ae63604fdc4bddc279cb7fca09e83c6e181eb98; base vigente ia-desarrollo cad1222618c94f4eb3dabb589b6e58836191dcb7. Rama previa coord/radar-classifieds-fix-001 ya revisada; no copiada, cherry-pick ni merge.
server.ts vigente conserva blob 7968e182b1480f4ebfe48135b7e6b5b26f77ce05: mismos fallos de persistencia/autorización documentados. La nueva contención de ENC-ADMIN-AUTH-SECURITY-001 está solo en work/enc-admin-auth-security-001 (48bbba2016b8a66b06de5a5139474bcb73524358), con proveedor de credenciales AUSENTE/login503 y escrituras cerradas; no se ha integrado ni acredita persistencia. No habilita reactivar Radar.
Se repitió node /tmp/enc-radar-validation/test-radar.cjs: 57 PASS en Chromium/API simulada; errores 400/401/403/409/429/500/503, timeout/reintento, vacío/parcial/duplicado, cambio de pestaña, ocultamiento sesión y guardias ante invocación forzada. Cero endpoints mutativos y cero errores JS. No pruebas DB, SQL, fuentes reales ni persistencia. No cambios de código justificados: trabajo frontend autorizado ya completado; pendientes requieren backend/servicios fuera de la lista cerrada.
Se conserva propuesta de contrato/idempotencia/lotes/rechazo/auditoría ya entregada. Para recuperar operaciones: autorización de tareas backend + credenciales seguras + pruebas de commit/persistencia, revisión y posterior integración por coordinación. Los botones siguen deshabilitados honestamente.
Solo se añaden este checkpoint y resultados; no se modifican servidor/servicios/frontend terminado. APTO para revisar frontend preventivo; NO APTO para habilitar publicación/rechazo persistente/scan mutativo. Continúa Comentarios sin nueva espera.
