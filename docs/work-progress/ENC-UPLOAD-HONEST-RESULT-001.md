# ENC-UPLOAD-HONEST-RESULT-001 — Corrección directa Jefa 3
Fecha: 2026-10-29.
Base: work/enc-consolidation-fixes-002 SHA e60582e971f4f8cb56ea56191d33d91824f3fc5e.
Rama: coord/enc-upload-honest-result-001.
Alcance: src/services/api.ts, uploadBusinessLogo.

## Hallazgo confirmado
La función convertía errores HTTP, fallos de red o JSON inválido de /api/upload-logo en {success:true,url:<dataURI>}; se podía confundir una imagen solo local con un archivo persistido en el servidor.

## Cambio
Solo confirma éxito cuando HTTP es correcto y el cuerpo incluye success===true y URL no vacía. En error devuelve success:false y mensaje; no asigna URL local como si fuera remota. Se preserva el tipo público, sin ampliar permisos ni modificar el servidor.

## Efectos y límites
Inspección estática en GitHub, commit publicado y lectura posterior verificada. No se ejecutaron tsc, Vite, tests, navegador, servidor ni MariaDB. Este cambio debe validarse antes de integrar.
Consumidores históricos inspeccionados: EditBusinessModal ya comprueba respuesta y rechaza dataURI como URL remota; AdminPromotionsTab y WordPressSyncModal usan explícitamente previsualizaciones locales en algunas rutas. **Pendiente:** auditar sus guardados finales para que una previsualización local no se presente como URL persistida; no cambiar consumidores sin prueba de contrato. También conviene una prueba de regresión con 200 válido, 200 success=false, 500, error JSON y desconexión.
No modifica main, ia-desarrollo, Staging, producción ni datos reales. No duplicar ENC-DATA-INTEGRITY-CLOSURE-003, reservada a W1.

## Ampliación: correcciones pequeñas directas de Coordinación (2026-10-29)

- `uploadBusinessLogo`: además de requerir `success===true`, rechaza URL `data:` u otros esquemas no remotos; permite rutas relativas absolutas y HTTP(S). No confunde una previsualización local con persistencia.
- `checkBusinessDuplicate`: error HTTP, cuerpo inválido o fallo de red ya no se convierten en `isDuplicate:false`; se lanza un error y el consumidor de alta administrativa ya dispone de `catch` para mostrarlo y detener el alta. No modifica el flujo de registro público.
- `updateReportStatus`: no considera suficiente un HTTP 2xx; requiere `success===true`, ID y estado del reporte devuelto por API concordantes.
- `deleteReport`: requiere `success===true` del servidor; 2xx sin confirmación no implica borrado.
- `WordPressSyncModal`: descartar/eliminar reportes informa al usuario cuando la operación no fue confirmada; no recarga fingiendo un cambio correcto.
- Suite nueva `tests/coord-api-honest-results-001.test.mjs`: casos sintéticos de éxito/error para imagen, duplicados y administración de reportes. **Escribimos y verificamos el archivo remoto; no se ejecutó esta suite** por falta de copia local instalable y dependencias en esta sesión. Tampoco se ejecutaron lint/build. Próxima validación recomendada: `node --import tsx --test tests/coord-api-honest-results-001.test.mjs`, `npm run lint` y compilación Vite en entorno aislado.

**Advertencias pendientes:** `fetchReports()` todavía mezcla datos locales históricos, reservado a W1 en `ENC-DATA-INTEGRITY-CLOSURE-003`; los handlers de PATCH/DELETE de reportes en `server.ts` mantienen persistencia best-effort y pueden contestar éxito pese a fallos SQL/disco. Esta corrección cliente **no garantiza persistencia durable**: requiere trabajo backend separado y seguridad de escritura; no modificar con esta tarea. El uploader de imágenes de promociones y el modal administrativo pueden conservar previsualizaciones locales para UX, pero revisar antes de guardar si la URL local queda finalmente persistida. No se han tocado datos reales ni producción.
