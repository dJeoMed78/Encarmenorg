#!/usr/bin/env python3
"""One-time public HTTP write verification: staging only, reversible, no production."""
import os,sys,pathlib,subprocess,tempfile,json,secrets,datetime,time,urllib.request,urllib.error,shutil,gzip
H=pathlib.Path.home()
S=H/'domains/staging.encarmen.org/hbuilds'
E=S/'config/.env'
B=H/'encarmen-staging-backups'
DB='u293982346_encarmentest'
PROD='u293982346_encarmenapp'
WEB='https://staging.encarmen.org'
CODE='NOT_STARTED'
cnf=None
changed=False
record=None
name='ENCARMEN CONTROL PUBLICO '+secrets.token_hex(9).upper()
phone='9999'+str(secrets.randbelow(1000000)).zfill(6)
def out(key,value):print(str(key)+'='+str(value),flush=True)
def abort(code):raise RuntimeError(code)
def parse(text):
 result={}
 for line in text.splitlines():
  line=line.strip()
  if line.startswith('export '):line=line[7:]
  if '=' in line and not line.startswith('#'):
   k,v=line.split('=',1);result.setdefault(k.strip(),[]).append(v.strip().strip('"').strip("'"))
 return result
def exact(env,key,value):return len(env.get(key,[]))==1 and env[key][0]==value
def sql_literal(value):return 'CONVERT(0x'+str(value).encode().hex()+' USING utf8mb4)'
def sql(query):
 if cnf is None:abort('SQL_CONNECTION_NOT_READY')
 proc=subprocess.run(['mariadb','--defaults-extra-file='+str(cnf),'-D',DB,'--batch','--skip-column-names','-e',query],capture_output=True,text=True,timeout=35)
 if proc.returncode:abort('SQL_ERROR')
 return proc.stdout.strip().splitlines()
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):return None
http_client=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
def http(method,path,body=None,headers=None):
 req=urllib.request.Request(WEB+path,data=json.dumps(body).encode() if body is not None else None,method=method,headers={'Origin':WEB,'Content-Type':'application/json','Cache-Control':'no-store','User-Agent':'ENCARMEN-Staging-Controlled-E2E/1.0',**(headers or {})})
 try:
  with http_client.open(req,timeout=17) as resp:status=resp.status;raw=resp.read(1000000)
 except urllib.error.HTTPError as e:status=e.code;raw=e.read(10000)
 except Exception as e:abort('PUBLIC_HTTP_TRANSPORT_'+type(e).__name__)
 try:return status,json.loads(raw)
 except Exception:return status,{}
def health():
 status,data=http('GET','/api/health')
 if status!=200 or data.get('environment')!='staging' or data.get('database')!='mariadb':abort('PUBLIC_HEALTH_NOT_STAGING_MARIADB')
 return data
def wait_health(deadline=65):
 last=None
 for n in range(16):
  try:
   x=health();return x
  except Exception as e:last=type(e).__name__
  time.sleep(4)
 abort('PUBLIC_HEALTH_AFTER_RESTART_UNAVAILABLE')
def restart():
 active=(S/'current/nodejs').resolve()
 if (S/'versions').resolve() not in active.parents:abort('ACTIVE_STAGING_RELEASE_PATH')
 target=active/'tmp/restart.txt'
 if not target.parent.is_dir() or target.is_symlink():abort('STAGING_RESTART_PATH')
 target.touch()
 out('STAGING_RESTART_TRIGGER','SENT')
def run_script(fname):
 file=pathlib.Path(__file__).parent/fname
 if not file.is_file():abort('MISSING_RESTORE_HELPER')
 r=subprocess.run([sys.executable,str(file)],capture_output=True,text=True,timeout=35)
 summary={k:v for k,v in (line.split('=',1) for line in r.stdout.splitlines() if '=' in line)}
 if r.returncode!=0:abort('HELPER_PROCESS_FAILED')
 return summary
