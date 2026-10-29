import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adminPermission } from '../src/server/adminSecurity.ts';

// H01: /radar-search is a legitimate POST route, but PUT/DELETE/PATCH
// must never bypass permission guards via Express /:id route matching.
test('H01: exact POST radar-search retains search functionality', () => {
  assert.equal(adminPermission('/api/events/radar-search', 'POST'), null);
  assert.equal(adminPermission('/api/classifieds/radar-search', 'POST'), null);
});
test('H01: all other radar-search mutations require admin permissions', () => {
  for (const method of ['PUT','DELETE','PATCH']) {
    assert.equal(adminPermission('/api/events/radar-search', method), 'event:manage', method);
    assert.equal(adminPermission('/api/classifieds/radar-search', method), 'classified:manage', method);
  }
});
test('H01: suffix-shaped IDs and nested paths are NOT exemptions', () => {
  for (const method of ['POST','PUT','DELETE','PATCH']) {
    assert.equal(adminPermission('/api/events/123/radar-search', method), 'event:manage');
    assert.equal(adminPermission('/api/classifieds/123/radar-search', method), 'classified:manage');
  }
});
test('H01: Staging early guard exceptions are method restricted', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(server, /req\.method\.toUpperCase\(\) === 'POST' && \(req\.path === '\/api\/ratings\/get' \|\| req\.path === '\/api\/events\/radar-search'\)/);
  assert.match(server, /req\.method\.toUpperCase\(\) === 'POST' && \(req\.path === '\/api\/events\/radar-search' \|\| req\.path === '\/api\/ratings\/get'\)/);
});
