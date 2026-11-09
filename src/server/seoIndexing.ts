export const SEO_PRIMARY_ORIGIN = 'https://encarmen.org';
export const SEO_PRIMARY_HOST = 'encarmen.org';
export const SEO_STAGING_HOST = 'staging.encarmen.org';

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

export function buildSeoRobotsTxt(rawHost?: string | null, appEnv?: string | null): string {
  const common = 'User-agent: *\\nAllow: /\\nDisallow: /api/\\nDisallow: /admin/\\n';
  if (isStagingSeoRequest(rawHost, appEnv)) return common;
  return `${common}\\nSitemap: ${SEO_PRIMARY_ORIGIN}/sitemap.xml\\n`;
}
