# GitHub Copilot Instructions

## プロジェクト概要

- **目的**: GitHub Webhook Bridge (github-webhook-bridge) の Webhook をユーザーのリポジトリに自動登録する
- **主な機能**:
  - GitHub API を使用してユーザーのリポジトリ一覧を取得
  - 既存の Webhook を確認し、必要に応じて作成または削除
  - GitHub イベントを Discord に転送するための Webhook を一括設定
- **対象ユーザー**: GitHub ユーザー、開発者

## 共通ルール

- 会話は日本語で行う。
- PR とコミットは Conventional Commits に従う。`<type>(<scope>): <description>` 形式で、`<description>` は日本語で記載する。
  - 例: `feat: Webhook 登録機能を追加`
- 日本語と英数字の間には半角スペースを入れる。

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js
- **パッケージマネージャー**: pnpm (10.28.1)
- **主要ライブラリ**:
  - `@octokit/rest`: GitHub API クライアント
  - `@book000/node-utils`: ロギングユーティリティ
  - `tsx`: TypeScript ランタイム

## コーディング規約

- **フォーマット**: Prettier
- **Lint**: ESLint (`@book000/eslint-config`)
- **Type Check**: TypeScript (`tsc`)
- **命名規則**:
  - 変数・関数: camelCase
  - 定数: UPPER_SNAKE_CASE
  - クラス: PascalCase
- **コメント**: 日本語で記述
- **エラーメッセージ**: 英語で記述（ただし、ユーザー向けログは絵文字付き日本語も可）

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

## テスト方針

- 現在、テストフレームワークは導入されていない
- 今後テストを追加する場合は、Jest または Vitest の使用を推奨
- 動作確認は実際の GitHub API を使用して行う

## セキュリティ / 機密情報

- **環境変数**: `DISCORD_WEBHOOK_URL` と `PERSONAL_ACCESS_TOKEN` は必須。`.env` ファイルで管理し、Git にコミットしない。
- **認証情報**: GitHub Personal Access Token は `.env` ファイルで管理し、絶対に Git にコミットしない。
- **ログ出力**: ログに認証情報や Discord Webhook URL を出力する場合は注意する（デバッグ時のみ）。

## ドキュメント更新

以下のファイルを変更した場合は、関連ドキュメントを更新する：

- `README.md`: 環境変数や使い方の変更時
- `package.json`: 開発コマンドの変更時
- プロンプトファイル（`.github/copilot-instructions.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`）: 技術スタックやプロジェクト要件の変更時

## リポジトリ固有

- **環境変数が重要**: 特に `DISCORD_WEBHOOK_URL` と `PERSONAL_ACCESS_TOKEN` が必須。設定ミスでエラーが発生する。
- **Webhook 設定モード**: `GWB_CHECK_MODE` で `BASE_URL` または `FULL_URL` を指定可能。`FULL_URL` モードでは既存の Webhook を削除してから作成する。
- **対象リポジトリ**: アーカイブされたリポジトリとフォークは自動的に除外される。
- **単一ファイル構成**: `src/main.ts` が唯一のソースファイル。シンプルな構成を維持する。
- **エラーメッセージ**: 絵文字（✅、❌、⚠️、📦、🚀など）を使用してユーザーフレンドリーなログを出力している。既存のスタイルに従う。
