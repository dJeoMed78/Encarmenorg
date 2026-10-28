# ENC-STAGING-INTEGRATION-READINESS-001 — candidata y plan único

## Estado y trazabilidad
Cierre UTC 2026-10-28T17:49:31.788Z. PROBADO_POR_WORK localmente; pendiente revisión de Coordinación. Sin integración ni despliegue.
Rama work/ENC-STAGING-INTEGRATION-READINESS-001. Base vigente cad1222618c94f4eb3dabb589b6e58836191dcb7; instrucciones blob c4ef37ba0f690f60cd9fb5189190afd2be9a8faa.
Checkpoint 581c0cba919609047bc6a9aabb7f95736d35e275. El commit de cierre contiene este plan, resultados y los cinco archivos funcionales aprobados (sin SHA autorreferente).
Fuente autorizada b6b26fefcce0b4d268ba0f715433d2d534e0b1a2. Incorporación selectiva de server.ts, server.js, api/server.bundle.js, scripts/create_release_zip.js y tests/backup-security-002.test.cjs, idénticos al origen; sin cambiar comportamiento ni incorporar documentación de la tarea anterior.
No se incorporaron Auth/Radar/Comentarios/Editor/Maps/ENV u otros cambios no aprobados. No se crearon PR ni se fusionó ninguna rama.

## Matriz de dependencias y conciliación
| Entrega | Evidencia actual | Incorporación | Dependencias / conciliación posterior |
| --- | --- | --- | --- |
| ENC-STAGING-SECURITY-RELEASE-001 | b6b26fefcce0b4d268ba0f715433d2d534e0b1a2; código y ejecutables comprobados; en esta candidata repetidos con Node22 | Cinco archivos funcionales autorizados, sin modificaciones | No garantiza aislamiento de BD ni servicio estático externo. Coordinación revisa diff antes de integrar. |
| ENC-STAGING-RELEASE-001 / Trabajador1 | Rama en 2ebe21c6ce2848b5c7c5e69bf1288ddd7f014dbd; un checkpoint documental EN_PROGRESO; diff solo WORK_RESULTADOS y su progreso. Sin implementación final verificable al cierre | NINGUNA; no hay aprobación de incorporación en esta tarea | Alcance anunciado: EditBusinessModal.tsx, BusinessPublicDetail.tsx/CSS y types.ts. No hay colisión funcional demostrada con seguridad, pero depende de entrega final, revisión y permiso de Coordinación; repetir TypeScript/frontend y regresiones después de incorporarlo. No reutilizar dist/ejecutables previos como autoridad tras conciliar fuentes. |
| ENC-STAGING-ENV-READINESS-001 / GoogleAIStudio | Rama en cad1222618c94f4eb3dabb589b6e58836191dcb7, igual a base; sin commit diferencial ni entrega verificable | NINGUNA | Faltan evidencia de entorno, permisos, aislamiento, entrypoint, Node y exposición externa. No presumir qué archivos cambiará. Si modifica server.ts/DB/scripts, conciliación semántica y regeneración de ambos ejecutables solo tras autorización. |

Los estados son snapshots de GitHub, no afirmación de actividad o inactividad fuera del repositorio. No se esperó indefinidamente a las entregas pendientes. Los dos WORK_RESULTADOS futuros deberán incorporarse por entradas acumulativas, no sustituir el documento completo de una rama por otro. Un checkpoint no equivale a una entrega aprobada.

