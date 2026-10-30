#!/usr/bin/env python3
"""Staging public HTTP: write synthetic business, read from SQL, edit and clean up.
Never print credentials, personal data, or raw response bodies."""
import pathlib,os,json,re,secrets,uuid,urllib.request,urllib.error,subprocess,tempfile,sys,datetime
H=pathlib.Path.home();B=H/'encarmen-staging-backups';E=H/'domains/staging.encarmen.org/hbuilds/config/.env'
M=B/'enc-staging-business-window-active.json';DB='u293982346_encarmentest'
cnf=None;test_id=None;test_name=None;results={}
def out(k,v):print(f'{k}={v}',flush=True)
def stop(reason):out('RESULT','BLOCKED_'+reason);sys.exit(0)
def sql(command):
 r=subprocess.run(['mariadb','--defaults-extra-file='+str(cnf),'-D',DB,'--batch','--skip-column-names','-e',command],capture_output=True,text=True,timeout=30)
 if r.returncode:raise RuntimeError('SQL_FAILED')
 return r.stdout.strip().splitlines()
def literal(s):return 'CONVERT(0x'+str(s).encode().hex()+' USING utf8mb4)'
opener=urllib.request.build_opener()
def http(method,path,body=None,token=None,key=None):
 headers={'Origin':'https://staging.encarmen.org','Content-Type':'application/json','Cache-Control':'no-store','User-Agent':'ENCARMEN-Staging-E2E'}
 if token:headers['X-Encarmen-Admin-Token']=token
 if key:headers['Idempotency-Key']=key
 req=urllib.request.Request('https://staging.encarmen.org'+path,headers=headers,method=method,data=json.dumps(body).encode() if body is not None else None)
 try:
  with opener.open(req,timeout=22) as res:return res.status,json.loads(res.read(2500000))
 except urllib.error.HTTPError as err:
  try:return err.code,json.loads(err.read(4000))
  except Exception:return err.code,{}
