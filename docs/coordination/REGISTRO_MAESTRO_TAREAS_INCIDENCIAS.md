# ENCARMEN — Registro maestro de tareas e incidencias
**Fecha de creación:** 2026-10-29. **Coordinación:** Jefa 3. **Rama canónica:** `coord/encarmen-work-control-001`.
**OBJETIVO:** fuente única para decidir qué está pendiente, implementado, probado, integrado, desplegado, validado y cerrado. **Ninguna nueva Jefa debe tomar estados congelados de una instrucción de sucesión como estado actual.**

## Regla irrevocable del propietario
**TODA incidencia, error o solicitud de corrección que el propietario comunique —verbalmente, texto, imagen, PDF u otro medio— se registra con ID estable y evidencia antes de delegar o corregir, aunque no haya capacidad de trabajadores. Nunca se pierde, omite, olvida ni cierra automáticamente.** Coordinación asigna prioridad y puede modificarla justificadamente; ninguna incidencia se cierra hasta confirmación explícita del propietario de que está solucionada. Puede quedar implementada/probada/desplegada sin estar cerrada. Una resolución técnica de causa subyacente NO implica cierre del reporte del propietario.

**Proceso:** recibir → buscar duplicidades/antecedentes → registrar ID, síntoma, fuente y ambiente → determinar prioridad y responsable → enlazar tarea/commit/PR/pruebas → comprobar integración y despliegue → solicitar validación del propietario → cerrar solo con su autorización, conservando todo el historial. Si es duplicada, enlazar al ID original, conservar el reporte y no ordenar trabajo doble. Si no se dispone del archivo original, registrar el hallazgo desde la transcripción y anotar esa limitación. **Nunca borrar filas**, incluso al completarlas: mantener fecha y evidencia.

**Estados independientes por registro:** `incidencia: abierta/reabierta/cerrada-por-propietario`; `implementación: no-verificada/en-desarrollo/publicada`; `pruebas: no-ejecutadas/ejecutadas-por-ejecutor/verificadas-independientemente`; `integración: no-integrada/integrada`; `ambiente: sin-despliegue/desplegado-staging/desplegado-producción`; `validación: pendiente/aceptada-por-propietario`. No sustituir una categoría por otra.

## Incidencias del PDF del propietario del 28 de octubre de 2026
**Fuente histórica recuperada:** PDF `encar.pdf`, 5 páginas, adjuntado a la conversación de Jefa 2, transcripción `2026-10-28 10-44-30-01___Coordinaci_n_principal.txt`, localizada en archivos del proyecto/biblioteca. Jefa 2 extrajo siete fallas y desglosó F007 en A/B. **No hay evidencia en los issues de GitHub consultados de que F001–F007B estuvieran registrados allí; por eso se incorporan a este registro.** Prioridades iniciales reproducen Jefa 2, ajustadas solamente donde se señala. Estado de cierre: **ABIERTAS**, salvo validación expresa posterior del propietario que deba comprobarse. No asegurar que toda la implementación siga ausente: existen ramas de corrección sin validación visual completa.

| ID | Incidencia del propietario | Prioridad | Estado de cierre | Próxima verificación y antecedentes |
|---|---|---|---|---|
| ENC-F001 | Editor de empresa en solo lectura; bloquea edición/guardado | Crítica | ABIERTA | Contrastar correcciones R1/R3, autorización de escritura y validación real de Staging |
| ENC-F002 | No permite subir, quitar o cambiar logotipo, incluso como administrador | Alta | ABIERTA | Revisar carga remota y edición; ramas recientes de upload no significan cierre |
| ENC-F003 | Gestión empresarial bloqueada pese a sesión administrativa | Crítica | ABIERTA | Revisar autenticación, permisos y funcionamiento en Staging |
| ENC-F004 | Sustituir botón grande «Gestión del negocio» por símbolo π pequeño y discreto | Media | ABIERTA | Comprobar diseño publicado y validación visual del propietario |
| ENC-F005 | Administrador debe poder elegir como logotipo una imagen que ya esté en galería | Alta | ABIERTA | Comprobar selector, persistencia del logotipo y visualización |
| ENC-F006 | Google Maps no se visualiza incrustado en ficha empresarial | Alta | ABIERTA | Tarea GAS ENC-F006-MAPS-001 cancelada por cuota: NO ejecutada; inspeccionar otras ramas antes de encomendar |
| ENC-F007A | En móvil comentarios aparecen antes que ubicación, horarios, pagos y tipos de servicio; deben ir al final | Alta | ABIERTA | Perplexity entregó SHA `18668778` con parche **sin aplicar** y pruebas no ejecutadas; Jefa 3 detectó incumplimiento y aplicó corrección directa en `coord/enc-f007a-completion-001` SHA `73a68214cb326283375a8fe5e5ceeb669cee6d49`. **Implementada y publicada, NO probada/NO integrada/NO desplegada; requiere pruebas y validación visual del propietario** |
| ENC-F007B | Errores de calificaciones y comentarios; consulta/publicación no funciona correctamente | Alta | ABIERTA | Verificar base real, API, permisos, moderación y pruebas sin comentarios ficticios |

**Referencia documental:** La primera incidencia F007 comprendía diseño y funcionamiento; se separó en A y B para que corregir una no cierre la otra. El propietario ordenó explícitamente «nada se cierra hasta que yo te diga que ya quedó solucionada».

