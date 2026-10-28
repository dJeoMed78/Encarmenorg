# ENC-REVIEWS-COMMENTS-002 — Implementación segura de comentarios opcionales y moderación

**Estado:** AUTORIZACIÓN CONDICIONAL PARA DESARROLLO LOCAL EN RAMA AISLADA. **Precedencia:** después de concluir y publicar corrección del logo de ENC-GLASS-BUSINESS-DETAIL-001. **Base:** `ia-desarrollo` actualizada tras integración autorizada de PR #4; si PR #4 aún no está integrado, usar la versión de `ia-desarrollo` disponible y evitar modificar la ficha Glass, documentando dependencia. **Rama:** `work/enc-reviews-comments-002`. **Duración orientativa:** 90–120 min; la calidad prima sobre tiempo.

## Objetivo aprobado por propietario
Al calificar un negocio con 1–5 estrellas, ofrecer un campo de comentario opcional en **texto puro español**. Si es válido, publicar automáticamente junto al voto. Sin comentarios se conserva el flujo de estrellas. Los administradores autorizados deben poder **eliminar/ocultar el texto desde la ficha pública Y desde el módulo administrativo**, mediante backend autenticado, sin alterar la estrella ni promedio por moderar texto.

## Precondiciones obligatorias, sin fase de espera
1. Leer `docs/WORK_INSTRUCCIONES.md`, `docs/CONTEXTO_ENCARMEN.md`, `docs/work-tasks/ENC-REVIEWS-COMMENTS-001.md` en `coord/encarmen-work-control-001` y código actual de `ia-desarrollo`. Revisar especialmente `server.ts`, `src/db/mariadb.ts`, `src/services/api.ts`, `src/components/StarRatingWidget.tsx`, `src/components/BusinessPublicDetail.tsx`, `src/components/AdminBusinessesTab.tsx` y componentes admin reales (no asumir nombres). Localizar rutas y autenticación real, sin confiar en controles del cliente.
2. **Si la autenticación administrativa es insegura o no existe verificación server-side fiable, NO implementar ni habilitar eliminación administrativa**. Continuar el módulo público seguro, dejando la moderación deshabilitada y documentando el bloqueo. No inventar credenciales ni usar PIN local.
3. La tabla `business_ratings` contiene `comment`, pero comprobar cómo se lee/escribe y qué claves/índices existen antes de decidir esquema. **Prohibido ejecutar SQL/migraciones contra Staging o producción.** Si se necesita columna nueva para ocultamiento/auditoría, entregar migración propuesta idempotente, rollback y plan de respaldo como archivo documental; no aplicarla. No crear endpoint que dependa de esquema inexistente sin feature gate/estado honesto.
4. No modificar `main`, `ia-desarrollo`, producción, Staging, ni secretos. Si aparece colisión real con Glass o Radar, detener solo el archivo afectado e informar.

## Alcance de escritura autorizado
- `src/components/StarRatingWidget.tsx` y archivos frontend exclusivos de comentarios creados bajo `src/components/BusinessComments*.tsx` y `src/components/BusinessComments*.css`.
- `src/components/BusinessPublicDetail.tsx` **solo** para insertar comentarios y botones de moderación autorizados, preservando diseño/logo; `src/components/BusinessPublicDetail.css` solo estilos específicos.
- `src/services/api.ts`, `src/utils/realRatings.ts` solo contratos de comentarios/calificaciones compatibles hacia atrás.
- `server.ts`, `src/db/mariadb.ts` exclusivamente rutas y persistencia de comentarios y controles de seguridad, sin tocar otras áreas.
- El componente real del panel de administración de negocios/comentarios, **solo si se identifica inequívocamente**, para incluir sección de comentarios y botón eliminar. Documentar nombre antes de editar. Si requiere cambios de autenticación, detener ese subapartado.
- `docs/WORK_RESULTADOS.md`, `docs/work-progress/ENC-REVIEWS-COMMENTS-002.md` y propuesta SQL documental `docs/work-progress/ENC-REVIEWS-COMMENTS-002-SQL-PROPUESTA.md` si es imprescindible.
- No modificar `EditBusinessModal.tsx`, Radar, dependencias, scripts, `App.tsx` ni infraestructura sin autorización específica. Si el montaje exige App, informar bloqueo concreto, sin extender alcance unilateralmente.

