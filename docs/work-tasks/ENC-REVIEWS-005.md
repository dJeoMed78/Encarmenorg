# ENC-REVIEWS-005 — Diseño definitivo del esquema de calificaciones (preparación, sin ejecución)

**Estado:** ASIGNABLE. **Tipo:** análisis y propuesta técnica de solo lectura. **Rama de instrucciones:** coord/encarmen-work-control-001. **Ejecutor:** ChatGPT Work.

## Autorización y límites del propietario
El propietario confirma que el apartado de calificaciones todavía no ha recibido votos reales y autoriza **preparar** el rediseño de las tablas exclusivamente relacionadas con calificaciones en Staging. **No autoriza todavía aplicar SQL, borrar tablas, alterar datos, desplegar ni integrar código.** No tocar producción ni tablas ajenas (businesses, usuarios, etc.). La afirmación de ausencia de votos reales no sustituye una comprobación de filas antes de cualquier futura modificación.

## Objetivo
Proponer la estructura final de ratings compatible con el backend de ENC-REVIEWS-001 y el frontend de ENC-REVIEWS-003, eliminando el bloqueo del índice único y resolviendo las incompatibilidades detectadas por ENC-REVIEWS-002 y ENC-REVIEWS-004. Comparar migración conservadora ADD UNIQUE frente a recreación controlada de tabla vacía, sin asumir que la segunda es necesaria.

## Fuentes
Leer docs/WORK_INSTRUCCIONES.md, docs/CONTEXTO_ENCARMEN.md (rama pertinente), docs/work-tasks/ENC-REVIEWS-001.md, ENC-REVIEWS-002.md, ENC-REVIEWS-003.md, los commits de las ramas work/enc-reviews-001 y work/enc-reviews-003, docs/sql/enc_reviews_001.sql, server.ts, src/db/mariadb.ts, tipos y consumidores. Incorporar informe ENC-REVIEWS-004 proporcionado por coordinación.

## Evidencia disponible (no sustituye comprobación futura)
- Staging previsto: u293982346_encarmentest; producción prevista: u293982346_encarmenapp.
- Tabla business_ratings existente, índice idx_biz_visitor NO UNIQUE (business_id, visitor_id).
- Consulta de grupos duplicados devolvió cero filas; esto NO demuestra tabla vacía.
- Exportación local SQL de Staging descargada, 35.6 MB; restauración NO verificada.
- Permisos cruzados y conexión efectiva de producción no completamente comprobados.
- Usuario afirma que todavía no existen votos reales.
- Work 004 dictaminó NO APTO para ejecutar migración en estado actual.

## Entregables solicitados (solo informe en chat)
1. Modelo final de tabla(s) exclusivamente de ratings: columnas, tipos, NOT NULL, índices UNIQUE exactos, FK si procede, compatibilidad con negocios y tratamiento de ID/collation.
2. Evaluación de seguridad de visitorId, hash, normalización, duplicados, concurrencia, privacidad, rango de rating y comentarios; riesgos que requieran cambio de backend.
3. Dos alternativas SQL **propuestas, nunca ejecutadas**: (A) ALTER conservador; (B) recreación solo si la tabla está verificablemente vacía y con autorización posterior específica. Ventajas, riesgos, bloqueo, reversión y elección recomendada. No incluir instrucciones destructivas para ejecutar ahora.
4. Lista exacta de consultas de prevalidación de solo lectura para una futura sesión autorizada: COUNT(*) de tabla, SHOW CREATE TABLE, SHOW INDEX, nulos, duplicados, huérfanos, versión y permisos. Separar resultados conocidos de pendientes.
5. Plan de ensayo en BD aislada con datos sintéticos y restauración verificada, plan de respaldo actualizado, pausa de escritores, ventana, operador, rollback y comprobación posterior.
6. Dependencias de integración de ENC-REVIEWS-001 y 003, error TypeScript preexistente, JSON-LD fijo y cualquier contrato incompatible.
7. Criterios de aceptación medibles y decisión APTO/NO APTO para solicitar autorización de ejecución posterior.

## Restricciones absolutas
Solo lectura de GitHub y documentación pública. No crear archivos, ramas, commits, PR ni checkpoints. No conectar a MariaDB ni ejecutar SQL (tampoco SELECT), no modificar Hostinger, hPanel, staging, producción, main, ia-desarrollo, credenciales ni configuración. No integrar ramas ni desplegar. No ejecutar scripts con efectos secundarios. Si necesita evidencia adicional, indicarla como pendiente para coordinación.

## Informe
Entregar informe final completo en **un solo bloque de código Markdown tipo text**, incluyendo ID, estado, fuentes/SHAs, diagnóstico, alternativas, riesgos, pruebas realmente ejecutadas, pendientes y recomendación. Esperar decisión de coordinación.
