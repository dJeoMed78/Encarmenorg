import fs from 'node:fs';
import path from 'node:path';
// Revalidate the short-lived Staging write authorization on every request.
// Deleting/restoring the private window closes it even without a Node restart.
export function privateStagingBusinessWindowOpen(env:Record<string,string|undefined>):boolean {
  try {
    if (env.APP_ENV !== 'staging' || env.DB_NAME !== 'u293982346_encarmentest' ||
        !env.DB_USER || env.DB_USER === 'u293982346_appuser') return false;
    const cwd=fs.realpathSync(process.cwd());
    const needle=path.sep+'domains'+path.sep+'staging.encarmen.org'+path.sep+'hbuilds'+path.sep+'versions'+path.sep;
    const i=cwd.indexOf(needle);
    if (i < 1 || path.basename(cwd)!=='nodejs') return false;
    const root=path.join(cwd.slice(0,i),'domains','staging.encarmen.org','hbuilds');
    const p=path.join(root,'config','.env');
    const stat=fs.lstatSync(p);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077)!==0) return false;
    const values:Record<string,string>={};
    const duplicates=new Set<string>();
    for (const line of fs.readFileSync(p,'utf8').split(/\r?\n/)) {
      const t=line.trim().replace(/^export\s+/,'');
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const index=t.indexOf('=');
      const k=t.slice(0,index).trim();
      if (Object.hasOwn(values,k)) duplicates.add(k);
      values[k]=t.slice(index+1).trim().replace(/^['"]|['"]$/g,'');
    }
    const keys=['APP_ENV','DB_NAME','DB_USER','STAGING_READ_ONLY','STAGING_DB_CONFIRMED','STAGING_BUSINESS_WRITES_ENABLED','ENC_ADMIN_MUTATIONS_ENABLED'];
    if (keys.some(k=>duplicates.has(k))) return false;
    return values.APP_ENV==='staging' &&
      values.DB_NAME==='u293982346_encarmentest' &&
      values.DB_USER===env.DB_USER &&
      values.STAGING_READ_ONLY==='false' &&
      values.STAGING_DB_CONFIRMED==='true' &&
      values.STAGING_BUSINESS_WRITES_ENABLED==='true' &&
      values.ENC_ADMIN_MUTATIONS_ENABLED==='true';
  } catch {return false;}
}
import {scryptSync, timingSafeEqual} from 'node:crypto';
export const STAGING_BUSINESS_DATABASE = 'u293982346_encarmentest';
export function stagingBusinessConfiguration(env: Record<string,string|undefined>, productionUser: string): boolean {
  const database = (env.DB_NAME || env.MYSQL_DATABASE || env.MARIADB_DATABASE || '').trim();
  const user = (env.DB_USER || env.MYSQL_USER || env.MARIADB_USER || '').trim();
  return env.STAGING_READ_ONLY === 'false' && env.STAGING_DB_CONFIRMED === 'true' &&
    env.STAGING_BUSINESS_WRITES_ENABLED === 'true' && database === STAGING_BUSINESS_DATABASE && Boolean(user) && user !== productionUser;
}
export function verifyStagingAdmin(username: unknown, password: unknown, env: Record<string,string|undefined>) {
  if (typeof username !== 'string' || typeof password !== 'string' || password.length < 12 || password.length > 256) return {ok:false,configured:true};
  const normalized = username.trim().toLowerCase();
  const key = ['y','yuss'].includes(normalized) ? 'STAGING_ADMIN_Y_SCRYPT' : ['j','jeo'].includes(normalized) ? 'STAGING_ADMIN_J_SCRYPT' : '';
  if (!key) return {ok:false,configured:true};
  const match = (env[key] || '').match(/^scrypt\$([a-f0-9]{32,64})\$([a-f0-9]{128})$/i);
  if (!match) return {ok:false,configured:false};
  try {
    const expected = Buffer.from(match[2],'hex');
    const actual = scryptSync(password,Buffer.from(match[1],'hex'),64,{N:16384,r:8,p:1});
    return {ok:timingSafeEqual(actual,expected),configured:true};
  } catch { return {ok:false,configured:false}; }
}
export function createLoginLimiter() {
  const attempts = new Map<string,{count:number;expires:number}>();
  return (key:string, now=Date.now()) => {
    for (const [id,value] of attempts) if(value.expires <= now) attempts.delete(id);
    const current=attempts.get(key);
    if ((current?.count || 0) >= 5 || (!current && attempts.size >= 10000)) return false;
    attempts.set(key,{count:(current?.count || 0)+1,expires:current?.expires || now+15*60*1000});
    return true;
  };
}
