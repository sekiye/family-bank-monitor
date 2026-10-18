import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyBrowserError, safeDiagnosticHint} from '../scripts/feasibility-browser-error.mjs';

test('missing headless browser binary has precise diagnostic', () => {
  const result = classifyBrowserError({message: 'browserType.launch: Executable doesn\'t exist at /home/runner/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell'}, 'LAUNCH');
  assert.equal(result, 'BROWSER_BINARY_MISSING');
  assert.equal(safeDiagnosticHint(result), 'CHECK_PLAYWRIGHT_INSTALL_MODE');
});

test('other failures remain distinguishable without leaking message', () => {
  assert.equal(classifyBrowserError({message: 'Host system is missing dependencies'}, 'LAUNCH'), 'OS_LIBRARY_MISSING');
  assert.equal(classifyBrowserError({message: 'net::ERR_CONNECTION_RESET'}, 'PUBLIC_PAGE'), 'NETWORK_OR_NAVIGATION');
  assert.equal(classifyBrowserError({name:'TimeoutError',message:'timeout'}, 'PUBLIC_PAGE'), 'TIMEOUT');
  assert.equal(classifyBrowserError({message:'unexpected stack trace with secret 123'}, 'LAUNCH'), 'CHROMIUM_LAUNCH_FAILED');
  assert.equal(safeDiagnosticHint('random'), 'INSPECT_SAFE_DIAGNOSTIC');
});

test('CI installs matching binary and fails rather than ignoring installation errors', () => {
  const yml = readFileSync(new URL('../.github/workflows/feasibility-check.yml', import.meta.url), 'utf8');
  assert.match(yml, /playwright install --with-deps chromium --only-shell/);
  assert.doesNotMatch(yml, /--no-shell/);
  // Only the public browser probe may be soft-failed, so transport diagnostics still run.
  // The original probe outcome must then be re-raised at the end of the job.
  assert.match(yml, /id: browser_probe\s*\n\s*continue-on-error: true\s*\n\s*run: node scripts\/feasibility-browser-v16\.mjs/);
  assert.equal((yml.match(/continue-on-error:\s*true/g) ?? []).length, 1);
  assert.match(yml, /if: always\(\) && steps\.browser_probe\.outcome == 'failure'\s*\n\s*run: exit 1/);
  assert.match(yml, /if: always\(\)\s*\n\s*run: node scripts\/feasibility-transport-v17\.mjs/);
});

test('browser probe never attempts authentication or persists browser state', () => {
  const code = readFileSync(new URL('../scripts/feasibility-browser.mjs', import.meta.url), 'utf8');
  assert.match(code, /assertPublicUrl\('https:\/\/www\.rakuten-bank\.co\.jp\/money\/'\)/);
  assert.match(code, /BROWSER_LOGIN_ATTEMPTED=0/);
  assert.match(code, /process\.exitCode = 1/);
  for (const prohibited of [/storageState\s*\(/, /page\.screenshot\s*\(/, /trace\.start\s*\(/, /input\[type=['"]password/]) assert.doesNotMatch(code, prohibited);
});