def cleanup():
 matches=sql('SELECT id FROM businesses WHERE BINARY name=BINARY '+sql_literal(name)+' LIMIT 3')
 if not matches:
  out('SYNTHETIC_CLEANUP','NOT_NEEDED');return
 if len(matches)!=1 or not matches[0].isdigit():abort('CLEANUP_IDENTITY_AMBIGUOUS')
 key=matches[0]
 sql('DELETE FROM businesses WHERE id='+key+' AND BINARY name=BINARY '+sql_literal(name))
 remain=sql('SELECT COUNT(*) FROM businesses WHERE id='+key)
 if remain!=['0']:abort('CLEANUP_READBACK_FAILED')
 out('SYNTHETIC_CLEANUP','VERIFIED')
try:
 out('ENCARMEN_PUBLIC_STAGING_E2E','BEGIN')
 out('UTC',datetime.datetime.now(datetime.timezone.utc).isoformat())
 if not E.is_file() or E.is_symlink() or not B.is_dir() or B.is_symlink():abort('STAGING_SAFE_PATHS')
 old=E.read_text(encoding='utf8')
 env=parse(old)
 if not (exact(env,'APP_ENV','staging') and exact(env,'DB_NAME',DB) and exact(env,'STAGING_READ_ONLY','true') and exact(env,'STAGING_DB_CONFIRMED','false')):abort('STAGING_GUARD_NOT_IN_BASELINE')
 if env.get('DB_USER',[''])[0] in ('u293982346_appuser',''):abort('PRODUCTION_OR_EMPTY_DB_USER')
 if not (B/'database').is_dir():abort('DB_BACKUP_DIR_MISSING')
 dumps=[f for f in (B/'database').glob('staging-db-*.sql.gz') if f.is_file() and f.stat().st_size>0]
 if not dumps:abort('DB_BACKUP_UNAVAILABLE')
 with gzip.open(max(dumps,key=lambda p:p.stat().st_mtime),'rb') as f:
  if not f.read(512):abort('DB_BACKUP_UNREADABLE')
 out('DB_BACKUP_READABLE','true')
 fd,p=tempfile.mkstemp(dir=B,prefix='.enc-public-e2e-',suffix='.cnf')
 cnf=pathlib.Path(p)
 os.fchmod(fd,0o600)
 with os.fdopen(fd,'w') as stream:
  stream.write('[client]\n')
  for key,k in (('host','DB_HOST'),('user','DB_USER'),('password','DB_PASSWORD')):
   v=env.get(k,[''])[0]
   stream.write(key+'="'+v.replace('\\','\\\\').replace('"','\\"')+'"\n')
 ident=sql('SELECT DATABASE(),SUBSTRING_INDEX(CURRENT_USER(),CHAR(64),1)')
 if len(ident)!=1 or not ident[0].startswith(DB+'\t') or 'u293982346_appuser' in ident[0]:abort('SQL_IDENTITY')
 if sql('SELECT env_name,db_name FROM encarmen_environment_marker')!=['staging\t'+DB]:abort('STAGING_SQL_MARKER')
 if PROD in sql('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA'):abort('PRODUCTION_SCHEMA_VISIBLE')
 out('SQL_STAGING_ISOLATED','true')
 if not health().get('staging',{}).get('readOnly'):abort('PUBLIC_BASELINE_NOT_READONLY')
 active=(S/'current/nodejs').resolve()
 if (S/'versions').resolve() not in active.parents or not (active/'tmp').is_dir():abort('STAGING_RESTART_PRECONDITION')
 if (B/'enc-staging-business-window-active.json').exists():abort('ACTIVE_WINDOW_EXISTS')
 enabled=run_script('staging_business_window_enable.py')
 if enabled.get('RESULT')!='READY_FOR_STAGING_ONLY_RESTART':abort('ENABLE_'+enabled.get('RESULT','UNKNOWN'))
 changed=True
 out('WINDOW','ENABLED_CONFIG_BACKED_UP')
 restart()
 wait_health()
 marker=json.loads((B/'enc-staging-business-window-active.json').read_text())
 credential_path=pathlib.Path(marker['secret'])
 if credential_path.parent!=B or not credential_path.is_file():abort('CREDENTIAL_FILE_UNVERIFIED')
 credentials=json.loads(credential_path.read_text())
 token=None
 for attempt in range(4):
  try:
   status,login=http('POST','/api/admin/login',{'username':credentials['username'],'password':credentials['password']})
   if attempt==0:
    out('PUBLIC_ADMIN_LOGIN_FIRST_STATUS',status)
    out('PUBLIC_ADMIN_LOGIN_FIRST_ERROR',str(login.get('error') or login.get('message') or 'none').replace(' ','_')[:80])
   if status==200 and isinstance(login.get('token'),str):token=login['token'];break
   if status in (400,401,403,429,503):abort('PUBLIC_ADMIN_LOGIN_STATUS_'+str(status))
  except RuntimeError:raise
  except Exception as ex:
   if attempt==0:out('PUBLIC_ADMIN_TRANSPORT_CLASS',type(ex).__name__)
  time.sleep(3)
 if not token:abort('PUBLIC_ADMIN_LOGIN_UNAVAILABLE')
 out('PUBLIC_ADMIN_LOGIN_HTTP',200)
 auth={'X-Encarmen-Admin-Token':token}
 status,blocked=http('POST','/api/reports',{'reason':'synthetic'},auth)
 out('UNRELATED_WRITE_HTTP',status)
 if status!=403:abort('UNRELATED_WRITE_NOT_BLOCKED')
 data={'name':name,'category':'Servicios','description':'Before controlled public staging edit','phone':phone,'whatsapp':phone}
 status,created=http('POST','/api/submit-business',data,{**auth,'Idempotency-Key':secrets.token_hex(20)})
 out('CREATE_HTTP',status)
 if status!=201 or not created.get('success'):abort('PUBLIC_CREATE_UNCONFIRMED')
 record=str(created.get('business',{}).get('id',''))
 if not record.isdigit():abort('CREATED_ID_UNVERIFIED')
 status,edited=http('PATCH','/api/businesses/'+record,{'description':'After controlled public staging edit'},auth)
 out('EDIT_HTTP',status)
 if status!=200 or not edited.get('success'):abort('PUBLIC_EDIT_UNCONFIRMED')
 rows=sql('SELECT HEX(name),HEX(description) FROM businesses WHERE id='+record)
 if len(rows)!=1:abort('SQL_READBACK_MISSING')
 fields=rows[0].split('\t')
 if len(fields)!=2 or bytes.fromhex(fields[0]).decode()!=name or bytes.fromhex(fields[1]).decode()!='After controlled public staging edit':abort('SQL_READBACK_MISMATCH')
 out('SQL_READBACK','PASS')
 status,listing=http('GET','/api/businesses?hasWhatsapp=true')
 found=(listing if isinstance(listing,list) else listing.get('businesses',[])) if isinstance(listing,(list,dict)) else []
 if status!=200 or not isinstance(found,list) or not any(str(v.get('id'))==record and v.get('description')=='After controlled public staging edit' for v in found if isinstance(v,dict)):abort('PUBLIC_GET_READBACK_UNCONFIRMED')
 out('PUBLIC_GET_READBACK','PASS')
 CODE='PASS_PUBLIC_HTTP_CREATE_EDIT_SQL_GET'
