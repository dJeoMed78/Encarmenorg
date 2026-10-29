#!/usr/bin/env python3
"""Respaldo SQL rotativo de Staging: 72 h / 3 copias / 9 días.

No conecta a Staging ni programa ejecuciones hasta que un operador lo configure.
Sólo lectura SQL; no contiene comandos para restaurar ni modificar bases.
"""
import datetime as dt
import fcntl
import gzip
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile

STAGING_DB = "u293982346_encarmentest"
PRODUCTION_DB = "u293982346_encarmenapp"
PRODUCTION_USER = "u293982346_appuser"
INTERVAL = dt.timedelta(days=3)
RETENTION = dt.timedelta(days=9)
MAX_COPIES = 3
NAME = re.compile(r"^staging-db-(\d{8}T\d{6}Z)\.sql\.gz$")


def abort(message):
    raise RuntimeError(message)


def validated_dir():
    raw = os.getenv("ENC_STAGING_BACKUP_DIR", "")
    if not raw or not pathlib.Path(raw).is_absolute():
        abort("Se requiere ENC_STAGING_BACKUP_DIR absoluto y privado.")
    root = pathlib.Path(raw)
    if any(p.is_symlink() for p in (root, *root.parents)):
        abort("No se permiten enlaces simbólicos en el destino.")
    if not root.is_dir():
        abort("El directorio privado debe existir previamente: no se crea automáticamente.")
    if root.stat().st_mode & 0o077:
        abort("El directorio privado debe tener permisos 0700.")
    dbdir = root / "database"
    if dbdir.exists() and dbdir.is_symlink():
        abort("Directorio de DB no puede ser symlink.")
    dbdir.mkdir(mode=0o700, exist_ok=True)
    if dbdir.stat().st_mode & 0o077:
        abort("database/ debe tener permisos 0700.")
    return dbdir


def config_file():
    raw = os.getenv("ENC_STAGING_BACKUP_CNF", "")
    if not raw or not pathlib.Path(raw).is_absolute():
        abort("Se requiere ENC_STAGING_BACKUP_CNF privado y absoluto.")
    path = pathlib.Path(raw)
    if path.is_symlink() or not path.is_file() or path.stat().st_mode & 0o077:
        abort("El archivo de credenciales debe existir, no ser symlink y tener permisos 0600.")
    return str(path)


def sql_identity(option_file):
    args = ["mariadb", "--defaults-extra-file=" + option_file,
            "--batch", "--skip-column-names", "-D", STAGING_DB,
            "-e", "SELECT DATABASE(), CURRENT_USER()"]
    result = subprocess.run(args, capture_output=True, text=True, timeout=30)
    if result.returncode:
        abort("No se pudo verificar identidad SQL; se aborta sin respaldo.")
    rows = [x.split("\t") for x in result.stdout.strip().splitlines() if x.strip()]
    if len(rows) != 1 or len(rows[0]) != 2:
        abort("Respuesta inesperada de identidad SQL.")
    db, user = rows[0]
    if db != STAGING_DB or db == PRODUCTION_DB or user.split("@")[0] == PRODUCTION_USER:
        abort("Identidad SQL no corresponde al entorno Staging aprobado.")
    return db, user


def snapshots(dbdir):
    result = []
    for path in dbdir.iterdir():
        match = NAME.fullmatch(path.name)
        if match and path.is_file() and not path.is_symlink():
            date = dt.datetime.strptime(match.group(1), "%Y%m%dT%H%M%SZ").replace(tzinfo=dt.timezone.utc)
            result.append((date, path))
    return sorted(result)


def run():
    if os.getenv("ENC_STAGING_BACKUP_HOST_VERIFIED") != "yes":
        abort("Aislamiento host/base/usuario de Staging sin verificar expresamente.")
    dbdir = validated_dir()
    option_file = config_file()
    with open(dbdir / ".backup.lock", "a+", encoding="utf-8") as lock:
        os.chmod(dbdir / ".backup.lock", 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        current = dt.datetime.now(dt.timezone.utc)
        entries = snapshots(dbdir)
        if entries and current - entries[-1][0] < INTERVAL:
            print("SKIP: existe respaldo reciente; no se requiere nueva copia.")
            return
        db, user = sql_identity(option_file)
        stamp = current.strftime("%Y%m%dT%H%M%SZ")
        name = "staging-db-" + stamp
        target = dbdir / (name + ".sql.gz")
        manifest = dbdir / (name + ".json")
        if target.exists() or manifest.exists():
            abort("Ya existe respaldo con esta marca temporal.")
        temp = None
        try:
            with tempfile.NamedTemporaryFile(dir=dbdir, prefix=".partial-", delete=False) as f:
                temp = pathlib.Path(f.name)
            os.chmod(temp, 0o600)
            command = ["mariadb-dump", "--defaults-extra-file=" + option_file,
                       "--single-transaction", "--quick", "--skip-lock-tables",
                       "--default-character-set=utf8mb4", "--no-tablespaces", db]
            with open(temp, "wb") as destination:
                with gzip.GzipFile(filename="", mode="wb", fileobj=destination) as compressed:
                    process = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                             timeout=300)
                    if process.returncode:
                        abort("mariadb-dump falló; se conserva el historial anterior.")
                    if not process.stdout or b"CREATE TABLE" not in process.stdout:
                        abort("El dump está vacío o no parece contener el esquema SQL.")
                    compressed.write(process.stdout)
                destination.flush()
                os.fsync(destination.fileno())
            if temp.stat().st_size == 0:
                abort("El respaldo generado está vacío.")
            with gzip.open(temp, "rb") as reader:
                prefix = reader.read(65536)
            if not prefix or b"CREATE TABLE" not in prefix:
                abort("No se pudo verificar lectura del respaldo comprimido.")
            digest = hashlib.sha256(temp.read_bytes()).hexdigest()
            metadata = {"created_utc": current.isoformat(), "database": db,
                        "sql_user": user, "file": target.name,
                        "bytes": temp.stat().st_size, "sha256": digest,
                        "retention_days": 9, "maximum_snapshots": 3}
            os.replace(temp, target)
            temp = None
            with open(manifest, "x", encoding="utf-8") as stream:
                os.chmod(manifest, 0o600)
                json.dump(metadata, stream, ensure_ascii=False, indent=2)
            # Rotar sólo después de generar un archivo nuevo y manifiesto.
            previous = snapshots(dbdir)
            to_remove = [(date, file) for date, file in previous
                         if file != target and current - date >= RETENTION]
            survivors = [(date, file) for date, file in previous if (date, file) not in to_remove]
            to_remove += survivors[:-MAX_COPIES]
            for _, file in to_remove:
                file.unlink()
                file.with_name(file.name.replace(".sql.gz", ".json")).unlink(missing_ok=True)
            print("SUCCESS: copia verificada, retención aplicada; archivo:", target.name)
        finally:
            if temp is not None:
                temp.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        run()
    except Exception as error:
        print("ERROR: " + str(error), file=sys.stderr)
        sys.exit(1)
