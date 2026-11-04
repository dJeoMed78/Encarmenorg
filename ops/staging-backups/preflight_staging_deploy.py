#!/usr/bin/env python3
"""Read-only staging deployment isolation guard. Never prints SQL credentials or grants."""
import os
import pathlib
import re
import subprocess
import tempfile

home = pathlib.Path.home().resolve()
staging = home / 'domains/staging.encarmen.org/hbuilds'
production = home / 'domains/encarmen.org'
config = staging / 'config/.env'
backup = home / 'encarmen-staging-backups'
expected_db = 'u293982346_encarmentest'
production_db = 'u293982346_encarmenapp'
production_user = 'u293982346_appuser'

def require(condition, code):
    if not condition:
        raise RuntimeError(code)

def parse_env(path):
    vals = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line.startswith('export '):
            line = line[7:]
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        require(key.strip() not in vals, 'STAGING_CONFIG_DUPLICATED_KEYS')
        vals[key.strip()] = value.strip().strip('"').strip("'")
    return vals

def main():
    require(staging.is_dir() and production.is_dir(), 'SITE_ROOTS_MISSING')
    require(staging.resolve() != production.resolve(), 'SITE_ROOTS_OVERLAP')
    require(not production.resolve().is_relative_to(staging.resolve()), 'PRODUCTION_UNDER_STAGING')
    require(not staging.resolve().is_relative_to(production.resolve()), 'STAGING_UNDER_PRODUCTION')
    require(config.is_file() and not config.is_symlink(), 'STAGING_CONFIG_INVALID')
    require(config.stat().st_mode & 0o077 == 0, 'STAGING_CONFIG_NOT_PRIVATE')
    require(backup.is_dir() and not backup.is_symlink() and backup.stat().st_mode & 0o077 == 0, 'BACKUP_DIRECTORY_INVALID')
    active = staging / 'current'
    require(active.is_symlink() and re.fullmatch(r'versions/[A-Za-z0-9-]+', os.readlink(active)), 'ACTIVE_RELEASE_LINK_INVALID')
    expected_link = os.readlink(active)
    # Freeze this exact link in the GitHub Actions deployment job. The later swap
    # still fails closed if any other process changes it in the meantime.
    print('STAGING_PRE_DEPLOY_OLD_LINK='+expected_link)
    resolved = active.resolve()
    require(resolved.is_relative_to((staging/'versions').resolve()), 'ACTIVE_RELEASE_OUTSIDE_STAGING')
    require((resolved/'nodejs/server.js').is_file() and (resolved/'nodejs/dist/index.html').is_file(), 'ACTIVE_RELEASE_FILES_MISSING')
    require((resolved/'nodejs/api/server.bundle.js').is_file() and (resolved/'nodejs/node_modules').is_dir(), 'ACTIVE_RELEASE_RUNTIME_MISSING')
    require((resolved/'.metadata.json').is_file(), 'ACTIVE_METADATA_MISSING')
    v = parse_env(config)
    require(v.get('APP_ENV') == 'staging', 'APP_ENV_NOT_STAGING')
    dbs = {v.get(k) for k in ('DB_NAME','MYSQL_DATABASE','MARIADB_DATABASE') if v.get(k)}
    users = {v.get(k) for k in ('DB_USER','MYSQL_USER','MARIADB_USER') if v.get(k)}
    hosts = {v.get(k) for k in ('DB_HOST','MYSQL_HOST','MARIADB_HOST') if v.get(k)}
    passwords = {v.get(k) for k in ('DB_PASSWORD','MYSQL_PASSWORD','MARIADB_PASSWORD') if v.get(k)}
    require(dbs == {expected_db} and len(users)==1 and production_user not in users, 'DB_IDENTITY_NOT_STAGING')
    require(len(hosts)==1 and len(passwords)==1, 'DB_CONNECTION_AMBIGUOUS')
    for k in ('APP_URL', 'PUBLIC_URL', 'ENC_ADMIN_PUBLIC_ORIGIN'):
        if v.get(k):
            require(v[k].rstrip('/') == 'https://staging.encarmen.org', 'ORIGIN_NOT_STAGING')
    require(v.get('STAGING_ALLOW_SCHEMA_INIT') != 'true' and v.get('ENABLE_WP_SYNC') != 'true', 'UNSAFE_SCHEMA_OR_SYNC_ENABLED')
    host = next(iter(hosts))
    require(bool(re.fullmatch(r'[a-zA-Z0-9.:-]+', host)), 'DB_HOST_INVALID')
    port = v.get('DB_PORT','3306')
    require(port.isdecimal() and 1<=int(port)<=65535, 'DB_PORT_INVALID')
    # Credential values are only put into a private temporary option file; never stdout or argv.
    with tempfile.NamedTemporaryFile(mode='w',dir=backup,prefix='.sql-check-',suffix='.cnf',delete=False) as tmp:
        cnf = pathlib.Path(tmp.name)
        os.chmod(cnf, 0o600)
        def quote(x):
            return '"' + x.replace('\\','\\\\').replace('"','\\"').replace('\n','') + '"'
        tmp.write('[client]\n')
        for k,value in [('host',host),('port',port),('user',next(iter(users))),('password',next(iter(passwords)))]:
            tmp.write(k+'='+quote(value)+'\n')
    try:
        def sql(command):
            p = subprocess.run(['mariadb','--defaults-extra-file='+str(cnf),'--batch','--skip-column-names',
                                '--database='+expected_db,'-e',command],
                                text=True,capture_output=True,timeout=25)
            require(p.returncode==0, 'SQL_READONLY_PROOF_FAILED')
            return [line.strip() for line in p.stdout.splitlines() if line.strip()]
        identity = sql('SELECT DATABASE(), CURRENT_USER()')
        require(len(identity)==1, 'SQL_IDENTITY_MISSING')
        db, sql_user = identity[0].split('\t',1)
        require(db==expected_db and sql_user.split('@')[0]!=production_user, 'SQL_IDENTITY_NOT_STAGING')
        schemas = set(sql('SHOW DATABASES'))
        require(expected_db in schemas and production_db not in schemas, 'PRODUCTION_SCHEMA_VISIBLE')
        require(not (schemas-({expected_db,'information_schema','performance_schema','sys'})), 'OTHER_SCHEMA_VISIBLE')
        grants = sql('SHOW GRANTS')
        require(grants, 'SQL_GRANTS_MISSING')
        for grant in grants:
            upper = grant.upper()
            if ' ON *.* ' in upper:
                require(re.search(r'^GRANT USAGE ON \*\.\* TO ',upper) is not None, 'GLOBAL_SQL_PRIVILEGES_BLOCKED')
            else:
                require(('ON '+expected_db.upper()+'.') in upper or ('ON `'+expected_db.upper()+'`.') in upper,
                        'NON_STAGING_SQL_GRANT_BLOCKED')
        print('STAGING_SQL_ISOLATION=PASS')
    finally:
        cnf.unlink(missing_ok=True)
    # Backups checked without reading or printing any SQL contents.
    db_dir = backup/'database'
    require(db_dir.is_dir() and db_dir.stat().st_mode & 0o077 == 0, 'PRIVATE_DB_BACKUPS_MISSING')
    files = [p for p in db_dir.glob('staging-db-*.sql.gz') if p.is_file() and not p.is_symlink()]
    require(bool(files), 'NO_STAGING_DB_BACKUP')
    latest = max(files,key=lambda p:p.stat().st_mtime)
    require((pathlib.Path(str(latest)[:-7]+'.json')).is_file(), 'DB_BACKUP_MANIFEST_MISSING')
    test = subprocess.run(['gzip','-t',str(latest)],capture_output=True,timeout=40)
    require(test.returncode==0, 'DB_BACKUP_GZIP_INVALID')
    print('STAGING_DB_BACKUP_EXISTING=PASS')
    print('STAGING_CURRENT_RELEASE_MATCH=PASS')
    print('PRODUCTION_ISOLATION=PASS')
    print('STAGING_PREFLIGHT=PASS')

if __name__=='__main__':
    try:
        main()
    except Exception as exc:
        print('STAGING_PREFLIGHT=FAIL:'+str(exc))
        raise SystemExit(1)
