#!/usr/bin/env python3
"""ENC-041 one-shot REAL SQL persistence probe. Run only via scoped staging GitHub job.
No production access, no schema changes, no general application write toggle.
A verified full staging dump is created privately before a hidden single-row probe.
"""
import datetime as dt
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import uuid

STAGING = "u293982346_encarmentest"
PRODUCTION = "u293982346_encarmenapp"
PROD_USER = "u293982346_appuser"
HOME = Path.home()
ROOT = HOME / "domains/staging.encarmen.org/hbuilds"
PRIV = HOME / "encarmen-staging-backups"
ENV = ROOT / "config/.env"

def abort(code):
    raise RuntimeError(code)

def config():
    if not ENV.is_file() or ENV.is_symlink() or ENV.stat().st_mode & 0o077:
        abort("PRIVATE_CONFIG_NOT_VERIFIED")
    result = {}
    for original in ENV.read_text(encoding="utf8").splitlines():
        line = original.strip().removeprefix("export ").strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key in result and key in ("APP_ENV", "DB_NAME", "DB_USER", "DB_HOST", "DB_PASSWORD"):
            abort("PRIVATE_CONFIG_DUPLICATE")
        result[key] = value.strip().strip('"').strip("'")
    if result.get("APP_ENV") != "staging" or result.get("DB_NAME") != STAGING:
        abort("ENVIRONMENT_NOT_STAGING")
    if not result.get("DB_USER") or result["DB_USER"] == PROD_USER:
        abort("PRODUCTION_USER_BLOCKED")
    if result.get("STAGING_DB_CONFIRMED") != "true":
        abort("STAGING_DB_NOT_CONFIRMED")
    if any(not result.get(k) for k in ("DB_HOST", "DB_PASSWORD")):
        abort("DATABASE_CONFIG_INCOMPLETE")
    if not ROOT.is_dir() or not (ROOT / "current").is_symlink():
        abort("STAGING_RELEASE_NOT_PRESENT")
    if not PRIV.is_dir() or PRIV.is_symlink() or PRIV.stat().st_mode & 0o077:
        abort("PRIVATE_BACKUP_DIRECTORY_NOT_VERIFIED")
    return result

def clientconfig(v):
    temp = tempfile.NamedTemporaryFile(mode="w", prefix=".enc041-client-",
                                       suffix=".cnf", dir=PRIV, delete=False)
    pathname = Path(temp.name)
    try:
        os.chmod(pathname, 0o600)
        def escape(value):
            return '"' + str(value).replace("\\", "\\\\").replace('"', '\\"').replace("\n", "") + '"'
        temp.write("[client]\n")
        for key, val in (("host", v["DB_HOST"]), ("port", v.get("DB_PORT", "3306")),
                         ("user", v["DB_USER"]), ("password", v["DB_PASSWORD"])):
            temp.write(key + "=" + escape(val) + "\n")
    finally:
        temp.close()
    return pathname

def command(cnf, program, args, timeout=60):
    result = subprocess.run([program, "--defaults-extra-file=" + str(cnf), *args],
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=timeout)
    if result.returncode != 0:
        abort(program.upper().replace("-", "_") + "_FAILED")
    return result.stdout

def sql(cnf, query):
    data = command(cnf, "mariadb",
                   ["--raw", "--batch", "--skip-column-names", "-D", STAGING, "-e", query], timeout=25)
    return [line.split("\t") for line in data.decode("utf8").strip().splitlines() if line.strip()]

def check_isolation(cnf):
    ident = sql(cnf, "SELECT DATABASE(),CURRENT_USER()")
    if len(ident) != 1 or ident[0][0] != STAGING or ident[0][1].split("@")[0] == PROD_USER:
        abort("SQL_IDENTITY_NOT_STAGING")
    schemas = {x[0].lower() for x in sql(cnf, "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA")}
    if STAGING not in schemas or not schemas.issubset({STAGING, "information_schema", "performance_schema"}):
        abort("SCHEMA_ISOLATION_FAILED")
    marker = sql(cnf, "SELECT env_name,db_name FROM encarmen_environment_marker")
    if marker != [["staging", STAGING]]:
        abort("ENVIRONMENT_MARKER_NOT_STAGING")
    grants = ["\t".join(x).upper() for x in sql(cnf, "SHOW GRANTS FOR CURRENT_USER()")]
    if not grants or any(PRODUCTION.upper() in x for x in grants):
        abort("PRODUCTION_PRIVILEGE_DETECTED")
    if any(" ON *.*" in x and "USAGE" not in x for x in grants):
        abort("GLOBAL_WRITE_PRIVILEGES_BLOCKED")
    if not (any("INSERT" in x or "ALL PRIVILEGES" in x for x in grants) and
            any("DELETE" in x or "ALL PRIVILEGES" in x for x in grants)):
        abort("PROBE_CLEANUP_PRIVILEGE_MISSING")
    engine = sql(cnf, "SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classifieds'")
    pk = sql(cnf, "SELECT COLUMN_NAME,NON_UNIQUE,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classifieds' AND INDEX_NAME='PRIMARY'")
    if engine != [["InnoDB"]] or pk != [["id", "0", "1"]]:
        abort("CLASSIFIEDS_SCHEMA_UNSAFE")
    print("ENC041_ISOLATION=STAGING_SQL_MARKER_GRANTS_SCHEMA_VERIFIED")

