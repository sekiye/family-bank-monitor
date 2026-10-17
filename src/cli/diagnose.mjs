import { readFile } from 'node:fs/promises';
import { evaluate } from '../lib/check.mjs';
import { compactDiagnostic } from '../lib/report.mjs';
import { todayTokyo } from '../lib/dates.mjs';
const read = async p=>JSON.parse(await readFile(new URL(`../../${p}`,import.meta.url),'utf8'));
try {
  const [demoPlan,demoBalances,draftPlan,draftBalances] = await Promise.all([
    read('config/example.plan.json'),read('fixtures/demo-balances.json'),
    read('private/plan.draft.json'),read('private/balances.draft-demo.json')]);
  const demo=evaluate(demoPlan,demoBalances,{date:todayTokyo(),mode:'demo'});
  const draft=evaluate(draftPlan,draftBalances,{date:todayTokyo(),mode:'draft'});
  console.log(`NODE=${process.version}`);
  console.log(`JST_DATE=${todayTokyo()}`);
  console.log('DEMO '+compactDiagnostic(demo));
  console.log('DRAFT '+compactDiagnostic(draft));
  console.log('NO_BANK_LOGIN=1');
  console.log('NO_REAL_BALANCES=1');
  console.log('NO_DISCORD_SEND=1');
  console.log('DIAGNOSE_OK=1');
} catch {
  console.log('DIAGNOSE_OK=0');
  console.log('Files unreadable or invalid; please share only these sanitized output lines.');
  process.exitCode=1;
}