## Incidencias y riesgos adicionales previamente registrados
| ID | Hecho | Prioridad | Situación verificable y acción pendiente |
|---|---|---|---|
| ENC-F008 | Restauración histórica de teléfonos/WhatsApp | Crítica | **Recuperación masiva documentada y verificada por Jefa 2 y propietario**: 174 negocios en cada base Staging y producción, comprobación Staging 206/207 con contactos, visibilidad reportada en producción. **No repetir restauración**. Issue #5 describe estado anterior y está DESACTUALIZADO; verificar si propietario la declara formalmente cerrada, sin borrar historial |
| ENC-F009 | Filtros, contadores y monitoreo de ausencia de contactos en panel | Alta | Issue #6 existe, pendiente de comprobar implementación/despliegue/aceptación; no asumir que continúa intacto después de ramas R3 |
| ENC-INT-001 | Fallback de `fetchReports()` presenta históricos de localStorage como reportes del servidor | Alta | Confirmado por revisión Jefa 3, reservado a `ENC-DATA-INTEGRITY-CLOSURE-003` W1, no duplicar |
| ENC-INT-002 | API podía confirmar carga de imagen sin persistencia remota | Alta | Implementado en `coord/enc-upload-honest-result-001`; sin pruebas ejecutadas ni integración |
| ENC-INT-003 | Verificación de duplicados fallaba abierta ante errores de red | Alta | Implementado en `coord/enc-upload-honest-result-001`; pendiente pruebas e integración |
| ENC-INT-004 | PATCH/DELETE reportes administrativos aceptaban falso éxito HTTP | Alta | Corrección cliente publicada en `coord/enc-upload-honest-result-001`; validación pendiente |
| ENC-INT-005 | POST/PATCH/DELETE de reportes en servidor ignoraban SQL y modificaban caché antes de confirmación | Alta | Corrección backend publicada en `coord/enc-report-persistence-001`; pruebas sintéticas creadas, no ejecutadas ni integradas; revisar política de escritura |
| ENC-INT-006 | Previsualización local de imágenes de promociones/galería puede confundirse con archivo remoto guardado | Media | Perplexity publicó `work/enc-promo-image-integrity-001` SHA `98ca8ad` **solo script**, sin aplicar cambio funcional. Jefa 3 encontró fallos adicionales y corrigió en `coord/enc-promo-image-integrity-review-001` SHA `73d56e36c43050f265cf32031376277689ea01c6`. **Código implementado y publicado; pruebas ejecutables, integración, despliegue y aprobación del propietario PENDIENTES.** Revisar también galería por separado. |
| ENC-INT-007 | Persistencia best-effort de eventos/promociones/clasificados/cupones | Alta | Riesgo histórico por inspección; confirmar handlers actuales y qué está ya corregido antes de asignar |
| ENC-INT-008 | Consolidación H01–H04 y contratos de registro/edición | Alta | W1 publicó correcciones H01/H02/H03/H04 con SHA documentados; faltan revisiones integrales/validación independiente de ciertas rutas, sin reimplementar |

## Tareas de ejecución y validación (estado al crearse; verificar remoto ANTES de actuar)
| ID | Encargado | Base / rama | Estado de trabajo y siguiente paso |
|---|---|---|---|
| ENC-DATA-INTEGRITY-CLOSURE-003 | W1 | `work/enc-consolidation-fixes-002` SHA `e60582e971f4f8cb56ea56191d33d91824f3fc5e`; destino `work/enc-data-integrity-closure-003` | Publicada en `74e3300fa9ff022153d7e6671c65362203258032`. Coordinación reprodujo 147/147 pruebas, TypeScript y Vite en copia local disponible; revisión integral y conciliación pendientes. No integrada/desplegada. La nota PENDIENTE_W1 es histórica: no reenviar |
| ENC-W2-API-VALIDATION-001 | W2 | `coord/enc-upload-honest-result-001` SHA `79757de8cfb07317668553c02a37502de4b64366` | Pruebas TypeScript/Vite/API no ejecutadas por Jefa 3; `docs/coordination/PENDIENTE_W2_VALIDACION_COORD_API_001.md`. Revisar SHA actual antes de asignar |
| ENC-REPORT-PERSISTENCE-001 | Jefa 3 | `coord/enc-report-persistence-001` SHA `aa5260cf16a08539e04f4225056e152472302c57` | Implementación publicada, revisión y pruebas ejecutables pendientes; no integrada/desplegada |
| ENC-UPLOAD-HONEST-RESULT-001 | Jefa 3 | `coord/enc-upload-honest-result-001` SHA `79757de8cfb07317668553c02a37502de4b64366` | Implementación publicada, validación pendiente; no integrada/desplegada |
| ENC-CONTACTS-RECOVERY-003 | Ninguno | No procede | **OBSOLETA / CANCELADA** por duplicar recuperación histórica ya realizada. No reenviar |
| ENC-F006-MAPS-001 | GAS | No ejecutado | **ORDEN CANCELADA** por agotamiento de cuota; el problema ENC-F006 permanece abierto |

## Otros pendientes históricos del propietario por conciliar
El listado de Jefa 2 incluía además: registro público directo sin aprobación, persistencia en MariaDB, publicación inmediata, edición y reinicio, editor con defectos internos (horarios, WhatsApp, pagos, modalidades de servicio, conservación de contactos, doble guardado y fallback dataURI), enlaces/videos en descripciones, estadísticas de calificaciones, responsividad, seguridad administrativa, radar y tipografía. **No son automáticamente tareas nuevas:** antes de emitirlas, cruzar con las ramas posteriores (consolidación, R3, registro, clasificadas) y agregar IDs adicionales aquí para cualquier defecto concreto que siga abierto o si el propietario vuelve a reportarlo. Ninguna solicitud del propietario debe descartarse por falta de capacidad.

## Revisión de candidata W1 ENC-STAGING-CANDIDATE-CLOSURE-004 — 2026-10-29

- Rama `work/enc-staging-candidate-closure-004`, SHA `c79992a385213b437541cb92954c76a99c2485b1`; comparada con base `74e3300fa9ff022153d7e6671c65362203258032`: **2 commits / 18 archivos**.
- Entrega **PUBLICADA, NO APROBADA, NO INTEGRADA, NO DESPLEGADA**. W1 reportó 176 pruebas PASS y compilación; Coordinación inspeccionó código real, pero **no ejecutó independientemente** las suites ni tuvo MariaDB/Chromium real.
- **C4-H01 ALTO:** subida de cartel de promoción fuera de orden puede sobrescribir estado de otra promoción al cambiar formulario; no existe epoch/versión ni invalidación en `AdminPromotionsTab.tsx`.
- **C4-H02 MEDIO:** carga de promoción histórica con `promoImageData` base64 queda bloqueada como «no confirmada» y guardados envían `promoImageData:null`, con riesgo de eliminación de datos heredados.
- Evidencia, escenarios de reproducción y corrección complementaria: `docs/coordination/REVIEW_ENC_STAGING_CANDIDATE_CLOSURE_004.md`.
- Se requiere revisión y subsanación por W1 en rama separada desde SHA C4, más pruebas; no repetir paquetes terminados A/B/C/D ni desplegar. Incidencias del propietario continúan abiertas.

## Evaluación controlada GitHub Copilot — ENC-COPILOT-EVAL-001 (2026-10-29)

