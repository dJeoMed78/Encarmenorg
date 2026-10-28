# ENC-UI-GLASS-001 — Especificación aprobada de ficha empresarial

**Estado:** especificación preparada, IMPLEMENTACIÓN PENDIENTE. **Responsable:** coordinación. **Destino futuro:** rama independiente, nunca main.

## Referencia aprobada
Imagen enviada nuevamente por propietario en conversación 2026-10-27 (archivo de conversación; no adjuntado a GitHub). La referencia visual es obligatoria; no sustituirla por diseños genéricos. **No incorporar datos de ejemplo como contenido real.** La imagen muestra empresa ficticia de demostración «Bendita Carmelita»; no crearla en BD.

## Composición de escritorio
- Marco general Glass iOS/macOS: superficie semitransparente, fondo ambiental desenfocado, radios suaves, bordes luminosos sutiles y sombras moderadas. Respetar navegación principal existente; NO agregar otra barra superior dentro de ficha.
- Tres columnas: izquierda fotografía grande con controles anterior/siguiente, acceso a todas las fotos y mosaico de miniaturas; debajo CTA WhatsApp verde, llamada azul, QR, compartir, landing page.
- Centro: categoría, nombre de empresa con Roboto y jerarquía visual, subtítulo, calificación real (cero votos = sin calificación), botón para ver opiniones; descripción y lista de opiniones reales con opción de escribir.
- Derecha: logo empresarial, ubicación/mapa y enlace externo, horarios y estado calculado si existen datos fiables, métodos de pago y modalidad de entrega.
- Panel administrativo: acceso discreto con símbolo π, autenticación centrada si no hay sesión; menú Glass con editar, recomendar, TOP y eliminar, siempre con permisos comprobados por backend.
- Preservar funciones actuales: favoritos, galería, contactos, QR, enlaces, administración, y navegación. Sin duplicar el número telefónico si ya aparece en CTA.

## Responsive y accesibilidad
- Tablet: reorganizar columnas sin superposición; celular: columna única con foto/CTA prioritarios, descripción/opiniones y datos de ubicación/horarios/pagos.
- Controles táctiles adecuados, contraste, teclado, focus visible, imágenes alt, botones con etiquetas y estados carga/error.
- No depender de efectos blur para legibilidad; degradación razonable en navegadores móviles.
- No inventar rating 5.0, 42 opiniones, horarios, fotos, métodos de pago ni estado 'Abierto ahora'.

## Compatibilidad con trabajo en curso
Work ENC-REVIEWS-006 modifica src/components/BusinessDetailModal.tsx, DirectBusinessView.tsx, App.tsx y componentes ratings. NO editar estos archivos en paralelo ni fusionar sin revisión. La implementación visual debe partir del resultado de ENC-REVIEWS-006 cuando esté verificado, o trabajar en componentes visuales independientes sin tocar archivos compartidos.

## Criterios de aceptación
1. Comparación visual con referencia aprobada a escritorio, tablet y móvil; capturas reales y diferencias documentadas.
2. Datos dinámicos reales y componentes reutilizados, sin demos persistidas.
3. Todas las acciones funcionan y muestran estado verdadero ante fallos.
4. No degradar funciones existentes ni permisos administrativos.
5. TypeScript, build, pruebas de UI y prueba en Staging tras autorización.
6. Ningún cambio en main/producción.

**Nota:** esta especificación NO es una implementación ni un despliegue.
