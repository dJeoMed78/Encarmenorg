# ENC-CLASSIFIEDS-INTEGRATION-002 — Reporte de Integración en Consolidación

**Destinatario:** Coordinación Principal ENCARMEN  
**Responsable:** GAS — Google AI Studio (Trabajador 3)  
**Tarea:** ENC-CLASSIFIEDS-INTEGRATION-002  
**Repositorio:** `dJeoMed78/Encarmenorg`  
**Rama:** `work/enc-classifieds-integration-002`  
**Base:** `a16ca710449eda3c68f26016b91ce59d55b95b2b` (HEAD de consolidación `ENC-CONSOLIDATION-001`)  
**Entrega de referencia:** `067a3b0e2015397dc33862da475cc5b0eb4ae208` (`work/enc-classifieds-ux-001`)  
**Fecha:** 29 de octubre de 2026  
**Estado:** IMPLEMENTADO / PRUEBAS SUPERADAS / PUBLICADO EN REMOTO

---

## 1. OBJETIVO ALCANZADO

Se integraron de manera selectiva y no destructiva las mejoras del módulo público de clasificados desarrolladas por GAS sobre la versión consolidada de ENCARMEN, respetando plenamente las entregas consolidadas y preparando el contrato frontend para el trabajo en paralelo con PERP.

### Funcionalidades integradas:
1. **Catálogo y tarjetas de clasificados:** Diseño Glassmorphism integrado, eliminación del filtro restrictivo `approvedByAdmin !== true` para permitir visualización de anuncios ciudadanos activos (`status === 'active'`) respetando depuración automática tras 7 días.
2. **Búsqueda, filtros y categorías rápidas:** Barra horizontal de píldoras de acceso rápido ("Todos", "Empleos", "Inmuebles", "Vehículos", "Compra - Venta", "Mascotas", "Servicios") con insignias de conteo dinámico.
3. **Selector oficial de colonias:** Inyección del catálogo de 133 colonias reales de Ciudad del Carmen (`ALL_COLONIAS_CARMEN`) en filtros y formulario de alta.
4. **Miniaturas fotográficas seguras:** Renderizado de portada fotográfica en cuadrícula con fallback a monograma y verificación.
5. **Formulario de publicación responsivo:** Subida de hasta 6 fotografías (≤5MB, tipo imagen), validación estricta de canales de contacto, selección de modalidad y entrega.
6. **Detalle con enlaces interactivos:** Transformación segura de enlaces web, WhatsApp, YouTube y Maps mediante `parseDescription` (`src/utils/descriptionLinks.ts`).
7. **Manejo de errores sincero y estados de carga:** Eliminación total de simulación local en `localStorage` (Regla C); estado de carga ("Guardando en el servidor..."), banners de error explícitos y botón de reintento.
8. **Navegación móvil adaptable:** Drawer colapsable para filtros avanzados en pantallas móviles (<768px), optimizado para 320, 360 y 390 píxeles sin desbordamiento horizontal.
9. **Accesibilidad y ergonomía táctil:** Tecla `Escape` y bloqueo de scroll de fondo (`document.body.style.overflow = 'hidden'`) en ambos modales; targets táctiles >= 44px; separación `pr-10` contra superposición con botón de favoritos.
10. **Contrato de API pública (PERP):** Frontend preparado para el contrato `/api/public/classifieds` (`GET`, `POST`, `PATCH`, `DELETE`).

---

## 2. PRESERVACIÓN DE LÍMITES Y CONSOLIDACIÓN

- **Cero modificaciones en Servidor / Base de Datos:** `server.ts`, `src/server/`, `src/db/` y archivos de configuración de seguridad permanecen 100% inalterados respecto a `a16ca710449eda3c68f26016b91ce59d55b95b2b`.
- **Registro Público Empresarial intacto:** Conservada la lógica completa de `RegisterBusinessView`, aislamiento y almacenamiento en MariaDB.
- **Sin artefactos de compilación en git:** Ni `dist/` ni `src/constants/version.ts` se modificaron ni commitearon.
- **Sin despliegues ni escrituras no autorizadas.**

