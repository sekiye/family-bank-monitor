import {assertPublicUrl} from './feasibility-core.mjs';
import {httpResult, classifyFailure, allowMainDocument, normalizeStatus} from './feasibility-browser-v15-core.mjs';

// Public-page connectivity experiment. No bank login, private data, screenshots,
// traces, response bodies, page text, browser state exports or raw error logs.
const bankUrl = assertPublicUrl('https://www.rakuten-bank.co.jp/money/');
const controlUrl = 'https://example.com/';
console.log('BROWSER_SCOPE=PUBLIC_INFORMATION_ONLY');
console.log('BROWSER_LOGIN_ATTEMPTED=0');
console.log('BROWSER_ACCOUNT_DATA=0');
console.log('BROWSER_INSTALL_EXPECTED=CHROMIUM_HEADLESS_SHELL');
console.log('PUBLIC_DIAGNOSTIC_VERSION=1.5');

// Set up an independent browser context for each main-document probe. Only a
// known public GET navigation is permitted; ALL subresources are blocked.
async function probe(chromiumBrowser, label, url) {
  let context;
  let page;
  const observed = {requests: 0, responses: 0, failed: 0, blocked: 0, error: 'NONE'};
  let httpStatus = 0;
  let committed = false;
  let domReady = 'NOT_CHECKED';
  try {
    context = await chromiumBrowser.newContext({acceptDownloads: false, serviceWorkers: 'block'});
    page = await context.newPage();
    page.on('request', request => {
      if (request.isNavigationRequest() && request.url() === url) observed.requests++;
    });
    page.on('response', response => {
      const request = response.request();
      if (request.isNavigationRequest() && request.url() === url) observed.responses++;
    });
    page.on('requestfailed', request => {
      if (request.isNavigationRequest() && request.url() === url) {
        observed.failed++;
        observed.error = classifyFailure({message: request.failure()?.errorText || ''});
      }
    });
    await page.route('**/*', route => {
      if (allowMainDocument(route.request(), url)) return route.continue();
      observed.blocked++;
      return route.abort();
    });
    // 'commit' only asks whether the server responded with a main document.
    // It does NOT prove successful rendering or a complete web application.
    const response = await page.goto(url, {waitUntil: 'commit', timeout: 15000});
    committed = true;
    httpStatus = response?.status() ?? 0;
    try {
      await page.waitForLoadState('domcontentloaded', {timeout: 5000});
      domReady = 'OK';
    } catch (error) {
      domReady = classifyFailure(error);
    }
  } catch (error) {
    if (observed.error === 'NONE') observed.error = classifyFailure(error);
  } finally {
    await context?.close().catch(() => {});
    // Deliberately do not output URLs, headers, HTML, request bodies or errors.
    console.log(`${label}_MAIN_REQUEST=${observed.requests > 0 ? 'SEEN' : 'NOT_SEEN'}`);
    console.log(`${label}_MAIN_RESPONSE=${observed.responses > 0 ? 'SEEN' : 'NOT_SEEN'}`);
    console.log(`${label}_MAIN_FAILURE=${observed.failed > 0 ? observed.error : 'NONE'}`);
    console.log(`${label}_BLOCKED_NON_TARGET_REQUESTS=${Math.min(observed.blocked, 999)}`);
    console.log(`${label}_COMMIT=${committed ? 'OK' : 'FAILED'}`);
    console.log(`${label}_HTTP=${normalizeStatus(httpStatus)}`);
    console.log(`${label}_RESULT=${httpResult(httpStatus)}`);
    console.log(`${label}_DOMCONTENTLOADED=${domReady}`);
    console.log(`${label}_ERROR_CLASS=${committed ? 'NONE' : observed.error}`);
  }
  return {committed, status: httpStatus, error: observed.error, domReady};
}

let browser;
try {
  const {chromium} = await import('playwright');
  console.log('PLAYWRIGHT_IMPORT=OK');
  browser = await chromium.launch({headless: true, timeout: 30000});
  console.log('CHROMIUM_LAUNCH=OK');
  const context = await browser.newContext({acceptDownloads: false});
  const blank = await context.newPage();
  await blank.goto('about:blank');
  console.log('BLANK_PAGE=OK');
  await context.close();

  const control = await probe(browser, 'CONTROL_BROWSER', controlUrl);
  const bank = await probe(browser, 'RAKUTEN_BROWSER', bankUrl);
  const success = bank.committed && httpResult(bank.status) === 'REACHABLE';
  console.log('CONTROL_DIAGNOSTIC=' + (control.committed ? 'HAS_MAIN_RESPONSE' : 'NO_MAIN_RESPONSE'));
  console.log('BROWSER_DIAGNOSTIC_RESULT=' + (success ? 'PASS_HTTP_COMMIT_ONLY' : 'FAIL'));
  if (!success) process.exitCode = 1;
} catch (error) {
  console.log('BROWSER_ERROR_CLASS=' + classifyFailure(error));
  console.log('BROWSER_DIAGNOSTIC_RESULT=FAIL');
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  console.log('BROWSER_PREFLIGHT_COMPLETE=1');
  console.log('AUTHENTICATED_MONEY_SUPPORT_TESTED=0');
  console.log('AUTOMATION_PERMISSION_VERIFIED=0');
}
