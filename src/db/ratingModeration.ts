// ENC-034: moderation store. Does not create or modify database schema.
// Approval is explicitly fail-closed until schema and controls are audited.
export type ModeratedComment = { id: string; businessId: string; comment: string; createdAt: string; rating?: number; businessName?: string; category?: string; address?: string; colonia?: string };
const fail = (code: string): never => { throw Object.assign(new Error(code), { code }); };
export function createRatingModerationRepository(db: { getConnection(): Promise<any> }) {
  async function withConnection<T>(work: (c: any) => Promise<T>): Promise<T> {
    const c = await db.getConnection();
    try {
      const [tables]: any = await c.query(
        "SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('business_ratings','business_rating_moderation')");
      if (tables.length !== 2 || tables.some((t: any) => t.ENGINE !== 'InnoDB') ||
          !['business_ratings','business_rating_moderation'].every(name => tables.some((t:any) => t.TABLE_NAME === name))) fail('COMMENTS_SCHEMA_REQUIRED');
      const [cols]: any = await c.query('SHOW FULL COLUMNS FROM business_rating_moderation');
      for (const field of ['rating_id', 'status', 'moderated_at', 'moderated_by']) {
        if (!cols.some((col: any) => col.Field === field)) fail('COMMENTS_SCHEMA_REQUIRED');
      }
      const [indexes]:any = await c.query('SHOW INDEX FROM business_rating_moderation');
      const primary = indexes.filter((i:any) => i.Key_name === 'PRIMARY');
      if (primary.length !== 1 || primary[0].Column_name !== 'rating_id' ||
          Number(primary[0].Non_unique) !== 0 || primary[0].Sub_part != null) fail('COMMENTS_SCHEMA_REQUIRED');
      return await work(c);
    } finally { c.release(); }
  }
  return {
    async approved(businessId: string, limit: number, offset: number): Promise<ModeratedComment[]> {
      return withConnection(async c => {
        const [rows]: any = await c.query(
          `SELECT r.id, r.business_id AS businessId, r.comment, r.created_at AS createdAt
           FROM business_ratings r INNER JOIN business_rating_moderation m ON m.rating_id = r.id
           WHERE r.business_id = ? AND m.status = 'approved'
             AND r.comment IS NOT NULL AND TRIM(r.comment) <> ''
           ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
          [businessId, limit, offset]);
        return rows.map((r: any) => ({ id: String(r.id), businessId: String(r.businessId), comment: String(r.comment), createdAt: String(r.createdAt) }));
      });
    },
    async pending(limit: number, offset: number): Promise<ModeratedComment[]> {
      return withConnection(async c => {
        // Existing comments without moderation rows are private by default,
        // including historical comments. Admin may review, never auto-approve.
        const [rows]: any = await c.query(
          `SELECT r.id, r.business_id AS businessId, r.rating, r.comment, r.created_at AS createdAt,
                  b.name AS businessName, b.category AS category, b.address AS address, b.colonia AS colonia
           FROM business_ratings r
           LEFT JOIN business_rating_moderation m ON m.rating_id = r.id
           LEFT JOIN businesses b ON b.id = r.business_id
           WHERE r.comment IS NOT NULL AND TRIM(r.comment) <> ''
             AND (m.rating_id IS NULL OR m.status = 'pending')
           ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`, [limit, offset]);
        return rows.map((r: any) => ({
          id: String(r.id), businessId: String(r.businessId), rating: Number(r.rating),
          comment: String(r.comment), createdAt: String(r.createdAt),
          businessName: String(r.businessName || ''), category: String(r.category || ''),
          address: String(r.address || ''), colonia: String(r.colonia || '')
        }));
      });
    },
    async decide(ratingId: string, status: 'approved' | 'rejected', adminId: string): Promise<boolean> {
      return withConnection(async c => {
        let began = false;
        try {
          await c.beginTransaction(); began = true;
          const [rows]: any = await c.query(
            "SELECT id FROM business_ratings WHERE id = ? AND comment IS NOT NULL AND TRIM(comment) <> '' FOR UPDATE",
            [ratingId]);
          if (rows.length !== 1) { await c.rollback(); began = false; return false; }
          await c.query(
            `INSERT INTO business_rating_moderation (rating_id,status,moderated_at,moderated_by)
             VALUES (?, ?, UTC_TIMESTAMP(), ?) ON DUPLICATE KEY UPDATE
             status=VALUES(status), moderated_at=VALUES(moderated_at), moderated_by=VALUES(moderated_by)`,
            [ratingId, status, adminId]);
          await c.commit(); began = false;
          return true;
        } catch (e) { if (began) { try { await c.rollback(); } catch { c.destroy?.(); } } throw e; }
      });
    }
  };
}
