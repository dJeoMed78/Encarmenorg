# ENC-SECURITY-RADAR-001

Ejecutor W1. Fecha 2026-10-29 (America/Merida). Estado: IMPLEMENTADO Y PROBADO LOCALMENTE; pendiente revisión independiente. No integrado/desplegado.

Base exacta a16ca710449eda3c68f26016b91ce59d55b95b2b, rama work/enc-consolidation-001 comprobada en GitHub. Nueva rama work/enc-security-radar-001 creada desde esa base. No se incorpora el trabajo de integración posterior ni se cambia de base.

## Checkpoint funcional

Modificados exclusivamente server.ts, src/server/adminSecurity.ts y tests/security-radar-001.test.mjs, además de esta documentación autorizada.

Causa: excepciones endsWith('/radar-search') sin método; guard Staging exceptuaba rutas con cualquier método; Express trataba radar-search como :id. Corrección: autorización basada en POST y ruta normalizada exacta, guard con POST y ruta exacta, y defensa 405 de identificadores reservados en PUT/DELETE eventos y PATCH/DELETE clasificados. Se restringe también a POST la excepción equivalente auto-search/auto-search-ai/parse-whatsapp-group, sin ampliar sus permisos. Login, sesiones, registro anónimo y edición controlada permanecen bajo sus políticas existentes.

Hallazgo adicional: búsqueda pública de eventos ejecutaba pruneExpiredEvents; retirada esa limpieza. GET de eventos/clasificados también ejecutaba mantenimiento persistente: ahora deriva expiración en la respuesta sin borrar ni enviar registros a papelera persistentemente. Se conserva filtrado de vencidos y contrato de consulta; mantenimiento separado no se habilita con esta tarea. Clasificados radar mantiene scraping/IA existentes (red/costo externo posible en operación normal); las pruebas sustituyen exclusivamente esos servicios por datos sintéticos y no hacen llamadas externas.

Pruebas nuevas: 6/6 PASS; Express real, módulo real de autenticación y guard/handlers extraídos literalmente de server.ts y transpilados con esbuild. Persistencia/IA simuladas; archivos únicamente en mkdtemp enc-radar-owned-. No se arranca el servidor completo, no se configura MariaDB ni se usan credenciales reales.
Matriz negativa: 90 solicitudes (dos familias, cinco variantes, tres métodos, tres identidades) con igualdad antes/después de caché, contenido de archivos y contadores SQL/escritura. Incluye /radar-search, barra final, %72adar-search, mayúsculas y sufijo anidado; identidad ausente, token inventado y sesión sin permisos. Otras 32 solicitudes con sesión autorizada comprueban405 para identificadores reservados. POST y GET públicos, mutación sintética autorizada, política cerrada, Staging/solo lectura y logout comprobados. No afirmar seguridad integral de infraestructura ni persistencia real.

Siguiente operación: registrar resultados finales de compilación/regresiones y publicar ambos bundles recompilados junto con documentación acumulativa. El SHA de cada checkpoint se identifica por su commit contenedor y se comunicará al cierre; no se inventa una autorreferencia.
