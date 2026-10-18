// Diagnostic for public pages only. No authentication, cookies, saved state,
// screenshots, trace archives, request/response bodies, or raw exception text.
import {assertPublicUrl} from './feasibility-core.mjs';
import {allowedExactMainRequest, safeNetworkCode, safeErrorKind, safeStatus, outcome} from './feasibility-browser-v16-core.mjs';

const controlUrl = 'https://example.com/';
const bankHomeUrl = assertPublicUrl('https://www.rakuten-bank.co.jp/');
const bankMoneyUrl = assertPublicUrl('https://www.rakuten-bank.co.jp/money/');

console.log('PUBLIC_DIAGNOSTIC_VERSION=1.6');
console.log('AUTHENTICATED_BANK_ACCESS=NOT_TESTED');
console.log('LOGIN_ATTEMPTED=0');
console.log('SECRETS_REQUIRED=0');
console.log('PERSISTENT_BROWSER_STATE=0');
console.log('RAW_NETWORK_LOGS=0');
console.log('PROXY_ENV_HTTP_PRESENT=' + (process.env.HTTP_PROXY || process.env.http_proxy ? 1 : 0));
console.log('PROXY_ENV_HTTPS_PRESENT=' + (process.env.HTTPS_PROXY || process.env.https_proxy ? 1 : 0));
console.log('PROXY_ENV_NO_PROXY_PRESENT=' + (process.env.NO_PROXY || process.env.no_proxy ? 1 : 0));

async function probe(browser, label, url, strictRoute = true) {
  const stats = {request: 0, response: 0, failure: 0, denied: 0, http: 0,
    errCode: 'UNKNOWN', errKind: 'NONE', commit: false};
  let context;
  try {
    context = await browser.newContext({
      acceptDownloads: false, serviceWorkers: 'block', javaScriptEnabled: false,
      ignoreHTTPSErrors: false,
    });
    const page = await context.newPage();
    const target = req => req.isNavigationRequest() && req.resourceType() === 'document' && req.url() === url;
    page.on('request', req => {if (target(req)) stats.request++;});
    page.on('response', res => {if (target(res.request())) stats.response++;});
    page.on('requestfailed', req => {
      if (target(req)) {
        stats.failure++;
        const code = safeNetworkCode(req.failure()?.errorText ?? '');
        if (code !== 'UNKNOWN') stats.errCode = code;
      }
    });
    if (strictRoute) {
      await page.route('**/*', route => {
        if (allowedExactMainRequest(route.request(), url)) return route.continue();
        stats.denied++;
        return route.abort();
      });
    }
    const res = await page.goto(url, {waitUntil: 'commit', timeout: 12000});
    stats.commit = true;
    stats.http = res?.status() ?? 0;
  } catch (error) {
    stats.errKind = safeErrorKind(error);
    const code = safeNetworkCode(error);
    if (stats.errCode === 'UNKNOWN') stats.errCode = code;
  } finally {
    await context?.close().catch(() => {});
    console.log(`${label}_REQUEST=${stats.request > 0 ? 'SEEN' : 'NOT_SEEN'}`);
    console.log(`${label}_RESPONSE=${stats.response > 0 ? 'SEEN' : 'NOT_SEEN'}`);
    console.log(`${label}_FAILED_REQUEST=${stats.failure > 0 ? 'YES' : 'NO'}`);
    console.log(`${label}_BLOCKED_EXTRA=${Math.min(stats.denied, 999)}`);
    console.log(`${label}_HTTP=${safeStatus(stats.http)}`);
    console.log(`${label}_COMMIT=${stats.commit ? 'OK' : 'FAILED'}`);
    console.log(`${label}_NET_CODE=${stats.errCode}`);
    console.log(`${label}_ERROR_KIND=${stats.errKind}`);
  }
  return stats;
}

let browser;
try {
  const {chromium} = await import('playwright');
  console.log('PLAYWRIGHT_IMPORT=OK');
  browser = await chromium.launch({headless: true, timeout: 30000});
  console.log('CHROMIUM_LAUNCH=OK');
  const control = await probe(browser, 'V16_CONTROL_STRICT', controlUrl);
  const home = await probe(browser, 'V16_RAKUTEN_HOME_STRICT', bankHomeUrl);
  const strict = await probe(browser, 'V16_RAKUTEN_MONEY_STRICT', bankMoneyUrl);
  let native = null;
  let noH2 = null;
  if (!outcome(strict)) {
    // Diagnostic-only comparison: no route interception; JS remains disabled.
    // Browser is in a fresh, unauthenticated context on a public page.
    native = await probe(browser, 'V16_RAKUTEN_MONEY_NATIVE', bankMoneyUrl, false);
    if (!outcome(native)) {
      await browser.close();
      browser = await chromium.launch({headless: true, timeout: 30000, args: ['--disable-http2']});
      noH2 = await probe(browser, 'V16_RAKUTEN_MONEY_NO_HTTP2', bankMoneyUrl);
    }
  }
  const result = !outcome(control) ? 'FAIL_CONTROL' : outcome(strict) ? 'PASS_STRICT' :
    outcome(native) ? 'PASS_NATIVE_ONLY' : outcome(noH2) ? 'PASS_NO_HTTP2_ONLY' :
    outcome(home) ? 'FAIL_MONEY_ONLY' : 'FAIL_RAKUTEN_BROWSER';
  console.log('V16_DIAGNOSTIC_RESULT=' + result);
  if (!result.startsWith('PASS')) process.exitCode = 1;
} catch (error) {
  console.log('V16_TOP_ERROR_KIND=' + safeErrorKind(error));
  console.log('V16_TOP_NET_CODE=' + safeNetworkCode(error));
  console.log('V16_DIAGNOSTIC_RESULT=FAIL_RUNTIME');
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  console.log('V16_DIAGNOSTIC_DONE=1');
  console.log('PRODUCTION_BANK_COLLECTION=DISABLED');
}
