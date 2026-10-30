#!/usr/bin/env python3
"""Revert only Staging .env to verified private pre-test snapshot. Do not restart."""
import pathlib,os,sys,tempfile,stat,json
H=pathlib.Path.home();S=H/'domains/staging.encarmen.org/hbuilds';E=S/'config/.env'
B=H/'encarmen-staging-backups';M=B/'enc-staging-business-window-active.json'
def say(k,v):print(f'{k}={v}',flush=True)
def fail(k):say('RESULT','BLOCKED_'+k);sys.exit(0)
if not M.is_file() or M.is_symlink() or M.stat().st_mode&0o077:fail('MARKER')
if not E.is_file() or E.is_symlink() or not S.is_dir():fail('STAGING_PATH')
try:cfg=json.loads(M.read_text())
except Exception:fail('MARKER_CONTENT')
backup=pathlib.Path(cfg.get('backup',''));secret=pathlib.Path(cfg.get('secret',''))
if backup.parent!=B or secret.parent!=B or not backup.is_file() or backup.is_symlink():fail('BACKUP')
old=backup.read_text(encoding='utf8')
def parse_env(text):
 result={}
 for line in text.splitlines():
  line=line.strip()
  if line.startswith('export '):line=line[7:]
  if not line or line.startswith('#') or '=' not in line:continue
  key,value=line.split('=',1)
  result.setdefault(key.strip(),[]).append(value.strip().strip('"').strip("'"))
 return result
def exact(env,key,expected):
 return key in env and len(env[key])==1 and env[key][0]==expected
prior=parse_env(old)
if not (exact(prior,'APP_ENV','staging') and exact(prior,'STAGING_READ_ONLY','true') and exact(prior,'STAGING_DB_CONFIRMED','false') and exact(prior,'DB_NAME','u293982346_encarmentest')):fail('BACKUP_SAFETY')
current=E.read_text(encoding='utf8')
if not exact(parse_env(current),'DB_NAME','u293982346_encarmentest'):fail('CURRENT_DB')
fd,tmp=tempfile.mkstemp(dir=E.parent,prefix='.env-stage-rollback-')
try:
 with os.fdopen(fd,'w',encoding='utf8') as f:
  f.write(old);f.flush();os.fsync(f.fileno())
 os.chmod(tmp,stat.S_IMODE(E.stat().st_mode)&0o700)
 os.replace(tmp,E)
finally:
 if os.path.exists(tmp):os.unlink(tmp)
if E.read_text(encoding='utf8')!=old:fail('READBACK')
say('STAGING_ENV_RESTORED','VERIFIED')
# Credential file no longer needed after settings revert. Keep private backup for recovery.
if secret.is_file() and not secret.is_symlink():secret.unlink()
M.unlink()
say('TEMP_CREDENTIAL','REVOKED_FROM_CONFIG')
say('RESTART_STAGING_REQUIRED','true')
say('RESULT','RESTORED_READONLY_CONFIG')