- Rama experimental `experiment/copilot-eval-001`, SHA `75e16936f990846de7177b55d2f059fb49417714`; base `e60582e971f4f8cb56ea56191d33d91824f3fc5e`. GitHub: 2 commits, **únicamente tres archivos nuevos** bajo `experiments/copilot-eval-001/`, ningún archivo operativo ni rama protegida modificados.
- Módulo `classifyOperationResult` y tests importando el código real: implementación cumple el contrato inspeccionado. Copilot informa **24/24 pruebas ejecutadas en Node 26.12.1**, logs originales no inspeccionados en esta revisión.
- Coordinación ejecutó **49 comprobaciones independientes PASS, 0 FAIL** invocando la función del texto EXACTO recuperado por conector GitHub (blob `f1b37a6a4b33393d897dc0f12199691f888bb653`) en runtime JavaScript aislado. Este control **no equivale a correr la suite node:test en checkout completo**.
- Observaciones menores: README consigna SHA anterior `c76ffc4` como «SHA final», aunque el HEAD real es `75e16936...`; Copilot dijo que documentos coordinación no estaban en rama base, aunque la instrucción pedía leerlos desde la rama documental distinta. Documentación y trazabilidad deben afinarse.
- **Calificación provisional: 94/100. Dictamen: APTO para tareas aisladas bajo supervisión de Coordinación, no aprobado para producción ni autonomía sobre infraestructura.** Evaluar con trabajo real antes de permitir mayor alcance. No es incidencia funcional del propietario, solo registro de evaluación de herramienta. No integrar el experimento ficticio.

## Rutina de coordinación
- Al comenzar conversación/sucesión, leer ESTE documento y `LA_JEFA_METODOLOGIA_PERMANENTE.md`, luego verificar GitHub/ramas/issues y documentos por rama.
- Al recibir informe/captura/archivo del propietario, actualizar el registro **en la misma intervención**, primero conservando evidencia y estado pendiente.
- Después de cada commit, entrega, integración, prueba o validación, actualizar la entrada correspondiente; mantener evidencia por SHA y fecha.
- Revisar sistemáticamente todas las entradas ABIERTAS, ordenadas por prioridad y riesgo. Priorizar no significa abandonar las de prioridad menor.
- No cerrar incidencias comunicadas por propietario por un PASS de un trabajador o una revisión de código. Solo la aceptación expresa del propietario cierra la incidencia.
- El registro maestro está en la rama documental. Issues de GitHub pueden enlazarse, pero una issue desactualizada jamás reemplaza este registro hasta reconciliarse.


## Recepción y revisión acotada de ENC-DATA-INTEGRITY-CLOSURE-003 — 2026-10-29

Entrega W1 recibida. GitHub confirma comparación base `e60582e971f4f8cb56ea56191d33d91824f3fc5e` → `74e3300fa9ff022153d7e6671c65362203258032`: dos commits, seis archivos, sin divergencia respecto de la base. Sustituye el estado histórico «suspendida/no iniciada» de la tabla y del documento PENDIENTE_W1; no reenviar la orden.

Inspeccionados diffs funcionales de api.ts y WordPressSyncModal.tsx y las dos suites nuevas. Coordinación ejecutó independientemente las cinco pruebas nuevas: **5 PASS / 0 FAIL / 0 omitidas** en copia local disponible. Hashes Git de ambos fuentes y ambas suites contrastados con los blobs del SHA entregado. No es checkout Git completo verificado ni instalación limpia. Los **147 PASS, lint y build** permanecen como resultados reportados por W1, no reproducidos por Coordinación en esta intervención.

ENC-INT-001: implementación publicada y revisión cliente acotada satisfactoria; no integrada ni desplegada, no cerrada. fetchReports ya no lee históricos locales; diferencia error de colección vacía; panel retira listas previas y descarta respuestas atrasadas. Edición exige éxito booleano y acuse de contactos. No se restauraron contactos ni se tocó SQL real.

Pendientes: revisión completa contra orden original y regresiones de base; conciliación por función con ramas de upload y persistencia de Jefa 3; lectura backend GET /api/reports y dbLoadAllReports puede ocultar fallo SQL como vacío y mantiene caché. Origen HTTP no prueba durabilidad MariaDB. Sin validación en navegador real, MariaDB ni Hostinger. Sin autorización de integración/despliegue; incidencias del propietario permanecen abiertas. Evidencia: https://github.com/dJeoMed78/Encarmenorg/commit/74e3300fa9ff022153d7e6671c65362203258032 .


## Control de brechas hacia integración — instrucción del propietario, 2026-10-29

El propietario solicita reducir trabajo acumulado sin implementar y preservar trazabilidad. Priorizar completar revisión, conciliación y preparación de candidata sobre abrir encargos equivalentes. No sustituye autorización específica de integración/despliegue ni permite cerrar incidencias sin aceptación del propietario.

### Verificación adicional ejecutada por Coordinación
En copia local disponible de data-integrity-closure-003 se ejecutó el comando conjunto publicado: **147 PASS / 0 FAIL / 0 skipped**; `npm run lint` PASS; Vite directo con salida temporal PASS. Persisten avisos de chunk >500 KB y npm http-proxy. Los cuatro archivos funcionales/de pruebas nuevas ya contrastados conservaban hashes de la entrega; no se acredita comparación íntegra de todo el árbol local con GitHub ni instalación limpia. SQL/adaptadores simulados, jsdom/HTTP local: no MariaDB, Hostinger ni navegador real. Estas comprobaciones sustituyen la limitación anterior «147/lint/build no reproducidos», sin convertir la revisión parcial en aprobación global.

### Cola única de cierre técnico (sin nuevas asignaciones)
| Orden | Paquete | Evidencia / siguiente puerta concreta | Estado |
|---|---|---|---|
| 1 | Candidata W1 H01–H04 + integridad/contactos | SHA 74e3300fa9ff022153d7e6671c65362203258032. Completar contraste con orden original, integridad del árbol y revisión de contratos backend/cliente | Pruebas locales reproducidas; revisión pendiente |
| 2 | Upload, duplicados, mutaciones cliente de reportes | SHA 79757de8cfb07317668553c02a37502de4b64366. Ejecutar pruebas existentes y conciliar por función con candidata W1 | Publicado; validación pendiente |
| 3 | Persistencia de reportes | SHA aa5260cf16a08539e04f4225056e152472302c57. Validar suites y resolver contrato GET/caché/error SQL antes de declarar lectura autoritativa | Publicado; brecha backend abierta |
| 4 | Comentarios al final en móvil F007A | SHA 73a68214cb326283375a8fe5e5ceeb669cee6d49. Prueba básica y comparación de compatibilidad; validación visual posterior | Publicado; pruebas pendientes |
| 5 | Candidata conjunta para Staging | Registrar SHA único, paquetes incluidos/excluidos, build, controles críticos, reversión y evidencia de aislamiento adecuada al alcance; solicitar autorización específica de despliegue | No preparada aún |

Cada paquete conserva sus SHA; no reemplazar archivos completos ni repetir restauración de contactos. Clasificados y otras entregas conservan seguimiento, pero no se agregan a la candidata por simple existencia de ramas. La cola es orden operativo, no integración ni despliegue ejecutados. Ninguna incidencia del propietario se cierra por estas pruebas.


## Seguimiento de W1 ENC-STAGING-CANDIDATE-CLOSURE-004-R1 — capacidad agotada

