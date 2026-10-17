/**
 * Interactive, local-only Playwright scaffold for Rakuten Money Support.
 * No selectors or login URLs are assumed. No authentication bypass / password automation.
 * Capture only once the bank's terms, legal location, and household consent are checked.
 * NOTE: an unverified source update time makes a balance untrustworthy for live checks.
 */
export function parseYen(raw) {
  const text = String(raw).normalize('NFKC').replace(/[\s,，￥¥円]/g,'');
  if (!/^\d+$/.test(text)) throw new Error('Bank amount parse failed');
  const amount = Number(text);
  if (!Number.isSafeInteger(amount)) throw new Error('Amount exceeds safe integer limit');
  return amount;
}
export function parseJstTimestamp(raw) {
  const text=String(raw).normalize('NFKC').trim();
  // Accept explicitly displayed bank update time, not scrape time.
  // Extend after the user has shown a sanitized example of the actual display format.
  const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/;
  const jp=/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  if (iso.test(text)) {
    const date = new Date(text);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  const m=jp.exec(text);
  if (m) {
    const normalized = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}T${m[4].padStart(2,'0')}:${m[5]}:${m[6]??'00'}+09:00`;
    const date = new Date(normalized);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return null;
}
export async function scrapeMappedRows(page, mapping) {
  for (const selector of ['rowSelector','nameSelector','balanceSelector']) {
    if (typeof mapping[selector] !== 'string' || !mapping[selector])
      throw new Error('Local DOM mapping is not configured');
  }
  const rows=page.locator(mapping.rowSelector);
  const count=await rows.count();
  if (count===0) throw new Error('No matching balance rows (page may have changed / login incomplete)');
  const results=[];
  for (let i=0;i<count;i++) {
    const row=rows.nth(i);
    const name=(await row.locator(mapping.nameSelector).innerText()).trim();
    const match=mapping.accounts.find(a=>a.matchName===name);
    if (!match) continue;
    const balance=parseYen(await row.locator(mapping.balanceSelector).innerText());
    let sourceUpdatedAt=null;
    if (mapping.updatedAtSelector) {
      sourceUpdatedAt=parseJstTimestamp(await row.locator(mapping.updatedAtSelector).innerText());
    }
    if (results.some(a=>a.id===match.id)) throw new Error('Duplicate mapped account');
    results.push({id:match.id,amount:balance,observedAt:new Date().toISOString(),
      ...(sourceUpdatedAt ? {sourceUpdatedAt}: {})});
  }
  return results;
}
