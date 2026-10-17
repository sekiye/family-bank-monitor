import { addDays, dayOfMonth, monthPairs, shiftBusinessDay } from './dates.mjs';
export function makeSchedule(plan, start, end) {
  const holidays = plan.bankHolidays;
  const events = [], minimums = [];
  for (const [year, month] of monthPairs(start, end)) {
    for (const t of plan.transfers) {
      const scheduled = dayOfMonth(year, month, t.day);
      const date = shiftBusinessDay(scheduled, t.holidayPolicy ?? 'none', holidays);
      if (date >= start && date <= end) {
        events.push({...t, date, scheduled, fee: t.fee ?? 0});
      }
    }
    for (const rule of plan.minimumBalanceRules) {
      const date = dayOfMonth(year, month, rule.day);
      if (date >= start && date <= end) minimums.push({...rule, date});
    }
  }
  // Prevent accidental duplicate generation if schedule rules are ever expanded.
  return { events: events.sort((a,b)=>a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
           minimums: minimums.sort((a,b)=>a.date.localeCompare(b.date)) };
}
export function dateRange(start, days) {
  return Array.from({length: days+1}, (_, i) => addDays(start,i));
}