**Reporte del propietario, 2026-10-29:** tras aproximadamente 6 min 18 s de trabajo en la instrucción complementaria `ENC-STAGING-CANDIDATE-CLOSURE-004-R1`, la interfaz W1 mostró «El modelo seleccionado está al límite de su capacidad. Prueba con otro modelo». No existe informe final ni evidencia de pruebas/corrección terminada.

**Verificación directa GitHub:** la rama `work/enc-staging-candidate-closure-004-r1` existe, pero su HEAD es **idéntico** al SHA base `c79992a385213b437541cb92954c76a99c2485b1` (0 commits por delante, 0 archivos de diferencia). **Estado: INTERRUMPIDA / SIN CAMBIOS PUBLICADOS**. Posibles cambios de sesión locales no publicados: desconocidos, no se asumen. Mantener abiertos C4-H01/C4-H02; no aprobar/integrar/desplegar candidata C4. Antes de reencargar, revisar disponibilidad W1 y evaluar Copilot W6 con orden complementaria separada que preserve SHA/base y límites, sin ejecutar duplicaciones simultáneas.


## Reasignación autorizada a Copilot — ENC-STAGING-CANDIDATE-CLOSURE-004-R1

**Autorización expresa del propietario (2026-10-29):** al agotarse la capacidad de W1, la corrección complementaria de dos defectos de promociones C4-H01/C4-H02 se transfiere a **W6 — GitHub Copilot**, bajo supervisión independiente de Coordinación. La instrucción de W1 `ENC-STAGING-CANDIDATE-CLOSURE-004-R1` queda **SUSPENDIDA / NO REENVIAR en paralelo**. Rama W1 `work/enc-staging-candidate-closure-004-r1` comprobada idéntica a SHA base `c79992a385213b437541cb92954c76a99c2485b1`: 0 commits publicados. No atribuirle correcciones.

**Nueva tarea W6:** `ENC-C4-PROMO-CLOSURE-COPILOT-001`; base obligatoria `c79992a385213b437541cb92954c76a99c2485b1`; rama `work/enc-c4-promo-closure-copilot-001` (inexistente al verificar). Alcance: `src/components/AdminPromotionsTab.tsx`, pruebas de regresión específicas nuevas, bitácora exclusiva; corregir carrera entre uploads y conservación de imágenes históricas. Revisar `docs/coordination/REVIEW_ENC_STAGING_CANDIDATE_CLOSURE_004.md` en esta rama documental. No tocar reportes/SQL/seguridad/contactos ni ramas protegidas; no integrar o desplegar. **Estado: AUTORIZADA PARA ENVÍO a Copilot, todavía no ejecutada.**

**Criterio de Coordinación:** inspección real del código implementado, suites ejecutadas independientes y pruebas negativas de concurrencia/históricos; si incumple, corregir directamente defectos seguros o emitir instrucción complementaria, nunca aceptar solo reportes PASS. Copilot Web: Autopilot + Tool permissions Assisted ya seleccionado por propietario; minimizar aprobaciones redundantes sin saltar controles de la plataforma.


## Auditoría W1 R1 y comparación pendiente con Copilot — 2026-10-29

- W1 volvió a estar disponible y publicó `ENC-STAGING-CANDIDATE-CLOSURE-004-R1` en `work/enc-staging-candidate-closure-004-r1`, SHA `797fb5e918c2228721cb099d94c5a2914201a5f5`. GitHub confirma **1 commit, 5 archivos** desde la base C4 `c79992a385213b437541cb92954c76a99c2485b1`; antecedente anterior de 0 commits quedó superado y no representa el estado actual.
- Coordinación leyó código y 12 pruebas nuevas. Confirmado por código: generación de subidas/invalidación al editar, cambiar empresa, resetear, quitar y desmontar; comparaciones tras ambos `await` y antes de actualizar estado; `imageMode` e `historicalImages` conservan promoImage/promoImageData históricos en el payload, distinguiendo ausencia, null y nuevo cartel. La suite usa React/jsdom y adaptador SQL sintético, incluye reproducción de fallos base según el informe.
- **188 PASS, lint, Vite** son resultados publicados por W1, todavía no reproducidos independientemente por Coordinación en este ciclo. No MariaDB real, Hostinger ni navegador visual. La revisión es **parcial favorable; NO APROBADA PARA INTEGRACIÓN**.
- **Observación R1-O01 (verificación pendiente):** en subida exitosa `setPromoImage(res.url)` no limpia `promoImageData` temporal; la vista `src={promoImageData || promoImage}` puede continuar mostrando base64 local en lugar del archivo remoto confirmado. El payload `imageMode='new'` sí envía `promoImageData:null`; verificar UX de confirmación, errores de URL/imagen rota y compatibilidad antes de aceptar.
- **Observación R1-O02 (verificación pendiente):** después de upload fallido con `imageMode='new'`, se bloquea el guardado de otros campos hasta corregir la imagen; confirmar comportamiento esperado y si es posible recuperar edición histórica preservando cartel anterior sin riesgo de guardar una preview no confirmada.
- El propietario pidió **comparar W1 contra Copilot** únicamente al recibir el informe de Copilot; su rama `work/enc-c4-promo-closure-copilot-001` ya tiene actividad, pero no se emitirá ganador ni fusión antes de recibir entrega y completar revisión equivalente de ambos.
- Mantener ambas ramas aisladas; no integrar automáticamente ni desplegar; incidencias del propietario abiertas.


## Dictamen comparativo W1 versus Copilot — C4-H01 / C4-H02 (2026-10-29)

**Base común:** `c79992a385213b437541cb92954c76a99c2485b1`. Entregas y HEAD comprobados por GitHub:
- W1 `work/enc-staging-candidate-closure-004-r1` SHA `797fb5e918c2228721cb099d94c5a2914201a5f5`: 1 commit, 5 archivos.
- Copilot W6 `work/enc-c4-promo-closure-copilot-001` SHA `e44ffcc8bc4c47bd35b7c79ef890c009450e907e`: 2 commits, 3 archivos.

**Revisión funcional independiente:** leídos componentes completos, pruebas y bitácoras. W1 conserva exactos `promoImage` y `promoImageData` históricos, distinguiendo incluso ausencia y null mediante `Object.hasOwn`, guarda payload según `imageMode` y bloquea carreras tras compresión/upload, al cambiar empresa, edición, reset, quitar y desmontar; añadió pruebas React/jsdom y SQL sintético. Copilot implementa generaciones, preview local separada y 24 pruebas extraídas de handlers, pero transforma ausencia/vacío a `null` mediante `promoImageData.trim() || null`, no distingue ambos campos históricos con igual precisión, conserva fallback a `promotions_seed.json` ante fallo de consulta remota y no invalida subida al cambiar negocio ni desmontar. Copilot incluye defensas ad hoc `typeof ... === 'undefined'` para pruebas de handlers que no son necesarias en componente React real.

