# ENC-PUBLIC-DETAIL-UX-001 — Mejoras en la Ficha Pública y Presentación Móvil

**Responsable:** GAS (Google AI Studio)  
**Repositorio:** `dJeoMed78/Encarmenorg`  
**Rama:** `work/enc-public-detail-ux-001`  
**Base:** `origin/ia-desarrollo` (`0d231cb2779b7a14d8d336fc2f4de3782663c738`)  
**Estado:** IMPLEMENTADO / VERIFICADO LOCALMENTE / PRUEBAS Y EVIDENCIA APROBADAS  

---

## 1. Alcance y Objetivos

1. **ENC-F007A: Orden y presentación de los elementos de la ficha en teléfonos:**
   - Reestructurar el flujo visual en pantallas móviles (`<= 700px`) de forma ordenada y coherente:
     1. Cabecera con categoría, título responsivo, estrellas compactas y salto directo a calificaciones (`order: 1`).
     2. Identidad y logotipo con proporción compacta de 120px (en lugar de 150px fija que desplazaba la pantalla) (`order: 2`).
     3. Galería multimedia y acciones de contacto directas: fotografía principal con altura adaptativa `clamp(200px, 52vw, 260px)`, miniaturas de 48–62px, botones de contacto directo WhatsApp (`.bpd-wa`) y Llamar (`.bpd-call`), tarjeta QR y compartir (`.bpd-pair`), y acceso a ficha pública (`order: 3`).
     4. Descripción comercial con enlaces interactivos legibles (`order: 4`).
     5. Promoción comercial activa si existe (`order: 5`).
     6. Bloque informativo de hechos: Ubicación y Google Maps con consentimiento, Horario de atención, Formas de pago y Entrega y servicio (`order: 6`).
     7. Calificaciones de la comunidad con `StarRatingWidget` oficial y aviso de comentarios (`order: 7`).
     8. Pie con acceso a gestión (`.bpd-footer`).

2. **Enlaces web y referencias multimedia en descripciones:**
   - Reutilización de `src/utils/descriptionLinks.ts` y `src/components/BusinessDescription.tsx` de `work/enc-business-ui-fix-001`.
   - Conversión automática de URL crudas (YouTube, Vimeo, TikTok, Facebook, Instagram, Google Maps, WhatsApp, imágenes, videos y sitios web) en enlaces interactivos con etiquetas amigables y seguras (`target="_blank" rel="noopener noreferrer nofollow ugc"`).
   - Limpieza de shortcodes heredados de WordPress (`[embed]`, `[video]`) y marcado HTML.
   - Bloqueo estricto de esquemas peligrosos (`javascript:`, `data:`, `file:`) y URL con credenciales.

3. **Prevención de desbordamientos, superposiciones y navegación incómoda:**
   - Incorporación de `env(safe-area-inset-*)` en el contenedor principal (`.bpd-shell`).
   - Desplazamiento táctil fluido en modal móvil (`overflow-y: auto`, `overflow-x: hidden`, `-webkit-overflow-scrolling: touch`).
   - Prevención de desbordamiento horizontal en botones dobles (`.bpd-pair`) mediante `white-space: nowrap`, `text-overflow: ellipsis` y padding responsivo.
   - Barra de herramientas superior (`.bpd-toolbar`) que no se quiebra en líneas asimétricas y soporte dedicado para pantallas estrechas (`<= 360px`).
   - Botón de cierre en galería con fondo contrastado y elevación para no superponerse ni perderse sobre fotografías.
   - Tipografía de título con `clamp(21px, 5.5vw, 29px)` y `overflow-wrap: anywhere; word-break: break-word`.

4. **Preservación estricta:**
   - Botones y enlaces de WhatsApp y Teléfono intactos, con sus formatos mexicanos y estados deshabilitados cuando no están registrados.
   - Sistema de calificaciones intacto: `StarRatingWidget` y `useBusinessRatings` sin alteraciones.
   - Sin modificaciones a MariaDB, migraciones, scripts del backend ni lógica administrativa.
   - Diseño Glassmorphism preservado.

---

## 2. Archivos Modificados y Creados

- `src/components/BusinessPublicDetail.tsx` (modificado: integración de `BusinessDescription` y clases semánticas).
- `src/components/BusinessPublicDetail.css` (modificado: unificación de media queries móviles, orden ENC-F007A, safe-area insets, alturas clamp, prevención de desbordamientos).
- `src/utils/descriptionLinks.ts` (incorporado de `work/enc-business-ui-fix-001`: parser seguro de enlaces y multimedia).
- `src/components/BusinessDescription.tsx` (incorporado de `work/enc-business-ui-fix-001`: componente presentacional de descripción).
- `tests/business-description-links.test.mjs` (13 pruebas unitarias de links y multimedia).
- `tests/business-ui-fix-001.integration.test.mjs` (5 pruebas de integración de la ficha pública).
- `tests/public-detail-ux-001.test.mjs` (8 pruebas completas de contrato móvil ENC-F007A, desbordamientos y preservación).
- `scripts/capture_evidence_visual.js` (script de captura y verificación visual mediante Chromium).
- `docs/evidence/ENC-PUBLIC-DETAIL-UX-001/` (capturas reales y archivo `inspection.json`).

---

## 3. Evidencia de Ejecución

### Pruebas Automatizadas (26/26 PASS)
```bash
node --test tests/public-detail-ux-001.test.mjs tests/business-description-links.test.mjs tests/business-ui-fix-001.integration.test.mjs
```
- `tests/public-detail-ux-001.test.mjs`: 8/8 pruebas aprobadas (orden CSS ENC-F007A, dimensiones clamp, safe areas, desbordamiento horizontal, WhatsApp/Teléfono preservados, seguridad y MariaDB intacta).
- `tests/business-description-links.test.mjs`: 13/13 pruebas aprobadas.
- `tests/business-ui-fix-001.integration.test.mjs`: 5/5 pruebas aprobadas.

### Verificación TypeScript y Compilación
- `npx tsc --noEmit`: 0 errores de tipos.
- `compile_applet` (Vite build): Compilación satisfactoria exitosa.

### Inspección Visual Real (Chromium 153.0.8010.0 / Playwright)
Ejecutado sobre servidor local activo con datos reales del catálogo (Negocio 1081 "Yuss Nails Beautiful Hands"):
- **Verificación geométrica móvil (390x844):**
  - `headingTop` (-544.5) < `identityTop` (-328.3) < `mediaTop` (-196.3) < `descTop` (333.4) < `factsTop` (478.6) < `reviewsTop` (1002.3).
  - Orden visual estrictamente confirmado.
- **Conversión de multimedia en descripción:**
  - URL cruda `yuss-video.mp4` convertida en enlace interactivo: `texto: "Ver video"`, `target: "_blank"`, `rel: "noopener noreferrer nofollow ugc"`.
- **Desbordamiento horizontal:**
  - `scrollWidth: 390px`, `clientWidth: 390px` (desbordamiento = 0px).
- **Acciones preservadas:**
  - WhatsApp: `https://wa.me/529383895009`
  - Teléfono: `tel:+529383895009`

Capturas generadas en `docs/evidence/ENC-PUBLIC-DETAIL-UX-001/`:
- `desktop-1440.png` y `desktop-1440-full.png`
- `mobile-390-viewport.png`, `mobile-390-scrolled.png` y `mobile-390-full.png`
- `mobile-360-viewport.png` y `mobile-360-full.png`
- `inspection.json`
