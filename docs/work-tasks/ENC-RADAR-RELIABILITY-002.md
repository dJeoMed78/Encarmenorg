# ENC-RADAR-RELIABILITY-002 — Radar: confiabilidad de aprobación, rechazo y errores visibles

**Estado:** AUTORIZACIÓN CONDICIONAL DE IMPLEMENTACIÓN EN RAMA AISLADA. **Orden:** ejecutar después de terminar y publicar el trabajo posible de ENC-REVIEWS-COMMENTS-002, sin esperar revisión intermedia; si comentarios queda bloqueado, documentar bloqueo y continuar esta tarea. **Base:** `ia-desarrollo` actual, no fusionar ramas de Work. **Rama:** `work/enc-radar-reliability-002`. **Duración orientativa:** 60–90 minutos.

## Problema que debe resolverse
El Radar de ENCARMEN detecta candidatos para **negocios, anuncios clasificados y eventos** de Ciudad del Carmen. Se observaron riesgos de interfaz que anuncia aprobaciones o ejecuciones exitosas antes de confirmar persistencia real; rechazo de candidatos solo local; errores de ejecución tratados como éxito. Existe trabajo previo en `coord/radar-classifieds-fix-001` que puede corregir parte de esto; **revisarlo antes de duplicar trabajo**. Nunca presentar una propuesta, mock, timeout o error como registro guardado.

## Comprobación inicial con implementación inmediata
1. Leer `docs/CONTEXTO_ENCARMEN.md`, `docs/WORK_INSTRUCCIONES.md`, `docs/coord/ENC-RADAR-COORD-001.md` y cambios de `coord/radar-classifieds-fix-001` contra `ia-desarrollo`.
2. Inspeccionar `src/components/AdminClassifiedsTab.tsx`, `src/components/AdminEventsTab.tsx`, `src/components/AdminAutoBusinessesModal.tsx`, `src/services/api.ts` y rutas Radar pertinentes en `server.ts` **solo lectura**. Identificar el contrato real de cada acción y qué persistencia garantiza el backend.
3. Si un frontend puede usar un endpoint real seguro y comprobar éxito, implementar inmediatamente. Si no existe endpoint de rechazo/persistencia o el backend responde éxito falso, **no inventar endpoints ni simular persistencia**; deshabilitar la acción insegura o mostrar aviso explícito y entregar propuesta backend, sin tocar servidor. Continuar mejoras independientes.
4. Si los cambios de la rama previa son completos y compatibles, documentar cómo incorporarlos mediante PR posterior; no cherry-pick/merge sin autorización. No duplicar ni sobrescribir trabajo ajeno. Si el mismo archivo cambió en `ia-desarrollo`, adaptar sobre HEAD actual o detener el archivo en conflicto.

## Archivos de escritura autorizados (lista cerrada)
- `src/components/AdminClassifiedsTab.tsx`
- `src/components/AdminEventsTab.tsx`
- `src/components/AdminAutoBusinessesModal.tsx`
- `docs/WORK_RESULTADOS.md`
- `docs/work-progress/ENC-RADAR-RELIABILITY-002.md`
No modificar `server.ts`, `src/services/api.ts`, `src/db/mariadb.ts`, calificaciones, comentarios, ficha Glass, editor, `main`, `ia-desarrollo` ni Staging. Si se requiere otro archivo, detener solo esa parte e informar.

## Reglas funcionales
- Aprobar uno o varios candidatos: UI muestra estado «Procesando» y deshabilita doble envío; espera respuesta API, valida semántica de confirmación, y **solo entonces** retira de pendientes y notifica éxito. Fallos de red, 4xx, 5xx, respuesta parcial y timeout conservan candidatos y permiten reintento seguro.
- Rechazar/descartar: solo mostrar persistencia si el servidor la confirma; si rechazo solo existe en memoria, mostrar «Ocultado en esta sesión» o deshabilitar según riesgo; no anunciar rechazo permanente.
- Radar eventos: no presentar «completado» si la ejecución devuelve error. Diferenciar 0 resultados válidos de fallo técnico. Exponer conteos reales de encontrados, nuevos, duplicados, descartados, aprobados y fallidos solo cuando la API los proporcione.
- Negocios: aplicar misma semántica honesta, no aceptar negocios duplicados, direcciones falsas ni registros incompletos por optimismo visual.
- Candidatos de Ciudad del Carmen: preservar fuente URL original y fecha verificable; nunca inventar teléfonos, precios, fotos, calificaciones, fechas de evento, localidad o anuncios. Candidatos no son publicaciones hasta que exista confirmación real.
- Accesibilidad y UX: estados loading, error, reintento, aria-live y confirmación en operaciones destructivas. Proteger contra callbacks tardíos y actualizaciones de sesión obsoleta.

## Seguridad
- No llamar endpoints destructivos no documentados. No ejecutar sincronizaciones de WordPress ni activar integraciones externas. No usar scraping real en producción, no consultar fuentes con credenciales ni servicios pagos.
- No introducir login local ni credenciales. No suponer que autenticación admin existente es segura; documentar límites y no habilitar operaciones peligrosas sin backend seguro.
- Sin SQL, migraciones, reinicios de servicios, despliegues ni cambios de variables de entorno.

## Pruebas
- Unit/integration con mocks explícitos: éxito real, 400, 401/403, 409, 429, 500/503, timeout, respuesta vacía y parcial, latencia, doble clic, lote con fallo parcial, reintento, cambio de pestaña, rechazo local/no persistente, ejecución de Radar con 0 resultados y con error.
- Comprobar que no desaparecen candidatos ni aparecen notificaciones de éxito falso ante error.
- TypeScript enfocado y Vite build; registrar errores preexistentes por separado. Capturas de estados de error/éxito en escritorio y móvil si se puede ejecutar Chromium.
- Si no hay API real, no afirmar persistencia; pruebas simuladas no equivalen a Staging ni MariaDB.

## Entrega
- Rama exclusiva `work/enc-radar-reliability-002`, checkpoints, commits, informe final en un único bloque `text` con archivos, pruebas, evidencia y bloqueos de backend identificados. No crear PR ni integrar sin coordinación. Si se termina antes de las tres horas, entregar una propuesta técnica detallada de backend seguro y plan de pruebas como parte del checkpoint, sin implementarlo fuera del alcance.
