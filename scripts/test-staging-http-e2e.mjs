/** W5: full, unmodified server.ts bundle + disposable MariaDB. Never uses .env.
 * Run: node scripts/test-staging-http-e2e.mjs [--probe-readback]
 * Recovery after SIGKILL: node scripts/test-staging-http-e2e.mjs --cleanup JOURNAL
 * Docker daemon must be the local Unix socket. No remote database input accepted.
 */
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,scryptSync,createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,readlinkSync,symlinkSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import net from 'node:net';
import {once} from 'node:events';
import mysql from 'mysql2/promise';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url));
const task='ENC-STAGING-HTTP-E2E-CLOSURE-001', database='u293982346_encarmentest';
const image='mariadb:11.4@sha256:d1891ede5a559f1086f55053bb8cc1569b0298338c4d72d71725a7f74f6ba620';
const dockerEnv={...process.env};
for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[k];
function docker(args){
 const r=spawnSync('docker',['--host=unix:///var/run/docker.sock',...args],{env:dockerEnv,encoding:'utf8',timeout:120000,maxBuffer:2e6});
 if(r.status!==0)throw Error('LOCAL_DOCKER_OPERATION_FAILED');
 return r.stdout.trim();
}
function removeOwned(journal){
 const j=JSON.parse(readFileSync(journal,'utf8'));
 assert.equal(j.task,task);assert.match(j.run,/^[a-f0-9-]{36}$/);assert.match(j.name,/^enc-w5-[a-f0-9-]{36}$/);
 assert.equal(j.name,'enc-w5-'+j.run);
 // PID reuse is safe: only stop our exact bundle in its exact temporary CWD.
 if(Number.isSafeInteger(j.serverPid)&&j.serverPid>1){
  const expected=path.dirname(path.resolve(journal));
  assert.ok(expected.startsWith(path.join(tmpdir(),'enc-w5-http-')));
  try{
   if(readlinkSync('/proc/'+j.serverPid+'/cwd')===expected &&
      readFileSync('/proc/'+j.serverPid+'/cmdline','utf8').split('\0').includes(path.join(expected,'server.mjs')))
    process.kill(j.serverPid,'SIGTERM');
  }catch(error){if(!['ENOENT','ESRCH'].includes(error.code))throw error;}
 }
 let info;
 try{info=JSON.parse(docker(['inspect',j.name]))[0];}catch{return;}
 assert.equal(info.Config.Labels['encarmen.task'],task);assert.equal(info.Config.Labels['encarmen.run'],j.run);
 assert.equal(info.Name,'/'+j.name);assert.equal(info.HostConfig.AutoRemove,true);
 assert.ok(info.HostConfig.Tmpfs['/var/lib/mysql']);
 docker(['rm','-f',info.Id]);
}
if(process.argv[2]==='--cleanup'){removeOwned(process.argv[3]);console.log('OWNED_EPHEMERAL_CONTAINER_REMOVED');process.exit(0);}
if(process.argv[2]==='--test-recovery'){
 const interrupted=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--kill-after-post'],{cwd:root,env:process.env,encoding:'utf8',timeout:120000,maxBuffer:2e6});
 assert.equal(interrupted.signal,'SIGKILL');
 const lines=interrupted.stdout.split('\n');
 const recoveryJournal=lines.find(l=>l.startsWith('RECOVERY_JOURNAL='))?.slice('RECOVERY_JOURNAL='.length);
 assert.ok(recoveryJournal);assert.ok(lines.some(l=>l.includes('intentional SIGKILL')));
 const j=JSON.parse(readFileSync(recoveryJournal,'utf8'));
 removeOwned(recoveryJournal);
 assert.equal(docker(['container','ls','-a','--filter','label=encarmen.run='+j.run,'--format','{{.ID}}']),'');
 let running=true;
 for(let n=0;n<30;n++){
  try{running=readlinkSync('/proc/'+j.serverPid+'/cwd')===path.dirname(recoveryJournal);}catch(error){if(error.code==='ENOENT')running=false;else throw error;}
  if(!running)break;await new Promise(r=>setTimeout(r,100));
 }
 assert.equal(running,false,'Recovered server process must be stopped');
 const result={stage:'SIGKILL after SQL-confirmed HTTP POST',runnerSignal:interrupted.signal,committedPostVerified:true,ownedContainersRemaining:0,verifiedServerStopped:true,recovery:'owned container and tmpfs destroyed'};
 const output=path.join(root,'docs/work-progress/'+task+'-evidence');mkdirSync(output,{recursive:true});
 writeFileSync(path.join(output,'interruption-recovery.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));rmSync(path.dirname(recoveryJournal),{recursive:true,force:true});process.exit(0);
}
assert.ok(process.argv.slice(2).every(a=>['--probe-readback','--kill-after-post'].includes(a)),'Unknown option');
const probe=process.argv.includes('--probe-readback');
const run=randomUUID(), name='enc-w5-'+run;
const dir=mkdtempSync(path.join(tmpdir(),'enc-w5-http-'));
const journal=path.join(dir,'cleanup.json');
writeFileSync(journal,JSON.stringify({task,run,name}),{mode:0o600});
console.log('RECOVERY_JOURNAL='+journal);
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{
 child?.kill('SIGTERM');
 try{removeOwned(journal);console.log('INTERRUPTED_OWNED_CONTAINER_REMOVED');}catch{console.error('RECOVERY_REQUIRED='+journal);}
 process.exit(signal==='SIGINT'?130:143);
});
const evidence=[];
function record(stage,data){const row={stage,...data};evidence.push(row);console.log(JSON.stringify(row));}
const password=randomBytes(32).toString('hex'), appPassword=randomBytes(32).toString('hex');
let admin,reader,child,serverPort,base,token,id,failed=false;
let logs='';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function stop(){if(child&&child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await Promise.race([once(child,'exit'),delay(3000)]);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await once(child,'exit');}}child=undefined;}
async function freePort(){const s=net.createServer();await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function request(route,method='GET',body,session=token,headers={}){
 assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);
 const r=await fetch(base+route,{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',Origin:'https://staging.encarmen.org',...(session?{'X-Encarmen-Admin-Token':session}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const json=await r.json();return {status:r.status,json,source:r.headers.get('X-Encarmen-Business-Source')};
}
async function expect(route,method,body,status,session=token,headers={}){const r=await request(route,method,body,session,headers);assert.equal(r.status,status,method+' '+route);if(status>=400)assert.notEqual(r.json.success,true);record(method+' '+route,{status:r.status,...(r.json.error?{error:r.json.error}:{})});return r;}
const adminPassword=randomBytes(24).toString('hex');
const hash=()=>{const salt=randomBytes(16);return 'scrypt$'+salt.toString('hex')+'$'+scryptSync(adminPassword,salt,64).toString('hex');};
async function start(flags={}){
 await stop();token=undefined;logs='';serverPort=await freePort();base='http://127.0.0.1:'+serverPort;
 // Allowlisted child environment: cannot inherit production DB aliases, secrets or .env.
 const env={PATH:process.env.PATH,NODE_ENV:'production',APP_ENV:'staging',PORT:String(serverPort),
  DB_HOST:'127.0.0.1',DB_PORT:String(dbPort),DB_USER:'w5_app',DB_PASSWORD:appPassword,DB_NAME:database,
  STAGING_READ_ONLY:'false',STAGING_DB_CONFIRMED:'true',STAGING_BUSINESS_WRITES_ENABLED:'true',
  STAGING_REQUIRE_MINIMAL_GRANTS:'true',STAGING_ALLOW_SCHEMA_INIT:'false',ENABLE_WP_SYNC:'false',
  ENC_ADMIN_MUTATIONS_ENABLED:'true',ENC_ADMIN_PUBLIC_ORIGIN:'https://staging.encarmen.org',
  ENC_ADMIN_CREDENTIALS_JSON:JSON.stringify({version:1,accounts:[{username:'w5',passwordHash:hash(),permissions:['business:manage']},{username:'limited',passwordHash:hash(),permissions:['event:manage']}]}),
  PUBLIC_REGISTRATION_ENABLED:'false',...flags};
 child=spawn(process.execPath,[path.join(dir,'server.mjs')],{cwd:dir,env,stdio:['ignore','pipe','pipe']});
 writeFileSync(journal,JSON.stringify({task,run,name,serverPid:child.pid}),{mode:0o600});
 for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{logs=(logs+data).slice(-100000);});
 for(let n=0;n<100;n++){
  assert.equal(child.exitCode,null,'SERVER_EXITED (private logs suppressed)');
  try{const h=await request('/api/health');if(h.status===200&&h.json.database===(flags.STAGING_DB_CONFIRMED==='false'?'json_cache':'mariadb')){assert.equal(h.json.environment,'staging');assert.equal(h.json.staging.readOnly,true);assert.equal(h.json.staging.writesPermitted,false);record('health',{status:200,...h.json});return;}}catch{}
  await delay(100);
 }
 throw Error('SERVER_MARIADB_NOT_READY');
}
async function login(username='w5'){const r=await expect('/api/admin/login','POST',{username,password:adminPassword},200);assert.match(r.json.token,/^[a-f0-9]{64}$/);return r.json.token;}
async function sqlRow(){const [rows]=await reader.query('SELECT id,name,description,phone,whatsapp,raw_data FROM businesses WHERE id=?',[String(id)]);assert.equal(rows.length,1);return rows[0];}
let dbPort;
const draft={name:'ENC W5 SYNTHETIC '+run,category:'Servicios',phone:'0000000000',whatsapp:'0000000001',description:'W5 before HTTP edit'};
const key=randomUUID();
try{
 docker(['info','--format','{{.ServerVersion}}']);
 docker(['run','--detach','--rm','--name',name,'--label','encarmen.task='+task,'--label','encarmen.run='+run,
  '--tmpfs','/var/lib/mysql:rw,noexec,nosuid,size=512m','--publish','127.0.0.1::3306',
  '--env','MARIADB_ROOT_PASSWORD='+password,'--env','MARIADB_ROOT_HOST=%',image]);
 const info=JSON.parse(docker(['inspect',name]))[0];
 const binding=info.NetworkSettings.Ports['3306/tcp'][0];assert.equal(binding.HostIp,'127.0.0.1');dbPort=Number(binding.HostPort);
 record('container',{image:info.Image,ephemeral:true,loopbackOnly:true});
 for(let n=0;n<150;n++){try{admin=await mysql.createConnection({host:'127.0.0.1',port:dbPort,user:'root',password,connectTimeout:1000});break;}catch{await delay(200);}}
 assert.ok(admin,'MariaDB startup');
 await admin.query('CREATE DATABASE `'+database+'`');
 await admin.query('USE `'+database+'`');
 // Exact businesses DDL extracted from the inspected application, not guessed.
 const dbSource=readFileSync(path.join(root,'src/db/mariadb.ts'),'utf8');
 const ddl=dbSource.match(/`CREATE TABLE IF NOT EXISTS \\`businesses\\` \([\s\S]*?COLLATE=utf8mb4_unicode_ci;`/)[0].slice(1,-1).replaceAll('\\`','`');
 await admin.query(ddl);
 await admin.query('CREATE TABLE encarmen_environment_marker (env_name VARCHAR(32),db_name VARCHAR(64)) ENGINE=InnoDB');
 await admin.query('INSERT INTO encarmen_environment_marker VALUES (?,?)',['staging',database]);
 await admin.query("CREATE USER 'w5_app'@'%' IDENTIFIED BY ?",[appPassword]);
 await admin.query("GRANT SELECT, INSERT, UPDATE ON `"+database+"`.* TO 'w5_app'@'%'");
 reader=await mysql.createConnection({host:'127.0.0.1',port:dbPort,user:'w5_app',password:appPassword,database});
 const [identity]=await reader.query('SELECT DATABASE() AS db_name');assert.equal(identity[0].db_name,database);
 const [grants]=await reader.query('SHOW GRANTS');assert.ok(grants.some(r=>/SELECT, INSERT, UPDATE/.test(Object.values(r)[0])));
 const [schemas]=await reader.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA');assert.ok(schemas.every(r=>[database,'information_schema','performance_schema'].includes(r.SCHEMA_NAME)));
 const [version]=await reader.query('SELECT VERSION() AS version');record('SQL engine version',{version:version[0].version});
 record('isolation',{database:identity[0].db_name,minimalGrants:true,productionVisible:false,marker:'staging',engine:'InnoDB'});
 await admin.query('INSERT INTO businesses (id,name,description,phone,whatsapp,raw_data) VALUES (?,?,?,?,?,?)',['3999','W5 isolated sentinel','must remain unchanged','0000000002','',JSON.stringify({slug:'w5-sentinel'})]);
 const [sentinelBefore]=await reader.query("SELECT * FROM businesses WHERE id='3999'");
 symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
 await build({entryPoints:[path.join(root,'server.ts')],bundle:true,platform:'node',format:'esm',packages:'external',outfile:path.join(dir,'server.mjs'),logLevel:'silent'});
 record('bundle',{sha256:createHash('sha256').update(readFileSync(path.join(dir,'server.mjs'))).digest('hex'),fullServer:true,cwdHasEnv:false});
 await start();
 await expect('/api/admin/login','POST',{username:'w5',password:'incorrect-password-only'},401);
 await expect('/api/admin/login','POST',{username:'w5',password:adminPassword},403,null,{Origin:'https://unauthorized.invalid'});
 token=await login();const limited=await login('limited');
 await expect('/api/submit-business','POST',draft,401,null,{'Idempotency-Key':key});
 await expect('/api/submit-business','POST',draft,401,'a'.repeat(64),{'Idempotency-Key':key});
 await expect('/api/submit-business','POST',draft,403,limited,{'Idempotency-Key':key});
 await expect('/api/submit-business','POST',draft,403,token,{Origin:'https://unauthorized.invalid','Idempotency-Key':key});
 for(const [route,method] of [['/api/reports','POST'],['/api/mariadb/reconnect','POST'],['/api/upload-logo','POST'],['/api/events','POST'],['/api/businesses/3999','DELETE'],['/businesses/3999','PUT']]){const r=await request(route,method,{});assert.ok([403,503].includes(r.status));record('unrelated-write',{route,method,status:r.status});}
 const created=await expect('/api/submit-business','POST',draft,201,token,{'Idempotency-Key':key});assert.equal(created.json.success,true);record('HTTP POST JSON',{status:created.status,response:created.json});id=created.json.business.id;assert.ok(id);assert.equal(created.json.replayed,false);
 const afterCreate=await sqlRow();assert.equal(afterCreate.description,draft.description);assert.equal(afterCreate.phone,draft.phone);assert.equal(afterCreate.whatsapp,draft.whatsapp);assert.equal(JSON.parse(afterCreate.raw_data)._stagingRegistrationId,key);
 record('SQL after POST',{query:'SELECT id,name,description,phone,whatsapp,raw_data FROM businesses WHERE id=?',id,name:afterCreate.name,description:afterCreate.description,phone:afterCreate.phone,whatsapp:afterCreate.whatsapp,registrationId:JSON.parse(afterCreate.raw_data)._stagingRegistrationId});
 if(process.argv.includes('--kill-after-post')){record('intentional SIGKILL',{committedId:id,journal});process.kill(process.pid,'SIGKILL');await delay(10000);}
 const replay=await expect('/api/submit-business','POST',draft,200,token,{'Idempotency-Key':key});assert.equal(replay.json.replayed,true);assert.equal(replay.json.business.id,id);
 const parallel=await Promise.all([request('/api/submit-business','POST',draft,token,{'Idempotency-Key':key}),request('/api/submit-business','POST',draft,token,{'Idempotency-Key':key})]);assert.ok(parallel.every(r=>r.status===200&&r.json.replayed&&r.json.business.id===id));
 const [count]=await reader.query('SELECT COUNT(*) AS n FROM businesses WHERE JSON_UNQUOTE(JSON_EXTRACT(raw_data,\'$._stagingRegistrationId\'))=?',[key]);assert.equal(Number(count[0].n),1);record('idempotency',{sequential:200,concurrent:[200,200],count:Number(count[0].n),id});
 await expect('/api/submit-business','POST',{...draft,description:'conflict'},409,token,{'Idempotency-Key':key});
 await expect('/api/submit-business','POST',draft,409,token,{'Idempotency-Key':randomUUID()});
 await expect('/api/submit-business','POST',draft,400);
 await expect('/api/businesses/'+id,'PATCH',{id:42},400);
 await expect('/api/businesses/'+id,'PATCH',{phone:'invalid'},400);
 await expect('/api/businesses/nonexistent-w5','PATCH',{description:'absent'},404);
 await expect('/api/businesses/'+id,'PATCH',{isTopBusiness:true},403);
 await expect('/api/businesses/'+id,'PATCH',{description:'no session'},401,null);
 await expect('/api/businesses/'+id,'PATCH',{description:'invalid token'},401,'b'.repeat(64));
 await expect('/api/businesses/'+id,'PATCH',{description:'limited'},403,limited);
 await expect('/api/businesses/'+id,'PATCH',{description:'origin'},403,token,{Origin:'https://unauthorized.invalid'});
 const edited=await expect('/api/businesses/'+id,'PATCH',{description:'W5 after HTTP edit'},200);record('HTTP PATCH JSON',{status:edited.status,response:edited.json});assert.equal(edited.json.business.id,id);assert.equal(edited.json.business.description,'W5 after HTTP edit');
 const afterEdit=await sqlRow();assert.equal(afterEdit.description,'W5 after HTTP edit');assert.equal(afterEdit.phone,draft.phone);record('SQL after PATCH',{query:'SELECT id,name,description,phone,whatsapp,raw_data FROM businesses WHERE id=?',id,description:afterEdit.description,rawDescription:JSON.parse(afterEdit.raw_data).description,phone:afterEdit.phone,whatsapp:afterEdit.whatsapp});
 await expect('/api/businesses/'+id,'PATCH',{description:'W5 after HTTP edit'},200);
 await expect('/businesses/'+id,'PATCH',{description:'W5 after HTTP edit'},200);
 // Real SQL SIGNAL simulates persistence failures without replacing the driver/store.
 await admin.query("CREATE TRIGGER w5_insert_failure BEFORE INSERT ON businesses FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='W5 isolated failure'");
 await expect('/api/submit-business','POST',{...draft,name:'W5 failed '+run,phone:'0000000003',whatsapp:''},503,token,{'Idempotency-Key':randomUUID()});
 await admin.query('DROP TRIGGER w5_insert_failure');
 if(!probe){
  await admin.query("CREATE TRIGGER w5_discard_insert BEFORE INSERT ON businesses FOR EACH ROW SET NEW.description='W5 discarded insert'");
  await expect('/api/submit-business','POST',{...draft,name:'W5 discarded insert '+run,phone:'0000000003',whatsapp:''},503,token,{'Idempotency-Key':randomUUID()});
  const [absent]=await reader.query('SELECT COUNT(*) AS n FROM businesses WHERE name=?',['W5 discarded insert '+run]);assert.equal(Number(absent[0].n),0);record('INSERT mismatch rollback',{remaining:Number(absent[0].n)});
  await admin.query('DROP TRIGGER w5_discard_insert');
 }
 await admin.query("CREATE TRIGGER w5_update_failure BEFORE UPDATE ON businesses FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='W5 isolated failure'");
 await expect('/api/businesses/'+id,'PATCH',{description:'must roll back'},503);assert.equal((await sqlRow()).description,'W5 after HTTP edit');
 await admin.query('DROP TRIGGER w5_update_failure');
 // Detect a DB trigger silently discarding a non-contact field: must not confirm success.
 await admin.query('CREATE TRIGGER w5_discard_description BEFORE UPDATE ON businesses FOR EACH ROW SET NEW.description=OLD.description');
 const mismatch=await request('/api/businesses/'+id,'PATCH',{description:'W5 discarded by trigger'});
 record('discarded SQL field',{status:mismatch.status,reportedSuccess:mismatch.json.success,sqlDescription:(await sqlRow()).description});
 if(probe){assert.equal(mismatch.status,200);assert.equal(mismatch.json.success,true);assert.notEqual((await sqlRow()).description,mismatch.json.business.description);record('REPRODUCED_DEFECT',{code:'FALSE_SUCCESS_NONCONTACT_READBACK'});}
 else {assert.equal(mismatch.status,503);assert.equal(mismatch.json.success,false);assert.equal((await sqlRow()).description,'W5 after HTTP edit');}
 await admin.query('DROP TRIGGER w5_discard_description');
 if(!probe){
  await admin.query('CREATE TRIGGER w5_discard_raw BEFORE UPDATE ON businesses FOR EACH ROW SET NEW.raw_data=OLD.raw_data');
  await expect('/api/businesses/'+id,'PATCH',{description:'must rollback raw mismatch'},503);
  assert.equal((await sqlRow()).description,'W5 after HTTP edit');
  await admin.query('DROP TRIGGER w5_discard_raw');
 }
 if(probe)await expect('/api/businesses/'+id,'PATCH',{description:'W5 after HTTP edit'},200);
 // Process restart clears all application caches/sessions, SQL data survives.
 await start();token=await login();
 const listing=await expect('/api/businesses','GET',undefined,200);assert.equal(listing.source,'mariadb');assert.equal(listing.json.source,'mariadb');const found=listing.json.businesses.find(b=>String(b.id)===String(id));assert.equal(found.description,'W5 after HTTP edit');assert.equal(found.phone,draft.phone);record('HTTP fresh read after restart',{status:200,source:listing.source,id:found.id,description:found.description,response:listing.json});
 // SQL SELECT failure must produce 503 even with a warm cache.
 await admin.query('RENAME TABLE businesses TO w5_temporarily_unavailable');
 await expect('/api/businesses','GET',undefined,503);
 await admin.query('RENAME TABLE w5_temporarily_unavailable TO businesses');
 // Real isolation proof must block missing/incorrect marker before any INSERT.
 await admin.query('DELETE FROM encarmen_environment_marker');
 await expect('/api/submit-business','POST',{...draft,name:'W5 marker absent',phone:'0000000004',whatsapp:''},403,token,{'Idempotency-Key':randomUUID()});
 await admin.query('INSERT INTO encarmen_environment_marker VALUES (?,?)',['production',database]);
 await expect('/api/businesses/'+id,'PATCH',{description:'must not write'},403);
 await admin.query('UPDATE encarmen_environment_marker SET env_name=?',['staging']);
 for(const flags of [{STAGING_READ_ONLY:'true'},{STAGING_DB_CONFIRMED:'false'},{STAGING_BUSINESS_WRITES_ENABLED:'false'},{ENC_ADMIN_MUTATIONS_ENABLED:'false'}]){
  await start(flags);token=await login();
  for(const [route,method,body]of [['/api/submit-business','POST',draft],['/api/businesses/'+id,'PATCH',{description:'blocked'}],['/businesses/'+id,'PATCH',{description:'blocked'}]]){const r=await request(route,method,body,token,{'Idempotency-Key':key});assert.ok([403,503].includes(r.status));assert.notEqual(r.json.success,true);record('flags block',{flag:Object.keys(flags)[0],route,status:r.status});}
 }
 const [sentinelAfter]=await reader.query("SELECT * FROM businesses WHERE id='3999'");assert.deepEqual(sentinelAfter,sentinelBefore);record('unrelated rows',{sentinelUnchanged:true});
}catch(error){failed=true;record('FAILURE',{name:error.name,message:String(error.message).replaceAll(password,'[redacted]').replaceAll(appPassword,'[redacted]').replaceAll(adminPassword,'[redacted]').replace(/\b[a-f0-9]{64,}\b/gi,'[redacted]')});}
finally{
 await stop();
 try{
  if(admin&&reader&&id){const row=await sqlRow();assert.equal(row.name,draft.name);assert.equal(JSON.parse(row.raw_data)._stagingRegistrationId,key);
   const [deleted]=await admin.query('DELETE FROM businesses WHERE id=? AND BINARY name=BINARY ? AND JSON_UNQUOTE(JSON_EXTRACT(raw_data,\'$._stagingRegistrationId\'))=?',[String(id),draft.name,key]);assert.equal(deleted.affectedRows,1);
   const [left]=await reader.query('SELECT id FROM businesses WHERE id=? OR name=?',[String(id),draft.name]);assert.equal(left.length,0);record('SQL cleanup',{exactIdentity:true,deleted:deleted.affectedRows,remaining:left.length});
   const [allRemaining]=await reader.query('SELECT id FROM businesses');assert.deepEqual(allRemaining.map(r=>r.id),['3999']);record('all synthetic writes cleaned',{businessRows:allRemaining.length,onlySentinel:true});}
 }catch{failed=true;record('SQL cleanup',{verified:false});}
 await reader?.end().catch(()=>{});await admin?.end().catch(()=>{});
 try{removeOwned(journal);record('container cleanup',{removed:true,tmpfsDestroyed:true});}catch{failed=true;record('container cleanup',{removed:false,journal});}
 const output=path.join(root,'docs/work-progress/'+task+'-evidence');mkdirSync(output,{recursive:true});
 writeFileSync(path.join(output,probe?'before-fix.json':'http-sql-results.json'),JSON.stringify({task,run,node:process.version,probe,passed:!failed,evidence},null,2)+'\n');
 if(!failed)rmSync(dir,{recursive:true,force:true});
}
process.exitCode=failed?1:0;
