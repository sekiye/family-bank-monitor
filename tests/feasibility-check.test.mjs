import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCountry, combineCountries, decide, statusClass, assertPublicUrl } from '../scripts/feasibility-core.mjs';

test('normalizes only ISO-style country codes', () => {
  assert.equal(normalizeCountry('jp\n'), 'JP');
  assert.equal(normalizeCountry('us'), 'US');
  for (const v of ['<html>JP</html>', 'Japan', 'JP EXTRA', '1', '']) assert.equal(normalizeCountry(v), 'UNKNOWN');
});
test('two conflicting country sources produce an explicit conflict', () => {
  assert.deepEqual(combineCountries(['JP', 'US']), {country: 'CONFLICT', agreement: 'CONFLICT'});
  assert.equal(combineCountries(['JP', 'UNKNOWN']).agreement, 'ONE_SOURCE');
  assert.equal(combineCountries(['UNKNOWN', 'UNKNOWN']).country, 'UNKNOWN');
});
test('a JP observation does not authorize production use', () => {
  assert.equal(decide('JP'), 'NO_GO_STANDARD_RUNNER_REGION_NOT_GUARANTEED');
  assert.equal(decide('US'), 'NO_GO_NON_JAPAN');
  assert.equal(decide('UNKNOWN'), 'NO_GO_GEO_UNKNOWN');
});
test('only the two public informational URLs are allowed', () => {
  for (const url of ['https://www.rakuten-bank.co.jp/', 'https://www.rakuten-bank.co.jp/money/']) assert.equal(assertPublicUrl(url), url);
  for (const url of [
    'https://fes.rakuten-bank.co.jp/', 'https://www.rakuten-bank.co.jp/login',
    'https://www.rakuten-bank.co.jp/money/?session=abc',
    'https://www.rakuten-bank.co.jp.evil.example/',
    'http://www.rakuten-bank.co.jp/', 'https://x@www.rakuten-bank.co.jp/'
  ]) assert.throws(() => assertPublicUrl(url));
});
test('401 / 403 / 429 are not counted as successful reachability', () => {
  assert.equal(statusClass(200), 'REACHABLE');
  assert.equal(statusClass(302), 'REACHABLE');
  assert.equal(statusClass(403), 'RESTRICTED');
  assert.equal(statusClass(429), 'RESTRICTED');
  assert.equal(statusClass(503), 'HTTP_ERROR');
});
