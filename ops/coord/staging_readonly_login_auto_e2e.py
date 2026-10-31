#!/usr/bin/env python3
"""Staging-only temporary login test, with private credential rollback in finally."""
import pathlib,os,stat,sys,time,subprocess,json,urllib.request,urllib.error,tempfile
H=pathlib.Path.home(); B=H/'encarmen-staging-backups'; S=H/'domains/staging.encarmen.org/hbuilds'
APP='https://staging.encarmen.org'; tempfiles=B/'enc-admin-smoke'
active=(S/'current/nodejs').resolve(); versionroot=(S/'versions').resolve()
def out(k,v):print(f'{k}={v}',flush=True)
def refuse(k):raise RuntimeError(k)
def api(method,p,body=None,token=None):
 headers={'Content-Type':'application/json','Origin':APP,'Cache-Control':'no-store','User-Agent':'ENCARMEN-Staging-E2E-Guard'}
 if token: headers['X-Encarmen-Admin-Token']=token
 req=urllib.request.Request(APP+p,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
 try:
  with urllib.request.urlopen(req,timeout=15) as res:code=res.status;raw=res.read(100000)
 except urllib.error.HTTPError as e:code=e.code;raw=e.read(10000)
 try:data=json.loads(raw)
 except:data={}
 return code,data
def health():
 code,d=api('GET','/api/health')
 return code,d
def restart():
 if versionroot not in active.parents or active.name!='nodejs':refuse('ACTIVE_RELEASE_PATH')
 if not (active/'server.js').is_file() or not (active/'tmp').is_dir():refuse('ENTRY_INVALID')
 p=active/'server.js'
 data=p.read_bytes(); mode=stat.S_IMODE(p.stat().st_mode)
 if b'BUSINESS_READBACK_FAILED' not in data or len(data)<10000:refuse('UNEXPECTED_SERVER_BUNDLE')
 fd,tmp=tempfile.mkstemp(dir=active,prefix='.enc-safe-reload-')
 try:
  with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
  os.chmod(tmp,mode)
  os.replace(tmp,p)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
 (active/'tmp/restart.txt').touch()
 out('STAGING_RELOAD_REQUESTED','true')
def helper(name):
 p=tempfiles/name
 r=subprocess.run([sys.executable,str(p)],capture_output=True,text=True,timeout=30)
 d=dict(line.split('=',1) for line in r.stdout.splitlines() if '=' in line)
 if r.returncode:return {'RESULT':'PROCESS_FAILED'}
 return d
if versionroot not in active.parents or active.name!='nodejs' or not B.is_dir() or B.stat().st_mode&0o077:refuse('PRECONDITION')
result='BLOCKED_NOT_STARTED'; prepared=False
try:
 c,h=health()
 if c!=200 or h.get('environment')!='staging' or h.get('database')!='mariadb' or h.get('staging',{}).get('readOnly') is not True:refuse('BASELINE_NOT_SAFE_SQL')
 out('BASELINE','STAGING_MARIADB_READONLY')
 prepared_result=helper('staging_readonly_login_prepare.py')
 if prepared_result.get('RESULT')!='READONLY_LOGIN_CONFIG_PREPARED':refuse('PREPARE_'+str(prepared_result.get('RESULT','FAILED')))
 prepared=True;out('TEST_CREDENTIALS','PRIVATE_PREPARED')
 marker=json.loads((B/'enc-staging-readonly-admin-active.json').read_text())
 secret=pathlib.Path(marker['secret'])
 if secret.parent!=B or not secret.is_file():refuse('SECRET_PATH')
 creds=json.loads(secret.read_text())
 out('LIVE_IDENTITY_RELOAD','CONFIG_FILE_ONLY_NO_NODE_RESTART')
 authenticated=False
 for n in range(5):
  try:
   c,h=health()
   if c==200 and h.get('environment')=='staging' and h.get('database')=='mariadb' and h.get('staging',{}).get('readOnly') is True:
    status,login=api('POST','/api/admin/login',creds)
    if status==200 and isinstance(login.get('token'),str):
     authenticated=True
     out('LOGIN_HTTP',200)
     token=login['token']
     session,_=api('GET','/api/admin/session',token=token);out('SESSION_HTTP',session)
     if session!=200:refuse('SESSION_INVALID')
     write,_=api('POST','/api/reports',{'reason':'readonly-test'},token=token);out('UNRELATED_WRITE_HTTP',write)
     if write!=403:refuse('WRITE_GUARD_NOT_ENFORCED')
     break
    if n in (0,4):out('LOGIN_RETRY_STATUS',status)
  except RuntimeError:raise
  except Exception:pass
  time.sleep(13)
 if not authenticated:refuse('LOGIN_NOT_AVAILABLE_AFTER_RELOAD')
 result='PASS_STAGING_ADMIN_LOGIN_SESSION_READONLY'
except Exception as ex:
 result='BLOCKED_'+str(ex).replace(' ','_')[:90]
finally:
 if prepared:
  restored=helper('staging_readonly_login_restore.py')
  out('STAGING_ENV_RESTORED',restored.get('STAGING_CONFIG_RESTORED','false'))
  out('SECRET_REVOKED',restored.get('TEMP_CREDENTIAL','UNKNOWN'))
  if restored.get('RESULT')!='READONLY_LOGIN_CONFIG_RESTORED':result='BLOCKED_RESTORE_MANUAL_ATTENTION'
  else:
   try:
    # The provider must revoke the issued token immediately when the
    # temporary credential file is restored, without an app restart.
    safe=True
    if authenticated:
     session_code,_=api('GET','/api/admin/session',token=token)
     out('REVOKED_SESSION_HTTP',session_code)
     safe=session_code==401
    code,_=api('POST','/api/admin/login',creds)
    out('REVOKED_LOGIN_HTTP',code)
    safe=safe and code==503
    out('SESSION_PROVIDER_REVOKED',str(safe).lower())
    if not safe:result='BLOCKED_RUNTIME_REVOCATION_UNCONFIRMED'
   except Exception:result='BLOCKED_REVOKE_CHECK_EXCEPTION'
 out('FINAL_RESULT',result)
