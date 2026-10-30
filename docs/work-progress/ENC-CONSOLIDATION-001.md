# ENC-CONSOLIDATION-001

Estado: PROBADO_POR_WORK en aislamiento, con limitaciones de persistencia y validación visual. Pendiente de inspección independiente W2 y revisión de Coordinación. NO aprobado, integrado ni desplegado.
Rama: work/enc-consolidation-001.
Base: 184874835d9d588e679b201b790643dfd923aff8.
Checkpoint: a5fdd2f21a7a75613bf5e5a47e20b5c4ed338b1a.
Implementación: 4a2ad4cd56dba7929e975b7d99476f264ff8db9e.

## Incorporación selectiva

W1 (184874835d9d588e679b201b790643dfd923aff8): se conserva formulario público, endpoint /api/public/business-registrations, INSERT sin upsert, verificador de aislamiento, contactos independientes, lectura SQL posterior, consulta HTTP de listado/ficha, UUID y límites. No se vuelve a /api/submit-business para el formulario público. Imágenes públicas siguen deshabilitadas, sin uploader/base64/SVG público.

W2 (22ce2a30741bf9145acbb2b939d1d6a936c1843f): se reutilizan adminSecurity y adminAuth, sesiones opacas con digest en memoria, scrypt configurado solo en servidor, permisos, origen, rate limit, logout, verificación de sesión y transporte same-origin con rechazo de redirects. Se eliminan credenciales fijas, lectura/generación/validación PIN y clave maestra del servidor, cambio de contraseña heredado y child_process/Git automático. Se conserva contención de respaldos antes de autenticación. App verifica/restaura la sesión y actualiza estado; el formulario administrativo permite escribir el usuario configurado, sin cuentas predeterminadas públicas.

Conciliación crítica: administrativeWritesReady exige simultáneamente ENC_ADMIN_MUTATIONS_ENABLED=true, clasificación Staging y capacidad isBusinessWritePermitted. Solo concede POST /api/submit-business y PATCH de negocio. isWritePermitted sigue cerrado en Staging y no se amplía. Ninguna variable sola abre mutaciones generales. La ruta pública permanece anónima e independiente del interruptor administrativo. Login/sesión/logout se registran antes del guard de Staging; logout se contempla también en su excepción exacta. El guard central exige business:manage para el alta administrativa y el uploader heredado; los distintivos requieren además business:publish. DELETE y otras escrituras administrativas siguen bloqueadas por la política consolidada, incluso con sesión. Fuera de Staging la política nueva deniega mutaciones.

PERP (84819002a20857fee3e5f668189a615ef9a43618): revisados informe y parche como propuestas, NO ejecutados ni incorporados indiscriminadamente. W1 ya supera sus cambios de arranque, lectura y contactos: no se reintroduce fallback raw_data sobre columnas vacías ni lectura tolerante por defecto. Tampoco se usa CRC de id/updated_at como prueba de contactos frescos. Mejora faltante aplicada: sondeo de catálogo mediante lectura estricta, incluidos cambios con firma idéntica y resultado legítimamente vacío. La confirmación pública fuerza lectura y rechaza fallos, sin usar caché antigua. Baja heredada ahora espera SQL y lectura posterior antes de modificar caché o responder éxito; no escribe semilla ni sincroniza WordPress. Alta heredada de memoria/semilla retirada fuera del almacén controlado; falla 503. PATCH controlado conserva lectura transaccional y contactos; fallback anterior de PATCH conserva comprobación de guardado/lectura y queda protegido por el guard. No se añadió ni ejecutó sembrador, inicialización o migración.

GAS (174cb16fff855a16b8bbe5ac083f88140c31924f): CSS móvil ENC-F007A, safe areas, tamaños y prevención de desbordamiento; BusinessDescription y parser de enlaces http(s) seguros. Se concilian solo clases/descripcion en BusinessPublicDetail, manteniendo contactDigits de W1 en lugar del normalizador más permisivo de GAS. Se preservan galería, contactos, Maps y calificaciones oficiales. No se cambia MariaDB por motivos visuales ni se importan capturas anteriores como evidencia actual.

## Pruebas reales ejecutadas localmente

Node 24.22.1; TypeScript 7.0.2; Vite 8.3.5. Dependencias locales reutilizadas; instalación limpia no probada. Jsdom 30.1.3 es una dependencia de pruebas adicional ya disponible; si falta, instalar localmente con npm install --no-save --package-lock=false --ignore-scripts jsdom@30.1.3.

Comando conjunto:
    node --import tsx --test tests/public-registration*.test.mjs tests/staging-write-001.test.mjs tests/staging-isolation-proof.test.mjs tests/staging-store-default-strict.test.mjs tests/security-containment-003.test.mjs tests/backup-security-002.test.cjs tests/business-description-links.test.mjs tests/business-ui-fix-001.integration.test.mjs tests/public-detail-ux-001.test.mjs tests/consolidation-001.test.mjs
Resultado final:132 ejecuciones PASS,0 FAIL,0 omitidas. Hay regresiones compartidas importadas por varias suites; no son132 casos únicos.

Backend compilado:
    ENC_SECURITY_EXECUTABLE=server.js ENC_BACKUP_EXECUTABLE=server.js node --test tests/security-containment-003.test.mjs tests/backup-security-002.test.cjs
Resultado:27 PASS,0 FAIL,0 omitidas. Extrae y ejecuta módulos/handlers del bundle en fixtures; NO ejecuta el servidor completo. Incluye la matriz de rutas de respaldo y conservación de archivos sintéticos.

