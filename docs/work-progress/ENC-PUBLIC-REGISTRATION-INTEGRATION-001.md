# ENC-PUBLIC-REGISTRATION-INTEGRATION-001

Estado: IMPLEMENTADO y PROBADO LOCALMENTE con SQL simulado. Pendiente de revisión. No integrado ni desplegado.

- Rama: `work/enc-public-registration-integration-001`.
- Base: `1572a1dd9cbe31c1870a026ac947d3bfcfc877c5`.
- Interfaz GAS reutilizada selectivamente: `8435e7f94b0cee3d7f0623b966ed5cf3578a6283`.
- Commit funcional: `1298256e88c021fe7e4d855933c8a421e90a1191`.

## Flujo entregado

Formulario Glass GAS -> submitBusinessRegistration -> POST /api/public/business-registrations anónimo -> validación cerrada -> almacén existente con aislamiento estricto -> INSERT y COMMIT -> lectura SQL independiente -> actualización de directorio -> consultas HTTP de ficha y listado -> confirmación visual.

El parche PERP se aplicó al server.ts completo y su idempotencia se verificó sobre ese archivo. No se importó indiscriminadamente ningún servidor de otra rama ni se arrancó el servidor completo con sus procesos automáticos.

Se unificaron nombre, categoría/subcategoría, descripción, dirección, colonia, CP, teléfono, WhatsApp, horarios, modalidades, pagos y enlaces sociales/web. Los campos privilegiados siguen rechazados. Pagos y modalidades usan las opciones existentes; el servidor deriva hasDelivery y deliveryOption. Los canales telefónicos son independientes y comparten validación estricta; se rechazan contactos contaminados con texto o URL.

La confirmación pública exige empresa publicada con ID positivo, lectura posterior y visibilidad confirmada; el cliente consulta además las rutas reales de listado y ficha antes de mostrar éxito. Fallos de caché/consulta dan error y no éxito. El UUID se conserva durante reintentos, y la preconsulta de duplicados no bloquea un reintento después de un posible COMMIT. Los reintentos con la misma clave no consumen nuevos cupos de altas; los límites de intentos HTTP siguen activos. Un registro previamente confirmado puede reconciliarse aunque se haya alcanzado el cupo global. Cambiar el contenido de una clave ya persistida devuelve conflicto y no sobrescribe datos.

El alta administrativa conserva su contrato y sesión: se separó submitAdministrativeBusinessRegistration y se cambió únicamente su importación/llamada en WordPressSyncModal. La aplicación normal no navega antes de mostrar la confirmación del formulario.

## Imágenes: bloqueo explícito

El formulario público no utiliza uploadImage, FileReader ni fallback dataURI. Logotipo y galería aparecen deshabilitados y con explicación visible. La API pública no acepta logo, image ni gallery. No se abrió el uploader heredado ni se modificó el contrato de imágenes administrativo. Esta parte NO es funcional: requiere un contrato público seguro de almacenamiento, validación y límites propio.

## Pruebas ejecutadas

Comando final, desde la raíz y con dependencias disponibles:

    node --import tsx --test tests/public-registration*.test.mjs tests/staging-write-001.test.mjs tests/staging-isolation-proof.test.mjs tests/staging-store-default-strict.test.mjs

Resultado: 65 ejecuciones PASS, 0 FAIL, 0 canceladas, 0 omitidas. Incluye regresiones compartidas importadas por dos suites; no son 65 casos únicos. Las pruebas GAS originalmente estáticas se conservaron y se complementaron con formulario renderizado, HTTP loopback y almacén/verificador reales con conexión SQL simulada.

Verificado localmente: alta anónima, campos y contactos independientes, listado y ficha después de vaciar caché/recargar, reintento sin duplicados tras confirmación incierta, preservación de contactos en edición, sesiones administrativas, rechazo de base/marca de producción, rutas inseguras, errores de conexión y cuerpo excesivo. El simulador no acredita comportamiento de un motor MariaDB real ni reinicio real.

    node_modules/.bin/tsc --noEmit
    node_modules/.bin/vite build --outDir /tmp/enc-public-registration-frontend
    node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/enc-public-registration-server-check.mjs

Los tres comandos finalizaron con código 0. Vite: 1724 módulos, bundle JS de aproximadamente 1031 kB; consultar el log para la cifra exacta de módulos. Advertencias de bundle >500 kB y salida fuera de raíz, sin errores. El bundle del servidor no se ejecutó. No se usaron scripts npm que alteran versiones ni se reemplazaron binarios publicados del repositorio.

Errores encontrados y corregidos: importación .js inexistente en la prueba GAS; ejecución de TypeScript con sintaxis no soportada por strip-only (se usa el cargador tsx); tipado del contrato público; consumo de cupos por reintentos; éxito aunque la visibilidad no estuviera confirmada; campos de interfaz rechazados por el contrato anterior; inferencia de números desde caracteres inválidos. Logs finales en `ENC-PUBLIC-REGISTRATION-INTEGRATION-001-evidence/`.

## Límites y condiciones pendientes

- Registro público integrado en código: SÍ. Persistencia MariaDB real probada: NO.
- No hay mariadbd/mysqld/mariadb ni Docker locales disponibles. No se instalaron servicios ni se utilizaron Hostinger, credenciales reales o bases remotas.
- Se reutilizaron dependencias locales; instalación limpia no probada. Node 24.22.1, TypeScript 7.0.2 y Vite 8.3.5. Las pruebas de render requieren jsdom 30.1.3, no declarado en el manifiesto base; si falta, instalar solo localmente con `npm install --no-save --package-lock=false --ignore-scripts jsdom@30.1.3`.
- Activación posterior, únicamente por coordinación: PUBLIC_REGISTRATION_ENABLED=true más las compuertas existentes de escritura Staging y prueba real de aislamiento. Ninguna variable se cambió en Hostinger. El código público no se monta fuera de Staging.
- Límites por IP en memoria; tras reinicio se reinician. El conteo global persistente previo a crear no es una cuota transaccional exacta entre solicitudes concurrentes. El backend conserva bloqueo/idempotencia del INSERT; no se afirma protección antispam completa ni CAPTCHA.
- Se necesita posteriormente una prueba MariaDB local desechable y revisión del proxy para IP efectiva. No habilitar trust proxy indiscriminadamente.
- Reversión futura: deshabilitar el interruptor público bajo autorización de coordinación, conservando registros confirmados; no restaurar ni sincronizar catálogos. Revertir commits solo después de revisión y sin reescribir historial.

Dictamen: código de registro textual integrado y pruebas locales satisfactorias; pendiente de revisión y persistencia real. No se solicita ni ejecuta integración, despliegue o activación.
