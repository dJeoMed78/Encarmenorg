# ENC-REVIEWS-003 — Corregir consumidores de ratings y coherencia frontend

**Estado:** PENDIENTE. **Tipo:** implementación controlada sin despliegue. **Ejecutor:** ChatGPT Work.
**Base:** rama ia-desarrollo, verificar SHA al comenzar. **Rama de tarea:** work/enc-reviews-003.
**Antecedentes:** docs/work-tasks/ENC-REVIEWS-001.md, ENC-REVIEWS-002.md; commit backend a6819631fb9925deb5aeedce7b9b9b40e77454e7 en work/enc-reviews-001.

## Objetivo
Eliminar éxitos ficticios, cinco estrellas por defecto y dependencia de localStorage como fuente de verdad en consumidores frontend de calificaciones. Alinear el cliente con los contratos reales del backend de ENC-REVIEWS-001 sin modificar ni integrar ese backend.

## Leer antes de empezar
- docs/WORK_INSTRUCCIONES.md y docs/WORK_RESULTADOS.md de coord/encarmen-work-control-001 o rama pertinente.
- docs/CONTEXTO_ENCARMEN.md de ia-desarrollo.
- Auditoría ENC-REVIEWS-002, aportada por el usuario/coordinador; hallazgos B1, B2, B4, I3, I4, I6.
- Revisar todos los consumidores reales de realRatings, StarRatingWidget, GET /api/ratings y POST /api/ratings.

## Archivos autorizados
- src/utils/realRatings.ts
- src/components/StarRatingWidget.tsx
- src/components/BusinessDetailModal.tsx
- src/components/DirectBusinessView.tsx **solo si existe**
- src/App.tsx
- src/services/api.ts
- src/components/NewestBusinessesBanner.tsx
- src/components/AdminAutoBusinessesModal.tsx
- docs/WORK_RESULTADOS.md (incorporar desde coordinación si falta)
- docs/work-progress/ENC-REVIEWS-003.md (puntos de control durante hitos sustanciales)

Si otro archivo requiere cambios, detener ese subtrabajo y solicitar autorización. No modificar server.ts, src/db/mariadb.ts, esquemas SQL, package.json, scripts, CONTEXTO_ENCARMEN.md ni archivos de producción.

## Criterios de aceptación
1. No confirmar votos, modificar contadores ni mostrar agradecimiento antes de POST exitoso confirmado por servidor.
2. Enviar visitorId válido y rating numérico entero 1..5 según contrato backend. No presentar identificador local como garantía de una persona/un voto.
3. Ante 400/404/409/503 o error de red, informar sin éxito ficticio; ante 409 reconciliar con GET real.
4. Cero votos se representa como sin calificaciones, nunca cinco estrellas. No usar 5.0 ni count=1 como fallback de error.
5. Agregados compartidos deben provenir de endpoints reales; localStorage solo puede conservar identificador auxiliar y nunca promedios autoritativos.
6. Revisar tarjetas, modal, ficha directa, landing y administración para no reintroducir calificaciones inventadas. No reescribir datos históricos ni migrar BD.
7. Preservar contratos y experiencia de usuario, con estados de carga, error y sin votos.
8. Si el backend no está desplegado, documentar explícitamente la dependencia y no afirmar prueba integrada.
9. Identificar y documentar cualquier dato preexistente de rating/reviewCount del catálogo que no pueda corregirse sin backend o migración.

## Validación
- Revisar package.json para evitar scripts que incrementen versión o generen artefactos fuera de alcance.
- Ejecutar tsc --noEmit o lint solo cuando sea posible sin efectos laterales; registrar si no se puede.
- Pruebas reales o mocks de consumidor: POST éxito, 400/409/503, red caída, negocio sin votos, datos nulos, recarga, vistas múltiples; distinguir simulaciones de integración real.
- No ejecutar servidor contra BD real ni tocar staging.

## Entrega
- Rama y commits publicados, sin merge ni PR automático.
- docs/WORK_RESULTADOS.md y checkpoints autorizados.
- Informe final íntegro en **un único bloque de código Markdown text**, listo para copiar con un clic.
- Riesgos, pruebas no realizadas, dependencias del backend, rollback.
- Esperar revisión del coordinador.

## Prohibiciones
No modificar main, ia-desarrollo, producción, staging, BD, secretos ni infraestructura. No migraciones ni despliegues. No integrar ENC-REVIEWS-001 automáticamente. No asumir que estar en el mismo proyecto permite sincronización directa entre chats.
