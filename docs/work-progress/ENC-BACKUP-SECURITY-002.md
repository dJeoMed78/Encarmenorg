# ENC-BACKUP-SECURITY-002

Estado: EN_PROGRESO. Inicio 2026-10-28T17:24:00.292Z.
Rama: work/ENC-BACKUP-SECURITY-002.
Base aprobada/verificada: cad1222618c94f4eb3dabb589b6e58836191dcb7.
Instrucciones: c4ef37ba0f690f60cd9fb5189190afd2be9a8faa (blob).

Alcance: server.ts, scripts/create_release_zip.js, docs/WORK_RESULTADOS.md, este checkpoint y una prueba aislada bajo tests/ si es necesaria.
Sin modificaciones a main/ia-desarrollo, sin PR/merge/deploy, SQL, Hostinger ni respaldos reales.
Plan: denegar las 25 rutas históricas y archivos sensibles antes de servir estáticos; retirar handlers generadores; CLI desactivado sin tocar archivos; probar Express aislado sin importar server.ts.
Pruebas: todavía no ejecutadas. No se inició el servidor completo.
Riesgos residuales: servicio directo de Hostinger/CDN y bundles versionados fuera del alcance; contención no desplegada.

## Hito de implementación y pruebas — 2026-10-28T17:28:41.709Z
Estado: PROBADO_POR_WORK localmente; pendiente Coordinación. Commit de implementación: el que incorpora este checkpoint (sin SHA autorreferente).
8/8 tests PASS; 309 solicitudes HTTP localhost, CLI en fixture, archivos sintéticos preservados. Prueba reproducible en tests/backup-security-002.test.cjs. No se importó el servidor ni se ejecutaron SQL/deploys. Ver detalle en docs/WORK_RESULTADOS.md.
Cambios autorizados: server.ts, scripts/create_release_zip.js, una prueba aislada y los dos documentos autorizados.
SHA256 prueba: 5598381a751d3d8e512cb730b89b1014f0fde07bc51f97a7864d316e28e1fc53.
Riesgos: Hostinger/CDN directo no controlado; ejecutables versionados fuera del alcance sin regenerar; no respaldo privado implementado. Próximo paso: revisión de Coordinación, sin PR ni integración automática.
