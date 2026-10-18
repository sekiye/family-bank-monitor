import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {URLS,assertPublic,statusOf,classifyContentType,classifyPrefix,classifyError,compare,parseCurl} from '../scripts/feasibility-client-compare-v18-core.mjs';
test('only three static public URLs',()=>{
  assert.equal(URLS.length,3);
  for(const [,url] of URLS) assert.equal(assertPublic(url),url);
  for(const u of ['https://evil.example/','https://www.rakuten-bank.co.jp/login','https://www.rakuten-bank.co.jp/money/?id=1']) assert.throws(()=>assertPublic(u));
});
test('content checks do not expose raw HTML or headers',()=>{
  assert.equal(classifyContentType('text/html;charset=utf-8'),'HTML');
  assert.equal(classifyContentType('application/json'),'OTHER');
  assert.equal(classifyPrefix(Buffer.from('<!doctype html>SECRET COOKIE')),'HTML_LIKE');
  assert.equal(classifyPrefix(Buffer.from('ACCOUNT NUMBER SECRET')),'OTHER');
  assert.equal(classifyPrefix(Buffer.alloc(0)),'EMPTY');
  assert.equal(statusOf(200),'200');assert.equal(statusOf(0),'NO_RESPONSE');
});
test('error classification returns finite enumerations',()=>{
  assert.equal(classifyError({code:'ETIMEDOUT'}),'TIMEOUT');
  assert.equal(classifyError({code:'ECONNRESET'}),'ECONNRESET');
  assert.equal(classifyError({message:'Secret Account 10101'}),'OTHER');
});
test('comparison distinguishes fetch only',()=>{
  assert.equal(compare({http:200},{http:0},{http:0}),'FETCH_ONLY_HTTP');
  assert.equal(compare({http:200},{http:200},{http:0}),'BOTH_NODE_HTTP_ONLY');
  assert.equal(compare({http:200},{http:200},{http:200}),'ALL_THREE_HTTP');
  assert.equal(compare({http:0},{http:0},{http:0}),'NO_HTTP');
});
test('curl result only emits phases and HTTP code',()=>{
  assert.deepEqual(parseCurl('200;0;0.1;0.2;0.3',0),{http:200,exit:0,phase:'FIRST_BYTE'});
  assert.equal(parseCurl('000;0;0.1;0.2;0',28).phase,'TLS');
  assert.equal(parseCurl('SECRET',3).phase,'UNKNOWN');
});
test('diagnostic scripts are public-only and do not persist secrets',()=>{
  const src=readFileSync(new URL('../scripts/feasibility-client-compare-v18.mjs',import.meta.url),'utf8');
  const yml=readFileSync(new URL('../.github/workflows/feasibility-client-compare-v18.yml',import.meta.url),'utf8');
  assert.doesNotMatch(src,/storageState\s*\(|screenshot\s*\(|set-cookie|authorization|username|password/i);
  assert.match(src,/V18_AUTHENTICATION=DISABLED/);
  assert.match(yml,/workflow_dispatch:/);
  assert.doesNotMatch(yml,/secrets\.|schedule:/);
});