También se ejecutaron aisladamente suites de consolidación, registro HTTP y escritura/respaldos al corregir incompatibilidades. La evidencia final no suma esas repeticiones como escenarios adicionales.

    node_modules/.bin/tsc --noEmit
    node_modules/.bin/vite build --outDir /tmp/enc-consolidation-frontend
    node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.js
    cp server.js api/server.bundle.js
    node --check server.js
    node --check api/server.bundle.js
Todos PASS. Vite:1726 módulos; advertencias de chunk>500kB y salida temporal externa, sin errores. Se publican server.js/api/server.bundle.js y dist/index.html con sus dos assets nuevos RECOMPILADOS desde estas fuentes. No se importan binarios de W2/GAS. Los25 archivos de implementación/pruebas/artefactos publicados coinciden25/25 con los hashes Git locales probados.

La batería prueba con HTTP loopback y datos sintéticos: registro anónimo, aislamiento por DB/marca/permisos, duplicados/idempotencia, fallo SQL sin falso éxito, listado/ficha tras recarga de caché, alta administrativa autenticada, edición parcial, contactos, separación entre interruptor público y administrativo, headers inventados, permisos insuficientes, TOP/recomendada restringidos, sesiones revocadas/vencidas y rutas de mutación denegadas. Scrypt y sesiones son código real con identidades sintéticas; SQL es simulado. El reinicio sin resurrección es un ensayo de código/modelo, no un reinicio MariaDB real.

## Incidencias y límites explícitos

Los primeros ensayos detectaron arneses que buscaban la antigua tabla de sesiones/login y esperaban sync-catalog exitoso o alta administrativa anónima. Se adaptaron a sesiones del módulo real, sincronización retirada410 y separación público/privado; no se quitaron controles para hacer pasar pruebas. La copia local carecía del CLI de respaldo: se recuperó exactamente el archivo deshabilitado de la base, sin modificarlo. También se corrigió rechazo del cliente de DELETE ante HTTP fallido con cuerpo contradictorio.

La prueba inicial de mapa usaba URL de búsqueda, que correctamente no habilita iframe. El intento posterior de incrustación en jsdom no terminó satisfactoriamente; no se acredita prueba positiva de iframe/Google Maps. La prueba final cubre el fallback sin iframe, contactos, enlaces seguros, galería y retorno en viewport/anchos SINTÉTICOS. No se alteró la lógica de Maps para pasarla. Hay paquete Playwright pero no ejecutable Chromium disponible: sin capturas nuevas ni validación geométrica real de overflow/posiciones. El contrato CSS se prueba estáticamente y la interacción mediante DOM; no equivale a inspección visual real.

MariaDB real probada:NO. No existen mariadbd/mysqld/mariadb ni Docker disponibles. No se instala ni inicia infraestructura. No hubo conexión a Hostinger, bases reales, secretos, SQL real, siembras, cambios de entorno remoto, PR, integración ni despliegue.

Seguridad administrativa y registro público compatibles:SÍ, verificados conjuntamente en HTTP local con SQL simulado. No equivale a prueba de configuración operativa, credenciales o permisos reales de Hostinger.

## Pendientes y riesgos

1. Inspección independiente por W2 y revisión de Coordinación.
2. MariaDB local desechable para persistencia, concurrencia del motor, reinicio y confirmación incierta reales.
3. Navegador real para escritorio/tablet/móvil y mapa incrustado con consentimiento. No afirmar coincidencia visual exacta.
4. Proveedor de credenciales servidor requiere ENC_ADMIN_CREDENTIALS_JSON(version1, cuentas con scrypt y permisos conocidos) y ENC_ADMIN_PUBLIC_ORIGIN HTTPS exacto. Ausente o inválido: login503. No se configura aquí ni se usan contraseñas/hash reales. Los antiguos STAGING_ADMIN_Y/J_SCRYPT ya no son el proveedor del servidor consolidado. Rotación/secretos/reinicio posteriores solo por operador autorizado.
5. Cuenta Staging, grants mínimos y marca de entorno deben pasar la comprobación existente; no se crean tablas para sortear bloqueos. Aun con credenciales correctas, ENC_ADMIN_MUTATIONS_ENABLED no abre writes generales: requiere capacidad controlada y ruta permitida. Otras operaciones administrativas, PIN, cambio de contraseña y cargas públicas permanecen bloqueadas.
6. Sesiones/límites por proceso; varios workers requieren política de afinidad/revocación. Cuota pública global previa al INSERT no es contador transaccional exacto. CAPTCHA no incorporado.
7. Artefactos históricos y secretos previamente publicados no se borran del historial. La contención Express no garantiza bloqueo en Hostinger/CDN si se sirven archivos directamente; requiere revisión operativa separada. No se declara seguridad total del hosting ni de otros módulos.

## Reversión

Mantener la rama aislada. Ante fallo después de una futura autorización, cerrar el interruptor público y las mutaciones administrativas y volver a lectura segura solo en Staging mediante el operador; no tocar producción. Reconciliar altas de confirmación incierta con el mismo UUID, sin repetirlas con claves nuevas. No restaurar SQL, resembrar o sincronizar catálogos. Revertir commits y sus artefactos como unidad únicamente bajo revisión: volver a la base reabre vulnerabilidades y no debe hacerse como rollback automático. No usar force push.

Dictamen: consolidación implementada y probada localmente con límites documentados; lista para inspección W2, no aprobada para integración/despliegue. Evidencia en docs/work-progress/ENC-CONSOLIDATION-001-evidence/.
