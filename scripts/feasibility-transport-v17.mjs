// Curl public-only stage diagnostics: DNS -> TCP -> TLS -> HTTP first byte.
// Does not emit response contents, IPs, HTML, URLs, cookies, headers or raw errors.
// Does not authenticate, modify or download banking data.
import {spawn} from 'node:child_process';
import {TARGETS, assertPublicTarget, interpretCurl} from './feasibility-transport-v17-core.mjs';

console.log('PUBLIC_TRANSPORT_DIAGNOSTIC_VERSION=1.7');
console.log('AUTHENTICATED_BANK_ACCESS=NOT_TESTED');
console.log('RAW_NETWORK_CONTENT_CAPTURED=0');

async function runCurl(label, url, ipVersion) {
  assertPublicTarget(url);
  const args = [
    `-${ipVersion}`, '--http1.1', '--silent', '--output', '/dev/null',
    '--proto', '=https', '--max-redirs', '0', '--connect-timeout', '7', '--max-time', '14',
    '--write-out', 'HTTP:%{http_code};DNS:%{time_namelookup};TCP:%{time_connect};TLS:%{time_appconnect};FIRST:%{time_starttransfer}',
    url,
  ];
  return await new Promise(resolve => {
    const child = spawn('curl', args, {stdio: ['ignore', 'pipe', 'ignore']});
    let stdout = '';
    child.stdout.on('data', chunk => { if (stdout.length < 2048) stdout += String(chunk).slice(0, 2048 - stdout.length); });
    child.on('error', () => resolve({exit: -1, phase: 'UNKNOWN', http: 'UNKNOWN'}));
    child.on('close', code => resolve(interpretCurl(code, stdout)));
  }).then(result => {
    console.log(`V17_${label}_EXIT=${result.exit}`);
    console.log(`V17_${label}_LAST_PHASE=${result.phase}`);
    console.log(`V17_${label}_HTTP=${result.http}`);
    return result;
  });
}

const results = await Promise.all(TARGETS.map(t => runCurl(...t)));
const control = results[0], home = results[1], money = results[2];
const controlOk = control.phase === 'HTTP_RECEIVED';
const anyBankHttp = home.phase === 'HTTP_RECEIVED' || money.phase === 'HTTP_RECEIVED';
console.log('V17_TRANSPORT_SUMMARY=' + (!controlOk ? 'CONTROL_NO_HTTP' : anyBankHttp ? 'BANK_HTTP_REACHABLE' : 'BANK_HTTP_UNREACHABLE'));
console.log('V17_TRANSPORT_DONE=1');
// This supplementary diagnostic never decides browser reachability.
// The workflow's browser step retains the final success/failure decision.