except Exception as ex:
 if CODE!='PASS_PUBLIC_HTTP_CREATE_EDIT_SQL_GET':CODE='BLOCKED_'+str(ex).replace(' ','_')[:110]
finally:
 if cnf is not None:
  try:cleanup()
  except Exception as ex:
   out('SYNTHETIC_CLEANUP','FAILED_REQUIRES_REVIEW')
   CODE='BLOCKED_CLEANUP_REQUIRES_REVIEW'
 if changed:
  try:
   restore=run_script('staging_business_window_restore.py')
   out('STAGING_CONFIG_RESTORED',restore.get('STAGING_ENV_RESTORED','false'))
   if restore.get('RESULT')!='RESTORED_READONLY_CONFIG':abort('RESTORE_FAILED')
   restart()
   stable=False
   for n in range(16):
    try:
     fresh=health()
     status,session=http('GET','/api/admin/session')
     if fresh.get('staging',{}).get('readOnly') and status==401:stable=True;break
    except Exception:pass
    time.sleep(4)
   out('PUBLIC_READONLY_RESTORED',str(stable).lower())
   if not stable:CODE='BLOCKED_PUBLIC_READONLY_RECHECK'
  except Exception as ex:
   out('RESTORE_FAILURE_CLASS',type(ex).__name__)
   CODE='BLOCKED_STAGING_RESTORE_REQUIRES_MANUAL_REVIEW'
 if cnf is not None and cnf.exists():cnf.unlink()
 out('FINAL_RESULT',CODE)
