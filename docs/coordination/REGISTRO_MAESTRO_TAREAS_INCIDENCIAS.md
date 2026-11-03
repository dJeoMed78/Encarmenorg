# ENCARMEN — Registro maestro de tareas e incidencias

## Aclaración funcional #29 — sesión administrativa y botón π (31/oct/2026)

**Issue #29**, comentario 6552111743: propietario verificó en ficha móvil de Staging que tocar π muestra acciones deshabilitadas aunque previamente había iniciado sesión como administrador. **Pendiente funcional, sin implementación ni pruebas nuevas verificadas.** Requisito: sin sesión válida, π solicita autenticación; con sesión válida, reutiliza acceso y habilita solo funciones autorizadas; vigencia solicitada 30 minutos, con modalidad de expiración por determinar antes de programar. Validar seguridad servidor, no solo UI. No confundir con Issue #30 (indicador π ya aprobado) ni Issue #33 (orden móvil). [Evidencia/requisitos](https://github.com/dJeoMed78/Encarmenorg/issues/29#issuecomment-6552111743).

---


## Convención de memoria Nia por jornada — 31/oct/2026

Para nuevas memorias en Drive, carpeta memoria NIA: usar `NIA-AAAA-MM-DD.md`, con fecha local de México. Ejemplo: `NIA-2026-11-01.md`. La práctica prevista es una conversación por día. Si existe un archivo para la misma fecha pero corresponde a otra conversación, usar sufijos `-02`, `-03`, sin sobrescribir. Conservar sin renombrar NIA1.md a NIA6.md. Mantener continuidad por checkpoint y referencia al archivo previo; no confundir fecha de modificación con memoria activa. Reutilizar el mismo archivo si se activa Nia otra vez en la misma conversación. Pendiente actualizar las instrucciones personalizadas «TU ERES NIA», que aún describen la numeración NIA#. No afirmar que esa configuración se haya cambiado. Sin modificaciones de producción.

---


## Acuerdo de almacenamiento exclusivo Drive + GitHub — 31/oct/2026

Decisión expresa del propietario: **mantener únicamente Google Drive y GitHub como repositorios documentales operativos**. No crear una tercera copia, índice persistente ni proceso de actualización adicional dentro de ChatGPT. Motivo: evitar duplicación de trabajo, demoras, contradicciones y pérdida de la fuente de verdad. **Drive** conserva la memoria narrativa, identidad operativa y metodología transversal de Nia; **GitHub** conserva estados técnicos, incidencias, pruebas y decisiones de ENCARMEN, con respaldo en Drive según las prácticas existentes. El contexto conversacional de ChatGPT puede ayudar durante la sesión, pero no es una nueva fuente oficial ni se debe depender de él como único respaldo. Mantener registro inmediato de nuevos hallazgos/acuerdos/cierres en su fuente correspondiente y verificar la escritura. Este acuerdo reemplaza la propuesta anterior de añadir un índice permanente en ChatGPT. Sin cambios de producción.

---


## Regla de registro inmediato y consulta obligatoria — acuerdo del propietario 31/oct/2026

**Instrucción vigente de Coordinación 01:** No depender de la memoria conversacional para listar pendientes ni reconstruir acuerdos. En cuanto se acuerde un cambio de estado, se compruebe una solución o el propietario apruebe una conclusión, actualizar en esa misma conversación este registro maestro, **sin esperar al cierre de sesión**. Antes de responder «¿qué tenemos pendiente?», consultar este índice y contrastarlo con Issues, PR, pruebas y evidencias nuevas. Conservar todas las incidencias históricas, incluso las concluidas, indicando fecha, fuente, estado, causa, solución y vínculos; no borrar sus antecedentes. Distinguir **fallo funcional pendiente** de **Issue administrativamente abierto**. Si falta evidencia propia, anotarlo como limitación de verificación y no volver a convertir automáticamente el problema en pendiente.

**Disparadores de escritura inmediata (precisión del propietario, 31/oct/2026):** (a) al detectar o recibir una falla, registrar inmediatamente el hallazgo con estado «reportado/no confirmado» si procede; (b) al conversar y acordar su diagnóstico, prioridad o solución, registrar inmediatamente cada cambio comprobable; (c) al corregir, probar o resolver funcionalmente la falla, guardar inmediatamente estado y evidencia; (d) cuando el propietario confirme el cierre, registrar inmediatamente aceptación/cierre sin eliminar el historial. **No esperar una hora, el fin de la sesión ni un resumen posterior.** Antes de cualquier nueva tarea, consultar registros previos para no duplicar trabajo. Si ocurre una imposibilidad técnica para escribir, avisar y no simular persistencia.

**Caso de control:** empresa de prueba ID 20272: propietario confirmó consulta SQL en MariaDB de Staging el 31/oct/2026 y ausencia del registro. **El borrado se considera funcionalmente verificado por el propietario, no un defecto pendiente**. La comprobación SQL independiente desde esta conversación no está disponible; no repetir DELETE ni pedir otra consulta al propietario. Issue #12 puede permanecer abierto por conciliación administrativa, sin implicar regresión. Acceso autónomo de lectura SQL vía GitHub Actions es una tarea técnica **separada**, todavía no implementada ni ejecutada por esta conversación. Una nueva falla reproducible se registra como regresión enlazada, sin borrar la resolución anterior.

**Control de calidad de memoria:** cada actualización debe conservar lo anterior, anotar fuente y momento, y verificarse con lectura posterior al commit. Si no se pudo escribir o comprobar, comunicarlo claramente; no afirmar que quedó guardado. No alterar producción.

---


## ESTADO VIGENTE Y CONTROL DE CONTRADICCIONES — 31/oct/2026

**Esta sección es el índice operativo de consulta PRIORITARIA.** El resto del documento conserva el historial cronológico, incluidos planes y estados antiguos que NO son instrucciones vigentes. **Las cifras históricas NO equivalen a una comprobación actual en MariaDB/Hostinger.**

