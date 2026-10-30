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
