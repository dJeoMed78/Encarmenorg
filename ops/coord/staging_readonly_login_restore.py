#!/usr/bin/env python3
"""Restore private Staging config after read-only login smoke; no SQL writes."""
import pathlib,os,sys,json,tempfile,stat
H=pathlib.Path.home();B=H/'encarmen-staging-backups';E=H/'domains/staging.encarmen.org/hbuilds/config/.env';M=B/'enc-staging-readonly-admin-active.json'
def out(k,v):print(f'{k}={v}',flush=True)
def stop(code):out('RESULT','BLOCKED_'+code);sys.exit(0)
if not M.is_file() or M.is_symlink() or M.stat().st_mode&0o077:stop('MARKER')
data=json.loads(M.read_text())
backup=pathlib.Path(data.get('backup',''));secret=pathlib.Path(data.get('secret',''))
if backup.parent!=B or secret.parent!=B or not backup.is_file() or backup.is_symlink() or not E.is_file() or E.is_symlink():stop('PATH')
old=backup.read_text()
if 'APP_ENV=staging' not in old.splitlines() or 'DB_NAME=u293982346_encarmentest' not in old.splitlines() or 'STAGING_READ_ONLY=true' not in old.splitlines():stop('BACKUP_NOT_STAGING_READONLY')
fd,tmp=tempfile.mkstemp(dir=E.parent,prefix='.enc-readonly-restore-')
try:
 with os.fdopen(fd,'w') as f:f.write(old);f.flush();os.fsync(f.fileno())
 os.chmod(tmp,stat.S_IMODE(E.stat().st_mode)&0o700)
 os.replace(tmp,E)
finally:
 if os.path.exists(tmp):os.unlink(tmp)
if E.read_text()!=old:stop('RESTORE_READBACK')
if secret.is_file() and not secret.is_symlink():secret.unlink()
M.unlink()
out('STAGING_CONFIG_RESTORED','VERIFIED')
out('TEMP_CREDENTIAL','REVOKED_FROM_CONFIG')
out('RESULT','READONLY_LOGIN_CONFIG_RESTORED')