| Identificador | Síntoma o tarea | Estado real distinguido | Acción permitida / condición para cierre |
|---|---|---|---|
| ENC-F008 / [Issue #5](https://github.com/dJeoMed78/Encarmenorg/issues/5) | Teléfonos/WhatsApp ausentes, hallazgo de octubre | **Histórico, RECUPERACIÓN MASIVA YA DOCUMENTADA COMO REALIZADA** por Jefa 2 y propietario: 174 negocios por base Staging/producción; después 206/207 con contactos en Staging según registro anterior. Issue sigue abierto y contiene texto INICIAL DESACTUALIZADO. No hay evidencia nueva de pérdidas actuales. | **NO repetir restauración ni enviar otra tarea de recuperación.** Comentario rectificativo Issue #5 ID 6548004489. Solicitar al propietario cierre formal si procede; nunca cerrar por iniciativa de la coordinación. |
| ENC-CONTACTS-RECOVERY-003 | Orden posterior de recuperación duplicada | **CANCELADA/OBSOLETA** en Registro Maestro | No asignar ni ejecutar. |
| ENC-F009 / [Issue #6](https://github.com/dJeoMed78/Encarmenorg/issues/6) | Filtros y monitoreo de completitud de contactos | **Mejora PREVENTIVA**, no implica pérdida de números. Issue abierto; implementación/integración/despliegue actual **NO VERIFICADOS** | Conciliar con ramas de trabajo antes de ordenar una implementación; tarea distinta a F008. |
| ENC-STAGING-WRITE-GATE-005 / [Issue #12](https://github.com/dJeoMed78/Encarmenorg/issues/12) — apartado altas/ediciones | Error HTTP 503 | **SOLUCIONADO Y PROBADO en Staging según evidencia histórica**: PR #15/#16 integrados, Actions run 41164661573 con POST 201, PATCH 200 y readback SQL, y controles de aislamiento restaurados. Registro público habilitado por PR #18; alta real de negocio reportada. | **No reabrir HTTP 503 por el mero hecho de que Issue #12 siga abierto.** Sólo reabrir ante un fallo nuevo reproducible. |
| ENC-STAGING-BUSINESS-DELETE-20261030 / [Issue #12](https://github.com/dJeoMed78/Encarmenorg/issues/12) — apartado borrado | Empresa prueba 20272 desapareció del panel sin desaparecer de MariaDB | **Parche PR #20 integrado y atestiguado en Staging.** El propietario informó el 31/oct/2026 que comprobó personalmente en la base de datos que la empresa eliminada ya no aparecía. Evidencia de aceptación funcional comunicada verbalmente; no se cuenta aquí con una nueva consulta SQL independiente preservada. El estado anterior «1 fila» es histórico y anterior a esta comprobación. | No repetir DELETE ni exigir otra comprobación al propietario. Conciliar la evidencia manual ya comunicada con el issue; mantener abierto únicamente hasta autorización expresa de cierre por el propietario. Sin cambios de producción. |
| ENC-STAGING-ADMIN-LOGIN-REGRESSION-001 / [Issue #21](https://github.com/dJeoMed78/Encarmenorg/issues/21) | Acceso cuenta jeo: `signal is aborted without reason` | **ABIERTA, SIN CORRECCIÓN VERIFICADA** tras último reporte del propietario. PR #17 corrigió interfaz/longitud, pero NO comprueba solución de este error posterior. | Primera prioridad funcional: diagnóstico acotado y corrección mínima en rama aislada; proteger credenciales. |
| ENC-STAGING-PUBLIC-MEDIA-001 / [Issue #19](https://github.com/dJeoMed78/Encarmenorg/issues/19) | Formulario público no subió logo ni hasta 10 fotografías | **ABIERTA, DIAGNOSTICADA, IMPLEMENTACIÓN AUTORIZADA A PERPLEXITY** el 31/oct/2026; sin rama/commit/código/pruebas/integración/despliegue todavía. Frontend con handlers desactivados, contrato sin imágenes y bloqueos de POST; además dbSaveUploadedFile usa guardWrite que impide guardar en Staging. | Implementar en `work/enc-staging-public-media-001` desde HEAD de `ia-desarrollo`; usar tabla `uploaded_files` con permiso estrictamente acotado, readback SQL, 1 logo y ≤10 imágenes. Revisión por Coordinación antes de integrar. Issue #19 comentario 6548139960. No mezclar con #21 ni con pérdida de contactos. |
| ENC-SEC-DEPS-20261031-001 / [Issue #22](https://github.com/dJeoMed78/Encarmenorg/issues/22) | 2 avisos npm | **CORREGIDO, PR #23 INTEGRADO Y STAGING VERIFICADO** con `minimatch@11.0.1`, `qs@6.16.1`; Actions 41213892619 y 41214176745. Issue abierto por seguimiento/aceptación, no por vulnerabilidades pendientes en Staging. | No repetir parche ni pruebas de Staging sin nueva alerta. Producción requiere autorización expresa; no cerrar Issue sin propietario. |
| ENC-F001–F007B y ENC-INT-001–006 | Otros reportes históricos y parches parciales | **Historial abierto por conciliación**, con algunos parches implementados en ramas sin integración; no afirmar todos resueltos ni todos aún reproducibles. | Antes de asignar, comparar rama `ia-desarrollo`, PR, SHAs y pruebas, contrastar con reporte del propietario, evitar trabajos duplicados. |

### Reglas obligatorias de control, aplicables a todas las Nia y ejecutores

1. **Antes de dar un pendiente, leer ESTE índice, el registro histórico y la evidencia más reciente en la rama correcta**. No inferir que `Issue abierto = defecto actual no reparado`: separar `reporte/aceptación`, `implementado`, `probado`, `integrado`, `desplegado` y `validado por propietario`. Un PR merged NO prueba por sí solo Staging funcional.
2. **Conciliar contradicciones antes de asignar**: la fecha de un Issue antiguo no prevalece sobre evidencia posterior; transcribir la discrepancia y citar qué la resuelve. La evidencia técnica actual en GitHub/CI/entorno prevalece para hechos técnicos; no presentar una comprobación documental histórica como auditoría SQL actual.
3. Para cada incidente registrar: ID estable, alcance específico, prioridad, ambiente, síntoma, fecha del último hecho, fuente/URL, estado de código, pruebas, integración, despliegue, validación del propietario, encargado, rama/PR, siguiente paso concreto. **No crear otro ID si ya existe la incidencia.**
4. **Control anti-duplicación**: buscar ramas/PR/issues/trabajos anteriores y leer resultados ANTES de delegar. GAS (cuota limitada) y Perplexity son ejecutores propuestos el 31/oct; la tarea no cuenta como enviada ni ejecutada hasta confirmación del propietario o evidencia del ejecutor. El propietario mencionó tres trabajadores, pero no identificó al tercero. No adjudicar automáticamente tareas nuevas.
5. Priorizar solución específica, pruebas proporcionales al riesgo y respaldo/reversión cuando corresponda. Staging es laboratorio bajo aislamiento verificado; no modificar `main`, `encarmen.org` ni datos de producción sin autorización.
6. **Cierre administrativo sólo por propietario**. Si se corrige un dato erróneo en un índice, registrar la rectificación sin eliminar el historial. No clasificar contactos recuperados como nueva pérdida por la persistencia de una descripción antigua.
7. Guardar cambios de estado **reactivamente** tras nueva evidencia, nunca inventar avances o respaldos vacíos. Actualizar esta tabla antes de comunicar un nuevo listado de pendientes o asignar trabajadores.

**Última conciliación:** se detectó el error de coordinación de presentar F008 como pérdida actual; rectificado en Issue #5 y `NIA_INICIO_RAPIDO.md` (commit `224b68ac`). `NIA5.md` es memoria narrativa; este Registro Maestro es el índice técnico oficial.

---



## P1 — ENC-SEC-DEPS-20261031-001: reparar 2 vulnerabilidades moderadas npm

**Prioridad de coordinación: ALTA (P1 seguridad).** [Issue #22](https://github.com/dJeoMed78/Encarmenorg/issues/22). **Estado: corregido y probado, integrado a `ia-desarrollo`, dependencias instaladas/verificadas en Staging. Producción pendiente de autorización.**

- Reporte de escáner (30-oct-2026, 22:55): 2 vulnerabilidades moderadas, 0 altas/críticas.
- Revisión independiente del `package-lock.json` de `ia-desarrollo`: `minimatch@10.2.6` (CVE-2026-118764, objetivo >=11.0.1) y `qs@6.16.0` (CVE-2026-110816, objetivo >=6.16.1). En `package.json` no constan como dependencias directas; verificar cadena transitoria, compatibilidad y dónde se instalan.
- Orden de trabajo futura: identificar rutas de dependencia y exposición, actualizar con una rama aislada, no forzar cambios mayores sin revisar, `npm ci`, `npm audit`, `npm ls`, lint, tests, build, revisión independiente y verificación posterior en Staging. Preservar regresiones de seguridad e integridad; respaldos/rollback. Sin despliegue a producción.
- **Nota histórica de planeación (SUPERADA):** ya se ejecutó el parche y se verificó Staging; conservar como antecedente. Coordinar alcance productivo futuro con incidencias activas #21, #12 y #19, sin intervenir producción sin autorización.


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


## Regreso a Staging — preflight independiente previo a PR #7 (2026-10-30)

Tras cierre confirmado por propietario del hotfix WhatsApp productivo (ver entrada CIERRE VALIDADO), producción queda nuevamente INAMOVIBLE. Candidata `coord/enc-c4-final-001` 28 ahead / 0 behind vs `ia-desarrollo`, 88 archivos, SHA último `9b73f3366a14e34c9200c2f8f6aa0afcb6251c81`; PR #7 draft. El auto-deploy de Hostinger tiene `ia-desarrollo` conectado a `staging.encarmen.org` y el propietario AUTORIZÓ usar Staging como laboratorio, incluso interrupciones temporales, con respaldo proporcional y exclusión de producción.

Por el incidente previo de GAS preview alcanzando BD productiva, Coordinación creó comprobación aislada `coord/staging-db-preflight-20261030`, workflow `.github/workflows/enc-staging-db-preflight.yml`, commit `824f852ed9597d30e8835fc94c0ce04734c5ff65`. Comprueba por SSH seguro exclusivamente lectura del archivo de configuración local de Staging, sin imprimir secretos: `APP_ENV=staging`, `DB_NAME=u293982346_encarmentest`, usuario diferente al productivo, host y password configurados; registro previsto en `ENC_STAGING_PREFLIGHT_RESULT.txt` de rama aislada. **Sin resultado al publicar**; no atribuir PASS hasta leerlo. Si no hay archivo, buscar configuración equivalente por mecanismo Hostinger sin asumir seguridad; si PASS y respaldo confirmado, avanzar integración PR #7 / build / test de Staging, sin entrar a producción. No ejecutar SQL/DDL ni cambios productivos.


## INTEGRACIÓN EJECUTADA — PR #7 a ia-desarrollo (2026-10-30)

**EJECUCIÓN CONFIRMADA EN GITHUB.** PR #7 `coord/enc-c4-final-001` → `ia-desarrollo`, candidato HEAD `9b73f3366a14e34c9200c2f8f6aa0afcb6251c81`, base previa `0d231cb2779b7a14d8d336fc2f4de3782663c738`, 28 commits/88 archivos; marcado listo y fusionado exitosamente con commit merge `4407e6aeb08b52cc750c952735467a0e04fe19cc`. GitHub comprobó que `ia-desarrollo` coincide con SHA de merge. **`main`/producción sin modificaciones.**

**Preflight real Hostinger por SSH antes del merge:** informe `ENC_STAGING_PREFLIGHT_RESULT.txt` en rama `coord/staging-db-preflight-20261030`, 2026-10-30T15:45:49Z: huella SSH verificada, conexión correcta, configuración `hbuilds/config/.env` localizada, `DB_NAME_IS_STAGING=yes`, `DB_NAME_IS_PRODUCTION=no`, `DB_USER_IS_PRODUCTION=no`, host/password presentes, `STAGING_READ_ONLY=yes`, pero `APP_ENV_IS_STAGING=no`, preflight inicialmente bloqueado. Código `src/db/mariadb.ts` reconoce Staging también por base exacta y prohíbe escrituras generales con `STAGING_READ_ONLY=true`. El propietario autorizó integrar y tolerar interrupciones de Staging con producción inamovible.

**Remediación exitosa antes de registrar el merge como verificado en Staging:** Action aislada `coord/staging-env-guard-fix-20261030`, workflow `.github/workflows/enc-staging-env-guard-fix.yml`, commit `f4ed190580d96f9e330c1f80cc45abfe35a51a44`, resultado SSH `ENC_STAGING_ENV_FIX_RESULT.txt` de las 15:55:38 UTC: `SSH_FINGERPRINT=VERIFIED`, `ENV_BACKUP=CREATED_PRIVATE`, `APP_ENV=UPDATED_TO_STAGING`, `STATUS=PASS`, `SSH_EXIT_STATUS=0`. Solo archivo `.env` Staging respaldado y marcador ajustado; sin SQL ni cambios de producción.

**Verificación posterior en ejecución:** rama anterior recibió workflow `.github/workflows/enc-staging-release-check.yml`, commit `34a9f2b19020f86f4fc11148c328706a06817e80`; intenta registrar `ENC_STAGING_RELEASE_CHECK_RESULT.txt`, comparando HTTP pública, symlink, Vite, backup SQL y APP_ENV sin leer secretos. Al momento de esta entrada el reporte aún no existía, por lo que despliegue automático Hostinger **NO ESTÁ VALIDADO TODAVÍA**. No afirmar funcionalidad real ni cierre de incidencias sin prueba. Próximo objetivo: verificar build/despliegue del merge, portal web, flujo de registros, reportes, promociones, teléfonos y móvil; clasificar fallos nuevos concretos y corregir solo en `ia-desarrollo` / Staging.


## STAGING PUBLICADO EN HOSTINGER — C4 PR #7 (2026-10-30)

**Evidencia proporcionada directamente por propietario:** captura de historial de despliegues de Hostinger para `staging.encarmen.org` que muestra rama `ia-desarrollo`, commit `4407e6ae` (merge completo `4407e6aeb08b52cc750c952735467a0e04fe19cc`), fecha 2026-10-30 09:57:29, estado `Se ha completado` y etiqueta `Actual`. Coordinación confirmó `ia-desarrollo` coincide con SHA merge sin commits posteriores. **Estado formal: INTEGRADO EN GITHUB Y DESPLEGADO EN STAGING SEGÚN HOSTINGER.** No equivale a validación funcional de navegador, API ni datos reales; mantener incidencias funcionales abiertas hasta pruebas/aceptación.

SSH preflight anterior de Staging: `APP_ENV=staging` corregido con respaldo privado, `STAGING_READ_ONLY=yes`, BD configurada de Staging. Workflow de verificación SSH de versión creado en `coord/staging-env-guard-fix-20261030` pero `ENC_STAGING_RELEASE_CHECK_RESULT.txt` aún no aparece; no se dispone de su resultado. Consultas públicas vía web/contendor no pudieron recuperar la URL (fallo de acceso/DNS en herramientas), sin inferir indisponibilidad para usuarios. **Siguiente acción autónoma:** comprobaciones funcionales acotadas de lectura (HTTP/API, contactos y pantallas de móvil), verificar datos sin escrituras mientras Staging esté read-only; tras ello habilitar de manera controlada pruebas de escritura solo con identidad DB comprobada. Jamás tocar `main` ni producción.


## STAGING — Home visible en navegador, validación del propietario (2026-10-30)

**Evidencia proporcionada por el propietario:** captura de navegador en `https://staging.encarmen.org`, posterior al despliegue exitoso por Hostinger del SHA `4407e6aeb08b52cc750c952735467a0e04fe19cc`. Se observa renderizado de encabezado/nav, hero/buscador, tarjeta de promoción Hair Palace Keratin (18% OFF), cartelera de eventos, barra de comunidades WhatsApp y listado con contador textual `Mostrando 30 de 207 empresas`. **Clasificación:** DISPONIBILIDAD VISUAL DE HOME CONFIRMADA por propietario; no equivale a healthcheck completo, persistencia SQL comprobada ni a pruebas de registrar/editar/contactos/reportes/promociones/móvil. No asumir exactitud de 207 ni que el sitio funciona íntegramente solo porque renderiza.

**Siguiente secuencia coordinada:** inspección HTTP/API no destructiva de staging, verificar datos visibles y teléfono WhatsApp con casos reales, probar autenticación/registro solo cuando los guardas y base de Staging estén verificados, y emitir incidencias detalladas para corrección en `ia-desarrollo`. No tocar `main` ni entorno de producción.


## AUDITORÍA HTTP REAL DE STAGING — 2026-10-30

**Trabajo autónomo efectuado por Coordinación:** GitHub Actions en rama `coord/staging-functional-audit-20261030` consultó **realmente** (UTC 16:07:28) `https://staging.encarmen.org`, con métodos GET exclusivamente, sin SSH de escritura, SQL, modificaciones ni datos personales divulgados. Script audit `.github/workflows/enc-staging-functional-audit.yml`, resultado agregado versionado `ENC_STAGING_FUNCTIONAL_AUDIT_RESULT.txt`, disponible en esa rama.

**Resultados:** home `/` HTTP 200 HTML; `/api/health` HTTP 200 JSON `status=ok`; `/api/version` HTTP 200 JSON frontend version available; `/api/businesses` HTTP 200, cabecera `X-Encarmen-Business-Source=mariadb`, 207 empresas; 206 números de teléfono y 206 WhatsApp *según validador inicialmente más permisivo que el producto*; 1 sin ambos según validador inicial. Consulta filtrada `hasPhone=true` devuelve 206; `hasWhatsapp=true` devuelve 205. Hay discrepancia 206/205 en WhatsApp a **reconciliar aplicando exactamente las reglas de `contactDigits` del frontend** (la primera prueba solo extrajo dígitos y pudo aceptar formatos prohibidos por el código). El origen MariaDB declarado por el servidor no prueba de manera independiente conexión SQL, pero endpoint confirma fuente declarada y disponibilidad. Hair Palace Keratin está en el catálogo. No hay valores `whatsapp` con prefijo literal `5252` detectados en el conjunto. `/api/promotions` HTTP 200 y count 1, `/api/events` HTTP 200 count 11, `/api/reports` HTTP 401 y `/api/database-status` HTTP 401 sin sesión (protecciones de acceso observadas). Sin pruebas de guardado/formulario ni browser móvil todavía. **No declarar incidente por discrepancia mientras el validador difiera del del producto.**

**Siguiente auditoría disparada:** commit `55dbf58e82529c921135fa188d87ff7ed74f98c4` en la rama de auditoría actualizó verificador para aplicar regex/normalización equivalente a `src/utils/businessContacts.ts:contactDigits`, y reporta cantidad de entradas descartadas por formato. Al momento de registrar todavía no había segundo resultado. No tocar `main`; ambiente Staging validado por Hostinger SHA `4407e6ae`.


## CIERRE DE DISCREPANCIA — auditoría de contacto WhatsApp Staging (2026-10-30)

**Evidencia HTTP real corregida:** auditoría `coord/staging-functional-audit-20261030/ENC_STAGING_FUNCTIONAL_AUDIT_RESULT.txt` del 2026-10-30 16:09:41 UTC, usando validador acorde a `src/utils/businessContacts.ts:contactDigits` (segundo intento del validador tuvo error de escape regex y produjo ceros espurios; se corrigió y se volvió a correr). Resultados estables: `/api/businesses` **207 empresas**, **206 teléfonos válidos**, **205 WhatsApp válidos**, **1 empresa sin ninguno**, y **1 registro WhatsApp adicional con diez dígitos extraíbles pero sintaxis no admitida**. El filtro `/api/businesses?hasWhatsapp=true` devuelve **205**, por lo que coincide con las reglas actuales de producto; **NO ES ERROR DEL FILTRO**. El filtro `hasPhone=true` devuelve **206**, igualmente coincide. **Incidencia de calidad de dato individual, abierta**, pendiente identificación de empresa y revisión/normalización segura del WhatsApp no válido; nunca reemplazar un teléfono por suposición ni escribir en producción. No confundir validación sintáctica con titularidad o funcionamiento del WhatsApp real.

**Salud pública:** GET `/`, `/api/health`, `/api/version`, `/api/businesses`, `/api/promotions`, `/api/events` HTTP 200; versión frontend disponible; `/api/reports` y `/api/database-status` **401 anónimo**; 1 promoción y 11 eventos. Son comprobaciones de consulta, NO pruebas de grabación, administración, registro ni mobile. Workflow de diagnóstico público de solo lectura creado bajo la rama de auditoría; sin cambios en `ia-desarrollo`, `main`, Hostinger ni datos.

**Localización del dato irregular:** workflow actualizado en commit `971cdb3e4284bdf313db4feb25186609a4344d4b` para reportar únicamente nombre público de empresa y caracteres no numéricos (jamás número completo); al registro aún no se dispone de su corrida. Próximo trabajo: corregir esa ficha a través de proceso autorizado de Staging y probar flujos de escritura solamente después de aislamiento/destino y backup acreditados.


## HALLAZGO CONCRETO STAGING — Hair Palace Keratin WhatsApp como URL (2026-10-30)

**Dato confirmado en respuesta HTTP REAL de Staging, sin publicar el número**: la auditoría de lectura de 2026-10-30T16:10:30Z (`coord/staging-functional-audit-20261030/ENC_STAGING_FUNCTIONAL_AUDIT_RESULT.txt`) identificó que **Hair Palace Keratin** es el único de 207 negocios cuyo campo `whatsapp` tiene cantidad plausible de dígitos pero **sintaxis rechazada por `contactDigits`**; los caracteres adicionales detectados incluyen `./:=?acdehimnopstw`, consistentes con una **URL de WhatsApp** en vez del número crudo. No fue necesario imprimir el teléfono. `hasWhatsapp=true` devuelve 205; 205 contactos pasan regex estricta, 206 teléfonos válidos; existe 1 negocio sin contacto válido. Esto explica exactamente la diferencia entre conteo heurístico inicial 206 y conteo real 205. **No supone daño de datos ni error del filtro.**

**Prioridad siguiente y límites:** validar destino exacto de URL registrada de Hair Palace sin divulgar información personal o alterar producción; para reparar solo la fila de Staging, preparar respaldo de BD, identidad SQL confirmada, SELECT por ID único, actualización condicionada a contenido original y lectura posterior, rollback garantizado; no tocar `encarmen.org` ni tabla productiva. Alternativa de código: normalización de enlaces legítimos de WhatsApp por ruta controlada, no aceptación arbitraria de URLs en campo de teléfono. Mantener incidencia abierta hasta prueba visible real y propietario. El dato productivo de Hair Palace ya quedó corregido y cerrado de manera independiente; no reabrir producción.


## STAGING HAIR PALACE — REPARACIÓN MARIADB CONFIRMADA (2026-10-30)

El propietario autorizó continuar autónomamente. Se creó workflow protegido exclusivamente Staging `.github/workflows/enc-staging-hair-contact-fix.yml` en rama `coord/staging-hair-contact-fix-20261030`, inicialmente commit `1b10b2aa11e4f510a2a68d455750d8e586741295`. La primera versión del workflow contenía un error YAML de nombre de paso no entrecomillado, corregido en commit `2f8a0e650954b070686558d4e9cd6d443d6cdbb4`. La ejecución correcta publicó `ENC_STAGING_HAIR_FIX_RESULT.txt`, UTC 2026-10-30T16:24:10Z. Evidencia: `SSH_FINGERPRINT=VERIFIED`, `DATABASE_IDENTITY=STAGING_ONLY_CONFIRMED`, `PRECHANGE_BACKUP=CREATED_AND_VERIFIED`, `RESULT=UPDATED_AND_READBACK_VERIFIED`, `SSH_COMMAND_EXIT_STATUS=0`. SHA-256 del respaldo `924e7829966a3baece4ead1e7049cc541a2a0140a52b01809e5490da3ea21781`. Operación: una sola fila cuya URL WhatsApp corresponde exactamente al número confirmado del negocio, normalizada a 10 dígitos en columna `whatsapp` y `raw_data.whatsapp` si correspondía; WHERE condicionado a la cadena anterior; verificación posterior de las dos representaciones. **No hubo cambios en `main` ni BD producción**, ni despliegue de código. 

**Estado:** REPARACIÓN PERSISTENTE VERIFICADA EN MARIADB STAGING; falta validación HTTP pública posterior y aceptación visual. No afirmar hasta GET que el filtro `hasWhatsapp=true` cambió de 205 a 206. Se intentó disparar nueva auditoría HTTP modificando su workflow pero la herramienta bloqueó esa llamada, así que no hay segunda corrida publicada. Próximo objetivo: comprobar respuesta pública y revisar condiciones de aislamiento/flags para pruebas reales de alta y edición empresarial. No habilitar escrituras generales ni modificar producción.


## STAGING 2026-10-30 — CONTACTO CORREGIDO Y PRUEBAS DE SEGURIDAD DE REGISTRO/EDICIÓN

**Corrección Hair Palace Keratin FINALIZADA en Staging:** `ENC_STAGING_HAIR_FIX_RESULT.txt` rama `coord/staging-hair-contact-fix-20261030` UTC 16:24:10: identidad de BD `u293982346_encarmentest` verificada; respaldo SQL privado creado e integridad SHA256 comprobada; UPDATE de una sola fila con WHERE del valor original; relectura de `whatsapp` y `raw_data` confirmó `RESULT=UPDATED_AND_READBACK_VERIFIED`. No hay cambio en producción ni `main`. **HTTP público posterior:** workflow `coord/staging-registration-write-safety-20261030/.github/workflows/enc-staging-write-guard-check.yml` commit `76a86c4eae439165b0619816a8a7ebd330ca7e31`, archivo `ENC_STAGING_WRITE_GUARD_RESULT.txt` UTC 16:26:42: `GET /api/businesses?hasWhatsapp=true` HTTP 200 y count **206** (antes **205**), `HAIR_PALACE_WHATSAPP_INCLUDED=True`; `GET /api/businesses?hasPhone=true` HTTP 200 y count 206. **Incidencia de contacto cerrada técnicamente en Staging**, pendiente solo aceptación visual de propietario si desea.

**Prueba de protección de escrituras reales (no persistencia):** mismo audit HTTP intentó `POST /api/public/business-registrations` con objeto vacío → HTTP **403** (Staging read-only) y `PATCH /api/businesses/encarmen-preflight-nonexistent-id` con objeto vacío → HTTP **401** (autenticación requerida). En ambos casos **no hay evidencia de operación de escritura realizada**. El script marcó `WRITE_GUARD_UNEXPECTED_STATUS=yes` por esperar 403 para PATCH, aunque 401 también bloquea correctamente sin autenticación; interpretar como **criterio excesivamente estrecho del script**, no como vulnerabilidad. No sustituirlo por una prueba real de persistencia.

**Preparación independiente de persistencia:** workflow de inspección solo lectura `coord/staging-write-readiness-20261030/.github/workflows/enc-staging-write-readiness.yml`, commit `341b21af9944107f3cc149e4e84799f11bc3cde3`, ejecutado y publicado como `ENC_STAGING_WRITE_READINESS_RESULT.txt` (UTC 16:29:31). Confirmado SSH hacia base **Staging solamente**, `APP_ENV=staging`, `STAGING_READ_ONLY=true`; `STAGING_DB_CONFIRMED=false`, `STAGING_BUSINESS_WRITES_ENABLED=false`, **sin hash de contraseña administrativa de Staging**, **tabla `encarmen_environment_marker` no legible/presumiblemente ausente**, sin privilegios productivos obvios y sin visibilidad del esquema de producción. `ENABLE_WP_SYNC` y `STAGING_ALLOW_SCHEMA_INIT` inactivos. El controlador fail-closed bloquea altas/ediciones hasta tener marca de entorno y credenciales administrativas de Staging. **NO habilitar escrituras ni crear tabla marcador de forma implícita**: crear tabla sería DDL/migración y proyecto requiere autorización específica, aunque la finalidad es Staging. Nunca administrar contraseñas en texto plano en GitHub. Siguiente etapa bajo autorización específica: inspeccionar estructura/grants completos (solo lectura), preparar respaldo/rollback, DDL **solo marcador de aislamiento en BD Staging**, configurar credencial administrativa temporal segura exclusivamente Staging y habilitar únicamente carril empresarial; ejecutar alta/edición de negocio sintético con relectura, limpiar únicamente el dato de prueba y restablecer modo lectura. No tocar producción.


## STAGING — TABLA DE MARCA DE ENTORNO CREADA Y VERIFICADA (2026-10-30)

**Ejecución real y verificable** solicitada tras instrucción de autonomía del propietario: rama aislada `coord/staging-marker-init-20261030`, script de operación `ops/coord/staging_marker_setup.py` commit `fd6ca6fcb88db08ffb4e0be638fa2432365021a4`, workflow `.github/workflows/staging-marker-controlled.yml` commit `c6e210c652bbed07086e87328ee5fb1ebdc5d4b8`. GitHub Actions generó `ENC_STAGING_MARKER_RESULT.txt` (revisado directamente): `MARKER_EXECUTION_START=true`, `SSH_PIN=VERIFIED`, `STAGING_IDENTITY=VERIFIED`, `BACKUP=VERIFIED`, `RESULT=CREATED_AND_READBACK_VERIFIED`, `SSH_EXIT=0`. Creó `encarmen_environment_marker` exclusivamente dentro de MariaDB `u293982346_encarmentest`, con una fila `staging / u293982346_encarmentest`, después de verificar identidad SQL, usuario no productivo, ausencia de visibilidad del esquema productivo y backup comprimido probado. **Producción y rama `main` sin modificaciones.** El documento no reproduce secretos ni nombres de archivos privados de respaldo.

**Siguiente operación iniciada:** volvió a dispararse la inspección read-only del carril de registro/edición en `coord/staging-write-readiness-20261030` (commit `b30ff3d65f4b510b8a59e3f7833deddb7548853c`). Debe comprobar `MARKER_STAGING_EXACT=true`; faltan preparar hashes de administrador del entorno de pruebas y flags `STAGING_DB_CONFIRMED` y `STAGING_BUSINESS_WRITES_ENABLED`. No habilitar hasta comprobar privilegios efectivos y disponibilidad de respaldo/reversión, sin usar datos productivos.


## AUDITORÍA PERPLEXITY RECIBIDA — REVISIÓN INDEPENDIENTE DE COORDINACIÓN (2026-10-30)

**Informe recibido:** ENC-STAGING-WRITE-AUDIT-PERP-20261030, base `ia-desarrollo` SHA `4407e6aeb08b52cc750c952735467a0e04fe19cc`, únicamente lectura estática, sin cambios ni pruebas reales. Identificó correctamente guardas de escritura y aislamiento, pero declaró **NO REVISADO** `src/server/adminSecurity.ts` y no inspeccionó íntegramente `src/db/mariadb.ts` ni `src/utils/businessContacts.ts`, por lo que sus advertencias de CSRF/cookies son hipótesis, no vulnerabilidades demostradas.

**Comprobación independiente de Coordinación del código realmente desplegado:**
- `src/server/adminSecurity.ts` (blob `b369bf9138e6640965e9b18b5dd46f98d70b8af4`) registra `/api/admin/login`, exige origen coincidente cuando hay cabecera `Origin`, acepta `application/json` con límite 2kb y emite **token aleatorio** (32 bytes) en JSON; sesiones guardadas en mapa de memoria, token requerido en cabecera `X-Encarmen-Admin-Token`, comparación por HMAC-SHA256 con clave de proceso, expiración máxima 6 horas, rate limit de 5 intentos/minuto por IP para login, cierre de sesión y validación de permisos por ruta. **No hay cookie de sesión administrativa** creada por este módulo. Al reiniciar proceso las sesiones expiran (no persisten). Por tanto NO afirmar falta de `SameSite` o vulnerabilidad CSRF por cookies: esa premisa no aplica a este mecanismo concreto. Debe revisarse el comportamiento de clientes y política de origen ante solicitudes sin `Origin`.
- El proveedor ACTIVO en `server.ts` se crea mediante `environmentAdminProvider(process.env)`, que exige **`ENC_ADMIN_CREDENTIALS_JSON`** (cuentas con hash scrypt) y `ENC_ADMIN_PUBLIC_ORIGIN` HTTPS. Los hashes `STAGING_ADMIN_Y_SCRYPT`/`STAGING_ADMIN_J_SCRYPT` pertenecen a `verifyStagingAdmin()` en `src/server/stagingBusinessSecurity.ts`; el informe Perplexity se basó en esa función pero **no demostró su uso en el login principal actual**. Verificar wiring antes de crear nuevas credenciales; no activar variables basadas solo en ese informe.
- `server.ts` continúa teniendo CORS permisivo `Access-Control-Allow-Origin: *` y eliminación de `X-Frame-Options`; **riesgo de superficie CORS real**, pero no equivale automáticamente a CSRF de cookie porque la autenticación requiere token custom y origin guard; requiere auditoría independiente de cliente y seguridad contra clickjacking.
- `adminSecurity` y guardas Staging requieren permisos `business:manage`, flags y verificaciones SQL. Informe no probó persistencia real.
- **Decisión:** NO habilitar escrituras empresariales todavía. Siguiente orden de Coordinación: auditar origen/permiso real de `ENC_ADMIN_CREDENTIALS_JSON`, privilegios SQL mínimos y cliente, implementar restricciones necesarias sobre `ia-desarrollo` en rama controlada, probar aislamiento y guardado sintético, rollback a read-only; proteger producción siempre.

**Evidencia de informe original:** texto proporcionado por propietario en conversación del 2026-10-30. No se publica ninguna credencial ni dato personal.


## GAS — AUDITORÍA VISUAL/HTTP RECIBIDA Y EVALUADA (2026-10-30)

**Entrega recibida:** ENC-STAGING-UX-GAS-20261030, auditoría de W3 GAS de lectura HTTP/estática de `ia-desarrollo` SHA `4407e6aeb08b52cc750c952735467a0e04fe19cc`; sin POST, sin preview Node, sin cambio. Auditor declara GET públicos con `/api/health` HTTP 200 (`environment=staging`, `readOnly=true`, `database=mariadb`, 207 negocios); `/api/businesses/1081` 200; redirección `/empresa/1081` 301 a `/empresa/yuss`, esta 200; promociones 1, clasificados públicos 0 y `allStatus=true` 10 en papelera; `/api/admin/verify` 401; interfaz y móvil revisados **estáticamente**, no navegador móvil real. GAS afirma 206 teléfonos y WhatsApp, compatible con prueba independiente GitHub Actions posterior a reparación Hair Palace.

**Evaluación coordinación y precisión:**
1. Clasificados vacíos: 10 registros en `trash` según GET de GAS, antigüedad superior a 7 días según diagnóstico del auditor. **No restaurar ni reescribir fechas sin política de negocio**; distinguir expiración por lectura derivada frente a mutación SQL real.
2. Incompatibilidad de assets: GAS informa que Staging sirve `/assets/index-CE3sQWlp.js` y `ia-desarrollo/dist/index.html` rastreado referencia `/assets/index-Ccl-Kv-t.js`; se verificó con GitHub que este último nombre existe en `dist/index.html` fuente en dicha rama. **La diferencia de hashes no prueba por sí misma que despliegue Hostinger PR7 se haya omitido**: puede recompilar Vite y emitir otro hash, y Hostinger ya confirmó despliegue de commit 4407e6ae. Pendiente comparación HTTP de contenido/compilación o versión de release SHA proveniente del servidor, no afirmar servidor antiguo hasta confirmarlo.
3. Botón `Ayuda en línea` usa posicionamiento flotante que **podría** cubrir acciones móviles pequeñas, sin screenshot ni prueba de superposición real; no clasificar como bug confirmado.
4. GAS no probó persistencia de alta ni edición y `OPTIONS` solo acredita preflight/CORS, **NO** la capacidad operativa de `POST`.
5. Recomendación GAS de publicar PR7 está desactualizada: ya fue integrado y Hostinger completó el despliegue en Staging; no repetir deployment ni tocar `main`.

**Decisión:** aceptar como auditoría parcial de GET y revisión estática, conservar clasificados y discrepancia de bundle como elementos abiertos para confirmación, no aplicar restauraciones ni cambios de expiración ni volver a desplegar por inferencia. Para persistencia empresarial, mantener activa verificación de permisos, proveedor `ENC_ADMIN_CREDENTIALS_JSON` y guardas antes de abrir escrituras. Producción inmutable.


## STAGING — PRUEBA SQL REAL INSERT/UPDATE/ROLLBACK, SIN PERSISTENCIA RESIDUAL (2026-10-30)

Coordinación realizó primero comprobación efectiva no destructiva (rama `coord/staging-write-go-no-go-20261030`, `ENC_STAGING_WRITE_GATE_RESULT.txt`, UTC 17:47:17): `SQL_IDENTITY=STAGING_ONLY`, `STAGING_MARKER_VALID=true`, tabla `businesses` `InnoDB`, privilegios `INSERT`, `UPDATE`, pero también `DELETE` presentes en el usuario SQL; los últimos resultan excesivos para un usuario temporal mínimo. **Proveedor operativo no preparado:** `ADMIN_ORIGIN_IS_STAGING=false`, `ACTUAL_ADMIN_PROVIDER_READY=false`; `STAGING_READ_ONLY=true`, `STAGING_DB_CONFIRMED=false`, `STAGING_BUSINESS_WRITES_ENABLED` ausente. No alterar producción ni habilitar escrituras HTTP todavía.

En respuesta a necesidad explícita del propietario de resultados tangibles, Coordinación ejecutó **prueba SQL de una sesión real con transacción explícita**, conexión exclusiva `u293982346_encarmentest`, marcador de entorno comprobado, `INSERT` sintético con ID único y estado `draft`, `UPDATE` de descripción y consultas de confirmación, `ROLLBACK` y lectura verificando ausencia final; no se publicó empresa ficticia. Script `ops/coord/staging_transaction_probe.py` commit `6308fd82a8a4746db38a59f128610de8247eb441`, workflow `.github/workflows/enc-staging-sql-transaction.yml` commit `90665d1dac3f6191951fc45b9953299b8e9761ca`, resultado GitHub `ENC_STAGING_SQL_TRANSACTION_RESULT.txt` UTC 17:49:03: `SSH_FINGERPRINT=VERIFIED`, `SQL_CONNECTION=STAGING_ONLY`, `SQL_SCRIPT_EXIT=0`, `INSERT_VERIFIED=true`, `UPDATE_VERIFIED=true`, `ROLLBACK_VERIFIED=true`, `RESULT=PASS_TRANSACTION_ROLLED_BACK`, `SSH_EXIT=0`.

**Alcance exacto:** prueba SQL real de transacción y reversión, no validación HTTP de registro/edición ni persistencia postcommit. No dejar escrituras públicas habilitadas. Próximo paso: proveedor `ENC_ADMIN_CREDENTIALS_JSON` exclusivamente Staging con cuenta efímera, origen HTTPS y privilegios acotados, reinicio controlado Staging y prueba HTTP con tokens, lectura de regreso y limpieza; documentar/realizar rollback y restauración de read-only. El uso de W1/W2 permanece reservado.


## STAGING HTTP END-TO-END — BLOQUEO DE INSTANCIA TEMPORAL Y SIGUIENTE INTERVENCIÓN (2026-10-30)

Tras autorización del propietario para finalizar pruebas empresariales, Coordinación investigó de manera independiente el proceso real de Hostinger. Rama `coord/staging-runtime-map-20261030`, workflow `.github/workflows/enc-staging-runtime-map.yml`, evidencia `ENC_STAGING_RUNTIME_MAP_RESULT.txt`: `pm2`, `node` y `npm` NO disponibles como comandos en SSH ordinario, pero hay procesos Node vivos con CWD exclusivamente `domains/staging.encarmen.org/hbuilds/versions/<identificador>/nodejs`, donde se encuentran `server.js`, `index.js`, `dist`, `package.json` y `node_modules`. Dos procesos Node pertenecen a Staging y otros procesos pertenecen a sitios diferentes; NO usar reinicios globales ni asumir PM2.

**Pruebas temporales reales:** rama `coord/staging-http-persistence-test-20261030`, script `ops/coord/staging_ephemeral_http_probe.py`, workflow `.github/workflows/enc-staging-http-persistence-probe.yml`, evidencia `ENC_STAGING_HTTP_PERSISTENCE_RESULT.txt`. Se comprobó `SQL_IDENTITY=STAGING_ONLY` y ejecutable Node en el build de Staging, sin alterar `.env` público. Se creó una instancia Node temporal con cuenta administrativa efímera, controles `STAGING_DB_CONFIRMED`/`STAGING_BUSINESS_WRITES_ENABLED` y token de sesión solo en ese proceso. Se intentó consultar por localhost desde Python (sin proxy) y después desde el propio proceso Node (fetch interno). Aunque Node imprimió dirección de escucha en el puerto esperado, ambas consultas HTTP fallaron (Python `ECONNREFUSED 111`; Node `NODE_LOOPBACK_UNAVAILABLE`). Última corrida UTC 18:16:43: `INPROCESS_HTTP_READY=false`, `CREATE_HTTP_STATUS=missing`, `EDIT_HTTP_STATUS=missing`, `RESULT=BLOCKED_HTTP_INPROCESS_FAIL`, `TEMPORARY_PROCESS=CLOSED`, `PUBLIC_STAGING_CONFIG=UNCHANGED`. **No se creó empresa de prueba. No se demostró persistencia vía HTTP.** No reportar como código defectuoso, pues el montaje del proceso Node fuera del administrador Hostinger puede explicar el fallo.

**Próxima intervención precisa:** identificar en panel Hostinger el control de reinicio/arranque administrado de la **aplicación Node del subdominio Staging** (pedir captura de pantalla de la ficha de aplicación, ocultando secretos), sin acceso a producción. Antes de cambiar `.env`, confirmar mecanismo reversible de reinicio solo Staging; preparar respaldo de configuración, proveedor real `ENC_ADMIN_CREDENTIALS_JSON` y `ENC_ADMIN_PUBLIC_ORIGIN=https://staging.encarmen.org`, restringir permisos SQL a mínimo viable cuando sea posible y habilitar exclusivamente negocio. Probar GET/POST/PATCH en el Staging real con autenticación temporal y SQL readback, borrar solo datos sintéticos, restablecer read-only, segundo reinicio Staging, volver a probar bloqueos. Ningún despliegue o señal de parada sobre procesos de producción.


## W5 — VALIDACIÓN NODE 22 Y PR DE INTEGRACIÓN PREPARADO (2026-10-30)

**Tarea:** ENC-STAGING-HTTP-E2E-CLOSURE-001. W5 entregó rama `work/enc-staging-http-e2e-closure-001`, SHA `07d90c1bc4726c3088d815d922b1951bf5ccc736`. Coordinación inspeccionó el código de readback antes de COMMIT, el harness HTTP con MariaDB desechable y evidencia de reproducción/corrección del falso éxito. Dictamen: `docs/coordination/REVIEW_ENC_STAGING_HTTP_E2E_CLOSURE_001.md`.

**Verificación independiente ejecutada en GitHub Actions, Node 22.23.4:** rama aislada `coord/enc-w5-node22-validation-001`, archivo `ENC_W5_NODE22_VALIDATION_RESULT.txt` UTC 20:04:44Z. `LOCK_REPAIR_EXIT=0`, `NPM_CI_EXIT=0`, `LINT_EXIT=0`, `BUILD_SERVER_EXIT=0`, `JSDOM_INSTALL_EXIT=0`, `REGRESSIONS_EXIT=0`, `HTTP_E2E_EXIT=0`, `SIGKILL_RECOVERY_EXIT=0`. El primer intento de regresiones no había instalado `jsdom` y devolvió exit 1; se corrigió únicamente la preparación de dependencias auxiliares y la repetición terminó PASS. La actualización del `package-lock.json` en rama aislada consistió en una línea añadida y una eliminada y permitió `npm ci` satisfactorio. No se accedió a Hostinger ni a producción; la base Docker es desechable, no la base pública de Staging.

**PR #10 DRAFT:** https://github.com/dJeoMed78/Encarmenorg/pull/10; base `ia-desarrollo`, cabeza `coord/enc-w5-node22-validation-001`, `mergeable=true` a la última comprobación. **NO FUSIONADO, NO DESPLEGADO**, dado que un merge hacia `ia-desarrollo` dispara despliegue automático Hostinger. Requiere decisión expresa de Coordinación/propietario sobre publicar candidato y ventana de comprobación en Staging. La incidencia empresarial sigue ABIERTA: demostrar alta/edición en el Staging público, verificación independiente SQL y limpieza segura, confirmar SHA ejecutado, restaurar protección y solicitar validación al propietario. No tocar `main` ni producción.


## PR #10 — INTEGRADO Y CORRECCIÓN COMPILADA CONFIRMADA EN STAGING (2026-10-30)

**Autorización del propietario:** `ia-desarrollo`, `staging.encarmen.org` y MariaDB `u293982346_encarmentest` son el laboratorio de Jefa 3, con facultad de integrar y desplegar candidatos técnicamente revisados y probar en seguridad, sin nuevas microautorizaciones. Una vez concluida la implementación total y validada físicamente por el propietario, únicamente una **orden expresa futura** podrá permitir publicar a `main`, `encarmen.org` y base productiva. Identidad/continuidad de Jefa 3 en `docs/coordination/JEFA3_IDENTIDAD_Y_CONTINUIDAD.md`.

**Integración real:** PR #10 de `coord/enc-w5-node22-validation-001` a `ia-desarrollo` fusionado por Coordinación, commit `667682fe953c94c65c90777a7ee75a6451b824ff`; GitHub comparó HEAD idéntico a ese commit, PR estado `merged=true`. Pruebas independientes Node 22 antes de fusionar: `npm ci`, lint, build, regresiones, HTTP+MariaDB efímera y recovery SIGKILL, todo EXIT 0 (evidencia `ENC_W5_NODE22_VALIDATION_RESULT.txt`). `main` sin operaciones.

**Verificación de despliegue Staging:** workflow read-only `coord/staging-runtime-map-20261030`, `ENC_STAGING_RUNTIME_MAP_RESULT.txt` UTC 20:21:11 confirma nuevo cwd del único proceso activo Staging en `hbuilds/versions/.../nodejs`; **`ACTIVE_STAGING_SERVER_FILES=1` y `ACTIVE_STAGING_STRICT_READBACK=true`**, detectando en el bundle compilado las nuevas rutinas `BUSINESS_READBACK_FAILED` y `matchesWrittenValues`. Esto demuestra que la nueva lógica compilada de readback se está ejecutando en Staging, aunque no constituye por sí mismo atestación criptográfica del SHA completo del release. Auditoría HTTP pública `coord/staging-registration-write-safety-20261030`, `ENC_STAGING_WRITE_GUARD_RESULT.txt` UTC 20:20:49: `health=200`, `environment=staging`, `readOnly=true`, `writesPermitted=false`, `database=mariadb`, 207 negocios, 206 con WhatsApp/teléfono, Hair Palace incluido, POST de registro público no permitido=403, PATCH no autorizado=401.

**Estado:** corrección W5 **IMPLEMENTADA / VALIDADA NODE22 + HTTP/SQL AISLADO / INTEGRADA / DESPLEGADA EN STAGING**; pendiente **POST/PATCH autenticados reales sobre Staging, readback independiente SQL, limpieza sintética, restauración y aceptación del propietario**. Incidencia permanece ABIERTA. Nunca confundir `readOnly=true` de escrituras generales con capacidad de negocios habilitada. La comprobación actual no abrió escrituras ni modificó datos.


### ENC-STAGING-DB-TRANSIENT-20261030 — Cambio transitorio de MariaDB a caché JSON (observación, pendiente de causa)

- **Evidencia UTC 2026-10-30 20:28:28:** verificación HTTP de solo lectura en Staging devolvió `GET /api/health=200`, `database=json_cache`; 207 empresas y 206 con WhatsApp, incluida Hair Palace Keratin. `GET /api/database-status=401`, por lo que no se obtuvieron permisos empresariales ni diagnóstico interno sin autenticación.
- **Relectura UTC 2026-10-30 20:28:59:** `GET /api/health=200`, `database=mariadb`, relectura tras ocho segundos `mariadb`; 207 empresas, 206 con WhatsApp, Hair Palace incluida. Es un **cambio transitorio observado**, no una caída prolongada demostrada; la causa no está confirmada.
- **Informe:** `coord/staging-registration-write-safety-20261030/ENC_STAGING_WRITE_GUARD_RESULT.txt` (commit posterior a `9c0e0763773c6bf32bfd66b7bee5021bce2dbc72`). La reparación original conserva `RESULT=UPDATED_AND_READBACK_VERIFIED` en `coord/staging-hair-contact-fix-20261030/ENC_STAGING_HAIR_FIX_RESULT.txt`.
- **Permisos:** `/api/health.staging.readOnly=true` solo describe el bloqueo general; el código de `server.js` expone un carril separado `businessWrites`, cuyos valores reales no pudieron verificarse porque `/api/database-status` exige autenticación (401). Registro público sin habilitar y edición autenticada continúan pendientes de prueba. No activar escrituras ni tocar producción.
- **Estado:** contacto restaurado y leído por HTTP, sin datos de teléfonos en reporte; **observación transitoria de conexión DB** y diagnóstico de permisos **ABIERTOS**.


## ENC-STAGING-WRITE-GATE-005 — E2E PUBLICO REAL APROBADO (2026-10-30)

**Estado:** IMPLEMENTADO / CI NODE22 PASS / INTEGRADO EN `ia-desarrollo` / DESPLEGADO Y ATESTIGUADO EN STAGING / PRUEBA HTTP+SQL REAL PASS / PENDIENTE ACEPTACION FISICA DEL PROPIETARIO. Issue #12 permanece abierto por protocolo. **Produccion sin intervenciones.**

- PR #15 integrado: `6c978ab1e6a0a36783499619893749d5d9ef98d3`; PR #16 integrado (instrumentacion de diagnostico temporal admin-only): `35d3e882de34bb39da281170b9a09e5d6a310965`. CI: runs `41163368931`, `41164176236`, ambos PASS.
- Causa raiz del bloqueo persistente: el script de ventana temporal sustituyo dos cadenas literales en la configuracion privada sin comprobar el resultado. La inspeccion admin de solo lectura encontro `STAGING_BUSINESS_WRITES_ENABLED=true`, `ENC_ADMIN_MUTATIONS_ENABLED=true`, pero `STAGING_READ_ONLY` aun `true` y `STAGING_DB_CONFIRMED` aun `false`; el guard de negocio rechazo correctamente con 503. La reparacion de la herramienta E2E usa sustituciones de asignacion ancladas y valida los dos valores antes de abrir la ventana. No hay evidencia de fallo SQL empresarial con los permisos correctos.
- Hostinger actua asincronamente: se verifico que el bundle `server.js`, los procesos Node propios de Staging y la respuesta HTTP publica correspondieran al release con marca `ENC_005_DIAG_20261030` antes de probar.
- **E2E real PASS:** GitHub Actions `41164661573`: respaldo SQL fresco, `CURRENT_USER()` y grants validados, login temporal 200, sesion 200, mutacion ajena 403, alta empresa sintetica 201, edicion 200, SQL readback independiente verificado, GET publico readback verificado, eliminacion sintetica verificada, configuracion original restaurada, HTTP post-restore 401, Staging MariaDB en modo readOnly. `FINAL_RESULT=PASS_PUBLIC_CREATE_EDIT_SQL`.
- **Reauditoria independiente:** run `41164767055`: 207 empresas en MariaDB de pruebas (mismo recuento previo), ninguna empresa con nombre sintetico, marcador de ventana ausente, `jeo` preservado, configuracion privada readOnly real, health HTTP200 MariaDB y release HTTP atestiguado.
- La escritura empresarial NO quedo habilitada permanentemente en Staging; el regreso a readOnly es un control de seguridad exigido por la prueba. Para sesiones manuales futuras se requiere una ventana de negocio controlada y respaldada. La integracion a `main` / produccion sigue prohibida sin orden expresa del propietario.
- Pendiente: validacion fisica/visual del propietario; eliminar o justificar diagnosticos de booleanos `stagingGateDiagnostic` antes de un eventual candidato productivo. PR #14 contiene workflows experimentales no previstos para integracion; preferir PR #15/#16 ya revisados.


### Subincidencia ENC-STAGING-ADMIN-LOGIN-UI-20261030

- **Estado:** CODIGO PROBADO; INTEGRADO A `ia-desarrollo`; DESPLEGADO Y ATESTIGUADO EN STAGING; ACEPTACION REAL DE LOGIN `jeo` PENDIENTE.
- PR #17, merge `5fbec000adde69e27c35bf34726ba82a71f8357c`: corrigio el contraste visual del nombre de usuario y lo sincroniza con los avatares; agrego control accesible para mostrar/ocultar contraseña; longitud minima de 10 caracteres solo en Staging, conservando 12 en otros entornos.
- CI independiente: Actions `41166849692` PASS (TypeScript, prueba HTTP positiva para password de 10 caracteres con hash scrypt sintetico, rechazo de 9, clave incorrecta, CORS/Origin, regresiones de seguridad y build).
- Despliegue real: Actions `41167161898` PASS: nuevo release respondio por HTTP, frontend publico confirmo las etiquetas `Mostrar contraseña` y `Ocultar contraseña`, longitud 9 devolvio 400, 10 con usuario inexistente devolvio 401, proceso Node activo con bundle correcto, configuracion permanente de Staging conservada.
- Nota: no se ha probado el login con la contraseña real de `jeo`; longitud correcta no equivale a coincidencia con el hash. Usuario debe probar desde su navegador. Ninguna credencial alterada. Produccion no intervenida.


## ENC-PUBLIC-REGISTRATION-GATE-20261030 — alta pública real en Staging

**Estado:** CORREGIDO / CI PASS / INTEGRADO EN `ia-desarrollo` / DESPLEGADO EN STAGING / E2E PUBLICO CON SQL REAL PASS / ACEPTACION DEL FORMULARIO DEL PROPIETARIO PENDIENTE. Issue #12 actualizado, abierto por protocolo.

- Causa: error explícito `PUBLIC_REGISTRATION_DISABLED` en formulario anónimo. `publicRegistrationWiring.ts` exigía `process.env.PUBLIC_REGISTRATION_ENABLED`; faltaba bandera en la configuración privada y su lectura era de arranque. La edición administrativa usa otro carril y sí funcionaba.
- PR #18, merge `67f7c96ca757caaf0e61e07e828b8479e6e79a2f`. Registro público exige bandera explícita del `.env` Staging leída dinámicamente y `canWrite()` de negocio. Sin acceso por process.env ni producción. Protecciones contra duplicados, idempotencia, límites, SQL, validación y rutas ajenas intactas. CI PASS run `41168498639` con TypeScript, build e integraciones.
- Hostinger: respaldo y cambio de única variable privada `PUBLIC_REGISTRATION_ENABLED=true`, después de atestiguar bundle y HTTP `ENC_PUBLIC_PRIVATE_GATE_20261030`; demás controles, cuenta `jeo` y MariaDB de Staging sin cambios. Run `41168635340` PASS: 400 por JSON deliberadamente inválido, antes 403.
- Prueba real run `41168717485`: POST anónimo 201 (ID sintético 20272), readback independiente MariaDB, GET público y directorio verificados, reintento idéntico 200 replayed, eliminación exclusivamente del sintético, recuento 207→207, respaldo SQL previo y recovery limpio.
- Reauditoría run `41168773826`: 207 registros SQL, cero sintéticos SQL y lista pública, marcadores de prueba ausentes y bandera pública preservada.
- Pendiente: aceptación de alta real desde el formulario del propietario usando el botón `Reintentar Guardado` (mismo Idempotency-Key). No hacer un registro nuevo por riesgo de duplicar. Producción `main`/`encarmen.org` y DB productiva no intervenidas.


## ENC-STAGING-PUBLIC-MEDIA-001 — Logo y galería de 10 imágenes en registro público

**ESTADO: PENDIENTE — REPORTADO POR EL PROPIETARIO; SIN INVESTIGAR, SIN CORREGIR, SIN PROBAR. POSPUESTO POR INDICACIÓN EXPRESA.**

- GitHub Issue **#19**: https://github.com/dJeoMed78/Encarmenorg/issues/19
- Contexto: Staging `staging.encarmen.org`. En la prueba manual del alta pública, el negocio **`30102026`** recibió confirmación visual «Guardado y Publicado en MariaDB» con **ID #20272**. El propietario reportó que **no pudo subir el logotipo ni las diez imágenes de productos** durante ese proceso. Registro público de datos textuales confirmado por la interfaz; el problema específico es el flujo de medios.
- No se dispone todavía de causa raíz, respuesta HTTP, límites, trazas o prueba independiente de los archivos; no suponer por qué fallan. Mantener separado del fallo de autorización pública corregido en PR #18.
- Cuando el propietario retome el asunto: reproducir logo y galería, identificar fallo desde formulario/API/almacenamiento/persistencia/lectura, preservar controles de seguridad e integridad, probar en Staging con evidencia y revisar integración.
- **Orden vigente: no arreglar ahora ni iniciar diagnóstico, código, pruebas o despliegues.** Producción `main`, `encarmen.org` y BD productiva excluidas.


## ENC-STAGING-BUSINESS-DELETE-20261030 — borrado administrativo bloqueado

**Estado:** CORRECCION PROBADA POR CI / PR #20 INTEGRADO A `ia-desarrollo` / DESPLEGADO Y ATESTIGUADO EN STAGING / ELIMINACION AUTENTICADA REAL PENDIENTE DE ACEPTACION DEL PROPIETARIO. REGISTRO MANUAL 20272 AUN PRESENTE.

- Propietario intentó borrar la empresa de prueba `30102026` (ID 20272). Auditoría SQL de solo lectura run `41169533577` devolvió `COUNT(id=20272)=1`, total 208: NO eliminada.
- Causa doble comprobada en `ia-desarrollo`: `administrativeWritesReady()` denegaba expresamente DELETE en Staging aunque el usuario tuviera `business:delete`. La ruta DELETE en `server.ts` invocaba `dbDeleteBusiness()`, que usa `guardWrite()`, y la capacidad general `isWritePermitted()` siempre es falsa en Staging. NO abrir escrituras generales.
- PR #20 https://github.com/dJeoMed78/Encarmenorg/pull/20, rama `coord/enc-staging-business-delete-20261030`: permiso para DELETE empresarial exclusivamente bajo sesión autorizada + guard business, transacción aislada `stagingBusinessStore.delete()` con SELECT FOR UPDATE, affectedRows 1, SELECT readback, rollback; sin modificar helper de producción. UI informa falla y ya no afirma sincronización WordPress.
- Pruebas Node22 de seguridad/SQL/mocks en GitHub Actions. Algunas corridas fallaron al preparar `jsdom` y por harness antiguo que no simulaba verificación estricta de `CURRENT_USER()` / `SHOW GRANTS`; no considerar corregido hasta CI PASS. No borrar ID real desde scripts; desplegado tras CI verde, pendiente aceptación de borrado manual.
- **El propietario NO necesita cambiar ninguna variable de Hostinger, contraseña, permiso SQL o SSH.** La cuenta `jeo` ya tenía `business:delete` y las verificaciones previas confirmaron permiso SQL DELETE en la BD de Staging. Se trata de código; el trabajo puede seguirse vía GitHub. Producción `main`, `encarmen.org` y MariaDB productiva excluidos.

- **CI independiente aprobada:** GitHub Actions `41170314885` SUCCESS: instalación, TypeScript/lint, pruebas de aislamiento de la capacidad DELETE, guardias administrativas, mocks SQL de transacción/rollback, regresiones y build. PR #20 integrado commit `b6243a41dd8fd6ae1474c87ec6bd1d27e67f8bbb`.
- **Runtime público comprobado:** Actions `41170452153` SUCCESS: encabezado `X-Encarmen-Staging-Delete-Release=ENC_STAGING_DELETE_20261030`, health Staging/MariaDB 200; DELETE sin token respondió 401. Vía SSH de Actions y consultas SQL solo lectura: permisos de `jeo` incluyen `business:delete`; MariaDB permite DELETE exclusivamente en base de prueba, flags Staging preservadas; conteo **208** y negocio `20272` `30102026` todavía presente. Producción no intervenida.
- **Próximo paso:** propietario recargar Staging y confirmar borrado de ID 20272 en la UI. Si responde éxito, Coordinación hará verificación SQL y GET público posteriores. Hasta entonces no afirmar borrado real validado ni cerrar Issue #12.


## 2026-10-30 cierre de jornada — incidencias activas en Staging

**Orden vigente: finalizar por hoy, NO investigar, corregir, usar SSH, cambiar configuraciones ni desplegar hasta la próxima sesión.**

1. **Bloqueo del acceso administrativo / nuevo Issue #21:** https://github.com/dJeoMed78/Encarmenorg/issues/21. Tras deploy PR #20, propietario no pudo ingresar como `jeo`; pantalla muestra el error exacto `signal is aborted without reason`. CAUSA NO VERIFICADA, no inferir password equivocado ni atribuir al PR sin evidencia. La imagen muestra credencial visible: **NO copiar la clave ni adjuntar captura a GitHub**; programar rotación segura posteriormente. Retomar diagnóstico de red/AbortController/ruta de login/sesión/versiones.
2. **Eliminación con discrepancia panel vs MariaDB / Issue #12:** https://github.com/dJeoMed78/Encarmenorg/issues/12. El propietario declara que tras confirmar borrar empresa de prueba `30102026` ID `20272`, **desapareció del panel administrativo**; sin embargo, run SQL independiente `41169533577` y auditoría posterior `41170452153` mostraron **fila persistente** y 208 empresas. No dar por borrada; posible diferencia entre estado visual y persistencia (hipótesis, sin diagnóstico). PR #20 integrado (merge `b6243a41dd8fd6ae1474c87ec6bd1d27e67f8bbb`), CI `41170314885` PASS y runtime atestiguado `41170452153`; falta E2E de DELETE autenticado y verificación SQL y HTTP posterior, que está bloqueado funcionalmente por nueva falla de login. NO ejecutar SQL DELETE manual ni cambiar producción.
3. **Logo y 10 fotografías de productos / Issue #19:** https://github.com/dJeoMed78/Encarmenorg/issues/19. Reportado durante registro público; sigue SIN CORREGIR y NO investigado por orden expresa.
4. **Seguridad posterior:** rotación del password temporal de `jeo` mostrado en captura, con respaldo y recuperación de acceso, sin poner secretos en el repositorio. Es tarea futura sujeta a coordinación, no acción para esta noche.

**Ambiente:** solo `staging.encarmen.org` y base `u293982346_encarmentest`. `main`, `encarmen.org`, base productiva y credenciales no se modifican. Retomar mañana partiendo de Issues #12, #19, #21.


### Evidencia de cierre técnico en Staging — 2026-10-31
- PR #23 merge `6eefb0209e402b0f78b0c3a3045085c1e6b70fe3` a `ia-desarrollo`. Overrides exactos: `readdir-glob/minimatch=11.0.1` y `qs=6.16.1`, lockfile regenerado por npm con integridad real. Solamente se actualizaron las 2 dependencias vulnerables y se agregó dependencia requerida `@isaacs/nonrecursive-glob-match@1.0.3`.
- CI run `41213892619` SUCCESS: `npm ci`, `npm audit --audit-level=moderate`, `npm ls`, lint, regresiones de seguridad/MariaDB/auth/registro, prueba ZIP Archiver 8 compatible con minimatch 11 y build.
- Verificación de Staging vía SSH de solo lectura run `41214176745`: `current/nodejs` activo contiene `minimatch 11.0.1`, `qs 6.16.1` en `node_modules` y lockfile; health HTTP 200 y contexto Staging/MariaDB correcto. No se cambió .env ni se ejecutó SQL mutable.
- **Producción no intervenida:** `main`, `encarmen.org` y BD productiva siguen fuera de alcance. Cierre de alcance productivo sujeto a permiso explícito, revisión e inspección de respaldos/rollback. Issue #22 queda abierto para trazabilidad de ese alcance.


## Decisiones permanentes del propietario — continuidad Nia y cancelación de Figma (2026-10-31)

- **Memoria operativa obligatoria:** GitHub `dJeoMed78/Encarmenorg` rama `coord/encarmen-work-control-001` es fuente persistente y prioritaria de continuidad de Jefa 3/Nia. Se registra cada cambio, incidencia, decisión, permiso de alcance y evidencia verificable que impacte el proyecto; historial no se borra y ninguna incidencia se cierra automáticamente. La nueva conversación deberá leer `NIA_INICIO_RAPIDO.md`, `JEFA3_IDENTIDAD_Y_CONTINUIDAD.md`, `LA_JEFA_METODOLOGIA_PERMANENTE.md`, este Registro Maestro y comparar ramas/SHAs actuales.
- **Metodología optimizada:** Staging es laboratorio; resolver de la forma más breve y segura. Pruebas dirigidas al impacto, no repetir suites sin justificación; respaldo pertinente y reversión antes de cambios que puedan causar pérdida, conflicto o impacto; proteger producción y verificar aislamiento. Véase metodología permanente, sección 2026-10-31.
- **Figma CANCELADO POR EL PROPIETARIO:** el archivo creado `ENCARMEN — Staging | Diseño maestro editable`, Figma key `l2mTWK7votdI1xGozDvJai`, NO es réplica exacta del diseño real de Staging. Fue rechazado. **No usarlo para diseñar ni llevar cambios de Figma a la web; no editarlo ni eliminarlo sin nueva orden expresa**. Si se reabre, únicamente réplica exacta comprobada contra Staging, no aproximaciones. Estado de tarea: CANCELADA, sin modificaciones a web derivadas de ese diseño.
- **Estado de seguridad CVE actualizado:** Issue #22/PR #23 **ya remediado en código y Staging**: `minimatch@11.0.1`, `qs@6.16.1`, CI run `41213892619`, verificación runtime run `41214176745`, reporte del propietario Hostinger 2026-10-31 09:17: «No se han encontrado vulnerabilidades». `main`/producción no modificada. No reabrir implementación en Staging sólo por ver notas históricas de «pendiente»; Issue #22 conserva seguimiento del alcance productivo.
- **Incidencias funcionales aún pendientes de validación del propietario:** Issue #21 acceso administrativo; Issue #12 eliminación visual no persistida en MariaDB (ID 20272); Issue #19 logo y 10 fotos. Mantener resultados específicos y no atribuir causa raíz no comprobada.

**Auditoría de continuidad:** el propietario preguntó expresamente si Nia estaba usando GitHub como memoria y qué ocurriría cuando termine el chat. Confirmación operativa: la sucesión se hace desde estos cuatro documentos y el estado vivo de GitHub; ningún chat o instancia de modelo garantiza por sí mismo continuidad automática, pero el registro permite reconstruir decisiones y trabajo sin perder rastreabilidad.


### Decisión de memoria dual Nia — 2026-10-31
El propietario autorizó Google Drive como memoria narrativa más frecuente de Coordinación Principal, sin abandonar GitHub como registro técnico. Carpeta privada NIA: https://drive.google.com/drive/folders/1M7DpHsFCatAg7YXcBWxZt4KeUHVKSfdX . Documento creado, escrito, leído y colocado en esa carpeta: https://docs.google.com/document/d/1aNJblt-eoTyAlzj03FXblZnhIvQ-MDLsbFWQ87valGg/edit . Prioridad para nuevos chats: leer el último checkpoint de Drive; luego contrastar documentación canónica, Issues, commits y pruebas reales en GitHub. No existe aún automatización de cinco minutos: registrar avances activos sin simular periodicidad. No almacenar secretos ni modificar producción.

### Nia — activador universal «TU ERES NIA» (2026-10-31)
- **Decisión del propietario:** al indicar «TU ERES NIA» en cualquier chat, recuperar operativamente el rol de Coordinación Principal 01. Iniciar **en modo lectura**, no desplegar ni tocar producción por la frase.
- **Memoria activa:** Drive carpeta `memoria NIA` ID `1Qy7yHshDTRsKg3XE-7DsuqjNhw2mbD6L`, `NIA5.md` ID `1_LEQYudBlfhmy3L95Y39SWSL_2sqsI1K`, o su sucesor explícitamente designado. Comprobar fecha de modificación y último checkpoint. NIA1–4 son historia.
- **Protocolo de recuperación:** `docs/coordination/NIA_REACTIVACION_TU_ERES_NIA.md` (commit `3b886a0`). Actualizados `NIA_INICIO_RAPIDO.md` (`925130b`), `JEFA3_IDENTIDAD_Y_CONTINUIDAD.md` (`1cc3683`) y `LA_JEFA_METODOLOGIA_PERMANENTE.md` (`2c2f32d`).
- **Drive:** checkpoint `CHECKPOINT-NIA5-ACTIVADOR-TU-ERES-NIA-20261031` añadido y leído de nuevo en el mismo archivo, sin quitar el contenido anterior.
- **Límite confirmado:** la herramienta disponible no permite actualizar directamente las instrucciones personalizadas globales de ChatGPT; el propietario debe pegarlas en Configuración > Personalización. No afirmar activación global hasta que lo haga.


### Nia 6 — Protección antirregresión de multimedia y empresa — 2026-10-31
- **Aceptación del propietario:** registro público de la empresa ID 20274, nombre `2222222`, con logotipo y galería visualizados y aprobados en teléfono móvil. Evidencia externa: GitHub Actions 41246095985, `GET /api/businesses/20274` HTTP 200, imagen y logo `/uploads/pub-...`, galería 3 y tres WebP reales recuperados HTTP 200.
- **Entregas ya integradas a `ia-desarrollo`:** PR #24 (borrado autorizado); #25 (registro público y persistencia multimedia), #26 (reparación de cargador administrativo), #27 (habilitación de selectores públicos). Las pruebas de alta, modificación y borrado en MariaDB Staging se realizaron en colaboración con el propietario; no confundir con producción.
- **PR #28 integrado:** `1f137124cd3aee1baf3f71614ba4e9e3e1ce050c`; documento `docs/coordination/ENC_MEDIA_CONTRATO_NO_REGRESION.md`, seis pruebas nuevas `tests/enc-media-regression-guard.test.mjs` y workflow `.github/workflows/enc-media-regression-gate.yml` para todo PR hacia `ia-desarrollo`. CI #41246420707 aprobó TypeScript, pruebas y build.
- **Condición pendiente para blindaje obligatorio:** protección de rama `ia-desarrollo` con status check requerido `media-regressions`. El GitHub connector disponible no expone la acción para modificar branch protection. El workflow detecta errores, pero por sí solo no bloquea una fusión manual.
- **Pendiente funcional separado:** carga desde el editor administrativo debe verificarse en navegador real. El registro público con 3 fotografías sí cuenta con aceptación móvil y lectura remota. No modificar producción.


### Nia 6 — Incorporación de hallazgos históricos del propietario (PDF 5 páginas) — 2026-10-31
**Fuente:** `encar(1).pdf`, capturas realizadas aproximadamente tres días antes; **no atribuir actualidad a las capturas sin reprobar Staging**. El propietario solicitó omitir lo ya corregido y registrar solo pendientes.

- **Omitidos por pruebas posteriores satisfactorias:** bloqueo general del alta/edición/borrado en Staging (PDF p. 1): el propietario confirmó alta ID 20273, cambio de nombre y eliminación de otro negocio mediante phpMyAdmin. También se omitió duplicar la incidencia de subida pública de logo/galería: alta ID 20274 con logo y tres fotos validada en móvil, lectura API y HTTP 200 WebP; PR #25, #27.
- **Pendiente existente #19:** la subida desde **editor administrativo** necesita aceptación funcional específica; el texto «Logotipo requiere sesión verificada» en p. 1 es evidencia histórica, no confirmación del estado actual. Corrección de código PR #26 está integrada.
- **Issue #29:** gestión desde la ficha pública deshabilitada aun con sesión administrativa; separado de edición desde panel administrativo ya comprobada.
- **Issue #30:** sustituir botón grande «Gestión del negocio» por indicador «PI» pequeño/discreto, pendiente confirmar semántica y acceso alternativo.
- **Issue #31:** designar una imagen ya subida como logo desde administración, comprobando pertenencia y persistencia, sin duplicar archivo.
- **Issue #32:** mapa incrustado Google Maps no visible; investigar causa real y restricciones antes de proponer API de pago.
- **Issue #33:** ordenar ficha móvil con ubicación, horario, pagos y entrega/servicios antes de calificaciones/comentarios, que deben quedar al final.
- **Issue #34:** error de consulta de calificaciones y comentarios no disponibles. Distinguir problema de lectura de ratings de comentarios que podrían no estar implementados.
**Control:** Issues 29–34 creados para diagnóstico y/o implementación posterior; ningún cambio a producción, no declarar corregidos sin prueba funcional en Staging.


### Nia 6 — Cierre Issue #30 (indicador PI) — 2026-10-31
- **Estado: CERRADO / IMPLEMENTADO / VALIDADO EN STAGING POR EL PROPIETARIO.**
- PR #35 fusionado en `ia-desarrollo`, SHA `4c14c3c226600428550bbb614d79eab823b8bc27`.
- CI #41247127075 aprobó TypeScript, compilación y validación del indicador PI discreto.
- El propietario confirmó visualmente el cambio publicado en Staging y solicitó retirar el error de la lista. Issue #30 cerrado con razón `completed`.
- No reabrir ni volver a asignar salvo regresión nueva comprobable. Producción sin cambios.


### Nia 6 — Issue #29 / PR #36 y autorización Staging — 2026-11-01
- PR #36 fusionada a `ia-desarrollo` mediante merge `961a3326fe9301dbb76905cbd9c312d03425a9b5`, desde HEAD `090f93978c8917b7c8a5aab95f2de60139e08b7f`.
- CI GitHub Actions run `41317807347` aprobó instalación, lint, pruebas de regresión y build.
- Alcance: PI con sesión administrativa verificada, límite objetivo 30 minutos en Staging, modificación, eliminación confirmada, TOP/Recomendado persistidos y readback de flags desde MariaDB.
- Estado: IMPLEMENTADO, CI APROBADA, INTEGRADO. Despliegue real y E2E con MariaDB de Staging todavía NO verificados. No cerrar Issue #29 sin evidencia funcional.
- Propietario ratificó aislamiento de Staging y autorizó publicación allí tras pruebas sin pedir nuevamente la misma confirmación. `main`/producción siguen fuera de alcance.
- Iniciativa en diseño: Centro de Control Unificado privado de Nia y hasta seis trabajadores, tablero de estado y avisos de conclusión, vistas individuales y acceso centralizado a GitHub, Hostinger y plataformas de IA. Verificar políticas de iframe/API; no evadir proxy corporativo. Sin implementación.
- Memoria narrativa: Google Drive `NIA6.md` ID `1fojoFpNDJ2AaPbXJY4bh2Oj3TP-QZNVQ`, actualizada y releída 2026-11-01. Automatización horaria contempla actualización narrativa en Drive y registro técnico en esta rama.


### Nia 6 — Issue #29: PI móvil y flujo de aplicación de distintivos — 2026-11-01
- **PR #37**: ajuste visual móvil, símbolo π y autenticación administrativa en modal local. GitHub Actions `41336465264` **SUCCESS** (instalación, lint, pruebas de regresión y build). Integrada a `ia-desarrollo` por merge `6cbf324ef2697aebe16a05dd21c2566a5e9d9e40`; comparación posterior con `ia-desarrollo`: **idéntica**. Propietario aportó captura Hostinger de despliegue **completado** el 2026-11-01 12:33 hora local, rama `ia-desarrollo`, SHA `6cbf324e`. Captura posterior iPhone valida visualmente modal de gestión sin superposiciones; no demuestra todas las acciones E2E.
- **Hallazgo posterior del propietario**: al pulsar TOP o Recomendado, la ventana se cerraba aunque el cambio sí persistía. Solicita selección diferida y botón **Aplicar cambios** sin cierre automático.
- **PR #38** (`coord/enc-pi-apply-flags-20261101`): cambios de casillas en estado local, botón Aplicar, cierre sin aplicar descarta selección, verificación de sesión antes de invocar callbacks existentes. Último SHA `a221cc86365aa9af0f31c360e796e45dd54f1666`. CI inicial `41338713689` falló porque una aserción esperaba las casillas vinculadas directamente a `b`; se actualizó la prueba. Nueva ejecución `41338871060` **SUCCESS** verificada 2026-11-01. **Estado: PR en revisión, NO fusionada, NO desplegada** al último cotejo; `ia-desarrollo` permanece en `6cbf324e`.
- **Pendientes antes de cerrar Issue #29**: integrar PR #38 tras revisión, comprobar despliegue del SHA exacto en Staging y realizar E2E de ambas casillas, persistencia tras recarga, login sin sesión, edición, borrado y expiración. Evitar afirmar persistencia de una operación sin respuesta/readback real. `main`/producción intacta.


### Nia 6 — Actualización posterior de PR #38: integración confirmada — 2026-11-01
- **Corrección de estado anterior:** la anotación precedente «PR #38 en revisión, NO fusionada» era cierta al corte anterior, pero quedó superada. GitHub confirma que PR #38 está **cerrada y fusionada** (2026-11-01 18:57:53 UTC) en `ia-desarrollo` mediante merge SHA `a97176e880287814ee793c29de80332bb616c340`; comparación `a97176e8` vs `ia-desarrollo`: **idéntica** al cotejo.
- HEAD de PR #38 `a221cc86365aa9af0f31c360e796e45dd54f1666`, CI `41338871060` **SUCCESS**: npm ci, lint, pruebas de regresión y build. El flujo nuevo difiere del anterior: selección temporal TOP/Recomendado, botón **Aplicar cambios** y modal que permanece abierto; el cierre descarta selecciones sin aplicar.
- **No confundir integrado con desplegado:** no se ha recibido evidencia de Hostinger publicando el merge `a97176e8` ni validación funcional de guardado simultáneo/readback en Staging. Issue #29 permanece pendiente de aceptación E2E; `main` y producción no se modificaron.


### Traspaso Nia6 — 2026-11-03 07:39 America/Merida
- **Sucesión definitiva:** NIA6.md es la última memoria numerada. Cada nueva conversación de Nia crea una sola memoria propia `NIA-AAAA-MM-DD.md` (si coincide fecha, sufijo `-02`, `-03`, etc.), después de leer NIA6 y el checkpoint más reciente. No crear NIA7.md; no alterar memorias históricas. Guardado progresivo por hora solo cuando haya novedades no registradas, y también en hitos; Drive memoria narrativa, GitHub registro técnico.
- **Último punto técnico confirmado en conversación:** PR #38 fusionada en `ia-desarrollo`, merge `a97176e880287814ee793c29de80332bb616c340`; CI `41338871060` aprobada. Corrige flujo π para TOP/Recomendado con selección diferida y botón `Aplicar cambios`, sin cerrar modal. **No hay evidencia aún de despliegue de este SHA en Hostinger ni aceptación E2E de persistencia en Staging.** PR #37 (`6cbf324e`) sí tuvo despliegue confirmado y validación visual iPhone del propietario.
- **Siguiente paso:** verificar despliegue Hostinger de `a97176e8`; probar en Staging selección TOP/Recomendado, aplicar, persistencia tras recarga y descarte al cerrar sin aplicar; después login sin sesión, edición, eliminación segura y expiración. Issue #29 no cerrar sin aceptación. Evitar duplicar Issues #12, #19, #21, #31–34; contrastar evidencia antes de actuar.
- **Centro de Control Unificado:** iniciativa de diseño, no implementación comprobada. Producción `main`/`encarmen.org` fuera de alcance.
- **Estado de Drive en este traspaso:** lectura de `NIA6.md` ID `1fojoFpNDJ2AaPbXJY4bh2Oj3TP-QZNVQ` exitosa; intento de edición directa devolvió HTTP 400 `document must not be an Office file`. Por tanto **no afirmar que Drive fue actualizado**. Este checkpoint en GitHub sirve de recuperación verificable hasta solucionar escritura de Drive.


## 2026-11-03 — Rectificación de continuidad NIA6 y conciliación puntual (Coordinación 01)
**Regla de lectura:** el encabezado de un Issue abierto puede ser histórico. Distinguir corregido, probado, integrado, desplegado, aceptado y cerrado administrativamente. No repetir auditorías generales ni implementaciones sin regresión nueva. Conservar todos los antecedentes.

- **#12 HTTP 503 original:** CORREGIDO / INTEGRADO / DESPLEGADO / PROBADO E2E. PR #15 merge `6c978ab1e6a0a36783499619893749d5d9ef98d3`, PR #16 merge `35d3e882de34bb39da281170b9a09e5d6a310965`; Actions `41164661573` y `41164767055` SUCCESS. Alta HTTP 201, edición HTTP 200, SQL MariaDB, GET público y limpieza sintética documentados. El propietario confirmó posteriormente la eliminación manual del ID 20272 en MariaDB; no presentar como falla actual por auditoría previa. **Pendiente único:** cierre formal según aceptación, sin reabrir diagnóstico 503.
- **#19 medios públicos:** PR #25 merge `bdc5a9f70fe6ac689b2f27095eba908dcc7532c1`, #26 `e6ae59c294f6c57f7d3928d69cc74df7882bb2e7`, #27 `eb826570d7156d20ccac25f8f66a26a8b3fe4719`, #28 `1f137124cd3aee1baf3f71614ba4e9e3e1ce050c`, todas fusionadas. Propietario aceptó registro de empresa ID 20274 `2222222` con logotipo y 3 fotos y visualización móvil; Actions `41246095985` verificó HTTP 200 de recursos WebP (referencia de traspaso). **No afirmar prueba de 10 imágenes simultáneas.** Carga pública corregida; el cargador administrativo PR #26 requiere aceptación específica separada. **Pendiente:** cierre administrativo del alcance público y validación dirigida del cargador administrativo si procede.
- **#29 π:** PR #36 merge `961a3326fe9301dbb76905cbd9c312d03425a9b5`, #37 `6cbf324ef2697aebe16a05dd21c2566a5e9d9e40`, #38 `a97176e880287814ee793c29de80332bb616c340`; todas fusionadas. PR #37 CI `41336465264` SUCCESS y despliegue Hostinger confirmado, diseño iPhone aprobado. PR #38 CI `41338871060` SUCCESS; **NO CONSTA todavía despliegue Hostinger del SHA a97176e8 ni E2E de Aplicar cambios**. **Pendiente único:** verificar versión publicada y E2E de ambas casillas, aplicar, persistencia tras recarga, descarte al cerrar y sesión/caducidad. No reimplementar π.
- **#21 login:** error `signal is aborted without reason` histórico, no falla activa demostrada. Distinguir login panel y login π; validar estado actual antes de programar. **Pendiente:** aceptación dirigida de sesión actual.
- **#22 dependencias:** PR #23 merge `6eefb0209e402b0f78b0c3a3045085c1e6b70fe3`; minimatch 11.0.1, qs 6.16.1; CI `41213892619` y verificación Staging `41214176745` referidas en traspaso. Corregido en Staging; producción fuera de alcance. **Pendiente:** cierre formal.
- **#5 contactos:** restauración histórica documentada y verificada; no repetir importaciones. **Pendiente:** cierre administrativo. **#6** filtros/monitoreo es funcionalidad distinta; verificar si fue implementada antes de asignar.
- **#31** seleccionar foto *existente* como logo es diferente de subir logo/galería; buscar código y PR posteriores, verificar propiedad/permisos/SQL antes de clasificar como no implementado.
- **#32/#33/#34:** mapas, orden móvil, ratings/comentarios requieren comparación dirigida con `work/enc-glass-logo-maps-002`, `work/enc-reviews-comments-002`, `work/enc-glass-business-detail-001`, `work/enc-glass-editor-001`, sus commits y `ia-desarrollo`; no declarar resueltos ni fallidos sin evidencia.
- **PR abiertos #1/#3/#11/#13:** conciliación pendiente; clasificar incorporado por otra PR, parcial, necesario u obsoleto. PR #11 rotulada NO INTEGRAR. No fusionar ni cerrar automáticamente.
**Prioridad inmediata:** continuar desde PR #38, cotejar despliegue Hostinger `a97176e8` y realizar únicamente E2E específico de Aplicar cambios. Producción `main`/`encarmen.org` protegida. Este registro rectifica estados históricos, no certifica despliegues no observados ni ejecuta pruebas nuevas.


## 2026-11-03 — Depuración administrativa de entregas históricas
Autorización del propietario: conciliar y cerrar registros si la evidencia de resolución es suficiente, sin modificar producción ni fusionar PR antiguas.
- Issues #5 (restauración histórica de contactos), #12 (HTTP 503 original corregido y E2E comprobado, PR #15/#16), #22 (dependencias corregidas en Staging, PR #23) **CERRADOS** en GitHub con motivo `completed`; se preserva historial y evidencias. #6 permanece independiente para monitoreo preventivo.
- PR #13 **CERRADA sin fusionar**: su diff ya no aporta cambios respecto de `ia-desarrollo` y la corrección original fue integrada por PR #15/#16.
- PR #39 **CERRADA sin fusionar**: sus cinco archivos fueron aplicados previamente directamente a `ia-desarrollo` por autorización del propietario; fusionarla de nuevo sería duplicar trabajo. PR #40 fue integrada por squash y el aviso Glass fue aceptado.
- PR #11 **CERRADA sin fusionar**: explícitamente identificada como validación «NO INTEGRAR» de configuración histórica; no publicar ni reaplicar parche de entorno sin nueva incidencia comprobada.
- PR #1 (limpieza autónoma) **ABIERTA**: cambios extensos/destructivos en integración histórica y scripts; requiere revisión de riesgo y contraste específico antes de cerrar o fusionar.
- PR #3 (editor Glass) **ABIERTA**: modificaciones significativas en editor; no declarar incorporadas por completo sin comparar comportamiento y código con versión actual.
- Issues #19, #21, #29, #31, #32, #33, #34 y #6 permanecen abiertos; no confundir el estado del encabezado con fallo activo. #19 carga pública aceptada para 3 fotos; editor administrativo independiente. #29 TOP/Recomendado y popup Glass aprobados, pero sesión/login requieren validación. La presente depuración es administrativa y no prueba nuevos despliegues.


### 2026-11-03 — Cierre conciliado PR #1 (limpieza autónoma)
- GitHub PR #1 `https://github.com/dJeoMed78/Encarmenorg/pull/1`: **CERRADA SIN FUSIONAR**, obsoleta parcialmente por divergencia de 2 commits adelante/186 atrás respecto de `ia-desarrollo`. Se inspeccionaron los 12 archivos de su diff y el código actual.
- **Objetivo principal ya protegido en `ia-desarrollo`:** rutas de sincronización WordPress/WooCommerce devuelven HTTP 410, salvaguardas `STAGING_READ_ONLY` preservadas y registro público basado en MariaDB; no reactivar sincronización.
- **Residuos por tratar separadamente:** referencias y UI WordPress en componentes, archivos de despliegue antiguos Render/Vercel, scripts históricos de recuperación y limpieza documental. No eliminar scripts de recuperación sin evaluar conservación; no mezclar con radar de clasificados ni con cambios de registro sin pruebas.
- **Motivo del cierre:** la PR mezcla borrados extensos y modificaciones ajenas a la limpieza que podrían introducir regresiones. Su cierre no certifica que la limpieza residual esté implementada. El trabajo pendiente, si se prioriza, es limpieza selectiva con revisión de impacto y pruebas independientes.
- `main` y producción no modificados; ninguna rama de despliegue alterada.


### 2026-11-03 — Radares pendientes separados
Por solicitud del propietario se revisó código de `ia-desarrollo` y se crearon Issues independientes, sin afirmar fallo reproducido ni funcionamiento terminado:
- Issue #41 https://github.com/dJeoMed78/Encarmenorg/issues/41: radar de clasificados, endpoint `POST /api/classifieds/radar-search` existente; cliente `src/services/api.ts` fuerza `useAi: true` pese al parámetro, pendiente verificación E2E, fuentes reales, deduplicación, aprobación y persistencia.
- Issue #42 https://github.com/dJeoMed78/Encarmenorg/issues/42: radar de eventos, endpoints `POST /api/events/radar-search`, `/api/events/radar-scan`, `GET /api/events/radar-status` existentes; pendiente validar fuentes de eventos individuales, fechas reales, cuota Gemini, persistencia y E2E.
Clasificación: implementación parcial identificada, funcionamiento real no confirmado. No duplicar desarrollo completo ni publicar candidatos automáticamente. PR #1 cerrada sin fusionar; no se modificó código ni producción.


## 2026-11-03 — Revisión especial de los tres radares (código `ia-desarrollo`)
**No publicar todavía:** hay defectos confirmados de integridad, no sólo pruebas pendientes. 
- **Clasificados #41:** `src/services/api.ts` ignora `useAi` y envía `useAi:true` siempre. `AdminClassifiedsTab.tsx` anuncia éxito y retira candidatos ANTES de recibir respuesta, e incluso oculta fallas. `server.ts` endpoints `approve-candidate` y `batch-approve` insertan en caché, ignoran fallos MariaDB y devuelven éxito; riesgo de publicación fantasma. 
- **Eventos #42:** `AdminEventsTab.tsx` muestra éxito en error de red con texto `pattern` y puede afirmar sincronización sin evidencia; `server.ts` `publish-candidates` usa fecha/fuente genérica y agrega a caché antes de SQL, ignorando fallos MariaDB; Gemini puede devolver candidatos con fuentes generales y fechas no verificadas.
- **Empresas #43:** `server.ts` `approve-candidate` y lote escriben caché/seed antes de comprobar SQL, ignoran fallos MariaDB y pueden exportar a WooCommerce heredado. `auto-search` usa pool local, no búsqueda web actual. **Riesgo de escritura externa:** no ejecutar E2E de publicación hasta verificar aislamiento y respaldos.
**Estado:** defectos de código confirmados, NO corregidos ni desplegados. Requiere corrección coordinada y pruebas unitarias/integración; publicación única en `ia-desarrollo` después de validación y sin tocar `main`. No inventar éxito ni resultados reales. Issues #41, #42, #43 separados.


### 2026-11-03 — Issue #29 revisión de sesión y gestión
Se inspeccionó `src/server/adminSecurity.ts`: expiración deslizante `sessionMs=30*60*1000` en Staging cuando la identidad privada de Staging está activa; endpoint `/api/admin/session` devuelve `expiresAt` y renueva tras token válido. `BusinessPublicDetail.tsx` incluye acceso modal, TOP/Recomendado y aviso 2 s previamente aceptados. Se identificó defecto cliente: `verifyAdminSession()` devolvía falso ante falla temporal de red aun con sesión previamente verificada y vigente, haciendo que modal pidiera nuevo login. Corrección aislada en rama `work/enc-admin-session-stability-20261103`, commit `951cb5494355230a63073b3da88959756da2fa38`, PR #44 `https://github.com/dJeoMed78/Encarmenorg/pull/44`; conserva sesión previamente validada solo ante error transitorio, mantiene revocación HTTP 401 y expiración. CI run #41686743310 inicialmente en progreso. **NO integrado ni desplegado aún; no anunciar listo para pruebas** hasta CI y squash único, confirmación Hostinger. Sesión de 30 minutos y flujos completos requieren prueba real de usuario, no inferir E2E de lectura de código. Issue #29 abierto; producción sin cambios.


### 2026-11-03 — Issue #21 cerrado por instrucción del propietario
Issue #21 `https://github.com/dJeoMed78/Encarmenorg/issues/21` actualizado y **CLOSED/completed** por decisión expresa. Cierre administrativo del error intermitente histórico de login; NO representa certificación E2E de ausencia de regresiones. PR #44 corrección sesión integrada a `ia-desarrollo` y CI aprobado; seguimiento de 30 minutos y funciones restantes continúa en Issue #29. No tocar producción. Reabrir con nueva evidencia si reaparece.


### 2026-11-03 — Ficha pública: logo inicial en ambos paneles
Solicitud visual del propietario con capturas: cuando negocio carga solo logo, el hero izquierdo no debe quedar vacío; mostrar logotipo grande completo a la izquierda y logotipo adecuado al recuadro de identidad derecho. Las fotos adicionales deben reemplazar el logo del hero al seleccionar miniaturas/flechas, conservando logo lateral. Implementado en rama `work/enc-business-detail-logo-hero-20261103`, PR #45 `https://github.com/dJeoMed78/Encarmenorg/pull/45`, componentes `src/components/BusinessPublicDetail.tsx` y `.css`, prueba de regresión `tests/business-detail-logo-hero.test.mjs` añadida a gate CI. La primera flecha desde logo abre primera foto, no la segunda. **Pendiente CI y despliegue**, no afirmar publicado hasta squash merge y verificación. No toca producción ni datos.


### 2026-11-03 — Issue #29 cerrado por aceptación funcional
Propietario confirma funcionamiento de sesión administrativa de 30 minutos y acciones restantes en Staging, ordena cierre. GitHub Issue #29 `https://github.com/dJeoMed78/Encarmenorg/issues/29` actualizado a CLOSED/completed. PR #44 ya integrada en `ia-desarrollo` con CI aprobada. Cierre por aceptación del propietario, no afirmar E2E independiente. No hubo cambios a producción.


### 2026-11-03 — Issue #31 herramienta temporal galería→logotipo
Propietario solicita seleccionar manualmente una foto ya registrada entre las 10 fotos de cada negocio y trasladar su URL a `logo_url`, retirándola de `gallery` al guardar sin borrar archivo físico. Implementado en `work/enc-gallery-to-logo-20261103`, PR #46 `https://github.com/dJeoMed78/Encarmenorg/pull/46`, SHA `648cfbf6edd3ebd66a001f813d97ccc689732fa6`. Editor `EditBusinessModal.tsx`: botón admin «Usar como logotipo» en cada foto; edición en borrador y guardado único de `logo_url`+`gallery`. Backend `server.ts`: sesión administrativa para cambio logo, lectura posterior MariaDB y desactivación de sincronización heredada a WordPress en PATCH. Test `tests/gallery-to-logo-migration.test.mjs` agregado a CI. **No integrado ni desplegado todavía: CI run 41691726413 en curso.** Seguimiento automático id `6aea245f0ebc819195564dfad1d6fd37` integrará squash únicamente si CI SUCCESS y validaciones; informar despliegue verificado vs no verificado. Issue #31 permanece abierto hasta aceptación. Producción excluida.


### 2026-11-03 — PR #46 integrada y revisión de cierres derivados
CI GitHub Actions run `41691726413` completed SUCCESS para SHA `648cfbf6edd3ebd66a001f813d97ccc689732fa6`. PR #46 squash merged a `ia-desarrollo` commit `100f9a294f4355f4b776bb8daae581983de11cf0`. Issue #31 permanece abierto hasta confirmar Hostinger y prueba E2E de selección de foto, guardado de `logo_url`+`gallery`, recarga y ficha pública. PR #45 también integrada previamente: logo en panel grande y pequeño de ficha. Evaluar juntos #31 y #19 (subida de imágenes del registro público): **#19 es flujo distinto y no queda cerrado automáticamente**. #32 mapa, #33 orden móvil y #34 comentarios no resueltos por este cambio. Verificar persistencia real, permisos, y ausencia de efectos laterales antes de cierre. Producción no modificada.


### 2026-11-03 — Nueva regla de identidad visual sin migración de medios
Propietario identifica campo independiente «Fotografía de portada» y cambia aproximación: si `logo_url` está vacío, mostrar portada en hero y tarjeta de identidad de ficha pública; si hay logo y portada, logo prevalece en identidad y portada se conserva como entidad independiente. Galería intacta, sin modificar MariaDB. PR #47 `https://github.com/dJeoMed78/Encarmenorg/pull/47`, rama `work/enc-cover-brand-fallback-20261103`, head `46d5831324c3fe5db2520c4982c8fc95c300b9f6`. Modifica presentación `BusinessPublicDetail.tsx`, test y CI. Pendiente CI, revisión, integración y verificación Hostinger/Staging. La herramienta manual #31 sigue disponible para selección opcional, no se requiere migración masiva. Producción excluida.


### 2026-11-03 — PR #47 cierre técnico e integración confirmada
PR https://github.com/dJeoMed78/Encarmenorg/pull/47: corrección de fallback de portada, manejo independiente de fallo logotipo/portada, actualización de pruebas heredadas y nueva regresión. Head `9c78cef7eebc45518b29fb186788c7a5a491a5e9`. GitHub Actions run `41694598148` SUCCESS (`npm ci`, lint, tests y build). Merge squash a `ia-desarrollo` commit `129c0cae2c4812f001f739f1f6dba9b517bbc404`, confirmado como HEAD y con código presente. Regla: `logo_url` prevalece; si no existe o falla se muestra portada en hero y tarjeta identidad; galería sin cambios. **No se pudo verificar respuesta de Staging/Hostinger desde esta sesión; no afirmar desplegado ni E2E.** `main`/producción sin modificación por esta PR. Pendiente verificar ambas tarjetas con empresa con y sin logo en Staging.
