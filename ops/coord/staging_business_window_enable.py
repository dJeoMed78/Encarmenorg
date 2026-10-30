#!/usr/bin/env python3
"""Activate business-only test flags in Staging config, with private backup and rollback.
Do not restart services or touch production. Credentials never printed."""
import os,sys,pathlib,tempfile,secrets,hashlib,json,datetime,stat
H=pathlib.Path.home();ST=H/'domains/staging.encarmen.org/hbuilds';E=ST/'config/.env'
B=H/'encarmen-staging-backups';DB='u293982346_encarmentest';PROD='u293982346_encarmenapp'
def result(k,v):print(f'{k}={v}',flush=True)
def fail(s):result('RESULT','BLOCKED_'+s);sys.exit(0)
if not ST.is_dir() or not E.is_file() or E.is_symlink() or E.resolve().is_relative_to(H/'domains/encarmen.org'):fail('PATH')
if not B.is_dir() or B.is_symlink() or (B.stat().st_mode&0o077):fail('BACKUP_DIR')
old=E.read_text(encoding='utf8');lines=old.splitlines();v={}
for line in lines:
 x=line.strip()
 if x.startswith('export '):x=x[7:]
 if '=' not in x or x.startswith('#'):continue
 k,val=x.split('=',1);v.setdefault(k.strip(),[]).append(val.strip().strip('"').strip("'"))
def one(k):return v[k][0] if k in v and len(v[k])==1 else None
if one('APP_ENV')!='staging' or one('DB_NAME')!=DB or one('DB_USER') in (None,'','u293982346_appuser'):fail('DB_ENV')
if one('STAGING_READ_ONLY')!='true' or one('STAGING_DB_CONFIRMED')!='false':fail('NOT_INITIAL_SAFE_STATE')
if one('ENABLE_WP_SYNC') not in (None,'false') or one('STAGING_ALLOW_SCHEMA_INIT') not in (None,'false'):fail('UNSAFE_AUTOMATIC_FLAGS')
for k in ('ENC_ADMIN_CREDENTIALS_JSON','ENC_ADMIN_PUBLIC_ORIGIN','ENC_ADMIN_MUTATIONS_ENABLED','STAGING_BUSINESS_WRITES_ENABLED'):
 if k in v:fail('ALREADY_PRESENT_'+k)
if (B/'enc-staging-business-window-active.json').exists():fail('PREVIOUS_WINDOW_EXISTS')
# Separate creation of a private backup and private temporary credentials, then atomic env replacement.
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup=B/('enc-business-env-pre-'+stamp+'.bak')
secretfile=B/('enc-business-temp-login-'+stamp+'.json')
marker=B/'enc-staging-business-window-active.json'
password=secrets.token_urlsafe(36); salt=secrets.token_bytes(16)
password_hash='scrypt$'+salt.hex()+'$'+hashlib.scrypt(password.encode(),salt=salt,n=16384,r=8,p=1,dklen=64).hex()
admin={'version':1,'accounts':[{'username':'stagingtest','passwordHash':password_hash,'permissions':['business:manage']}]}
newvals={'STAGING_READ_ONLY':'false','STAGING_DB_CONFIRMED':'true',
 'STAGING_BUSINESS_WRITES_ENABLED':'true','ENC_ADMIN_MUTATIONS_ENABLED':'true',
 'ENC_ADMIN_PUBLIC_ORIGIN':'https://staging.encarmen.org',
 'ENC_ADMIN_CREDENTIALS_JSON':"'"+json.dumps(admin,separators=(',',':'))+"'"}
newlines=[]
for line in lines:
 stripped=line.strip()
 if stripped.startswith('export '):stripped=stripped[7:]
 key=stripped.split('=',1)[0].strip() if '=' in stripped else ''
 if key in ('STAGING_READ_ONLY','STAGING_DB_CONFIRMED'):newlines.append(key+'='+newvals.pop(key))
 else:newlines.append(line)
newlines.extend(k+'='+x for k,x in newvals.items())
def private_create(target,content):
 fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w',encoding='utf8') as stream:
  stream.write(content);stream.flush();os.fsync(stream.fileno())
private_create(backup,old)
private_create(secretfile,json.dumps({'username':'stagingtest','password':password,'created_utc':stamp}))
# Marker contains paths but no passwords.
private_create(marker,json.dumps({'backup':str(backup),'secret':str(secretfile),'created_utc':stamp}))
tmp=None
try:
 fd,p=tempfile.mkstemp(dir=E.parent,prefix='.env-write-window-')
 tmp=pathlib.Path(p)
 with os.fdopen(fd,'w',encoding='utf8') as stream:
  stream.write('\n'.join(newlines)+'\n');stream.flush();os.fsync(stream.fileno())
 os.chmod(tmp,stat.S_IMODE(E.stat().st_mode)&0o700)
 os.replace(tmp,E)
 tmp=None
 check=E.read_text(encoding='utf8')
 if 'STAGING_READ_ONLY=false' not in check.splitlines() or 'ENC_ADMIN_CREDENTIALS_JSON=' not in check:fail('POSTWRITE_VERIFY')
 result('ENV_BACKUP','PRIVATE_VERIFIED')
 result('TEMP_ADMIN_CREDENTIALS','PRIVATE_CREATED')
 result('APP_ENV','STAGING_CONFIRMED')
 result('PUBLIC_SITE_RESTART','NOT_PERFORMED')
 result('RESULT','READY_FOR_STAGING_ONLY_RESTART')
finally:
 if tmp and tmp.exists():tmp.unlink()
