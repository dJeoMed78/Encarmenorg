import fs from 'node:fs';
import path from 'node:path';
import {scryptSync, timingSafeEqual} from 'node:crypto';

export const STAGING_BUSINESS_DATABASE = 'u293982346_encarmentest';
export const PRODUCTION_DB_USER = 'u293982346_appuser';

export interface PrivateSnapshotOptions {
  connectionUser?: string;
  configPath?: string;
}

export function resolvePrivateStagingConfigPath(customPath?: string): string | null {
  try {
    if (customPath) {
      return path.resolve(customPath);
    }
    if (process.env.ENC_STAGING_CONFIG_FILE) {
      return path.resolve(process.env.ENC_STAGING_CONFIG_FILE);
    }
    const cwd = fs.realpathSync(process.cwd());
    const needle = path.sep + 'domains' + path.sep + 'staging.encarmen.org' + path.sep + 'hbuilds' + path.sep + 'versions' + path.sep;
    const i = cwd.indexOf(needle);
    if (i < 1 || path.basename(cwd) !== 'nodejs') return null;
    const root = path.join(cwd.slice(0, i), 'domains', 'staging.encarmen.org', 'hbuilds');
    if (!cwd.startsWith(path.join(root, 'versions') + path.sep)) return null;
    return path.join(root, 'config', '.env');
  } catch {
    return null;
  }
}

export function getPrivateStagingSnapshot(options?: PrivateSnapshotOptions): Record<string, string> | null {
  try {
    const p = resolvePrivateStagingConfigPath(options?.configPath);
    if (!p) return null;

    const stat = fs.lstatSync(p);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) return null;

    const values: Record<string, string> = {};
    const duplicates = new Set<string>();
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim().replace(/^export\s+/, '');
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const index = t.indexOf('=');
      const k = t.slice(0, index).trim();
      if (Object.hasOwn(values, k)) duplicates.add(k);
      values[k] = t.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    }

    const criticalKeys = [
      'APP_ENV',
      'DB_NAME',
      'DB_USER',
      'DB_HOST',
      'DB_PASSWORD',
      'STAGING_READ_ONLY',
      'STAGING_DB_CONFIRMED',
      'STAGING_BUSINESS_WRITES_ENABLED',
      'ENC_ADMIN_MUTATIONS_ENABLED',
      'PUBLIC_REGISTRATION_ENABLED',
      'ENC_ADMIN_PUBLIC_ORIGIN',
      'ENC_ADMIN_CREDENTIALS_JSON'
    ];
    if (criticalKeys.some(k => duplicates.has(k))) return null;

    if (values.APP_ENV !== 'staging') return null;
    if (values.DB_NAME !== STAGING_BUSINESS_DATABASE) return null;
    if (!values.DB_USER || values.DB_USER === PRODUCTION_DB_USER) return null;
    if (options?.connectionUser && values.DB_USER !== options.connectionUser) return null;
    if (!values.DB_PASSWORD) return null;
    if (values.ENC_ADMIN_PUBLIC_ORIGIN && values.ENC_ADMIN_PUBLIC_ORIGIN !== 'https://staging.encarmen.org') return null;

    return values;
  } catch {
    return null;
  }
}

// Revalidate the short-lived Staging write authorization on every request.
// Deleting/restoring the private window closes it even without a Node restart.
export function privateStagingBusinessWindowOpen(
  env?: Record<string, string | undefined>,
  options?: PrivateSnapshotOptions
): boolean {
  try {
    // If a non-process synthetic dictionary is provided without a test config path:
    if (env && env !== process.env && !options?.configPath && !process.env.ENC_STAGING_CONFIG_FILE) {
      const database = (env.DB_NAME || '').trim();
      const user = (env.DB_USER || '').trim();
      return env.APP_ENV === 'staging' &&
        database === STAGING_BUSINESS_DATABASE &&
        Boolean(user) && user !== PRODUCTION_DB_USER &&
        (!options?.connectionUser || user === options.connectionUser) &&
        env.STAGING_READ_ONLY === 'false' &&
        env.STAGING_DB_CONFIRMED === 'true' &&
        env.STAGING_BUSINESS_WRITES_ENABLED === 'true' &&
        env.ENC_ADMIN_MUTATIONS_ENABLED === 'true';
    }

    const connectionUser = options?.connectionUser || (env && env !== process.env ? env.DB_USER : undefined);
    const snapshot = getPrivateStagingSnapshot({ connectionUser, configPath: options?.configPath });
    if (!snapshot) return false;

    return snapshot.APP_ENV === 'staging' &&
      snapshot.DB_NAME === STAGING_BUSINESS_DATABASE &&
      snapshot.STAGING_READ_ONLY === 'false' &&
      snapshot.STAGING_DB_CONFIRMED === 'true' &&
      snapshot.STAGING_BUSINESS_WRITES_ENABLED === 'true' &&
      snapshot.ENC_ADMIN_MUTATIONS_ENABLED === 'true';
  } catch {
    return false;
  }
}

export function stagingBusinessConfiguration(env: Record<string, string | undefined>, productionUser: string): boolean {
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
