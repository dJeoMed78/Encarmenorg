import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {buildSync,transformSync} from 'esbuild';
import mysql from 'mysql2/promise';
import net from 'node:net';

// No external server options are accepted. This runner always owns its datadir/socket.
for(const forbidden of ['ENC_MARIADB_TEST_ROOT','DB_HOST','DB_PASSWORD','MYSQL_HOST','MYSQL_PASSWORD','MARIADB_HOST','MARIADB_PASSWORD']) {
 if(process.env[forbidden]) throw Error('Run with a clean environment; external database settings are forbidden.');
}
const project=fileURLToPath(new URL('../',import.meta.url));
const basedir=process.env.ENC_MARIADB_BASEDIR;
if(!basedir || !path.isAbsolute(basedir)) throw Error('Set ENC_MARIADB_BASEDIR to a local MariaDB installation prefix (containing bin and sbin).');
const install=path.join(basedir,'bin/mariadb-install-db'), daemon=path.join(basedir,'sbin/mariadbd');
for(const executable of [install,daemon]) fs.accessSync(executable,fs.constants.X_OK);
const root=fs.mkdtempSync(path.join(os.tmpdir(),'enc-mariadb-persistence-'));
fs.chmodSync(root,0o700);fs.writeFileSync(path.join(root,'owned-by-enc-runner'),'synthetic-only\n',{mode:0o600});
const socketPath=path.join(root,'mysql.sock');
const transport=process.env.ENC_MARIADB_TRANSPORT || 'unix';
if(!['unix','loopback'].includes(transport))throw Error('INVALID_LOCAL_TRANSPORT');
let port;
if(transport==='loopback'){const reservation=net.createServer();await new Promise((resolve,reject)=>{reservation.once('error',reject);reservation.listen(0,'127.0.0.1',resolve);});port=reservation.address().port;await new Promise(r=>reservation.close(r));}
const endpoint=transport==='unix'?{socketPath}:{host:'127.0.0.1',port};
const runtimeEnv={PATH:path.join(basedir,'bin')+':'+(process.env.PATH||'/usr/bin:/bin'),LD_LIBRARY_PATH:process.env.LD_LIBRARY_PATH||'',LANG:'C.UTF-8',TMPDIR:root};
const data=path.join(root,'data');fs.mkdirSync(data);
let server;const result={task:'ENC-MARIADB-PERSISTENCE-TEST-001',base:'0e2488f5552bf7768a15711316b0de4d71b5d17e',startedAt:new Date().toISOString(),node:process.version,network:transport==='unix'?'Unix socket only; skip-networking':'TCP strictly 127.0.0.1; runner-selected ephemeral port',testsExit:null,serverRestartVerified:false,cleaned:false};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function command(executable,args,env=runtimeEnv,stream=false) {
 const child=spawn(executable,args,{cwd:project,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
 child.stdout.on('data',b=>{stdout+=b;if(stream)process.stdout.write(b);});child.stderr.on('data',b=>{stderr+=b;if(stream)process.stderr.write(b);});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 return {code,stdout,stderr};
}
async function start() {
 const args=['--no-defaults','--basedir='+basedir,'--datadir='+data,'--socket='+(transport==='unix'?socketPath:''),'--pid-file='+path.join(root,'mysql.pid'),'--log-error='+path.join(root,'mariadb.log'),...(transport==='unix'?['--skip-networking']:['--bind-address=127.0.0.1','--port='+port]),'--skip-log-bin','--innodb-use-native-aio=0','--innodb-flush-log-at-trx-commit=1','--innodb-buffer-pool-size=64M','--max-connections=20'];
 if(process.getuid?.()===0)args.push('--user=root');
 server=spawn(daemon,args,{env:runtimeEnv,stdio:'ignore'});let spawnError;server.once('error',e=>spawnError=e);
 const deadline=Date.now()+20000;
 while(Date.now()<deadline){if(spawnError)throw spawnError;if(server.exitCode!==null)throw Error('LOCAL_MARIADB_EXITED');try{return await mysql.createConnection({...endpoint,user:'root',multipleStatements:true,connectTimeout:500});}catch{await pause(100);}}
 throw Error('LOCAL_MARIADB_START_TIMEOUT');
}
async function stop(){if(!server || server.exitCode!==null)return;const child=server;const ended=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');let timer;try{await Promise.race([ended,new Promise(r=>{timer=setTimeout(r,10000);})]);}finally{clearTimeout(timer);}if(child.exitCode===null){child.kill('SIGKILL');await ended;}}
try {
 const bootstrap=await command(install,['--no-defaults','--basedir='+basedir,'--datadir='+data,'--auth-root-authentication-method=normal','--skip-test-db',...(process.getuid?.()===0?['--user=root']:[])]);
 if(bootstrap.code!==0)throw Error('LOCAL_MARIADB_BOOTSTRAP_FAILED: '+bootstrap.stderr.slice(-1000));
 const entry=path.join(root,'application-under-test.mjs');
 buildSync({entryPoints:[path.join(project,'tests/support/mariadb-persistence-entry.ts')],bundle:true,platform:'node',format:'esm',packages:'external',outfile:entry});
 const source=fs.readFileSync(path.join(project,'src/db/mariadb.ts'),'utf8');
 const from=source.indexOf('export function businessFromRow('),to=source.indexOf('export async function dbLoadAllBusinesses',from);
 if(from<0||to<from)throw Error('SERIALIZER_EXTRACTION_FAILED');
 fs.writeFileSync(path.join(root,'serializer-under-test.mjs'),transformSync(source.slice(from,to),{loader:'ts',format:'esm',target:'node22'}).code);
 let admin=await start();
 const [[info]]=await admin.query('SELECT VERSION() AS version, @@skip_networking AS skip_networking, @@bind_address AS bound, @@datadir AS data_path');
 if(transport==='unix' && Number(info.skip_networking)!==1)throw Error('TCP_MUST_BE_DISABLED');
 if(transport==='loopback' && info.bound!=='127.0.0.1')throw Error('LOOPBACK_ONLY_REQUIRED');
 if(fs.realpathSync(info.data_path)!==fs.realpathSync(data))throw Error('RUNNER_OWNED_DATADIR_REQUIRED');result.mariadb=info.version;
 await admin.query(fs.readFileSync(path.join(project,'tests/fixtures/mariadb-persistence-001.sql'),'utf8'));
 const password=randomBytes(24).toString('hex'),user='enc_fixture_writer',database='u293982346_encarmentest';
 await admin.query("CREATE USER ?@'localhost' IDENTIFIED BY ?",[user,password]);
 await admin.query("GRANT SELECT, INSERT, UPDATE ON `u293982346_encarmentest`.`businesses` TO ?@'localhost'",[user]);
 await admin.query("GRANT SELECT ON `u293982346_encarmentest`.`encarmen_environment_marker` TO ?@'localhost'",[user]);
 await admin.end();
 fs.writeFileSync(path.join(root,'connection.json'),JSON.stringify({...endpoint,transport,user,password,database}),{mode:0o600});
 const testEnv={PATH:runtimeEnv.PATH,LANG:runtimeEnv.LANG,ENC_MARIADB_TEST_ROOT:root,APP_ENV:'staging',DB_HOST:'localhost',DB_NAME:database,DB_USER:user,DB_PASSWORD:password,STAGING_READ_ONLY:'false',STAGING_DB_CONFIRMED:'true',STAGING_BUSINESS_WRITES_ENABLED:'true',STAGING_ALLOW_SCHEMA_INIT:'false',ENABLE_WP_SYNC:'false',STAGING_REQUIRE_MINIMAL_GRANTS:'true'};
 console.log('Local MariaDB '+result.mariadb+'; '+result.network+'; synthetic fixtures only.');
 const tests=await command(process.execPath,['--test','--test-concurrency=1','tests/mariadb-persistence-001.test.mjs'],testEnv,true);result.testsExit=tests.code;
 result.summary=Object.fromEntries([...tests.stdout.matchAll(/(?:ℹ|#) (tests|pass|fail|skipped) (\d+)/g)].map(match=>[match[1],Number(match[2])]));
 if(tests.code!==0)throw Error('PERSISTENCE_TESTS_FAILED');
 await stop();admin=await start();await admin.end();
 const durable=await command(process.execPath,['tests/support/mariadb-persistence-worker.mjs','read'],testEnv);
 if(durable.code!==0)throw Error('SERVER_RESTART_PERSISTENCE_FAILED');
 result.serverRestartVerified=true;console.log('PASS: durable fixture verified after restarting MariaDB itself.');
}catch(error){result.error=error.message;process.exitCode=1;console.error(error.message);
 const log=path.join(root,'mariadb.log');if(fs.existsSync(log)) console.error(fs.readFileSync(log,'utf8').split('\n').filter(line=>line.includes('[ERROR]')).slice(-8).join('\n').replaceAll(root,'[LOCAL_DISPOSABLE]'));
}finally{
 await stop();fs.rmSync(root,{recursive:true,force:true});result.cleaned=!fs.existsSync(root);result.finishedAt=new Date().toISOString();
 // Optional report path contains aggregate evidence, never the generated password/socket/datadir.
 if(process.env.ENC_MARIADB_REPORT)fs.writeFileSync(process.env.ENC_MARIADB_REPORT,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}
