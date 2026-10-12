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

  const day = map.day || '02';
  const month = map.month || '10';
  const year = map.year || '26';
  const hour = map.hour || '12';
  const minute = map.minute || '00';

  return `${day}${month}${year}:${hour}${minute}`;
}

const version = getCarmenVersion();
const filePath = path.resolve(__dirname, '../src/constants/version.ts');
const fileContent = `// Automatic dynamic version control stamp for Empresas en Carmen
// Updated automatically on every build (Format: DDMMYY:HHMM - Hora de Carmen / Campeche)
export const APP_VERSION = '${version}';
export const APP_BUILD_TIMESTAMP = '${new Date().toISOString()}';
`;

fs.writeFileSync(filePath, fileContent, 'utf8');
console.log(`[Version Stamp] APP_VERSION actualizada exitosamente a: ${version}`);
