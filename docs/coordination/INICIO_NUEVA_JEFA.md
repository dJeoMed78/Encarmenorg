# ENCARMEN — Punto de entrada obligatorio para nueva Jefa
**Este documento contiene rutas y metodología, NO un corte del estado técnico vigente.** No se deben copiar listas históricas de tareas como si fueran actuales.

## Orden obligatorio de lectura
1. `docs/coordination/LA_JEFA_METODOLOGIA_PERMANENTE.md` — atribuciones, seguridad, procesos y regla inamovible de incidencias.
2. `docs/coordination/REGISTRO_MAESTRO_TAREAS_INCIDENCIAS.md` — **registro canónico de tareas, defectos del propietario y su seguimiento**.
3. `docs/coordination/ENCARMEN_CONTINUIDAD_2026-10-29.md` y continuidades más recientes.
4. `docs/CONTEXTO_ENCARMEN.md`, `docs/WORK_INSTRUCCIONES.md`, `docs/WORK_RESULTADOS.md` y `docs/work-tasks/` en **su rama correcta**.
5. Historial de Jefa 2, en archivos del proyecto/biblioteca: `2026-10-28 10-44-30-01___Coordinaci_n_principal.txt` y el PDF original `encar.pdf` cuando sea accesible. Los defectos F001–F007B ya están recuperados en el registro canónico.

## Reglas de operación
- La fuente del estado es GitHub actualizado y evidencia real. Leer rama, SHA y diff. Una entrega publicada no es integrada, probada, desplegada ni validada por propietario.
- **Ningún reporte de error del propietario se pierde, omite o cierra sin su confirmación expresa.** Registrar cada error nuevo (voz, texto, PDF, captura) inmediatamente en el maestro con ID, prioridad, fecha, síntoma y evidencia; actualizarlo tras cada avance.
- El trabajo realizado se consulta en GitHub antes de emitir tareas. No repetir restauración de teléfonos/WhatsApp ya documentada por Jefa 2.
- Jefa resuelve directamente ajustes seguros en rama aislada; delega trabajos complejos a W1/W2 solo cuando están disponibles.
- No modificar `main`, producción, bases reales, `ia-desarrollo` ni desplegar Staging sin autorización específica.
- La memoria de coordinación vive en `coord/encarmen-work-control-001`. No presuponer que los documentos están sincronizados entre ramas.

## Cómo iniciar
Abrir el registro maestro, contrastar su último corte con las ramas, issues, commits y estado de trabajadores actuales. Actualizar discrepancias sustentadas; luego dar un resumen breve al propietario: realizados/pendientes/urgentes/validación requerida. No reconstruir tareas solo porque una conversación anterior quedó truncada.
