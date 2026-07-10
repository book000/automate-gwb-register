# Claude Code Guidelines

## 目的
このドキュメントは、Claude Code がこのプロジェクトで作業する際の詳細な方針とルールを定義します。

## 判断記録のルール
作業を行う際は、以下の項目を判断記録として残すことを推奨します：
1. **判断内容の要約**: 何を決めたか
2. **検討した代替案**: 他にどのような方法があったか
3. **採用しなかった案とその理由**: なぜ他の方法を選ばなかったか
4. **前提条件・仮定・不確実性**: 判断の基準となった前提や、不明確な点
5. **レビュー要否**: 追加のレビューが必要かどうか

## プロジェクト概要
- **目的**: GitHub Webhook Bridge の Webhook をユーザーのリポジトリに自動登録する
- **主な機能**:
  - GitHub API を用いたリポジトリ一覧取得
  - 既存 Webhook の確認と重複回避
  - Discord 転送用 Webhook の一括設定（作成・削除）

## 重要ルール
- **会話言語**: 日本語
- **コミット規約**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  - 形式: `<type>(<scope>): <description>`（例: `feat(webhook): Webhook 登録機能を追加`）
  - `<description>` は日本語で記載
- **コメント言語**: 日本語（docstring 含む）
- **エラーメッセージ**: 英語（ユーザー向けログは絵文字付き日本語も可）
- **日本語と英数字の間**: 半角スペースを挿入

## 環境のルール
- **ブランチ命名**: [Conventional Branch](https://conventional-branch.github.io)
  - 形式: `<type>/<description>` (例: `feat/add-webhook-filter`)
- **リポジトリ調査**: 調査時はテンポラリディレクトリに clone して検索することを推奨
- **Renovate**: Renovate の PR に直接コミットしない

## コード改修時のルール
- **エラーメッセージ**: 先頭に絵文字がある場合は統一する
- **TypeScript**: `skipLibCheck` は使用禁止
- **Docstring**: 関数やインターフェースには日本語で docstring を記述する
- **命名規則**: 変数・関数は camelCase、定数は UPPER_SNAKE_CASE、クラスは PascalCase

## レビュー対応
- **指摘への対応**: レビュー（人間・Copilot コードレビュー等）からの指摘は黙殺せず、必ず対応するか理由を説明する

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

## アーキテクチャと主要ファイル
- **構成**: 単一ファイル構成
- **主要ファイル**:
  - `src/main.ts`: アプリケーションの全ロジック（設定読み込み、GitHub API 操作、ログ出力）
  - `.env`: 環境変数設定（Git 対象外）

## 実装パターン
- **推奨**:
  - `@book000/node-utils` の `Logger` を使用したログ出力
  - `@octokit/rest` の `paginate` を使用した全件取得
- **非推奨**:
  - `console.log` の直接使用（`Logger` を使う）
  - 型定義の `any` 使用

## テスト
- 現時点ではテストフレームワークは未導入
- ロジック変更時は手動での動作確認（`pnpm dev` 等）を徹底する

## ドキュメント更新ルール
- **更新対象**: `README.md` (仕様変更時), `CLAUDE.md` および `.github/copilot-instructions.md` (ルール・規約変更時)
- **更新タイミング**: 機能追加、環境変数変更、依存関係のメジャーアップデート時

## 作業チェックリスト

### 新規改修時
1. プロジェクトを理解する（`README.md`, `src/main.ts`）
2. 作業ブランチが適切であることを確認する
3. 最新のリモートブランチに基づいた新規ブランチであることを確認する
4. PR がクローズされた不要ブランチが削除済みであることを確認する
5. `pnpm install` で依存関係をインストールする

### コミット・プッシュ前
1. Conventional Commits に従っていることを確認する
2. センシティブな情報（トークン等）が含まれていないことを確認する
3. `pnpm lint` でエラーがないことを確認する
4. `pnpm start` 等で動作確認を行う

### PR 作成前
1. PR 作成の依頼があることを確認する
2. センシティブな情報が含まれていないことを確認する
3. コンフリクトの恐れがないことを確認する

### PR 作成後
1. コンフリクトがないことを確認する
2. PR 本文が最新状態のみを網羅していることを確認する
3. GitHub Actions CI の結果を確認する
4. Copilot レビューに対応し、コメントに返信する

## リポジトリ固有
- **アーカイブ/フォーク**: `archived: true` または `fork: true` のリポジトリは Webhook 設定の対象外とする
- **環境変数**: 
  - 必須: `DISCORD_WEBHOOK_URL`（Discord Webhook 転送先 URL）、`PERSONAL_ACCESS_TOKEN`（GitHub API 認証トークン）
  - オプション: `WEBHOOK_SECRET`、`GWB_BASE_URL`（デフォルト: `https://gwb.tomacheese.com/`）、`GWB_PATH`、`GWB_QUERY`（デフォルト: `?url={url}`）、`GWB_CHECK_MODE`（デフォルト: `BASE_URL`）
- **Webhook 設定モード**（`GWB_CHECK_MODE`）:
  - `BASE_URL` モード: ベース URL が一致する Webhook が存在すればスキップ
  - `FULL_URL` モード: 完全に一致する URL の Webhook が存在すればスキップし、ベース URL のみ一致する Webhook は削除
- **レガシー Webhook 移行**: `src/main.ts` の `KNOWN_GWB_BASE_URLS` に列挙された既知の旧ホスト（現在の `GWB_BASE_URL` と異なるもの）を指す Webhook はレガシーとみなし、`GWB_CHECK_MODE` に関わらず常に削除してから現行 URL へ再登録する。既知ホストを追加・変更する場合はこの定数を更新する。
- **エラーメッセージスタイル**: 絵文字（✅、❌、⚠️、📦、🚀、🔧、👤、⏭️、🚮など）を使用してユーザーフレンドリーなログを出力する。既存スタイルに準拠する。
- **ログ出力時の認証情報**: 認証情報（`PERSONAL_ACCESS_TOKEN`、`WEBHOOK_SECRET`）や Webhook URL は、コンフィグレーション確認のために平文でログ出力される（`src/main.ts` の設定情報表示部分参照）。この挙動は既知のものであり、変更する場合は影響を確認すること。