import { addDays, todayTokyo } from './dates.mjs';
import { validatePlan, validateSnapshots } from './config.mjs';
import { makeSchedule, dateRange } from './schedule.mjs';

const minYen = (a,b)=>Math.max(a,b);
export function evaluate(plan, snapshots, {date = todayTokyo(), now = new Date(), mode = 'demo'}={}) {
  validatePlan(plan);
  validateSnapshots(snapshots,plan);
  if (mode === 'actual' && snapshots.mode === 'DEMO_ONLY') throw new Error('Demo data rejected in actual mode');
  const until = addDays(date, plan.alertWindowDays);
  const {events, minimums} = makeSchedule(plan,date,until);
  const accountSnapshots = new Map(snapshots.accounts.map(a=>[a.id,a]));
  const findings = [];
  const checks = [];
  const staleCount = {missing:0, stale:0, fresh:0};
  for (const a of plan.accounts) {
    const s = accountSnapshots.get(a.id);
    if (!s) {
      staleCount.missing++;
      findings.push({severity:'unknown',type:'MISSING_BALANCE',account:a.id,date,
        message:'残高が取得できません。判定不能です。'});
      continue;
    }
    if (mode === 'actual' && (s.observedAt === 'DEMO_NOW' || !s.sourceUpdatedAt)) {
      staleCount.stale++;
      findings.push({severity:'unknown',type:'UNVERIFIED_SOURCE_DATE',account:a.id,date,
        message:'銀行側のデータ更新日時を確認できず、判定不能です。'});
      continue;
    }
    const observed = s.observedAt === 'DEMO_NOW' ? now : new Date(s.observedAt);
    const sourceUpdated = mode === 'actual' ? new Date(s.sourceUpdatedAt) : observed;
    const ageHours = Math.max((now.getTime() - observed.getTime())/3_600_000,
                              (now.getTime() - sourceUpdated.getTime())/3_600_000);
    if (ageHours < -0.25 || ageHours > plan.maxDataAgeHours) {
      staleCount.stale++;
      findings.push({severity:'unknown',type:'STALE_BALANCE',account:a.id,date,
        message:'残高データが古い/未来です。判定不能です。'});
      continue;
    }
    staleCount.fresh++;
    let conservative = s.amount;
    let planned = s.amount;
    let earliest = null;
    let reliance = null;
    for (const day of dateRange(date,plan.alertWindowDays)) {
      const outflows = events.filter(e=>e.date===day && e.from===a.id);
      const inflows = events.filter(e=>e.date===day && e.to===a.id);
      const out = outflows.reduce((sum,e)=>sum+e.amount+e.fee,0);
      const inc = inflows.reduce((sum,e)=>sum+e.amount,0);
      const dayMin = minimums.filter(r=>r.date===day && r.account===a.id)
        .reduce((max,r)=>minYen(max,r.amount),a.floor);
      // Safety assumption: outgoing transfers happen before incoming transfers on the same day.
      // Future incoming is NEVER counted in conservative balance.
      const beforeIncoming = planned - out;
      conservative -= out;
      checks.push({account:a.id,date:day, floor:dayMin, out, incomingPlanned:inc,
        projectedBeforeIncoming:beforeIncoming, conservative});
      if (!earliest && beforeIncoming < dayMin) {
        earliest = {severity:'danger',type:'FORECAST_SHORTFALL',account:a.id,date:day,
          shortfall: dayMin - beforeIncoming, expectedBalance: beforeIncoming, requiredFloor: dayMin,
          message:'予定入金を含む試算でも、振込前の残高が不足する見込みです。'};
      }
      if (!reliance && conservative < dayMin && beforeIncoming >= dayMin) {
        reliance = {severity:'warning',type:'REQUIRES_INCOMING',account:a.id,date:day,
          shortfallWithoutIncoming: dayMin-conservative,
          message:'予定入金が着金しない場合、必要残高を確保できません。'};
      }
      // Credits are applied after ALL outgoing transfers and minimums on this date.
      planned = beforeIncoming + inc;
    }
    if (earliest) findings.push(earliest);
    if (reliance) findings.push(reliance);
  }
  // Manual items are reminders, not bank-confirmed transfers.
  for (const e of events) {
    if (e.method === 'manual') findings.push({severity:'info',type:'MANUAL_ACTION',account:e.from,
      date:e.date, message:'手動振込の予定です。実施したか確認してください。', transferId:e.id});
  }
  const priority = {danger:0,unknown:1,warning:2,info:3};
  findings.sort((x,y)=>priority[x.severity]-priority[y.severity] || x.date.localeCompare(y.date));
  return {mode,date,until,accountCount:plan.accounts.length,snapshotStatus:staleCount,
    findings, checks, scheduledTransferCount: events.length,
    // This is a forecast only. No bank execution/arrival has been verified.
    verifiedTransfers: false, holidaysComplete: false};
}
