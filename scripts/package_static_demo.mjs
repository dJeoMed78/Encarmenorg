#!/usr/bin/env node
/**
 * scripts/package_static_demo.mjs
 * 
 * ENCARMEN — Static Demo Packager for Cloudflare Pages
 * Task: ENC-DEMO-STATIC-PACKAGER-001
 * 
 * Automated, secure, and reproducible packager for frontend Vite/React static builds.
 * Implements strict allowlist inclusion, rejection of sensitive files, secret scanning,
 * SPA fallback generation, and cryptographic manifest verification.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION & ALLOWLIST ---

export const ALLOWED_EXTENSIONS = new Set([
  // Web documents & scripts
  '.html',
  '.htm',
  '.css',
  '.js',
  '.mjs',
  '.map',
  '.txt',
  '.xml',
  '.webmanifest',
  '.manifest',
  // Structured data (subject to filename restrictions)
  '.json',
  // Images & Vector
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.ico',
  '.gif',
  '.avif',
  // Fonts & Media
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.mp4',
  '.webm',
  '.mp3'
]);

// Explicitly prohibited file patterns (triggers high-priority rejection or abort)
export const PROHIBITED_EXTENSIONS = new Set([
  '.sql',
  '.env',
  '.zip',
  '.tar',
  '.gz',
  '.tgz',
  '.7z',
  '.rar',
  '.bak',
  '.swp',
  '.old',
  '.orig',
  '.dump',
  '.key',
  '.pem',
  '.crt',
  '.cer',
  '.p12',
  '.pfx',
  '.sqlite',
  '.sqlite3',
  '.db',
  '.mdb',
  '.php',
  '.py',
  '.sh',
  '.bash',
  '.ts',
  '.tsx'
]);

export const PROHIBITED_FILENAME_PATTERNS = [
  /^\.env/i,
  /^id_rsa/i,
  /^id_dsa/i,
  /^id_ed25519/i,
  /.*password.*/i,
  /.*secret.*/i,
  /.*credential.*/i,
  /.*admin_overrides.*/i,
  /.*coupons_db.*/i,
  /.*classifieds_db.*/i,
  /.*events_db.*/i,
  /.*promotions_db.*/i,
  /.*ratings_db.*/i,
  /.*hostinger.*\.sql/i,
  /.*mariadb.*\.sql/i
];

// Content Secret Scanning Patterns
export const SECRET_PATTERNS = [
  {
    name: 'Private Key Block',
    severity: 'CRITICAL',
    regex: /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+|PGP\s+)?PRIVATE\s+KEY-----/i
  },
  {
    name: 'Database Connection String with Credentials',
    severity: 'CRITICAL',
    regex: /(?:mysql|mariadb|postgres|postgresql|mongodb(?:\+srv)?):\/\/[^\s:@'"]+:[^\s@'"]+@[^\s\/'":]+/i
  },
  {
    name: 'AWS Access Key ID',
    severity: 'HIGH',
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/
  },
  {
    name: 'GitHub Personal / Fine-Grained Token',
    severity: 'HIGH',
    regex: /gh[pousr]_[A-Za-z0-9_]{36,}/
  },
  {
    name: 'Stripe Live Secret Key',
    severity: 'CRITICAL',
    regex: /sk_live_[0-9a-zA-Z]{24,}/
  },
  {
    name: 'Explicit MariaDB / MySQL Hardcoded Password Assignment',
    severity: 'CRITICAL',
    regex: /(?:DB_PASSWORD|MYSQL_PASSWORD|MARIADB_PASSWORD|database_password)\s*[:=]\s*["'][^"']{4,}["']/i
  },
  {
    name: 'Hardcoded Auth Bearer Token',
    severity: 'HIGH',
    regex: /["']Bearer\s+ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*["']/i
  }
];

// --- UTILITY FUNCTIONS ---

export function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return sha256Buffer(content);
}

export function validateHtmlStructure(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return { valid: false, reason: 'Empty or non-string HTML content' };
  }
  const trimmed = htmlContent.trim();
  if (trimmed.length < 30) {
    return { valid: false, reason: 'HTML file content is too short to be valid' };
  }
  const hasDoctypeOrHtml = /<!DOCTYPE\s+html/i.test(trimmed) || /<html[\s>]/i.test(trimmed);
  const hasBodyOrRoot = /<body[\s>]/i.test(trimmed) || /id=["']root["']/i.test(trimmed) || /<\/html>/i.test(trimmed);

  if (!hasDoctypeOrHtml || !hasBodyOrRoot) {
    return { valid: false, reason: 'HTML file missing standard <html> or <body> / #root structure' };
  }
  return { valid: true };
}