**Evaluación provisional con matriz de 100 puntos:** W1 **88/100**; Copilot **75/100**. **Ganador técnico actual: W1** por integridad histórica, mayor cobertura de comportamiento en componente montado y menor riesgo de datos. Los resultados 188 PASS (W1) y 24+5 PASS (Copilot), lint/build son reportados por ejecutores; **no se ejecutaron independientemente** en esta revisión. La comparación se funda en lectura real del código, no en simples conteos de pruebas.

**Defectos/puntos abiertos:** W1 conserva `promoImageData` local en preview aun tras URL confirmada (`src={promoImageData || promoImage}`), UX incorrecta y posible preview de imagen distinta de la enviada. Tras upload fallido, bloquea edición de otros campos hasta resolver la imagen. W1 no agregó guard explícito robusto contra doble envío de guardado. Copilot tampoco supera compatibilidad y fallback mencionados. **No integrar ni mezclar las dos ramas automáticamente.** Corrección adicional pequeña sobre W1 si se autoriza y se pueden probar pruebas relevantes; comprobar durabilidad/promociones en entorno aislado antes de Staging; aceptación del propietario requerida para incidencias abiertas.


## Cierre de jornada — ENC-C4-FINAL-COORD-001 y PR de integración #7 (2026-10-29)

**Autorización del propietario:** corregir tres defectos restantes de promociones, verificarlos e integrar a `ia-desarrollo` **solo si es técnicamente razonable**. No se autorizó despliegue de Staging ni producción.

**Rama correctiva real:** `coord/enc-c4-final-001`, nacida exactamente de W1 R1 `797fb5e918c2228721cb099d94c5a2914201a5f5`. Commits de implementación `d30ad5de066fd49a299710b160b6eacf90017d73`, pruebas `93e0ef8365b2b7db057b4226a93b109ee3bf9726`, documentación `b0677916c9f80543055575e7b79cfe57f2650bdc`. Cambios aplicados sobre código funcional:
1. Subida confirmada limpia `promoImageData` temporal para que la vista previa use URL remota real.
2. Fallo de carga restaura imagen confirmada/histórica desde `confirmedImage`, preserva datos y permite editar otros campos sin presentar la preview fallida como guardada.
3. Guardado duplicado bloqueado mediante ref sincrónico `savePending` con liberación en `finally`.
Prueba W1 R1 de URL inválida conciliada con nuevo contrato, tres pruebas React/jsdom nuevas publicadas. Coordinación ejecutó **3 comprobaciones dinámicas independientes PASS (V8 con handlers extraídos de archivo remoto publicado)**: carga exitosa, fallo después de éxito, doble submit. **NO** se ejecutó suite Node/jsdom, TypeScript global o build final en esta sesión; pendientes ejecutar en checkout validado.

**Preparación integración:** comparación GitHub `ia-desarrollo` SHA `0d231cb2779b7a14d8d336fc2f4de3782663c738` vs `coord/enc-c4-final-001`: **27 commits ahead / 0 behind**, más cambios de seguridad/registro/SQL/bundles/dist. Se abrió **PR #7 en BORRADOR**: https://github.com/dJeoMed78/Encarmenorg/pull/7 ; GitHub lo reportó abierto, `draft:true`, `merged:false`, `mergeable:false` al momento de creación (sin concluir causa ni presumir conflicto definitivo). No se fusionó ni desplegó; no se detectaron workflow runs de pull_request para el SHA final al consultar en ese momento. Antes de merge: pruebas de SHA final, revisión de conjunto completo, verificar automatismos de despliegue y coherencia de dist/bundles, evaluar bloqueo mergeable. **Estado: CORRECCIÓN PUBLICADA Y VERIFICACIÓN ACOTADA; INTEGRACIÓN PREPARADA EN PR, AÚN NO EJECUTADA.** Ninguna incidencia del propietario cerrada.


## Presupuesto de ejecución y prioridad de publicación — 2026-10-30

**Datos comunicados por el propietario (no medidos por Coordinación):** GitHub Copilot lleva **77% de créditos consumidos (23% restantes)** tras la última instrucción; anteriormente llevaba **75% consumidos (25% restantes)**, con restablecimiento indicado para **2026-10-31**; W1/W2 (Codex y ChatGPT Work, cuota semanal compartida) dispone de **9%** en la captura del panel de uso. También están disponibles GAS/W3 y Perplexity/W4. Las cuotas y fechas son instantáneas y deben actualizarse cuando el propietario comunique cambios; no prometer un restablecimiento sin confirmación del panel.

**Instrucción empresarial:** priorizar **resultados integrados y visibles en Staging** sobre acumulación de código, informes, diagnósticos y ramas. No abrir nuevas tareas funcionales mientras no se agote el backlog de integración salvo bloqueo crítico de seguridad/integridad o instrucción expresa. Minimizar la cuota de W1/W2, usar Copilot para correcciones puntuales y GAS/Perplexity en trabajos acotados si aportan evidencia nueva.

**Cierre inmediato objetivo:** W6 tiene orden `ENC-C4-FIXTURE-REPAIR-006` para el único fixture de promociones obsoleto del conjunto 191 tests; revisión independiente, aplicar mínimo parche al PR #7 sin duplicar candidatas, y luego integrar a `ia-desarrollo` al superar puertas. **Hostinger tiene despliegue automático confirmado por el propietario**, pero rama conectada y efecto de push/merge no verificados: **no fusionar hasta identificar exactamente el trigger**. Staging necesita autorización específica, aislamiento de recursos sensibles, build de frontend coherente y posibilidad de revertir. Producción no tocar.


## ENC-C4-FIXTURE-REPAIR-006 — integrada en candidata PR #7 (2026-10-30)

W6 Copilot publicó commit `33befcae02cac7ee705899ff5da2f76c29d53c1a`, desde SHA `b0677916c9f80543055575e7b79cfe57f2650bdc`, con **1 archivo cambiado exclusivamente**: `tests/staging-candidate-closure-004.test.mjs`. Su informe declaró **191 PASS / 0 FAIL / 0 SKIP**, 5/5 fixture y 15/15 R1; resultados ejecutados por W6, **no reproducidos independientemente por Coordinación**. La inspección de la prueba confirma fixture `confirmedImage` y recuperación de imagen histórica tras HTTP503, sin guardar preview fallida.

