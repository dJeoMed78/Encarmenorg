import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isPublicImageProxyAddress, getImageProxyAllowedHosts, normalizeAllowedImageUrl, fetchRemoteImageBuffer} from '../src/server/imageProxySecurity.ts';

const publicV4 = '93.184.216.34';
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

function mockResponse(overrides = {}) {
  return {
    statusCode: 200,
    headers: {'content-type': 'image/png', 'content-length': String(png.length)},
    body: png,
    ...overrides,
  };
}

test('public address filter rejects private, loopback, link-local, reserved and transition ranges', () => {
  for (const address of [
    '0.0.0.0', '10.1.2.3', '100.64.0.1', '127.0.0.1', '169.254.169.254',
    '172.16.0.1', '172.31.255.254', '192.0.0.8', '192.0.2.1', '192.88.99.1',
    '192.168.1.1', '198.18.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1',
    '255.255.255.255', '::', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fd00::1',
    'fe80::1', '2001:db8::1', '2001:0::1', '2001:10::1', '2001:20::1',
    '2002::1', '3fff::1'
  ]) assert.equal(isPublicImageProxyAddress(address), false, address);
  for (const address of [publicV4, '8.8.8.8', '1.1.1.1', '2001:4860:4860::8888', '2606:4700:4700::1111']) {
    assert.equal(isPublicImageProxyAddress(address), true, address);
  }
});

test('allowlist is exact, normalized and rejects credentials, IP literals and nonstandard ports', () => {
  const hosts = getImageProxyAllowedHosts('cdn.example.com,*.wild.example,127.0.0.1,evil.example/path');
  assert.ok(hosts.has('images.unsplash.com'));
  assert.ok(hosts.has('cdn.example.com'));
  assert.equal(hosts.has('*.wild.example'), false);
  assert.equal(hosts.has('127.0.0.1'), false);
  assert.equal(normalizeAllowedImageUrl('https://images.unsplash.com/photo.jpg', hosts)?.hostname, 'images.unsplash.com');
  for (const url of [
    'file:///etc/passwd', 'ftp://images.unsplash.com/a.jpg',
    'https://images.unsplash.com.evil.example/a.jpg',
    'https://user:pass@images.unsplash.com/a.jpg',
    'https://127.0.0.1/a.jpg', 'https://images.unsplash.com:8443/a.jpg',
    'https://images.unsplash.com/a.jpg#fragment', 'https://not-allowed.example/a.jpg'
  ]) assert.equal(normalizeAllowedImageUrl(url, hosts), null, url);
});

test('fetch resolves every DNS answer, pins the validated address and returns only bounded image bodies', async () => {
  let requested;
  const result = await fetchRemoteImageBuffer('https://images.unsplash.com/photo.png', {
    lookup: async host => {
      assert.equal(host, 'images.unsplash.com');
      return [{address: publicV4, family: 4}];
    },
    request: async (url, address, timeoutMs, maxBytes) => {
      requested = {host: url.hostname, address, timeoutMs, maxBytes};
      return mockResponse();
    }
  });
  assert.deepEqual(result, png);
  assert.equal(requested.host, 'images.unsplash.com');
  assert.deepEqual(requested.address, {address: publicV4, family: 4});
  assert.ok(requested.timeoutMs > 0);
  assert.ok(requested.maxBytes >= png.length);
});

test('DNS answers containing any private address fail closed before connecting', async () => {
  let connected = false;
  await assert.rejects(fetchRemoteImageBuffer('https://images.unsplash.com/photo.png', {
    lookup: async () => [{address: publicV4, family: 4}, {address: '10.0.0.7', family: 4}],
    request: async () => { connected = true; return mockResponse(); }
  }), /IMAGE_PROXY_NON_PUBLIC_ADDRESS/);
  assert.equal(connected, false);
});

test('every redirect is revalidated against the allowlist and DNS address policy', async () => {
  let calls = 0;
  await assert.rejects(fetchRemoteImageBuffer('https://images.unsplash.com/photo.png', {
    allowedHosts: ['images.unsplash.com', 'cdn.example.com'],
    lookup: async host => [{address: host === 'images.unsplash.com' ? publicV4 : '169.254.169.254', family: 4}],
    request: async () => {
      calls++;
      return {statusCode: 302, headers: {location: 'https://cdn.example.com/latest.png'}, body: Buffer.alloc(0)};
    }
  }), /IMAGE_PROXY_NON_PUBLIC_ADDRESS/);
  assert.equal(calls, 1);
});

test('redirects to unapproved hosts and HTTPS-to-HTTP downgrade are rejected', async () => {
  await assert.rejects(fetchRemoteImageBuffer('https://images.unsplash.com/photo.png', {
    lookup: async () => [{address: publicV4, family: 4}],
    request: async () => ({statusCode: 302, headers: {location: 'https://attacker.example/internal'}, body: Buffer.alloc(0)})
  }), /IMAGE_PROXY_REDIRECT_NOT_ALLOWED/);
  await assert.rejects(fetchRemoteImageBuffer('https://images.unsplash.com/photo.png', {
    lookup: async () => [{address: publicV4, family: 4}],
    request: async () => ({statusCode: 302, headers: {location: 'http://images.unsplash.com/photo.png'}, body: Buffer.alloc(0)})
  }), /IMAGE_PROXY_REDIRECT_DOWNGRADE/);
});

test('redirect count, upstream status, MIME and response size are bounded', async () => {
  let redirects = 0;
  await assert.rejects(fetchRemoteImageBuffer('https://images.unsplash.com/a.png', {
    maxRedirects: 1,
    lookup: async () => [{address: publicV4, family: 4}],
    request: async url => { redirects++; return {statusCode: 302, headers: {location: url.href + '?next=1'}, body: Buffer.alloc(0)}; }
  }), /IMAGE_PROXY_TOO_MANY_REDIRECTS/);
  assert.equal(redirects, 2);

  await assert.rejects(fetchRemoteImageBuffer('https://images.unsplash.com/a.png', {
    lookup: async () => [{address: publicV4, family: 4}],
    request: async () => mockResponse({statusCode: 503})
  }), /IMAGE_PROXY_UPSTREAM_STATUS/);
  await assert.rejects(fetchRemoteImageBuffer('https://images.unsplash.com/a.png', {
    lookup: async () => [{address: publicV4, family: 4}],
    request: async () => mockResponse({headers: {'content-type': 'text/html'}})
  }), /IMAGE_PROXY_UNSUPPORTED_CONTENT_TYPE/);
  await assert.rejects(fetchRemoteImageBuffer('https://images.unsplash.com/a.png', {
    maxBytes: 4,
    lookup: async () => [{address: publicV4, family: 4}],
    request: async () => mockResponse()
  }), /IMAGE_PROXY_RESPONSE_TOO_LARGE/);
});

test('server route delegates remote downloads to the guarded proxy and never redirects raw user URLs', () => {
  const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(source, /fetchRemoteImageBuffer\(decodedUrl/);
  assert.match(source, /isAllowedRemoteImageUrl\(decodedUrl/);
  assert.doesNotMatch(source, /fetch\(decodedUrl/);
  assert.doesNotMatch(source, /res\.redirect\(302,\s*rawUrl\)/);
});
