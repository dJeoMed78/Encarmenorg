#!/usr/bin/env python3
"""ENCARMEN controlled public business E2E. Preserve permanent jeo admin, fail closed."""
import os, pathlib, json, secrets, hashlib, stat, tempfile, subprocess, time, datetime, uuid, gzip, urllib.request, urllib.error
H=pathlib.Path.home(); S=H/'domains/staging.encarmen.org/hbuilds'; E=S/'config/.env'
B=H/'encarmen-staging-backups'; DB='u293982346_encarmentest'; URL='https://staging.encarmen.org'
MARK=B/'enc-staging-permanent-admin-e2e-active.json'
CODE='BLOCKED_NOT_STARTED'; prepared=False; sqlcfg=None; synth_name='ENCARMEN TEST CONTROL '+secrets.token_hex(9).upper(); created_id=None
def out(k,v):print(f'{k}={v}',flush=True)
def abort(c):raise RuntimeError(c)
def parse(t):
 d={}
 for line in t.splitlines():
  line=line.strip().removeprefix('export ').strip()
  if not line or line.startswith('#') or '=' not in line:continue
  k,v=line.split('=',1);d.setdefault(k.strip(),[]).append(v.strip().strip('"').strip("'"))
 return d
def one(d,k):return d[k][0] if len(d.get(k,[]))==1 else None
def private_write(p,t):
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as f:f.write(t);f.flush();os.fsync(f.fileno())
def atomic_restore(original,mode):
 fd,p=tempfile.mkstemp(dir=E.parent,prefix='.enc-stage-rollback-')
 try:
  with os.fdopen(fd,'w') as f:f.write(original);f.flush();os.fsync(f.fileno())
  os.chmod(p,mode&0o700);os.replace(p,E)
 finally:
  if os.path.exists(p):os.unlink(p)
def http(method,path,data=None,token=None,extra=None):
 h={'Origin':URL,'Content-Type':'application/json','Cache-Control':'no-store','User-Agent':'ENCARMEN-Staging-Permanent-Admin-E2E/1.0'}
 if token:h['X-Encarmen-Admin-Token']=token
 if extra:h.update(extra)
 req=urllib.request.Request(URL+path,data=json.dumps(data).encode() if data is not None else None,method=method,headers=h)
 try:
  with urllib.request.urlopen(req,timeout=12) as r:code=r.status;raw=r.read(500000)
 except urllib.error.HTTPError as e:code=e.code;raw=e.read(50000)
 except Exception:return 0,{}
 try:return code,json.loads(raw)
 except:return code,{}
def sql(query):
 r=subprocess.run(['mariadb','--defaults-extra-file='+str(sqlcfg),'-D',DB,'--batch','--skip-column-names','-e',query],capture_output=True,text=True,timeout=25)
 if r.returncode:abort('SQL_QUERY_FAILURE')
 return r.stdout.strip().splitlines()
