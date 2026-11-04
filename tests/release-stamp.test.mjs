import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('built footer version has real checkout SHA and a local build timestamp', () => {
  const gitSha = execFileSync('git', ['rev-parse', '--verify', 'HEAD^{commit}'], {cwd:root, encoding:'utf8'}).trim();
  assert.match(gitSha, /^[a-f0-9]{40}$/);
  const content = readFileSync(path.join(root, 'src/constants/version.ts'), 'utf8');
  assert.ok(content.includes(`APP_COMMIT_SHA: string | null = "${gitSha}"`), 'generated stamp must match the exact checked-out SHA');
  assert.ok(content.includes(gitSha.slice(0,12)), 'the visible stamp must contain 12 authentic Git SHA chars');
  assert.match(content, /APP_VERSION = "\d{6}:\d{4}:[a-f0-9]{12}:H"/);
  assert.match(content, /APP_BUILD_TIMESTAMP = "\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z"/);
  assert.doesNotMatch(content, /SIN-SHA|SIN-COMPILAR|undefined|NaN/);
  const footer = readFileSync(path.join(root, 'src/components/Footer.tsx'), 'utf8');
  assert.match(footer, /Commit: \{footerCommit \|\| 'no verificado'\}/);
});
