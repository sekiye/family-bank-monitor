import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function patchCore(s) {
  if (s.includes('result?.http >= 200 && result?.http < 400')) return s;
  const from = /return Boolean\(result\?\.commit && result\?\.status >= 200 && result\?\.status < 400\);/;
  if (!from.test(s)) throw new Error('UNKNOWN_CORE_VERSION');
  return s.replace(from, 'return Boolean(result?.commit && result?.http >= 200 && result?.http < 400);');
}

export function patchWorkflow(s) {
  if (s.includes('feasibility-transport-v17.mjs') && s.includes('id: browser_probe')) return s;
  const from = /^([ \t]*)- name: Test Playwright public pages with network matrix \(NO LOGIN\)\r?\n[ \t]*run: node scripts\/feasibility-browser-v16\.mjs[ \t]*$/m;
  const match = s.match(from);
  if (!match) throw new Error('UNKNOWN_WORKFLOW_VERSION');
  const i = match[1];
  const browser = `${i}- name: Test Playwright public pages with network matrix (NO LOGIN)\n${i}  id: browser_probe\n${i}  continue-on-error: true\n${i}  run: node scripts/feasibility-browser-v16.mjs\n${i}- name: Diagnose public TLS/HTTP stages (NO LOGIN)\n${i}  if: always()\n${i}  run: node scripts/feasibility-transport-v17.mjs`;
  s = s.replace(from, browser);
  s = s.replace('tests/feasibility-browser-v16.test.mjs', 'tests/feasibility-browser-v16.test.mjs tests/feasibility-transport-v17.test.mjs');
  // Always print the limitations even when browser reachability fails.
  s = s.replace(/(^[ \t]*- name: Explicit limitations\r?\n)/m, '$1' + `${i}  if: always()\n`);
  s = s.trimEnd() + `\n${i}- name: Fail if browser public-page test failed\n${i}  if: always() && steps.browser_probe.outcome == 'failure'\n${i}  run: exit 1\n`;
  return s;
}

function apply() {
  const a = resolve('scripts/feasibility-browser-v16-core.mjs');
  const b = resolve('.github/workflows/feasibility-check.yml');
  const beforeA = readFileSync(a, 'utf8'), beforeB = readFileSync(b, 'utf8');
  const afterA = patchCore(beforeA), afterB = patchWorkflow(beforeB);
  // Calculate both replacements before changing either file.
  if (afterA !== beforeA) writeFileSync(a, afterA);
  if (afterB !== beforeB) writeFileSync(b, afterB);
  console.log('V17_OUTCOME_PROPERTY_FIXED=1');
  console.log('V17_WORKFLOW_DIAGNOSTIC_ENABLED=1');
  console.log('V17_NO_BANK_LOGIN=1');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) apply();
