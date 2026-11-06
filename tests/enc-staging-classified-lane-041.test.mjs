import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingClassifiedWindowValid, createStagingClassifiedStore} from '../src/db/stagingClassifiedStore.ts';

const now = Date.parse('2026-11-05T23:00:00.000Z');
const config = (changes = {}) => ({
  APP_ENV: 'staging',
  DB_NAME: 'u293982346_encarmentest',
  DB_USER: 'isolated_staging_writer',
  STAGING_READ_ONLY: 'false',
  STAGING_DB_CONFIRMED: 'true',
  STAGING_CLASSIFIED_WRITES_ENABLED: 'true',
  STAGING_CLASSIFIED_BACKUP_ID: 'verified-backup-20261105-001',
  STAGING_CLASSIFIED_BACKUP_CHECKED_AT: new Date(now - 60_000).toISOString(),
  STAGING_CLASSIFIED_WRITE_EXPIRES_AT: new Date(now + 10 * 60_000).toISOString(),
  ...changes
});

test('ventana privada valida Staging y mantiene el bloqueo general', () => {
  assert.equal(stagingClassifiedWindowValid(config(), 'isolated_staging_writer', now), true);
  assert.equal(stagingClassifiedWindowValid(config({STAGING_READ_ONLY:'true'}), 'isolated_staging_writer', now), false);
  assert.equal(stagingClassifiedWindowValid(config({APP_ENV:'production'}), 'isolated_staging_writer', now), false);
  assert.equal(stagingClassifiedWindowValid(config({DB_NAME:'u293982346_encarmenapp'}), 'isolated_staging_writer', now), false);
  assert.equal(stagingClassifiedWindowValid(config(), 'u293982346_appuser', now), false);
});

test('ventana privada requiere respaldo vigente y expira automáticamente', () => {
  assert.equal(stagingClassifiedWindowValid(config({STAGING_CLASSIFIED_BACKUP_ID:''}), 'isolated_staging_writer', now), false);
  assert.equal(stagingClassifiedWindowValid(config({STAGING_CLASSIFIED_BACKUP_CHECKED_AT:new Date(now-31*60_000).toISOString()}), 'isolated_staging_writer', now), false);
  assert.equal(stagingClassifiedWindowValid(config({STAGING_CLASSIFIED_WRITE_EXPIRES_AT:new Date(now-1000).toISOString()}), 'isolated_staging_writer', now), false);
  assert.equal(stagingClassifiedWindowValid(config({STAGING_CLASSIFIED_WRITE_EXPIRES_AT:new Date(now+61*60_000).toISOString()}), 'isolated_staging_writer', now), false);
});

function harness({ snapshot=config(), user='isolated_staging_writer', isolation=true, engine='InnoDB', db='u293982346_encarmentest', dup=false, readback=true, failCommit=false }={}) {
  const record = {id:'ad-test-41',title:'Aviso validado',status:'active',sourceUrl:'https://mx.computrabajo.com/ofertas-de-trabajo/123'};
  const queries=[];
  const state={began:0,committed:0,rolledBack:0,released:0,inserted:false};
  const conn={
    async query(sql, params) {
      queries.push({sql,params});
      if(sql==='SELECT DATABASE() AS db_name')return [[{db_name:db}]];
      if(sql.includes('information_schema.TABLES'))return [[{ENGINE:engine}]];
      if(sql.includes('information_schema.STATISTICS'))return [[{COLUMN_NAME:'id',NON_UNIQUE:0,SEQ_IN_INDEX:1}]];
      if(sql.startsWith('INSERT INTO classifieds')) {
        if(dup)throw {code:'ER_DUP_ENTRY'};
        state.inserted=true;
        return [{affectedRows:1}];
      }
      if(sql.includes('FROM classifieds WHERE id = ? FOR UPDATE')){
        return [readback && state.inserted ? [{id:record.id,title:record.title,status:'active',raw_data:JSON.stringify(record)}] : []];
      }
      throw Error('Consulta inesperada: '+sql);
    },
    async beginTransaction(){state.began++;},
    async commit(){if(failCommit)throw Error('COMMIT_FAILED');state.committed++;},
    async rollback(){state.rolledBack++;},
    release(){state.released++;}
  };
  let actualSnapshot=snapshot;
  const store=createStagingClassifiedStore({
    getConnection:async()=>conn,
    getSnapshot:()=>actualSnapshot,
    getUser:()=>user,
    now:()=>now,
    verifyIsolation:async()=>({ok:isolation,code:isolation?'ISOLATION_PROVEN':'ISOLATION_DENIED'})
  });
  return {store,record,queries,state,closeWindow:()=>{actualSnapshot=null;}};
}

test('configuración privada ausente bloquea antes de pedir conexión SQL',async()=>{
  const h=harness({snapshot:null});
  assert.equal(await h.store.create(h.record),'blocked');
  assert.equal(h.queries.length,0);
});

test('base equivocada falla cerrado sin comenzar transacción',async()=>{
  const h=harness({db:'u293982346_encarmenapp'});
  assert.equal(await h.store.create(h.record),'blocked');
  assert.equal(h.state.began,0);
  assert.equal(h.state.released,1);
});

test('tabla no transaccional falla cerrado',async()=>{
  const h=harness({engine:'MyISAM'});
  assert.equal(await h.store.create(h.record),'blocked');
  assert.equal(h.state.began,0);
});

test('aislamiento no probado impide escritura',async()=>{
  const h=harness({isolation:false});
  assert.equal(await h.store.create(h.record),'blocked');
  assert.equal(h.state.began,0);
});

test('inserción y relectura comprobada permiten commit único',async()=>{
  const h=harness();
  assert.equal(await h.store.create(h.record),'created');
  assert.equal(h.state.began,1);
  assert.equal(h.state.committed,1);
  assert.equal(h.state.rolledBack,0);
  assert.equal(h.state.released,1);
  assert.equal(h.queries.some(q=>q.sql.includes('ON DUPLICATE KEY UPDATE')),false);
});

test('readback ausente provoca rollback',async()=>{
  const h=harness({readback:false});
  assert.equal(await h.store.create(h.record),'error');
  assert.equal(h.state.committed,0);
  assert.equal(h.state.rolledBack,1);
});

test('duplicado SQL provoca rollback sin sobrescribir',async()=>{
  const h=harness({dup:true});
  assert.equal(await h.store.create(h.record),'duplicate');
  assert.equal(h.state.committed,0);
  assert.equal(h.state.rolledBack,1);
});

test('commit fallido nunca confirma registro',async()=>{
  const h=harness({failCommit:true});
  assert.equal(await h.store.create(h.record),'error');
  assert.equal(h.state.committed,0);
  assert.equal(h.state.rolledBack,1);
});

test('cierre de ventana privada revoca operaciones',async()=>{
  const h=harness();
  h.closeWindow();
  assert.equal(await h.store.create(h.record),'blocked');
  assert.equal(h.state.began,0);
});
