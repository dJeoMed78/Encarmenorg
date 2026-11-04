import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { attemptPrefix, sniffImage, parseMediaUrl, newMediaFilename, createPublicMediaService, MEDIA_MAX_BYTES } from '../src/server/publicMediaCore.ts';
import { validatePublicRegistration, mediaPersisted } from '../src/server/publicRegistrationCore.ts';
import { PUBLIC_REGISTRATION_FIELDS } from '../src/constants/publicRegistration.ts';

const webp = Buffer.from('524946460400000057454250', 'hex');
const jpeg = Buffer.from('ffd8ff000000000000000000', 'hex');
const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
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

test('independent storefront cover uses its own filename role and cannot be passed as gallery or logo', () => {
  const prefix = attemptPrefix(goodAttempt());
  const cover = newMediaFilename(prefix, 'cover');
  assert.deepEqual(parseMediaUrl('/uploads/' + cover), {filename: cover, prefix, role: 'cover'});
  assert.ok(PUBLIC_REGISTRATION_FIELDS.includes('cover_url'));
  const attempt = goodAttempt();
  const coverUrl = '/uploads/' + newMediaFilename(attemptPrefix(attempt), 'cover');
  const base = {name:'Negocio de prueba', category:'Comercio', phone:'9381234567', mediaAttempt:attempt};
  assert.throws(() => validatePublicRegistration({...base, logo_url:coverUrl}), e => e.code === 'INVALID_REGISTRATION');
  assert.throws(() => validatePublicRegistration({...base, gallery:[coverUrl]}), e => e.code === 'INVALID_REGISTRATION');
});

test('twelve distinct assets persist as one logo, one cover and ten product images', () => {
 const attempt = goodAttempt();
 const prefix = attemptPrefix(attempt);
 const logo = '/uploads/' + newMediaFilename(prefix, 'logo');
 const cover = '/uploads/' + newMediaFilename(prefix, 'cover');
 const gallery = Array.from({length:10}, () => '/uploads/' + newMediaFilename(prefix, 'gallery'));
 const input = {name:'Negocio de prueba', category:'Comercio', phone:'9381234567', mediaAttempt:attempt, logo_url:logo, image:logo, cover_url:cover, gallery};
 const validated = validatePublicRegistration(input);
 assert.equal(validated.draft.logo_url, logo);
 assert.equal(validated.draft.cover_url, cover);
 assert.equal(validated.draft.gallery.length, 10);
 assert.equal(validated.media.filenames.length, 12);
 assert.ok(mediaPersisted({image:logo, raw_data:JSON.stringify(validated.draft)},validated.draft));
 assert.equal(mediaPersisted({image:logo,raw_data:JSON.stringify({...validated.draft,cover_url:''})},validated.draft),false);
 assert.throws(() => validatePublicRegistration({...input,gallery:[...gallery, '/uploads/'+newMediaFilename(prefix,'gallery')]}), e => e.code === 'INVALID_REGISTRATION');
});


test('admin quick-create media contract preserves separate logo, storefront cover and ten gallery photos', async () => {
  const {validateBusinessInput} = await import('../src/server/stagingBusinessRoutes.ts');
  const {readFileSync} = await import('node:fs');
  const source = readFileSync(new URL('../src/components/WordPressSyncModal.tsx', import.meta.url), 'utf8');
  assert.match(source, /uploadRegistrationImage\(file, 'logo', ensureNewBizMediaAttempt\(\)\)/);
  assert.match(source, /uploadRegistrationImage\(file, 'cover', ensureNewBizMediaAttempt\(\)\)/);
  assert.match(source, /uploadRegistrationImage\(file, 'gallery', ensureNewBizMediaAttempt\(\)\)/);
  assert.match(source, /newBizPendingUploads\.current > 0/);
  assert.match(source, /cover_url: ''/);
  const prefix = attemptPrefix(goodAttempt());
  const logo = '/uploads/' + newMediaFilename(prefix, 'logo');
  const cover = '/uploads/' + newMediaFilename(prefix, 'cover');
  const gallery = Array.from({length:10}, () => '/uploads/' + newMediaFilename(prefix, 'gallery'));
  const draft = validateBusinessInput({name:'Empresa de control',category:'Comercio',phone:'9381234567',image:logo,logo_url:logo,cover_url:cover,gallery}, true);
  assert.equal(draft.logo_url, logo);
  assert.equal(draft.image, logo);
  assert.equal(draft.cover_url, cover);
  assert.deepEqual(draft.gallery, gallery);
  assert.throws(() => validateBusinessInput({...draft, gallery:[...gallery,'/uploads/extra.webp']},true));
  assert.throws(() => validateBusinessInput({...draft,cover_url:'javascript:alert(1)'},true));
});
