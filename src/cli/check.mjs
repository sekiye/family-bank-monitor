import { readFile } from 'node:fs/promises';
import { evaluate } from '../lib/check.mjs';
import { formatReport, compactDiagnostic } from '../lib/report.mjs';
import { todayTokyo } from '../lib/dates.mjs';
import { sendDiscord } from '../lib/notify.mjs';
const args = new Set(process.argv.slice(2));
const getArg = name => [...args].find(x=>x.startsWith(`${name}=`))?.slice(name.length+1);
const mode = getArg('--mode') ?? 'demo';
const date = getArg('--date') ?? todayTokyo();
const paths = {
  demo:['config/example.plan.json','fixtures/demo-balances.json'],
  draft:['private/plan.draft.json','private/balances.draft-demo.json'],
  actual:['private/plan.json','private/balances.json']
};
if (!(mode in paths)) throw new Error('Mode must be demo | draft | actual');
const load = async path=>JSON.parse(await readFile(new URL(`../../${path}`,import.meta.url),'utf8'));
try {
  const [plan,balances] = await Promise.all(paths[mode].map(load));
  const report = evaluate(plan,balances,{date,mode});
  console.log(formatReport(report,plan,{redacted:mode==='actual' && !args.has('--details')}));
  console.log('\nDIAGNOSTIC '+compactDiagnostic(report));
  if (mode==='actual' && process.env.DISCORD_WEBHOOK_URL && process.env.ENABLE_DISCORD_SEND==='YES') {
    await sendDiscord(process.env.DISCORD_WEBHOOK_URL,formatReport(report,plan,{limit:10}));
    console.log('DISCORD_SEND=attempted');
  } else {
    console.log('DISCORD_SEND=disabled');
  }
  // Exits nonzero if actual data is unavailable/unsafe, which is intentional.
  if (mode==='actual' && (report.snapshotStatus.missing || report.snapshotStatus.stale)) process.exitCode=2;
} catch (error) {
  // No raw exception objects: playwright/state/URL/network exceptions can contain sensitive material.
  console.error(`CHECK_FAILED: ${error instanceof SyntaxError ? 'JSON format invalid' : String(error?.message ?? error).slice(0,220)}`);
  process.exitCode=1;
}
