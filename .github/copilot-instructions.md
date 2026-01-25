# GitHub Copilot Instructions

## プロジェクト概要
- 目的: GitHub Webhook Bridge (github-webhook-bridge) の Webhook をユーザーのリポジトリに自動登録する
- 主な機能: ユーザーのリポジトリ一覧取得、Webhook の作成・削除・更新、GitHub イベントの Discord への転送設定
- 対象ユーザー: 開発者、github-webhook-bridge 利用者

## 共通ルール
- 会話は日本語で行う。
- PR とコミットは [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う。
- 日本語と英数字の間には半角スペースを入れる。

## 技術スタック
- 言語: TypeScript
- ランタイム: Node.js (tsx)
- パッケージマネージャー: pnpm (10.28.1)
- ライブラリ: @octokit/rest, @book000/node-utils

## コーディング規約
- フォーマット: Prettier
- Lint: ESLint (`@book000/eslint-config`)
- 命名規則: camelCase (変数・関数), PascalCase (クラス), UPPER_SNAKE_CASE (定数)
- TypeScript: `skipLibCheck` の使用禁止

## 開発コマンド
```bash
# 依存関係のインストール
pnpm install

# アプリケーション実行
pnpm start

# 開発モード (watch)
pnpm dev

# Lint チェック
pnpm lint

# Lint + Format 自動修正
pnpm fix

# TypeScript 型チェック
pnpm run lint:tsc
```

## テスト方針
- 現在、テストフレームワークは導入されていない。
- 必要に応じて導入を検討する。

## セキュリティ / 機密情報
- `DISCORD_WEBHOOK_URL`, `PERSONAL_ACCESS_TOKEN`, `WEBHOOK_SECRET` などの認証情報は `.env` で管理し、Git にコミットしない。
- ログに認証情報や Webhook URL をそのまま出力しない。

## ドキュメント更新
- `README.md`: 機能追加や環境変数の変更時に更新
- `GEMINI.md`, `CLAUDE.md`, `AGENTS.md`: ルール変更時に更新

## リポジトリ固有
- 単一ファイル構成 (`src/main.ts`) を維持する。
- アーカイブ済み、またはフォークされたリポジトリは処理対象外。