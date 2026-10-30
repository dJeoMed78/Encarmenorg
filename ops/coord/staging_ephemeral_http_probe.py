#!/usr/bin/env python3
"""Single-run Staging-only HTTP test. Uses a temporary loopback-targeted Node instance,
ephemeral admin credentials, readback and narrow SQL cleanup. No public app restart."""
import pathlib,os,sys,subprocess,tempfile,stat,socket,secrets,hashlib,json,uuid,time,urllib.request,urllib.error,signal,re,shutil
HOME=pathlib.Path.home()
STAGING=HOME/'domains/staging.encarmen.org/hbuilds'
ENV=STAGING/'config/.env'
BACKUP=HOME/'encarmen-staging-backups'
DATABASE='u293982346_encarmentest'
PROD='u293982346_encarmenapp'
work=None; child=None; cnf=None; created_id=None; created_name=None
def emit(k,v): print(k+'='+str(v),flush=True)
def halt(reason): emit('RESULT','BLOCKED_'+reason); raise RuntimeError(reason)
def database_query(sql,read=True):
    r=subprocess.run(['mariadb','--defaults-extra-file='+str(cnf),'-D',DATABASE,
                      '--batch','--skip-column-names','-e',sql],
                     capture_output=True,text=True,timeout=45)
    if r.returncode:halt('SQL_OPERATION')
    return r.stdout.strip().splitlines()
def sql_literal(value):
    return 'CONVERT(0x'+value.encode('utf-8').hex()+' USING utf8mb4)'
NO_PROXY_OPENER=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def http(method,url,data=None,headers=None):
    hdr={'Content-Type':'application/json','Origin':'https://staging.encarmen.org','Cache-Control':'no-store'}
    hdr.update(headers or {})
    req=urllib.request.Request(url,method=method,headers=hdr,data=json.dumps(data).encode() if data is not None else None)
    try:
        with NO_PROXY_OPENER.open(req,timeout=12) as r:return r.status,json.loads(r.read(1500000))
    except urllib.error.HTTPError as e:
        try:return e.code,json.loads(e.read(2000))
        except Exception:return e.code,{}
    except Exception:return 0,{}
