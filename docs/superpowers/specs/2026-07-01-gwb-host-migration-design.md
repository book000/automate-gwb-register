# github-webhook-bridge ホスティング先切り替え対応 設計

## 背景

[book000/github-webhook-bridge](https://github.com/book000/github-webhook-bridge) が改修され、Vercel
(`https://github-webhook-bridge.vercel.app/`) から自前ホスティングの
`https://github-webhook-bridge.tomacheese.com/` で稼働するようになった。

本リポジトリ (`automate-gwb-register`) は対象ユーザーの全リポジトリに対して
github-webhook-bridge 宛の Webhook を一括登録するツールであり、以下を実現する必要がある。

1. 新規に Webhook を登録する際のデフォルト宛先 URL を新ホスト
   (`https://github-webhook-bridge.tomacheese.com/`) に切り替える
2. 既に各リポジトリに登録済みの旧 Vercel URL 宛 Webhook を、ユーザーの手作業なしに
   新ホスト宛へ自動で移行する

## 全体方針

- `GWB_BASE_URL` 環境変数のデフォルト値を新ホストの URL に変更する
- 「既知の github-webhook-bridge ホスティング先 URL 一覧」をコード内定数として保持し、
  現在の `baseUrl` 以外のホストに一致する Webhook を「レガシー Webhook」とみなして
  自動削除したうえで、新しい `baseUrl` 宛に Webhook を作り直す
- このレガシー Webhook 移行処理は `GWB_CHECK_MODE`(`BASE_URL` / `FULL_URL`) の値に
  関わらず常に実行する

## 詳細設計

### 1. 既知ホスト一覧の定数化

```typescript
/** 既知の GitHub Webhook Bridge ホスティング先 URL 一覧（移行検出用） */
const KNOWN_GWB_BASE_URLS = [
  'https://github-webhook-bridge.vercel.app/',
  'https://github-webhook-bridge.tomacheese.com/',
]
```

- 将来ホスティング先が変わった場合は、この配列にコードで追加する運用とする
  （環境変数化はしない。本ツールは個人用の運用ツールであり、スコープを過剰に広げない）

### 2. レガシー Webhook 判定・削除ロジック

- リポジトリごとに取得した `hooks` のうち、`hook.config.url` が
  `KNOWN_GWB_BASE_URLS` のいずれかで始まり、かつ現在の `baseUrl` では始まらないものを
  「レガシー Webhook」と判定する
- レガシー Webhook が見つかった場合、`GWB_CHECK_MODE` の値に関わらず無条件に削除する
  （既存の FULL_URL モード時の「同一 baseUrl 内での不一致 URL 削除」とは独立したロジックとする）
- ログ出力は既存の絵文字スタイルに合わせ、`🔁 Migrate legacy webhook (hook_id=xxx, url=...)`
  のような専用メッセージを出す

### 3. 既存ロジックとの統合順序

1. リポジトリの Webhook 一覧取得
2. **(新規)** レガシー Webhook の検出・削除（`KNOWN_GWB_BASE_URLS` 基準）
3. 既存の現在 `baseUrl` 一致チェック（スキップ判定）
4. 既存の `FULL_URL` モード時の同一 `baseUrl` 内 URL 不一致削除処理
5. Webhook 作成

レガシー Webhook 削除後、当該リポジトリに現在の `baseUrl` 宛 Webhook が
存在しない状態になるため、自然に新規作成フローへ進む。

### 4. デフォルト値変更

- `GWB_BASE_URL` のデフォルトを `https://github-webhook-bridge.tomacheese.com/` に変更
- `README.md` のデフォルト値記述も同様に更新

### 5. エッジケース

- 同一リポジトリに新 URL と旧 URL の両方が登録されている場合:
  旧 URL のみ削除し、新 URL はそのまま維持（スキップ）
- `KNOWN_GWB_BASE_URLS` に含まれない任意の URL
  （ユーザーが手動設定した別サービス等）には一切手を出さない

## テスト方針

- 本プロジェクトには現時点でテストフレームワークが未導入のため、
  `pnpm dev` 等による手動動作確認を実施する
- 確認観点:
  - 旧 Vercel URL の Webhook が登録された状態で実行し、削除 → 新 URL での作成が行われること
  - 新 URL の Webhook が既に存在する場合はスキップされること
  - `KNOWN_GWB_BASE_URLS` に含まれない任意の URL の Webhook には影響がないこと
  - `GWB_CHECK_MODE=FULL_URL` の場合も移行処理が動作すること

## ドキュメント更新

- `README.md` の `GWB_BASE_URL` デフォルト値記述を更新
- `CLAUDE.md` の環境変数説明は現状のままで問題なし（デフォルト値の明記はしていないため）
