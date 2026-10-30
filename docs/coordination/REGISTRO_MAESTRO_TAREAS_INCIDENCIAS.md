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
| ENC-INT-006 | Previsualización local de imágenes de promociones/galería puede confundirse con archivo remoto guardado | Media | Requiere inspeccionar guardado final; NO demostrado aún que exista pérdida en servidor |
| ENC-INT-007 | Persistencia best-effort de eventos/promociones/clasificados/cupones | Alta | Riesgo histórico por inspección; confirmar handlers actuales y qué está ya corregido antes de asignar |
| ENC-INT-008 | Consolidación H01–H04 y contratos de registro/edición | Alta | W1 publicó correcciones H01/H02/H03/H04 con SHA documentados; faltan revisiones integrales/validación independiente de ciertas rutas, sin reimplementar |

## Tareas de ejecución y validación (estado al crearse; verificar remoto ANTES de actuar)
| ID | Encargado | Base / rama | Estado de trabajo y siguiente paso |
|---|---|---|---|
| ENC-DATA-INTEGRITY-CLOSURE-003 | W1 | `work/enc-consolidation-fixes-002` SHA `e60582e971f4f8cb56ea56191d33d91824f3fc5e`; destino `work/enc-data-integrity-closure-003` | Orden redactada, suspendida por capacidad según propietario. La rama destino ya existía pero estaba idéntica a base al verificarse. Consultar `docs/coordination/PENDIENTE_W1_ENC_DATA_INTEGRITY_CLOSURE_003.md`. No atribuir ejecución sin commits |
| ENC-W2-API-VALIDATION-001 | W2 | `coord/enc-upload-honest-result-001` SHA `79757de8cfb07317668553c02a37502de4b64366` | Pruebas TypeScript/Vite/API no ejecutadas por Jefa 3; `docs/coordination/PENDIENTE_W2_VALIDACION_COORD_API_001.md`. Revisar SHA actual antes de asignar |
| ENC-REPORT-PERSISTENCE-001 | Jefa 3 | `coord/enc-report-persistence-001` SHA `aa5260cf16a08539e04f4225056e152472302c57` | Implementación publicada, revisión y pruebas ejecutables pendientes; no integrada/desplegada |
| ENC-UPLOAD-HONEST-RESULT-001 | Jefa 3 | `coord/enc-upload-honest-result-001` SHA `79757de8cfb07317668553c02a37502de4b64366` | Implementación publicada, validación pendiente; no integrada/desplegada |
| ENC-CONTACTS-RECOVERY-003 | Ninguno | No procede | **OBSOLETA / CANCELADA** por duplicar recuperación histórica ya realizada. No reenviar |
| ENC-F006-MAPS-001 | GAS | No ejecutado | **ORDEN CANCELADA** por agotamiento de cuota; el problema ENC-F006 permanece abierto |

## Otros pendientes históricos del propietario por conciliar
El listado de Jefa 2 incluía además: registro público directo sin aprobación, persistencia en MariaDB, publicación inmediata, edición y reinicio, editor con defectos internos (horarios, WhatsApp, pagos, modalidades de servicio, conservación de contactos, doble guardado y fallback dataURI), enlaces/videos en descripciones, estadísticas de calificaciones, responsividad, seguridad administrativa, radar y tipografía. **No son automáticamente tareas nuevas:** antes de emitirlas, cruzar con las ramas posteriores (consolidación, R3, registro, clasificadas) y agregar IDs adicionales aquí para cualquier defecto concreto que siga abierto o si el propietario vuelve a reportarlo. Ninguna solicitud del propietario debe descartarse por falta de capacidad.

## Rutina de coordinación
- Al comenzar conversación/sucesión, leer ESTE documento y `LA_JEFA_METODOLOGIA_PERMANENTE.md`, luego verificar GitHub/ramas/issues y documentos por rama.
- Al recibir informe/captura/archivo del propietario, actualizar el registro **en la misma intervención**, primero conservando evidencia y estado pendiente.
- Después de cada commit, entrega, integración, prueba o validación, actualizar la entrada correspondiente; mantener evidencia por SHA y fecha.
- Revisar sistemáticamente todas las entradas ABIERTAS, ordenadas por prioridad y riesgo. Priorizar no significa abandonar las de prioridad menor.
- No cerrar incidencias comunicadas por propietario por un PASS de un trabajador o una revisión de código. Solo la aceptación expresa del propietario cierra la incidencia.
- El registro maestro está en la rama documental. Issues de GitHub pueden enlazarse, pero una issue desactualizada jamás reemplaza este registro hasta reconciliarse.
