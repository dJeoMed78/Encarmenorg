// Motor REAL, sin red: cada proceso bootstrap recibe exclusivamente un datadir recién creado aquí.
// No abre sockets, no lee .env, no usa --apply ni DROP, y no acepta un datadir externo.
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const basedir=resolve(process.argv[2]||'');
if(!process.argv[2]||!existsSync(join(basedir,'sbin/mariadbd')))throw Error('Indica distribución MariaDB extraída, no un datadir.');
const root=mkdtempSync(join(tmpdir(),'enc-iv-sql-'));const data=join(root,'data');
const env={PATH:process.env.PATH,TZ:'UTC',LANG:'C.UTF-8',LD_LIBRARY_PATH:join(basedir,'lib/x86_64-linux-gnu')};
const initialize=spawnSync(join(basedir,'bin/mariadb-install-db'),['--no-defaults',`--basedir=${basedir}`,`--datadir=${data}`,'--auth-root-authentication-method=normal','--skip-test-db','--user=root'],{env,encoding:'utf8',timeout:30000});
assert.equal(initialize.status,0,initialize.stderr);
const schema='iv_'+randomBytes(8).toString('hex');assert.match(schema,/^iv_[a-f0-9]{16}$/);
const checks=[];const appPassword=randomBytes(24).toString('hex');
function sql(name,statement,expected=0){
 const result=spawnSync(join(basedir,'sbin/mariadbd'),['--no-defaults','--bootstrap','--user=root',`--basedir=${basedir}`,`--datadir=${data}`,'--innodb-buffer-pool-size=32M'],{env,input:statement.replace(/--[^\n]*/g,'').replace(/;\s*/g,';\n')+'\n',encoding:'utf8',timeout:15000});
 if(expected===0)assert.equal(result.status,0,(result.stderr||'').replaceAll(appPassword,'[REDACTED]').slice(-1800));else assert.notEqual(result.status,0);
 checks.push({name,pass:true,exit:result.status});
}
const fixture=readFileSync(new URL('./fixtures/public-classifieds-lab.sql',import.meta.url),'utf8');
sql('crear esquema propio e InnoDB',`CREATE DATABASE ${schema}; USE ${schema}; ${fixture} CREATE TABLE assertions(id INT PRIMARY KEY,ok INT CHECK(ok=1));`);
const hash=createHash('sha256').update('synthetic-owner-proof').digest('hex');
const insert=`INSERT INTO public_classifieds(id,idempotency_key,title,description,category,price,contact_phone,contact_whatsapp,status,owner_token_hash,expires_at,details_json) VALUES('cls_synthetic','key-synthetic','Anuncio sintético','Descripción sintética local','compra-venta',100,'2223334455','5556667788','active','${hash}',NOW()+INTERVAL 7 DAY,'{"subcategory":"bazar-electronica","colonia":"Centro"}');`;
sql('error deliberado tras INSERT no devuelve éxito',`USE ${schema}; ${insert} INSERT INTO assertions SELECT 1,COUNT(*)=1 FROM public_classifieds WHERE phone_not_a_column IS NULL;`,1);
// La consulta anterior es deliberadamente inválida: un fallo SQL no es un PASS de persistencia.
sql('confirmar INSERT persistido después de error y reinicio de proceso',`USE ${schema}; INSERT INTO assertions SELECT 2,COUNT(*)=1 FROM public_classifieds WHERE id='cls_synthetic' AND contact_phone='2223334455';`);
sql('duplicado idempotente rechazado por índice único',`USE ${schema}; ${insert}`,1);
sql('no duplicación después de error',`USE ${schema}; INSERT INTO assertions SELECT 3,COUNT(*)=1 FROM public_classifieds;`);
sql('UPDATE parcial y precio NULL con contactos conservados',`USE ${schema}; START TRANSACTION; SELECT id FROM public_classifieds WHERE id='cls_synthetic' FOR UPDATE; UPDATE public_classifieds SET title='Título actualizado',price=NULL WHERE id='cls_synthetic'; COMMIT; INSERT INTO assertions SELECT 4,COUNT(*)=1 FROM public_classifieds WHERE title='Título actualizado' AND price IS NULL AND contact_phone='2223334455' AND contact_whatsapp='5556667788';`);
sql('ROLLBACK conserva datos',`USE ${schema}; START TRANSACTION; UPDATE public_classifieds SET title='No conservar'; ROLLBACK; INSERT INTO assertions SELECT 5,COUNT(*)=1 FROM public_classifieds WHERE title='Título actualizado';`);
sql('filtros JSON de colonia y subcategoría',`USE ${schema}; INSERT INTO assertions SELECT 6,COUNT(*)=1 FROM public_classifieds WHERE JSON_UNQUOTE(JSON_EXTRACT(details_json,'$.colonia'))='Centro' AND JSON_UNQUOTE(JSON_EXTRACT(details_json,'$.subcategory'))='bazar-electronica';`);
sql('retiro lógico y expiración del feed',`USE ${schema}; UPDATE public_classifieds SET status='retired'; INSERT INTO assertions SELECT 7,COUNT(*)=0 FROM public_classifieds WHERE status='active' AND expires_at>NOW(); UPDATE public_classifieds SET status='active',expires_at=NOW()-INTERVAL 1 SECOND; INSERT INTO assertions SELECT 8,COUNT(*)=0 FROM public_classifieds WHERE status='active' AND expires_at>NOW();`);
sql('marca de aislamiento real',`USE ${schema}; INSERT INTO assertions SELECT 9,COUNT(*)=1 FROM enc_classifieds_isolation WHERE marker_value='ENC-CLASSIFIEDS-LAB-ISOLATED';`);
const result={task:'ENC-INTEGRATION-VALIDATION-001',mode:'MariaDB native bootstrap, not mysql2/HTTP persistence',checks,pass:checks.length,datadirCreatedByThisScript:true,network:false,concurrencyTested:false,ownerAuthenticationOverProtocolTested:false,productionAccessed:false};
writeFileSync(join(root,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
