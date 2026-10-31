import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGING_BUSINESS_DATABASE} from '../src/server/stagingBusinessSecurity.ts';
import {privatePublicRegistrationEnabled} from '../src/server/publicRegistrationWiring.ts';

test('Anonymous registration stays disabled without exact explicit Staging private capability',()=>{
 const cfg={APP_ENV:'staging',DB_NAME:STAGING_BUSINESS_DATABASE,PUBLIC_REGISTRATION_ENABLED:'true'};
 assert.equal(privatePublicRegistrationEnabled(cfg),true);
 assert.equal(privatePublicRegistrationEnabled(null),false);
 for(const patch of [
  {APP_ENV:'production'},
  {DB_NAME:'u293982346_encarmenapp'},
  {PUBLIC_REGISTRATION_ENABLED:'false'},
  {PUBLIC_REGISTRATION_ENABLED:'TRUE'},
  {PUBLIC_REGISTRATION_ENABLED:undefined}
 ]) assert.equal(privatePublicRegistrationEnabled({...cfg,...patch}),false);
 assert.equal(privatePublicRegistrationEnabled({PUBLIC_REGISTRATION_ENABLED:'true'}),false);
});

test('A process-only flag cannot grant public registration without private Staging snapshot',()=>{
 const prior=process.env.PUBLIC_REGISTRATION_ENABLED;
 process.env.PUBLIC_REGISTRATION_ENABLED='true';
 try{assert.equal(privatePublicRegistrationEnabled(null),false)}
 finally {if(prior===undefined)delete process.env.PUBLIC_REGISTRATION_ENABLED;else process.env.PUBLIC_REGISTRATION_ENABLED=prior}
});
