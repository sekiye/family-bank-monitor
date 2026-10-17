# 家族用残高・定期振込チェック / 試作 v0.1.0

**重要：このZIPは判定エンジン＋ダミー実行が動く第一段階です。楽天マネーサポートからの実残高取得は未接続です。** GitHub Actionsはテストとデモ判定のみ実行します。実際の銀行ログイン、振込操作、着金確認を実行したり、正常性を保証したりしません。

## 含まれるもの

- 家族3人（`member_1` 本人、`member_2` 妻、`member_3` 子）の仮の口座割当
- **暫定版**の振込予定75本、16口座、7件の残高特典条件を `private/plan.draft.json` に格納（過去の一覧なので未確認）
- 土日＋設定した祝日による前後営業日への振替（**祝日リストは現在空欄**）
- 日本時間の日付で、今後7日間の予定出金・予定入金・最低必要残高を比較
- 「予定入金が実行されても不足する」危険と「未着金なら不足する」注意を区別
- ログイン失敗・銀行側の更新日時が分からない場合は `UNKNOWN` とする設計
- 手動振込の予定についての通知項目
- Discord Webhook送信関数（本番データ・明示的許可でのみ送信）
- 公開してもよいダミー設定、node標準テスト、GitHub Actionsでの日次デモ実行
- Playwrightの**ローカル操作用スケルトン**（ログイン画面や残高DOMのセレクタは未確認、デフォルト無効）

## fish で最初にすること

ダウンロードした `bank-monitor-starter.zip` が `~/Downloads` にある想定です。**別の既存プロジェクトを上書きしない**インストール例：

```fish
mkdir -p ~/Projects; and unzip -n ~/Downloads/bank-monitor-starter.zip -d ~/Projects; and cd ~/Projects/bank-monitor-starter; and npm test; and npm run test:private; and npm run diagnose
```

`unzip -n` は既存ファイルを上書きしません。修正済みZIPを適用する場合の上書きについては、その都度具体的なコマンドを案内します。

標準出力を共有する際は、**`npm run diagnose` の出力だけ**を貼ってください。数字は件数のみで、金額・口座名・家族名・パスワードを表示しません。

```fish
cd ~/Projects/bank-monitor-starter; and npm run diagnose
```

ダミーデータの詳細な判定例（ダミー金額は出力されます）：

```fish
cd ~/Projects/bank-monitor-starter; and npm run check:demo
```

暫定振込スケジュール（機密情報に近い内容なので標準出力を他人に公開しない）：

```fish
cd ~/Projects/bank-monitor-starter; and npm run check:draft
```

`npm run test:private` はZIP内の非公開暫定設定（詳細な振込金額・口座名を含みます）も検証します。public GitHubにはアップロードしません。

`npm install` は不要です。Node.js 22以上と `unzip` が必要です。外部パッケージは判定エンジンには使っていません。

## GitHub Public にする場合

1. 別途Publicリポジトリを作り、**`private/` 配下・`.env`・ブラウザの認証状態は決して push しない**。`.gitignore` は `private/**` を除外しますが、`git add -f` などで強制追加しないでください。
2. `.github/workflows/daily-check.yml` は毎日JST 07:17に**デモのみ**実行します。GitHub Actionsの標準公開Runnerは無料ですが、楽天銀行への本番アクセスは行いません。
3. Webhook URLや家族の銀行認証情報をPublicリポジトリへコミットしないでください。Secretsでも、信用できないワークフローコードから漏れる危険があります。
4. GitHub Actionsは実行が遅延・欠落する場合があり、公開リポジトリは60日間活動がないと定期実行が無効化されることがあります。重要用途では独立した死活監視が必要です。

**楽天銀行マネーサポートは日本国内利用に限定**されており、標準GitHub-hosted runnerの実行地域は日本国内とは保証されません。実行地域と自動化可否を楽天銀行に確認できるまで、CIからの銀行ログインは有効化しない方針です。家族それぞれの同意・銀行の利用規定に従ってください。

