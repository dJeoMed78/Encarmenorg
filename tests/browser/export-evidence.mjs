// Read only runner artifacts. A bounded log fallback preserves evidence when Actions storage is full.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import sharp from 'sharp';
const root=new URL('./',import.meta.url).pathname;
const result=JSON.parse(await fs.readFile(path.join(root,'results.json'),'utf8'));
const compact={stats:result.stats,errors:result.errors,suites:result.suites};
function emit(name,bytes){console.log('ENC_EVIDENCE_BEGIN '+name);console.log(Buffer.from(bytes).toString('base64'));console.log('ENC_EVIDENCE_END '+name);}
// Original JSON includes full error messages and attachment paths; bounded enough for this suite.
emit('results.json.gz',gzipSync(JSON.stringify(compact)));
const dirs=(await fs.readdir(path.join(root,'artifacts'),{withFileTypes:true})).filter(x=>x.isDirectory());
const chosen=[];
for(const viewport of ['320x568','360x800','390x844','768x1024','1440x900']){
 for(const kind of ['inicio-directorio','ficha-real','geometría','rechazo-403']){
  const d=dirs.find(x=>x.name.includes(viewport)&&x.name.includes(kind));if(!d)continue;
  const names=await fs.readdir(path.join(root,'artifacts',d.name));
  const png=names.find(x=>x==='inicio.png')||names.find(x=>x==='ficha.png')||names.find(x=>x.endsWith('.png'));
  if(png){const bytes=await sharp(path.join(root,'artifacts',d.name,png)).resize({width:640,withoutEnlargement:true}).jpeg({quality:55}).toBuffer();emit(d.name+'.jpg',bytes);}
  const ctx=names.find(x=>x==='error-context.md');if(ctx)emit(d.name+'-context.md',await fs.readFile(path.join(root,'artifacts',d.name,ctx)));
 }
}
const fail=dirs.find(x=>x.name.includes('rechazo-403'))||dirs[0];
if(fail){const p=path.join(root,'artifacts',fail.name,'trace.zip');try{const b=await fs.readFile(p);if(b.length<3000000)emit('representative-trace.zip',b);}catch{}}
console.log('ENC_BROWSER_VERSION '+(await import('playwright-core')).chromium.executablePath());