## Pruebas nuevas de esta candidata
Copia aislada /workspace/scratch/562312432969/staging-integration-readiness-001; fuentes de base vigente + cinco archivos aprobados. Sin .env de hosting, credenciales reales, arranque completo, SQL ni red a servidores de negocio. Dependencias temporales reutilizadas de la validación anterior; sin cambios al manifiesto/lockfile del repositorio. Instalada herramienta Node22 fuera del proyecto desde paquetes npm, con scripts deshabilitados; inspeccionado instalador, usado binario específico node-linux-x64 22.23.4.
Versiones: Node22.23.4, TypeScript7.0.2, Vite8.3.5, esbuild0.28.2, Express4.22.3; misma plataforma Linux local. Compatibilidad validada para compilación y guard aislado, no certificación de runtime completo en Hostinger.
Comandos reales, entorno vacío excepto PATH al Node22/herramientas:
- node /tmp/enc-release-tools/node_modules/typescript/bin/tsc --noEmit: EXIT0.
- node /tmp/enc-release-tools/node_modules/vite/bin/vite.js build --outDir /tmp/enc-readiness-frontend --emptyOutDir: EXIT0, 1722 módulos; JS1322.03kB/gzip284.81, CSS247.18kB/gzip30.60. Advertencia chunk>500kB, no bloqueante. No se publica dist fuera de alcance.
- node /tmp/enc-release-tools/node_modules/esbuild/bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/enc-readiness-backend.js: EXIT0. Comparación binaria con server.js y api/server.bundle.js: idénticos.
- node --test tests/backup-security-002.test.cjs: EXIT0, 9/9PASS.
- ENC_BACKUP_EXECUTABLE=server.js node --test tests/backup-security-002.test.cjs: EXIT0, 9/9PASS.
- ENC_BACKUP_EXECUTABLE=api/server.bundle.js node --test tests/backup-security-002.test.cjs: EXIT0, 9/9PASS.
- node --check server.js: EXIT0; advertencia experimental de EnvHttpProxyAgent del entorno local, sin fallo. No se importó ni ejecutó el servidor.
Total27 tests/927 solicitudes HTTP reales de fixtures en127.0.0.1. Por modo: 175 rutas/métodos (25xGET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS),75 variantes,20 estáticos privados,20 encodings/extensiones,18 recursos legítimos GET/HEAD y1 recurso inexistente. Denegación403/no-store/HEAD vacío, sin datos privados ni downstream; recursos públicos de fixture200, inexistente404. CLI en fixture exit1 sin aliases; snapshots de archivos preservados.
No se alteró el harness aprobado ni el código de contención. Sin fallos nuevos que requieran ampliar alcance. No se volvió a ejecutar la auditoría general de aislamiento.

## Integridad y ausencia de cambios ajenos
SHA256 server.ts:588de3b7b2e6d760d36c9b3b0809d80b5e005cf5348714281c1879d6b3e9c362.
SHA256 server.js=api/server.bundle.js:01b6cab6b6560b7b1f00fb26b4c58b7f42b612791c3788ed1a1eacd71e39137e.
SHA256 CLI:f5e07700ad79b040a0547d38db510ab6cbce0b826019e3eb94c6c934ba90ba0f.
SHA256 test:887c89073ff89713602a050b724c8df6564b075bedbf3bb172a3f5f74a3ecf74.
No package.json, lockfile, versiones frontend, configuración de arranque ni infraestructura modificados en el diff publicado. Los ejecutables se conservan idénticos porque Node22 los reprodujo exactamente.

## Riesgos de arranque y límites
Según código ya auditado: selección de BD con defaults productivos, dotenv override, semillas/creación de tablas y limpieza de eventos en arranque/timers/GET no quedan resueltos por esta contención. STAGING_READ_ONLY no constituye aislamiento completo. No se arrancó el módulo completo ni se ejecutaron consultas, ni siquiera para diagnosticar. Se conservan hallazgos previos; no se presume conexión efectiva.
Repositorio: npm start=node server.js; app.js/index.js importan server.js; build:server=Vite+esbuild+copia. Hostinger efectivo no verificado. Un servidor estático/CDN externo puede evitar Express. Archivos privados renombrados como benignos y symlinks no quedan certificados por el guard. Node22.23.4 local compatible no demuestra que hPanel use esa versión.

