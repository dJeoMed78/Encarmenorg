#!/usr/bin/env python3
# Exclusively Staging: abort before DDL unless DB identity, environment and backup are verified.
import pathlib,subprocess,tempfile,os,sys,gzip,datetime
H=pathlib.Path.home(); E=H/'domains/staging.encarmen.org/hbuilds/config/.env'
D='u293982346_encarmentest'; B=H/'encarmen-staging-backups/database'
def stop(reason): print('RESULT=BLOCKED_'+reason,flush=True);sys.exit(0)
def run(command,timeout=100):
 r=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout)
 if r.returncode:stop('COMMAND_FAILED')
 return r.stdout
if not E.is_file() or E.is_symlink() or not B.is_dir() or B.is_symlink() or B.stat().st_mode&0o077:stop('PATH')
v={}
for line in E.read_text().splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,x=line.split('=',1);v[k.strip()]=x.strip().strip('"').strip("'")
if v.get('APP_ENV')!='staging' or v.get('STAGING_READ_ONLY')!='true':stop('ENV')
if v.get('DB_NAME')!=D or v.get('DB_USER') in ('',None,'u293982346_appuser'):stop('DB')
if not v.get('DB_HOST') or not v.get('DB_PASSWORD'):stop('DB_CREDENTIALS')
fd,cnf=tempfile.mkstemp(dir=B,prefix='.marker-cred-')
try:
 os.fchmod(fd,0o600)
 with os.fdopen(fd,'w') as f:
  f.write('[client]\n')
  for k,n in [('host','DB_HOST'),('user','DB_USER'),('password','DB_PASSWORD')]:
   f.write(k+'="'+v[n].replace('\\','\\\\').replace('"','\\"')+'"\n')
 cmd=['mariadb','--defaults-extra-file='+cnf,'-D',D,'--batch','--skip-column-names','-e']
 def sql(q):return run(cmd+[q]).decode().strip().splitlines()
 identity=sql('SELECT DATABASE(),SUBSTRING_INDEX(CURRENT_USER(),CHAR(64),1)')
 if len(identity)!=1 or identity[0].split('\t')[0]!=D or 'u293982346_appuser' in identity[0]:stop('IDENTITY')
 print('STAGING_IDENTITY=VERIFIED')
 grants=sql('SHOW GRANTS FOR CURRENT_USER()')
 if any('encarmenapp' in x.lower() or 'ON *.*' in x.upper() and 'USAGE' not in x.upper() for x in grants):stop('GRANTS')
 if 'u293982346_encarmenapp' in sql('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA'):stop('PRODUCTION_VISIBLE')
 present=sql("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='encarmen_environment_marker'")
 if present==['1']:
  print('RESULT='+('ALREADY_VALID' if sql('SELECT env_name,db_name FROM encarmen_environment_marker')==['staging\t'+D] else 'BLOCKED_MARKER_MISMATCH'))
  sys.exit(0)
 if present!=['0']:stop('MARKER_STATUS')
 stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
 dump=run(['mariadb-dump','--defaults-extra-file='+cnf,'--single-transaction','--quick','--skip-lock-tables','--no-tablespaces',D],240)
 if b'CREATE TABLE' not in dump:stop('EMPTY_BACKUP')
 name=B/('staging-pre-marker-'+stamp+'.sql.gz')
 with name.open('xb') as f:
  os.chmod(name,0o600)
  with gzip.GzipFile(fileobj=f,mode='wb') as z:z.write(dump)
 with gzip.open(name,'rb') as f:
  if b'CREATE TABLE' not in f.read(250000):stop('BACKUP_VERIFY')
 print('BACKUP=VERIFIED')
 sql('CREATE TABLE encarmen_environment_marker (env_name VARCHAR(16) NOT NULL PRIMARY KEY, db_name VARCHAR(64) NOT NULL) ENGINE=InnoDB')
 sql("INSERT INTO encarmen_environment_marker (env_name,db_name) VALUES ('staging','u293982346_encarmentest')")
 print('RESULT='+('CREATED_AND_READBACK_VERIFIED' if sql('SELECT env_name,db_name FROM encarmen_environment_marker')==['staging\t'+D] else 'BLOCKED_READBACK'))
finally:os.unlink(cnf)