export function scanContentForSecrets(content, relPath) {
  const findings = [];
  for (const pattern of SECRET_PATTERNS) {
    const match = pattern.regex.exec(content);
    if (match) {
      const matchText = match[0];
      const preview = matchText.length > 30 ? matchText.slice(0, 15) + '...' + matchText.slice(-6) : matchText;
      findings.push({
        file: relPath,
        patternName: pattern.name,
        severity: pattern.severity,
        matchPreview: preview
      });
    }
  }
  return findings;
}

/**
 * Validates and classifies a candidate file path.
 */
export function classifyCandidate(relPath, fullPath, inputRoot) {
  // 1. Path traversal check
  const resolved = path.resolve(inputRoot, relPath);
  const relFromRoot = path.relative(inputRoot, resolved);
  if (relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot)) {
    return { allowed: false, reason: 'Path traversal escape detected' };
  }

  // 2. Hidden file/folder check
  const segments = relPath.split(/[/\\]/);
  for (const seg of segments) {
    if (seg.startsWith('.') && seg !== '.' && seg !== '..') {
      return { allowed: false, reason: `Hidden file or directory rejected: ${seg}` };
    }
  }

  const basename = path.basename(relPath);
  const ext = path.extname(relPath).toLowerCase();

  // 3. Prohibited filename patterns
  for (const rx of PROHIBITED_FILENAME_PATTERNS) {
    if (rx.test(basename)) {
      return { allowed: false, reason: `Prohibited filename pattern matched: ${rx}` };
    }
  }

  // 4. Prohibited extensions
  if (PROHIBITED_EXTENSIONS.has(ext)) {
    return { allowed: false, reason: `Prohibited sensitive extension: ${ext}` };
  }

  // 5. Allowlist check
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { allowed: false, reason: `Extension ${ext || '(none)'} not in allowed list` };
  }

  return { allowed: true };
}

/**
 * Main packager execution engine.
 */