**Integración selectiva directa de Coordinación al ORIGEN del PR #7:** commit `9b73f3366a14e34c9200c2f8f6aa0afcb6251c81` en `coord/enc-c4-final-001`, archivo de prueba idéntico a Copilot por hash blob `fd10c7f26efd1640dbc92d7f5cd1f67fec99389d`. Verificado nuevamente: `ia-desarrollo` **28 commits behind / 0 commits ahead** respecto de candidata y **88 archivos** de diferencia. PR #7 sigue siendo la única candidata a integrar, no se creó otra. **No hay merge a ia-desarrollo ni despliegue.**

**Bloqueo crítico de integración operativa:** el propietario confirmó que Hostinger tiene despliegue automático, pero **todavía no se sabe qué rama lo dispara**. Antes de fusionar `ia-desarrollo`, verificar configuración efectiva en Hostinger y evitar afectar producción o Staging sin autorización específica. Workflow `.github/workflows/main_carmen.yml` no es evidencia suficiente para descartar automatismos externos.


## Inspección SSH de Hostinger publicada — ENC-HOSTINGER-READONLY-001 (2026-10-30)

La coordinación confirmó mediante GitHub Actions **ejecuciones históricas exitosas** de SSH Hostinger: run 40957317052 (auth), 40960911014 (directorio privado), 40961499416 (backup DB) y 40963696408 (deploy Staging). Acceso anterior vía GitHub Actions y secreto `ENC_STAGING_SSH_PASSWORD`; no acceso SSH directo desde el chat ni confirmación vigente del secreto. **NO registrar valor del secreto.** 

Se creó rama aislada `coord/enc-hostinger-readonly-inspection-001` y workflow `.github/workflows/enc-hostinger-readonly-inspection.yml`, commit `4bd9f55452a9ac529f2e5d12a290a06508055dfc`, limitado a SSH de solo lectura con huella ED25519 anclada, comprobaciones de existencia de directorio, symlink Staging y rama Git de worktrees, sin SQL, escrituras remotas, builds o despliegues. El workflow tiene trigger push **solo en esa rama**. Al consultar `get_commit_combined_status`, no se recibieron status checks; **no hay evidencia de ejecución o resultado de este nuevo workflow todavía**. Para constatar, revisar https://github.com/dJeoMed78/Encarmenorg/actions/workflows/enc-hostinger-readonly-inspection.yml y los jobs/logs. La ausencia de metadatos Git en el servidor no acredita ausencia de autodeploy configurado en el panel Hostinger.

**Bloqueo actual de PR #7**: identificar con evidencia de Hostinger la rama del despliegue automático; no fusionar a `ia-desarrollo` hasta excluir efectos no autorizados. El fixture Copilot ya fue incorporado a candidata PR #7 en `9b73f3366a14e34c9200c2f8f6aa0afcb6251c81`; W6 reportó 191 PASS, Coordinación verificó hash del archivo. La próxima operación de valor: leer resultado del workflow; si no identifica configuración del despliegue automático, consultar panel Hostinger/conector competente, sin inferir por Git.


## Dictamen W4 ENC-HOSTINGER-AUTODEPLOY-008 (2026-10-30)

W4/Perplexity entregó informe **exclusivamente de lectura**: GitHub Actions visible `main_carmen.yml` solo build en push `main`, sin SSH/deploy; `encarmen-staging-deploy-authorized.yml` acotado a push de coordinación cuando cambia ese archivo, fija SHA antiguo `7e7818166bee...` para Staging y no escucha `ia-desarrollo`; inspección read-only `enc-hostinger-readonly-inspection.yml` creada pero sin resultado acreditado; **no puede confirmar** la rama de auto-deploy de Hostinger. **No usar su afirmación sobre una rama Git activa en webroot como evidencia concluyente de triggers externos:** puede no haber checkout Git, y un checkout Git no demuestra qué evento lo actualiza. El usuario confirmó auto-deploy en Hostinger, configuración efectiva debe verificarse en hPanel/IA con acceso real o logs de automatismo.

**Contraste independiente de Coordinación:** en GitHub compare `ia-desarrollo` → `coord/enc-c4-final-001` hay **28 ahead / 0 behind**, no 27 (W4 citó datos previos al commit de fixture), 88 archivos; el workflow `.github/workflows/encarmen-staging-deploy-authorized.yml` efectivamente fija `7e781816...`, por tanto **no debe reutilizarse sin revisión y ajuste al SHA publicado**. `fetch_commit_workflow_runs` para `4bd9f55...` devuelve [] porque solo filtra corridas de PR; `get_commit_combined_status` sin status, **no demuestra que el workflow no haya corrido**. El PR #7 no se ha fusionado ni desplegado. Siguiente puerta: obtener evidencia de rama auto-deploy de Hostinger y resultado de inspección; en paralelo revisar plan de W3 para bundle y rollback, sin abrir nuevas funcionalidades. No activar workflow de publicación antes de autorización específica del propietario.


## Hostinger IA — auto-deploy confirmado por aplicación (2026-10-30)

**Evidencia aportada por el propietario:** respuesta de la IA de Hostinger que indica acceso a configuración real de cuenta: producción `encarmen.org` conectada por integración GitHub a `dJeoMed78/Encarmenorg:main`; Staging `staging.encarmen.org` conectada a `dJeoMed78/Encarmenorg:ia-desarrollo`. **Consecuencia importante:** fusionar PR #7 hacia `ia-desarrollo` **puede activar automáticamente el despliegue de Staging**. No se ha realizado ninguna desconexión, merge ni despliegue. Producción y staging están en aplicaciones Node.js/vhosts separados, con rutas `/home/u293982346/domains/encarmen.org/public_html` y `/home/u293982346/domains/staging.encarmen.org/public_html`; nombres de BD `u293982346_encarmenapp` y `u293982346_encarmentest`, con usuarios distintos. **Aislamiento efectivo NO demostrado**, por falta de comprobar variables de entorno, secretos, enlaces y recursos externos. `empresasencarmen.com` es alias de producción, comparte ruta con encarmen.org.

**Decisión técnica de coordinación:** mantener PR #7 sin fusionar hasta **autorizar y confirmar** suspensión/desconexión temporal del auto-deploy de la aplicación Staging exclusivamente, sin alterar `main` o la integración de producción; documentar previamente el estado/reconexión de Staging y recuperar configuración. Un cambio de código a `ia-desarrollo` antes de suspender auto-deploy haría implícito un despliegue no autorizado. Después, verificar SHAs, pruebas y protecciones; fusionar PR #7 en `ia-desarrollo`, confirmar árbol integrado; preparar publicación explícita de Staging con SHA fijo, frontend regenerado, respaldo selectivo, verificación de entorno aislado y rollback; autorización de despliegue específica. El workflow antiguo de deploy `encarmen-staging-deploy-authorized.yml` está fijado a un SHA anterior, **no reutilizar sin actualizar y revisar**. Distinguir evidencia de IA Hostinger (declaración de consulta real) de inspección independiente directa de Coordinación.

