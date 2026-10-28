# ENC-GLASS-EDITOR-001 — Implementar editor empresarial Glass (trabajo paralelo)

**Tipo:** implementación frontend aislada. **Responsable:** 02 ChatGPT Work. **Prioridad:** alta. **Estado:** ASIGNADA, pendiente de ejecución.
**Repositorio:** `dJeoMed78/Encarmenorg`.
**Instrucciones fuente:** este documento en `coord/encarmen-work-control-001`. Leer también `docs/WORK_INSTRUCCIONES.md`, `docs/CONTEXTO_ENCARMEN.md` (en `ia-desarrollo`) y `docs/coord/ENC-UI-GLASS-001.md` (en coordinación). No asumir documentos sincronizados entre ramas.
**Rama de trabajo:** `work/enc-glass-editor-001`, crear desde SHA vigente de `ia-desarrollo`. No partir de ramas de calificaciones ni Radar.

## Objetivo
Completar y pulir el modal `Editar Negocio` conforme al diseño iOS/macOS Glass aprobado, conservando todos los datos y funciones existentes. Producir avance visual tangible sin bloquear calificaciones.

## Archivos autorizados
- `src/components/EditBusinessModal.tsx` (implementación).
- `docs/WORK_RESULTADOS.md` (agregar reporte en rama de Work).
- `docs/work-progress/ENC-GLASS-EDITOR-001.md` (puntos de control, crear si es necesario).
**Ningún otro archivo** sin autorización previa. No tocar `server.ts`, `src/services/api.ts`, `src/App.tsx`, `src/components/BusinessDetailModal.tsx`, `src/components/DirectBusinessView.tsx`, `src/components/AdminEventsTab.tsx`, `src/db/mariadb.ts` ni `ia-desarrollo`; esos archivos se reservan para la integración de calificaciones. No modificar `main`, producción, BD ni desplegar Staging.

## Referencia visual
`docs/CONTEXTO_ENCARMEN.md` describe la referencia aprobada (primera de seis imágenes enviadas por propietario el 2026-10-27). La imagen **no está en GitHub**: NO afirmar coincidencia píxel a píxel sin acceder a ella. Puede implementarse la especificación textual; informar que la validación visual final requiere la imagen original, sin bloquear el resto.

## Diseño y comportamiento
1. Panel flotante de cristal translúcido, backdrop blur real, fondo ambiental azul/rosa, borde luminoso delgado, sombras sutiles; nunca bloque gris opaco. Accesibilidad/contraste.
2. Encabezado: lápiz, Editar Negocio, subtítulo, botón de cierre.
3. Seis tarjetas agrupadas: Información Básica (nombre/categoría y descripción <=500 con contador), Contacto (teléfono/WhatsApp), Ubicación (colonia/ciudad), Modalidad Atención y Entrega (cinco chips multiselección azul), Métodos de Pago (cuatro chips azules), Horarios de Atención (Lun-Dom toggles y apertura/cierre).
4. Pie fijo translúcido Cancelar/Guardar Cambios, modal compacto y responsive; campos avanzados plegables para conservar logo, galería, enlaces y administración.
5. Conservar valores existentes al abrir/guardar, especialmente horarios de texto libre si no fueron editados. Evitar cerrar modal al seleccionar texto. Validar al menos un teléfono o WhatsApp de 10 dígitos. No reportar éxito de guardado sin confirmación backend.
6. Mantener interfaces/props y compatibilidad con componentes existentes; no reescribir endpoints ni crear registros ficticios.

## Ejecución, evidencia y aceptación
- Inspeccionar primero `package.json` y scripts antes de ejecutarlos; no generar modificaciones no autorizadas.
- Implementar con commits claros y puntos de control; capturas visuales reales si entorno disponible. Si no, no inventarlas.
- Verificar TypeScript y build frontend cuando sea seguro; documentar comandos/salidas, errores y limitaciones.
- Revisar en escritorio, tablet y móvil si se dispone de navegador; comprobar estados iniciales, guardado, errores y horarios heredados, sin simular pruebas reales.
- No realizar pruebas que escriban a MariaDB/Staging sin nueva autorización.
- Agregar informe completo en `docs/WORK_RESULTADOS.md` en rama propia; informe final al usuario **en un único bloque Markdown `text`** con ID, estado, rama, commits, archivos, pruebas, errores, riesgos, pendientes y recomendaciones.
- **No fusionar, no desplegar.** La coordinación revisará independientemente.

## Coordinación de colisiones
Mientras esta tarea corre, 01 revisa PR #2 `work/enc-reviews-006` hacia `ia-desarrollo`. No tocar archivos de calificaciones, no rebasar automáticamente sobre cambios concurrentes. Si se requiere un archivo adicional, detener únicamente esa modificación y solicitar permiso; continuar tareas no bloqueadas.
