import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {httpResult, classifyFailure, allowMainDocument, normalizeStatus} from '../scripts/feasibility-browser-v15-core.mjs';

test('HTTP response does not imply complete DOM rendering', () => {
  assert.equal(httpResult(200), 'REACHABLE');
  assert.equal(httpResult(302), 'REACHABLE');
  assert.equal(httpResult(403), 'RESTRICTED');
  assert.equal(httpResult(429), 'RESTRICTED');
  assert.equal(httpResult(0), 'NO_RESPONSE');
  assert.equal(normalizeStatus(200), '200');
  assert.equal(normalizeStatus('200'), 'NO_RESPONSE');
});

test('sanitized error classification never outputs arbitrary messages', () => {
  assert.equal(classifyFailure({name:'TimeoutError',message:'private secret'}), 'TIMEOUT');
  assert.equal(classifyFailure({message:'net::ERR_CERT_AUTHORITY_INVALID'}), 'TLS_CERT_ERROR');
  assert.equal(classifyFailure({message:'net::ERR_NAME_NOT_RESOLVED'}), 'DNS_ERROR');
  assert.equal(classifyFailure({message:'net::ERR_CONNECTION_RESET'}), 'CONNECTION_ERROR');
  assert.equal(classifyFailure({message:'secret=person@example.org'}), 'OTHER');
});

test('only exact public main document GET is allowed', () => {
  const expected='https://example.com/';
  const req=(url,method='GET',nav=true,type='document')=>({url:()=>url,method:()=>method,isNavigationRequest:()=>nav,resourceType:()=>type});
  assert.equal(allowMainDocument(req(expected),expected),true);
  assert.equal(allowMainDocument(req(expected+'?test=1'),expected),false);
  assert.equal(allowMainDocument(req(expected,'POST'),expected),false);
  assert.equal(allowMainDocument(req(expected,'GET',false),expected),false);
  assert.equal(allowMainDocument(req(expected,'GET',true,'image'),expected),false);
});

test('browser test is public-only, with phased diagnostics and no state export', () => {
  const code=readFileSync(new URL('../scripts/feasibility-browser.mjs',import.meta.url),'utf8');
  assert.match(code,/assertPublicUrl\('https:\/\/www\.rakuten-bank\.co\.jp\/money\/'\)/);
  assert.match(code,/waitUntil: 'commit'/);
  assert.match(code,/waitForLoadState\('domcontentloaded'/);
  assert.match(code,/BROWSER_LOGIN_ATTEMPTED=0/);
  assert.match(code,/process\.exitCode = 1/);
  for(const prohibited of [/storageState\s*\(/, /page\.screenshot\s*\(/, /trace\.start\s*\(/, /console\.log\([^\n]*error\.message/]) assert.doesNotMatch(code,prohibited);
});

test('workflow still installs matching headless shell',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/feasibility-check.yml',import.meta.url),'utf8');
  assert.match(workflow,/playwright install --with-deps chromium --only-shell/);
});