**Verificación GitHub en esta intervención:** candidata `coord/enc-c4-final-001` continúa 28 commits ahead / 0 behind respecto de `ia-desarrollo`, 88 archivos. Próxima acción requiere autorización expresa del propietario para suspender SOLO integración GitHub de Staging o gestión equivalente. No tocar producción.


## Revisión independiente W3 ENC-STAGING-RELEASE-PREP-007 (2026-10-30)

W3/GAS entregó procedimiento para SHA `9b73f3366a14e34c9200c2f8f6aa0afcb6251c81`; dictamen declarado **sí con condiciones**. La Coordinación comparó directamente informe con `ops/staging-backups/deploy_staging_candidate.sh`, `run_hostinger_backup.py`, `backup_staging_db.py` en rama `coord/encarmen-work-control-001` y con `package.json` en candidata.

**Diferencias que impiden ejecutar literalmente el informe W3**:
1. Propone `npm run build` como inocuo, pero `package.json` contiene `prebuild` y `build` que invocan `scripts/update_version.cjs`; evitar mutaciones: usar Vite/Esbuild explícitos de workflow histórico.
2. Supone `hbuilds/current -> versions/<ID>/nodejs`, pero script real exige `current -> versions/<ID>` y `OLD=$ACTIVE/nodejs`. Cambiar symlink como W3 indica rompería contratos.
3. Supone `metadata.json` y `staging-current-release.json` como archivos contractuales, pero script real usa `$NEW/.metadata.json` y manifiesto en carpeta de backup; rollback propuesto de W3 no corresponde.
4. Sugiere `run_hostinger_backup.py` en `$HOME/domains/staging.encarmen.org/hbuilds/ops/...`, ubicación **no acreditada**; la ejecución previa vía Actions transfirió scripts a directorio privado separado. `backup_staging_db.py` puede **SKIP** si existe respaldo menor a 72 h; no garantiza copia inmediata.
5. Propone endpoints `/api/health`, `/api/database-status`, `/api/version` sin prueba de rutas activas. Verificación anterior usó HTTP 200 + `/encarmen-release.txt`.
6. Reporte W3 no acredita análisis de conflicto entre despliegue GitHub auto-deploy de Hostinger (rama `ia-desarrollo`) y despliegue SSH atomizado. Hostinger confirmó que el primero se activa por cambios en rama, por lo que no invocar ambos sin verificar efecto sobre releases/runtime.

**Decisión:** PROCEDIMIENTO W3 NO APROBADO PARA EJECUCIÓN TAL CUAL. Mantener candidata PR #7 y autorización general del propietario para operaciones ordinarias de Staging, con producción inamovible. Siguiente paso: comprobación segura del destino DB/variables y compatibilidad mecanismo Hostinger de auto-deploy antes de integrar a `ia-desarrollo` y publicar; preparar build con comandos `npx vite build` y `npx esbuild...` que no disparen actualización de versión. No reabrir desarrollo funcional por estas observaciones.


## INCIDENTE CRÍTICO — GAS preview conectó a MariaDB de producción (2026-10-30)

**Evidencia:** log de ejecución aportado por propietario (GAS), registros aproximadamente 08:37 y 08:52, entorno `/app/applet` lanzado por `tsx server.ts --port 3000 --host 0.0.0.0`; imprime `injected env (0) from .env` y `[MariaDB/Hostinger] Conectado exitosamente a u293982346_encarmenapp en srv1356.hstgr.io`. Carga 206 negocios de BD real. También registra `[Auto-Limpieza Eventos] Se eliminaron automáticamente 9 eventos pasados` y `[Auto-Limpieza Clasificados] 8 anuncios con más de 7 días enviados a papelera`. **No demostrado** si esas limpiezas escribieron en MariaDB o solo archivos/cache; es riesgo crítico por acceso a producción desde entorno de desarrollo. Repite error independiente `ENOENT /app/applet/dist/index.html` al consultar identificación del frontend compilado; no corresponde a prueba de falla de Staging.

**Verificación independiente de código** sobre `coord/enc-c4-final-001`: `src/db/mariadb.ts` considera Staging solo si variables/host/BD lo delatan; si GAS se ejecuta como otro entorno, `getMariaDbConfig()` admite defaults explícitos hacia `PRODUCTION_DB_HOST/USER/NAME`; `isWritePermitted()` puede permitir escrituras al no estar `STAGING_READ_ONLY=true` ni detectarse Staging. `server.ts` inicia tareas de limpieza automática y usa `canSyncStartupWrites=isWritePermitted()`. No se afirma que hubo mutaciones reales sin auditoría DB/logs.

**Contención inmediata:** prohibir nuevas ejecuciones/preview de GAS que dispongan de credenciales productivas y cualquier test de escritura sobre producción. Retirar/revocar exclusivamente secretos de producción en el entorno de GAS (no cambiar los secretos de producción usados por el sitio sin plan de rotación), asegurar DB solo lectura/aislada para previews, ejecutar una inspección de conexiones/escrituras e historial DB de las horas señaladas mediante método de solo lectura, comprobar integridad de contactos/eventos/clasificados y conservar copia de seguridad. No iniciar restauración ni borrado automático; si se detectan escrituras o exposición de credenciales, preparar rotación coordinada con propietario. Corregir en rama aislada detección fail-closed de entornos de desarrollo antes de publicar futuras ejecuciones, sin crear automáticamente nueva tarea que consuma cuotas.

**Estado:** incidente abierto, evidencia de conexión productiva CONFIRMADA por log; modificación persistente NO CONFIRMADA. Prioridad absoluta: producción inamovible. El error `dist/index.html` se corrige en empaquetado Vite/CI y no autoriza tocar producción.


## HOTFIX PRODUCCIÓN — WhatsApp prefijo 52 duplicado (2026-10-30)

**Autorización expresa del propietario:** modificar `encarmen.org` directamente para corregir negocio Hair Palace Keratin, botón “Enviar WhatsApp” llevaba `phone=525219381458462` pese a ficha con número correcto. Causa inspeccionada en `main` original `9c1a1ca8bb0ed0bffe14bfcb175fef3733d38fa1`: `src/components/BusinessDetailModal.tsx` y `src/components/DirectBusinessView.tsx` construían `https://wa.me/52${cleanWhatsApp}` sin eliminar prefijos almacenados 52/521. La utilidad preexistente `src/utils/phone.ts:getWhatsAppUrl()` elimina prefijo mexicano para formar un solo 52; **no tocar números guardados ni MariaDB**.

