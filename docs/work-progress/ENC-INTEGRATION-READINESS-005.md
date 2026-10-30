# ENC-INTEGRATION-READINESS-005
Fecha: 2026-10-29 America/Mexico_City. W1. Validación local, sin aprobación propia.
## Dictamen
B — LISTA CON OBSERVACIONES para revisión de Coordinación. Integración condicionada a comprobar/desactivar mediante operador autorizado cualquier despliegue externo ligado a ia-desarrollo. No autorizar despliegue por esta conclusión.
## Referencias comprobadas
Destino ia-desarrollo: 0d231cb2779b7a14d8d336fc2f4de3782663c738.
Origen coord/enc-c4-final-001: b0677916c9f80543055575e7b79cfe57f2650bdc.
PR https://github.com/dJeoMed78/Encarmenorg/pull/7 abierto, draft true, merged false, auto_merge null, mergeable true, mergeable_state clean. 27 ahead/0 behind, 88 archivos. Comparación por SHA confirma ascendencia: sin commits exclusivos del destino, resultado de integración esperado igual al árbol candidato. No se efectuó merge local en repositorio Git: workspace temporal de archivos, sin historial Git. No se publicó merge.
## Procedencia
Fuentes src/, pruebas existentes, server.ts, server.js, api/server.bundle.js y package.json contrastados mediante hashes de objetos Git con árbol remoto final: cero diferencias. Dependencias locales reutilizadas, no instalación limpia. Se recuperaron los tres archivos cambiados por Coordinación sobre R1, sin reimplementar. Documentación oficial consultada en rama de coordinación; informes C4/R1/final consultados en candidata.
## Matriz
Todos los módulos siguientes están incluidos en PR7, implementados y probados localmente con límites indicados; pendientes de integración. Ninguno integrado/desplegado/validado por propietario en esta tarea.
|Módulo/tarea|Cambio existente / referencia|Prueba actual|Riesgo / trabajo nuevo|
|---|---|---|---|
|Contactos R3/F009|734bfbd4: SQL prioritario, preservación y filtros|PASS, adaptadores SQL/HTTP/React|Sin restauración nueva; comprobar operación real después de autorización|
|Escritura Staging|4dcb1afe / 0e2488f5: permisos y aislamiento|PASS simulados|Aislamiento infraestructura real no probado; no habilitar flags|
|Registro público|1572a1dd /18487483: POST directo, idempotencia, confirmación|PASS HTTP/API/React|MariaDB real no probada; no reconstruir|
|Seguridad consolidada/H01|4a2ad4cd /809dc7c0: sesión servidor, permisos, método+ruta, reservas|PASS regresiones|No reimplementar; conservar restricciones|
|H02-H04|e60582e9: vigencia GET, registro incierto, reportes honestos|PASS|No nuevo desarrollo|
|Integridad/reportes|74e3300f /b27d769a: históricos separados, lectura SQL y acuses|PASS SQL simulado/HTTP/React|Durabilidad real pendiente; contratos no equivalen a transacción distribuida|
|Uploads/duplicados|b27d769a: sin éxito dataURI y errores explícitos|PASS salvo fixture antiguo de promociones|No habilitar upload público|
|Glass/F007A|b27d769a: orden móvil, contactos/calificaciones|PASS DOM/CSS|Validación visual real y aceptación propietario pendientes|
|Promociones R1/final|797fb5e9 /d30ad5de /93e0ef83: generaciones, históricos, recuperación, doble submit|15/15 React/jsdom PASS|Fixture legado desactualizado; backend best-effort preexistente sin garantía SQL|
## Pruebas NUEVAS ejecutadas
Suite completa: 191 tests, 190 PASS, 1 FAIL, 0 SKIP. No se usa 188 histórico.
Comando:
```sh
node --import tsx --test tests/staging-candidate-closure-004*.test.mjs tests/data-integrity-closure-003-*.test.mjs tests/consolidation-fixes-002-*.test.mjs tests/security-radar-001.test.mjs tests/public-registration*.test.mjs tests/consolidation-001.test.mjs tests/contacts-r3.test.mjs tests/staging-write-001.test.mjs tests/staging-isolation-proof.test.mjs tests/security-containment-003.test.mjs tests/backup-security-002.test.cjs tests/coord-api-honest-results-001.test.mjs tests/coord-report-persistence-001.test.mjs tests/enc-f007a-mobile-order-001.test.mjs tests/public-detail-ux-001.test.mjs
node --import tsx --test tests/staging-candidate-closure-004-r1.test.mjs
npm run lint
node_modules/.bin/vite build --outDir /tmp/readiness005-build
node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/readiness005-server.mjs
cmp server.js /tmp/readiness005-server.mjs
cmp server.js api/server.bundle.js
```
Suite R1 separada:15 PASS/0 FAIL/0 SKIP; incluida en191, no sumar como escenarios únicos.
TypeScript PASS. Vite PASS; advertencia chunk>500kB. Esbuild PASS y ambas comparaciones byte a byte PASS.
### Fallo exacto
tests/staging-candidate-closure-004.test.mjs:13-14, caso consumidor promociones: ReferenceError confirmedImage is not defined en handlePromoImageUpload extraído mediante vm. El fixture no suministra el ref añadido por Coordinación. Componente real sí lo declara; sus pruebas montadas pasan. El título/expectativa antigua de bloquear tras fallo tampoco refleja recuperación histórica autorizada. Corrección mínima pendiente: actualizar contexto y expectativa del fixture al contrato actual, manteniendo aserción de no persistir preview. NO modificado en esta tarea. Es defecto de arnés reproducible, no demostración de vulnerabilidad del componente; impide afirmar suite totalmente verde.
## Bundles y automatismos
Backend recompilado coincide con server.js/api/server.bundle.js. dist versionado NO fue actualizado por los tres commits finales, y los informes C4 ya documentan build temporal sin publicar dist: no usar ese frontend como entrega del SHA final; generar Vite directo del SHA final antes de desplegar.
.github/workflows/main_carmen.yml: push main y workflow_dispatch; npm install y npm run build. No trigger ia-desarrollo en workflow observado. build/prebuild modifica versión: evitado.
render.yaml/vercel.json permanecen como configuraciones históricas con npm run build; no prueban servicios activos. Plataforma vigente Hostinger según Coordinación. Hooks externos, Git auto-deploy y conexiones de proveedores NO VERIFICADOS. Ausencia de trigger Actions no demuestra ausencia de deploy externo.
## Plan concreto
1. Reconfirmar ambos SHA y PR antes de actuar; si cambian, revisar delta.
2. Coordinación verifica que merge/push ia-desarrollo no despliegue mediante hooks externos; mantener PR borrador hasta resolver puerta operativa.
3. Aceptar explícitamente observación del fixture o autorizar su corrección mínima y rerun. No reconstruir módulos.
4. Fusión convencional del PR existente solo con autorización de Coordinación, sin squash que pierda trazabilidad si se desea conservar los27 commits; verificar árbol resultante igual al origen. Archivos de alto riesgo: server.ts, mariadb.ts, políticas de escritura/autenticación, api.ts y bundles.
5. Reversión Git mediante revert del commit de merge con primer padre destino, en nueva revisión, sin force. No equivale a reversión de datos; sin despliegue no hay datos que restaurar. Revertir todo recuperaría defectos anteriores, por lo que preferir corrección acotada si procede.
6. Para Staging: autorización independiente, verificar base/cuenta/almacenamiento/secretos/recursos compartidos, mantener escrituras bloqueadas hasta comprobar aislamiento, build coherente frontend/backend y respaldo selectivo de archivos sustituidos. No usar dist viejo. Validar navegación, registro, contactos, reportes, promociones y F007A; SQL real solo autorizado y aislado.
## Límites y cierre
Sin SQL real, MariaDB, Hostinger, migraciones, navegador visual, cambios funcionales, edición de pruebas, main/ia-desarrollo, PR nuevo, merge ni deploy. Pruebas HTTP locales y SQL simulado no acreditan persistencia real. No cerrar incidencias ni marcar aceptación del propietario.
No se detectó regresión crítica nueva en las suites ejecutadas; no es garantía exhaustiva. Backend promociones best-effort y cargas huérfanas siguen como límites previos, no activados por esta revisión.
¿Podemos integrar PR7 mañana? SÍ CON CONDICIONES: confirmar ausencia de despliegue externo y resolver/aceptar expresamente el fallo de fixture. Compatibilidad sin divergencia y compilaciones correctas; no hay motivo para nueva consolidación.
## Commits incluidos
- 053b729bb82f852fa61063802a6a757947cf8b12 fix(ENC-F008-R2): preserve authoritative contacts and add ENC-F009 monitoring
- d826a17b6f4bd29eaac1ef350111910ab2dfe872 docs(ENC-F008-R2): record remote verification and release blockers
- d479c0414582919111b78ae93713a0d293f8833a docs(ENC-F008-R3): checkpoint recovered scope and R2 review
- 734bfbd4affe5712ab30d68f0a289a27c24b377c fix(ENC-F008-R3): harden readonly recovery and contact confirmations
- 924127e1b76919918c87ce9563d8b0de62a3d373 docs(ENC-F008-R3): close verified recovery and Hostinger handoff
- cd859d609fc01505db6bc1fe1ec001b8855fc985 docs(ENC-STAGING-WRITE-001): checkpoint write and authentication risks
- 4dcb1afec7dd4df60291b97441c45d2c3bda5213 feat(ENC-STAGING-WRITE-001): preserve controlled business writes and isolated tests
- 0e2488f5552bf7768a15711316b0de4d71b5d17e feat(ENC-STAGING-WRITE-001-RECOVERY): comprobacion de aislamiento real antes de escribir (permisos, esquemas, marca de entorno) + pruebas
- a6dc0a73ee394f1f5e07901814c2f123e7be01cc feat(ENC-PUBLIC-REGISTRATION-001): solicitudes publicas pending, aprobacion/rechazo administrativo reutilizando el almacen de Staging + pruebas
- 1572a1dd9cbe31c1870a026ac947d3bfcfc877c5 feat(ENC-PUBLIC-REGISTRATION-001-R1): registro publico directo en businesses sin aprobacion + parche verificable de server.ts + pruebas
- 1298256e88c021fe7e4d855933c8a421e90a1191 feat(registration): integrate public form with confirmed staging insert and directory reads
- 184874835d9d588e679b201b790643dfd923aff8 docs(registration): publish executed integration tests and persistence limitations
- a5fdd2f21a7a75613bf5e5a47e20b5c4ed338b1a docs(consolidation): checkpoint selective reconciliation and initial test gaps
- 4a2ad4cd56dba7929e975b7d99476f264ff8db9e feat(consolidation): reconcile public registration, scoped admin security, integrity and mobile Glass
- a16ca710449eda3c68f26016b91ce59d55b95b2b docs(consolidation): publish executed source/bundle tests, provenance and remaining validation limits
- cd9aaab19f471d474036a1efafaeb4481177f39c fix(security): enforce exact Radar POST authorization and reject reserved mutable IDs
- 809dc7c05a8a633fc21379ad2121345b3aae71c7 build(security): publish matching Radar bundles and executed HTTP regression results
- 4dba25fd0b10b14a168e43f042a2fd0f71d41858 fix: reconcile stale navigation and uncertain registration; require remote report confirmation
- e60582e971f4f8cb56ea56191d33d91824f3fc5e test: document 142 passing regressions and confirm H01 preservation after H02-H04 fixes
- fef79327578d60ae2967ceae2a624493c0efbc1a fix(integrity): separate server reports from local history and validate contact acknowledgements
- 74e3300fa9ff022153d7e6671c65362203258032 test(integrity): record 147 passing regressions, preserved contacts and coordination compatibility
- b27d769adc51ea6c1e64f9ec92cf02327cc08369 fix(candidate): consolidate honest uploads, durable report contracts and F007A; publish matching bundles
- c79992a385213b437541cb92954c76a99c2485b1 docs(candidate): close package matrix, executed regressions and restricted Staging activation plan
- 797fb5e918c2228721cb099d94c5a2914201a5f5 fix(promotions): isolate async uploads and preserve historical images (C4 R1)
- d30ad5de066fd49a299710b160b6eacf90017d73 fix(promos): sincronizar preview, recuperación tras error y guard contra doble envío
- 93e0ef8365b2b7db057b4226a93b109ee3bf9726 test(promos): verificar preview remota, continuidad tras error y doble submit
- b0677916c9f80543055575e7b79cfe57f2650bdc docs(coord): cerrar tres ajustes y documentar verificacion e integracion condicionada