try:
    if not STAGING.is_dir() or not ENV.is_file() or ENV.is_symlink():halt('STAGING_PATH')
    if not BACKUP.is_dir() or BACKUP.is_symlink() or BACKUP.stat().st_mode & 0o077:halt('BACKUP_DIRECTORY')
    vars={}
    for line in ENV.read_text(encoding='utf-8').splitlines():
        raw=line.strip()
        if raw.startswith('export '):raw=raw[7:]
        if '=' not in raw or raw.startswith('#'):continue
        k,v=raw.split('=',1)
        vars[k.strip()]=v.strip().strip('"').strip("'")
    if vars.get('APP_ENV')!='staging' or vars.get('STAGING_READ_ONLY')!='true' or vars.get('DB_NAME')!=DATABASE:halt('ENV_NOT_READONLY_STAGING')
    if vars.get('DB_USER') in ('','u293982346_appuser',None) or not vars.get('DB_HOST') or not vars.get('DB_PASSWORD'):halt('DATABASE_CONFIG')
    fd,p=tempfile.mkstemp(dir=BACKUP,prefix='.enc-http-db-',suffix='.cnf')
    cnf=pathlib.Path(p);os.fchmod(fd,0o600)
    with os.fdopen(fd,'w') as f:
        f.write('[client]\n')
        for k,n in [('host','DB_HOST'),('port','DB_PORT'),('user','DB_USER'),('password','DB_PASSWORD')]:
            v=vars.get(n,'3306' if k=='port' else '')
            f.write(k+'="'+v.replace('\\','\\\\').replace('"','\\"')+'"\n')
    identity=database_query('SELECT DATABASE(),SUBSTRING_INDEX(CURRENT_USER(),CHAR(64),1)')
    if len(identity)!=1 or identity[0].split('\t')[0]!=DATABASE or identity[0].split('\t')[1]=='u293982346_appuser':halt('SQL_IDENTITY')
    if database_query('SELECT env_name,db_name FROM encarmen_environment_marker')!=['staging\t'+DATABASE]:halt('STAGING_MARKER')
    schemas=database_query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA')
    if PROD in schemas:halt('PRODUCTION_SCHEMA_VISIBLE')
    emit('SQL_IDENTITY','STAGING_ONLY')
    # Use the latest ACTIVE installed Staging version, never production paths.
    versions=STAGING/'versions'
    candidates=[]
    for v in versions.iterdir():
        root=v/'nodejs'
        if root.is_dir() and (root/'server.js').is_file() and (root/'node_modules').is_dir():
            candidates.append((root.stat().st_mtime,root))
    if not candidates:halt('NO_STAGING_NODE_BUILD')
    stage_root=max(candidates)[1]
    # Only reuse a Node executable from a process rooted in exactly this staging tree.
    node_exe=None
    for entry in pathlib.Path('/proc').iterdir():
        if not entry.name.isdecimal():continue
        try:
            cwd=pathlib.Path(os.readlink(entry/'cwd'))
            exe=pathlib.Path(os.readlink(entry/'exe'))
            if cwd==stage_root and exe.is_file() and ('node' in exe.name.lower()):
                node_exe=str(exe);break
        except Exception:continue
    if not node_exe:halt('STAGING_NODE_EXECUTABLE_UNVERIFIED')
    emit('STAGING_NODE_VERSION','VERIFIED')
    work=pathlib.Path(tempfile.mkdtemp(dir=BACKUP,prefix='.enc-staging-ephemeral-'))
    os.chmod(work,0o700)
    (work/'.env').write_text('',encoding='utf8')
    os.chmod(work/'.env',0o600)
    password=secrets.token_urlsafe(32)
    salt=os.urandom(16)
    digest=hashlib.scrypt(password.encode(),salt=salt,n=16384,r=8,p=1,dklen=64)
    provider={'version':1,'accounts':[{'username':'stagingtest',
        'passwordHash':'scrypt$'+salt.hex()+'$'+digest.hex(),
        'permissions':['business:manage']}]}
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    procenv=os.environ.copy()
    procenv.update(vars)
    procenv.update({
        'PORT':str(port),'APP_ENV':'staging','STAGING_READ_ONLY':'false',
        'STAGING_DB_CONFIRMED':'true','STAGING_BUSINESS_WRITES_ENABLED':'true',
        'ENC_ADMIN_MUTATIONS_ENABLED':'true',
        'ENC_ADMIN_PUBLIC_ORIGIN':'https://staging.encarmen.org',
        'ENC_ADMIN_CREDENTIALS_JSON':json.dumps(provider,separators=(',',':')),
        'ENABLE_WP_SYNC':'false','STAGING_ALLOW_SCHEMA_INIT':'false',
        'STAGING_REQUIRE_MINIMAL_GRANTS':'false',
        'ENABLE_CACHE_PURGE':'false'})
    # Never write env variables, tokens or logs to GitHub.
    logfile=(work/'node-private.log').open('wb')
    runner=work/'probe-runner.mjs'
    runner.write_text(r"""
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const resultFile=process.env.PROBE_RESULT;
function save(value){fs.writeFileSync(resultFile,JSON.stringify(value),{mode:0o600});}
async function query(method,route,body,extra={}){
 const headers={'Content-Type':'application/json','Origin':'https://staging.encarmen.org',...extra};
 const resp=await fetch('http://127.0.0.1:'+process.env.PORT+route,{
  method,headers,...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(6000)
 });
 let json={};try{json=await resp.json();}catch{}
 return {status:resp.status,json};
}
(async()=>{
 let state={status:'STARTED'};
 try{
  await import(pathToFileURL(process.env.STAGING_SERVER_ENTRY).href);
  let online=false;
  for(let n=0;n<35;n++){
   try{
    const r=await query('GET','/api/health');
    if(r.status===200&&r.json.environment==='staging'){online=true;break;}
   }catch{}
   await new Promise(resolve=>setTimeout(resolve,300));
  }
  if(!online)throw Error('NODE_LOOPBACK_UNAVAILABLE');
  state.localHttp=true;
  const login=await query('POST','/api/admin/login',{username:'stagingtest',password:process.env.PROBE_PASSWORD});
  state.loginStatus=login.status;
  if(login.status!==200||!login.json.token)throw Error('ADMIN_LOGIN_FAILED');
  const header={'X-Encarmen-Admin-Token':login.json.token};
  const blocked=await query('POST','/api/reports',{reason:'synthetic'},header);
  state.unrelatedWriteStatus=blocked.status;
  if(blocked.status!==403)throw Error('UNRELATED_MUTATION_GUARD_FAILED');
  const draft={name:process.env.PROBE_NAME,category:'Servicios',description:'Before controlled staging edit',phone:process.env.PROBE_PHONE};
  const created=await query('POST','/api/submit-business',draft,{...header,'Idempotency-Key':randomUUID()});
  state.createStatus=created.status;
  const id=String(created.json?.business?.id||'');
  if(id)state.id=id;
  save(state);
  if(created.status!==201||!created.json?.success||!/^\d+$/.test(id))throw Error('CREATE_FAILED');
  const edited=await query('PATCH','/api/businesses/'+id,{description:'After controlled staging edit'},header);
  state.editStatus=edited.status;
  save(state);
  if(edited.status!==200||!edited.json?.success)throw Error('EDIT_FAILED');
  const listing=await query('GET','/api/businesses');
  const entries=Array.isArray(listing.json)?listing.json:Array.isArray(listing.json?.businesses)?listing.json.businesses:[];
  state.httpReadback=listing.status===200&&entries.some(b=>String(b.id)===id&&b.description==='After controlled staging edit');
  if(!state.httpReadback)throw Error('HTTP_READBACK_FAILED');
  state.status='PASS';
  save(state);
  process.exit(0);
 }catch(error){
  state.status='FAILED';
  state.errorCode=String(error?.message||'NODE_ERROR').replace(/[^A-Z_]/g,'').slice(0,50);
  save(state);
  process.exit(2);
 }
})();
""",encoding='utf8')
    resultPath=work/'inprocess-result.json'
    procenv.update({
       'STAGING_SERVER_ENTRY':str(stage_root/'server.js'),
       'PROBE_RESULT':str(resultPath),
       'PROBE_PASSWORD':password,
       'PROBE_NAME':created_name if created_name else 'ENCARMEN STAGING CONTROLLED TEST '+secrets.token_hex(6),
       'PROBE_PHONE':'9999'+str(secrets.randbelow(1000000)).zfill(6)
    })
    created_name=procenv['PROBE_NAME']
    logfile=(work/'node-private.log').open('wb')
    child=subprocess.Popen([node_exe,str(runner)],cwd=work,env=procenv,
                            stdout=logfile,stderr=subprocess.STDOUT,start_new_session=True)
    logfile.close()
    try:child.wait(timeout=85)
    except subprocess.TimeoutExpired:halt('NODE_INPROCESS_TIMEOUT')
    if not resultPath.is_file():halt('NO_INPROCESS_RESULT')
    state=json.loads(resultPath.read_text(encoding='utf8'))
    emit('INPROCESS_HTTP_READY',str(state.get('localHttp') is True).lower())
    emit('ADMIN_LOGIN_STATUS',state.get('loginStatus','missing'))
    emit('UNRELATED_WRITE_HTTP_STATUS',state.get('unrelatedWriteStatus','missing'))
    emit('CREATE_HTTP_STATUS',state.get('createStatus','missing'))
    emit('EDIT_HTTP_STATUS',state.get('editStatus','missing'))
    emit('HTTP_EDIT_READBACK',str(state.get('httpReadback') is True).lower())
    created_id=str(state.get('id','')) if str(state.get('id','')).isdigit() else None
    if state.get('status')!='PASS':
        emit('INPROCESS_FAILURE_CODE',state.get('errorCode','UNKNOWN'))
        halt('HTTP_INPROCESS_FAIL')
    if not created_id:halt('CREATE_ID_MISSING')
    key=sql_literal(created_id)
    rows=database_query('SELECT HEX(name),HEX(description) FROM businesses WHERE id='+key)
    if len(rows)!=1:halt('SQL_READBACK_MISSING')
    fields=rows[0].split('\t')
    if bytes.fromhex(fields[0]).decode('utf8')!=created_name:halt('SQL_NAME_MISMATCH')
    if bytes.fromhex(fields[1]).decode('utf8')!='After controlled staging edit':halt('SQL_EDIT_MISMATCH')
    emit('SQL_COMMITTED_READBACK','PASS')
    emit('RESULT','PASS_INPROCESS_HTTP_CREATE_EDIT_SQL_READBACK')
