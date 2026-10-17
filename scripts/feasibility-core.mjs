export const PUBLIC_URLS = Object.freeze([
  ['BANK_PUBLIC_HOME', 'https://www.rakuten-bank.co.jp/'],
  ['MONEY_SUPPORT_PUBLIC', 'https://www.rakuten-bank.co.jp/money/'],
]);

export function normalizeCountry(s) {
  const match = String(s ?? '').trim().toUpperCase().match(/^[A-Z]{2}$/);
  return match ? match[0] : 'UNKNOWN';
}

export function combineCountries(countries) {
  const known = countries.map(normalizeCountry).filter(x => x !== 'UNKNOWN');
  if (!known.length) return {country: 'UNKNOWN', agreement: 'NO_DATA'};
  if (new Set(known).size > 1) return {country: 'CONFLICT', agreement: 'CONFLICT'};
  if (known.length === 1) return {country: known[0], agreement: 'ONE_SOURCE'};
  return {country: known[0], agreement: 'MULTIPLE_SOURCES'};
}

export function decide(country) {
  if (country === 'CONFLICT') return 'NO_GO_GEO_CONFLICT';
  if (country === 'UNKNOWN') return 'NO_GO_GEO_UNKNOWN';
  if (country !== 'JP') return 'NO_GO_NON_JAPAN';
  return 'NO_GO_STANDARD_RUNNER_REGION_NOT_GUARANTEED';
}

export function statusClass(status) {
  if (status >= 200 && status < 400) return 'REACHABLE';
  if (status === 401 || status === 403 || status === 429) return 'RESTRICTED';
  if (status >= 400 && status < 600) return 'HTTP_ERROR';
  return 'UNKNOWN';
}

export function assertPublicUrl(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || u.hostname !== 'www.rakuten-bank.co.jp' ||
      !['/', '/money/'].includes(u.pathname) || u.search || u.hash || u.username || u.password) {
    throw new Error('Only explicitly approved public URLs may be fetched');
  }
  return u.href;
}
