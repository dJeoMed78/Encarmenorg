import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import {createRatingsRepository} from '../src/db/mariadb.ts';
import {createRatingModerationRepository} from '../src/db/ratingModeration.ts';

// Real SQL test runs ONLY against an ephemeral GitHub Actions MariaDB service.
// Never provide production or Staging credentials to this test.
const enabled=process.env.ENC034_EPHEMERAL_DB_TEST==='true';
test('MariaDB real: insert, readback, duplicate reject, moderation, approval/rejection, historical privacy', {skip:!enabled},async()=>{
  assert.equal(process.env.ENC034_TEST_DB_HOST,'127.0.0.1');
  assert.equal(process.env.ENC034_TEST_DB_NAME,'enc034_ephemeral');
  const pool=mysql.createPool({host:'127.0.0.1',port:3306,user:'enc034_test',password:'local-ci-test-only',
    database:'enc034_ephemeral',waitForConnections:true,connectionLimit:3});
  try {
    await pool.query(`CREATE TABLE businesses (id VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY)
        ENGINE=InnoDB`);
    await pool.query(`CREATE TABLE business_ratings (
      id VARCHAR(64) NOT NULL PRIMARY KEY, business_id VARCHAR(64) NOT NULL,
      visitor_id VARCHAR(100) NOT NULL, rating TINYINT NOT NULL,
      comment TEXT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_business_ratings_biz_visitor(business_id,visitor_id)
    ) ENGINE=InnoDB`);
    await pool.query(`CREATE TABLE business_rating_moderation (
      rating_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
      status VARCHAR(16) NOT NULL, moderated_at DATETIME NULL, moderated_by VARCHAR(64) NULL,
      CONSTRAINT ck_enc034_status CHECK(status IN ('pending','approved','rejected','hidden'))
    ) ENGINE=InnoDB`);
    await pool.query('INSERT INTO businesses (id) VALUES (?)',['enc034-test-biz']);
    const ratingStore=createRatingsRepository(pool);
    const reviews=createRatingModerationRepository(pool);
    const visitor=createHash('sha256').update('enc034-ci-visitor').digest('hex');
    const stats=await ratingStore.insert('enc034-test-biz',visitor,4,'Comentario de integración aislada');
    assert.equal(stats.count,1);
    assert.equal(stats.average,4);
    const reread=await ratingStore.getBusiness('enc034-test-biz',visitor);
    assert.equal(reread.count,1);
    assert.equal(reread.hasRated,true);
    await assert.rejects(ratingStore.insert('enc034-test-biz',visitor,5,'Duplicado'),e=>e?.code==='ER_DUP_ENTRY');
    assert.equal((await reviews.approved('enc034-test-biz',20,0)).length,0);
    const pending=await reviews.pending(20,0);
    assert.equal(pending.length,1);
    const id=pending[0].id;
    assert.equal(await reviews.decide(id,'approved','enc034-admin'),true);
    assert.equal((await reviews.approved('enc034-test-biz',20,0)).length,1);
    assert.equal(await reviews.decide(id,'rejected','enc034-admin'),true);
    assert.equal((await reviews.approved('enc034-test-biz',20,0)).length,0);
    const [db]:any=await pool.query('SELECT DATABASE() AS db');
    assert.equal(db[0].db,'enc034_ephemeral');
  } finally { await pool.end(); }
});
