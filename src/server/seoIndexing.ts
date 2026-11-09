import { isIP } from 'node:net';

export const SEO_PRIMARY_ORIGIN = 'https://encarmen.org';
export const SEO_PRIMARY_HOST = 'encarmen.org';
export const SEO_STAGING_HOST = 'staging.encarmen.org';
const SEO_ALIAS_HOSTS = new Set(['empresasencarmen.com', 'www.empresasencarmen.com', 'www.encarmen.org']);

export function normalizeSeoHost(rawHost?: string | null): string {
  if (typeof rawHost !== 'string' || !rawHost.trim()) return '';
  const candidate = rawHost.split(',')[0].trim().toLowerCase();
  try {
    return new URL(candidate.includes('://') ? candidate : `https://${candidate}`).hostname.toLowerCase();
  } catch {
    return candidate.replace(/:\\d+$/, '');
  }
}

export function isStagingSeoRequest(rawHost?: string | null, appEnv?: string | null): boolean {
  return String(appEnv || '').trim().toLowerCase() === 'staging' || normalizeSeoHost(rawHost) === SEO_STAGING_HOST;
}

export function isCanonicalSeoHost(rawHost?: string | null): boolean {
  return normalizeSeoHost(rawHost) === SEO_PRIMARY_HOST;
}

export function getCanonicalSeoOrigin(rawHost?: string | null, appEnv?: string | null): string {
  return isStagingSeoRequest(rawHost, appEnv) ? `https://${SEO_STAGING_HOST}` : SEO_PRIMARY_ORIGIN;
}

/** Redirect known public aliases to the official origin, preserving path and query. */
export function getSeoCanonicalRedirect(rawHost?: string | null, requestUrl?: string | null, appEnv?: string | null): string | null {
  const host = normalizeSeoHost(rawHost);
  if (isStagingSeoRequest(host, appEnv) || !SEO_ALIAS_HOSTS.has(host)) return null;
  const suffix = typeof requestUrl === 'string' && requestUrl.startsWith('/') ? requestUrl : '/';
  return `${SEO_PRIMARY_ORIGIN}${suffix}`;
}

export function buildSeoRobotsTxt(rawHost?: string | null, appEnv?: string | null): string {
  const common = 'User-agent: *\\nAllow: /\\nDisallow: /api/\\nDisallow: /admin/\\n';
  if (isStagingSeoRequest(rawHost, appEnv)) return common;
  return `${common}\\nSitemap: ${SEO_PRIMARY_ORIGIN}/sitemap.xml\\n`;
}

/** Match crawler tokens only; the caller must still verify the source IP using reverse and forward DNS. */
export function isGoogleCrawlerUserAgent(userAgent?: string | null): boolean {
  return typeof userAgent === 'string' && /Googlebot|Google-InspectionTool|GoogleOther|Storebot-Google|AdsBot-Google/i.test(userAgent);
}

export function isGoogleCrawlerHostname(hostname?: string | null): boolean {
  const host = typeof hostname === 'string' ? hostname.toLowerCase().replace(/\\.$/, '') : '';
  return ['googlebot.com', 'google.com', 'googleusercontent.com'].some(domain => host === domain || host.endsWith(`.${domain}`));
}

function normalizeIp(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized;
}

/** Google crawler verification: a Google crawler UA plus reverse-DNS hostname and matching forward-DNS IP. */
export function isVerifiedGoogleCrawlerDns(
  userAgent: string | null | undefined,
  clientIp: string | null | undefined,
  reverseHosts: string[],
  forwardAddressesByHost: Record<string, string[]>
): boolean {
  if (!isGoogleCrawlerUserAgent(userAgent) || !clientIp || isIP(normalizeIp(clientIp)) === 0) return false;
  const ip = normalizeIp(clientIp);
  return reverseHosts.some(rawHost => {
    const host = rawHost.toLowerCase().replace(/\\.$/, '');
    if (!isGoogleCrawlerHostname(host)) return false;
    return (forwardAddressesByHost[host] || []).some(address => normalizeIp(address) === ip);
  });
}

/** Retire public WordPress/WooCommerce routes without exposing directory listings or blocking individual media files. */
export function getLegacyWordPressRetirement(pathname?: string | null): { status: 404 | 410; reason: string } | null {
  if (typeof pathname !== 'string') return null;
  const normalized = pathname.split('?')[0].replace(/\\/+$/, '').toLowerCase() || '/';
  if (/^\\/wp-admin(?:\\/|$)/.test(normalized)) {
    return { status: 410, reason: 'legacy-wordpress-admin-retired' };
  }
  if (/^\\/product-category(?:\\/|$)/.test(normalized)) {
    return { status: 410, reason: 'legacy-woocommerce-category-retired' };
  }
  if (normalized === '/wp-content/uploads') {
    return { status: 404, reason: 'legacy-uploads-directory-not-public' };
  }
  return null;
}
