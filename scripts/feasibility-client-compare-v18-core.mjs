// No URLs, response text, account identifiers, secrets, or raw errors are logged.
export const URLS = Object.freeze([
  ['CONTROL', 'https://example.com/'],
  ['HOME', 'https://www.rakuten-bank.co.jp/'],
  ['MONEY', 'https://www.rakuten-bank.co.jp/money/'],
]);
const permitted = new Set(URLS.map(([,u]) => u));
export function assertPublic(u) {
  if (typeof u !== 'string' || !permitted.has(u)) throw new Error('URL_NOT_ALLOWLISTED');
  return u;
}
export function statusOf(x) {
  return Number.isInteger(x) && x >= 100 && x <= 599 ? String(x) : 'NO_RESPONSE';
}
export function classifyContentType(x) {
  const type = String(x ?? '').split(';',1)[0].trim().toLowerCase();
  return type === 'text/html' || type === 'application/xhtml+xml' ? 'HTML' : type === '' ? 'UNKNOWN' : 'OTHER';
}
export function classifyPrefix(buf) {
  if (!buf || buf.length === 0) return 'EMPTY';
  const head = Buffer.from(buf).subarray(0,2048).toString('utf8').replace(/^\uFEFF/, '').trimStart();
  return /^<!doctype\s+html\b|^<html\b|^<!--/.test(head.toLowerCase()) ? 'HTML_LIKE' : 'OTHER';
}
export function classifyError(error) {
  const name = String(error?.name ?? '');
  const code = String(error?.code ?? error?.cause?.code ?? '');
  if (name === 'TimeoutError' || name === 'AbortError' || code === 'ETIMEDOUT') return 'TIMEOUT';
  if (['ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','ECONNABORTED'].includes(code)) return code;
  if (code.startsWith('CERT_') || code.includes('CERTIFICATE')) return 'CERTIFICATE';
  return 'OTHER';
}
export function compare(fetchResult, httpsResult, curlResult) {
  const ok = r => Number(r?.http) >= 200 && Number(r?.http) < 400;
  const f = ok(fetchResult), h = ok(httpsResult), c = ok(curlResult);
  if (f && h && c) return 'ALL_THREE_HTTP';
  if (f && h) return 'BOTH_NODE_HTTP_ONLY';
  if (f && c) return 'FETCH_AND_CURL_HTTP';
  if (f) return 'FETCH_ONLY_HTTP';
  if (h || c) return 'OTHER_CLIENT_HTTP';
  return 'NO_HTTP';
}
export function parseCurl(line, exitCode) {
  const m = /^([0-9]{3});([0-9.]+);([0-9.]+);([0-9.]+);([0-9.]+)$/.exec(String(line).trim());
  if (!m) return {http: 0, exit: -1, phase:'UNKNOWN'};
  const [http,tcp,tls,first] = [Number(m[1]),Number(m[3]),Number(m[4]),Number(m[5])];
  if (![http,tcp,tls,first].every(Number.isFinite)) return {http:0,exit:-1,phase:'UNKNOWN'};
  return {http, exit: Number.isInteger(exitCode) ? exitCode : -1,
    phase: first>0?'FIRST_BYTE':tls>0?'TLS':tcp>0?'TCP':'NO_CONNECT'};
}
