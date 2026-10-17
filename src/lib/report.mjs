const yen = amount => `${new Intl.NumberFormat('ja-JP').format(amount)}円`;
export function formatReport(report, plan, {redacted=false, limit=12}={}) {
  const names = new Map(plan.accounts.map(a=>[a.id,a.label]));
  const title = report.mode === 'demo' || report.mode === 'draft' ? '【テスト/仮設定・実際の残高ではありません】' : '【残高監視・銀行からの実行結果未確認】';
  const counts = ['danger','unknown','warning','info'].map(s=>[s,report.findings.filter(f=>f.severity===s).length]);
  const lines = [title,`基準日(JST): ${report.date} / 対象: ${report.accountCount}口座`,
    `残高状態: 新鮮 ${report.snapshotStatus.fresh} / 古い ${report.snapshotStatus.stale} / 欠損 ${report.snapshotStatus.missing}`,
    `判定件数: ${counts.map(([k,v])=>`${k}=${v}`).join(' ')}`,
    '※ 同日入金は振込資金として先に算入しません。未来の入金は未確定です。',
    '※ 休日判定は土日と設定済みの日付のみ。国内祝日データ未整備です。'];
  for (const f of report.findings.slice(0,limit)) {
    const bank = redacted ? '口座(非表示)' : (names.get(f.account) || f.account);
    const amount = redacted ? '' : (f.shortfall != null ? ` 不足予測: ${yen(f.shortfall)}` :
      f.shortfallWithoutIncoming != null ? ` 入金不成立時不足: ${yen(f.shortfallWithoutIncoming)}` : '');
    lines.push(`[${f.severity.toUpperCase()}] ${f.date} ${bank} ${f.message}${amount}`);
  }
  if (report.findings.length > limit) lines.push(`（残り${report.findings.length-limit}件を省略）`);
  if (report.findings.length === 0) lines.push('対象期間のチェックで問題なし。ただし振込成功を確認したことにはなりません。');
  return lines.join('\n');
}
export function compactDiagnostic(report) {
  const totals = Object.fromEntries(['danger','unknown','warning','info'].map(s=>
    [s,report.findings.filter(f=>f.severity===s).length]));
  return `mode=${report.mode} accounts=${report.accountCount} fresh=${report.snapshotStatus.fresh} stale=${report.snapshotStatus.stale} missing=${report.snapshotStatus.missing} danger=${totals.danger} unknown=${totals.unknown} warning=${totals.warning} info=${totals.info} schedule=${report.scheduledTransferCount}`;
}
