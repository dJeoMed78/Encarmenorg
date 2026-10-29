# ENC-CLASSIFIEDS-UX-001 — Reporte de Implementación y Evidencia

**Destinatario:** Coordinación Principal ENCARMEN  
**Responsable:** GAS — Google AI Studio (Trabajador 3)  
**Tarea:** ENC-CLASSIFIEDS-UX-001  
**Prioridad:** MEDIA-ALTA  
**Rama:** `work/enc-classifieds-ux-001`  
**Base:** `0d231cb2779b7a14d8d336fc2f4de3782663c738` (HEAD de `origin/ia-desarrollo`)  
**Fecha:** 29 de octubre de 2026  
**Estado:** IMPLEMENTADO / PRUEBAS SUPERADAS / EVIDENCIA VISUAL REAL GENERADA

---

## 1. OBJETIVO ALCANZADO

Se implementó una mejora integral del módulo público de clasificados y bolsa de trabajo de ENCARMEN, resolviendo fallas críticas de visualización, navegación móvil, integración con la API real y presentación estética con Glassmorphism:

1. **Resolución de la Causa Raíz de Publicaciones Vacías:** Se eliminó la condición restrictiva `ad.approvedByAdmin !== true` en `ClassifiedsView.tsx`, la cual ocultaba todos los anuncios activos creados por ciudadanos mediante `POST /api/classifieds`. Ahora el módulo muestra de inmediato los anuncios activos (`status === 'active'`), filtrando únicamente los estados `trash`, `sold`, `expired` o `pendingApproval`, y respetando la regla estricta de depuración automática tras 7 días de vigencia.
2. **Persistencia Real y Eliminación de Simulación Local (Regla C):** Se eliminó el almacenamiento falso en `localStorage` que fingía publicación exitosa. Se conectó `App.tsx` y los modales con las funciones reales de la API (`fetchClassifieds`, `createClassified`, `updateClassified`, `deleteClassified`), informando estados de carga sinceros ("Guardando en el servidor..."), confirmaciones reales y banners de error explícitos en caso de fallo de red.
3. **Catálogo Real de 133 Colonias de Carmen:** Se integró la lista completa de colonias oficiales de Ciudad del Carmen (`ALL_COLONIAS_CARMEN`) en los selectores de búsqueda y publicación en lugar de arreglos vacíos `[]`.
4. **Selector Rápido de Categorías (Pills):** Se introdujo una barra de acceso rápido en la cabecera con insignias de conteo por categoría ("Todos", "Empleos", "Inmuebles", "Vehículos", "Compra - Venta", "Mascotas", "Servicios") con diseño Glass, facilitando la exploración con un solo toque.
5. **Colapso Inteligente de Filtros en Móvil:** En pantallas pequeñas (`<768px`), los cuatro selectores altos ya no desplazan el contenido fuera del viewport; se ofrece un botón compacto de "Filtros avanzados" con indicador de filtros activos que despliega las opciones secundarias ordenadamente.
6. **Soporte de Miniaturas de Imágenes:** Las tarjetas de clasificados ahora presentan miniatura fotográfica si el anuncio incluye imágenes (`ad.images` o `ad.image`), con fallback al monograma y verificación de origen.
7. **Protección Anti-Colisión y Botones Táctiles:** En viewports estrechos (360px y 390px), se aseguró un espacio seguro (`pr-10`) para el botón de favoritos/guardado, previniendo superposiciones con títulos largos, y se dimensionaron los botones de contacto (WhatsApp, Llamar, Correo) con objetivos táctiles >= 44px.
8. **Enlaces Interactivos en Descripciones:** En `ClassifiedDetailModal.tsx`, se integró `parseDescription` (`src/utils/descriptionLinks.ts`) para convertir de forma segura las direcciones web, números de WhatsApp, enlaces de Google Maps y videos de YouTube en botones y enlaces interactivos con apertura en nueva pestaña (`rel="noopener noreferrer"`).
9. **Control de Scroll y Accesibilidad por Teclado:** Tanto `ClassifiedCreateModal.tsx` como `ClassifiedDetailModal.tsx` ahora bloquean el scroll de fondo (`document.body.style.overflow = 'hidden'`) y admiten el cierre accesible mediante la tecla `Escape`.

---

## 2. LÍMITES Y CUMPLIMIENTO DE REGLAS DE AISLAMIENTO

- **Cero modificaciones en Servidor / Base de Datos:** Los archivos `server.ts`, `src/db/` y `src/server/` se mantuvieron 100% intactos e inalterados.
- **Sin afectación a MariaDB ni credenciales:** No se ejecutaron migraciones, alteraciones de esquemas ni escrituras directas.
- **Sin artefactos de compilación en git:** La carpeta `dist/` y el archivo `src/constants/version.ts` se preservaron en su estado limpio original sin commits de binarios.
- **Sin despliegues ni modificaciones en Producción o Staging.**

---

