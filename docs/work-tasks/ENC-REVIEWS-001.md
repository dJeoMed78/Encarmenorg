# ENC-REVIEWS-001 — Persistencia de calificaciones y opiniones

Estado: PENDIENTE. Ejecutor: ChatGPT Work. Coordinador: sesión principal de ChatGPT.

## Preparación
Leer docs/WORK_INSTRUCCIONES.md y docs/WORK_RESULTADOS.md en coord/encarmen-work-control-001, y docs/CONTEXTO_ENCARMEN.md en ia-desarrollo. Registrar SHA de instrucciones y HEAD de ia-desarrollo. Crear rama work/enc-reviews-001 desde ia-desarrollo; si existe, detenerse y avisar.

## Objetivo
Implementar persistencia confiable de ratings y comentarios en MariaDB para pruebas, reemplazando el almacenamiento JSON y la memoria como fuente de verdad. No modificar producción.

## Archivos autorizados
- server.ts: exclusivamente endpoints y lógica de ratings e imports indispensables.
- src/db/mariadb.ts: exclusivamente esquema y funciones de ratings.
- docs/WORK_RESULTADOS.md: incorporar plantilla desde coordinación y agregar resultados.
- docs/sql/enc_reviews_001.sql: opcional, solo para propuesta de migración; no ejecutar.

Excluidos: src/utils/realRatings.ts, src/components/BusinessDetailModal.tsx, estilos, package.json, scripts, otras rutas, docs/CONTEXTO_ENCARMEN.md y cualquier recurso de producción. Si el alcance es insuficiente, solicitar aprobación antes de modificar otros archivos.

## Criterios de aceptación
1. Mantener contratos de GET /api/ratings, GET /api/ratings/:businessId y POST /api/ratings. Si se requiere cambiar un contrato, detenerse y consultar.
2. Un negocio sin votos devuelve promedio y cantidad cero, sin cinco estrellas ficticias.
3. Rating entero 1 a 5, IDs válidos, comentarios con límite de longitud y tratamiento seguro del contenido.
4. Una calificación por visitante y negocio mediante índice único en MariaDB, con manejo HTTP 409 en duplicados. No basarse solo en IP; documentar limitaciones de visitorId.
5. Datos persistentes entre reinicios, sin éxito ficticio cuando falle la BD. No revelar identificadores personales ni IP.
6. Detectar posibles votos legítimos existentes en ratings_db.json; diseñar migración deduplicada y reversible sin ejecutarla.
7. No alterar eventos, negocios, Radar ni otros módulos.

## Verificación
Inspeccionar scripts antes de ejecutar npm run lint o build: build actualiza versiones y puede alterar archivos fuera de alcance. Registrar comandos y resultados reales. Cubrir primer voto, duplicado, entrada inválida, negocio inexistente, negocio sin votos, falla de BD, reinicio, concurrencia y comentario con HTML. Si no hay BD aislada disponible, ejecutar pruebas posibles y declarar límites; no afirmar pruebas de integración no realizadas.

## Seguridad y entrega
No modificar main, ia-desarrollo, encarmen.org, BD productiva, secretos ni despliegues. No ejecutar migraciones ni escrituras a BD real sin autorización. Publicar commits únicamente en work/enc-reviews-001. Incluir docs/WORK_RESULTADOS.md en commit, con SHA base, SHA de instrucciones, cambios, pruebas, riesgos, rollback y pendientes. Avisar al usuario cuando termine o se bloquee. Esperar revisión del coordinador.
