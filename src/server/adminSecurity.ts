import express, {type Request, type Response, type NextFunction} from 'express';
import {createHmac,randomBytes,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';

// Selective adaptation of ENC-ADMIN-AUTH-SECURITY-001: server-issued sessions,
// permission guard before legacy handlers, no client flags or legacy passwords.
const scrypt=promisify(derive);
export const ADMIN_PERMISSIONS=['admin:manage','business:manage','business:delete','business:publish','event:manage','classified:manage'] as const;
export interface Principal {username:string;permissions:string[];}
export interface CredentialProvider {authenticate:(username:string,password:string)=>Promise<Principal|null>;accounts:Array<{username:string;role:string;initial:string;avatarColor:string}>;}
export function environmentAdminProvider(env:Record<string,string|undefined>):CredentialProvider|undefined {
 try {
  const encoded=env.ENC_ADMIN_CREDENTIALS_JSON;
  if(!encoded || encoded.length>65536)return;
  const config=JSON.parse(encoded);
  const origin=new URL(env.ENC_ADMIN_PUBLIC_ORIGIN || '');
  if(origin.protocol!=='https:' || origin.username || origin.password || origin.pathname!=='/' || origin.search || origin.hash)return;
  if(config.version!==1 || !Array.isArray(config.accounts) || !config.accounts.length || config.accounts.length>20)return;
  const names=new Set<string>();
  const accounts:Array<{username:string;permissions:string[];salt:Buffer;hash:Buffer}>=config.accounts.map((account:any)=>{
   if(typeof account.username!=='string' || !/^[a-z0-9_.-]{1,64}$/i.test(account.username))throw Error('CONFIG');
   const username=account.username.toLowerCase();if(names.has(username))throw Error('CONFIG');names.add(username);
   const match=typeof account.passwordHash==='string' && account.passwordHash.match(/^scrypt\$([a-f0-9]{32,64})\$([a-f0-9]{128})$/i);
   if(!match || !Array.isArray(account.permissions) || !account.permissions.length || account.permissions.some((p:unknown)=>!ADMIN_PERMISSIONS.includes(p as any)))throw Error('CONFIG');
   return {username,permissions:[...new Set<string>(account.permissions)],salt:Buffer.from(match[1],'hex'),hash:Buffer.from(match[2],'hex')};
  });
  const dummy={salt:randomBytes(16),hash:randomBytes(64)};
  return {
   accounts:accounts.map(a=>({username:a.username,role:'Administrador',initial:a.username.slice(0,1),avatarColor:'from-sky-500 to-indigo-600'})),
   async authenticate(username,password){
    const account=accounts.find(a=>a.username===username.toLowerCase());const target=account || dummy;
    const actual=await scrypt(password,target.salt,64) as Buffer;
    const valid=timingSafeEqual(actual,target.hash);
    return valid && account ? {username:account.username,permissions:[...account.permissions]} : null;
   }
  };
 }catch{return;}
}

export function adminPermission(requestPath:string,method:string):string|null {
 let decoded=requestPath;
 try {for(let i=0;i<4 && decoded.includes('%');i++)decoded=decodeURIComponent(decoded);}catch{return 'admin:manage';}
 if(decoded.includes('%') || /[\0\r\n]/.test(decoded))return 'admin:manage';
 const path=decoded.replace(/\\/g,'/').replace(/\/{2,}/g,'/').replace(/\/$/,'').toLowerCase();
 const mutable=!['GET','HEAD','OPTIONS'].includes(method.toUpperCase());
 if(path==='/api/submit-business'&&mutable)return 'business:manage';
 if(path==='/api/upload-logo'&&mutable)return 'business:manage';
 if(/^\/(?:api\/)?admin(?:\/|$)/.test(path))return 'admin:manage';
 if(/^\/api\/(?:mariadb|database-status)(?:\/|$)/.test(path) || /^\/api\/(?:sync|webhook)(?:[-/]|$)/.test(path))return 'admin:manage';
 if(/^\/api\/businesses\/approve-(?:candidate|multiple-candidates)$/.test(path))return 'business:publish';
 if(method.toUpperCase()==='POST'&&/^\/api\/businesses\/(?:auto-search|auto-search-ai|parse-whatsapp-group)$/.test(path))return null;
 if(/^\/(?:api\/)?businesses\/[^/]+(?:\/(?:sync-wp|verify-edit-pin))?$/.test(path)&&mutable)return method.toUpperCase()==='DELETE'?'business:delete':'business:manage';
 if(/^\/(?:api\/)?classifieds(?:\/|$)/.test(path)&&mutable&&!(method.toUpperCase()==='POST'&&path==='/api/classifieds/radar-search'))return 'classified:manage';
 if(/^\/api\/events(?:\/|$)/.test(path)&&mutable&&!(method.toUpperCase()==='POST'&&path==='/api/events/radar-search'))return 'event:manage';
 if(/^\/api\/reports(?:\/|$)/.test(path)&&method.toUpperCase()!=='POST')return 'admin:manage';
 if(/^\/api\/emergency(?:\/|$)/.test(path)&&mutable)return 'admin:manage';
 return null;
}

export function registerAdminSecurity(app:express.Express,options:{provider?:CredentialProvider;providerResolver?:()=>CredentialProvider|undefined;providerVersion?:()=>string|undefined;allowedOrigin?:string;writesReady?:(req:Request,permission:string)=>boolean;now?:()=>number;sessionMs?:number}={}) {
 const sessions=new Map<string,{principal:Principal;expiresAt:number;providerVersion?:string}>();
 const attempts=new Map<string,{count:number;until:number}>();
 const sessionSecret=randomBytes(32);const now=options.now || Date.now;
 const digest=(value:string)=>createHmac('sha256',sessionSecret).update(value).digest('hex');
 const currentProvider=()=>options.providerResolver?options.providerResolver():options.provider;
 const currentVersion=()=>options.providerVersion?.();
 const fail=(res:Response,status:number,message:string)=>res.status(status).set('Cache-Control','no-store').json({success:false,message});
 const sameOrigin=(req:Request)=>{
  if(!req.get('Origin'))return true;
  try {const origin=new URL(req.get('Origin')!);const expected=options.allowedOrigin || req.protocol+'://'+req.get('host');return origin.origin===new URL(expected).origin && origin.username==='' && origin.password==='';}catch{return false;}
 };
 const read=(req:Request)=>{
  const token=req.get('X-Encarmen-Admin-Token') || '';
  if(!/^[a-f0-9]{64}$/.test(token))return;
  const key=digest(token),session=sessions.get(key);
  if(!session || session.expiresAt<=now()){sessions.delete(key);return;}
  if(options.providerVersion){
   try{const version=currentVersion();if(!version || version!==session.providerVersion){sessions.delete(key);return;}}
   catch{sessions.delete(key);return;}
  }
  return session;
 };
 app.post('/api/admin/login',(req,res,next)=>{if(!req.is('application/json'))return fail(res,415,'Envía JSON.');next();},express.json({limit:'2kb',strict:true}),async(req,res)=>{
  if(!sameOrigin(req))return fail(res,403,'Origen no permitido.');
  const time=now(),key=digest(req.ip || req.socket.remoteAddress || 'unknown');
  for(const [k,v]of attempts)if(v.until<=time)attempts.delete(k);
  if(attempts.size>=1000&&!attempts.has(key))return fail(res,429,'Demasiados intentos.');
  const window=attempts.get(key)||{count:0,until:time+60000};attempts.set(key,window);
  if(++window.count>5){res.setHeader('Retry-After','60');return fail(res,429,'Demasiados intentos.');}
  const provider=currentProvider();
  if(!provider)return fail(res,503,'Acceso administrativo no configurado de forma segura.');
  const body=req.body;
  if(!body || Array.isArray(body) || Object.keys(body).some(k=>!['username','password'].includes(k)) || typeof body.username!=='string' || !/^[a-z0-9_.-]{1,64}$/i.test(body.username) || typeof body.password!=='string' || body.password.length<12 || body.password.length>200)return fail(res,400,'Datos de acceso inválidos.');
  try {
   const principal=await provider.authenticate(body.username,body.password);
   if(!principal)return fail(res,401,'Usuario o contraseña incorrectos.');
   if(typeof principal.username!=='string' || !Array.isArray(principal.permissions) || principal.permissions.some(p=>!ADMIN_PERMISSIONS.includes(p as any)))return fail(res,503,'Proveedor de identidad no disponible.');
   for(const [k,v]of sessions)if(v.expiresAt<=time)sessions.delete(k);
   if(sessions.size>=1000)return fail(res,503,'Sesiones no disponibles.');
   const token=randomBytes(32).toString('hex'),expiresAt=time+Math.max(1,Math.min(options.sessionMs || 6*3600000,6*3600000));
   sessions.set(digest(token),{principal:{username:principal.username,permissions:[...principal.permissions]},expiresAt,providerVersion:currentVersion()});
   return res.set('Cache-Control','no-store').json({success:true,token});
  }catch{return fail(res,503,'No se pudo verificar la identidad.');}
 });
 app.get('/api/admin/session',(req,res)=>{const session=read(req);if(!session)return fail(res,401,'Sesión ausente o vencida.');return res.set('Cache-Control','no-store').json({success:true,user:{username:session.principal.username,role:'Administrador'},permissions:session.principal.permissions,expiresAt:session.expiresAt});});
 app.post('/api/admin/logout',(req,res)=>{if(!sameOrigin(req))return fail(res,403,'Origen no permitido.');const token=req.get('X-Encarmen-Admin-Token') || '';sessions.delete(digest(token));return res.set('Cache-Control','no-store').json({success:true});});
 app.use((req:Request,res:Response,next:NextFunction)=>{
  const required=adminPermission(req.path,req.method);if(!required)return next();
  if(!sameOrigin(req))return fail(res,403,'Origen no permitido.');
  const session=read(req);if(!session)return fail(res,401,'Sesión ausente o vencida.');
  if(!session.principal.permissions.includes(required))return fail(res,403,'Permisos insuficientes.');
  if(!['GET','HEAD','OPTIONS'].includes(req.method) && !options.writesReady?.(req,required))return fail(res,503,'Operación bloqueada hasta habilitar administración segura.');
  res.setHeader('Cache-Control','no-store');next();
 });
 // No password is changed here, even for an administrator. Rotation is out-of-band.
 app.all('/api/admin/change-password',(_req,res)=>fail(res,503,'La rotación de credenciales requiere el procedimiento seguro del servidor.'));
 app.get('/api/admin/accounts',(_req,res)=>res.set('Cache-Control','no-store').json({success:true,accounts:currentProvider()?.accounts || []}));
 app.use('/api/admin/login',(error:any,_req:Request,res:Response,_next:NextFunction)=>fail(res,error?.status===413?413:400,'Cuerpo de acceso inválido o demasiado grande.'));
 return {isAuthorized:(req:Request,permission='business:manage')=>Boolean(read(req)?.principal.permissions.includes(permission))};
}
