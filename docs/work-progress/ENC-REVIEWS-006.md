# ENC-REVIEWS-006 — Checkpoints

## Inicio — 2026-10-28T02:40:46.807Z
- Estado EN_PROGRESO. Rama work/enc-reviews-006.
- Base y commit actual al iniciar: 6004ef637021ee0bea72f5c892a815696c1c8c13.
- Instrucciones generales (blob): c4ef37ba0f690f60cd9fb5189190afd2be9a8faa; tarea (blob): d81c21af1676ff8cfd26a23c5f2e85b73f6521c7.
- Leídos contexto, coordinación, antecedentes 001/002/003/004 y tarea 005 disponible. No hay informe de ejecución 005 aportado; no se inventa.
- Se incorporarán cambios seleccionados de a681963 y 2e0d007 sin merges, únicamente en archivos autorizados.
- No se detectó mariadbd ni Docker local; se usarán mocks aislados, sin abrir conexiones reales. Integración MariaDB pendiente.
- Plan: canonicalizar IDs, serializar votos únicamente mediante recursos de ratings sin bloquear/modificar businesses, validar esquema existente, separar SQL propuesto de arranque, consolidar consumidores y pruebas.
- Riesgos vigentes: esquema/permiso/backup de hosting no verificados, arranque histórico con efectos laterales ajenos que no se ejecutará.

## Hito: implementación coherente y pruebas aisladas — 2026-10-28T02:47:24.393Z
- Estado EN_PROGRESO. Commit anterior: d0bfc1e5b330b034eacea3747842231caefe9336. Base sin modificar: 6004ef637021ee0bea72f5c892a815696c1c8c13.
- Incorporados cambios seleccionados 001/003, sin merge. IDs canónicos, UNIQUE/NOT NULL y datos comprobados antes de operar. Serialización de ratings con GET_LOCK por esquema/negocio, liberado tras commit; nunca FOR UPDATE sobre businesses.
- Se requiere RATINGS_SCHEMA_APPROVED=true después de aprobación posterior; ausente, GET/POST falla 503. Esta tarea no cambia ninguna configuración de hosting.
- Se retiró exclusivamente la creación automática de business_ratings del arranque. Las inicializaciones históricas de otros módulos siguen intactas y no se ejecutaron.
- Frontend sin autoridad local, errores/409 y cargas tardías; diseño conservado. JSON-LD falso retirado, TS2339 corregido sin cambiar lógica de Radar. Defaults de nuevos objetos de negocios pasan a cero sin migrar datos.
- Esquema SQL comentado: tabla inexistente y ALTER UNIQUE conservador de tabla existente. Sin DDL activo ni DROP/TRUNCATE de tablas. Propuesta 001 redirige a 006.
- tsc --noEmit PASA; Vite frontend PASA (1720 módulos, advertencia chunk >500kB); esbuild backend PASA.
- 26 comprobaciones frontend y 26 backend PASAN, ambas con mocks. Backend prueba rutas extraídas sin arrancar servidor y repositorio inyectado sin crear pool real. No se ha probado SQL/GET_LOCK/snapshots de MariaDB real.
- Riesgos: no hay motor local; falta esquema/permisos/backup de hosting verificados. Sin FK para no cambiar lifecycle de businesses; un borrado externo concurrente puede crear huérfanos, detectados en auditoría posterior. Identificador no es identidad humana; no se añade antibot/rate limit en esta entrega.
- Siguiente paso: revisión estática del diff, escenarios de fallos adicionales, evidencia reproducible y cierre. Sin bloqueos de edición; validación real pendiente.
