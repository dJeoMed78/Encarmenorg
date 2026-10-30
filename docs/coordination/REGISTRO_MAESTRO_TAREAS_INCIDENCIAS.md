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