## 最新版に更新する際の取り扱い

`private/plan.draft.json` は暫定設定です。家族・銀行割当は仮説であり、現在の予約の実在性は確認していません。最終的に各口座の実際の設定を確認して `private/plan.json` にコピー・修正します。銀行口座番号の実値は必要ありません。すべてIDで管理します。

```fish
cd ~/Projects/bank-monitor-starter; and cp -n private/plan.draft.json private/plan.json
```

本番判定用の `private/balances.json` は**銀行側更新日時が確認された残高**だけを判定できるようにしています。手作業で登録するなら下記の形式です。こちらもGit管理対象外です。

```json
{
  "schemaVersion": 1,
  "mode": "ACTUAL_LOCAL",
  "accounts": [
    {"id":"demo_a","amount":100000,"observedAt":"2026-10-17T07:00:00+09:00","sourceUpdatedAt":"2026-10-17T06:50:00+09:00"}
  ]
}
```

例の `demo_a` は実際の暫定計画にはないため、そのままでは判定できません。`id` は `private/plan.json` の口座IDに合わせます。残高データが欠けている口座は警告されます。`sourceUpdatedAt` が未確認の場合、正常判定は出しません。

## Playwright（ローカル検証のみ・まだ設定未完成）

`src/collectors/rakuten-playwright.mjs` にブラウザの表示テキストから残高を読み取る処理を用意しました。ただし楽天マネーサポートの実際の画面構造、認証ページのURL、DOMのセレクタを未検証のため、**現時点では実データを取得できません**。ログイン自動化や二要素認証回避は行いません。

- まずサービス提供元の国内利用・自動ブラウザ操作の可否を確認すること。
- Playwrightはローカルで後日別途 `npm install --no-save playwright` と `npx playwright install chromium` で導入できます。インストールする場合は利用環境とダウンロード元を確認してください。
- `private/browser-mapping.example.json` を `private/browser-mapping.json` にコピーし、実ページを元にURLとセレクタを設定する必要があります。
- 日本国内で、規定確認・家族同意の後でのみ `ACKNOWLEDGE_BANK_TERMS=YES npm run collect:local` を実行してください。3人のBrowserContextは分離され、ログインは各人が手動で行います。
- セッションCookie・パスワードを保存しません。取得した情報は除外済みの `private/balances.json` に保存します。

DOM更新日時が読めない場合、`sourceUpdatedAt` を省略し、実際の判定結果を `UNKNOWN` にします。閲覧した時刻を銀行データ更新時刻として捏造しません。

## 判定上の限界

- 休日は土日と設定された祝日だけ。現時点の日本の祝日は未登録です。
- 定期振込の実行済み／取消／失敗は照会していません。残高の変動だけで振込成功と扱いません。
- 出金予約の銀行内部の実行順序は不明。**同日中の入金は、その日の出金より後に着金する**保守的なモデルです。
- 「振込予定日当日のデータ」は既に振込済みか判断できず、二重計上の恐れがあります。原則、前日の事前チェック結果を重要視してください。
- 定額自動入金の引落日と着金日は異なる可能性があります。暫定設定では資金移動予定として記録していますが、実処理日は銀行側の仕様確認が必要です。
- 現在の残高から将来の未確定入金を加えた予測値と、入金を含めない保守値を分けています。**将来の入金を銀行の着金実績とは認定しません**。
- 給与入金は入金日が不明なので将来イベントには含めていません。
- 受取人口座の名義や振込手数料など未確認の項目は暫定値です。
- 月初の振込が前営業日に早まると、前月末の残高判定に影響する可能性があります。
- 現在の銀行残高が他の要因で変化することはモデルに含まれていません。

## 参照先

- GitHub Actionsの定期実行と無料枠: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Secrets: https://docs.github.com/en/actions/concepts/security/secrets
- 楽天銀行マネーサポート利用規定: https://www.rakuten-bank.co.jp/rules/money.html
