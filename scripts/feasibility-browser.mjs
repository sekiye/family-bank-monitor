import { assertPublicUrl, statusClass } from './feasibility-core.mjs';

const target = assertPublicUrl('https://www.rakuten-bank.co.jp/money/');
console.log('BROWSER_SCOPE=PUBLIC_MONEY_SUPPORT_INFORMATION_ONLY');
console.log('BROWSER_LOGIN_ATTEMPTED=0');
console.log('BROWSER_ACCOUNT_DATA=0');
let browser;
try {
  const {chromium} = await import('playwright');
  browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
  console.log('CHROMIUM_LAUNCH=OK');
  const ctx = await browser.newContext({acceptDownloads: false});
  const page = await ctx.newPage();
  // No third-party page resources and no authenticated bank origin.
  await page.route('**/*', route => {
    let permitted = false;
    try { permitted = new URL(route.request().url()).hostname === 'www.rakuten-bank.co.jp'; } catch {}
    return permitted ? route.continue() : route.abort();
  });
  const response = await page.goto(target, {waitUntil: 'domcontentloaded', timeout: 25000});
  const status = response?.status() ?? 0;
  console.log('PUBLIC_MONEY_BROWSER_HTTP=' + (status || 'NO_RESPONSE'));
  console.log('PUBLIC_MONEY_BROWSER_RESULT=' + statusClass(status));
  console.log('PUBLIC_MONEY_BROWSER_NAVIGATION=' + (status >= 200 && status < 400 ? 'REACHABLE' : 'NOT_CONFIRMED'));
  await ctx.close();
} catch (error) {
  console.log('CHROMIUM_OR_NAVIGATION=FAILED');
  console.log('BROWSER_ERROR_CLASS=' + (
    error?.name === 'TimeoutError' ? 'TIMEOUT' :
    /Executable doesn't exist|browserType\.launch/.test(String(error?.message)) ? 'INSTALL_OR_LAUNCH' : 'OTHER'
  ));
} finally {
  if (browser) await browser.close().catch(() => {});
  console.log('BROWSER_PREFLIGHT_COMPLETE=1');
  console.log('AUTHENTICATED_MONEY_SUPPORT_TESTED=0');
  console.log('AUTOMATION_PERMISSION_VERIFIED=0');
}
