import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

test('web control uses SSH-verified persistent staging journal, not runtime HOME', () => {
  assert.match(source, /directory:\s*path\.join\('\/home\/u293982346',\s*'domains\/staging\.encarmen\.org\/hbuilds\/control-data'\)/);
  assert.doesNotMatch(source, /controlHomeDirectory\(\)/);
});
