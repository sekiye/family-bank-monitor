// Public-only, count-only / enumerated diagnostics. Never emit raw errors,
// page content, addresses, cookie values, HTML, request headers or proxy URLs.
export const SAFE_NET_CODES = Object.freeze([
  'ERR_TUNNEL_CONNECTION_FAILED', 'ERR_PROXY_CONNECTION_FAILED',
  'ERR_NAME_NOT_RESOLVED', 'ERR_DNS_TIMED_OUT',
  'ERR_CERT_AUTHORITY_INVALID', 'ERR_CERT_COMMON_NAME_INVALID',
  'ERR_CERT_DATE_INVALID', 'ERR_CERT_INVALID', 'ERR_SSL_PROTOCOL_ERROR',
  'ERR_SSL_VERSION_OR_CIPHER_MISMATCH',
  'ERR_CONNECTION_RESET', 'ERR_CONNECTION_CLOSED', 'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_TIMED_OUT', 'ERR_CONNECTION_FAILED',
  'ERR_HTTP2_PROTOCOL_ERROR', 'ERR_QUIC_PROTOCOL_ERROR',
  'ERR_NETWORK_CHANGED', 'ERR_ADDRESS_UNREACHABLE',
  'ERR_EMPTY_RESPONSE', 'ERR_TIMED_OUT', 'ERR_FAILED', 'ERR_ABORTED',
  'ERR_BLOCKED_BY_CLIENT', 'ERR_TOO_MANY_REDIRECTS',
]);
const SAFE = new Set(SAFE_NET_CODES);

export function safeNetworkCode(error) {
  const s = String(typeof error === 'string' ? error : error?.message ?? '');
  const match = s.match(/\bnet::(ERR_[A-Z0-9_]+)\b/);
  return match && SAFE.has(match[1]) ? match[1] : 'UNKNOWN';
}

export function safeErrorKind(error) {
  if (error?.name === 'TimeoutError' || /Timeout .*exceeded|Timeout \d+ms exceeded/i.test(String(error?.message ?? ''))) return 'TIMEOUT';
  return safeNetworkCode(error) !== 'UNKNOWN' ? 'CHROMIUM_NETWORK' : 'OTHER';
}

export function safeStatus(code) {
  return Number.isInteger(code) && code >= 100 && code <= 599 ? String(code) : 'NO_RESPONSE';
}

export function allowedExactMainRequest(request, url) {
  try {
    return request.method() === 'GET' && request.resourceType() === 'document' &&
      request.isNavigationRequest() && request.url() === url;
  } catch { return false; }
}

export function outcome(result) {
  return Boolean(result?.commit && result?.http >= 200 && result?.http < 400);
}
