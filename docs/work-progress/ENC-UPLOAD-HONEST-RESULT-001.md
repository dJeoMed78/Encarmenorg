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
