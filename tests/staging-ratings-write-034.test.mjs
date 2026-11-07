import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingRatingsWindowValid, stagingRatingsPublicWriteValid} from '../src/db/stagingRatingWrite.ts';
const NOW=Date.parse('2026-11-07T15:00:00Z');
const base={
 APP_ENV:'staging',DB_NAME:'u293982346_encarmentest',DB_USER:'staging_user',
 STAGING_READ_ONLY:'false',STAGING_DB_CONFIRMED:'true',
 STAGING_RATINGS_WRITES_ENABLED:'true',RATINGS_SCHEMA_APPROVED:'true',
 RATINGS_MODERATION_APPROVED:'true',STAGING_RATINGS_BACKUP_ID:'backup-ratings-034',
 STAGING_RATINGS_BACKUP_CHECKED_AT:'2026-11-07T14:59:00Z',
 STAGING_RATINGS_WRITE_EXPIRES_AT:'2026-11-07T15:20:00Z'
};
test('staging ratings write window requires private attestation, schema, exact db and expiry',()=>{
 assert.equal(stagingRatingsWindowValid(base,'staging_user',NOW),true);
 assert.equal(stagingRatingsWindowValid(null,'staging_user',NOW),false);
 assert.equal(stagingRatingsWindowValid(base,'another_user',NOW),false);
 for(const [key,value] of [
   ['APP_ENV','production'],['DB_NAME','u293982346_encarmenapp'],
   ['DB_USER','u293982346_appuser'],['STAGING_READ_ONLY','true'],
   ['STAGING_DB_CONFIRMED','false'],['STAGING_RATINGS_WRITES_ENABLED','false'],
   ['RATINGS_SCHEMA_APPROVED','false'],['RATINGS_MODERATION_APPROVED','false'],
   ['STAGING_RATINGS_BACKUP_ID','bad'],
   ['STAGING_RATINGS_BACKUP_CHECKED_AT','2026-11-07T14:20:00Z'],
   ['STAGING_RATINGS_WRITE_EXPIRES_AT','2026-11-07T15:50:00Z']]){
    assert.equal(stagingRatingsWindowValid({...base,[key]:value},'staging_user',NOW),false,key);
 }
 assert.equal(stagingRatingsWindowValid(base,'staging_user',NOW+25*60_000),false);
});
test('schema and HTTP mutators never widen the general staging write gate',async()=>{
 const fs=await import('node:fs');
 const server=fs.readFileSync('server.ts','utf8');
 const db=fs.readFileSync('src/db/mariadb.ts','utf8');
 assert.match(server,/isStagingRatingsWritePermitted\(\)/);
 assert.match(server,/adminSecurity\.isAuthorized\(req, 'admin:manage'\)/);
 assert.match(db,/isWritePermitted\(\) \|\| isStagingRatingsWritePermitted\(\) \|\| isStagingRatingsPublicWritePermitted\(\)/);
 assert.match(db,/if \(!isStagingRatingsWritePermitted\(\)\) throw ratingsError\('RATINGS_DATABASE_READ_ONLY'\)/);
});

test('durable public rating writes need exact private Staging flag and schema attestation',()=>{
 const snapshot={...base,STAGING_RATINGS_PUBLIC_WRITES_ENABLED:'true'};
 assert.equal(stagingRatingsPublicWriteValid(snapshot,'staging_user'),true);
 assert.equal(stagingRatingsPublicWriteValid(snapshot,'not-staging-user'),false);
 for(const [key,value] of [
 ['APP_ENV','production'],['DB_NAME','u293982346_encarmenapp'],
 ['STAGING_DB_CONFIRMED','false'],['STAGING_RATINGS_PUBLIC_WRITES_ENABLED','false'],
 ['RATINGS_MODERATION_APPROVED','false'],['RATINGS_SCHEMA_APPROVED','false'],
 ['STAGING_RATINGS_BACKUP_ID','bad'],['STAGING_RATINGS_BACKUP_CHECKED_AT','invalid']
 ]) assert.equal(stagingRatingsPublicWriteValid({...snapshot,[key]:value},'staging_user'),false,key);
});
