import { assertDate } from './dates.mjs';
const isPositiveYen = n => Number.isSafeInteger(n) && n >= 0;
function checkDay(day) {
  return day === 'month_end' || (Number.isInteger(day) && day >= 1 && day <= 31);
}
export function validatePlan(plan) {
  if (!plan || plan.schemaVersion !== 1) throw new Error('Unsupported plan schemaVersion');
  if (plan.timeZone !== 'Asia/Tokyo') throw new Error('timeZone must be Asia/Tokyo');
  if (!Number.isSafeInteger(plan.alertWindowDays) || plan.alertWindowDays < 1 || plan.alertWindowDays > 60)
    throw new Error('Invalid alertWindowDays (1-60)');
  if (!Number.isSafeInteger(plan.maxDataAgeHours) || plan.maxDataAgeHours < 1)
    throw new Error('Invalid maxDataAgeHours');
  if (!Array.isArray(plan.bankHolidays)) throw new Error('bankHolidays must be a list');
  for (const d of plan.bankHolidays) assertDate(d);
  if (!Array.isArray(plan.accounts) || !plan.accounts.length) throw new Error('No accounts defined');
  const ids = new Set();
  for (const a of plan.accounts) {
    if (typeof a.id !== 'string' || !/^[a-z0-9_]+$/.test(a.id) || ids.has(a.id))
      throw new Error('Invalid or repeated account ID');
    if (typeof a.owner !== 'string' || !/^member_[1-3]$/.test(a.owner))
      throw new Error('Account must have one of member_1 to member_3');
    if (typeof a.label !== 'string' || !a.label.trim() || !isPositiveYen(a.floor))
      throw new Error('Invalid account label or floor');
    ids.add(a.id);
  }
  const transfers = new Set();
  if (!Array.isArray(plan.transfers)) throw new Error('No transfers list');
  for (const t of plan.transfers) {
    if (!t.id || transfers.has(t.id) || !ids.has(t.from) || !(ids.has(t.to) || t.to === 'external') ||
        t.from === t.to || !checkDay(t.day) || !isPositiveYen(t.amount) || t.amount === 0 ||
        !isPositiveYen(t.fee ?? 0) || !['automatic','manual','direct_debit'].includes(t.method) ||
        !['none','previous_business_day','next_business_day'].includes(t.holidayPolicy ?? 'none'))
      throw new Error('Invalid transfer rule (ID/from/to/day/amount/fee/method/holidayPolicy)');
    transfers.add(t.id);
  }
  const minima = new Set();
  if (!Array.isArray(plan.minimumBalanceRules)) throw new Error('No minimumBalanceRules list');
  for (const rule of plan.minimumBalanceRules) {
    if (!rule.id || minima.has(rule.id) || !ids.has(rule.account) ||
        !checkDay(rule.day) || !isPositiveYen(rule.amount)) throw new Error('Invalid minimumBalanceRule');
    minima.add(rule.id);
  }
  return plan;
}
export function validateSnapshots(data, plan) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.accounts))
    throw new Error('Invalid balance snapshot schema');
  const ids = new Set(plan.accounts.map(a => a.id));
  const seen = new Set();
  for (const a of data.accounts) {
    if (!ids.has(a.id) || seen.has(a.id) || !isPositiveYen(a.amount) ||
        (a.observedAt !== 'DEMO_NOW' && !Number.isFinite(Date.parse(a.observedAt))) ||
        (a.sourceUpdatedAt !== undefined && !Number.isFinite(Date.parse(a.sourceUpdatedAt))))
      throw new Error('Invalid or unexpected balance snapshot entry');
    seen.add(a.id);
  }
  return data;
}
