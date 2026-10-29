// Starts the FULL compiled server, but exclusively in a new fixture, no DB secrets or outbound network.
import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,symlinkSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawn} from 'node:child_process';
import {randomBytes,scryptSync,createHash} from 'node:crypto';import assert from 'node:assert/strict';
const root=mkdtempSync(join(tmpdir(),'enc-iv-http-'));writeFileSync(join(root,'IV_LOCAL_OWNED'),'yes');
const project=resolve('.');copyFileSync(process.argv[2],join(root,'server.mjs'));symlinkSync(join(project,'node_modules'),join(root,'node_modules'));
for(const dir of ['src/data','dist','public'])mkdirSync(join(root,dir),{recursive:true});
for(const file of ['events_db.json','classifieds_db.json','promotions_db.json','src/data/businesses_seed.json'])writeFileSync(join(root,file),'[]');
writeFileSync(join(root,'dist/index.html'),'<html><body>Isolated full server fixture</body></html>');writeFileSync(join(root,'public/backup.zip'),'synthetic archive');
const password='Synthetic-password-only';const salt=randomBytes(16);const passwordHash=`scrypt$${salt.toString('hex')}$${scryptSync(password,salt,64).toString('hex')}`;
const env={PATH:process.env.PATH,LANG:'C.UTF-8',TZ:'UTC',NODE_ENV:'production',APP_ENV:'staging',STAGING_READ_ONLY:'true',STAGING_DB_CONFIRMED:'false',STAGING_ALLOW_SCHEMA_INIT:'false',STAGING_BUSINESS_WRITES_ENABLED:'false',ENABLE_WP_SYNC:'false',ENC_ADMIN_MUTATIONS_ENABLED:'true',ENC_ADMIN_PUBLIC_ORIGIN:'https://staging.encarmen.org',ENC_ADMIN_CREDENTIALS_JSON:JSON.stringify({version:1,accounts:[{username:'owner',passwordHash,permissions:['admin:manage','business:manage','event:manage','classified:manage']},{username:'limited',passwordHash,permissions:['business:manage']}]})};
const child=spawn(process.execPath,['--require',join(project,'tests/support/iv-full-server-preload.cjs'),join(root,'server.mjs')],{cwd:root,env,stdio:['ignore','pipe','pipe']});
let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
const timeout=setTimeout(()=>child.kill('SIGKILL'),30000);const checks=[];
try{
 const port=await new Promise((resolve,reject)=>{const poll=setInterval(()=>{const match=log.match(/IV_READY:(\d+)/);if(match){clearInterval(poll);resolve(Number(match[1]));}},25);child.once('exit',code=>{clearInterval(poll);reject(Error('Full server stopped '+code+' '+log.slice(-1200)));});});
 const request=async(path,method='GET',token,body={})=>{const response=await fetch(`http://127.0.0.1:${port}${path}`,{method,headers:{'Content-Type':'application/json','CF-IPCountry':'MX',...(token?{'X-Encarmen-Admin-Token':token}:{})},...(!['GET','HEAD','OPTIONS'].includes(method)?{body:JSON.stringify(body)}:{})});return {status:response.status,text:await response.text()};};
 const login=async username=>{const result=await request('/api/admin/login','POST',undefined,{username,password});assert.equal(result.status,200,result.text);return JSON.parse(result.text).token;};
 const owner=await login('owner'),limited=await login('limited');checks.push('full-server scrypt login and limited session');
 for(const route of ['/api/events/radar-search','/api/events/radar-search/child','/api/events/%72adar-search','/api/classifieds/radar-search','/api/classifieds/example-radar-search'])for(const method of ['PUT','PATCH','DELETE'])for(const token of [undefined,'a'.repeat(64),limited,owner]){const result=await request(route,method,token);assert.ok([401,403,503].includes(result.status),`${method} ${route}: ${result.status}`);}
 checks.push('60 alternative-method radar mutations rejected across anonymous/forged/limited/owner identities');
 for(const method of ['GET','POST','OPTIONS']){const result=await request('/api/events/radar-search',method);assert.ok([200,400,404,503].includes(result.status),result.status);}
 checks.push('read/search methods do not enter mutating handlers');
 for(const path of ['/api/admin/portal-config','/api/mariadb/reconnect','/api/submit-business','/api/public/classifieds']){const result=await request(path,'POST',owner);assert.ok([401,403,503].includes(result.status),path);}
 assert.equal((await request('/api/admin/session','GET',owner)).status,200);assert.equal((await request('/api/admin/logout','POST',owner)).status,200);assert.equal((await request('/api/admin/session','GET',owner)).status,401);checks.push('logout revokes while writes are disabled');
 for(const path of ['/backup.zip','/api/download-backup','/api/admin/download-source-zip'])assert.equal((await request(path,'GET',owner)).status,403);checks.push('backup containment precedes admin authentication');
 for(const file of ['events_db.json','classifieds_db.json','src/data/businesses_seed.json'])assert.equal(readFileSync(join(root,file),'utf8'),'[]');checks.push('synthetic catalogs unchanged by attacks/startup');
 console.log(JSON.stringify({task:'ENC-INTEGRATION-VALIDATION-001',fullServer:true,checks,pass:checks.length,fail:0,database:'not configured; expected read-only denials',outboundNetwork:'blocked',bind:'127.0.0.1',productionAccessed:false},null,2));
}finally{clearTimeout(timeout);child.kill('SIGTERM');await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));}
