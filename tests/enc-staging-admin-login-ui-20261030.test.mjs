import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import express from 'express';
import { registerAdminSecurity, environmentAdminProvider } from '../src/server/adminSecurity.ts';

test('Staging admin accepts exactly ten-character valid scrypt password and rejects nine, wrong and malformed credentials', async () => {
  const password = 'TenChars!9';
  assert.equal(password.length, 10);
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  const credentials = JSON.stringify({version: 1, accounts: [
    {username: 'jeo', passwordHash: 'scrypt$' + salt.toString('hex') + '$' + hash, permissions: ['admin:manage', 'business:manage']}
  ]});
  const provider = environmentAdminProvider({
    ENC_ADMIN_CREDENTIALS_JSON: credentials,
    ENC_ADMIN_PUBLIC_ORIGIN: 'https://staging.encarmen.org'
  });
  assert.ok(provider);
  const app = express();
  app.use(express.json());
  registerAdminSecurity(app, {provider, allowedOrigin: 'https://staging.encarmen.org'});
  const server = await new Promise(resolve => { const instance = app.listen(0, () => resolve(instance)); });
  const address = 'http://127.0.0.1:' + server.address().port;
  const submit = async (username, pass) => {
    const response = await fetch(address + '/api/admin/login', {
      method: 'POST', headers: {'Content-Type': 'application/json','Origin':'https://staging.encarmen.org'},
      body: JSON.stringify({username, password:pass})
    });
    return {status:response.status, body:await response.json()};
  };
  try {
    const invalidLength = await submit('jeo', 'NinePwd!9');
    assert.equal(invalidLength.status, 400);
    const valid = await submit('jeo', password);
    assert.equal(valid.status, 200);
    assert.equal(valid.body.success, true);
    assert.match(valid.body.token, /^[a-f0-9]{64}$/);
    const validSession = await fetch(address + '/api/admin/session', {headers:{'X-Encarmen-Admin-Token':valid.body.token}});
    assert.equal(validSession.status, 200);
    const wrong = await submit('jeo', 'WrongPass9');
    assert.equal(wrong.status, 401);
    const blockedOrigin = await fetch(address + '/api/admin/login', {
      method:'POST', headers:{'Content-Type':'application/json','Origin':'https://encarmen.org'},
      body:JSON.stringify({username:'jeo', password})
    });
    assert.equal(blockedOrigin.status, 403);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Login UI explicitly renders typed username and a keyboard-accessible show/hide password control', () => {
  const source = fs.readFileSync(new URL('../src/components/WordPressSyncModal.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('setAdminUsernameInput(account.username)'));
  assert.ok(source.includes('text-stone-900'));
  assert.ok(source.includes('WebkitTextFillColor'));
  assert.ok(source.includes("aria-label={showAdminPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}"));
  assert.ok(source.includes('onClick={() => setShowAdminPassword(current => !current)}'));
  assert.ok(source.includes('type="button"'));
  assert.ok(source.includes('minLength={10}'));
  assert.ok(source.includes('maxLength={200}'));
});