except Exception as ex:
    if not isinstance(ex,RuntimeError):emit('RESULT','FAILED_EXCEPTION_'+type(ex).__name__)
finally:
    # Remove ONLY synthetic test business after confirming ID and exact name.
    if created_id and cnf and cnf.exists():
        try:
            ident=database_query('SELECT DATABASE()')
            if ident==[DATABASE]:
                key=sql_literal(created_id);name=sql_literal(created_name)
                matches=database_query('SELECT COUNT(*) FROM businesses WHERE id='+key+' AND BINARY name=BINARY '+name)
                if matches==['1']:
                    database_query('DELETE FROM businesses WHERE id='+key+' AND BINARY name=BINARY '+name)
                    emit('SYNTHETIC_CLEANUP','VERIFIED' if database_query('SELECT COUNT(*) FROM businesses WHERE id='+key)==['0'] else 'FAILED')
                elif matches==['0']:emit('SYNTHETIC_CLEANUP','NOT_NEEDED')
                else:emit('SYNTHETIC_CLEANUP','BLOCKED_IDENTITY')
        except Exception:emit('SYNTHETIC_CLEANUP','FAILED_REQUIRES_REVIEW')
    if child and child.poll() is None:
        try:os.killpg(child.pid,signal.SIGTERM);child.wait(timeout=10)
        except Exception:
            try:os.killpg(child.pid,signal.SIGKILL)
            except Exception:pass
    emit('TEMPORARY_PROCESS','CLOSED')
    if work:shutil.rmtree(work,ignore_errors=True)
    if cnf and cnf.exists():cnf.unlink()
    emit('PUBLIC_STAGING_CONFIG','UNCHANGED')
