import fs from 'node:fs';
import path from 'node:path';
import type {Request,Response} from 'express';

// Private Staging-only credential store. Never serialize this value to the browser.
const valid=(value:unknown):value is string=>typeof value==='string'&&/^[^\s\x00-\x1f\x7f]{8,512}$/.test(value);
function location():string|null {
  if(!process.env.HOME||process.env.APP_ENV!=='staging'||process.env.DB_NAME!=='u293982346_encarmentest')return null;
  const root=path.join(process.env.HOME,'domains/staging.encarmen.org/hbuilds');
  try {
    // The Hostinger process CWD may be the active symlink, not versions/<id>/nodejs.
    // Authenticate the private Staging configuration instead of depending on CWD.
    const config=path.join(root,'config');
    const stat=fs.lstatSync(config);
    if(!stat.isDirectory()||stat.isSymbolicLink())return null;
    const envFile=path.join(config,'.env');
    const envStat=fs.lstatSync(envFile);
    if(!envStat.isFile()||envStat.isSymbolicLink()||(envStat.mode&0o077)!==0)return null;
    const raw=fs.readFileSync(envFile,'utf8');
    const values=Object.fromEntries(raw.split(/\r?\n/).filter(line=>/^[A-Za-z_][A-Za-z0-9_]*=/.test(line)).map(line=>{const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1).replace(/^["']|["']$/g,'')]}));
    if(values.APP_ENV!=='staging'||values.DB_NAME!=='u293982346_encarmentest'||!values.DB_PASSWORD||values.DB_USER==='u293982346_appuser')return null;
    return path.join(config,'denue-token.secret');
  }catch{return null;}
}
export function readDenueToken():string|undefined {
  const file=location();
  if(file){
    try{
      const stat=fs.lstatSync(file);
      if(stat.isFile()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0){
        const value=fs.readFileSync(file,'utf8').trim();
        if(valid(value))return value;
      }
    }catch{}
  }
  const fallback=process.env.INEGI_DENUE_TOKEN;
  return valid(fallback)?fallback:undefined;
}
export function registerDenueTokenSettings(app:any,authorized:(req:Request)=>boolean){
  app.get('/api/admin/denue-token', (req:Request,res:Response)=>{
    res.set('Cache-Control','no-store');
    if(!authorized(req))return res.status(403).json({success:false,code:'ADMIN_REQUIRED'});
    return res.json({success:true,configured:!!readDenueToken()});
  });
  app.post('/api/admin/denue-token',(req:Request,res:Response)=>{
    res.set('Cache-Control','no-store');
    if(!authorized(req))return res.status(403).json({success:false,code:'ADMIN_REQUIRED'});
    const file=location();
    if(!file)return res.status(503).json({success:false,code:'STAGING_PRIVATE_STORAGE_UNAVAILABLE'});
    const token=req.body?.token;
    if(!valid(token)||Object.keys(req.body||{}).some(k=>k!=='token'))
      return res.status(400).json({success:false,code:'DENUE_TOKEN_INVALID_FORMAT'});
    const temp=file+'.'+process.pid+'.tmp';
    try{
      fs.writeFileSync(temp,token+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
      fs.chmodSync(temp,0o600);
      fs.renameSync(temp,file);
      if(readDenueToken()!==token)throw new Error('READBACK');
      return res.json({success:true,configured:true});
    }catch{
      try{fs.unlinkSync(temp);}catch{}
      return res.status(503).json({success:false,code:'DENUE_TOKEN_SAVE_UNCONFIRMED'});
    }
  });
}
