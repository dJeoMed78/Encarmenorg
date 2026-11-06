/**
 * ENC-041 controlled REAL Staging SQL persistence proof.
 * Execute ONLY on the isolated Staging host after an independent full backup.
 * Read-only preflight -> private table snapshot -> hidden INSERT/COMMIT ->
 * independent connection SELECT -> DELETE own probe row -> final SELECT.
 * Never execute from production or unverified environments.
 *
 * Command (on authorized Staging host only):
 * ENC_CLASSIFIED_PROBE_EXECUTE=CONFIRM_STAGING_041 \
 * ENC_STAGING_CLASSIFIED_BACKUP_DIR=/private/secure-backups \
 * node --import tsx scripts/enc-staging-classified-persistence-041.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID, createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import {getPrivateStagingSnapshot, STAGING_BUSINESS_DATABASE}
  from '../src/server/stagingBusinessSecurity.ts';
import {verifyStagingIsolation} from '../src/server/stagingIsolationProof.ts';
import {createStagingClassifiedStore, stagingClassifiedWindowValid}
  from '../src/db/stagingClassifiedStore.ts';

const result={procedure:'ENC-STAGING-CLASSIFIED-PERSISTENCE-041',state:'BLOCKED'};
let pool=null;
let testId=null;
let testData=null;
let writeConfirmed=false;
let cleanupConfirmed=false;

function stop(code){throw new Error(code);}
function assertPrivateDir(raw){
  if(!raw)stop('PRIVATE_BACKUP_DIR_MISSING');
  const abs=fs.realpathSync(raw);
  const stat=fs.lstatSync(abs);
  if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)
    stop('PRIVATE_BACKUP_DIR_UNSAFE');
  if(/(?:^|\/)(?:public_html|versions|dist|api)(?:\/|$)/i.test(abs))
    stop('PRIVATE_BACKUP_DIR_PUBLIC');
  return abs;
}
async function verifyTarget(conn,snapshot){
  const [rows]=await conn.query('SELECT DATABASE() AS db_name');
  if(rows.length!==1||rows[0].db_name!==STAGING_BUSINESS_DATABASE)
    stop('CONNECTED_DATABASE_NOT_STAGING');
  const proof=await verifyStagingIsolation(conn,{...process.env,...snapshot});
  if(!proof.ok)stop('STAGING_ISOLATION_'+proof.code);
  const [engine]=await conn.query(
    "SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classifieds'");
  if(engine.length!==1||String(engine[0].ENGINE).toLowerCase()!=='innodb')
    stop('CLASSIFIEDS_ENGINE_NOT_INNODB');
}

try{
  if(process.env.ENC_CLASSIFIED_PROBE_EXECUTE!=='CONFIRM_STAGING_041')
    stop('EXPLICIT_PROBE_CONFIRMATION_MISSING');
  const snap=getPrivateStagingSnapshot();
  if(!snap || !stagingClassifiedWindowValid(snap,snap.DB_USER))
    stop('PRIVATE_STAGING_CLASSIFIED_WINDOW_CLOSED');
  const dir=assertPrivateDir(process.env.ENC_STAGING_CLASSIFIED_BACKUP_DIR);
  if(!snap.DB_HOST||!snap.DB_PASSWORD||!snap.DB_USER)stop('PRIVATE_DATABASE_CONFIG_INCOMPLETE');

  pool=mysql.createPool({
    host:snap.DB_HOST,user:snap.DB_USER,password:snap.DB_PASSWORD,
    database:snap.DB_NAME,port:Number(snap.DB_PORT||3306),
    waitForConnections:true,connectionLimit:2
  });
  let conn=await pool.getConnection();
  try{
    await verifyTarget(conn,snap);
    // Logical snapshot of the table is ADDITIONAL to the operator's full backup.
    // Never write any data or snapshot into the deployable release tree.
    await conn.beginTransaction();
    const [oldRows]=await conn.query('SELECT * FROM classifieds ORDER BY id');
    await conn.commit();
    const fileName='enc041-classified-snapshot-'+Date.now()+'-'+randomUUID()+'.json';
    const file=path.join(dir,fileName);
    const bytes=Buffer.from(JSON.stringify({
      database:STAGING_BUSINESS_DATABASE,table:'classifieds',
      capturedAt:new Date().toISOString(),rows:oldRows
    }));
    const fd=fs.openSync(file,'wx',0o600);
    try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    const stat=fs.lstatSync(file);
    if((stat.mode&0o077)!==0||stat.size!==bytes.length)stop('BACKUP_SNAPSHOT_NOT_VERIFIED');
    result.tableSnapshot={name:fileName,rows:oldRows.length,sha256:createHash('sha256').update(bytes).digest('hex')};
    result.isolation='ISOLATION_PROVEN';
    result.backup='PRIVATE_LOGICAL_SNAPSHOT_VERIFIED';
  }finally{conn.release();}

  const id='ad-enc041-test-'+randomUUID();
  const ad={
    id,title:'ENC-041 prueba técnica no publicable',
    category:'compra-venta',subcategory:'bazar-hogar',
    price:null,priceType:'consult',
    phone:'',whatsapp:'',colonia:'',status:'trash',userToken:'',
    sourceUrl:'https://mx.computrabajo.com/ofertas-de-trabajo/enc-041-probe',
    _encTechnicalProbe:true,createdAt:new Date().toISOString()
  };
  testId=id;
  testData=JSON.stringify(ad);
  const store=createStagingClassifiedStore({
    getConnection:async()=>pool.getConnection(),
    getSnapshot:()=>getPrivateStagingSnapshot({connectionUser:snap.DB_USER}),
    getUser:()=>snap.DB_USER
  });
  const write=await store.create(ad);
  if(write!=='created')stop('PROBE_INSERT_'+write.toUpperCase());
  writeConfirmed=true;
  result.insert='SQL_COMMIT_CONFIRMED';

  // Read from a fresh connection AFTER the transaction committed.
  conn=await pool.getConnection();
  try{
    await verifyTarget(conn,snap);
    const [rows]=await conn.query('SELECT id, raw_data, status FROM classifieds WHERE id=?',[id]);
    if(rows.length!==1||rows[0].id!==id||rows[0].raw_data!==testData||rows[0].status!=='trash')
      stop('INDEPENDENT_SQL_READBACK_FAILED');
    result.persistence='INDEPENDENT_CONNECTION_READBACK_CONFIRMED';

    if(!store.canWrite())stop('WINDOW_CLOSED_BEFORE_CLEANUP');
    const [deleted]=await conn.query(
      'DELETE FROM classifieds WHERE id=? AND raw_data=? AND status=?',
      [id,testData,'trash']
    );
    if(deleted.affectedRows!==1)stop('PROBE_CLEANUP_NOT_CONFIRMED');
    const [remaining]=await conn.query('SELECT id FROM classifieds WHERE id=?',[id]);
    if(remaining.length!==0)stop('PROBE_CLEANUP_READBACK_FAILED');
    cleanupConfirmed=true;
    result.cleanup='SYNTHETIC_ROW_REMOVED';
    result.state='PASS';
  }finally{conn.release();}
}catch(error){
  result.state='BLOCKED_OR_FAILED';
  result.code=String(error?.message||'UNEXPECTED_ERROR').replace(/[^A-Z0-9_]/gi,'_').slice(0,100);
}finally{
  // Never touch arbitrary business data. A failed cleanup requires operator attention.
  if(writeConfirmed && !cleanupConfirmed)result.operatorAction='REVIEW_HIDDEN_SYNTHETIC_PROBE_ROW';
  if(testId)result.syntheticId=testId;
  try{await pool?.end();}catch{}
  console.log(JSON.stringify(result,null,2));
  if(result.state!=='PASS')process.exitCode=1;
}
