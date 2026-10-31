/**
 * ENC-STAGING-PUBLIC-MEDIA-001 — escritura autorizada de imágenes públicas en uploaded_files (Staging).
 * No usa guardWrite() ni modifica isWritePermitted(): cada escritura exige canWrite() propio, base exacta,
 * motor InnoDB, prueba de aislamiento, transacción con bloqueo, INSERT sin upsert y lectura del BLOB antes de COMMIT.
 */
import {STAGING_BUSINESS_DATABASE} from '../server/stagingBusinessSecurity.ts';
import {verifyStagingIsolation} from '../server/stagingIsolationProof.ts';
import {MEDIA_FILENAME, MEDIA_MAX_BYTES, MEDIA_UPLOADS_PER_ATTEMPT, MEDIA_HOURLY_CAP, mediaFail, sha256} from '../server/publicMediaCore.ts';

const LOCK_NAME = 'encarmen:staging:public-media';

export function createStagingMediaStore(deps: any): any {
  const verify = deps.verifyIsolation ?? ((conn: any) => verifyStagingIsolation(conn, process.env));
  const perAttempt = deps.perAttempt ?? MEDIA_UPLOADS_PER_ATTEMPT;
  const hourlyCap = deps.hourlyCap ?? MEDIA_HOURLY_CAP;
  const assertWrite = () => {
    if (!deps.canWrite()) mediaFail(403, 'PUBLIC_MEDIA_DISABLED', 'La carga pública de imágenes no está habilitada de forma segura.');
  };

  async function connection(): Promise<any> {
    assertWrite();
    const conn = await deps.getConnection();
    try {
      const [db] = await conn.query('SELECT DATABASE() AS db_name');
      if (!db || !db[0] || db[0].db_name !== STAGING_BUSINESS_DATABASE) mediaFail(403, 'DATABASE_TARGET_MISMATCH', 'La conexión no corresponde a la base autorizada.');
      const [engine] = await conn.query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'uploaded_files'");
      if (!engine || !engine[0] || String(engine[0].ENGINE || '').toLowerCase() !== 'innodb') mediaFail(503, 'MEDIA_ENGINE_UNVERIFIED', 'Se requiere uploaded_files transaccional InnoDB; no se modificó el esquema.');
      const proof = await verify(conn);
      if (!proof || !proof.ok) mediaFail(403, 'STAGING_ISOLATION_UNPROVEN', 'No se comprobó el aislamiento de Staging (' + (proof && proof.code) + '); escritura bloqueada.');
      return conn;
    } catch (error) {
      conn.release();
      throw error;
    }
  }

  return {
    async saveVerified(input: any): Promise<any> {
      const match = MEDIA_FILENAME.exec(String(input.filename));
      if (!match || match[1] !== input.prefix || (match[2] === 'l' ? 'logo' : 'gallery') !== input.role) mediaFail(400, 'INVALID_MEDIA_NAME', 'Nombre de archivo no válido.');
      if (!Buffer.isBuffer(input.data) || input.data.length === 0 || input.data.length > MEDIA_MAX_BYTES) mediaFail(422, 'IMAGE_UNPROCESSABLE', 'Imagen no válida.');
      const digest = sha256(input.data);
      const conn = await connection();
      let locked = false;
      try {
        const [lock] = await conn.query('SELECT GET_LOCK(?, 5) AS acquired', [LOCK_NAME]);
        if (Number(lock && lock[0] && lock[0].acquired) !== 1) mediaFail(409, 'MEDIA_BUSY', 'Otra carga está en curso; reintenta.');
        locked = true;
        await conn.beginTransaction();
        try {
          const [hour] = await conn.query("SELECT COUNT(*) AS n FROM uploaded_files WHERE filename LIKE 'pub-%' AND created_at > (NOW() - INTERVAL 1 HOUR)");
          if (Number(hour && hour[0] && hour[0].n) >= hourlyCap) mediaFail(429, 'MEDIA_CAPACITY', 'Se alcanzó el límite temporal de cargas; intenta más tarde.');
          const [mine] = await conn.query('SELECT filename FROM uploaded_files WHERE filename LIKE ?', ['pub-' + input.prefix + '-' + (input.role === 'logo' ? 'l' : 'g') + '-%']);
          const used = Array.isArray(mine) ? mine.length : 0;
          if (used >= perAttempt[input.role]) mediaFail(409, input.role === 'logo' ? 'MEDIA_LOGO_LIMIT' : 'MEDIA_GALLERY_LIMIT', 'Se alcanzó el límite de cargas de este registro.');
          assertWrite();
          await conn.query('INSERT INTO uploaded_files (filename, mime_type, data) VALUES (?, ?, ?)', [input.filename, input.mimeType, input.data]);
          const [saved] = await conn.query('SELECT mime_type, data FROM uploaded_files WHERE filename = ?', [input.filename]);
          const row = saved && saved[0];
          const bytes = row && (Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data || ''));
          if (!row || row.mime_type !== input.mimeType || !bytes || bytes.length !== input.data.length || sha256(bytes) !== digest) {
            mediaFail(503, 'MEDIA_READBACK_FAILED', 'No se verificó la imagen en MariaDB; no se confirmó la carga.');
          }
          assertWrite();
          await conn.commit();
        } catch (error: any) {
          try { await conn.rollback(); } catch { /* conexión ya cerrada */ }
          if (error && typeof error.status === 'number' && typeof error.code === 'string') throw error;
          mediaFail(503, 'MEDIA_WRITE_UNCONFIRMED', 'No se confirmó el guardado de la imagen; reintenta.');
        }
        return {filename: input.filename, sha256: digest, bytes: input.data.length};
      } finally {
        if (locked) {
          try { await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]); } catch { /* el bloqueo expira solo */ }
        }
        conn.release();
      }
    },

    /** Lectura independiente (otro viaje al pool) tras el COMMIT. */
    async readBack(filename: string): Promise<any> {
      const pool = deps.getPool();
      if (!pool) mediaFail(503, 'MEDIA_STORAGE_UNAVAILABLE', 'MariaDB no está disponible.');
      const [rows] = await pool.query('SELECT mime_type, data FROM uploaded_files WHERE filename = ?', [filename]);
      if (!rows || !rows[0]) return null;
      return {mimeType: rows[0].mime_type, data: Buffer.isBuffer(rows[0].data) ? rows[0].data : Buffer.from(rows[0].data || '')};
    },

    /** Cada referencia debe existir como BLOB WebP real (cabecera RIFF/WEBP), perteneciente al intento. Un placeholder no cuenta. */
    async verifyOwned(prefix: string, filenames: any): Promise<void> {
      if (!Array.isArray(filenames) || filenames.length === 0) return;
      for (const name of filenames) {
        const match = MEDIA_FILENAME.exec(String(name));
        if (!match || match[1] !== prefix) mediaFail(400, 'INVALID_REGISTRATION', 'Una imagen no pertenece a este registro.');
      }
      const pool = deps.getPool();
      if (!pool) mediaFail(503, 'MEDIA_STORAGE_UNAVAILABLE', 'MariaDB no está disponible; no se guardó nada.');
      let rows: any = null;
      try {
        const result = await pool.query('SELECT filename, mime_type, LENGTH(data) AS bytes, HEX(SUBSTRING(data, 1, 12)) AS head FROM uploaded_files WHERE filename IN (?)', [filenames]);
        rows = result[0];
      } catch {
        mediaFail(503, 'MEDIA_STORAGE_UNAVAILABLE', 'No se pudieron verificar las imágenes en MariaDB; no se guardó nada.');
      }
      const found = new Map();
      for (const row of Array.isArray(rows) ? rows : []) found.set(String(row.filename), row);
      for (const name of filenames) {
        const row = found.get(name);
        const valid = row && row.mime_type === 'image/webp' && Number(row.bytes) > 0 && Number(row.bytes) <= MEDIA_MAX_BYTES && /^52494646[0-9A-F]{8}57454250$/i.test(String(row.head || ''));
        if (!valid) mediaFail(422, 'MEDIA_NOT_FOUND', 'Una imagen del registro no existe o no es válida en el servidor. Vuelve a subirla.');
      }
    },
  };
}
