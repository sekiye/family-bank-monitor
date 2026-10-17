import {assertPublicUrl, statusClass} from './feasibility-core.mjs';
import {classifyBrowserError, safeDiagnosticHint} from './feasibility-browser-error.mjs';

// Public informational URL only. No credentials, cookies, trace or screenshots.
const target = assertPublicUrl('https://www.rakuten-bank.co.jp/money/');
console.log('BROWSER_SCOPE=PUBLIC_MONEY_SUPPORT_INFORMATION_ONLY');
console.log('BROWSER_LOGIN_ATTEMPTED=0');
console.log('BROWSER_ACCOUNT_DATA=0');
console.log('BROWSER_INSTALL_EXPECTED=CHROMIUM_HEADLESS_SHELL');
let phase = 'IMPORT';
let browser;
try {
  const {chromium} = await import('playwright');
  console.log('PLAYWRIGHT_IMPORT=OK');
  phase = 'LAUNCH';
  // Without a channel override, headless:true uses chromium-headless-shell.
  // The corresponding CI install command MUST use --only-shell (not --no-shell).
  browser = await chromium.launch({headless: true, timeout: 30000});
  console.log('CHROMIUM_LAUNCH=OK');
  phase = 'BLANK_PAGE';
  const context = await browser.newContext({acceptDownloads: false, serviceWorkers: 'block'});
  const page = await context.newPage();
  await page.goto('about:blank');
  console.log('BLANK_PAGE=OK');
  phase = 'PUBLIC_PAGE';
  await page.route('**/*', route => {
    let allowed = false;
    try {
      const u = new URL(route.request().url());
      allowed = u.protocol === 'https:' && u.hostname === 'www.rakuten-bank.co.jp';
    } catch { /* reject malformed targets */ }
    return allowed ? route.continue() : route.abort();
  });
  const response = await page.goto(target, {waitUntil: 'domcontentloaded', timeout: 25000});
  const status = response?.status() ?? 0;
  console.log('PUBLIC_MONEY_BROWSER_HTTP=' + (status || 'NO_RESPONSE'));
  console.log('PUBLIC_MONEY_BROWSER_RESULT=' + statusClass(status));
  const reachable = status >= 200 && status < 400;
  console.log('PUBLIC_MONEY_BROWSER_NAVIGATION=' + (reachable ? 'REACHABLE' : 'NOT_CONFIRMED'));
  console.log('BROWSER_DIAGNOSTIC_RESULT=' + (reachable ? 'PASS' : 'HTTP_NOT_REACHABLE'));
  if (!reachable) process.exitCode = 1;
  await context.close();
} catch (error) {
  console.log('CHROMIUM_OR_NAVIGATION=FAILED');
  console.log('BROWSER_FAILED_PHASE=' + phase);
  const category = classifyBrowserError(error, phase);
  console.log('BROWSER_ERROR_CLASS=' + category);
  console.log('BROWSER_ERROR_HINT=' + safeDiagnosticHint(category));
  console.log('BROWSER_DIAGNOSTIC_RESULT=FAIL');
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  console.log('BROWSER_PREFLIGHT_COMPLETE=1');
  console.log('AUTHENTICATED_MONEY_SUPPORT_TESTED=0');
  console.log('AUTOMATION_PERMISSION_VERIFIED=0');
}
