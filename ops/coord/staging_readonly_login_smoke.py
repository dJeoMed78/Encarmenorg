#!/usr/bin/env python3
"""Public read-only login smoke, then guaranteed private config restore."""
import pathlib,json,urllib.request,urllib.error,datetime,subprocess,sys
H=pathlib.Path.home(); B=H/'encarmen-staging-backups'; M=B/'enc-staging-readonly-admin-active.json'
base='https://staging.encarmen.org';result='BLOCKED_UNEXECUTED';authenticated=False
def out(k,v):print(f'{k}={v}',flush=True)
def request(method,path,body=None,token=None):
 headers={'Origin':base,'Content-Type':'application/json','Cache-Control':'no-store','User-Agent':'ENCARMEN-ReadOnly-Login-Smoke/1.0'}
 if token:headers['X-Encarmen-Admin-Token']=token
 req=urllib.request.Request(base+path,method=method,data=json.dumps(body).encode() if body is not None else None,headers=headers)
 try:
  with urllib.request.urlopen(req,timeout=18) as r:status=r.status;raw=r.read(100000)
 except urllib.error.HTTPError as e:status=e.code;raw=e.read(100000)
 try:data=json.loads(raw)
 except:data={}
 return status,data
try:
 out('UTC',datetime.datetime.now(datetime.timezone.utc).isoformat())
 if not M.is_file() or M.is_symlink():raise RuntimeError('MARKER_MISSING')
 marker=json.loads(M.read_text());secret=pathlib.Path(marker['secret'])
 if secret.parent!=B or not secret.is_file() or secret.is_symlink():raise RuntimeError('SECRET_PATH')
 creds=json.loads(secret.read_text())
 status,health=request('GET','/api/health')
 out('PUBLIC_HEALTH_HTTP',status)
 if status!=200 or health.get('environment')!='staging' or health.get('database')!='mariadb' or health.get('staging',{}).get('readOnly') is not True:raise RuntimeError('PUBLIC_HEALTH_NOT_SAFE')
 out('PUBLIC_READONLY', 'true')
 status,login=request('POST','/api/admin/login',creds)
 out('LOGIN_HTTP',status)
 out('LOGIN_ERROR_CLASS',str(login.get('error') or login.get('message') or 'none').replace(' ','_')[:80])
 token=login.get('token')
 if status!=200 or not isinstance(token,str) or not token:raise RuntimeError('LOGIN_NOT_ESTABLISHED')
 authenticated=True
 out('LOGIN_AUTHENTICATED','true')
 status,session=request('GET','/api/admin/session',token=token)
 out('SESSION_HTTP',status)
 if status!=200:raise RuntimeError('SESSION_INVALID')
 status,blocked=request('POST','/api/reports',{'reason':'smoke-readonly'},token)
 out('UNRELATED_WRITE_HTTP',status)
 if status!=403:raise RuntimeError('UNRELATED_WRITES_NOT_BLOCKED')
 result='PASS_LOGIN_SESSION_READONLY'
except Exception as e:
 result='BLOCKED_'+str(e).replace(' ','_')[:100]
finally:
 helper=pathlib.Path(__file__).parent/'staging_readonly_login_restore.py'
 try:
  p=subprocess.run([sys.executable,str(helper)],capture_output=True,text=True,timeout=30)
  summary=dict(line.split('=',1) for line in p.stdout.splitlines() if '=' in line)
  out('STAGING_CONFIG_RESTORED',summary.get('STAGING_CONFIG_RESTORED','false'))
  out('TEMP_CREDENTIAL',summary.get('TEMP_CREDENTIAL','UNKNOWN'))
  if p.returncode!=0 or summary.get('RESULT')!='READONLY_LOGIN_CONFIG_RESTORED':result='BLOCKED_RESTORE_MANUAL_ATTENTION'
 except Exception:
  result='BLOCKED_RESTORE_MANUAL_ATTENTION'
 out('FINAL_RESULT',result)
 out('RESTART_REQUIRED_FOR_SESSION_REVOCATION','true' if authenticated else 'recommended')
