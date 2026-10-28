# ENC-REVIEWS-006 — Implementación integral y funcional de calificaciones (rama aislada)

**Estado:** AUTORIZADA PARA DESARROLLO, NO PARA MIGRACIÓN NI DESPLIEGUE.
**Tipo:** implementación controlada. **Ejecutor:** ChatGPT Work.
**Repositorio:** dJeoMed78/Encarmenorg.
**Rama de coordinación:** coord/encarmen-work-control-001.
**Rama de implementación:** work/enc-reviews-006, creada desde ia-desarrollo (registrar SHA de base).

## Autorización expresa del propietario
El propietario autoriza implementar y rediseñar desde cero, si conviene, el sistema de calificaciones y sus tablas exclusivas, con la condición absoluta de no afectar otras tablas ni datos del portal. La función aún no tiene votos reales según el propietario. Esta autorización cubre diseño, edición de código, SQL propuesto y pruebas locales aisladas con datos sintéticos; **NO autoriza ejecutar SQL contra Staging ni producción, borrar o alterar tablas existentes, cambiar permisos, migrar, fusionar ramas o desplegar**. Cualquier operación real sobre MariaDB en Hostinger requiere revisión y autorización posterior específica. Verificar COUNT(*) antes de cualquier operación destructiva futura, aunque el propietario diga que no hay votos reales.

## Objetivo y alcance
Entregar una implementación coherente y lista para revisión de backend, frontend y esquema de ratings con persistencia MariaDB real cuando se despliegue, sin datos ficticios ni fallbacks engañosos. Consolidar los cambios útiles de ENC-REVIEWS-001 (commit a6819631fb9925deb5aeedce7b9b9b40e77454e7) y ENC-REVIEWS-003 (commit 2e0d007879d474d3afbf378ecdadb06660c64d6a), **sin hacer merge automático**. Leer ENC-REVIEWS-002, 004 y 005 (si está disponible) y las instrucciones del proyecto. Resolver incompatibilidades y revisar independientemente antes de consolidar. No asumir que las ramas son compatibles.

## Archivos permitidos
- server.ts
- src/db/mariadb.ts
- src/services/api.ts
- src/utils/realRatings.ts
- src/components/StarRatingWidget.tsx
- src/components/BusinessDetailModal.tsx
- src/components/DirectBusinessView.tsx
- src/App.tsx
- src/components/NewestBusinessesBanner.tsx
- src/components/AdminAutoBusinessesModal.tsx
- docs/sql/enc_reviews_001.sql (puede reemplazar la propuesta SQL para ratings exclusivamente)
- docs/sql/enc_reviews_006.sql (nueva propuesta de esquema/migración, nunca ejecutar en hosting)
- docs/WORK_RESULTADOS.md
- docs/work-progress/ENC-REVIEWS-006.md
- index.html (solo JSON-LD de ratings falsos; preservar otros metadatos)
- src/components/AdminEventsTab.tsx (solo corregir TS2339 preexistente, sin cambiar lógica ajena)
- src/utils/ratings.ts (solo si necesario para eliminar consumidores/fallbacks obsoletos)

No tocar otros archivos sin pedir ampliación específica de alcance. No modificar tablas distintas de las exclusivas de ratings; no crear triggers ni rutinas que escriban otras tablas. Evitar cambios en dependencias, infraestructura y scripts.

## Criterios de aceptación
1. POST registra voto entero 1..5 y devuelve éxito solo tras commit real; falla sin éxito ficticio.
2. GET global e individual presentan agregados reales y cero votos como sin calificación; no semillas de 5 estrellas, JSON-LD inventado ni datos locales como fuente autoritativa.
3. UNIQUE efectivo de (business_id, visitor_id) con columnas NOT NULL y semántica coherente de IDs/collation; diseño compatible con esquema de negocios sin alterar businesses.
4. Duplicados concurrentes producen un solo voto persistido y error de negocio coherente (409), sin contadores corruptos.
5. No asumir que visitorId equivale a identidad humana; documentar límites de antiabuso, privacidad, retención de IP y comentarios.
6. Manejar errores 400/404/409/503 y fallas de red, reconciliación de 409 y cargas tardías; preservar diseño responsive.
7. Validar integridad de datos y transacciones; ningún cambio lateral sobre otras tablas.
8. Corregir TS2339 en AdminEventsTab.tsx con modificación mínima; ejecutar tsc --noEmit y build sin efectos secundarios (verificar scripts antes).
9. Documentar esquema SQL para tabla vacía y para tabla existente, con precondiciones, respaldo, ensayo de restauración y reversión. No ejecutar SQL contra Hostinger.
10. Pruebas locales reproducibles con MariaDB aislada **solo si** existe instancia local inequívocamente aislada de hosting/producción; de lo contrario usar mocks y reportar la falta de integración real. No abrir conexiones a endpoints ni BD reales sin autorización.
11. No crear calificaciones ni datos de negocios falsos en entorno real.
12. Mantener trazabilidad de archivos, SHA, pruebas, limitaciones y dependencias.

## Protocolo de trabajo
- Crear work/enc-reviews-006 desde ia-desarrollo; no tocar main, ia-desarrollo, work/enc-reviews-001 ni work/enc-reviews-003.
- Inspeccionar commits anteriores y conflictos; incorporar únicamente lo necesario en rama propia.
- Publicar checkpoints en docs/work-progress/ENC-REVIEWS-006.md en hitos significativos y resultado en docs/WORK_RESULTADOS.md.
- Publicar commits únicamente en work/enc-reviews-006. No PR, merge, despliegue, cambios Hostinger ni SQL real.
- Verificar que scripts de build/test no ejecuten sincronizaciones o mutaciones.
- Si faltan datos de esquema, marcar condición pendiente; no asumir.
- Informe final completo en UN SOLO bloque Markdown ```text con ID, rama, commits, archivos, pruebas ejecutadas y fallidas, riesgos, dependencias, plan de migración/reversión y dictamen APTO/NO APTO para revisión. Esperar coordinación.

## Condiciones para fase posterior (no autorizada por esta tarea)
La coordinación verificará código y pruebas, aislamiento efectivo, permisos, respaldo restaurable y estado de tabla. Solo después podrá solicitar al propietario aprobación explícita del SQL exacto, destino u293982346_encarmentest, operador, ventana y reversión. Integración a ia-desarrollo y despliegue Staging requieren aprobaciones independientes. Producción queda excluida.
