# Gemini CLI Guidelines

## 目的
このドキュメントは、Gemini CLI がこのプロジェクトで作業する際のコンテキストと作業方針を定義します。

## 出力スタイル
- **言語**: 日本語
- **トーン**: 簡潔で明確
- **形式**: Markdown

## 共通ルール
- **会話言語**: 日本語
- **コミット規約**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  - `<type>(<scope>): <description>` 形式
  - `<description>` は日本語で記載
  - 例: `feat: Webhook 登録機能を追加`
- **日本語と英数字の間**: 半角スペースを挿入

## プロジェクト概要
- **目的**: GitHub Webhook Bridge (github-webhook-bridge) の Webhook をユーザーのリポジトリに自動登録する
- **主な機能**:
  - GitHub API を使用してユーザーのリポジトリ一覧を取得
  - 既存の Webhook を確認し、必要に応じて作成または削除
  - GitHub イベントを Discord に転送するための Webhook を一括設定

## コーディング規約
- **フォーマット**: Prettier
- **Lint**: ESLint (`@book000/eslint-config`)
- **命名規則**:
  - 変数・関数: camelCase
  - 定数: UPPER_SNAKE_CASE
  - クラス: PascalCase
- **コメント**: 日本語
- **エラーメッセージ**: 英語（ただし、ユーザー向けログは絵文字付き日本語も可）

## 開発コマンド
```bash
# 依存関係のインストール
pnpm install

# アプリケーション実行
pnpm start

# 開発モード（watch）
pnpm dev

# Lint チェック
pnpm lint

# Lint + Format 自動修正
pnpm fix

# TypeScript 型チェック
pnpm run lint:tsc
```

## 注意事項

### セキュリティ / 機密情報
- **環境変数**: `DISCORD_WEBHOOK_URL` と `PERSONAL_ACCESS_TOKEN` は必須。`.env` ファイルで管理し、Git にコミットしない。
- **認証情報**: GitHub Personal Access Token は `.env` ファイルで管理し、絶対に Git にコミットしない。
- **ログ出力**: ログに認証情報や Discord Webhook URL を出力する場合は注意する。

### 既存ルールの優先
- プロジェクトに既存のコーディング規約がある場合は、それを優先する
- 既存のエラーメッセージスタイル（絵文字の使用）に従う

### 既知の制約
- 現在、テストフレームワークは導入されていない
- 単一ファイル構成（`src/main.ts`）を維持する

## リポジトリ固有

### 環境変数
以下の環境変数が使用される：

| 環境変数名 | 必須 | デフォルト値 | 説明 |
|----------|------|------------|------|
| `DISCORD_WEBHOOK_URL` | 必須 | - | Discord Webhook の転送先 URL |
| `PERSONAL_ACCESS_TOKEN` | 必須 | - | GitHub API 認証トークン |
| `WEBHOOK_SECRET` | 推奨 | - | Webhook シークレット |
| `GWB_BASE_URL` | オプション | `https://github-webhook-bridge.vercel.app/` | GitHub Webhook Bridge のベース URL |
| `GWB_PATH` | オプション | 空文字列 | Webhook リクエストパス |
| `GWB_QUERY` | オプション | `?url={url}` | Webhook リクエストクエリパラメータ |
| `GWB_CHECK_MODE` | オプション | `BASE_URL` | Webhook 設定の比較モード（`BASE_URL` または `FULL_URL`） |

### Webhook 設定モード
- **BASE_URL モード**: ベース URL が一致する Webhook が存在すればスキップ
- **FULL_URL モード**: 完全に一致する URL の Webhook が存在すればスキップし、ベース URL のみ一致する Webhook は削除

### 対象リポジトリ
- アーカイブされたリポジトリ（`archived: true`）は除外
- フォークされたリポジトリ（`fork: true`）は除外
- オリジナルのリポジトリのみが対象

### エラーメッセージ
- 絵文字（✅、❌、⚠️、📦、🚀、🔧、👤、⏭️、🚮など）を使用してユーザーフレンドリーなログを出力
- 既存のスタイルに従う

### 技術スタック
- **言語**: TypeScript
- **ランタイム**: Node.js
- **パッケージマネージャー**: pnpm (10.28.1)
- **主要ライブラリ**:
  - `@octokit/rest`: GitHub API クライアント
  - `@book000/node-utils`: ロギングユーティリティ
  - `tsx`: TypeScript ランタイム

### 構成
- **単一ファイル構成**: `src/main.ts` が唯一のソースファイル
- シンプルな構成を維持する