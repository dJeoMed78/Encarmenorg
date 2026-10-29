import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {randomBytes,scryptSync} from 'node:crypto';
import {buildSync,transformSync} from 'esbuild';
import express from 'express';

// Never import/execute server.ts, initMariaDb or complete server bundles.
const root=fileURLToPath(new URL('../',import.meta.url));const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const executable=process.env.ENC_SECURITY_EXECUTABLE;
const source=read(executable || 'server.ts');const require=createRequire(path.join(root,'package.json'));
function execute(text,globals={}){const context=vm.createContext({module:{exports:{}},exports:{},require,URL,Buffer,console:{log(){},warn(){},error(){},info(){}},...globals});vm.runInContext(transformSync(text,{loader:'ts',format:'cjs',target:'node22'}).code,context);return context;}
const bundled=executable
 ? source.slice(source.indexOf('// src/server/adminSecurity.ts'),source.indexOf('// server.ts',source.indexOf('// src/server/adminSecurity.ts')))+'\nmodule.exports={registerAdminSecurity,environmentAdminProvider,ADMIN_PERMISSIONS};'
 : buildSync({entryPoints:[path.join(root,'src/server/adminSecurity.ts')],bundle:true,platform:'node',format:'cjs',packages:'external',write:false}).outputFiles[0].text;
const {registerAdminSecurity,environmentAdminProvider,ADMIN_PERMISSIONS}=execute(bundled).module.exports;
const password='synthetic-test-password-only';const salt=randomBytes(16);const hash=scryptSync(password,salt,64).toString('hex');
function provider(permissions=ADMIN_PERMISSIONS){return environmentAdminProvider({ENC_ADMIN_PUBLIC_ORIGIN:'https://fixture.invalid',ENC_ADMIN_CREDENTIALS_JSON:JSON.stringify({version:1,accounts:[{username:'fixture_owner',passwordHash:`scrypt$${salt.toString('hex')}$${hash}`,permissions}]})});}
function definition(name){const start=source.indexOf((executable?'function ':'export function ')+name);const end=source.indexOf('\n}',start)+2;assert.ok(start>=0);return source.slice(start,end).replace('export ','');}
function route(method,start){if(executable)start=start.replaceAll("'",'"');const a=source.indexOf('app.'+method+'('+start);assert.ok(a>=0,start);return source.slice(a,source.indexOf('\n});',a)+4);}
async function appTest(run,options={}){
 const app=express();const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'enc-sec3-'));let now=100000;const calls={init:0,saves:0,mutations:0};
 const containment=execute(definition('backupDownloadContainment')).backupDownloadContainment;app.use(containment);
 const auth=registerAdminSecurity(app,{provider:options.provider===false?undefined:options.provider||provider(),allowedOrigin:'https://fixture.invalid',writesReady:()=>options.writes!==false,now:()=>now,sessionMs:1000});
 app.use(express.json());
 execute([
  route('post',"'/api/mariadb/reconnect'"),route('post',"'/api/mariadb/sync-catalog'"),route('post',"'/api/admin/banner-and-logo'"),
  route('post',"'/api/emergency'"),route('delete',"'/api/emergency/:id'"),
  route('all',"['/api/admin/businesses-edit-pins'")
 ].join('\n'),{app,adminSecurity:auth,fs,path,Buffer,portalConfig:{},portalConfigPath:path.join(fixture,'portal_config.json'),__dirname:fixture,businessesCache:[{id:1081,name:'Synthetic'}],emergencyServicesCache:[],
  initMariaDb:async()=>{calls.init++;return true;},dbLoadAllBusinesses:async()=>[{id:1081,name:'Synthetic'}],dbSaveBusiness:async()=>{calls.saves++;return true;},isMariaDbActive:()=>false,
  dbSaveEmergencyService:async()=>true,dbDeleteEmergencyService:async()=>true});
 app.all(['/api/admin/portal-config','/admin/maintenance','/api/businesses/:id','/businesses/:id','/api/classifieds/approve-candidate','/classifieds/approve-candidate','/api/events/publish-candidates'],(_req,res)=>{calls.mutations++;res.json({success:true});});
 app.all(['/api/businesses','/api/categories','/api/ratings','/api/submit-business','/api/public/business-registrations'],(_req,res)=>res.json({success:true,public:true}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const request=async(url,method='GET',body,headers={})=>{const response=await fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined,redirect:'manual'});const text=await response.text();return {status:response.status,headers:response.headers,text,json:text?JSON.parse(text):null};};
 const login=async()=>{const response=await request('/api/admin/login','POST',{username:'fixture_owner',password});assert.equal(response.status,200);assert.match(response.json.token,/^[a-f0-9]{64}$/);return {'X-Encarmen-Admin-Token':response.json.token};};
 try{await run({request,login,calls,fixture,advance:()=>{now+=2000;}});}finally{await new Promise(r=>server.close(r));fs.rmSync(fixture,{recursive:true,force:true});}
}

