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

## Cierre validado

Checkpoint funcional publicado: cd9aaab19f471d474036a1efafaeb4481177f39c.
Última ejecución después de contrastar fuentes/tests con los blobs de la base: 101 PASS / 0 FAIL / 0 omitidas; backend compilado27 PASS / 0 FAIL / 0 omitidas. Cobertura compartida: no sumar como128 escenarios únicos.

Comandos ejecutados:

    npm run lint
    npm run build:server
    node --import tsx --test tests/security-radar-001.test.mjs tests/consolidation-001.test.mjs tests/public-registration*.test.mjs tests/staging-write-001.test.mjs tests/staging-isolation-proof.test.mjs tests/security-containment-003.test.mjs tests/backup-security-002.test.cjs
    ENC_SECURITY_EXECUTABLE=server.js ENC_BACKUP_EXECUTABLE=server.js node --test tests/security-containment-003.test.mjs tests/backup-security-002.test.cjs
    node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/enc-security-radar-rebuilt.mjs
    cmp server.js /tmp/enc-security-radar-rebuilt.mjs
    cmp server.js api/server.bundle.js
    node --check server.js
    node --check api/server.bundle.js

Todos terminan exit0. npm run lint usa tsc --noEmit. build:server se inspeccionó: Vite, esbuild y copia local; no actualiza versión ni inicia servidor. dist generado localmente no se publica por quedar fuera del alcance. Dependencias de laboratorio reutilizadas, sin instalación npmci nueva. Node24.22.1, TypeScript7.0.2, Vite8.3.5, esbuild0.28.2. Avisos: npm http-proxy y chunk Vite>500kb; no errores de tipos/compilación.
SHA256 idéntico en server.js y api/server.bundle.js y segunda compilación independiente:
    db448ae4cbb5e52859712f69d54f55e09da1187c64e62f69a3e542e9d15f76ca

Las pruebas relacionadas cubren alta pública, edición/contactos, confirmación de persistencia simulada, permisos, sesiones/origen, respaldos y aislamiento. La suite nueva usa pipeline HTTP real con adaptadores simulados y handlers reales; no equivale a arrancar todo el servidor, MariaDB real o navegar en Hostinger. La política real consolidada sigue negando mutaciones Radar incluso a administradores; la prueba positiva de handler usa exclusivamente una política permisiva sintética dentro del arnés para comprobar sesión/permiso y no modifica ninguna variable del servidor.

Control de procedencia: la copia histórica local contenía dos fuentes auxiliares y cuatro tests diferentes de los blobs base. Se recuperaron exactamente los originales remotos antes de la ejecución final; no se incorporan cambios de esos archivos. Las98 fuentes de src quedaron idénticas a la base salvo adminSecurity.ts. Historial WORK_RESULTADOS recuperado íntegro de la base; solo se añade entrada nueva. No se importan otras ramas ni resultados históricos como ejecución nueva.

Archivos finales publicados: server.ts, src/server/adminSecurity.ts, tests/security-radar-001.test.mjs, server.js, api/server.bundle.js, este documento y docs/WORK_RESULTADOS.md. No otros cambios remotos.

Riesgos residuales: los handlers administrativos heredados de eventos/clasificados todavía tienen persistencia best-effort ante fallos de disco/SQL cuando una futura política los habilite. Esa lógica no se presenta como persistencia durable ni se habilita; corregirla requiere un alcance específico. Las búsquedas con proveedores externos conservan costos/red y límites existentes; no se valida disponibilidad externa. La limpieza programada/administrativa existente conserva su política y no se ejecutó en esta tarea. H02-H04 y otras entregas posteriores no se incorporaron a esta rama.

No hubo SQL real, servicios remotos, secretos, despliegues, PR ni integraciones. main e ia-desarrollo no modificadas por esta tarea. Recomendación: revisión independiente del SHA final por Coordinación antes de cualquier integración. Reversión mediante commits normales de esta tarea con fuentes y bundles como unidad; advertencia: volver a la base reabre H01, por lo que no corresponde rollback automático a una versión vulnerable. No hay cambios de base compartida que revertir.
