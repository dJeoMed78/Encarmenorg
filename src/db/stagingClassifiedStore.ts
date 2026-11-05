import {STAGING_BUSINESS_DATABASE} from '../server/stagingBusinessSecurity';
import {verifyStagingIsolation} from '../server/stagingIsolationProof';

export type ClassifiedCreateResult = 'created' | 'duplicate' | 'blocked' | 'error';

export function stagingClassifiedWindowValid(
  snapshot: Record<string, string> | null,
  connectedUser: string | null,
  now = Date.now()
): boolean {
  if (!snapshot || !connectedUser) return false;
  if (snapshot.APP_ENV !== 'staging' ||
      snapshot.DB_NAME !== STAGING_BUSINESS_DATABASE ||
      snapshot.DB_USER !== connectedUser ||
      snapshot.DB_USER === 'u293982346_appuser' ||
      snapshot.STAGING_READ_ONLY !== 'true' ||
      snapshot.STAGING_DB_CONFIRMED !== 'true' ||
      snapshot.STAGING_CLASSIFIED_WRITES_ENABLED !== 'true') return false;

  // Private, short-lived operator attestation; not a substitute for verifying
  // the actual backup, database identity and privileges at run time.
  const backupId = String(snapshot.STAGING_CLASSIFIED_BACKUP_ID || '');
  const checked = Date.parse(String(snapshot.STAGING_CLASSIFIED_BACKUP_CHECKED_AT || ''));
  const until = Date.parse(String(snapshot.STAGING_CLASSIFIED_WRITE_EXPIRES_AT || ''));
  if (!/^[a-zA-Z0-9._-]{12,128}$/.test(backupId)) return false;
  if (!Number.isFinite(checked) || !Number.isFinite(until)) return false;
  if (checked > now || now - checked > 30 * 60_000) return false;
  if (until <= now || until > now + 60 * 60_000) return false;
  return true;
}

export function createStagingClassifiedStore(deps: {
  getConnection: () => Promise<any>;
  getSnapshot: () => Record<string, string> | null;
  getUser: () => string | null;
  verifyIsolation?: (conn: any, snapshot: Record<string, string>) => Promise<{ok: boolean; code: string}>;
  now?: () => number;
}) {
  const clock = deps.now || Date.now;
  const verify = deps.verifyIsolation || ((conn: any, snapshot: Record<string, string>) =>
    verifyStagingIsolation(conn, {...process.env, ...snapshot}));
  const enabled = () => stagingClassifiedWindowValid(deps.getSnapshot(), deps.getUser(), clock());

  return {
    canWrite: enabled,
    async create(ad: any): Promise<ClassifiedCreateResult> {
      // Public approval always prepares 'active'; diagnostic probe uses only hidden 'trash'.
      if (!ad || !['active', 'trash'].includes(String(ad.status))) return 'blocked';
      if (!enabled()) return 'blocked';
      let conn: any;
      let began = false;
      try {
        conn = await deps.getConnection();
        const snapshot = deps.getSnapshot();
        if (!stagingClassifiedWindowValid(snapshot, deps.getUser(), clock())) return 'blocked';
        const [db]: any = await conn.query('SELECT DATABASE() AS db_name');
        if (db?.[0]?.db_name !== STAGING_BUSINESS_DATABASE) return 'blocked';
        const [table]: any = await conn.query(
          "SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'classifieds'"
        );
        if (table?.length !== 1 || String(table[0].ENGINE).toLowerCase() !== 'innodb') return 'blocked';
        const [primary]: any = await conn.query(
          "SELECT COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'classifieds' AND INDEX_NAME = 'PRIMARY'"
        );
        if (primary?.length !== 1 || primary[0].COLUMN_NAME !== 'id' ||
            Number(primary[0].NON_UNIQUE) !== 0 || Number(primary[0].SEQ_IN_INDEX) !== 1) return 'blocked';
        const isolation = await verify(conn, snapshot!);
        if (!isolation.ok || !enabled()) return 'blocked';
        await conn.beginTransaction();
        began = true;
        const raw = JSON.stringify(ad);
        const [insert]: any = await conn.query(
          'INSERT INTO classifieds (id, title, category, subcategory, price, price_type, phone, whatsapp, colonia, status, user_token, raw_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            String(ad.id), ad.title || '', ad.category || '', ad.subcategory || '',
            ad.price !== undefined && ad.price !== null ? Number(ad.price) : null,
            ad.priceType || 'fixed', ad.phone || '', ad.whatsapp || '', ad.colonia || '',
            ad.status || 'active', ad.userToken || '', raw
          ]
        );
        if (insert?.affectedRows !== 1) return 'error';
        const [rows]: any = await conn.query('SELECT id, raw_data, title, status FROM classifieds WHERE id = ? FOR UPDATE', [String(ad.id)]);
        if (rows?.length !== 1 || String(rows[0].id) !== String(ad.id) ||
            rows[0].title !== ad.title || rows[0].status !== String(ad.status || 'active') ||
            rows[0].raw_data !== raw) return 'error';
        if (!enabled()) return 'blocked';
        await conn.commit();
        began = false;
        return 'created';
      } catch (error: any) {
        if (error?.code === 'ER_DUP_ENTRY') return 'duplicate';
        return 'error';
      } finally {
        if (began) { try { await conn.rollback(); } catch {} }
        try { conn?.release(); } catch {}
      }
    }
  };
}