def lit(s):return 'CONVERT(0x'+str(s).encode('utf8').hex()+' USING utf8mb4)'
try:
 out('UTC',datetime.datetime.now(datetime.timezone.utc).isoformat())
 if not E.is_file() or E.is_symlink() or not B.is_dir() or B.is_symlink() or B.stat().st_mode&0o077:abort('PATH_OR_PERMISSIONS')
 if MARK.exists():abort('PREVIOUS_WINDOW_ACTIVE')
 old=E.read_text();mode=stat.S_IMODE(E.stat().st_mode);env=parse(old)
 for k,v in [('APP_ENV','staging'),('DB_NAME',DB),('STAGING_READ_ONLY','true'),('STAGING_DB_CONFIRMED','false'),('ENC_ADMIN_PUBLIC_ORIGIN',URL)]:
  if one(env,k)!=v:abort('BASELINE_'+k)
 if one(env,'DB_USER') in (None,'','u293982346_appuser') or not one(env,'DB_PASSWORD'):abort('DB_ISOLATION')
 if any(k in env for k in ('STAGING_BUSINESS_WRITES_ENABLED','ENC_ADMIN_MUTATIONS_ENABLED')):abort('WRITE_FLAGS_ALREADY_PRESENT')
 record=json.loads(one(env,'ENC_ADMIN_CREDENTIALS_JSON') or '{}')
 if record.get('version')!=1 or not isinstance(record.get('accounts'),list):abort('ADMIN_CONFIG_INVALID')
 if len(record['accounts'])!=1 or record['accounts'][0].get('username','').lower()!='jeo':abort('PERMANENT_ADMIN_NOT_UNIQUE')
 if not (B/'database').is_dir() or not any(p.is_file() and p.stat().st_size>0 for p in (B/'database').glob('staging-db-*.sql.gz')):abort('SQL_BACKUP_MISSING')
 baseline=False
 for attempt in range(24):
  status,health=http('GET','/api/health')
  if status==200 and health.get('environment')=='staging' and health.get('database')=='mariadb' and health.get('staging',{}).get('readOnly') is True:
   baseline=True;break
  if attempt in (0,12,23):out('BASELINE_RETRY_HTTP',status)
  time.sleep(5)
 if not baseline:abort('PUBLIC_BASELINE_UNSAFE')
 out('PUBLIC_BASELINE','STAGING_MARIADB_READONLY')
 fd,p=tempfile.mkstemp(dir=B,prefix='.enc-staging-test-sql-',suffix='.cnf');sqlcfg=pathlib.Path(p)
 os.fchmod(fd,0o600)
 with os.fdopen(fd,'w') as f:
  f.write('[client]\n')
  for key,envkey in [('host','DB_HOST'),('user','DB_USER'),('password','DB_PASSWORD')]:
   v=one(env,envkey) or '';f.write(key+'="'+v.replace('\\','\\\\').replace('"','\\"')+'"\n')
 if sql('SELECT DATABASE()')!=[DB] or sql('SELECT env_name,db_name FROM encarmen_environment_marker')!=['staging\t'+DB]:abort('SQL_MARKER')
 if 'u293982346_encarmenapp' in sql('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA'):abort('PRODUCTION_SCHEMA_VISIBLE')
 out('SQL_ISOLATION','VERIFIED')
 # Snapshot the exact existing admin configuration without changing its jeo hash.
 stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
 backup=B/('enc-perm-admin-before-e2e-'+stamp+'.bak')
 secret=B/('enc-perm-admin-e2e-login-'+stamp+'.json')
 private_write(backup,old)
 pwd=secrets.token_urlsafe(36);salt=secrets.token_bytes(16)
 ph='scrypt$'+salt.hex()+'$'+hashlib.scrypt(pwd.encode(),salt=salt,n=16384,r=8,p=1,dklen=64).hex()
 test_account={'username':'enc_e2e_temp','passwordHash':ph,'permissions':['business:manage']}
 newrecord={'version':1,'accounts':[record['accounts'][0],test_account]}
 private_write(secret,json.dumps({'username':'enc_e2e_temp','password':pwd}))
 private_write(MARK,json.dumps({'backup':str(backup),'secret':str(secret),'created':stamp,'synthetic_name':synth_name}))
 modified=old.rstrip('\n')+'\nSTAGING_BUSINESS_WRITES_ENABLED=true\nENC_ADMIN_MUTATIONS_ENABLED=true\n'
 modified=modified.replace('STAGING_READ_ONLY=true','STAGING_READ_ONLY=false').replace('STAGING_DB_CONFIRMED=false','STAGING_DB_CONFIRMED=true')
 oldkey='ENC_ADMIN_CREDENTIALS_JSON='
 modified='\n'.join(oldkey+json.dumps(newrecord,separators=(',',':')) if line.startswith(oldkey) else line for line in modified.splitlines())+'\n'
 atomic_restore(modified,mode)
 prepared=True
 out('SAFE_TEST_WINDOW','PREPARED_PERMANENT_JEO_PRESERVED')
 out('DYNAMIC_STAGING_CONFIG_EXPECTED','true')
 # Wait for human Hostinger restart. Window is bounded; the file is always restored in finally.
 token=None
 for i in range(12):
  status,login=http('POST','/api/admin/login',{'username':'enc_e2e_temp','password':pwd})
  if status==200 and isinstance(login.get('token'),str):
   token=login['token'];break
  if status not in (0,401,429,503):out('LOGIN_UNEXPECTED_HTTP',status)
  time.sleep(5)
 if not token:abort('HOSTINGER_RESTART_OR_LOGIN_NOT_APPLIED')
 out('TEMP_LOGIN_HTTP',200)
 status,session=http('GET','/api/admin/session',token=token)
 if status!=200:abort('TEMP_SESSION_INVALID')
 out('TEMP_SESSION_HTTP',status)
 # A separate unrelated administrative mutation must stay blocked.
 status,_=http('POST','/api/reports',{'reason':'staging synthetic'},token=token)
 if status!=403:abort('UNRELATED_WRITE_NOT_BLOCKED')
 out('UNRELATED_WRITE_HTTP',status)
 status,detail=http('GET','/api/database-status',token=token)
 out('GATE_DIAGNOSTIC_HTTP',status)
 if status==200:
  bw=detail.get('businessWrites') or {};md=detail.get('mariadb') or {};st=detail.get('stagingIsolation') or {}
  out('GATE_RUNTIME_BIZ_PERMITTED',str(bw.get('permitted')).lower())
  out('GATE_RUNTIME_BIZ_CONFIGURED_PROCESS',str(bw.get('configured')).lower())
  out('GATE_RUNTIME_MARIADB_CONNECTED',str(md.get('connected')).lower())
  out('GATE_RUNTIME_ISOLATION_VALID',str(st.get('isolationValid')).lower())
  out('GATE_RUNTIME_DB_STAGING',str(st.get('databaseName')=='u293982346_encarmentest').lower())
  out('GATE_RUNTIME_DB_ERROR_PRESENT',str(bool(md.get('lastError'))).lower())
 # Wait for Hostinger hPanel restart. Invalid payload must return 400 only when
 # actual admin session and staging business write lane are ready; no SQL writes.
 ready=False
 for attempt in range(8):
  probe,_=http('POST','/api/submit-business',{'name':'A'},token=token)
  if probe==503:
   out('GATE_503_KIND','ADMIN_WRITE_GATE' if _.get('message')=='Operación bloqueada hasta habilitar administración segura.' else 'OTHER_503')
  if probe==400:
   ready=True;out('WRITE_WINDOW_VALIDATION_HTTP',400);break
  if probe==401:
   login_code,login=http('POST','/api/admin/login',{'username':'enc_e2e_temp','password':pwd})
   if login_code==200 and isinstance(login.get('token'),str):token=login['token']
  if attempt in (0,4,8,11):out('WRITE_WINDOW_WAIT_HTTP',probe)
  time.sleep(5)
 if not ready:abort('HOSTINGER_WRITE_WINDOW_RESTART_NOT_CONFIRMED')
 phone='9999'+str(secrets.randbelow(1000000)).zfill(6)
 body={'name':synth_name,'category':'Servicios','description':'Prueba temporal inicial de ENCARMEN','phone':phone,'whatsapp':phone}
 request_id=str(uuid.uuid4())
 status,result=http('POST','/api/submit-business',body,token=token,extra={'Idempotency-Key':request_id})
 out('CREATE_HTTP',status)
 if status!=201 or not result.get('success'):abort('CREATE_FAILED')
 created_id=str(result.get('business',{}).get('id',''))
 if not created_id.isdigit():abort('CREATE_ID_UNEXPECTED')
 status,edited=http('PATCH','/api/businesses/'+created_id,{'description':'Prueba temporal editada de ENCARMEN'},token=token)
 out('EDIT_HTTP',status)
 if status!=200 or not edited.get('success'):abort('EDIT_FAILED')
 rows=sql('SELECT HEX(name),HEX(description) FROM businesses WHERE id='+created_id)
 fields=rows[0].split('\t') if len(rows)==1 else []
 if len(fields)!=2 or bytes.fromhex(fields[0]).decode()!=synth_name or bytes.fromhex(fields[1]).decode()!='Prueba temporal editada de ENCARMEN':abort('SQL_READBACK_MISMATCH')
 out('SQL_READBACK','VERIFIED')
 status,live=http('GET','/api/businesses/'+created_id)
 if status!=200 or not live.get('success') or live.get('business',{}).get('description')!='Prueba temporal editada de ENCARMEN':abort('PUBLIC_READBACK_MISMATCH')
 out('PUBLIC_READBACK','VERIFIED')
 CODE='PASS_PUBLIC_CREATE_EDIT_SQL'
