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

const version = getCarmenVersion();
const filePath = path.resolve(__dirname, '../src/constants/version.ts');
const fileContent = `// Automatic dynamic version control stamp for Empresas en Carmen
// Updated automatically on every build (Format: DDMMYY:HHMM:DEPLOY_CODE:HOSTING_ID - Hora de Carmen / Campeche)
export const APP_VERSION = '${version}';
export const APP_BUILD_TIMESTAMP = '${new Date().toISOString()}';
`;

fs.writeFileSync(filePath, fileContent, 'utf8');
console.log(`[Version Stamp] APP_VERSION actualizada exitosamente a: ${version}`);
// No purge requests: staging builds must never invalidate production caches.
