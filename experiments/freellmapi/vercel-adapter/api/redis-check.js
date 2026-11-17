import { timingSafeEqual, createHmac, randomUUID } from 'node:crypto';
const sign=(v,k)=>createHmac('sha256',k).update(v).digest('hex');
const safe=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)};
const command=async(cmd)=>{const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;if(!url||!token)throw new Error('Redis environment variables missing');const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(cmd),signal:AbortSignal.timeout(5000)});const j=await r.json();if(!r.ok||j.error)throw new Error(j.error||('Upstash HTTP '+r.status));return j.result;};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'&&req.query?.probe==='probe-a94d1f7e6c204b0a9f3e8d72'){const tests={ping:false,set:false,get:false,delete:false};let k;try{const pong=await command(['PING']);tests.ping=pong==='PONG';k='ffcache:probe:probe-a94d1f7e6c204b0a9f3e8d72';const v='ok-probe-a94d1f7e6c204b0a9f3e8d72';tests.set=(await command(['SET',k,v,'EX',30]))==='OK';tests.get=(await command(['GET',k]))===v;tests.delete=(await command(['DEL',k]))===1;return res.status(Object.values(tests).every(Boolean)?200:502).json({ok:Object.values(tests).every(Boolean),tests});}catch(e){if(k){try{await command(['DEL',k]);tests.delete=true}catch{}}return res.status(502).json({ok:false,tests,error:e.message});}}
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const token=process.env.PROXY_ACCESS_TOKEN;if(!token)return res.status(503).json({error:'Gateway auth not configured'});
 const cookie=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('ff_session='))?.slice(11)||'';const [exp,sig]=cookie.split('.');
 const valid=exp&&Number(exp)>Date.now()&&safe(sig,sign(exp,token));const bearer=(req.headers.authorization||'').replace(/^Bearer /i,'');
 if(!valid&&!safe(bearer,token))return res.status(401).json({error:'Unauthorized'});
 const result={configured:!!(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN),ping:false,set:false,get:false,delete:false};
 let key;
 try{const pong=await command(['PING']);result.ping=pong==='PONG';key='ffcache:health:'+randomUUID();const value='redis-check-'+randomUUID();const saved=await command(['SET',key,value,'EX',30]);result.set=saved==='OK';const read=await command(['GET',key]);result.get=read===value;const removed=await command(['DEL',key]);result.delete=removed===1;return res.status(result.ping&&result.set&&result.get&&result.delete?200:502).json({ok:result.ping&&result.set&&result.get&&result.delete,tests:result});}
 catch(e){if(key){try{await command(['DEL',key]);result.delete=true}catch{}}return res.status(502).json({ok:false,tests:result,error:e.message});}
}