import test,{beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import {config,endpoint,modules,store,draft,serialize,adminPool,writerPool,canWrite,close} from './support/mariadb-persistence-context.mjs';

const count=async()=>Number((await adminPool.query('SELECT COUNT(*) AS total FROM businesses'))[0][0].total);
beforeEach(async()=>{
 await adminPool.query('DELETE FROM businesses');
 await adminPool.query('DELETE FROM encarmen_environment_marker');
 await adminPool.query('INSERT INTO encarmen_environment_marker VALUES (?, ?)', ['staging',config.database]);
});
after(close);
const errorCode=(code,uncertain)=>e=>{assert.equal(e.code,code);if(uncertain!==undefined)assert.equal(e.writeMayHaveSucceeded,uncertain);return true;};
async function wrappedConnection(intercept={}) {
 const conn=await writerPool.getConnection();
 return {query:(...args)=>intercept.query?intercept.query(conn,...args):conn.query(...args),beginTransaction:()=>conn.beginTransaction(),commit:()=>intercept.commit?intercept.commit(conn):conn.commit(),rollback:()=>conn.rollback(),release:()=>conn.release()};
}

test('Actual MariaDB: InnoDB, primary key and real default isolation proof',async()=>{
 const conn=await writerPool.getConnection();
 try {
  const proof=await modules.verifyStagingIsolation(conn,process.env);assert.equal(proof.ok,true);assert.equal(proof.code,'ISOLATION_PROVEN');assert.equal(proof.warnings.length,0);
  const [[row]]=await conn.query('SELECT VERSION() AS version, @@skip_networking AS disabled');assert.match(row.version,/MariaDB/);assert.equal(Number(row.disabled),config.transport==='unix'?1:0);
 }finally{conn.release();}
});
test('INSERT and real readback preserve independent channels and hide private idempotency metadata',async()=>{
 const created=await store().create(draft(),randomUUID());assert.equal(created.replayed,false);
 const [rows]=await adminPool.query('SELECT * FROM businesses WHERE id = ?',[String(created.business.id)]);
 assert.equal(rows.length,1);assert.equal(rows[0].phone,'5550000001');assert.equal(rows[0].whatsapp,'5550000002');
 assert.equal(serialize(rows[0])._stagingRegistrationId,undefined);assert.equal(serialize(rows[0])._stagingRegistrationDigest,undefined);
 await adminPool.query('UPDATE businesses SET raw_data = ? WHERE id = ?',[JSON.stringify({phone:'5559999991',whatsapp:'5559999992'}),String(created.business.id)]);
 const [changed]=await adminPool.query('SELECT * FROM businesses WHERE id = ?',[String(created.business.id)]);
 assert.equal(serialize(changed[0]).phone,'5550000001');assert.equal(serialize(changed[0]).whatsapp,'5550000002');
});
test('Partial UPDATE preserves untouched SQL contacts, rating and metadata',async()=>{
 const {business}=await store().create(draft(),randomUUID());
 await adminPool.query('UPDATE businesses SET rating = 4.25, reviews_count = 7 WHERE id = ?',[String(business.id)]);
 const saved=await store().update(business.id,{description:'Synthetic new description'});
 assert.equal(saved.business.phone,'5550000001');assert.equal(saved.business.whatsapp,'5550000002');assert.equal(saved.business.image,'/fixture.png');
 const [[row]]=await adminPool.query('SELECT * FROM businesses WHERE id = ?',[String(business.id)]);
 assert.equal(Number(row.rating),4.25);assert.equal(row.reviews_count,7);assert.equal(JSON.parse(row.raw_data).gallery[0],'/fixture-gallery.png');
 await store().update(business.id,{phone:'5550000003'});
 const [[updated]]=await adminPool.query('SELECT phone,whatsapp FROM businesses WHERE id = ?',[String(business.id)]);
 assert.equal(updated.phone,'5550000003');assert.equal(updated.whatsapp,'5550000002');
});
test('Idempotent retries return one row; changed payload with same key is rejected',async()=>{
 const id=randomUUID(),payload=draft();const a=await store().create(payload,id);const b=await store().create(payload,id);
 assert.equal(a.business.id,b.business.id);assert.equal(b.replayed,true);assert.equal(await count(),1);
 await assert.rejects(()=>store().create({...payload,name:'Changed synthetic payload'},id),errorCode('IDEMPOTENCY_CONFLICT'));
 assert.equal(await count(),1);
});
test('Name/contact duplicates and real primary-key duplicate leave existing contacts intact',async()=>{
 const a=await store().create(draft(),randomUUID());
 await assert.rejects(()=>store().create({...draft(),name:'Different fixture'},randomUUID()),errorCode('BUSINESS_DUPLICATE'));
 await assert.rejects(()=>adminPool.query('INSERT INTO businesses (id,name,phone) VALUES (?, ?, ?)',[String(a.business.id),'duplicate','5559999991']),e=>e.code==='ER_DUP_ENTRY');
 assert.equal(await count(),1);const [[row]]=await adminPool.query('SELECT phone FROM businesses WHERE id = ?',[String(a.business.id)]);assert.equal(row.phone,'5550000001');
});
test('Concurrent same-key registrations serialize with GET_LOCK: one insert plus replay',async()=>{
 const id=randomUUID(),payload=draft();const [a,b]=await Promise.all([store().create(payload,id),store().create(payload,id)]);
 assert.equal(a.business.id,b.business.id);assert.equal(Number(a.replayed)+Number(b.replayed),1);assert.equal(await count(),1);
});
test('Concurrent duplicate contacts with different keys: one winner and one 409',async()=>{
 const outcomes=await Promise.allSettled([store().create(draft('concurrent A'),randomUUID()),store().create(draft('concurrent B'),randomUUID())]);
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);const rejected=outcomes.find(r=>r.status==='rejected');assert.equal(rejected.reason.code,'BUSINESS_DUPLICATE');assert.equal(rejected.reason.status,409);assert.equal(await count(),1);
});
test('Concurrent partial updates lock the same row and preserve both independent changes',async()=>{
 const {business}=await store().create(draft(),randomUUID());
 await Promise.all([store().update(business.id,{description:'Concurrent description'}),store().update(business.id,{address:'Concurrent address'})]);
 const [[row]]=await adminPool.query('SELECT * FROM businesses WHERE id = ?',[String(business.id)]);
 assert.equal(row.description,'Concurrent description');assert.equal(row.address,'Concurrent address');assert.equal(row.phone,'5550000001');assert.equal(row.whatsapp,'5550000002');
});
test('Reserved slug conflict rolls back the attempted update',async()=>{
 const a=await store().create(draft('alpha'),randomUUID());const b=await store().create({...draft('beta'),phone:'5550000011',whatsapp:'5550000012'},randomUUID());
 await assert.rejects(()=>store().update(b.business.id,{slug:a.business.slug,phone:'5550000099'}),errorCode('SLUG_CONFLICT'));
 const [[row]]=await adminPool.query('SELECT * FROM businesses WHERE id = ?',[String(b.business.id)]);assert.equal(row.phone,'5550000011');assert.equal(serialize(row).slug,b.business.slug);
});
test('Connection error with invalid synthetic credentials cannot insert',async()=>{
 const unavailable=store({getConnection:()=>mysql.createConnection({...endpoint,user:config.user,password:'deliberately-invalid-synthetic-password',database:config.database,connectTimeout:500})});
 await assert.rejects(()=>unavailable.create(draft(),randomUUID()),e=>e.code==='ER_ACCESS_DENIED_ERROR');assert.equal(await count(),0);
});
test('Real connection destroyed after INSERT, before COMMIT: no committed row or false success',async()=>{
 const broken=store({getConnection:()=>wrappedConnection({query:async(conn,sql,params)=>{const result=await conn.query(sql,params);if(sql.startsWith('INSERT INTO businesses'))conn.destroy();return result;}})});
 await assert.rejects(()=>broken.create(draft(),randomUUID()),errorCode('BUSINESS_WRITE_UNCONFIRMED',false));assert.equal(await count(),0);
});
test('Lost acknowledgement after actual COMMIT is uncertain; same key reconciles without duplicates',async()=>{
 const requestId=randomUUID(),payload=draft();
 const uncertain=store({getConnection:()=>wrappedConnection({commit:async conn=>{await conn.commit();conn.destroy();throw Error('SYNTHETIC_ACK_LOST_AFTER_REAL_COMMIT');}})});
 await assert.rejects(()=>uncertain.create(payload,requestId),errorCode('BUSINESS_WRITE_UNCONFIRMED',true));assert.equal(await count(),1);
 const replay=await store().create(payload,requestId);assert.equal(replay.replayed,true);assert.equal(await count(),1);
});
test('Read-only capability rejects before acquiring a SQL connection',async()=>{
 let acquired=0;const readonly=store({canWrite:()=>false,getConnection:async()=>{acquired++;throw Error('MUST_NOT_CONNECT');}});
 await assert.rejects(()=>readonly.create(draft(),randomUUID()),errorCode('STAGING_BUSINESS_READ_ONLY'));assert.equal(acquired,0);assert.equal(await count(),0);
});
test('Wrong real database target is rejected before INSERT',async()=>{
 const wrong=store({getConnection:async()=>{const conn=await mysql.createConnection({...endpoint,user:'root',database:'mysql'});conn.release=()=>{void conn.end();};return conn;}});
 await assert.rejects(()=>wrong.create(draft(),randomUUID()),errorCode('DATABASE_TARGET_MISMATCH'));assert.equal(await count(),0);
});
test('Invalid marker and extra schema grants fail the real default isolation verifier',async()=>{
 await adminPool.query('UPDATE encarmen_environment_marker SET env_name = ?',['production']);
 await assert.rejects(()=>store().create(draft(),randomUUID()),errorCode('STAGING_ISOLATION_UNPROVEN'));assert.equal(await count(),0);
 await adminPool.query('UPDATE encarmen_environment_marker SET env_name = ?',['staging']);
 await adminPool.query('CREATE DATABASE enc_fixture_other');
 try {
  await adminPool.query("GRANT SELECT ON enc_fixture_other.* TO ?@'localhost'",[config.user]);
  await assert.rejects(()=>store().create(draft(),randomUUID()),errorCode('STAGING_ISOLATION_UNPROVEN'));assert.equal(await count(),0);
 }finally{await adminPool.query("REVOKE SELECT ON enc_fixture_other.* FROM ?@'localhost'",[config.user]);await adminPool.query('DROP DATABASE enc_fixture_other');}
});
test('Invalid configuration and automatic DDL flag are rejected without SQL writes',async()=>{
 const saved={...process.env};
 try{process.env.STAGING_ALLOW_SCHEMA_INIT='true';await assert.rejects(()=>store().create(draft(),randomUUID()),errorCode('STAGING_ISOLATION_UNPROVEN'));assert.equal(await count(),0);}
 finally{process.env.STAGING_ALLOW_SCHEMA_INIT=saved.STAGING_ALLOW_SCHEMA_INIT;}
 assert.equal(modules.checkStagingConfiguration({...saved,APP_ENV:'production'}),'ENV_NOT_STAGING');
 assert.equal(modules.stagingBusinessConfiguration({...saved,DB_NAME:'enc_fixture_other'},'u293982346_appuser'),false);
});
test('Missing table returns failure and does not initialize or silently seed it',async()=>{
 await adminPool.query('RENAME TABLE businesses TO businesses_held');
 try {await assert.rejects(()=>store().create(draft(),randomUUID()),errorCode('BUSINESS_ENGINE_UNVERIFIED'));const [[row]]=await adminPool.query("SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='businesses'");assert.equal(Number(row.total),0);}
 finally{await adminPool.query('RENAME TABLE businesses_held TO businesses');}
});
async function worker(mode){
 const child=spawn(process.execPath,['tests/support/mariadb-persistence-worker.mjs',mode],{env:process.env,stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});assert.equal(code,0,err);return JSON.parse(out.trim());
}
test('Persistence after a genuine application worker exit and new PID',async()=>{
 const a=await worker('write');const b=await worker('read');assert.notEqual(a.pid,b.pid);assert.equal(a.id,b.id);assert.equal(b.replayed,true);assert.equal(await count(),1);
 // Leave this single synthetic row for the runner's additional MariaDB restart verification.
});