except Exception as ex:
 CODE='BLOCKED_'+str(ex).replace(' ','_')[:100]
finally:
 if sqlcfg is not None:
  try:
   matches=sql('SELECT id FROM businesses WHERE BINARY name=BINARY '+lit(synth_name)+' LIMIT 2')
   if len(matches)>1:abort('MULTIPLE_TEST_RECORDS')
   if matches:
    if not matches[0].isdigit():abort('CLEANUP_ID_NOT_NUMERIC')
    sql('DELETE FROM businesses WHERE id='+matches[0]+' AND BINARY name=BINARY '+lit(synth_name))
    if sql('SELECT COUNT(*) FROM businesses WHERE id='+matches[0])!=['0']:abort('CLEANUP_NOT_CONFIRMED')
    out('SYNTHETIC_CLEANUP','VERIFIED')
   else:out('SYNTHETIC_CLEANUP','NOT_NEEDED')
  except Exception:CODE='BLOCKED_CLEANUP_REQUIRES_REVIEW';out('SYNTHETIC_CLEANUP','FAILED')
 if prepared:
  try:
   atomic_restore(old,mode)
   if E.read_text()!=old:abort('RESTORE_BYTES_DIFFER')
   out('PRIVATE_CONFIG_RESTORED','VERIFIED')
   if secret.is_file():secret.unlink()
   if MARK.is_file() and CODE != 'BLOCKED_CLEANUP_REQUIRES_REVIEW':MARK.unlink()
   status,_=http('POST','/api/submit-business',{'name':'DENIED AFTER RESTORE'},token=token if 'token' in locals() else None)
   out('POST_RESTORE_WRITE_HTTP',status)
   if status not in (401,403,503):CODE='BLOCKED_POST_RESTORE_WRITE_GATE'
  except Exception:CODE='BLOCKED_CONFIG_RESTORE_MANUAL_ATTENTION'
 if sqlcfg is not None and sqlcfg.exists():sqlcfg.unlink()
 out('FINAL_RESULT',CODE)
