import { lookup } from 'node:dns/promises';
import { combineCountries, decide, normalizeCountry, PUBLIC_URLS, assertPublicUrl, statusClass } from './feasibility-core.mjs';

async function fetchCountry(url, parse) {
  try {
    const r = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(9000),
      headers: { 'Accept': 'application/json, text/plain' }
    });
    if (!r.ok) return 'UNKNOWN';
    return normalizeCountry(parse((await r.text()).slice(0, 1000)));
  } catch { return 'UNKNOWN'; }
}

async function main() {
  console.log('FEASIBILITY_RUNNER=' + (process.env.GITHUB_ACTIONS === 'true' ? 'GITHUB_ACTIONS' : 'LOCAL'));
  console.log('CHECK_SCOPE=PUBLIC_PAGES_ONLY');
  console.log('LOGIN_ATTEMPTED=0');
  console.log('COOKIE_EXPORT=0');
  console.log('SECRETS_REQUIRED=0');
  console.log('NO_ACCOUNT_DATA=1');
  console.log('STANDARD_RUNNER_JAPAN_GUARANTEED=0');

  const a = await fetchCountry('https://api.country.is/', s => JSON.parse(s).country);
  const b = await fetchCountry('https://ipapi.co/country/', s => s.trim());
  const merged = combineCountries([a, b]);
  console.log('EGRESS_COUNTRY_PROVIDER_1=' + a);
  console.log('EGRESS_COUNTRY_PROVIDER_2=' + b);
  console.log('EGRESS_COUNTRY=' + merged.country);
  console.log('COUNTRY_CONFIDENCE=' + merged.agreement);
  console.log('PRODUCTION_DECISION=' + decide(merged.country));

  try {
    await lookup('www.rakuten-bank.co.jp');
    console.log('BANK_PUBLIC_DNS=OK');
  } catch {
    console.log('BANK_PUBLIC_DNS=FAILED');
  }

  for (const [name, u] of PUBLIC_URLS) {
    try {
      const target = assertPublicUrl(u);
      // No redirect-following, cookies, post requests, credentials, or page-body logging.
      const response = await fetch(target, {
        redirect: 'manual',
        signal: AbortSignal.timeout(16000),
        headers: { 'Accept': 'text/html' }
      });
      console.log(`${name}_HTTP=${response.status}`);
      console.log(`${name}_RESULT=${statusClass(response.status)}`);
      await response.body?.cancel();
    } catch (error) {
      console.log(`${name}_HTTP=NOT_AVAILABLE`);
      console.log(`${name}_RESULT=NETWORK_OR_TLS_ERROR`);
      console.log(`${name}_ERROR_TYPE=${error?.name === 'TimeoutError' ? 'TIMEOUT' : 'OTHER'}`);
    }
  }
  console.log('NETWORK_PREFLIGHT_COMPLETE=1');
}

await main();
