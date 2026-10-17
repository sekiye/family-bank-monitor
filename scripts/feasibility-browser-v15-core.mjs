// Small pure helpers: never expose network URLs, responses, HTML or error messages.
export function httpResult(status) {
  if (!Number.isInteger(status) || status < 100 || status > 599) return 'NO_RESPONSE';
  if (status >= 200 && status < 400) return 'REACHABLE';
  if (status === 401 || status === 403 || status === 429) return 'RESTRICTED';
  return 'HTTP_ERROR';
}

export function classifyFailure(error) {
  const message = String(error?.message ?? '');
  if (error?.name === 'TimeoutError' || /Timeout.*exceeded/i.test(message)) return 'TIMEOUT';
  if (/net::ERR_CERT_/i.test(message)) return 'TLS_CERT_ERROR';
  if (/net::ERR_NAME_NOT_RESOLVED/i.test(message)) return 'DNS_ERROR';
  if (/net::ERR_PROXY_/i.test(message)) return 'PROXY_ERROR';
  if (/net::ERR_CONNECTION_(?:RESET|CLOSED|REFUSED|TIMED_OUT)/i.test(message)) return 'CONNECTION_ERROR';
  if (/net::ERR_/i.test(message)) return 'CHROMIUM_NETWORK_ERROR';
  if (/route.*abort|ERR_FAILED/i.test(message)) return 'REQUEST_BLOCKED';
  return 'OTHER';
}

export function allowMainDocument(request, expectedUrl) {
  try {
    // A single known public GET document, not other frames, links, subresources or redirects.
    return request.method() === 'GET' &&
      request.isNavigationRequest() && request.resourceType() === 'document' &&
      request.url() === expectedUrl;
  } catch { return false; }
}

export function normalizeStatus(status) {
  return Number.isInteger(status) && status >= 100 && status <= 599 ? String(status) : 'NO_RESPONSE';
}
