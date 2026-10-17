#!/usr/bin/env node
// Fail-closed public release audit of the Git INDEX (not merely working-tree .gitignore).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const fail = reason => {
  console.error(`PUBLIC_AUDIT_OK=0 REASON=${reason}`);
  process.exit(1);
};

let paths;
try {
  paths = execFileSync('git', ['ls-files', '--cached', '-z'], { encoding: 'utf8' })
    .split('\0').filter(Boolean);
} catch {
  fail('GIT_INDEX_UNAVAILABLE');
}

const exact = new Set([
  '.gitignore', 'README.md', 'PUBLIC_RELEASE.md', 'package.json',
  '.github/workflows/daily-check.yml',
  'config/example.plan.json', 'fixtures/demo-balances.json'
]);
const prefixes = ['src/', 'tests/', 'scripts/'];
const required = ['.gitignore', '.github/workflows/daily-check.yml', 'package.json', 'config/example.plan.json'];

if (!paths.length) fail('NOTHING_STAGED');
for (const name of required) if (!paths.includes(name)) fail('MISSING_EXPECTED_FILE');

for (const path of paths) {
  if (!exact.has(path) && !prefixes.some(prefix => path.startsWith(prefix))) fail('UNAPPROVED_FILE_PATH');
  if (path.includes('..') || /\.(?:env|pem|key|p12|pfx|png|webm|zip)$/i.test(path)) fail('SENSITIVE_FILE_TYPE');
  let bytes;
  try {
    bytes = execFileSync('git', ['show', `:${path}`], { maxBuffer: 2_000_000 });
  } catch { fail('INDEX_FILE_UNREADABLE'); }
  // Fail closed on binaries; publishing a demo does not need binary assets.
  if (bytes.includes(0)) fail('BINARY_IN_INDEX');
  const content = bytes.toString('utf8');
  if (/-----BEGIN [^-]*PRIVATE KEY-----/.test(content) ||
      /(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{10,}/.test(content) ||
      /https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[^\s'"`]+/.test(content)) {
    fail('POSSIBLE_CREDENTIAL');
  }
}

const ignores = readFileSync('.gitignore', 'utf8');
if (!ignores.includes('private/**') || !ignores.includes('.env')) fail('IGNORE_RULES_INCOMPLETE');
console.log(`PUBLIC_AUDIT_OK=1 FILES=${paths.length} PRIVATE_TRACKED=0`);
console.log('PUBLIC_AUDIT_NOTE=Best-effort check; review all staged source and README before public push.');
