import test from 'node:test';
import assert from 'node:assert/strict';
import {TARGETS, assertPublicTarget, interpretCurl} from '../scripts/feasibility-transport-v17-core.mjs';
import {patchCore, patchWorkflow} from '../scripts/apply-v17.mjs';

test('fixes HTTP-status property bug without changing other logic', () => {
  const original = 'export function outcome(result) { return Boolean(result?.commit && result?.status >= 200 && result?.status < 400); }';
  const fixed = patchCore(original);
  assert.match(fixed, /result\?\.http >= 200/);
  assert.equal(patchCore(fixed), fixed);
});

test('workflow executes transport even if browser fails and then reports failure', () => {
  const before = 'steps:\n      - name: Pure logic safety tests\n        run: node --test tests/feasibility-browser-v16.test.mjs\n      - name: Test Playwright public pages with network matrix (NO LOGIN)\n        run: node scripts/feasibility-browser-v16.mjs\n      - name: Explicit limitations\n        run: echo LIMITED\n';
  const after = patchWorkflow(before);
  assert.match(after, /id: browser_probe/);
  assert.match(after, /continue-on-error: true/);
  assert.match(after, /if: always\(\)/);
  assert.match(after, /feasibility-transport-v17.mjs/);
  assert.match(after, /if: always\(\) && steps\.browser_probe\.outcome == 'failure'/);
  assert.equal(patchWorkflow(after), after);
});

test('network phases distinguish response from TLS handshake', () => {
  assert.deepEqual(interpretCurl(0,'HTTP:200;DNS:0.001;TCP:0.01;TLS:0.02;FIRST:0.03'),{exit:0,phase:'HTTP_RECEIVED',http:'200'});
  assert.equal(interpretCurl(28,'HTTP:000;DNS:0.001;TCP:0.01;TLS:0.02;FIRST:0').phase,'TLS_ESTABLISHED');
  assert.equal(interpretCurl(35,'HTTP:000;DNS:0.001;TCP:0.01;TLS:0;FIRST:0').phase,'TCP_CONNECTED');
  assert.equal(interpretCurl(7,'HTTP:000;DNS:0.001;TCP:0;TLS:0;FIRST:0').phase,'DNS_RESOLVED');
});

test('untrusted output strings are not returned or printed', () => {
  assert.deepEqual(interpretCurl(1,'HTML SECRET BANK DATA'),{exit:1, phase:'UNKNOWN',http:'UNKNOWN'});
});

test('transport never accepts arbitrary URLs', () => {
  for (const [,url] of TARGETS) assert.equal(assertPublicTarget(url),url);
  assert.throws(()=>assertPublicTarget('https://evil.example/'),/URL_NOT_ALLOWLISTED/);
});