---

## 3. ARCHIVOS MODIFICADOS Y CREADOS

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/components/ClassifiedsView.tsx` | Integrado | Catálogo Glassmorphism, píldoras rápidas, filtro móvil colapsable, miniaturas y feed activo. |
| `src/components/ClassifiedDetailModal.tsx` | Integrado | Modal de detalle, parser de enlaces interactivos, bloqueo de scroll, targets táctiles y tecla Escape. |
| `src/components/ClassifiedCreateModal.tsx` | Integrado | Formulario de alta, validación de fotos, 133 colonias de Carmen, tecla Escape y estados de guardado. |
| `src/App.tsx` | Modificado selectivamente | Cableado de estados `classifiedsLoading`, `classifiedsError`, recarga y handlers sin tocar registro empresarial ni administración. |
| `src/services/api.ts` | Modificado selectivamente | Implementación del contrato de API pública `/api/public/classifieds` con manejo honesto de errores (HTTP 404, 500, red). |
| `tests/classifieds-integration-002.test.mjs` | Nuevo | Suite integral de 16 pruebas automatizadas (servidor HTTP simulado para 200/201, 400, 401, 403, 404, 409, 429, 500 y fallo de red). |
| `docs/work-progress/ENC-CLASSIFIEDS-INTEGRATION-002.md` | Nuevo | Este documento de informe técnico. |

---

## 4. RESULTADOS DE PRUEBAS AUTOMATIZADAS

### 4.1. Suite de Integración (`tests/classifieds-integration-002.test.mjs`)
16/16 pruebas aprobadas (100% PASS):
- `GET /api/public/classifieds` (200 OK) -> PASS
- `POST /api/public/classifieds` (201 Created) -> PASS
- `POST /api/public/classifieds` (400 Bad Request) -> PASS
- `PATCH /api/public/classifieds/:id` (401 Unauthorized) -> PASS
- `DELETE /api/public/classifieds/:id` (403 Forbidden) -> PASS
- `GET / POST` (404 Not Found - Estado en preparación por PERP) -> PASS
- `POST /api/public/classifieds` (409 Conflict) -> PASS
- `POST /api/public/classifieds` (429 Rate Limit) -> PASS
- `GET /api/public/classifieds` (500 Error Interno) -> PASS
- Conexión perdida / Servidor offline -> PASS
- Parser `descriptionLinks` (texto plano, enlaces web, WhatsApp, YouTube, limpieza HTML) -> PASS
- Responsividad móvil y accesibilidad de `ClassifiedsView`, `ClassifiedCreateModal`, `ClassifiedDetailModal` -> PASS
- Validación de límites de arquitectura -> PASS

### 4.2. Pruebas de Regresión Consolidadas
- `tests/business-description-links.test.mjs`: 13/13 PASS
- `tests/backup-security-002.test.cjs`: 9/9 PASS
- `tests/public-registration.test.mjs`: 14/14 PASS
- `tests/public-registration-server-patch.test.mjs`: 3/3 PASS

### 4.3. TypeScript & Compilación
- `npx tsc --noEmit`: EXIT 0 (Sin errores de tipado).
- `compile_applet`: Build exitoso.

---

## 5. PENDIENTES DE CONEXIÓN CON PERP Y RIESGOS

- **Endpoints Backend pendientes:** PERP debe desplegar en su rama los endpoints `/api/public/classifieds` (`GET`, `POST`, `PATCH`, `DELETE`).
- **Comportamiento en ausencia de endpoints:** El frontend maneja de forma segura y honesta el estado HTTP 404 informando: *"El servicio público de clasificados está en preparación por PERP (HTTP 404)"*, sin que la aplicación sufra caídas ni guarde datos simulados.
- **Riesgo de integración:** Nulo para la consolidación, ya que ningún archivo de base de datos, backend, registro empresarial o seguridad fue modificado.
