/**
 * ENC-STAGING-WRITE-001-RECOVERY — comprobación de aislamiento de Staging (solo lectura).
 * Ninguna consulta modifica datos ni esquema. El resultado contiene únicamente códigos:
 * nunca grants, hosts, usuarios ni credenciales.
 */
export const PRODUCTION_DATABASE = 'u293982346_encarmenapp';
export const PRODUCTION_USER = 'u293982346_appuser';
export const STAGING_DATABASE = 'u293982346_encarmentest';
export const STAGING_HOSTNAME = 'staging.encarmen.org';
export const ENVIRONMENT_MARKER_TABLE = 'encarmen_environment_marker';

type Env = Record<string, string | undefined>;
export interface IsolationOptions { stagingDatabase?: string; productionDatabase?: string; productionUser?: string; stagingHostname?: string; }
export interface IsolationResult { ok: boolean; code: string; warnings: string[]; }
export interface ParsedGrant { privileges: string[]; schema: string; table: string; grantOption: boolean; wildcard: boolean; }
interface Resolved { value: string; conflict: boolean; }
interface GrantsEvaluation { code: string; warnings: string[]; }

const SAFE_PRIVILEGES = new Set(['SELECT', 'INSERT', 'UPDATE', 'USAGE']);
const HARMLESS_SCHEMAS = new Set(['information_schema', 'performance_schema']);

function newWarnings(): string[] {
  return [];
}

function resolve(env: Env, names: string[]): Resolved {
  const values = names.map((name) => (env[name] || '').trim()).filter(Boolean);
  return { value: values[0] || '', conflict: new Set(values).size > 1 };
}

function isMissingTable(error: any): boolean {
  return Boolean(error) && (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146);
}

/** Identificación inequívoca del entorno y bloqueo ante configuración incompleta o ambigua. */
export function checkStagingConfiguration(env: Env, options: IsolationOptions = {}): string {
  const staging = options.stagingDatabase || STAGING_DATABASE;
  if ((env.APP_ENV || '').trim().toLowerCase() !== 'staging') return 'ENV_NOT_STAGING';
  const database = resolve(env, ['DB_NAME', 'MYSQL_DATABASE', 'MARIADB_DATABASE']);
  const host = resolve(env, ['DB_HOST', 'MYSQL_HOST', 'MARIADB_HOST']);
  const user = resolve(env, ['DB_USER', 'MYSQL_USER', 'MARIADB_USER']);
  const password = resolve(env, ['DB_PASSWORD', 'MYSQL_PASSWORD', 'MARIADB_PASSWORD']);
  if (!database.value || !host.value || !user.value || !password.value) return 'CONFIG_INCOMPLETE';
  if (database.conflict || host.conflict || user.conflict) return 'CONFIG_AMBIGUOUS';
  if (database.value !== staging) return 'DB_NAME_NOT_STAGING';
  if (user.value === (options.productionUser || PRODUCTION_USER)) return 'DB_USER_IS_PRODUCTION';
  for (const name of ['APP_URL', 'PUBLIC_URL']) {
    const raw = (env[name] || '').trim();
    if (!raw) continue;
    let hostname = '';
    try {
      hostname = new URL(raw).hostname.toLowerCase();
    } catch {
      return 'APP_URL_INVALID';
    }
    if (hostname !== (options.stagingHostname || STAGING_HOSTNAME)) return 'APP_URL_NOT_STAGING';
  }
  if (env.ENABLE_WP_SYNC === 'true' || env.STAGING_ALLOW_SCHEMA_INIT === 'true') return 'AUTOMATIC_SYNC_OR_DDL_ENABLED';
  return '';
}

