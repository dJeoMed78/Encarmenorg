#!/usr/bin/env python3
import pathlib,sys,os,tempfile,subprocess,datetime
home=pathlib.Path.home();env=home/'domains/staging.encarmen.org/hbuilds/config/.env';backup=home/'encarmen-staging-backups'
DB='u293982346_encarmentest'
def end(value):print('RESULT='+value,flush=True);sys.exit(0)
if not env.is_file() or env.is_symlink() or not backup.is_dir() or backup.is_symlink():end('BLOCKED_PATH')
values={}
for line in env.read_text().splitlines():
 line=line.strip()
 if not line or line.startswith('#') or '=' not in line:continue
 k,v=line.split('=',1);values[k.strip()]=v.strip().strip('"').strip("'")
if values.get('APP_ENV')!='staging' or values.get('DB_NAME')!=DB or values.get('DB_USER')=='u293982346_appuser':end('BLOCKED_DB_IDENTITY')
if values.get('STAGING_READ_ONLY')!='true':end('BLOCKED_RUNTIME_NOT_READONLY')
if not values.get('DB_PASSWORD') or not values.get('DB_HOST'):end('BLOCKED_CONFIG')
fd,tmp=tempfile.mkstemp(prefix='.enc-transient-probe-',dir=backup)
try:
 os.fchmod(fd,0o600)
 with os.fdopen(fd,'w') as stream:
  stream.write('[client]\n')
  for k,v in (('host',values.get('DB_HOST')),('user',values.get('DB_USER')),('password',values.get('DB_PASSWORD'))):
   stream.write(k+'="'+v.replace('\\','\\\\').replace('"','\\"')+'"\n')
 # Single SQL session throughout: transaction is rolled back before disconnect.
 # The unique synthetic ID is excluded from public catalog before commit.
 marker='encarmen_sql_probe_'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
 q="""
 SELECT DATABASE(), SUBSTRING_INDEX(CURRENT_USER(),CHAR(64),1);
 SELECT env_name,db_name FROM encarmen_environment_marker;
 START TRANSACTION;
 INSERT INTO businesses (id,name,phone,whatsapp,description,status,raw_data)
 VALUES ('{m}','ENCARMEN SQL TRANSIENT TEST','0000000000','0000000000','before','draft','{{"testOnly":true}}');
 SELECT IF(COUNT(*)=1,'INSERT_OK','INSERT_FAILED') FROM businesses WHERE id='{m}' AND description='before';
 UPDATE businesses SET description='after' WHERE id='{m}';
 SELECT IF(COUNT(*)=1,'UPDATE_OK','UPDATE_FAILED') FROM businesses WHERE id='{m}' AND description='after';
 ROLLBACK;
 SELECT IF(COUNT(*)=0,'ROLLBACK_OK','ROLLBACK_FAILED') FROM businesses WHERE id='{m}';
 """.format(m=marker)
 cmd=['mariadb','--defaults-extra-file='+tmp,'-D',DB,'--batch','--skip-column-names','-e',q]
 res=subprocess.run(cmd,capture_output=True,text=True,timeout=50)
 lines=res.stdout.strip().splitlines()
 if not lines or lines[0].split('\t')[0]!=DB or len(lines[0].split('\t'))!=2 or lines[0].split('\t')[1]=='u293982346_appuser':end('BLOCKED_IDENTITY')
 if len(lines)<2 or lines[1]!='staging\t'+DB:end('BLOCKED_MARKER')
 print('SQL_CONNECTION=STAGING_ONLY')
 print('SQL_SCRIPT_EXIT='+str(res.returncode))
 print('INSERT_VERIFIED='+str('INSERT_OK' in lines).lower())
 print('UPDATE_VERIFIED='+str('UPDATE_OK' in lines).lower())
 print('ROLLBACK_VERIFIED='+str('ROLLBACK_OK' in lines).lower())
 print('RESULT='+('PASS_TRANSACTION_ROLLED_BACK' if res.returncode==0 and all(k in lines for k in ['INSERT_OK','UPDATE_OK','ROLLBACK_OK']) else 'FAIL_TRANSACTION_NOT_PROVEN'))
finally:
 os.unlink(tmp)
