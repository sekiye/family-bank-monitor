// Fixed public-only allowlist; no authenticated endpoints or user-defined targets.
export const SITES = Object.freeze({
  CONTROL: 'https://example.com/',
  MONEY: 'https://www.rakuten-bank.co.jp/money/'
});
const allowlist = new Set(Object.values(SITES));
export function checkedUrl(url) {
  if (typeof url !== 'string' || !allowlist.has(url)) throw new Error('PUBLIC_URL_NOT_ALLOWED');
  return url;
}
export function safeHttp(value) {
  return Number.isInteger(value) && value >= 100 && value <= 599 ? String(value) : 'NO_RESPONSE';
}
export function sanitizedError(error) {
  const name = String(error?.name ?? '');
  const raw = String(error?.message ?? '');
  if (name === 'TimeoutError' || name === 'AbortError' || raw.includes('Timeout')) return 'TIMEOUT';
  if (raw.includes('ERR_CERT_AUTHORITY_INVALID') || raw.includes('ERR_CERT_COMMON_NAME_INVALID')) return 'CERTIFICATE';
  if (raw.includes('ERR_CONNECTION_RESET')) return 'CONNECTION_RESET';
  if (raw.includes('ERR_CONNECTION_TIMED_OUT') || raw.includes('ERR_TIMED_OUT')) return 'NETWORK_TIMEOUT';
  if (raw.includes('ERR_NAME_NOT_RESOLVED')) return 'DNS_ERROR';
  if (raw.includes('ERR_HTTP2_PROTOCOL_ERROR')) return 'HTTP2_ERROR';
  if (raw.includes('ERR_SSL_PROTOCOL_ERROR')) return 'TLS_ERROR';
  if (raw.includes('ERR_TUNNEL_CONNECTION_FAILED')) return 'TUNNEL_ERROR';
  return 'OTHER';
}
export function verdict({control, fetchHttp, curlDefaultHttp, curlAlignedHttp, chromiumHttp}) {
  const ok = value => value === 200;
  if (!ok(control)) return 'CONTROL_FAILED';
  if (ok(fetchHttp) && ok(curlDefaultHttp) && ok(curlAlignedHttp) && ok(chromiumHttp)) return 'ALL_METHODS_HTTP_200';
  if (ok(fetchHttp) && ok(curlAlignedHttp) && !ok(curlDefaultHttp) && ok(chromiumHttp)) return 'CURL_HEADERS_DIFFER';
  if (ok(fetchHttp) && ok(curlAlignedHttp) && !ok(chromiumHttp)) return 'HTTP_OK_CHROMIUM_FAIL';
  if (ok(fetchHttp) && ok(curlAlignedHttp) && ok(chromiumHttp)) return 'CURL_DEFAULT_ONLY_FAIL';
  return 'MIXED_OR_TRANSIENT';
}
