import {lookup as dnsLookup} from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

export const IMAGE_PROXY_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_PROXY_TIMEOUT_MS = 7000;
export const IMAGE_PROXY_MAX_REDIRECTS = 3;
export const IMAGE_PROXY_DEFAULT_ALLOWED_HOSTS = ['images.unsplash.com'];

const SAFE_IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif',
  'image/gif', 'image/tiff', 'image/heif', 'image/heic'
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

type ResolvedAddress = {address: string; family: number};
type RemoteResponse = {statusCode: number; headers: Record<string, any>; body: Buffer};

function ipv4ToBigInt(address: string): bigint | null {
  const parts = address.split('.');
  if (parts.length !== 4) return null;
  let result = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet < 0 || octet > 255) return null;
    result = (result << 8n) | BigInt(octet);
  }
  return result;
}

function ipv6ToBigInt(address: string): bigint | null {
  const input = address.toLowerCase();
  if (!input || input.includes('%')) return null;
  let normalized = input;
  const ipv4Tail = normalized.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (ipv4Tail) {
    const ipv4 = ipv4ToBigInt(ipv4Tail[1]);
    if (ipv4 === null) return null;
    const high = Number((ipv4 >> 16n) & 0xffffn).toString(16);
    const low = Number(ipv4 & 0xffffn).toString(16);
    normalized = normalized.slice(0, normalized.length - ipv4Tail[1].length) + high + ':' + low;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const parts = [...left, ...Array(missing).fill('0'), ...right];
  if (parts.length !== 8 || parts.some(part => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  let result = 0n;
  for (const part of parts) result = (result << 16n) | BigInt(parseInt(part, 16));
  return result;
}

export function isPublicImageProxyAddress(address: string): boolean {
  const clean = String(address || '').toLowerCase();
  const family = net.isIP(clean);
  if (family === 4) {
    const parts = clean.split('.').map(Number);
    const [a, b, c, d] = parts;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 0 && c === 0) return false;
    if (a === 192 && b === 0 && c === 2) return false;
    if (a === 192 && b === 88 && c === 99) return false;
    if (a === 192 && b === 168) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a === 198 && b === 51 && c === 100) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    if (a === 255 && b === 255 && c === 255 && d === 255) return false;
    return true;
  }

  if (family === 6) {
    const value = ipv6ToBigInt(clean);
    if (value === null) return false;
    // Only global-unicast 2000::/3 is eligible. This rejects loopback, link-local,
    // unique-local, unspecified, IPv4-mapped and transition addresses by default.
    if ((value >> 125n) !== 1n) return false;
    const prefix32 = value >> 96n;
    const prefix28 = value >> 100n;
    const prefix20 = value >> 108n;
    if (prefix32 === 0x20010db8n || prefix32 === 0x20010000n) return false;
    if (prefix28 === 0x2001001n || prefix28 === 0x2001002n) return false;
    if ((value >> 112n) === 0x2002n || prefix20 === 0x3fff0n) return false;
    return true;
  }
  return false;
}

function validConfiguredHostname(host: string): boolean {
  if (host.length > 253 || net.isIP(host) !== 0 || host.includes('*')) return false;
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host);
}

export function getImageProxyAllowedHosts(raw = process.env.ENC_IMAGE_PROXY_ALLOWED_HOSTS || ''): Set<string> {
  const hosts = new Set(IMAGE_PROXY_DEFAULT_ALLOWED_HOSTS);
  for (const entry of String(raw).split(',')) {
    const host = entry.trim().toLowerCase().replace(/\.$/, '');
    if (validConfiguredHostname(host)) hosts.add(host);
  }
  return hosts;
}

export function normalizeAllowedImageUrl(rawUrl: string, allowedHosts: Iterable<string> = getImageProxyAllowedHosts()): URL | null {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 4096) return null;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password || url.hash) return null;
  if (url.port) return null; // Only the standard HTTP/HTTPS ports are permitted.
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!validConfiguredHostname(host)) return null;
  const allowed = new Set(Array.from(allowedHosts, item => String(item).toLowerCase().replace(/\.$/, '')));
  if (!allowed.has(host)) return null;
  url.hostname = host;
  return url;
}

export function isAllowedRemoteImageUrl(rawUrl: string, allowedHosts: Iterable<string> = getImageProxyAllowedHosts()): boolean {
  return normalizeAllowedImageUrl(rawUrl, allowedHosts) !== null;
}