Rama temporal `hotfix/prod-whatsapp-duplicate-52-20261030`; solo 2 archivos modificados; PR **#8** https://github.com/dJeoMed78/Encarmenorg/pull/8 **fusionado exitosamente vía squash** a `main` en SHA `9038298364ea3733f9201f32bee961c4899cc402`. Confirmación de GitHub: `main` coincide con ese SHA y `BusinessDetailModal.tsx` contiene el nuevo `href={getWhatsAppUrl(...)}`. Número visto por propietario pasa de `525219381458462` a esperado `529381458462` (si origen almacenado corresponde a captura). **Estado:** código integrado a producción EN GITHUB, no existe evidencia aún de build completado/deploy exitoso de Hostinger ni click real en navegador; no marcar incidencia cerrada hasta prueba del propietario en sitio público. No hay SQL, migración, cambios de backend ni despliegue SSH ejecutados por Coordinación. Reversión de fuente: SHA anterior `9c1a1ca8bb0ed0bffe14bfcb175fef3733d38fa1` (revertir solo hotfix si fuese necesario). Monitorizar el build Hostinger Git de `main`.


## Verificación autónoma SSH de producción — WhatsApp hotfix (2026-10-30)

Por requerimiento del propietario, Coordinación creó rama `coord/prod-whatsapp-verify-readonly-20261030` desde coordinación y workflow `.github/workflows/enc-prod-whatsapp-verify-readonly.yml`, commit `b4a74c0de9ccd8a8828bb15d2d4028b03989cdda`. Se activa solo al push de ese archivo en la rama aislada (ya realizado) o manualmente; verifica por HTTP la disponibilidad/release y por GitHub Actions secreto SSH existente, huella ED25519 fija y SSH remoto **exclusivamente de lectura**: directorios `encarmen.org`, marca de release y presencia de cambio en fuentes cuando estén disponibles. No ejecuta SQL, cambios de configuración, escritura remota, reinicio ni despliegue. El hotfix #8 ya está fusionado a `main` en `9038298364ea3733f9201f32bee961c4899cc402`. **No confirmar deployment de Hostinger** hasta leer efectivamente run/log o endpoint actualizado; el conector GitHub disponible en chat **carece de acción de listar corridas** por workflow y `fetch_commit_workflow_runs` solo expone corridas PR, de modo que ausencia de statuses no indica ausencia de ejecución. Enlace directo https://github.com/dJeoMed78/Encarmenorg/actions/workflows/enc-prod-whatsapp-verify-readonly.yml .

Comprobación de lógica determinista `src/utils/phone.ts` para números de captura: con 15 dígitos `525219381458462`, 13 dígitos `5219381458462`, 12 `529381458462`, o 10 `9381458462`, se espera `wa.me/529381458462`. La corrección evita modificar el teléfono almacenado. No presentar el fix como confirmado en UI hasta inspección real.


## HOTFIX PROD #9 — Hostinger build:server no generaba dist (2026-10-30)

El propietario envió captura del historial de despliegues de **`ia-desarrollo`** (Staging), que por sí sola **no constituye evidencia de no-despliegue en `main`** (producción). Investigación independiente en GitHub `main`: el código del fix WhatsApp PR #8 estaba integrado en `9038298364ea3733f9201f32bee961c4899cc402`, pero Hostinger IA indicó que producción configura como build `build:server`; `package.json` en `main` definía `build:server` solo `esbuild server.ts ... && cp server.js api/server.bundle.js`, **sin `vite build`**. Eso puede dejar `dist` cliente obsoleto, manteniendo UI antigua aun con fuente corregida. 

Acción productiva autorizada por propietario (misma incidencia): branch `hotfix/prod-vite-build-whatsapp-20261030`, commit `8ddf40bdd2164bbf81a46299be745598fd7ab4f9`, **único archivo `package.json`** con `build:server` cambiado a `vite build && esbuild ...`. PR #9 https://github.com/dJeoMed78/Encarmenorg/pull/9 fusionado mediante squash a `main` SHA `3b4818790a62d4198a19d9b09ca85f08dd927f76`. Verificado `main` coincide con ese SHA, el comando contiene `vite build`. Sin SQL, cambios en datos ni artefactos forzados desde chat.

Se creó mecanismo autónomo para comprobar en servidor real sin escribir producción: rama aislada `coord/prod-hostinger-proof-20261030`, workflow `.github/workflows/prod-hostinger-proof-20261030.yml` commit `2bab8b908dd36b164b919f207112574305fdd366`; verifica HTTP y SSH lectura de build activo con huella anclada; intenta publicar un informe no confidencial `PRODUCTION_WHATSAPP_VERIFY_RESULT.txt` en **esa misma rama** usando GitHub Actions. **Al último intento el informe no estaba presente**, por lo que el despliegue de Hostinger y el enlace real en navegador **no están confirmados**. La ausencia de reporte tampoco comprueba que Actions falló, debe consultarse corrida. No afirmar cierre hasta evidencia de build publicado y enlace WhatsApp normalizado.


## CIERRE VALIDADO POR PROPIETARIO — WhatsApp Hair Palace Keratin (2026-10-30)

**ESTADO: CERRADO — CORRECCIÓN CONFIRMADA EN PRODUCCIÓN POR EL PROPIETARIO.** Evidencia: captura de navegador proporcionada por el propietario con `api.whatsapp.com/send/?phone=529381458462...`, pantalla WhatsApp mostrando `+52 938 145 8462` y mensaje de contacto del portal. Antes se generaba `phone=525219381458462`, con doble prefijo. Hostinger confirmó como completados los despliegues en `main` del PR #8 / SHA `9038298364ea3733f9201f32bee961c4899cc402` y PR #9 / SHA `3b4818790a62d4198a19d9b09ca85f08dd927f76`; este último marcado **Actual**. El propietario validó expresamente el resultado y ordenó cierre.

**NUEVO BLOQUEO ABSOLUTO PRODUCCIÓN:** por decisión del propietario, revocada cualquier autorización temporal de la incidencia para operaciones adicionales. **No realizar nuevas modificaciones, despliegues, builds remotos, cambios de configuración, restauraciones o SQL sobre `main`, `encarmen.org`, alias `empresasencarmen.com` o sus recursos productivos sin NUEVA instrucción expresa específica.** No reutilizar la autorización del hotfix cerrado. Toda investigación ordinaria y desarrollo regresa a `ia-desarrollo` y `staging.encarmen.org`, con verificación de aislamiento cuando existan datos o recursos compartidos.

**PRIORIDAD INMEDIATA RESTABLECIDA:** integración candidata PR #7 (`coord/enc-c4-final-001`, último SHA candidato `9b73f3366a14e34c9200c2f8f6aa0afcb6251c81`) a `ia-desarrollo`, publicación automática en Staging, pruebas funcionales e incidencias originales pendientes. Asegurar que actualizaciones de coordinación/documentación no disparen modificaciones productivas.
