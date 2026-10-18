import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeNetworkCode, safeErrorKind, safeStatus, allowedExactMainRequest, outcome} from '../scripts/feasibility-browser-v16-core.mjs';

test('Chrome net errors expose only strictly enumerated tokens, no secrets', () => {
  assert.equal(safeNetworkCode({message:'page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://user:secret@example.com'}), 'ERR_HTTP2_PROTOCOL_ERROR');
  assert.equal(safeNetworkCode('net::ERR_TUNNEL_CONNECTION_FAILED'), 'ERR_TUNNEL_CONNECTION_FAILED');
  assert.equal(safeNetworkCode('net::ERR_CERT_AUTHORITY_INVALID'), 'ERR_CERT_AUTHORITY_INVALID');
  assert.equal(safeNetworkCode('net::ERR_SOMETHING_DYNAMIC_PRIVATE_VALUE_123456'), 'UNKNOWN');
  assert.equal(safeNetworkCode('Credentials: abc'), 'UNKNOWN');
  assert.equal(safeErrorKind({name:'TimeoutError',message:'secret 123'}), 'TIMEOUT');
  assert.equal(safeStatus('200'), 'NO_RESPONSE');
});

test('strict routing only allows exact known main GET', () => {
  const url='https://www.rakuten-bank.co.jp/money/';
  const mock=(u,m='GET',n=true,t='document')=>({url:()=>u,method:()=>m,isNavigationRequest:()=>n,resourceType:()=>t});
  assert.equal(allowedExactMainRequest(mock(url),url), true);
  assert.equal(allowedExactMainRequest(mock(url+'login'),url),false);
  assert.equal(allowedExactMainRequest(mock(url,'POST'),url),false);
  assert.equal(allowedExactMainRequest(mock(url,'GET',false),url),false);
  assert.equal(outcome({commit:true,http:200}),true);
  assert.equal(outcome({commit:true,status:200}),false); // A deprecated field must not silently pass.
  assert.equal(outcome({commit:true,http:403}),false);
  assert.equal(outcome(null),false);
});

test('public diagnostics do not load or persist authenticated state', () => {
  const code=readFileSync(new URL('../scripts/feasibility-browser-v16.mjs', import.meta.url),'utf8');
  assert.match(code,/assertPublicUrl\('https:\/\/www\.rakuten-bank\.co\.jp\/money\/'\)/);
  assert.match(code,/javaScriptEnabled: false/);
  assert.match(code,/ignoreHTTPSErrors: false/);
  assert.match(code,/V16_RAKUTEN_MONEY_NATIVE/);
  assert.match(code,/--disable-http2/);
  for(const forbidden of [/storageState\s*\(/, /page\.screenshot\s*\(/, /trace\.start\s*\(/, /\.addCookies\s*\(/, /\bpage\.fill\s*\(/, /console\.log\([^\n]*\.message/]) assert.doesNotMatch(code,forbidden);
});

test('workflow invokes v16 and retains exact headless-shell installation', () => {
  const yml=readFileSync(new URL('../.github/workflows/feasibility-check.yml', import.meta.url),'utf8');
  assert.match(yml,/node scripts\/feasibility-browser-v16\.mjs/);
  assert.match(yml,/playwright install --with-deps chromium --only-shell/);
  // continue-on-error is intentional only for the public browser probe.
  // A final step checks the pre-continue-on-error outcome to preserve failure semantics.
  assert.match(yml,/id: browser_probe\s*\n\s*continue-on-error: true\s*\n\s*run: node scripts\/feasibility-browser-v16\.mjs/);
  assert.equal((yml.match(/continue-on-error:\s*true/g) ?? []).length, 1);
  assert.match(yml,/if: always\(\) && steps\.browser_probe\.outcome == 'failure'\s*\n\s*run: exit 1/);
  assert.match(yml,/if: always\(\)\s*\n\s*run: node scripts\/feasibility-transport-v17\.mjs/);
});
