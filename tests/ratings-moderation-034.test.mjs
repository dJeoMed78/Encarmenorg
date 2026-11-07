import test from 'node:test';
import assert from 'node:assert/strict';
import { createRatingModerationRepository } from '../src/db/ratingModeration.ts';

function fakePool({ approved = [], pending = [], hasSchema = true, ratingExists = true, failWrite = false } = {}) {
  const log = [];
  let commit = 0, rollback = 0, released = 0;
  const connection = {
    async query(sql, values = []) {
      log.push({ sql, values });
      if (sql.includes('information_schema.TABLES')) return [[
        { TABLE_NAME: 'business_ratings', ENGINE: 'InnoDB' },
        ...(hasSchema ? [{ TABLE_NAME: 'business_rating_moderation', ENGINE: 'InnoDB' }] : [])]];
      if (sql.startsWith('SHOW FULL COLUMNS')) return [[
        { Field: 'rating_id' }, { Field: 'status' }, { Field: 'moderated_at' }, { Field: 'moderated_by' }]];
      if (sql.startsWith('SHOW INDEX FROM business_rating_moderation')) return [[{Key_name:'PRIMARY',Column_name:'rating_id',Non_unique:0,Sub_part:null}]];
      if (sql.includes('INNER JOIN')) return [approved];
      if (sql.includes('LEFT JOIN')) return [pending];
      if (sql.includes('FOR UPDATE')) return [ratingExists ? [{ id: values[0] }] : []];
      if (sql.includes('INSERT INTO business_rating_moderation')) {
        if (failWrite) throw Error('synthetic SQL failure');
        return [{ affectedRows: 1 }];
      }
      throw Error('unexpected SQL '+sql);
    },
    async beginTransaction() { log.push({ sql: 'BEGIN' }); },
    async commit() { commit++; },
    async rollback() { rollback++; },
    release() { released++; }
  };
  return { pool: { async getConnection() { return connection; } }, log, state: () => ({commit,rollback,released}) };
}
test('public comments require approved moderation INNER JOIN and never expose visitor identifiers', async () => {
  const m = fakePool({approved:[{id:'r1',businessId:'966',comment:'Correcto',createdAt:'2026-11-07'}]});
  const result = await createRatingModerationRepository(m.pool).approved('966',20,0);
  assert.deepEqual(result,[{id:'r1',businessId:'966',comment:'Correcto',createdAt:'2026-11-07'}]);
  const sql=m.log.find(x=>x.sql.includes('INNER JOIN'));
  assert.match(sql.sql, /m.status = 'approved'/);
  assert.match(sql.sql, /WHERE r.business_id = \?/);
  assert.deepEqual(sql.values,['966',20,0]);
  assert.equal(m.state().released,1);
});
test('historical comments without moderation rows remain pending, never public',async()=>{
  const m=fakePool({pending:[{id:'r1',businessId:'966',rating:4,comment:'Viejo',createdAt:'2026-01-01',businessName:'Taller Ejemplo',category:'Automotriz',address:'Calle 5',colonia:'Centro'}]});
  const result=await createRatingModerationRepository(m.pool).pending(20,0);
  assert.deepEqual(result,[{id:'r1',businessId:'966',rating:4,comment:'Viejo',createdAt:'2026-01-01',businessName:'Taller Ejemplo',category:'Automotriz',address:'Calle 5',colonia:'Centro'}]);
  const sql=m.log.find(x=>x.sql.includes('LEFT JOIN'));
  assert.match(sql.sql,/m.rating_id IS NULL/);
  assert.match(sql.sql,/LEFT JOIN businesses b ON b.id = r.business_id/);
  assert.match(sql.sql,/b.name AS businessName/);
  assert.match(sql.sql,/b.category AS category/);
  assert.match(sql.sql,/b.address AS address/);
  assert.match(sql.sql,/b.colonia AS colonia/);
  assert.match(sql.sql,/r.rating/);
});
test('missing schema fails closed and releases connection',async()=>{
  const m=fakePool({hasSchema:false});
  await assert.rejects(createRatingModerationRepository(m.pool).approved('966',20,0), /COMMENTS_SCHEMA_REQUIRED/);
  assert.equal(m.state().released,1);
});
test('approval transaction commits with moderator identity',async()=>{
  const m=fakePool();
  assert.equal(await createRatingModerationRepository(m.pool).decide('rating1','approved','adminuser'),true);
  const write=m.log.find(x=>x.sql.includes('INSERT INTO business_rating_moderation'));
  assert.deepEqual(write.values,['rating1','approved','adminuser']);
  assert.deepEqual(m.state(),{commit:1,rollback:0,released:1});
});
test('missing rating rolls back and never writes moderation row',async()=>{
  const m=fakePool({ratingExists:false});
  assert.equal(await createRatingModerationRepository(m.pool).decide('missing','approved','adminuser'),false);
  assert.equal(m.log.some(x=>x.sql.includes('INSERT INTO business_rating_moderation')),false);
  assert.equal(m.state().rollback,1);
});
test('SQL failure rolls back; never claim approved',async()=>{
  const m=fakePool({failWrite:true});
  await assert.rejects(createRatingModerationRepository(m.pool).decide('rating1','approved','adminuser'),/synthetic SQL failure/);
  assert.deepEqual(m.state(),{commit:0,rollback:1,released:1});
});