test('No provider or malformed provider: fail closed without legacy credentials',async()=>{
 for(const env of [{},{ENC_ADMIN_CREDENTIALS_JSON:'{}'}, {ENC_ADMIN_CREDENTIALS_JSON:'invalid'}, {ENC_ADMIN_CREDENTIALS_JSON:JSON.stringify({version:1,accounts:[]})}])assert.equal(environmentAdminProvider(env),undefined);
 await appTest(async({request,calls})=>{const r=await request('/api/admin/login','POST',{username:'fixture_owner',password});assert.equal(r.status,503);assert.equal(r.json.success,false);assert.equal(calls.init,0);},{provider:false});
});
test('Real scrypt provider verifies synthetic password, exposes no hash and rejects incorrect password',async()=>{
 const p=provider();assert.ok(p);assert.equal(await p.authenticate('fixture_owner','incorrect-test-password'),null);assert.equal(await p.authenticate('unknown','incorrect-test-password'),null);assert.equal((await p.authenticate('fixture_owner',password)).username,'fixture_owner');assert.doesNotMatch(JSON.stringify(p.accounts),/password|scrypt|salt|hash/i);
});
test('Client-controlled headers, roles and flags cannot authorize administrative handlers',async()=>appTest(async({request,calls})=>{
 const targets=[['/api/admin/change-password','POST'],['/api/admin/portal-config','POST'],['/admin/maintenance','POST'],['/api/mariadb/reconnect','POST'],['/api/mariadb/sync-catalog','POST'],['/api/businesses/1081','PATCH'],['/businesses/1081','DELETE'],['/api/emergency','POST'],['/api/emergency/fixture','DELETE'],['/classifieds/approve-candidate','POST'],['/api/events/publish-candidates','POST']];
 for(const [url,method]of targets){const r=await request(url,method,{isAdmin:true,role:'admin',authenticated:true},{Authorization:'Bearer invented', 'x-admin-auth':'true','X-Encarmen-Admin-Token':'a'.repeat(64)});assert.equal(r.status,401,url);assert.equal(r.json.success,false);}
 assert.deepEqual(calls,{init:0,saves:0,mutations:0});
}));
test('Case variants, encoded admin path and aliases also require a server session',async()=>appTest(async({request})=>{
 for(const url of ['/API/ADMIN/ACCOUNTS','/api/%61dmin/accounts','/admin/maintenance','/api/admin/accounts/'])assert.equal((await request(url)).status,401,url);
}));
test('Positive login/session and accounts return only server-authorized identity',async()=>appTest(async({request,login})=>{
 const headers=await login();const session=await request('/api/admin/session','GET',undefined,headers);assert.equal(session.status,200);assert.equal(session.json.user.username,'fixture_owner');assert.ok(session.json.permissions.includes('admin:manage'));
 const accounts=await request('/api/admin/accounts','GET',undefined,headers);assert.equal(accounts.status,200);assert.doesNotMatch(accounts.text,/passwordHash|scrypt|salt/);assert.match(accounts.headers.get('Cache-Control'),/no-store/);
}));
test('Positive session reaches actual MariaDB handlers; absence never calls initialization',async()=>appTest(async({request,login,calls})=>{
 assert.equal((await request('/api/mariadb/reconnect','POST',{})).status,401);assert.equal(calls.init,0);
 const headers=await login();assert.equal((await request('/api/mariadb/reconnect','POST',{},headers)).status,200);assert.equal(calls.init,1);
 assert.equal((await request('/api/mariadb/sync-catalog','POST',{},headers)).status,410);assert.equal(calls.saves,0);
}));
test('Insufficient permission cannot be expanded with headers or JSON',async()=>appTest(async({request,login,calls})=>{
 const headers=await login();assert.equal((await request('/api/admin/portal-config','POST',{isAdmin:true},{...headers,'x-admin-auth':'true'})).status,403);assert.equal(calls.mutations,0);
 assert.equal((await request('/api/businesses/1081','PATCH',{description:'fixture'},headers)).status,200);
},{provider:provider(['business:manage'])}));
test('Administrative mutation gate defaults closed independently of valid login',async()=>appTest(async({request,login,calls})=>{
 const headers=await login();assert.equal((await request('/api/mariadb/reconnect','POST',{},headers)).status,503);assert.equal(calls.init,0);assert.equal((await request('/api/admin/session','GET',undefined,headers)).status,200);
},{writes:false}));
test('Password change is unavailable even with an authorized session',async()=>appTest(async({request,login})=>{
 const headers=await login();for(const method of ['GET','POST','PUT','PATCH','DELETE','HEAD']){const r=await request('/api/admin/change-password',method,['GET','HEAD'].includes(method)?undefined:{newPassword:'synthetic-replacement-only'},headers);assert.equal(r.status,503);}
 assert.equal((await request('/api/admin/session','GET',undefined,headers)).status,200);
}));
test('PIN list/generation/verification never return a PIN, including HEAD',async()=>appTest(async({request,login})=>{
 const headers=await login();for(const url of ['/api/admin/businesses-edit-pins','/api/admin/businesses/1081/generate-pin','/api/businesses/1081/verify-edit-pin']){
  for(const method of ['GET','POST','HEAD']){const r=await request(url,method,method==='POST'?{pin:'0000000000'}:undefined,headers);assert.equal(r.status,410);if(method!=='HEAD'){assert.equal(r.json.success,false);assert.equal(r.json.pin,undefined);assert.equal(r.json.valid,false);}}
 }
 assert.doesNotMatch(source,/const isMaster|savePinsToFile|Math\.random\(\).*PIN|Generado PIN de 10 dígitos/);
}));
test('Actual banner handler writes only fixtures and cannot execute Git even if requested',async()=>appTest(async({request,login,fixture})=>{
 const headers=await login();fs.writeFileSync(path.join(fixture,'existing-backup.zip'),'synthetic-existing-backup');
 const r=await request('/api/admin/banner-and-logo','POST',{bannerBase64:Buffer.from('synthetic banner').toString('base64'),logoBase64:Buffer.from('synthetic logo').toString('base64'),commitAndPush:true},headers);
 assert.equal(r.status,200);assert.equal(r.json.gitPushed,false);assert.equal(r.json.bannerUpdated,true);assert.equal(r.json.logoUpdated,true);assert.equal(fs.readFileSync(path.join(fixture,'existing-backup.zip'),'utf8'),'synthetic-existing-backup');
 assert.doesNotMatch(source,/execSync|git push|git commit|child_process/);
}));
test('Emergency handler requires verified identity in every environment',async()=>appTest(async({request,login})=>{
 const headers=await login();assert.equal((await request('/api/emergency','POST',{id:'fixture',name:'Synthetic emergency'},headers)).status,200);assert.equal((await request('/api/emergency/fixture','DELETE',undefined,headers)).status,200);
}));
test('Cross-origin requests reject; logout revokes and expiration invalidates sessions',async()=>appTest(async({request,login,advance})=>{
 const headers=await login();assert.equal((await request('/api/mariadb/reconnect','POST',{}, {...headers,Origin:'https://untrusted.invalid'})).status,403);
 assert.equal((await request('/api/admin/logout','POST',{},headers)).status,200);assert.equal((await request('/api/admin/session','GET',undefined,headers)).status,401);
 const second=await login();advance();assert.equal((await request('/api/admin/session','GET',undefined,second)).status,401);
}));
test('Login body validation, wrong password and rate limit reject without leaking details',async()=>appTest(async({request})=>{
 assert.equal((await request('/api/admin/login','POST',{username:'fixture_owner',password:'incorrect-password-only'})).status,401);
 assert.equal((await request('/api/admin/login','POST',{username:'fixture_owner',password,role:'admin'})).status,400);
 assert.equal((await request('/api/admin/login','POST',{username:'fixture_owner',password:'x'.repeat(3000)})).status,413);
 for(let i=0;i<6;i++){const r=await request('/api/admin/login','POST',{username:'fixture_owner',password:'incorrect-password-only'});assert.ok([401,429].includes(r.status));}
 assert.equal((await request('/api/admin/login','POST',{username:'fixture_owner',password})).status,429);
}));
test('Backup containment stays before authentication and denies ZIP/SQL even to valid admin',async()=>appTest(async({request,login})=>{
 const headers=await login();for(const url of ['/api/admin/download-source-zip','/api/download-backup','/hostinger_mariadb_setup.sql','/dist/backup.zip','/public/.env','/pins_db.json'])for(const method of ['GET','HEAD','POST']){const r=await request(url,method,method==='POST'?{}:undefined,headers);assert.equal(r.status,403,url);assert.match(r.headers.get('Cache-Control'),/no-store/);if(method!=='HEAD')assert.equal(r.json.error,'DOWNLOAD_DISABLED');}
 assert.ok(source.indexOf('app.use(backupDownloadContainment)')<source.search(/(?:const|var) adminSecurity = registerAdminSecurity/));
}));
test('Legitimate public directory, categories, ratings and registration remain public',async()=>appTest(async({request})=>{
 for(const url of ['/api/businesses','/api/categories','/api/ratings'])assert.equal((await request(url)).status,200);
 assert.equal((await request('/api/submit-business','POST',{synthetic:true})).status,401);
 for(const url of ['/api/ratings','/api/public/business-registrations'])assert.equal((await request(url,'POST',{synthetic:true})).status,200);
}));

