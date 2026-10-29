const fs=require('fs'),path=require('path');
if(!fs.existsSync(path.join(process.cwd(),'IV_LOCAL_OWNED'))||process.env.APP_ENV!=='staging'||process.env.STAGING_READ_ONLY!=='true'||process.env.DB_PASSWORD)throw Error('Unsafe full-server test environment');
const net=require('net'),http=require('http'),https=require('https');
const originalListen=net.Server.prototype.listen;
net.Server.prototype.listen=function(...args){if(typeof args[0]==='number'){args[0]=0;args[1]='127.0.0.1';this.once('listening',()=>console.log('IV_READY:'+this.address().port));}return originalListen.apply(this,args);};
const fetch=globalThis.fetch;
globalThis.fetch=(url,options)=>{const parsed=new URL(String(url));if(!['127.0.0.1','localhost'].includes(parsed.hostname))return Promise.reject(Error('External network denied in disposable fixture'));return fetch(url,options);};
https.request=https.get=()=>{throw Error('External HTTPS denied in disposable fixture');};
