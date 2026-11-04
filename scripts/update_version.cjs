const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Only a real 40-character Git commit SHA is accepted as a release identity.
// Never use random strings or timestamp-only values to impersonate a commit.
function verifiedCommitSha() {
  try {
    const sha = execFileSync('git', ['rev-parse', '--verify', 'HEAD^{commit}'], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim().toLowerCase();
    if (/^[a-f0-9]{40}$/.test(sha)) return sha;
  } catch (_) {
    // Source packages without .git may supply the exact Git commit from CI.
  }
  for (const candidate of [process.env.ENCARMEN_SOURCE_COMMIT_SHA, process.env.GITHUB_SHA]) {
    if (/^[a-f0-9]{40}$/i.test(candidate || '')) return candidate.toLowerCase();
  }
  return null;
}

function buildStamp() {
  const timestamp = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Merida',
    year: '2-digit', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(({type,value}) => [type,value]));
  const dateTime = `${parts.day}${parts.month}${parts.year}:${parts.hour}${parts.minute}`;
  const sha = verifiedCommitSha();
  return {
    version: `${dateTime}:${sha ? sha.slice(0, 12) : 'SIN-SHA'}:H`,
    sha,
    buildTimestamp: timestamp.toISOString()
  };
}

const stamp = buildStamp();
const output = `// Generated at build time. Do not edit manually.
// Version format: DDMMYY:HHMM:COMMIT_12_OR_SIN-SHA:H (Ciudad del Carmen).
export const APP_VERSION = ${JSON.stringify(stamp.version)};
export const APP_COMMIT_SHA: string | null = ${JSON.stringify(stamp.sha)};
export const APP_BUILD_TIMESTAMP = ${JSON.stringify(stamp.buildTimestamp)};
`;
fs.writeFileSync(path.resolve(__dirname, '../src/constants/version.ts'), output, 'utf8');
console.log(`[Version Stamp] Build: ${stamp.version}; SHA_VERIFIED=${stamp.sha ? 'yes' : 'no'}`);
// The script never purges caches or changes a server/database.
