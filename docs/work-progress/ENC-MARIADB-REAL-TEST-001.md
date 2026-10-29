# ENC-MARIADB-REAL-TEST-001 — laboratorio MariaDB desechable para el código consolidado W1

Rama `work/enc-mariadb-real-test-001`, creada desde `work/enc-data-integrity-001` (`84819002a20857fee3e5f668189a615ef9a43618`). Referencia funcional: consolidación W1 `a16ca710449eda3c68f26016b91ce59d55b95b2b`.

## Alcance

- Prueba la capa consolidada real (`src/db/mariadb.ts`) contra una MariaDB desechable; no modifica `server.ts`, `src/db/mariadb.ts`, `main`, `ia-desarrollo` ni despliega.
- El parche anterior (`apply-data-integrity-patch.mjs`) NO se ejecuta ni se amplía; queda como evidencia histórica.
- El laboratorio crea `enc_lab_<timestamp>`, crea la tabla `businesses`, ejecuta 10 escenarios y borra la base al terminar (`--keep` la conserva).

## Cómo ejecutarlo

Contra un servidor MariaDB desechable propio (nunca Hostinger/producción):

    # 1) Plan (no toca nada)
    DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=lab DB_PASSWORD=*** DB_NAME=lab_server \
    npx tsx scripts/mariadb-real-lab.mjs

    # 2) Ejecutar con la frase exacta que imprime el plan
    DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=lab DB_PASSWORD=*** DB_NAME=lab_server \
    LAB_CONFIRM="ENC-LAB:enc_lab_<timestamp>:10" npx tsx scripts/mariadb-real-lab.mjs --apply

    # Opcional: conservar la base para inspección
    ... --apply --keep

Requisitos: Node 20+, `mysql2`, `tsx` y un servidor MariaDB/MySQL desechable (Docker: `docker run --rm -d -p 3306:3306 -e MARIADB_USER=lab -e MARIADB_PASSWORD=*** -e MARIADB_DATABASE=lab_server mariadb:11`).

## Escenarios (10)

1. **catalogo_vacio** — tabla recién creada, `dbLoadAllBusinesses` devuelve 0 filas.
2. **registro_persistencia** — `dbSaveBusiness` + lectura posterior encuentra la empresa.
3. **telefono_whatsapp** — teléfono y WhatsApp persisten en columnas.
4. **edicion_parcial** — guardar con contactos vacíos NO borra los guardados.
5. **edicion_contactos_nuevos** — contactos nuevos sí reemplazan.
6. **actualizacion_cache** — `dbGetBusinessesSignature` cambia tras una escritura.
7. **idempotencia** — guardar dos veces deja una sola fila.
8. **eliminacion_confirmada** — `dbDeleteBusiness` y la empresa desaparece.
9. **reinicio_sin_resurreccion** — reconexión y relectura; la eliminada no vuelve.
10. **fallo_sql_recuperacion** — tabla ausente no corrompe el estado; al recrearla la capa vuelve a operar.

## Seguridad

- `guardLabTarget` rechaza la base y el usuario de producción (detectados desde el propio módulo consolidado) y cualquier base que no empiece por `enc_lab_`.
- `--apply` exige `LAB_CONFIRM="ENC-LAB:<base>:10"`, generada por el plan; sin ella no se crea ni modifica nada.
- Credenciales solo por entorno del operador; el script no las lee de archivos ni las imprime.
- La base se elimina en `finally`, incluso si un escenario falla.

## Estado de ejecución

**NO se ejecutaron pruebas con MariaDB real en este entorno**: no hay Docker ni un servidor MariaDB disponible para el agente. El laboratorio quedó preparado y es idempotente; cualquier operador con un MariaDB desechable puede ejecutarlo con los comandos de arriba y obtener un informe JSON por escenario.

## Resultado esperado

`passed === total === 10`. Si `edicion_parcial` o `reinicio_sin_resurreccion` fallan, eso evidenciaría que la consolidación W1 no cubre esos casos en la práctica; no se debe 'arreglar' el laboratorio para que pase, sino reportar el resultado tal cual.
