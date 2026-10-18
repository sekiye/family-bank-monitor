// Single-run public transport comparison. No login, cookie export, screenshots,
// persistent state, credentials, HAR, raw response, raw request details or IP logs.
import {spawn} from 'node:child_process';
import {checkedUrl, safeHttp, sanitizedError, verdict, SITES} from './feasibility-browser-compare-v19-core.mjs';

const TIMEOUT_MS = 18000;
const say = (key, val) => console.log(`V19_${key}=${val}`);

async function fetchProbe(url) {
  try {
    const response = await fetch(checkedUrl(url), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'manual',
      headers: {'Accept': 'text/html'}
    });
    // Do not read, store or print any webpage contents.
    await response.body?.cancel().catch(() => {});
    return {http:response.status,error:'NONE'};
  } catch(error) { return {http:0,error:sanitizedError(error)}; }
}
async function curlProbe(url, aligned) {
  checkedUrl(url);
  const args = [
    '--silent','--http1.1','--ipv4','--proto','=https',
    '--connect-timeout','7','--max-time','18',
    '--max-redirs','0','--output','/dev/null',
    '--write-out','%{http_code}'
  ];
  if (aligned) args.push('--user-agent','undici','--header','Accept: text/html');
  args.push(url);
  return await new Promise(resolve => {
    const child = spawn('curl',args,{stdio:['ignore','pipe','ignore']});
    let out='';
    child.stdout.on('data',buf=>{if(out.length<4)out+=String(buf).slice(0,4-out.length);});
    let settled=false;
    const finish=result=>{if(settled)return;settled=true;resolve(result);};
    child.on('error',()=>finish({http:0,error:'PROCESS_ERROR'}));
    child.on('close',code=>{
      const http=/^[0-9]{3}$/.test(out.trim())?Number(out.trim()):0;
      finish({http,error:code===0?'NONE':code===28?'TIMEOUT':'CURL_FAILURE'});
    });
  });
}
async function chromiumProbe(browser,url) {
  checkedUrl(url);
  let context;
  try {
    context = await browser.newContext({
      javaScriptEnabled:false, serviceWorkers:'block', acceptDownloads:false,
      ignoreHTTPSErrors:false
    });
    const page = await context.newPage();
    const response = await page.goto(url, {waitUntil:'commit',timeout:TIMEOUT_MS});
    return {http:response?.status() ?? 0,error:'NONE'};
  } catch(error) { return {http:0,error:sanitizedError(error)}; }
  finally { await context?.close().catch(()=>{}); }
}

say('SCOPE','PUBLIC_ONLY');
say('AUTHENTICATION','DISABLED');
say('PRIVATE_DATA','NONE');
say('STORAGE','DISABLED');
say('COMPARISON','SAME_RUNNER');
let browser;
try {
  const {chromium} = await import('playwright');
  browser = await chromium.launch({headless:true,timeout:30000});
  say('CHROMIUM_LAUNCH','OK');
  const control = await chromiumProbe(browser,SITES.CONTROL);
  say('CONTROL_CHROMIUM_HTTP',safeHttp(control.http));
  say('CONTROL_CHROMIUM_ERROR',control.error);

  // Concurrent probes: same runner, same public target, same time window.
  const [fetchResult,defaultCurl,alignedCurl,chromiumResult] = await Promise.all([
    fetchProbe(SITES.MONEY),
    curlProbe(SITES.MONEY,false),
    curlProbe(SITES.MONEY,true),
    chromiumProbe(browser,SITES.MONEY)
  ]);
  say('MONEY_FETCH_HTTP',safeHttp(fetchResult.http));
  say('MONEY_FETCH_ERROR',fetchResult.error);
  say('MONEY_CURL_DEFAULT_HTTP',safeHttp(defaultCurl.http));
  say('MONEY_CURL_DEFAULT_ERROR',defaultCurl.error);
  say('MONEY_CURL_ALIGNED_HTTP',safeHttp(alignedCurl.http));
  say('MONEY_CURL_ALIGNED_ERROR',alignedCurl.error);
  say('MONEY_CHROMIUM_HTTP',safeHttp(chromiumResult.http));
  say('MONEY_CHROMIUM_ERROR',chromiumResult.error);
  const decision=verdict({control:control.http,fetchHttp:fetchResult.http,
    curlDefaultHttp:defaultCurl.http,curlAlignedHttp:alignedCurl.http,
    chromiumHttp:chromiumResult.http});
  say('VERDICT',decision);
  if(decision!=='ALL_METHODS_HTTP_200') process.exitCode=1;
} catch(error) {
  say('TOP_ERROR',sanitizedError(error));
  say('VERDICT','RUNTIME_FAILED');
  process.exitCode=1;
} finally {
  await browser?.close().catch(()=>{});
  say('DIAGNOSTIC_DONE','1');
  say('BANK_LOGIN_ATTEMPTED','0');
}
