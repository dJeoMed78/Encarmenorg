import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { attemptPrefix, sniffImage, parseMediaUrl, newMediaFilename, createPublicMediaService, MEDIA_MAX_BYTES } from '../src/server/publicMediaCore.ts';
import { validatePublicRegistration } from '../src/server/publicRegistrationCore.ts';
import { PUBLIC_REGISTRATION_FIELDS } from '../src/constants/publicRegistration.ts';

const webp = Buffer.from('524946460400000057454250', 'hex');
const jpeg = Buffer.from('ffd8ff000000000000000000', 'hex');
const png = Buffer.from('89504e470d0a1a0a000000', 'hex');
const goodAttempt = () => randomUUID();
const broken = async (action, code) => assert.rejects(action, e => e.code === code);

test('detects actual image signatures and rejects HTML/SVG/GIF', () => {
 assert.equal(sniffImage(webp), 'webp');
 assert.equal(sniffImage(jpeg), 'jpeg');
 assert.equal(sniffImage(png), 'png');
 for (const body of ['<svg></svg>', '<!DOCTYPE html>', 'GIF89a']) assert.equal(sniffImage(Buffer.from(body)), null);
});
test('issued media URL is constrained to server filename pattern and attempt prefix', () => {
 const prefix = attemptPrefix(goodAttempt());
 const name = newMediaFilename(prefix, 'logo');
 assert.deepEqual(parseMediaUrl('/uploads/'+name), {filename:name,prefix,role:'logo'});
 for (const url of ['https://evil.example/p.webp','data:image/webp;base64,foo','/uploads/../x.webp','/uploads/x.svg']) assert.equal(parseMediaUrl(url),null);
});
test('media service rejects absent permission and invalid attempt', async () => {
 const service = createPublicMediaService({canWrite:()=>false,store:{saveVerified:async()=>{},readBack:async()=>null},recode:async()=>webp});
 await broken(()=>service.upload({attemptId:goodAttempt(),role:'logo',declaredType:'image/webp',body:webp}),'PUBLIC_MEDIA_DISABLED');
 const active = createPublicMediaService({canWrite:()=>true,store:{saveVerified:async()=>{},readBack:async()=>null},recode:async()=>webp});
 await broken(()=>active.upload({attemptId:'wrong',role:'logo',declaredType:'image/webp',body:webp}),'MEDIA_ATTEMPT_REQUIRED');
});
test('media upload rejects spoofed type and oversized payload', async () => {
 const svc = createPublicMediaService({canWrite:()=>true,store:{saveVerified:async()=>{},readBack:async()=>null},recode:async()=>webp});
 await broken(()=>svc.upload({attemptId:goodAttempt(),role:'logo',declaredType:'image/png',body:webp}),'MEDIA_TYPE_MISMATCH');
 await broken(()=>svc.upload({attemptId:goodAttempt(),role:'logo',declaredType:'image/webp',body:Buffer.alloc(MEDIA_MAX_BYTES+1)}),'PAYLOAD_TOO_LARGE');
});
test('media upload confirms actual BLOB after storage, never accepts placeholder', async () => {
 let saved;
 const store={saveVerified:async input=>{saved=input;},readBack:async()=>({mimeType:'image/webp',data:webp})};
 const svc=createPublicMediaService({canWrite:()=>true,store,recode:async()=>webp});
 const ok=await svc.upload({attemptId:goodAttempt(),role:'logo',declaredType:'image/webp',body:webp});
 assert.ok(ok.url.startsWith('/uploads/pub-'));assert.equal(saved.mimeType,'image/webp');
 const fake=createPublicMediaService({canWrite:()=>true,store:{...store,readBack:async()=>({mimeType:'image/webp',data:Buffer.from('placeholder')})},recode:async()=>webp});
 await broken(()=>fake.upload({attemptId:goodAttempt(),role:'logo',declaredType:'image/webp',body:webp}),'MEDIA_READBACK_FAILED');
});
test('registration field allowlist includes media but no privileged fields', () => {
 for (const key of ['logo_url','image','gallery','mediaAttempt']) assert.ok(PUBLIC_REGISTRATION_FIELDS.includes(key));
 for (const key of ['id','verified','featured','status','role']) assert.ok(!PUBLIC_REGISTRATION_FIELDS.includes(key));
});
