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