## Plan único de integración futura — NO ejecutado
1. Coordinación verifica HEAD de ia-desarrollo, esta candidata y los SHAs finales de las tres entregas. Si cambia la base, revisar diff de tres vías y repetir solo controles afectados; no forzar ni reemplazar ramas compartidas.
2. Aprobar explícitamente cada entrega antes de incorporarla. Mantener esta contención sin bypass. Conciliar entradas de WORK_RESULTADOS mediante append; conservar checkpoints propios. No fusionar documentos completos de ramas divergentes.
3. Tras entrega aprobada del Trabajador1, incorporar solo sus archivos acordados. Revisar tipos/contratos y ejecutar compilación y pruebas de sus componentes, además de contención. Si ENV propone código, revisar riesgos/overlaps primero; no incorporar su rama por existencia o nombre.
4. Fijar fuentes finales y generar UNA pareja coherente server.js/api/server.bundle.js desde ese server.ts. Compilar frontend y backend con Node/runtime que se apruebe para Staging. No elegir bundles por merge textual ni conservar bundles de fuentes diferentes. Validar hashes y diff de archivos permitidos.
5. Autorizar integración a ia-desarrollo por Coordinación; después, autorización separada para despliegue. Esta tarea no ejecuta ninguno. Antes de integrar considerar que Hostinger podría desplegar automáticamente un push: requiere conocer y controlar el disparador previamente, no tratar el merge como inocuo.
6. Operador autorizado confirma entrypoint, Node, SHA, comandos, dependencias runtime, dist/recursos legítimos y configuración privada; acredita esquema/usuario/privilegios y directorios separados. No se autoriza aquí SQL, hPanel ni secretos.
7. Contener servicio directo de ZIP/SQL/secretos en hosting/CDN y cachés existentes mediante operación autorizada, preservando respaldos. Preparar evidencia sin descargar contenido privado.
8. Solo con aislamiento, respaldo/reversión y autorización efectiva: desplegar el SHA final en Staging. Comprobar SHA/hash/entrypoint,25 rutas/alternativas GET/HEAD, ausencia de exposición estática externa y regresión pública. Las pruebas funcionales que escriban necesitan entorno sintético aislado y permiso separado. No declarar Staging protegido antes de estas evidencias.

## Condiciones exactas que impiden todavía desplegar
C1. Falta revisión/aprobación de integración y despliegue por Coordinación.
C2. Trabajador1 sin entrega final verificable/aprobada; la candidata NO es la consolidación funcional completa.
C3. ENV sin entrega verificable; aislamiento real de BD/usuarios/permisos/directorios y trabajos automáticos no acreditado.
C4. Entry point, Node efectivo, comandos, SHA y disparadores automáticos de Hostinger sin confirmar/controlar.
C5. Servicio estático/CDN y cachés externas no verificados ni contenidos; Express no basta.
C6. Falta respaldo/restauración/reversión operativa acreditada para el cambio futuro; esta tarea no crea ni elimina respaldos.
C7. Falta conciliación y validación final sobre los tres SHAs aprobados; después habrá que producir artefactos coherentes del conjunto y frontend válido en hosting.
C8. Falta verificación efectiva posterior al despliegue y regresión funcional pública en entorno seguro; no se certificó arranque completo ni persistencia real.

## Reversión única
Conservar SHA previo autorizado y artefactos coherentes con sus fuentes. Si integración activa autodeploy, coordinar contención/pausa antes de operar. Ante fallo no volver a abrir descargas inseguras: cerrar el acceso externo primero mediante operador autorizado, detener avance y revisar revert específico. Revertir commits de la candidata solo con autorización, regenerar ambos ejecutables desde las fuentes revertidas y proteger la contención o aplicar alternativa revisada. Esta tarea no modificó BD ni backups, por lo que no corresponde restaurar datos. Cualquier restauración/traslado/purga operativa requiere autorización específica. No usar force-push ni rollback a bundle antiguo sin valorar reapertura de exposición.

## Dictamen
Parte de seguridad incorporada y validada en candidata con Node22. Apta para revisión técnica de esa parte. Integración conjunta, despliegue, arranque, BD y protección efectiva de Staging PENDIENTES. Sin PR/merge/deploy, cambios a main/ia-desarrollo, SQL/migraciones, Hostinger ni secretos.