export async function packageStaticDemo(options = {}) {
  const {
    inputDir = path.resolve(process.cwd(), 'dist'),
    outputDir = path.resolve(process.cwd(), 'dist-demo'),
    cleanOutput = true,
    strictSecrets = true,
    allowSpaRedirects = true,
    timestamp = process.env.SOURCE_DATE_EPOCH ? new Date(parseInt(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString() : new Date().toISOString(),
    logger = console
  } = options;

  const startTime = Date.now();
  const inputAbs = path.resolve(inputDir);
  const outputAbs = path.resolve(outputDir);

  const report = {
    packager: 'encarmen-static-demo-packager',
    version: '1.0.0',
    timestamp: timestamp,
    inputDir: inputAbs,
    outputDir: outputAbs,
    success: false,
    exitCode: 1,
    filesScanned: 0,
    filesIncluded: 0,
    filesRejected: 0,
    totalBytes: 0,
    rejectedDetails: [],
    securityAlerts: [],
    errors: []
  };

  logger.log(`[PACKAGER] Initializing Static Demo Packager...`);
  logger.log(`[PACKAGER] Input directory:  ${inputAbs}`);
  logger.log(`[PACKAGER] Output directory: ${outputAbs}`);

  // 1. Verify input directory
  if (!fs.existsSync(inputAbs)) {
    const err = `Input directory does not exist: ${inputAbs}`;
    logger.error(`[ERROR] ${err}`);
    report.errors.push(err);
    report.exitCode = 1;
    return report;
  }

  const inputStat = fs.statSync(inputAbs);
  if (!inputStat.isDirectory()) {
    const err = `Input path is not a directory: ${inputAbs}`;
    logger.error(`[ERROR] ${err}`);
    report.errors.push(err);
    report.exitCode = 1;
    return report;
  }

  // Prevent input and output collision
  if (inputAbs === outputAbs) {
    const err = `Input and output directories cannot be the same.`;
    logger.error(`[ERROR] ${err}`);
    report.errors.push(err);
    report.exitCode = 1;
    return report;
  }

  // 2. Validate index.html existence and integrity
  const indexHtmlPath = path.join(inputAbs, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    const err = `Validation failed: index.html is missing in ${inputAbs}. Incomplete build output.`;
    logger.error(`[ERROR] ${err}`);
    report.errors.push(err);
    report.exitCode = 1;
    return report;
  }

  const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
  const htmlCheck = validateHtmlStructure(indexContent);
  if (!htmlCheck.valid) {
    const err = `Validation failed on index.html: ${htmlCheck.reason}`;
    logger.error(`[ERROR] ${err}`);
    report.errors.push(err);
    report.exitCode = 1;
    return report;
  }

  // 3. Collect and classify all files
  const candidateList = [];
  const walkQueue = [''];

  while (walkQueue.length > 0) {
    const currentRel = walkQueue.shift();
    const currentAbs = path.join(inputAbs, currentRel);

    let entries;
    try {
      entries = fs.readdirSync(currentAbs, { withFileTypes: true });
    } catch (e) {
      const err = `Failed reading directory ${currentRel || '.'}: ${e.message}`;
      report.errors.push(err);
      continue;
    }

    for (const entry of entries) {
      const itemRel = currentRel ? path.join(currentRel, entry.name) : entry.name;
      const itemAbs = path.join(inputAbs, itemRel);

      // Traversal protection
      const resolved = path.resolve(inputAbs, itemRel);
      if (!resolved.startsWith(inputAbs)) {
        report.filesRejected++;
        report.rejectedDetails.push({ path: itemRel, reason: 'Path traversal attempt detected' });
        continue;
      }

      // Check symlinks
      if (entry.isSymbolicLink()) {
        try {
          const realTarget = fs.realpathSync(itemAbs);
          if (!realTarget.startsWith(inputAbs)) {
            report.filesRejected++;
            report.rejectedDetails.push({ path: itemRel, reason: 'External symlink pointing outside source directory' });
            continue;
          }
        } catch (symErr) {
          report.filesRejected++;
          report.rejectedDetails.push({ path: itemRel, reason: `Broken symlink: ${symErr.message}` });
          continue;
        }
      }

      // Hidden directories check
      if (entry.name.startsWith('.') && entry.name !== '.' && entry.name !== '..') {
        report.filesRejected++;
        report.rejectedDetails.push({ path: itemRel, reason: `Hidden directory/file excluded: ${entry.name}` });
        continue;
      }

      if (entry.isDirectory()) {
        walkQueue.push(itemRel);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        report.filesScanned++;
        const classification = classifyCandidate(itemRel, itemAbs, inputAbs);
        if (classification.allowed) {
          candidateList.push(itemRel);
        } else {
          report.filesRejected++;
          report.rejectedDetails.push({ path: itemRel, reason: classification.reason });
        }
      }
    }
  }

  // 4. Scan candidate files for secrets BEFORE writing output
  const filesToPackage = [];
  for (const relPath of candidateList) {
    const srcPath = path.join(inputAbs, relPath);
    const ext = path.extname(relPath).toLowerCase();
    const stat = fs.statSync(srcPath);

    // Text scan for JS, CSS, HTML, JSON, MAP, TXT
    const isTextFile = ['.html', '.htm', '.js', '.mjs', '.css', '.json', '.map', '.txt', '.xml'].includes(ext);
    if (isTextFile && stat.size < 15 * 1024 * 1024) { // Only scan files < 15MB
      const content = fs.readFileSync(srcPath, 'utf8');
      const findings = scanContentForSecrets(content, relPath);
      if (findings.length > 0) {
        report.securityAlerts.push(...findings);
        logger.warn(`[SECURITY ALERT] Detected suspicious credential pattern in ${relPath}:`);
        findings.forEach(f => logger.warn(`  - [${f.severity}] ${f.patternName} (${f.matchPreview})`));
      }
    }
    filesToPackage.push({ relPath, srcPath, size: stat.size });
  }

  // If critical secrets detected and strictSecrets is true, halt
  const criticalFindings = report.securityAlerts.filter(a => a.severity === 'CRITICAL');
  if (strictSecrets && criticalFindings.length > 0) {
    const err = `Security abort: ${criticalFindings.length} critical secret pattern(s) detected during pre-packaging scan.`;
    logger.error(`[SECURITY ERROR] ${err}`);
    report.errors.push(err);
    report.exitCode = 2;
    return report;
  }

  // 5. Prepare Output Directory
  if (cleanOutput && fs.existsSync(outputAbs)) {
    fs.rmSync(outputAbs, { recursive: true, force: true });
  }
  fs.mkdirSync(outputAbs, { recursive: true });

  // 6. Copy Allowed Files
  const manifestFiles = {};
  const sumsLines = [];
  let totalBytesWritten = 0;

  for (const file of filesToPackage) {
    const destPath = path.join(outputAbs, file.relPath);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Read source and write to dest (strictly preserving source file)
    const contentBuf = fs.readFileSync(file.srcPath);
    fs.writeFileSync(destPath, contentBuf);

    const hash = sha256Buffer(contentBuf);
    manifestFiles[file.relPath] = {
      sha256: hash,
      size: file.size
    };
    sumsLines.push(`${hash}  ${file.relPath}`);
    totalBytesWritten += file.size;
    report.filesIncluded++;
  }

  // 7. Generate Cloudflare Pages _redirects file for SPA routing
  if (allowSpaRedirects) {
    const redirectsContent = `/*    /index.html   200\n`;
    const redirectsPath = path.join(outputAbs, '_redirects');
    fs.writeFileSync(redirectsPath, redirectsContent, 'utf8');
    const rHash = sha256Buffer(Buffer.from(redirectsContent, 'utf8'));
    manifestFiles['_redirects'] = {
      sha256: rHash,
      size: Buffer.byteLength(redirectsContent)
    };
    sumsLines.push(`${rHash}  _redirects`);
    totalBytesWritten += Buffer.byteLength(redirectsContent);
    report.filesIncluded++;
  }

  // 8. Generate Security Headers (_headers) for Cloudflare Pages
  const headersContent = [
    `/*`,
    `  X-Content-Type-Options: nosniff`,
    `  X-Frame-Options: SAMEORIGIN`,
    `  Referrer-Policy: strict-origin-when-cross-origin`,
    `  Permissions-Policy: camera=(), microphone=(), geolocation=()`,
    `/assets/*`,
    `  Cache-Control: public, max-age=31536000, immutable`,
    ``
  ].join('\n');
  const headersPath = path.join(outputAbs, '_headers');
  fs.writeFileSync(headersPath, headersContent, 'utf8');
  const hHash = sha256Buffer(Buffer.from(headersContent, 'utf8'));
  manifestFiles['_headers'] = {
    sha256: hHash,
    size: Buffer.byteLength(headersContent)
  };
  sumsLines.push(`${hHash}  _headers`);
  totalBytesWritten += Buffer.byteLength(headersContent);
  report.filesIncluded++;

  // 9. Write Cryptographic Manifest and SHA256SUMS
  const manifestData = {
    packager: 'encarmen-static-demo-packager',
    version: '1.0.0',
    generatedAt: timestamp,
    totalFiles: Object.keys(manifestFiles).length,
    totalBytes: totalBytesWritten,
    files: manifestFiles
  };
  const manifestPath = path.join(outputAbs, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');

  // Add manifest to sums
  const manifestHash = sha256File(manifestPath);
  sumsLines.push(`${manifestHash}  manifest.json`);
  const sumsPath = path.join(outputAbs, 'SHA256SUMS');
  sumsLines.sort();
  fs.writeFileSync(sumsPath, sumsLines.join('\n') + '\n', 'utf8');

  // 10. Write Packaging Report
  report.success = true;
  report.exitCode = 0;
  report.totalBytes = totalBytesWritten;
  report.durationMs = Date.now() - startTime;

  const reportPath = path.join(outputAbs, 'packaging-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  logger.log(`\n============================================================`);
  logger.log(`[PACKAGER SUCCESS] Static Demo Package generated successfully.`);
  logger.log(`- Files processed:  ${report.filesScanned}`);
  logger.log(`- Files included:   ${report.filesIncluded}`);
  logger.log(`- Files rejected:   ${report.filesRejected}`);
  logger.log(`- Total package:    ${(totalBytesWritten / 1024).toFixed(2)} KB`);
  logger.log(`- Security alerts:  ${report.securityAlerts.length}`);
  logger.log(`- Manifest:         ${manifestPath}`);
  logger.log(`- Checksums:        ${sumsPath}`);
  logger.log(`- Cloudflare SPA:   _redirects (/* -> /index.html 200)`);
  logger.log(`- Duration:         ${report.durationMs}ms`);
  logger.log(`============================================================\n`);

  return report;
}

// --- CLI ENTRY POINT ---
if (process.argv[1] === __filename) {
  const args = process.argv.slice(2);
  let inputDir = path.resolve(process.cwd(), 'dist');
  let outputDir = path.resolve(process.cwd(), 'dist-demo');
  let strictSecrets = true;
  let allowSpaRedirects = true;
  let cleanOutput = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' && args[i + 1]) {
      inputDir = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--output' && args[i + 1]) {
      outputDir = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--no-strict-secrets') {
      strictSecrets = false;
    } else if (arg === '--no-redirects') {
      allowSpaRedirects = false;
    } else if (arg === '--no-clean') {
      cleanOutput = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
ENCARMEN Static Demo Packager
Usage: node scripts/package_static_demo.mjs [options]

Options:
  --input <dir>         Input directory containing built frontend (default: dist)
  --output <dir>        Output directory for packaged demo (default: dist-demo)
  --no-strict-secrets   Do not abort when critical secrets are detected
  --no-redirects        Do not generate Cloudflare _redirects SPA rule
  --no-clean            Do not clean destination directory before writing
  --help, -h            Show this help message
`);
      process.exit(0);
    }
  }

  packageStaticDemo({
    inputDir,
    outputDir,
    strictSecrets,
    allowSpaRedirects,
    cleanOutput
  })
    .then(report => {
      process.exit(report.exitCode);
    })
    .catch(err => {
      console.error(`[FATAL] Unhandled packager exception:`, err);
      process.exit(1);
    });
}
