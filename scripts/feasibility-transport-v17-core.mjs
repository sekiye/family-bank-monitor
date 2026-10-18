// Public-page transport diagnostics. Only fixed, known public endpoints may be queried.
export const TARGETS = Object.freeze([
  ['CONTROL_V4', 'https://example.com/', '4'],
  ['RAKUTEN_HOME_V4', 'https://www.rakuten-bank.co.jp/', '4'],
  ['RAKUTEN_MONEY_V4', 'https://www.rakuten-bank.co.jp/money/', '4'],
  ['RAKUTEN_MONEY_V6', 'https://www.rakuten-bank.co.jp/money/', '6'],
]);

export const APPROVED_URLS = new Set(TARGETS.map(([, url]) => url));

export function interpretCurl(exitCode, raw) {
  const statusMatch = /^HTTP:([0-9]{3});DNS:([0-9.]+);TCP:([0-9.]+);TLS:([0-9.]+);FIRST:([0-9.]+)$/m.exec(String(raw).trim());
  const values = statusMatch?.slice(1).map(Number) ?? [];
  const [http, dns, tcp, tls, first] = values;
  const safeExit = Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= 255 ? exitCode : -1;
  if (!statusMatch || !values.every(Number.isFinite)) return {exit: safeExit, phase: 'UNKNOWN', http: 'UNKNOWN'};
  const phase = first > 0 ? 'HTTP_RECEIVED' : tls > 0 ? 'TLS_ESTABLISHED' : tcp > 0 ? 'TCP_CONNECTED' : dns > 0 ? 'DNS_RESOLVED' : 'NO_CONNECT';
  return {exit: safeExit, phase, http: http >= 100 && http <= 599 ? String(http) : 'NO_RESPONSE'};
}

export function assertPublicTarget(url) {
  if (!APPROVED_URLS.has(url)) throw new Error('URL_NOT_ALLOWLISTED');
  return url;
}