/** Interpreta una fila de SHOW GRANTS. Devuelve null si el formato no es el esperado (se bloquea). */
export function parseGrant(line: string): ParsedGrant | null {
  const match = String(line).match(/^GRANT\s+([\s\S]+?)\s+ON\s+([\s\S]+?)\s+TO\s/i);
  if (!match) return null;
  const privileges = match[1].replace(/\([^)]*\)/g, '').split(',').map((item) => item.trim().toUpperCase()).filter(Boolean);
  const object = match[2].trim();
  if (/^(PROCEDURE|FUNCTION|PACKAGE)\b/i.test(object)) return null;
  const cleaned = object.replace(/^TABLE\s+/i, '').replace(/`/g, '');
  const dot = cleaned.indexOf('.');
  if (dot <= 0 || dot === cleaned.length - 1) return null;
  const schemaRaw = cleaned.slice(0, dot);
  return {
    privileges,
    schema: schemaRaw.replace(/\\([_%])/g, '$1'),
    table: cleaned.slice(dot + 1),
    grantOption: /\bWITH\s+GRANT\s+OPTION\b/i.test(String(line)),
    wildcard: /(^|[^\\])%/.test(schemaRaw),
  };
}

/** Permisos efectivos del usuario MariaDB: nada global, nada fuera de la base de Staging. */
export function evaluateGrants(lines: string[], staging: string, production: string, requireMinimal: boolean): GrantsEvaluation {
  const warnings = newWarnings();
  if (!Array.isArray(lines) || lines.length === 0) return { code: 'GRANTS_UNREADABLE', warnings };
  let canInsert = false;
  let canUpdate = false;
  for (const line of lines) {
    const grant = parseGrant(line);
    if (!grant) return { code: 'GRANTS_UNPARSEABLE', warnings };
    if (grant.grantOption) return { code: 'GRANT_OPTION_PRESENT', warnings };
    if (grant.schema === '*') {
      if (grant.table !== '*' || grant.privileges.some((item) => item !== 'USAGE')) return { code: 'GLOBAL_PRIVILEGES', warnings };
      continue;
    }
    if (grant.wildcard) return { code: 'GRANT_SCHEMA_WILDCARD', warnings };
    if (grant.schema.toLowerCase() === production.toLowerCase()) return { code: 'GRANT_ON_PRODUCTION', warnings };
    if (grant.schema !== staging) return { code: 'GRANT_ON_OTHER_SCHEMA', warnings };
    const all = grant.privileges.includes('ALL PRIVILEGES') || grant.privileges.includes('ALL');
    if (grant.table === '*' || grant.table === 'businesses') {
      if (all || grant.privileges.includes('INSERT')) canInsert = true;
      if (all || grant.privileges.includes('UPDATE')) canUpdate = true;
    }
    if (all || grant.privileges.some((item) => !SAFE_PRIVILEGES.has(item))) {
      if (requireMinimal) return { code: 'BROAD_STAGING_PRIVILEGES', warnings };
      if (!warnings.includes('BROAD_STAGING_PRIVILEGES')) warnings.push('BROAD_STAGING_PRIVILEGES');
    }
  }
  if (!canInsert || !canUpdate) return { code: 'NO_WRITE_PRIVILEGE_ON_STAGING', warnings };
  return { code: '', warnings };
}

/** Si la cuenta ve esquemas ajenos (sobre todo producción), el aislamiento no está probado. */
export function evaluateSchemas(names: string[], staging: string, production: string): string {
  const visible = (Array.isArray(names) ? names : []).map((name) => String(name).toLowerCase());
  if (visible.includes(production.toLowerCase())) return 'PRODUCTION_SCHEMA_VISIBLE';
  if (!visible.includes(staging.toLowerCase())) return 'STAGING_SCHEMA_NOT_VISIBLE';
  if (visible.some((name) => name !== staging.toLowerCase() && !HARMLESS_SCHEMAS.has(name))) return 'UNEXPECTED_SCHEMA_VISIBLE';
  return '';
}

/** El propietario debe sembrar la marca de entorno dentro de la base; el código solo la lee. */
export function evaluateMarker(rows: any[], database: string): string {
  if (!Array.isArray(rows) || rows.length === 0) return 'ENVIRONMENT_MARKER_MISSING';
  if (rows.some((row) => String(row && row.env_name).toLowerCase() === 'production')) return 'MARKER_SAYS_PRODUCTION';
  if (rows.length !== 1) return 'ENVIRONMENT_MARKER_AMBIGUOUS';
  const marker = rows[0] || {};
  if (String(marker.env_name).toLowerCase() !== 'staging' || String(marker.db_name) !== database) return 'ENVIRONMENT_MARKER_MISMATCH';
  return '';
}

import {getPrivateStagingSnapshot} from './stagingBusinessSecurity.ts';

/** Comprobación completa. Falla cerrado: cualquier error o dato inesperado bloquea las escrituras. */
export async function verifyStagingIsolation(conn: any, env: Env, options: IsolationOptions = {}): Promise<IsolationResult> {
  const staging = options.stagingDatabase || STAGING_DATABASE;
  const production = options.productionDatabase || PRODUCTION_DATABASE;
  const warnings = newWarnings();
  const fail = (code: string) => ({ ok: false, code, warnings });
  let effectiveEnv = env;
  let configuration = checkStagingConfiguration(effectiveEnv, options);
  if (configuration && effectiveEnv === process.env) {
    const snapshot = getPrivateStagingSnapshot();
    if (snapshot) {
      effectiveEnv = { ...snapshot, ...env };
      configuration = checkStagingConfiguration(effectiveEnv, options);
    }
  }
  if (configuration) return fail(configuration);
  try {
    const [current] = await conn.query('SELECT DATABASE() AS db_name');
    const database = current && current[0] && current[0].db_name;
    if (!database) return fail('DATABASE_UNKNOWN');
    if (String(database).toLowerCase() === production.toLowerCase()) return fail('CONNECTED_TO_PRODUCTION');
    if (database !== staging) return fail('DATABASE_TARGET_MISMATCH');

    const [grantRows] = await conn.query('SHOW GRANTS FOR CURRENT_USER()');
    const lines = (grantRows || []).map((row: any) => String(Object.values(row || {})[0] || ''));
    const grants = evaluateGrants(lines, staging, production, env.STAGING_REQUIRE_MINIMAL_GRANTS === 'true');
    for (const warning of grants.warnings) warnings.push(warning);
    if (grants.code) return fail(grants.code);

    const [schemaRows] = await conn.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA');
    const schemas = evaluateSchemas((schemaRows || []).map((row: any) => row.SCHEMA_NAME ?? row.schema_name), staging, production);
    if (schemas) return fail(schemas);

    let markerRows: any[] = [];
    try {
      const [rows] = await conn.query('SELECT env_name, db_name FROM ' + ENVIRONMENT_MARKER_TABLE);
      markerRows = rows;
    } catch (error) {
      if (isMissingTable(error)) return fail('ENVIRONMENT_MARKER_MISSING');
      throw error;
    }
    const marker = evaluateMarker(markerRows, staging);
    if (marker) return fail(marker);
    return { ok: true, code: 'ISOLATION_PROVEN', warnings };
  } catch {
    return fail('ISOLATION_CHECK_FAILED');
  }
}
