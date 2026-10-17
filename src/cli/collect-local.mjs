import { readFile, writeFile, chmod } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { scrapeMappedRows } from '../collectors/rakuten-playwright.mjs';

if (process.env.GITHUB_ACTIONS || process.env.CI) {
  console.error('LOCAL_ONLY: Bank browser collection is disabled in CI / GitHub Actions.');
  process.exit(1);
}
if (process.env.ACKNOWLEDGE_BANK_TERMS !== 'YES') {
  console.error('DISABLED: Validate Rakuten terms, Japan-only use, personal authorization, and family consent first.');
  process.exit(1);
}
let browser, rl;
try {
  const {chromium}=await import('playwright');
  const settings=JSON.parse(await readFile(new URL('../../private/browser-mapping.json',import.meta.url),'utf8'));
  if (!Array.isArray(settings.members) || settings.members.length!==3) throw new Error('Three members required');
  browser=await chromium.launch({headless:false});
  rl=createInterface({input,output});
  const all=[];
  for (const member of settings.members) {
    if (!/^member_[1-3]$/.test(member.id) || !Array.isArray(member.accounts) ||
        !member.url || new URL(member.url).protocol !== 'https:') throw new Error('Invalid member browser mapping');
    const ctx=await browser.newContext(); // Separate session, no credentials persisted.
    try {
      const page=await ctx.newPage();
      await page.goto(member.url,{waitUntil:'domcontentloaded',timeout:30000});
      console.log(`${member.id}: Login MANUALLY in browser; navigate to balances page.`);
      await rl.question('Press Enter only after the desired balances table is visible: ');
      all.push(...await scrapeMappedRows(page,member));
      console.log(`${member.id}: Captured mapped account count (no financial data printed).`);
    } finally {await ctx.close();}
  }
  const ids=new Set();
  if (all.some(a=>{if(ids.has(a.id))return true;ids.add(a.id);return false;}))
    throw new Error('Duplicate account mapping between members');
  const path=new URL('../../private/balances.json',import.meta.url);
  await writeFile(path,JSON.stringify({schemaVersion:1,mode:'ACTUAL_LOCAL',accounts:all},null,2),{mode:0o600,flag:'w'});
  await chmod(path,0o600);
  console.log(`Saved ${all.length} mapped account entries to ignored private/balances.json`);
  console.log('IMPORTANT: Entries lacking a verified source update timestamp remain UNKNOWN in live checks.');
} catch {
  console.error('COLLECTION_FAILED: Check local mapping, browser install, login and date formatting. No credentials or DOM printed.');
  process.exitCode=1;
} finally {
  if (rl) rl.close();
  if (browser) await browser.close();
}
