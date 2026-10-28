# ENC-GLASS-BUSINESS-DETAIL-001 — Ficha pública de negocio, diseño Glass de referencia

**Estado:** DEFINIDA PARA ASIGNACIÓN, NO IMPLEMENTADA. **Rama base:** `ia-desarrollo`. **Rama de trabajo propuesta:** `work/enc-glass-business-detail-001`. **Repositorio:** `dJeoMed78/Encarmenorg`.

## Corrección explícita del propietario
La tarea ENC-GLASS-EDITOR-001 fue un error de alcance de coordinación. El propietario NO pidió rediseñar el formulario Editar Negocio. El objetivo verdadero es la **ficha pública de negocio** que ve el visitante, siguiendo el mockup aportado por el propietario el 2026-10-27 (imagen en conversación de coordinación, 630×614 aproximadamente). **No modificar `src/components/EditBusinessModal.tsx`**. PR #3 de la tarea equivocada queda en borrador y **NO debe integrarse**. Conservar editor existente en `ia-desarrollo`.

## Referencia visual obligatoria (descripción precisa)
Pantalla de ficha de negocio estilo Glass, fondo panorámico suave y tarjetas translúcidas redondeadas:
- Encabezado con migas de navegación Inicio > Negocios > categoría > nombre; acciones Guardar y Compartir.
- Diseño de escritorio de tres columnas: **izquierda** fotografía principal grande del establecimiento, controles de galería y miniaturas, botón WhatsApp verde, llamar azul, Tarjeta QR, Compartir negocio y Visitar Landing Page; **centro** nombre, categoría, calificación promedio y número de opiniones, descripción comercial y módulo Opiniones de la comunidad con tarjetas de reseñas y fotografías ilustrativas solo si existen datos reales; **derecha** logotipo del negocio, ubicación/mapa, horario de atención, formas de pago y tipo de envío/servicios.
- Zona administrativa representada en mockup: acceso de administrador y menú de gestión (editar datos, marcar recomendado, TOP, eliminar del directorio); implementar mediante **autenticación y permisos reales existentes**, no login simulado ni credenciales embebidas; acciones destructivas fuera de alcance salvo integración segura con endpoints existentes y confirmación.
- Estilo visual de referencia: glassmorphism translúcido, acentos azul/rosa, sombras suaves, iconos representativos en cada sección, tarjetas con jerarquía clara y buen contraste; conservar el contenido y funcionalidad reales.
- Diseño responsive para tablet y móvil: apilar tarjetas y mantener CTA importantes, sin scroll horizontal.
- Las estrellas reales ya integradas en Staging deben consumirse sin simular promedios ni opiniones. **Comentarios NO implementados todavía**: preparar espacio/estado vacío y contrato futuro; no inventar 42 opiniones, autores, reseñas, fotos, promedios ni votaciones. El módulo de comentarios se implementará en ENC-REVIEWS-COMMENTS-001 después de revisión.
- Mapas, fotografías, horarios, QR, landing page, logo y contacto: utilizar datos reales disponibles; ausencia => fallback honesto, sin datos ficticios.

## Fase 1 — Auditoría de lectura previa, obligatoria
1. Leer `docs/CONTEXTO_ENCARMEN.md`, `docs/WORK_INSTRUCCIONES.md`, y contratos relevantes en rama de coordinación, además de `ia-desarrollo`.
2. Localizar el componente y ruta **reales** de ficha pública, servicios, datos, autenticación y calificaciones; no asumir nombres ni editar el formulario.
3. Entregar a coordinación propuesta de **archivos exactos** a modificar y dependencias, antes de cambios de código. Revisar colisiones con Radar y comentarios.
4. La imagen de referencia no está en GitHub: pedir al propietario/coord acceso al archivo antes de afirmar fidelidad píxel a píxel. La descripción textual es guía, no sustituto de comparación.

## Fase 2 — Implementación (requiere autorización explícita de coordinación)
- Implementar únicamente en los archivos que coordinación autorice tras Fase 1; no modificar archivos de backend, migraciones, calificaciones, Radar o editor por iniciativa propia.
- Conservar navegación, enlaces, permisos, SEO, datos, accesibilidad, estados de error, mobile, y comportamientos existentes.
- Sin `main`, despliegues, migraciones ni SQL. Trabajar en rama independiente desde `ia-desarrollo`.
- Pruebas de frontend reales y compilación; API/DB solo cuando se autoricen; documentar límites.
- Checkpoints en `docs/work-progress` cuando se autoricen escrituras; informe final completo en un solo bloque `text`.

## Criterios de aceptación
- Coincidencia razonable con el mockup del propietario verificada por coordinación y propietario, no solo afirmada por Work.
- Ficha pública, no editor; sin cambios a `EditBusinessModal.tsx`.
- Diseño de tres columnas en escritorio y responsive móvil; tarjetas e iconografía representativas.
- Integración de estrellas reales, no reseñas simuladas; comentarios futuros sin falso funcionamiento.
- No romper navegación, guardado, contactos, galería, permisos, ni acceso administrativo existente.
- No integración automática: PR y revisión independiente de coordinación, Staging requiere autorización específica.

## Estado y decisión
Tarea especificada. **Work no debe implementar Fase 2 hasta que coordinación apruebe lista de archivos**. PR #3 permanece sin integrar. Producción protegida.
