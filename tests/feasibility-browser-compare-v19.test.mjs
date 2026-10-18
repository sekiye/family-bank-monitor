import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkedUrl, safeHttp, sanitizedError, verdict, SITES} from '../scripts/feasibility-browser-compare-v19-core.mjs';
const probe=readFileSync(new URL('../scripts/feasibility-browser-compare-v19.mjs',import.meta.url),'utf8');
const flow=readFileSync(new URL('../.github/workflows/feasibility-browser-compare-v19.yml',import.meta.url),'utf8');
test('allow only two exact public pages',()=>{
  assert.equal(checkedUrl(SITES.MONEY),SITES.MONEY);
  assert.throws(()=>checkedUrl('https://login.rakuten-bank.co.jp/'));
  assert.throws(()=>checkedUrl('https://www.rakuten-bank.co.jp/money/?x=secret'));
});
test('HTTP and errors sanitize all untrusted values',()=>{
  assert.equal(safeHttp(200),'200');
  assert.equal(safeHttp('200'),'NO_RESPONSE');
  assert.equal(safeHttp(0),'NO_RESPONSE');
  assert.equal(sanitizedError({name:'TimeoutError',message:'URL with secret'}),'TIMEOUT');
  assert.equal(sanitizedError({name:'Error',message:'secret'}),'OTHER');
});
test('comparing chromium and curl is explicit',()=>{
  const base={control:200,fetchHttp:200,curlDefaultHttp:200,curlAlignedHttp:200,chromiumHttp:200};
  assert.equal(verdict(base),'ALL_METHODS_HTTP_200');
  assert.equal(verdict({...base,chromiumHttp:0}),'HTTP_OK_CHROMIUM_FAIL');
  assert.equal(verdict({...base,control:0}),'CONTROL_FAILED');
  assert.equal(verdict({...base,curlDefaultHttp:0}),'CURL_HEADERS_DIFFER');
});
test('probe stays unauthenticated and does not persist or export data',()=>{
  assert.match(probe,/checkedUrl\(url\)/);
  assert.match(probe,/ignoreHTTPSErrors:false/);
  assert.match(probe,/javaScriptEnabled:false/);
  assert.match(probe,/waitUntil:'commit'/);
  assert.doesNotMatch(probe,/storageState\s*\(|\.screenshot\s*\(|\.tracing\s*\(|\.saveAs\s*\(/);
  assert.doesNotMatch(probe,/process\.env\.(?:PASSWORD|COOKIE|SECRET|TOKEN)/);
});
test('workflow only runs on demand with matching chromium headless shell',()=>{
  assert.match(flow,/workflow_dispatch:/);
  assert.doesNotMatch(flow,/\bschedule:/);
  assert.match(flow,/playwright@1\.64\.1/);
  assert.match(flow,/--only-shell/);
  assert.match(flow,/node scripts\/feasibility-browser-compare-v19\.mjs/);
  assert.doesNotMatch(flow,/upload-artifact|pull_request_target|secrets\./);
});
