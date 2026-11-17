import { timingSafeEqual, createHmac, createHash } from 'node:crypto';
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const sign=(v,k)=>createHmac('sha256',k).update(v).digest('hex');
const safe=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)};
const redis=async(command)=>{const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;if(!url||!token)throw new Error('Redis not configured');const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(4000)});if(!r.ok)throw new Error('Redis HTTP '+r.status);const j=await r.json();if(j.error)throw new Error(j.error);return j.result;};
const cacheKey=(body)=>'ffcache:v1:'+createHash('sha256').update(JSON.stringify(body)).digest('hex');
const cachedResponse=async(key,payload)=>{const out=json(payload);try{await redis(['SET',key,JSON.stringify(payload),'EX',120]);}catch(e){console.error('redis_cache_write_failed',e.message)}return out;};
export default {async fetch(req){
 if(req.method!=='POST')return json({error:{message:'Method not allowed'}},405);
 const token=process.env.PROXY_ACCESS_TOKEN;if(!token)return json({error:{message:'Gateway not configured'}},503);
 const cookie=(req.headers.get('cookie')||'').split('; ').find(x=>x.startsWith('ff_session='))?.slice(11)||'';const [exp,sig]=cookie.split('.');const valid=exp&&Number(exp)>Date.now()&&safe(sig,sign(exp,token));const bearer=(req.headers.get('authorization')||'').replace(/^Bearer /i,'');if(!valid&&!safe(bearer,token))return json({error:{message:'Unauthorized'}},401);
 const raw=await req.text();if(Buffer.byteLength(raw)>65536)return json({error:{message:'Request too large'}},413);let body;try{body=JSON.parse(raw)}catch{return json({error:{message:'Invalid JSON'}},400)}
 const model=body?.model||'gemini-3.5-flash-lite';if(body.stream===true)return json({error:{message:'Streaming not implemented'}},400);
 if(!Array.isArray(body.messages)||!body.messages.length||body.messages.length>40||body.messages.some(m=>!['system','user','assistant'].includes(m?.role)||typeof m.content!=='string'))return json({error:{message:'Invalid messages'}},400);
 const responseCacheKey=cacheKey(body);try{const hit=await redis(['GET',responseCacheKey]);if(hit){const cached=JSON.parse(hit);return json({...cached,cache:'HIT'});}}catch(e){console.error('redis_cache_read_failed',e.message)}
 const system=body.messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');const messages=body.messages.filter(m=>m.role!=='system');if(!messages.length)return json({error:{message:'Message required'}},400);
 try{
  let r,j,provider;
  const primaryOrders={ 'auto-groq':['openai/gpt-oss-20b','gemini-3.5-flash-lite','cohere/command-a-03-2025'], 'auto-gemini':['gemini-3.5-flash-lite','openai/gpt-oss-20b','cohere/command-a-03-2025'], 'auto-cohere':['cohere/command-a-03-2025','openai/gpt-oss-20b','gemini-3.5-flash-lite'], 'auto':['openai/gpt-oss-20b','gemini-3.5-flash-lite','cohere/command-a-03-2025']};
  const automatic=Object.prototype.hasOwnProperty.call(primaryOrders,model);
  const order=automatic?primaryOrders[model]:[model];
  const failures=[];
  for(const selected of order){
   try{
    if(selected==='gemini-3.5-flash-lite'){
     const key=process.env.GEMINI_API_KEY;if(!key){failures.push({provider:'Gemini',status:503,message:'Gemini no está configurado'});if(automatic)continue;return json({error:{message:'Gemini no está configurado'}},503)}
     const contents=messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}));
     r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents,...(system?{systemInstruction:{parts:[{text:system}]}}:{}),generationConfig:{maxOutputTokens:Math.min(Math.max(Number(body.max_tokens)||512,1),2048)}}),signal:AbortSignal.timeout(25000)});
     j=await r.json();provider='Gemini';
     if(!r.ok){const status=r.status;failures.push({provider,status,message:j.error?.message||'Gemini request failed'});if(automatic&&(status===429||status===500||status===502||status===503||status===504))continue;return json({error:{message:j.error?.message||'Gemini request failed',provider}},status===429?429:502)}
     const content=(j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
     return await cachedResponse(responseCacheKey,{id:'chatcmpl-gemini',object:'chat.completion',created:Math.floor(Date.now()/1000),model:selected,provider,failover:failures.length>0,choices:[{index:0,message:{role:'assistant',content},finish_reason:'stop'}],usage:j.usageMetadata||{},cache:'MISS'});
    }
    if(selected==='cohere/command-a-03-2025'){
     const key=process.env.COHERE;if(!key){failures.push({provider:'Cohere',status:503,message:'Cohere no está configurado'});if(automatic)continue;return json({error:{message:'Cohere no está configurado'}},503)}
     const cohereMessages=[...(system?[{role:'system',content:system}]:[]),...messages];
     r=await fetch('https://api.cohere.com/v2/chat',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+key},body:JSON.stringify({model:'command-a-03-2025',messages:cohereMessages,max_tokens:Math.min(Math.max(Number(body.max_tokens)||512,1),4096)}),signal:AbortSignal.timeout(25000)});
     j=await r.json();provider='Cohere';
     if(!r.ok){const status=r.status;failures.push({provider,status,message:j.message||j.error?.message||'Cohere request failed'});if(automatic&&(status===429||status===500||status===502||status===503||status===504))continue;return json({error:{message:j.message||j.error?.message||'Cohere request failed',provider}},status===429?429:502)}
     const content=(j.message?.content||[]).filter(p=>p.type==='text').map(p=>p.text||'').join('');
     return await cachedResponse(key,{id:j.id||'chatcmpl-cohere',object:'chat.completion',created:Math.floor(Date.now()/1000),model:selected,provider,failover:failures.length>0,choices:[{index:0,message:{role:'assistant',content},finish_reason:'stop'}],usage:j.usage||{},cache:'MISS'});
    }
    if(selected==='openai/gpt-oss-20b'){
     const key=process.env.GROQ_API_KEY;if(!key){failures.push({provider:'Groq',status:503,message:'Groq no está configurado'});if(automatic)continue;return json({error:{message:'Groq no está configurado'}},503)}
     const groqMessages=[...(system?[{role:'system',content:system}]:[]),...messages];
     r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+key},body:JSON.stringify({model:selected,messages:groqMessages,max_tokens:Math.min(Math.max(Number(body.max_tokens)||512,1),4096)}),signal:AbortSignal.timeout(25000)});
     j=await r.json();provider='Groq';
     if(!r.ok){const status=r.status;failures.push({provider,status,message:j.error?.message||'Groq request failed'});if(automatic&&(status===429||status===500||status===502||status===503||status===504))continue;return json({error:{message:j.error?.message||'Groq request failed',provider}},status===429?429:502)}
     return await cachedResponse(responseCacheKey,{...j,provider,failover:failures.length>0,cache:'MISS'});
    }
    return json({error:{message:'Modelo no habilitado'}},400);
   }catch(e){failures.push({provider:selected==='gemini-3.5-flash-lite'?'Gemini':selected==='openai/gpt-oss-20b'?'Groq':'Cohere',status:504,message:'Proveedor no disponible o timeout'});if(automatic)continue;return json({error:{message:'Provider unavailable or timed out'}},502)}
  }
  return json({error:{message:'Todos los proveedores disponibles agotaron cuota o no respondieron',failures,provider:'none'}},503);

 }catch{return json({error:{message:'Provider unavailable or timed out'}},502)}
}};