function client(fetch){
 const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};};
 const localStorage=storage(),sessionStorage=storage();
 const context=execute(read('src/utils/adminAuth.ts'),{fetch,Headers,AbortController,setTimeout,clearTimeout,Event,sessionStorage,localStorage,window:{sessionStorage,localStorage,dispatchEvent(){}}});
 return {api:context.module.exports,localStorage,sessionStorage};
}
test('Client flags and saved usernames cannot mint authentication or verify passwords locally',async()=>{
 const {api,localStorage,sessionStorage}=client(async()=>{throw Error('synthetic unavailable');});
 for(const storage of [localStorage,sessionStorage]){storage.setItem('admin_authenticated','true');storage.setItem('admin_auth_expires_at',Date.now()+3600000);storage.setItem('admin_authenticated_user','fixture_owner');}
 api.saveAdminAuth('fixture_owner');assert.equal(api.isSessionAdminAuthenticated(),false);assert.equal(Object.keys(api.FALLBACK_ADMIN_HASHES).length,0);
 const result=await api.loginAdminUser('fixture_owner','synthetic-password');assert.equal(result.success,false);assert.equal(api.isSessionAdminAuthenticated(),false);
});
test('Client requires login plus verified server session, and only sends token to same-origin paths',async()=>{
 const calls=[];const token='b'.repeat(64);
 const {api}=client(async(url,options={})=>{calls.push({url,options});const data=url==='/api/admin/login'?{success:true,token}:url==='/api/admin/session'?{success:true,user:{username:'fixture_owner',role:'Administrador'},permissions:['admin:manage'],expiresAt:Date.now()+3600000}:{success:true};return {ok:true,status:200,json:async()=>data};});
 assert.equal((await api.loginAdminUser('fixture_owner',password)).success,true);assert.equal(api.isSessionAdminAuthenticated(),true);
 await api.adminFetch('/api/admin/portal-config');let call=calls.at(-1);assert.equal(call.options.headers.get('X-Encarmen-Admin-Token'),token);assert.equal(call.options.redirect,'error');
 await api.adminFetch('https://untrusted.invalid/api/admin');call=calls.at(-1);assert.equal(call.options.headers,undefined);
 api.clearAdminAuth();assert.equal(api.isSessionAdminAuthenticated(),false);assert.equal(calls.at(-1).url,'/api/admin/logout');
});