function requestPinnedImage(url: URL, address: ResolvedAddress, timeoutMs: number, maxBytes: number): Promise<RemoteResponse> {
  const transport = url.protocol === 'https:' ? https : http;
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  const family = address.family || net.isIP(address.address);

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const options: any = {
      protocol: url.protocol,
      hostname,
      port: url.port ? Number(url.port) : undefined,
      method: 'GET',
      path: url.pathname + url.search,
      agent: false,
      headers: {
        Host: url.host,
        'User-Agent': 'EncarmenImageProxy/1.0',
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/tiff'
      },
      lookup: (_requestedHost: string, lookupOptions: any, callback: any) => {
        const pinned = {address: address.address, family};
        if (lookupOptions && lookupOptions.all) callback(null, [pinned]);
        else callback(null, pinned.address, pinned.family);
      }
    };
    if (url.protocol === 'https:' && net.isIP(hostname) === 0) options.servername = hostname;

    const req = transport.request(options, response => {
      const statusCode = response.statusCode || 0;
      const headers = response.headers as Record<string, any>;
      if (REDIRECT_STATUSES.has(statusCode) || statusCode < 200 || statusCode >= 300) {
        response.on('error', () => undefined);
        response.destroy();
        if (!settled) {
          settled = true;
          resolve({statusCode, headers, body: Buffer.alloc(0)});
        }
        return;
      }

      const contentType = String(headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (!SAFE_IMAGE_CONTENT_TYPES.has(contentType)) {
        response.destroy();
        fail(new Error('IMAGE_PROXY_UNSUPPORTED_CONTENT_TYPE'));
        return;
      }
      const contentLength = Number(headers['content-length']);
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        response.destroy();
        fail(new Error('IMAGE_PROXY_RESPONSE_TOO_LARGE'));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      response.on('data', chunk => {
        if (settled) return;
        const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += part.length;
        if (total > maxBytes) {
          fail(new Error('IMAGE_PROXY_RESPONSE_TOO_LARGE'));
          response.destroy();
          req.destroy();
          return;
        }
        chunks.push(part);
      });
      response.on('end', () => {
        if (settled) return;
        settled = true;
        resolve({statusCode, headers, body: Buffer.concat(chunks)});
      });
      response.on('aborted', () => fail(new Error('IMAGE_PROXY_RESPONSE_ABORTED')));
      response.on('error', fail);
    });

    req.on('error', fail);
    const timer = setTimeout(() => req.destroy(new Error('IMAGE_PROXY_TIMEOUT')), Math.max(1, timeoutMs));
    req.once('close', () => clearTimeout(timer));
    req.end();
  });
}

export async function fetchRemoteImageBuffer(rawUrl: string, options: any = {}): Promise<Buffer> {
  const allowedHosts: Iterable<string> = options.allowedHosts || getImageProxyAllowedHosts(options.allowedHostsRaw);
  const lookup = options.lookup || ((host: string) => dnsLookup(host, {all: true, verbatim: true}));
  const request = options.request || requestPinnedImage;
  const maxBytes = Number.isFinite(options.maxBytes) ? Math.max(1, options.maxBytes) : IMAGE_PROXY_MAX_BYTES;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, options.timeoutMs) : IMAGE_PROXY_TIMEOUT_MS;
  const maxRedirects = Number.isFinite(options.maxRedirects) ? Math.max(0, options.maxRedirects) : IMAGE_PROXY_MAX_REDIRECTS;
  const deadline = Date.now() + timeoutMs;
  let current = normalizeAllowedImageUrl(rawUrl, allowedHosts);
  if (!current) throw new Error('IMAGE_PROXY_URL_NOT_ALLOWED');

  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const host = current.hostname.toLowerCase().replace(/\.$/, '');
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('IMAGE_PROXY_TIMEOUT');

    let resolved: ResolvedAddress[];
    try {
      resolved = net.isIP(host)
        ? [{address: host, family: net.isIP(host)}]
        : await lookup(host);
    } catch {
      throw new Error('IMAGE_PROXY_DNS_FAILED');
    }
    if (!Array.isArray(resolved) || resolved.length === 0) throw new Error('IMAGE_PROXY_DNS_EMPTY');
    if (resolved.some(item => !item || !isPublicImageProxyAddress(item.address))) throw new Error('IMAGE_PROXY_NON_PUBLIC_ADDRESS');

    const selected = resolved[0];
    const response: RemoteResponse = await request(current, selected, remaining, maxBytes);
    if (REDIRECT_STATUSES.has(response.statusCode)) {
      const location = response.headers && response.headers.location;
      if (typeof location !== 'string' || !location.trim()) throw new Error('IMAGE_PROXY_REDIRECT_INVALID');
      if (redirects >= maxRedirects) throw new Error('IMAGE_PROXY_TOO_MANY_REDIRECTS');
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new Error('IMAGE_PROXY_REDIRECT_INVALID');
      }
      if (current.protocol === 'https:' && next.protocol !== 'https:') throw new Error('IMAGE_PROXY_REDIRECT_DOWNGRADE');
      current = normalizeAllowedImageUrl(next.href, allowedHosts);
      if (!current) throw new Error('IMAGE_PROXY_REDIRECT_NOT_ALLOWED');
      continue;
    }
    if (response.statusCode !== 200) throw new Error('IMAGE_PROXY_UPSTREAM_STATUS');
    const contentType = String(response.headers && response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!SAFE_IMAGE_CONTENT_TYPES.has(contentType)) throw new Error('IMAGE_PROXY_UNSUPPORTED_CONTENT_TYPE');
    if (!Buffer.isBuffer(response.body) || response.body.length === 0 || response.body.length > maxBytes) throw new Error('IMAGE_PROXY_RESPONSE_TOO_LARGE');
    return response.body;
  }
  throw new Error('IMAGE_PROXY_TOO_MANY_REDIRECTS');
}
