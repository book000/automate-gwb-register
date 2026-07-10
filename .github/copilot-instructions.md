# GitHub Copilot コードレビュー指示

このリポジトリの Pull Request をレビューする際に重視してほしい観点をまとめる。
リポジトリの概要・開発手順は `CLAUDE.md` を参照。ここではレビュー基準に絞って記載する。

## 前提

- TypeScript / Node.js の単一ファイル構成（`src/main.ts`）。GitHub API (`@octokit/rest`) で
  リポジトリ一覧と Webhook を操作するバッチ処理。
- フォーマット (Prettier) と Lint (ESLint) は CI で強制される。**フォーマット/Lint が自動修正できる
  スタイル差分は指摘しない**（インデント、クォート、セミコロン等）。

## 重点的に確認すること

- **機密情報の漏洩**: `PERSONAL_ACCESS_TOKEN`、`WEBHOOK_SECRET`、`DISCORD_WEBHOOK_URL` などを
  コードやログにハードコードしていないか。これらは `.env` から読む前提。
- **Webhook の破壊的操作**: `deleteWebhook` / `createWebhook` を伴う変更は、対象リポジトリの
  絞り込み条件（`archived`・`fork` の除外）と `GWB_CHECK_MODE`（`BASE_URL` / `FULL_URL`）の分岐が
  正しいか、意図しない Webhook を削除しないかを重点確認する。
- **レガシー Webhook 移行ロジック**: `KNOWN_GWB_BASE_URLS` と現行 `GWB_BASE_URL` の origin 比較で、
  現行ホストの Webhook を誤ってレガシー扱いして削除しないか。URL 比較は末尾スラッシュ等の
  表記ゆれに耐えるか（`URL().origin` での比較を維持しているか）。
- **エラーハンドリング**: GitHub API 呼び出しの失敗時に処理が適切に停止/継続するか。必須環境変数
  未設定時に `process.exitCode = 1` で終了しているか。
- **型安全性**: `any` の新規使用、`skipLibCheck` の追加は不可。
- **ページネーション**: リポジトリ・Webhook の全件取得に `octokit.paginate` を使っているか
  （件数上限での取りこぼしがないか）。

## フラグすべきでない既知パターン

- 認証情報や Webhook URL を設定確認のため平文でログ出力している箇所は**意図的な既存挙動**。
  新規に機密情報を追加ログ出力する変更でなければ指摘しない。
- 絵文字付き（✅ ❌ ⚠️ 📦 🚀 🔧 👤 ⏭️ 🚮 等）のユーザー向けログは既存スタイル。統一されていれば可。
- テストフレームワーク未導入は既知。テストが無いこと自体は指摘不要。

## 規約

- コミット/PR タイトルは [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  （`<type>(<scope>): <description>`、description は日本語）。
- コメントは日本語、エラーメッセージ（ログ文字列）は英語。日本語と英数字の間は半角スペース。
