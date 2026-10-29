import {spawnSync} from 'node:child_process';
import {mkdirSync, readdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

// No importa server.ts, no lee .env, no arranca el backend y no ejecuta scripts npm.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'validation-results');
mkdirSync(output, {recursive:true});
const suites = readdirSync(join(root,'tests')).filter(name=>/^staging-(write.*|isolation-proof|store-default-strict)\.test\.mjs$/.test(name)).sort().map(name=>`tests/${name}`);
if(suites.length < 3) throw new Error('Faltan suites obligatorias');
const build = join(tmpdir(), `enc-write-validation-${process.pid}`);
const jobs = [
  ['tests', process.execPath, ['--test', ...suites]],
  ['typescript', join(root,'node_modules/.bin/tsc'), ['--noEmit']],
  ['frontend', join(root,'node_modules/.bin/vite'), ['build','--outDir',build]],
];
const results = [];
for(const [name,command,args] of jobs){
  const result = spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});
  const log = `${result.stdout||''}${result.stderr||''}${result.error ? String(result.error) : ''}`;
  writeFileSync(join(output,`${name}.log`),log);
  results.push({name,command: name==='tests' ? 'node' : `node_modules/.bin/${name==='typescript'?'tsc':'vite'}`,args,exitCode:result.status,signal:result.signal,pass:result.status===0});
  console.log(`${name}: ${result.status===0?'PASS':'FAIL'}`);
}
writeFileSync(join(output,'results.json'),JSON.stringify({base:'0e2488f5552bf7768a15711316b0de4d71b5d17e',node:process.version,suites,build,results,realMariaDB:false},null,2)+'\n');
process.exitCode = results.every(result=>result.pass) ? 0 : 1;