def full_backup(cnf):
    folder = PRIV / "database"
    if folder.is_symlink() or not folder.is_dir() or folder.stat().st_mode & 0o077:
        abort("STAGING_BACKUP_DESTINATION_UNSAFE")
    dump = command(cnf, "mariadb-dump",
                   ["--single-transaction", "--quick", "--skip-lock-tables",
                    "--default-character-set=utf8mb4", "--no-tablespaces", STAGING], timeout=240)
    if len(dump) > 100_000_000 or len(dump) < 1024 or b"CREATE TABLE" not in dump:
        abort("SQL_BACKUP_INCOMPLETE_OR_TOO_LARGE")
    zipped = gzip.compress(dump, mtime=0)
    if gzip.decompress(zipped) != dump:
        abort("SQL_BACKUP_GZIP_INVALID")
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    file = folder / ("enc041-preproof-" + stamp + "-" + uuid.uuid4().hex[:8] + ".sql.gz")
    metadata = file.with_suffix(".manifest.json")
    with file.open("xb") as output:
        os.chmod(file, 0o600)
        output.write(zipped)
        output.flush()
        os.fsync(output.fileno())
    if file.stat().st_size != len(zipped):
        abort("SQL_BACKUP_WRITE_UNCONFIRMED")
    info = {"kind": "ENC041_STAGING_FULL_PREPROOF", "db": STAGING,
            "created_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "file": file.name, "size_bytes": len(zipped),
            "sha256": hashlib.sha256(zipped).hexdigest()}
    with metadata.open("x", encoding="utf8") as output:
        os.chmod(metadata, 0o600)
        json.dump(info, output, indent=2)
        output.flush()
        os.fsync(output.fileno())
    print("ENC041_FRESH_SQL_BACKUP=CREATED_VERIFIED_PRIVATE")
    print("ENC041_BACKUP_REFERENCE=" + file.name)
    return file

def str_sql(value):
    # SQL literals represented as hex; no untrusted SQL or password interpolation.
    return "CONVERT(0x" + str(value).encode("utf8").hex() + " USING utf8mb4)"

def read_probe(cnf, test_id):
    q = "SELECT id,status,SHA2(raw_data,256) FROM classifieds WHERE id=" + str_sql(test_id)
    return sql(cnf, q)

def main():
    if os.getenv("ENC041_REAL_SQL_PROOF") != "AUTHORIZED_STAGING_ONLY":
        abort("EXPLICIT_AUTHORIZATION_NOT_SET")
    v = config()
    cnf = clientconfig(v)
    test_id = "ad-enc041-probe-" + uuid.uuid4().hex
    data = {"id": test_id, "title": "ENC041 prueba oculta, no publicar",
            "category": "__enc041_internal_test", "status": "trash",
            "sourceUrl": "https://mx.computrabajo.com/ofertas-de-trabajo/enc041-synthetic",
            "_encTechnicalProbe": True}
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    digest = hashlib.sha256(raw.encode("utf8")).hexdigest()
    attempted = False
    committed = False
    cleanup = False
    try:
        check_isolation(cnf)
        full_backup(cnf)
        if read_probe(cnf, test_id):
            abort("PROBE_ID_COLLISION")
        print("ENC041_BEFORE_INSERT=NO_SYNTHETIC_ROW")
        attempted = True
        insert = (
            "START TRANSACTION; "
            "INSERT INTO classifieds (id,title,category,subcategory,price,price_type,"
            "phone,whatsapp,colonia,status,user_token,raw_data) VALUES ("
            + ",".join([str_sql(test_id), str_sql(data["title"]), str_sql(data["category"]),
                        str_sql(""), "NULL", str_sql("consult"), str_sql(""), str_sql(""),
                        str_sql(""), str_sql("trash"), str_sql(""), str_sql(raw)]) + "); COMMIT;"
        )
        sql(cnf, insert)
        committed = True
        print("ENC041_SQL_INSERT_COMMIT=SUCCESS")
        expected = [[test_id, "trash", digest]]
        if read_probe(cnf, test_id) != expected:
            abort("POST_COMMIT_INDEPENDENT_READBACK_FAILED")
        print("ENC041_NEW_CONNECTION_READBACK=EXACT_MATCH")
        where = "id=" + str_sql(test_id) + " AND status=" + str_sql("trash") + " AND SHA2(raw_data,256)=" + str_sql(digest)
        sql(cnf, "DELETE FROM classifieds WHERE " + where)
        if read_probe(cnf, test_id):
            abort("SYNTHETIC_CLEANUP_READBACK_FAILED")
        cleanup = True
        print("ENC041_SYNTHETIC_ROW_CLEANUP=CONFIRMED")
        print("ENC041_REAL_SQL_PERSISTENCE=PASS")
    finally:
        if attempted and not cleanup:
            try:
                where = "id=" + str_sql(test_id) + " AND status=" + str_sql("trash") + " AND SHA2(raw_data,256)=" + str_sql(digest)
                sql(cnf, "DELETE FROM classifieds WHERE " + where)
                if not read_probe(cnf, test_id):
                    cleanup = True
                    print("ENC041_RECOVERY_CLEANUP=CONFIRMED")
            except Exception:
                print("ENC041_RECOVERY_CLEANUP=REQUIRES_OPERATOR")
            if not cleanup:
                print("ENC041_PROBE_ID_FOR_OPERATOR=" + test_id)
        cnf.unlink(missing_ok=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        code = str(error).replace("-", "_")
        print("ENC041_REAL_SQL_PERSISTENCE=BLOCKED_OR_FAILED")
        print("ENC041_FAILURE_CODE=" + re.sub(r"[^A-Z0-9_]", "_", code.upper())[:80])
        sys.exit(1)
