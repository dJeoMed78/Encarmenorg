import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import mysql from 'mysql2/promise';

const directory=process.env.ENC_MARIADB_TEST_ROOT;
if(!directory || !path.basename(directory).startsWith('enc-mariadb-persistence-')) throw Error('LOCAL_DISPOSABLE_RUNNER_REQUIRED');
const root=fs.realpathSync(directory);
if((fs.statSync(root).mode & 0o077)!==0 || !fs.existsSync(path.join(root,'owned-by-enc-runner'))) throw Error('PRIVATE_RUNNER_DIRECTORY_REQUIRED');
export const config=JSON.parse(fs.readFileSync(path.join(root,'connection.json'),'utf8'));
if(config.database!=='u293982346_encarmentest')throw Error('FIXTURE_DATABASE_REQUIRED');
if(config.transport==='unix'){if(config.socketPath!==path.join(root,'mysql.sock') || config.host || config.port)throw Error('LOCAL_SOCKET_ONLY');}
else if(config.transport!=='loopback' || config.host!=='127.0.0.1' || !Number.isInteger(config.port) || config.port<1024 || config.socketPath)throw Error('OWNED_LOOPBACK_ONLY');
export const endpoint=config.transport==='unix'?{socketPath:config.socketPath}:{host:'127.0.0.1',port:config.port};
export const modules=await import(pathToFileURL(path.join(root,'application-under-test.mjs')));
export const serialize=(await import(pathToFileURL(path.join(root,'serializer-under-test.mjs')))).businessFromRow;
export const writerPool=mysql.createPool({...endpoint,user:config.user,password:config.password,database:config.database,connectionLimit:8,connectTimeout:1500});
export const adminPool=mysql.createPool({...endpoint,user:'root',database:config.database,connectionLimit:2,connectTimeout:1500});
export const canWrite=()=>modules.stagingBusinessConfiguration(process.env,'u293982346_appuser');
export const store=(overrides={})=>modules.createStagingBusinessStore({canWrite,getConnection:()=>writerPool.getConnection(),serialize,...overrides});
export const draft=(suffix='one')=>({name:'Synthetic fixture '+suffix,phone:'5550000001',whatsapp:'5550000002',description:'Synthetic only',slug:'ignored',categories:['Fixture'],schedule:'Synthetic schedule',image:'/fixture.png',gallery:['/fixture-gallery.png']});
export const close=async()=>{await writerPool.end();await adminPool.end();};
