// ENC-034 — narrow, short-lived Staging-only ratings write lane.
// Config is read from a private, validated Hostinger snapshot on every call.
// This function does NOT authorize schema creation or general application writes.
import { STAGING_BUSINESS_DATABASE } from '../server/stagingBusinessSecurity';

export function stagingRatingsWindowValid(snapshot: Record<string,string> | null, user: string | null, now = Date.now()): boolean {
  if (!snapshot || !user) return false;
  if (snapshot.APP_ENV !== 'staging' ||
      snapshot.DB_NAME !== STAGING_BUSINESS_DATABASE ||
      snapshot.DB_USER !== user ||
      user === 'u293982346_appuser' ||
      snapshot.STAGING_READ_ONLY !== 'false' ||
      snapshot.STAGING_DB_CONFIRMED !== 'true' ||
      snapshot.STAGING_RATINGS_WRITES_ENABLED !== 'true' ||
      snapshot.RATINGS_SCHEMA_APPROVED !== 'true' ||
      snapshot.RATINGS_MODERATION_APPROVED !== 'true') return false;
  const backupId = String(snapshot.STAGING_RATINGS_BACKUP_ID || '');
  const backupChecked = Date.parse(String(snapshot.STAGING_RATINGS_BACKUP_CHECKED_AT || ''));
  const expires = Date.parse(String(snapshot.STAGING_RATINGS_WRITE_EXPIRES_AT || ''));
  if (!/^[a-zA-Z0-9._-]{12,128}$/.test(backupId)) return false;
  if (!Number.isFinite(backupChecked) || !Number.isFinite(expires)) return false;
  if (backupChecked > now || now - backupChecked > 30 * 60_000) return false;
  if (expires <= now || expires > now + 30 * 60_000) return false;
  return true;
}

// Public votes in Staging need a durable, independently revocable capability.
// This does not grant any other write route (especially business/classified writes).
// Moderator decisions continue to require the separate short-lived window above.
export function stagingRatingsPublicWriteValid(snapshot: Record<string,string> | null, user: string | null): boolean {
  if (!snapshot || !user) return false;
  return snapshot.APP_ENV === 'staging' &&
    snapshot.DB_NAME === STAGING_BUSINESS_DATABASE &&
    snapshot.DB_USER === user && user !== 'u293982346_appuser' &&
    snapshot.STAGING_DB_CONFIRMED === 'true' &&
    snapshot.STAGING_RATINGS_PUBLIC_WRITES_ENABLED === 'true' &&
    snapshot.RATINGS_SCHEMA_APPROVED === 'true' &&
    snapshot.RATINGS_MODERATION_APPROVED === 'true' &&
    /^[a-zA-Z0-9._-]{12,128}$/.test(String(snapshot.STAGING_RATINGS_BACKUP_ID || '')) &&
    Number.isFinite(Date.parse(String(snapshot.STAGING_RATINGS_BACKUP_CHECKED_AT || '')));
}
