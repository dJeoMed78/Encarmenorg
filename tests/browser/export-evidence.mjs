// Read only runner artifacts. A bounded log fallback preserves evidence when Actions storage is full.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import sharp from 'sharp';
import {execFileSync} from 'node:child_process';
const root=new URL('./',import.meta.url).pathname;
const result=JSON.parse(await fs.readFile(path.join(root,'results.json'),'utf8'));
const compact={stats:result.stats,errors:result.errors,suites:result.suites};
function emit(name,bytes){console.log('ENC_EVIDENCE_BEGIN '+name);console.log(Buffer.from(bytes).toString('base64'));console.log('ENC_EVIDENCE_END '+name);}
// Original JSON includes full error messages and attachment paths; bounded enough for this suite.
emit('results.json.gz',gzipSync(JSON.stringify(compact)));
const dirs=(await fs.readdir(path.join(root,'artifacts'),{withFileTypes:true})).filter(x=>x.isDirectory());
const chosen=[];
for(const viewport of ['320x568','360x800','390x844','768x1024','1440x900']){
 for(const kind of ['inicio-directorio','ficha-real','geometría','rechazo-403','encabezado']){
  const d=dirs.find(x=>x.name.includes(viewport)&&x.name.includes(kind));if(!d)continue;
  const names=await fs.readdir(path.join(root,'artifacts',d.name));
  const pngs=kind==='geometría'?names.filter(x=>['inicio.png','clasificados.png','formulario.png'].includes(x)):[names.find(x=>x==='ficha.png')||names.find(x=>x.endsWith('.png'))].filter(Boolean);
  for(const png of pngs){const bytes=await sharp(path.join(root,'artifacts',d.name,png)).resize({width:640,withoutEnlargement:true}).jpeg({quality:55}).toBuffer();emit(d.name+'-'+png.replace('.png','.jpg'),bytes);}
  const ctx=names.find(x=>x==='error-context.md');if(ctx)emit(d.name+'-context.md',await fs.readFile(path.join(root,'artifacts',d.name,ctx)));
 }
}
const fail=dirs.find(x=>x.name.includes('rechazo-403'))||dirs[0];
if(fail){const p=path.join(root,'artifacts',fail.name,'trace.zip');try{
 const reduced=execFileSync('python3',['-c',`import zipfile,sys,io,json
src=zipfile.ZipFile(sys.argv[1]);buf=io.BytesIO();omitted=[]
with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as out:
 for item in src.infolist():
  if item.filename.endswith(('.trace','.network','.stacks')) or item.file_size<150000:out.writestr(item.filename,src.read(item))
  else:omitted.append({'name':item.filename,'bytes':item.file_size})
 out.writestr('e2e-reduced-manifest.json',json.dumps({'purpose':'Bounded log fallback; original large resources omitted','omitted':omitted}))
sys.stdout.buffer.write(buf.getvalue())`,p],{maxBuffer:8000000});
 if(reduced.length<6000000)emit('representative-trace-reduced.zip',reduced);
}catch(error){console.log('ENC_TRACE_EXPORT_ERROR '+error.message);}}
console.log('ENC_BROWSER_EXECUTABLE '+(await import('playwright-core')).chromium.executablePath());