try:
 if not E.is_file() or E.is_symlink() or not M.is_file() or M.is_symlink():stop('STAGING_FILES')
 data=json.loads(M.read_text())
 secret=pathlib.Path(data.get('secret',''))
 if secret.parent!=B or not secret.is_file() or secret.is_symlink():stop('PRIVATE_CREDENTIAL_FILE')
 credentials=json.loads(secret.read_text())
 env={}
 for line in E.read_text().splitlines():
  if '=' in line and not line.lstrip().startswith('#'):
   k,v=line.split('=',1);env[k.strip()]=v.strip().strip('"').strip("'")
 if any(env.get(k)!=v for k,v in {'APP_ENV':'staging','DB_NAME':DB,'STAGING_READ_ONLY':'false','STAGING_DB_CONFIRMED':'true','STAGING_BUSINESS_WRITES_ENABLED':'true','ENC_ADMIN_MUTATIONS_ENABLED':'true','ENC_ADMIN_PUBLIC_ORIGIN':'https://staging.encarmen.org'}.items()):stop('TEST_WINDOW_FLAGS')
 if env.get('DB_USER') in (None,'u293982346_appuser') or not env.get('DB_PASSWORD'):stop('SQL_CONFIG')
 fd,tmp=tempfile.mkstemp(dir=B,prefix='.enc-e2e-cnf-')
 cnf=pathlib.Path(tmp);os.fchmod(fd,0o600)
 with os.fdopen(fd,'w') as f:
  f.write('[client]\n')
  for k,n in [('host','DB_HOST'),('port','DB_PORT'),('user','DB_USER'),('password','DB_PASSWORD')]:
   v=env.get(n,'3306' if k=='port' else '')
   f.write(k+'="'+v.replace('\\','\\\\').replace('"','\\"')+'"\n')
 identity=sql('SELECT DATABASE(),SUBSTRING_INDEX(CURRENT_USER(),CHAR(64),1)')
 if len(identity)!=1 or identity[0].split('\t')[0]!=DB or identity[0].split('\t')[1]=='u293982346_appuser':stop('DB_IDENTITY')
 if sql('SELECT env_name,db_name FROM encarmen_environment_marker')!=['staging\t'+DB]:stop('MARKER')
 if 'u293982346_encarmenapp' in sql('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA'):stop('PRODUCTION_VISIBLE')
 out('DB_IDENTITY','STAGING_ONLY_VERIFIED')
 status,health=http('GET','/api/health')
 out('HEALTH_HTTP',status)
 out('RUNTIME_ENV_IS_STAGING',str(health.get('environment')=='staging').lower())
 out('GENERAL_WRITES_BLOCKED',str(health.get('staging',{}).get('readOnly') is True).lower())
 out('GENERAL_WRITES_PERMITTED',str(health.get('staging',{}).get('writesPermitted') is True).lower())
 if status!=200 or health.get('environment')!='staging' or health.get('staging',{}).get('readOnly') is not True:stop('RUNTIME_FLAGS_NOT_ACTIVE')
 status,auth=http('POST','/api/admin/login',credentials)
 out('ADMIN_LOGIN_HTTP',status)
 token=auth.get('token') if isinstance(auth,dict) else None
 if status!=200 or not isinstance(token,str) or not re.fullmatch('[a-f0-9]{64}',token):stop('ADMIN_LOGIN_FAILED')
 status,_=http('POST','/api/reports',{'message':'staging gate'},token)
 out('UNRELATED_REPORT_POST_HTTP',status)
 if status!=403:stop('UNRELATED_WRITE_NOT_BLOCKED')
 rnd=secrets.token_hex(6);test_name='ENCARMEN E2E TEST '+rnd
 number='999'+str(secrets.randbelow(10000000)).zfill(7)
 registration={'name':test_name,'category':'Servicios','description':'Staging temporary created','phone':number}
 status,created=http('POST','/api/submit-business',registration,token,str(uuid.uuid4()))
 out('BUSINESS_CREATE_HTTP',status)
 if isinstance(created,dict):
  business=created.get('business') or {}
  val=str(business.get('id',''))
  if val.isdigit():test_id=val
 if status!=201 or not test_id or not created.get('success'):stop('CREATE_HTTP_FAILED')
 data=sql('SELECT HEX(name),HEX(description) FROM businesses WHERE id='+literal(test_id))
 if len(data)!=1 or bytes.fromhex(data[0].split('\t')[0]).decode()!=test_name:stop('CREATE_SQL_READBACK')
 out('CREATE_MARIADB_READBACK','PASS')
 status,updated=http('PATCH','/api/businesses/'+test_id,{'description':'Staging temporary edited'},token)
 out('BUSINESS_EDIT_HTTP',status)
 if status!=200 or not updated.get('success'):stop('EDIT_HTTP_FAILED')
 rows=sql('SELECT HEX(description) FROM businesses WHERE id='+literal(test_id))
 if len(rows)!=1 or bytes.fromhex(rows[0]).decode()!='Staging temporary edited':stop('EDIT_SQL_READBACK')
 out('EDIT_MARIADB_READBACK','PASS')
 status,listing=http('GET','/api/businesses')
 records=listing if isinstance(listing,list) else listing.get('businesses',[]) if isinstance(listing,dict) else []
 seen=any(str(x.get('id'))==test_id and x.get('description')=='Staging temporary edited' for x in records if isinstance(x,dict))
 out('READBACK_HTTP',status)
 out('EDIT_PUBLIC_API_READBACK',str(seen).lower())
 if status!=200 or not seen:stop('PUBLIC_GET_READBACK')
 out('RESULT','PASS_FULL_HTTP_CREATE_EDIT_AND_SQL_READBACK')
except Exception as ex:
 out('RESULT','FAILED_'+type(ex).__name__)
finally:
 if test_id and test_name and cnf and cnf.exists():
  try:
   identity=sql('SELECT DATABASE()')
   if identity==[DB]:
    key=literal(test_id);name=literal(test_name)
    count=sql('SELECT COUNT(*) FROM businesses WHERE id='+key+' AND BINARY name=BINARY '+name)
    if count==['1']:
     sql('DELETE FROM businesses WHERE id='+key+' AND BINARY name=BINARY '+name)
     out('SYNTHETIC_CLEANUP','VERIFIED' if sql('SELECT COUNT(*) FROM businesses WHERE id='+key)==['0'] else 'FAILED')
    else:out('SYNTHETIC_CLEANUP','NOT_SAFE_TO_DELETE')
  except Exception:out('SYNTHETIC_CLEANUP','FAILED_REVIEW_REQUIRED')
 if cnf and cnf.exists():cnf.unlink()