## Contrato y UX
- Formulario de estrellas: elegir puntuación, comentario opcional (propuesta 10–500 caracteres si hay texto), vista previa/contador, confirmar. Una calificación por visitante-negocio según contrato existente. No duplicar votos. No perder voto válido silenciosamente si el texto es rechazado; informar y permitir corregir/quitar texto antes de confirmar.
- Al guardar, servidor confirma éxito real; manejar 400/409/429/503 y fallos DB sin simular éxito. Lectura pública paginada de comentarios aprobados, sin mostrar IP, visitor_id, email ni identificadores privados.
- Reseñas negativas legítimas permitidas; no exigir 4–5 estrellas. No inventar nombres, avatares, fechas, fotos ni reseñas.
- Publicación automática de comentarios que pasen filtros. Reporte/retirada posterior y posibilidad de bloqueo urgente ante abuso. Si no se puede implementar autorización admin segura, interfaz admin deshabilitada y reporte de pendiente.

## Seguridad backend — imprescindible
- Validar esquema estricto, JSON body size, caracteres, bytes, normalización Unicode razonable, rechazar controles invisibles y caracteres bidi peligrosos. Escapar salida como texto, sin HTML, Markdown interpretado ni `dangerouslySetInnerHTML`. SQL parametrizado.
- Rechazar URLs HTTP(S), dominios desnudos, www, acortadores, correos, números de contacto, handles y direcciones identificables. Probar evasiones mediante espacios, puntuación, Unicode y variantes; no bloquear críticas que mencionan palabras comunes como «calle».
- Bloquear insultos fuertes, amenazas, publicidad, patrones repetitivos, contenido malicioso y otro idioma claramente identificable. Detector de español prudente con nombres propios y préstamos, sin servicios externos pagos; documentar falsos positivos/negativos y que no garantiza 100%.
- Rate limit por visitante/IP/negocio según infraestructura existente; tamaño, longitud, concurrencia, reintentos, duplicados y anti-enumeración. No registrar texto completo o datos sensibles en logs. No añadir dependencias sin autorización.
- Autorización administrativa verificada por servidor en cada solicitud de ocultamiento/eliminación; prohibido confiar en `isAdmin` o rol del cliente. Borrado lógico si esquema lo permite, preservando estrellas; de otro modo documentar plan y dejar bloqueado.

## Pruebas obligatorias
1. Estrellas sin comentario: regresión, una sola por visitante-negocio.
2. Comentario español válido: guardar y recuperar en segundo navegador/cliente de prueba local.
3. Crítica negativa válida se publica; texto rechazado no se publica y muestra error comprensible.
4. URLs, dominios, emails, teléfonos, direcciones, HTML, JS inerte, Unicode, textos repetidos, exceso de longitud, otros idiomas evidentes, insultos, caracteres invisibles y concurrencia.
5. Intentos no autorizados de eliminar: 401/403 y sin cambio; admin autorizado desde ficha y panel cuando el backend seguro esté disponible; eliminar texto no altera promedio ni voto.
6. Simular fallos DB/API; no mostrar falso éxito. TypeScript, Vite, tests automatizados; pruebas de MariaDB reales **solo si se autorizan**, no inventarlas.
7. Capturas escritorio/tablet/móvil con datos sintéticos, comprobar que el logo superior de Glass no se mueve.

## Entrega y condiciones de parada
- Auditoría técnica breve y ejecución inmediata si los contratos son claros. Checkpoints en rama; commits solo en rama de Work. Reporte final único bloque `text` con archivos, commits, pruebas realmente ejecutadas, limitaciones, bloqueos y SQL propuesto si aplica.
- **No PR, merge, despliegue ni SQL**. No tocar producción. Si la moderación no puede hacerse segura, dejarla deshabilitada y continuar comentarios públicos; si persistencia de comentarios requiere cambios de BD no autorizados, desarrollar solo capa preparada y documentar bloqueo sin afirmar funcionamiento real.
