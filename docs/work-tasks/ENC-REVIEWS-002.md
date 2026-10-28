# ENC-REVIEWS-002 — Auditoría de integración de calificaciones (solo lectura)

**Estado:** PENDIENTE. **Ejecutor:** ChatGPT Work. **Coordinador:** sesión principal ChatGPT.

## Fuentes y ramas
- Repositorio: dJeoMed78/Encarmenorg
- Código propuesto: work/enc-reviews-001, commit a6819631fb9925deb5aeedce7b9b9b40e77454e7
- Base de integración: ia-desarrollo
- Coordinación: coord/encarmen-work-control-001
- Leer docs/WORK_INSTRUCCIONES.md, docs/WORK_RESULTADOS.md y docs/CONTEXTO_ENCARMEN.md en sus ramas respectivas.

## Objetivo
Auditar de forma independiente el cambio ENC-REVIEWS-001 y determinar condiciones necesarias para integrarlo de manera segura a Staging. **No implementar cambios en esta tarea.**

## Revisión obligatoria
1. Comprobar diferencias exactas del commit respecto a ia-desarrollo y posibles cambios concurrentes.
2. Verificar coherencia entre esquema business_ratings, tipos de columnas, índice único, funciones SQL y endpoints GET/POST.
3. Evaluar efectos de la inicialización automática de tablas y de la migración propuesta en instalaciones existentes, sin ejecutar SQL.
4. Buscar todos los consumidores de /api/ratings, realRatings, rating, reviewCount, y los valores predeterminados de cinco estrellas. Detectar contratos incompatibles y datos ficticios aún visibles.
5. Revisar los mecanismos de visitorId, hashing, duplicados, validaciones, errores HTTP, exposición de datos y riesgos de abuso.
6. Comprobar si GET /api/ratings/:businessId, GET /api/ratings y POST /api/ratings mantienen la forma de respuesta esperada por el frontend.
7. Inspeccionar scripts de package.json y recomendar una secuencia de lint y compilación sin cambios de versión ni artefactos fuera de alcance.
8. Determinar qué pruebas reales necesitan una base MariaDB de Staging completamente aislada y qué credenciales o configuraciones mínimas se requieren, sin solicitar secretos al usuario ni mostrarlos.
9. Proponer plan de migración, backup, verificación y rollback sin ejecutar operaciones.
10. Clasificar hallazgos como BLOQUEANTE / IMPORTANTE / MEJORA, con archivo, línea o función, evidencia, impacto y corrección sugerida.

## Restricciones
- **Solo lectura**: no crear ni modificar archivos, ramas, commits o PR.
- No desplegar, no ejecutar SQL ni conectar a bases de datos reales.
- No modificar main, ia-desarrollo, staging, producción ni secretos.
- No iniciar procesos que puedan modificar datos o generar artefactos.
- Si el análisis necesita permisos nuevos o un entorno, reportarlo sin solicitar accesos privilegiados.

## Entrega en conversación de Work
Informe ENC-REVIEWS-002 con:
- Estado COMPLETADA o BLOQUEADA.
- SHA del commit revisado y ramas.
- Tabla o lista de hallazgos priorizados con referencias verificables.
- Dictamen APTO / NO APTO para integración a Staging, justificando.
- Pruebas pendientes y plan de correcciones.
- Confirmación de que no realizó cambios.
- Esperar nuevas instrucciones del coordinador.
