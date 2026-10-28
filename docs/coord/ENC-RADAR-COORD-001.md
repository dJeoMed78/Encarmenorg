# ENC-RADAR-COORD-001 — Revisión independiente inicial del Radar

**Tipo:** hallazgos de coordinación; solo inspección GitHub, sin pruebas de servidor.
**Base inspeccionada:** ia-desarrollo, 2026-10-27. No se modifica código de aplicación, bases ni despliegues.
**Separación de trabajo:** Work desarrolla ENC-REVIEWS-006 en work/enc-reviews-006; esta revisión no toca su rama.

## Hallazgos verificados por lectura de código

### R-01 — CRÍTICO: éxito ficticio al aprobar clasificados
Archivo: src/components/AdminClassifiedsTab.tsx, función handleApprove, aprox. líneas 126-154.
- El candidato se elimina inmediatamente de la lista.
- Se muestra notificación de publicación exitosa ANTES de recibir respuesta de approveClassifiedCandidate.
- Si res.success es false o se lanza error, se refresca sin restaurar candidato ni notificar error.
**Impacto:** interfaz declara publicación sin confirmación real; riesgo de pérdida visual del candidato.
**Corrección esperada:** conservar estado pendiente durante solicitud; solo retirar candidato y mostrar éxito tras respuesta positiva y persistencia confirmada; manejar fallos y reintentos.

### R-02 — CRÍTICO: aprobación masiva declara éxito sin respuesta
Archivo: src/components/AdminClassifiedsTab.tsx, handleBatchApprove, aprox. líneas 157-181.
- Retira todos los candidatos y notifica éxito antes de await batchApproveClassifiedCandidates.
- Ignora valor de retorno; catch silencia error y solo refresca.
**Corrección:** verificar resultado por candidato y distinguir éxitos parciales/fallos; no eliminar fallidos.

### R-03 — ALTO: fallo del Radar de eventos puede mostrarse como éxito
Archivo: src/components/AdminEventsTab.tsx, handleRunRadar, aprox. líneas 153-182.
- Si excepción contiene 'pattern' o 'The string did not match', muestra texto 'Radar completado' con type success sin comprobar si se sincronizó respaldo.
**Corrección:** nunca informar éxito sin respuesta del backend que acredite operación; distinguir error, respaldo verificado y cero resultados.

### R-04 — MEDIO/ALTO: descartar candidato es solo local
Archivo: src/components/AdminClassifiedsTab.tsx, handleDismissCandidate, aprox. líneas 183-190.
- Quita candidato de estado React sin llamada persistente aparente.
**Pendiente:** aclarar si rechazo debe persistir entre búsquedas; si sí, definir endpoint/registro seguro y deduplicación.

### R-05 — PENDIENTE: verificación funcional de fuentes y persistencia
Se observan commits históricos ad31f0aec... y 7bb86b302... que modifican fuentes, búsqueda y enlaces, pero NO se han ejecutado búsquedas reales, inspeccionado URL de origen, probado la base de datos ni validado Staging. Comprobar fuentes actuales, fecha, localidad, enlace profundo, duplicados, costos y cuotas. No usar títulos de commits como evidencia de funcionamiento.

## Alcance para corrección posterior independiente
Priorizar AdminClassifiedsTab.tsx, AdminEventsTab.tsx y sus funciones de API/servidor específicas del Radar. **No modificar server.ts ni src/services/api.ts simultáneamente con ENC-REVIEWS-006 sin acordar integración;** estos dos archivos están siendo editados por Work. Cualquier rama Radar debe nacer de base conocida y evitar merge a ia-desarrollo hasta revisión. Corregir primero falsas confirmaciones de frontend sin tocar backend compartido; después integrar cambios compatibles.

## Criterios de aceptación
- Ninguna aprobación individual/masiva muestra éxito antes de persistencia confirmada.
- Fallos HTTP, 5xx, red, resultados parciales y timeout muestran estado verdadero y preservan candidatos.
- Rechazo persistente si el producto así lo exige; sin pérdida silenciosa.
- Eventos solo muestran 'completado' con evidencia del servidor.
- Fuentes con URL verificable y fecha/localidad reales; sin inventar registros.
- TypeScript, build, pruebas de errores y pruebas funcionales Staging registradas como distintas.

## Estado
**HALLAZGOS CONFIRMADOS POR LECTURA ESTÁTICA.** No corregidos todavía, sin cambios de aplicación ni pruebas reales. Pendiente definir implementación y prueba en rama independiente.
