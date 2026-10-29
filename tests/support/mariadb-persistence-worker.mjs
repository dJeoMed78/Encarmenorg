import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {config,store,draft,adminPool,close} from './mariadb-persistence-context.mjs';
const mode=process.argv[2];
const checkpoint=path.join(process.env.ENC_MARIADB_TEST_ROOT,'durability.json');
try {
 if(mode==='write') {
  const requestId='00000001-0000-4000-8000-000000000001';
  const result=await store().create(draft('durable'),requestId);
  fs.writeFileSync(checkpoint,JSON.stringify({id:result.business.id,requestId}),{mode:0o600});
  console.log(JSON.stringify({mode,pid:process.pid,id:result.business.id,replayed:result.replayed}));
 } else if(mode==='read') {
  const previous=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
  const [rows]=await adminPool.query('SELECT * FROM businesses WHERE id = ?',[String(previous.id)]);
  assert.equal(rows.length,1);assert.equal(rows[0].phone,'5550000001');assert.equal(rows[0].whatsapp,'5550000002');
  const result=await store().create(draft('durable'),previous.requestId);
  assert.equal(result.replayed,true);assert.equal(result.business.id,previous.id);
  console.log(JSON.stringify({mode,pid:process.pid,id:previous.id,replayed:true}));
 } else throw Error('INVALID_WORKER_MODE');
} finally {await close();}
