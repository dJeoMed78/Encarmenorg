import {ISOLATION_MARKER} from '../../src/server/publicClassifieds.ts';
const NOW=new Date('2026-01-01T00:00:00Z');
export class FakePool {
  constructor(opts = {}) {
    this.now=opts.now||NOW;
    this.database = opts.database || 'enc_lab_classifieds';
    this.user = opts.user || 'lab@localhost';
    this.marker = opts.marker === undefined ? ISOLATION_MARKER : opts.marker;
    this.engine = opts.engine || 'InnoDB';
    this.grants = opts.grants || 'GRANT SELECT, INSERT, UPDATE ON `enc_lab_classifieds`.`public_classifieds` TO `lab`@`localhost`';
    this.rows = new Map();
    this.failInsert = false; this.failReadback = false; this.failSelect = false;
  }
  async getConnection(){const pool=this;let snapshot;return {query:(...args)=>pool.query(...args),beginTransaction:async()=>{snapshot=structuredClone(pool.rows);},commit:async()=>{},rollback:async()=>{pool.rows=snapshot;},release(){}};}
  async query(sql, params = []) {
    if (this.failOn && this.failOn.test(sql)) throw this.failError || new Error('fallo sql');
    if (/SELECT DATABASE\(\)/.test(sql)) return [[{ db_name: this.database }]];
    if (/^SELECT CURRENT_USER\(\)/.test(sql)) return [[{ 'CURRENT_USER()': this.user }]];
    if (/marker_value FROM/.test(sql)) return this.marker ? [[{ marker_value: this.marker }]] : [[]];
    if (/information_schema\.TABLES/.test(sql)) return this.engine ? [[{ ENGINE: this.engine }]] : [[]];
    if (/information_schema.STATISTICS/.test(sql))return [[{INDEX_NAME:'PRIMARY',COLUMN_NAME:'id'},{INDEX_NAME:'uq_key',COLUMN_NAME:'idempotency_key'}]];
    if (/SHOW GRANTS/.test(sql)) return [[{'Grants':this.grants}]];
    if (/CREATE TABLE/.test(sql)) return [{ affectedRows: 0 }];
    if (/INSERT INTO public_classifieds/.test(sql)) {
      if (this.failInsert) throw new Error('insert failed');
      const [id, idem, title, description, category, price, phone, wa, image, hash, expires] = params;
      if (this.rows.has(id)) { const e = new Error('dup'); e.code = 'ER_DUP_ENTRY'; throw e; }
      this.rows.set(id, { id, idempotency_key: idem, title, description, category, price, contact_phone: phone, contact_whatsapp: wa, image_url: image, status: 'active', owner_token_hash: hash, expires_at: expires, created_at: this.now,details_json:params[11] });
      return [{ affectedRows: 1 }];
    }
    if (/SELECT \* FROM public_classifieds WHERE idempotency_key/.test(sql)) {
      for (const row of this.rows.values()) if (row.idempotency_key === params[0]) return [[row]];
      return [[]];
    }
    if (/SELECT \* FROM public_classifieds WHERE id = \?/.test(sql)) {
      if (this.failReadback) throw new Error('readback failed');
      const row = this.rows.get(params[0]);
      return [row ? [row] : []];
    }
    if (/UPDATE public_classifieds SET status = 'expired'/.test(sql)) {
      for (const row of this.rows.values()) if (row.status === 'active' && new Date(row.expires_at) <= this.now) row.status = 'expired';
      return [{ affectedRows: 0 }];
    }
    if (/SELECT \* FROM public_classifieds WHERE status = 'active'/.test(sql)) {
      if (this.failSelect) throw new Error('select failed');
      return [[...this.rows.values()].filter((r) => r.status === 'active' && new Date(r.expires_at) > this.now)];
    }
    if (/UPDATE public_classifieds/.test(sql)) {
      const row=this.rows.get(params.at(-1));if(!row)return [{affectedRows:0}];
      const fields=sql.match(/SET (.*) WHERE id/)[1].split(', ').map(part=>part.split(' = ')[0]);fields.forEach((field,i)=>row[field]=params[i]);return [{affectedRows:1}];
    }
    throw new Error('SQL no simulado: ' + sql.slice(0, 80));
  }
}
