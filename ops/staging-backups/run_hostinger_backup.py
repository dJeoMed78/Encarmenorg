#!/usr/bin/env python3
"""Ejecutar respaldo solo de MariaDB STAGING usando la configuración privada de su propio sitio.

No imprimir secretos. Requiere scripts en mismo directorio, carpeta privada ya creada y
una base de Staging de nombre/usuario verificados. No altera tablas ni producción.
"""
import os
from pathlib import Path
import re
import runpy
import tempfile

HOME=Path.home()
ROOT=HOME/'encarmen-staging-backups'
ENV=HOME/'domains/staging.encarmen.org/hbuilds/config/.env'
STAGING_DB='u293982346_encarmentest'
PRODUCTION_DB='u293982346_encarmenapp'
PRODUCTION_USER='u293982346_appuser'

def fail(msg):
    raise RuntimeError(msg)

def read_config(path):
    if not path.is_file() or path.is_symlink():
        fail('No existe configuración privada de Staging permitida')
    values={}
    for line in path.read_text(encoding='utf-8').splitlines():
        line=line.strip()
        if line.startswith('export '): line=line[7:]
        if not line or line.startswith('#') or '=' not in line: continue
        k,v=line.split('=',1)
        values[k.strip()]=v.strip().strip('"').strip("'")
    return values

def pick(v, names):
    return next((v[k] for k in names if v.get(k)), '')

def main():
    v=read_config(ENV)
    db=pick(v,['DB_NAME','MYSQL_DATABASE','MARIADB_DATABASE'])
    user=pick(v,['DB_USER','MYSQL_USER','MARIADB_USER'])
    password=pick(v,['DB_PASSWORD','MYSQL_PASSWORD','MARIADB_PASSWORD'])
    host=pick(v,['DB_HOST','MYSQL_HOST','MARIADB_HOST'])
    port=pick(v,['DB_PORT','MYSQL_PORT','MARIADB_PORT']) or '3306'
    if db!=STAGING_DB or db==PRODUCTION_DB or not user or user==PRODUCTION_USER:
        fail('Base o usuario no son exclusivos del entorno de Staging')
    if not password or not re.fullmatch(r'[a-zA-Z0-9.:-]+',host) or not port.isdecimal() or not 1<=int(port)<=65535:
        fail('Configuración incompleta o insegura')
    if not ROOT.is_dir() or ROOT.is_symlink() or ROOT.stat().st_mode & 0o077:
        fail('Destino privado no verificado')
    cnf=None
    try:
        with tempfile.NamedTemporaryFile(mode='w',prefix='.cnf-',suffix='.tmp',
                dir=ROOT,delete=False,encoding='utf-8') as f:
            cnf=Path(f.name)
            cnf.chmod(0o600)
            def val(s):
                return '"'+s.replace('\\','\\\\').replace('"','\\"').replace('\n','')+'"'
            f.write('[client]\n')
            for key,value in [('host',host),('port',port),('user',user),('password',password)]:
                f.write(key+'='+val(value)+'\n')
        os.environ['ENC_STAGING_BACKUP_DIR']=str(ROOT)
        os.environ['ENC_STAGING_BACKUP_CNF']=str(cnf)
        os.environ['ENC_STAGING_BACKUP_HOST_VERIFIED']='yes'
        script=Path(__file__).with_name('backup_staging_db.py')
        runpy.run_path(str(script),run_name='__main__')
    finally:
        if cnf is not None:
            cnf.unlink(missing_ok=True)

if __name__=='__main__':
    main()
