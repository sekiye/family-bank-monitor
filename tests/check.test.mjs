import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validatePlan } from '../src/lib/config.mjs';
import { addDays, todayTokyo, shiftBusinessDay } from '../src/lib/dates.mjs';
import { makeSchedule } from '../src/lib/schedule.mjs';
import { evaluate } from '../src/lib/check.mjs';
import { parseYen, parseJstTimestamp } from '../src/collectors/rakuten-playwright.mjs';
const read = path => JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const demoPlan=read('config/example.plan.json');
const when=new Date('2026-10-17T00:00:00+09:00');
function data(entries){return {schemaVersion:1,mode:'DEMO_ONLY',accounts:entries.map(([id,amount])=>({id,amount,observedAt:'DEMO_NOW'}))};}
function mini(overrides={}) {return {...demoPlan,alertWindowDays:7,...overrides};}
test('JST civil dates independent of runner timezone',()=>{
  assert.equal(todayTokyo(new Date('2026-10-16T16:15:00Z')),'2026-10-17');
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
});
test('previous business day moves 2026-11-01 Sunday to 2026-10-30',()=>{
  assert.equal(shiftBusinessDay('2026-11-01','previous_business_day',[]),'2026-10-30');
  assert.equal(shiftBusinessDay('2026-10-12','next_business_day',['2026-10-12']),'2026-10-13');
});
test('same-day incoming cannot be relied on to fund outgoing',()=>{
  const p=mini({accounts:[{id:'demo_a',owner:'member_1',label:'A',floor:0},{id:'demo_b',owner:'member_2',label:'B',floor:0}],
    transfers:[{id:'t1',from:'demo_a',to:'demo_b',day:17,amount:100,fee:0,method:'automatic',holidayPolicy:'none'},
      {id:'t2',from:'demo_b',to:'demo_a',day:17,amount:100,fee:0,method:'automatic',holidayPolicy:'none'}],minimumBalanceRules:[]});
  const r=evaluate(p,data([['demo_a',0],['demo_b',100]]),{date:'2026-10-17',now:when,mode:'demo'});
  assert.ok(r.findings.some(f=>f.account==='demo_a' && f.type==='FORECAST_SHORTFALL'));
});
test('forecast separates incoming dependency from projected deficit',()=>{
  const p=mini({accounts:[{id:'demo_a',owner:'member_1',label:'A',floor:0},{id:'demo_b',owner:'member_2',label:'B',floor:0}],
    transfers:[{id:'in',from:'demo_b',to:'demo_a',day:18,amount:100,method:'automatic'},
      {id:'out',from:'demo_a',to:'demo_b',day:19,amount:100,method:'automatic'}],minimumBalanceRules:[]});
  const r=evaluate(p,data([['demo_a',10],['demo_b',500]]),{date:'2026-10-17',now:when});
  assert.ok(r.findings.some(f=>f.type==='REQUIRES_INCOMING' && f.account==='demo_a'));
  assert.ok(!r.findings.some(f=>f.type==='FORECAST_SHORTFALL' && f.account==='demo_a'));
});
test('missing bank data leads to UNKNOWN, not success',()=>{
  const r=evaluate(demoPlan,data([['demo_a',100000]]),{date:'2026-10-17',now:when});
  assert.equal(r.snapshotStatus.missing,1);
  assert.ok(r.findings.some(f=>f.type==='MISSING_BALANCE'));
});
test('actual bank freshness requires SOURCE update timestamp, not scrape time',()=>{
  const snapshots={schemaVersion:1,accounts:[{id:'demo_a',amount:9999999,observedAt:when.toISOString()},
    {id:'demo_b',amount:9999999,observedAt:when.toISOString()}]};
  const r=evaluate(demoPlan,snapshots,{date:'2026-10-17',now:when,mode:'actual'});
  assert.equal(r.snapshotStatus.stale,2);
  assert.ok(r.findings.every(f=>f.type==='UNVERIFIED_SOURCE_DATE'));
});
test('stale source date fails even if scrape is recent',()=>{
  const snapshot={schemaVersion:1,accounts:[{id:'demo_a',amount:9999999,observedAt:when.toISOString(),sourceUpdatedAt:'2026-10-01T00:00:00+09:00'},
    {id:'demo_b',amount:9999999,observedAt:when.toISOString(),sourceUpdatedAt:when.toISOString()}]};
  const r=evaluate(demoPlan,snapshot,{date:'2026-10-17',now:when,mode:'actual'});
  assert.equal(r.snapshotStatus.stale,1);
  assert.equal(r.snapshotStatus.fresh,1);
});
test('do not silently accept demo snapshot in actual mode',()=>{
  assert.throws(()=>evaluate(demoPlan,data([['demo_a',123]]),{date:'2026-10-17',now:when,mode:'actual'}),/Demo data rejected/);
});
test('parser handles fullwidth yen and JST bank timestamps',()=>{
  assert.equal(parseYen('￥１，２３４円'),1234);
  assert.equal(parseJstTimestamp('2026/10/17 09:15'),'2026-10-17T00:15:00.000Z');
  assert.equal(parseJstTimestamp('最終更新: 先ほど'),null);
});
test('validate does not accept unknown accounts / negative amount',()=>{
  const broken=structuredClone(demoPlan);
  broken.transfers[0].to='phantom';
  assert.throws(()=>validatePlan(broken),/Invalid transfer/);
});
