# ENC-MARIADB-PERSISTENCE-TEST-001
Base exacta: 0e2488f5552bf7768a15711316b0de4d71b5d17e.
Rama: work/enc-mariadb-persistence-test-001.
Solo arnés, fixtures y evidencia: ninguna modificación de la implementación.

## Qué se ejecuta
El runner crea su propio directorio temporal 0700, inicializa una MariaDB vacía, crea un usuario sintético de privilegios mínimos, carga el fixture y ejecuta el store real de esa base. Usa el verificador de aislamiento predeterminado, sin stub ni override. Compila únicamente módulos sin efectos de arranque y extrae businessFromRow del archivo real; nunca importa server.ts ni llama initMariaDb.
El identificador local de esquema coincide con el guard fijo de la aplicación. NO es una conexión a Staging remoto ni una copia de sus datos.
Por defecto usa socket Unix privado y --skip-networking. ENC_MARIADB_TRANSPORT=loopback permite exclusivamente 127.0.0.1 y un puerto efímero elegido por el runner; no acepta host/puerto externos. Se verifica @@datadir y el bind antes de cargar fixtures.
Tras las pruebas reinicia MariaDB sobre el mismo datadir y vuelve a verificar la fila durable. Siempre detiene su propio proceso y elimina exclusivamente su directorio temporal. Las contraseñas se generan por ejecución y no se incluyen en el informe.

## Reproducción Linux
Requiere Node22+ y una instalación local de MariaDB10.11 con bin/mariadb-install-db, sbin/mariadbd y tablas de sistema.
En copia independiente de esta rama sin .env ni credenciales:

    mkdir -p /tmp/enc-persistence-tools
    npm install --prefix /tmp/enc-persistence-tools --ignore-scripts --no-audit --no-fund mysql2@3.24.5 esbuild@0.28.2
    ln -s /tmp/enc-persistence-tools/node_modules node_modules
    env -i PATH="$PATH" ENC_MARIADB_BASEDIR=/usr ENC_MARIADB_REPORT=/tmp/enc-persistence-result.json node tests/run-mariadb-persistence-001.mjs

Si el sistema bloquea sockets Unix, añadir ENC_MARIADB_TRANSPORT=loopback al comando env. El runner no usa configuraciones de conexión heredadas y rechaza variables externas de conexión presentes.

En este entorno se descargaron/extrajeron paquetes Ubuntu a /tmp, sin instalar ni iniciar servicios del sistema:
- mariadb-server-core, mariadb-server, mariadb-client-core, mariadb-common.
- liburing2, libaio1t64, libnuma1, libpmem1.
Se usaron apt-get download y dpkg-deb -x, sin ejecutar postinst de paquetes.
Prefijo extraído: /tmp/enc-mariadb-runtime/usr.
Comando realmente ejecutado:

    env -i PATH="$PATH" LD_LIBRARY_PATH=/tmp/enc-mariadb-runtime/usr/lib/x86_64-linux-gnu ENC_MARIADB_BASEDIR=/tmp/enc-mariadb-runtime/usr ENC_MARIADB_TRANSPORT=loopback ENC_MARIADB_REPORT=/tmp/enc-mariadb-persistence-results-final.json node tests/run-mariadb-persistence-001.mjs

No ejecutar directamente los tests con una conexión de otro origen. El contexto exige un directorio privado creado por el runner y un endpoint local.

## Resultados ejecutados — 2026-10-29
MariaDB10.11.14-MariaDB-0ubuntu0.24.04.1, Node24.22.1, mysql2 3.24.5, esbuild0.28.2.
Ejecución final: 15:15:30–15:15:34 UTC (09:15:30–09:15:34 America/Mexico_City).
18 pruebas PASS; cero fallos, cero omisiones. Además, comprobación posterior al reinicio de MariaDB: PASS. Instancia detenida y datos temporales eliminados.
Evidencia agregada: tests/evidence/mariadb-persistence-001-results.json.

1. MariaDB real, InnoDB, PK y aislamiento predeterminado estricto con SHOW GRANTS/esquemas/marca reales.
2. INSERT y lectura posterior; canales separados y metadatos privados no expuestos por serializador.
3. UPDATE parcial conserva teléfono/WhatsApp, rating SQL, galería y demás datos no editados.
4. Reintento idempotente; misma clave con payload distinto rechazada.
5. Duplicado de negocio y restricción PK reales, sin reemplazar contactos.
6. Dos altas concurrentes con misma clave: una inserción y un replay.
7. Dos altas concurrentes con contacto duplicado y claves diferentes: una gana, otra409.
8. Dos UPDATE parciales concurrentes sobre una fila conservan ambos cambios mediante FOR UPDATE.
9. Conflicto de slug ya reservado revierte la operación.
10. Credencial sintética incorrecta produce error de conexión sin insertar.
11. Conexión real destruida después del INSERT y antes del COMMIT: no hay fila confirmada ni falso éxito.
12. Fallo inyectado tras COMMIT REAL: resultado incierto y replay idempotente sin duplicación.
13. Capacidad read-only rechaza antes de adquirir conexión.
14. Conexión real a esquema local distinto rechazada.
15. Marca inválida y grants reales sobre otro esquema bloquean el verificador predeterminado.
16. Entorno incorrecto/DDL automático/configuración inválida rechazados.
17. Tabla ausente no se crea ni se rellena silenciosamente.
18. Nuevo proceso Node con PID distinto relee la fila y recupera idempotencia.
Después: reinicio real del proceso MariaDB y nueva lectura/replay de la fila durable.

## Alcance exacto y límites
- No es una simulación del motor: INSERT, UPDATE, rollback, PK, locks, grants y persistencia se ejecutaron en MariaDB real.
- La pérdida de confirmación se inyecta en el arnés después de esperar un COMMIT real; no se afirma haber reproducido una avería física de red.
- Se reinicia un worker de persistencia y MariaDB; NO el servidor completo del portal ni Hostinger.
- Se comprueba concurrencia de altas y actualizaciones parciales. No se certifican todos los órdenes de carrera entre slugs de filas distintas ni control optimista de versiones no definido por el store.
- No certifica HTTP/autenticación/UI, migraciones, backups, configuración remota, equivalencia con versión Hostinger o topologías múltiples.
- Los tests llaman el store con patches ya preparados; validación de formularios/rutas queda fuera.
- No se modificaron src/, package.json, main, Staging, producción ni ramas del Trabajador1.
- No se ejecutaron scripts de build del proyecto, consultas remotas, despliegues ni integración.

## Incidencias del arnés
La primera inicialización de paquetes necesitó evitar el cambio de usuario _apt, no soportado por el contenedor.
Dos arranques de MariaDB con socket Unix fallaron con Operation not permitted antes de ejecutar pruebas; no cuentan como PASS.
Se añadió transporte explícito de loopback permitido. No se concedieron permisos ampliados.
Se ajustó el cierre de temporizadores del runner y se repitió la suite completa desde una nueva instancia:18/18 PASS y reinicio durable PASS.
No se corrigió ni duplicó código funcional del Trabajador1.

## Reversión
No integrar la rama. Si se integra posteriormente bajo autorización, revertir solo los commits de arnés/documentación. No hay migración ni cambio de datos remotos que revertir.
