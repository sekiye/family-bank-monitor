/** Japan-local civil date functions. Never use the runner's local time zone. */
export function todayTokyo(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}
export function assertDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      new Date(`${value}T00:00:00.000Z`).toISOString().slice(0,10) !== value) {
    throw new Error('Invalid YYYY-MM-DD date');
  }
  return value;
}
export function addDays(dateStr, count) {
  assertDate(dateStr);
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0,10);
}
export function dayOfMonth(year, month, day) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const valid = day === 'month_end' ? last : Math.min(day, last);
  return `${year}-${String(month).padStart(2,'0')}-${String(valid).padStart(2,'0')}`;
}
export function isNonBusinessDay(dateStr, holidays=[]) {
  const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6 || holidays.includes(dateStr);
}
export function shiftBusinessDay(dateStr, policy, holidays=[]) {
  if (!policy || policy === 'none') return dateStr;
  const step = policy === 'previous_business_day' ? -1 : policy === 'next_business_day' ? 1 : 0;
  if (!step) throw new Error('Unknown holidayPolicy');
  let date = dateStr;
  for (let i = 0; i < 12 && isNonBusinessDay(date, holidays); i++) date = addDays(date, step);
  if (isNonBusinessDay(date, holidays)) throw new Error('No business date within 12 days');
  return date;
}
export function monthPairs(start, end) {
  // +/- 1 month catches transfers shifted across month boundaries.
  const first = new Date(`${start.slice(0,7)}-01T00:00:00Z`);
  first.setUTCMonth(first.getUTCMonth()-1);
  const last = new Date(`${end.slice(0,7)}-01T00:00:00Z`);
  last.setUTCMonth(last.getUTCMonth()+1);
  const result=[];
  while (first <= last) {
    result.push([first.getUTCFullYear(), first.getUTCMonth()+1]);
    first.setUTCMonth(first.getUTCMonth()+1);
  }
  return result;
}