## 3. ARCHIVOS MODIFICADOS Y CREADOS

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/components/ClassifiedsView.tsx` | Modificado | Rediseño Glassmorphism, píldoras rápidas de categoría, filtro móvil colapsable, soporte de miniaturas, esqueletos de carga y corrección del filtro de anuncios activos. |
| `src/components/ClassifiedDetailModal.tsx` | Modificado | Integración de parser de enlaces interactivos en descripción, bloqueo de scroll en body, listener tecla Escape, targets táctiles >= 44px y diseño Glass. |
| `src/components/ClassifiedCreateModal.tsx` | Modificado | Persistencia real contra API, validación de hasta 6 fotos (≤5MB), integración de 133 colonias de Carmen, tecla Escape y bloqueo de scroll. |
| `src/App.tsx` | Modificado | Cableado real de estados `classifiedsLoading`, `classifiedsError`, recarga `loadClassifieds`, mapeo de colonias de Carmen y handlers `onEdit`/`onDelete`. |
| `src/services/api.ts` | Modificado | Tipado y retorno de mensajes de error de servidor en `fetchClassifieds` para retroalimentación honesta al usuario. |
| `src/utils/descriptionLinks.ts` | Nuevo / Restaurado | Parser de texto a partes seguras (enlaces web, videos, mapas, WhatsApp) respetando contratos previos. |
| `tests/classifieds-ux-001.test.mjs` | Nuevo | Batería de 5 pruebas automatizadas unitarias y de integración para validar reglas y límites. |
| `scripts/capture_evidence.mjs` | Nuevo | Script de automatización CDP para Chromium local headless. |
| `scripts/capture_scroll_evidence.mjs` | Nuevo | Script de captura enfocada en componentes y modales en escritorio y móvil. |
| `docs/work-progress/ENC-CLASSIFIEDS-UX-001.md` | Nuevo | Este informe técnico y de auditoría. |

---

## 4. RESULTADOS DE PRUEBAS AUTOMATIZADAS

### 4.1. Suite Específica: `node --test tests/classifieds-ux-001.test.mjs`
```
TAP version 13
# Subtest: ENC-CLASSIFIEDS-UX-001: Description link parser transforms URLs into interactive parts
ok 1 - ENC-CLASSIFIEDS-UX-001: Description link parser transforms URLs into interactive parts
# Subtest: ENC-CLASSIFIEDS-UX-001: ClassifiedsView does not reject citizen ads with approvedByAdmin !== true
ok 2 - ENC-CLASSIFIEDS-UX-001: ClassifiedsView does not reject citizen ads with approvedByAdmin !== true
# Subtest: ENC-CLASSIFIEDS-UX-001: ClassifiedCreateModal enforces real server persistence and handles Escape key
ok 3 - ENC-CLASSIFIEDS-UX-001: ClassifiedCreateModal enforces real server persistence and handles Escape key
# Subtest: ENC-CLASSIFIEDS-UX-001: ClassifiedDetailModal uses link parser and locks body scroll
ok 4 - ENC-CLASSIFIEDS-UX-001: ClassifiedDetailModal uses link parser and locks body scroll
# Subtest: ENC-CLASSIFIEDS-UX-001: Boundary checks — No changes to server, database, or MariaDB
ok 5 - ENC-CLASSIFIEDS-UX-001: Boundary checks — No changes to server, database, or MariaDB
1..5
# tests 5
# pass 5
# fail 0
```

### 4.2. Suite de Regresión Existente: `node --test tests/backup-security-002.test.cjs tests/test_staging_isolation.mjs`
- 10 pruebas ejecutadas (175 peticiones de seguridad de respaldo y 7 comprobaciones de aislamiento Staging).
- **Resultado:** 10 aprobadas, 0 fallidas (10/10 PASS).

### 4.3. Verificación de Tipos TypeScript y Compilación
- `npx tsc --noEmit`: EXIT 0 (Cero errores de tipos).
- `compile_applet`: EXIT 0 (Compilación exitosa).

---

## 5. EVIDENCIA VISUAL REAL (CHROMIUM HEADLESS LOCAL)

Las capturas fueron obtenidas ejecutando la aplicación localmente en el servidor de desarrollo en `http://localhost:3000/clasificados` y se encuentran almacenadas en el repositorio en `docs/evidence/ENC-CLASSIFIEDS-UX-001/`:

1. `01_desktop_classifieds_feed_1440x900.png` — Vista panorámica de escritorio (1440x900) mostrando la cabecera Glassmorphism, barra de búsqueda, píldoras de categorías con conteos ("Todos 1", "Empleos 0", etc.) y filtros alineados.
2. `01_desktop_classifieds_cards_1440x900.png` — Cuadrícula de tarjetas de clasificados en escritorio con insignia "Anuncio Verificado", monograma, detalles de contacto y enlace "Ver detalles completos".
3. `02_desktop_classified_create_modal.png` — Modal interactivo de creación de anuncios con las 133 colonias reales de Carmen cargadas, selector de fotos y validación comercial.
4. `03_desktop_classified_detail_modal.png` — Modal de detalle completo en escritorio con categorización, tarjeta de contacto, descripción parseada y opción de solicitar baja al administrador.
5. `04_mobile_classifieds_header_390x844.png` — Vista móvil en resolución iPhone (390x844) con cabecera responsiva, botón "+ Publicar Vacante o Anuncio" accesible y buscador.
6. `05_mobile_cards_grid_390x844.png` — Lista de tarjetas en viewport móvil de 390px comprobando ausencia de desbordamiento horizontal y adaptación fluida.
7. `06_mobile_classified_detail_modal_390x844.png` — Modal de detalle en móvil con botones de llamada y WhatsApp táctiles de fácil pulsación.
8. `07_compact_mobile_feed_360x740.png` — Comprobación en viewport móvil compacto (360x740) garantizando que no se generan saltos de línea anómalos ni colisiones visuales.
