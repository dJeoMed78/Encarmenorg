const fs = require('fs');
const path = require('path');

function getCarmenVersion() {
  const now = new Date();
  const options = {
    timeZone: 'America/Merida',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat('es-MX', options);
  const parts = formatter.formatToParts(now);
  const map = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const day = map.day || '26';
  const month = map.month || '10';
  const year = map.year || '26';
  const hour = map.hour || '12';
  const minute = map.minute || '00';

  let deployCode = process.env.VERCEL_GIT_COMMIT_SHA
    ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
    : (process.env.DEPLOY_CODE || Math.random().toString(36).substring(2, 9));

  // Hostinger es la plataforma de hosting oficial y exclusiva
  const hosting = 'H';

  return `${day}${month}${year}:${hour}${minute}:${deployCode}:${hosting}`;
}

async function flushCloudflareAndSiteCache(version) {
  try {
    const cfZoneIds = (process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const cfToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || '';
    const cfEmail = process.env.CLOUDFLARE_EMAIL || '';
    const cfGlobalKey = process.env.CLOUDFLARE_API_KEY || '';

    for (const zoneId of cfZoneIds) {
      const headers = { 'Content-Type': 'application/json' };
      if (cfToken) {
        headers['Authorization'] = `Bearer ${cfToken}`;
      } else if (cfEmail && cfGlobalKey) {
        headers['X-Auth-Email'] = cfEmail;
        headers['X-Auth-Key'] = cfGlobalKey;
      } else {
        continue;
      }

      const cfUrl = 'https://' + `api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
      await fetch(cfUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ purge_everything: true })
      }).catch(() => {});
      console.log(`[Cloudflare Flush] Purga total enviada a Zone ID: ${zoneId}`);
    }

    const urlsToPurge = [
      'https://' + 'encarmen.org/',
      'https://' + 'www.encarmen.org/',
      'https://' + 'empresasencarmen.com/',
      'https://' + 'www.empresasencarmen.com/'
    ];

    for (const u of urlsToPurge) {
      await fetch(u, {
        method: 'PURGE',
        headers: {
          'x-litespeed-purge': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }).catch(() => {});
      await fetch(`${u}?flush_version=${encodeURIComponent(version)}`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      }).catch(() => {});
    }
    console.log(`[Cache Flush] Señal de recarga enviada a encarmen.org y empresasencarmen.com (${version})`);
  } catch (err) {
    console.warn('[Cache Flush] Aviso:', err.message);
  }
}

const version = getCarmenVersion();
const filePath = path.resolve(__dirname, '../src/constants/version.ts');
const fileContent = `// Automatic dynamic version control stamp for Empresas en Carmen
// Updated automatically on every build (Format: DDMMYY:HHMM:DEPLOY_CODE:HOSTING_ID - Hora de Carmen / Campeche)
export const APP_VERSION = '${version}';
export const APP_BUILD_TIMESTAMP = '${new Date().toISOString()}';
`;

fs.writeFileSync(filePath, fileContent, 'utf8');
console.log(`[Version Stamp] APP_VERSION actualizada exitosamente a: ${version}`);
flushCloudflareAndSiteCache(version);
