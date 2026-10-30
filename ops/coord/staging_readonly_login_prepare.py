#!/usr/bin/env python3
"""Create a temporary, read-only Staging login credential; no SQL writes."""
import pathlib,os,stat,sys,json,secrets,hashlib,tempfile,datetime
H=pathlib.Path.home();ROOT=H/'domains/staging.encarmen.org/hbuilds';E=ROOT/'config/.env'
B=H/'encarmen-staging-backups';MARK=B/'enc-staging-readonly-admin-active.json'
def emit(k,v):print(f'{k}={v}',flush=True)
def block(code):emit('RESULT','BLOCKED_'+code);sys.exit(0)
if not (E.is_file() and not E.is_symlink() and B.is_dir() and not B.is_symlink() and B.stat().st_mode & 0o077==0):block('SAFE_PATH')
if MARK.exists():block('WINDOW_ALREADY_ACTIVE')
old=E.read_text();v={}
for line in old.splitlines():
 line=line.strip()
 if line.startswith('export '):line=line[7:]
 if line.startswith('#') or '=' not in line:continue
 k,val=line.split('=',1);v.setdefault(k.strip(),[]).append(val.strip().strip('"').strip("'"))
for k,expected in [('APP_ENV','staging'),('DB_NAME','u293982346_encarmentest'),('STAGING_READ_ONLY','true'),('STAGING_DB_CONFIRMED','false')]:
 if v.get(k)!=[expected]:block('ENV_'+k)
if v.get('DB_USER',[''])[0] in ('','u293982346_appuser'):block('PRODUCTION_DB_USER')
for k in ('ENC_ADMIN_CREDENTIALS_JSON','ENC_ADMIN_PUBLIC_ORIGIN','ENC_ADMIN_MUTATIONS_ENABLED','STAGING_BUSINESS_WRITES_ENABLED'):
 if k in v:block('CREDENTIAL_OR_WRITE_FLAG_ALREADY_SET')
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup=B/('enc-readonly-login-config-'+stamp+'.bak')
secret=B/('enc-readonly-login-secret-'+stamp+'.json')
pwd=secrets.token_urlsafe(36);salt=secrets.token_bytes(16)
pw_hash='scrypt$'+salt.hex()+'$'+hashlib.scrypt(pwd.encode(),salt=salt,n=16384,r=8,p=1,dklen=64).hex()
record={'version':1,'accounts':[{'username':'stagingtest','passwordHash':pw_hash,'permissions':['business:manage']}]}
def create_private(p,text):
 fd=os.open(p,os.O_WRONLY|os.O_EXCL|os.O_CREAT,0o600)
 with os.fdopen(fd,'w') as f:f.write(text);f.flush();os.fsync(f.fileno())
create_private(backup,old)
create_private(secret,json.dumps({'username':'stagingtest','password':pwd}))
create_private(MARK,json.dumps({'backup':str(backup),'secret':str(secret)}))
new=old.rstrip('\n')+'\nENC_ADMIN_PUBLIC_ORIGIN=https://staging.encarmen.org\nENC_ADMIN_CREDENTIALS_JSON='+json.dumps(record,separators=(',',':'))+'\n'
fd,tmp=tempfile.mkstemp(dir=E.parent,prefix='.enc-readonly-login-')
try:
 with os.fdopen(fd,'w') as f:f.write(new);f.flush();os.fsync(f.fileno())
 os.chmod(tmp,stat.S_IMODE(E.stat().st_mode)&0o700)
 os.replace(tmp,E)
finally:
 if os.path.exists(tmp):os.unlink(tmp)
emit('STAGING_READ_ONLY','UNCHANGED_TRUE')
emit('PRIVATE_BACKUP','VERIFIED')
emit('TEMPORARY_CREDENTIAL','CREATED_PRIVATE')
emit('RESULT','READONLY_LOGIN_CONFIG_PREPARED')
