# Claude Code 作業方針

## 目的

このドキュメントは、Claude Code がこのプロジェクトで作業する際の方針とプロジェクト固有のルールを定義します。

## 判断記録のルール

すべての判断は、以下の形式で記録すること：

1. **判断内容の要約**: 何を決定したか
2. **検討した代替案**: どのような選択肢があったか
3. **採用しなかった案とその理由**: なぜその選択肢を選ばなかったか
4. **前提条件・仮定・不確実性**: 判断の基盤となる前提、仮定、不確実な要素
5. **他エージェントによるレビュー可否**: 他のエージェント（Codex CLI、Gemini CLI）によるレビューが必要か

前提・仮定・不確実性を明示し、仮定を事実のように扱わないこと。

## プロジェクト概要

- **目的**: GitHub Webhook Bridge (github-webhook-bridge) の Webhook をユーザーのリポジトリに自動登録する
- **主な機能**:
  - GitHub API を使用してユーザーのリポジトリ一覧を取得（アーカイブとフォークを除外）
  - 既存の Webhook を確認し、重複を避けて新規作成
  - `GWB_CHECK_MODE` に応じて既存 Webhook を削除または保持
  - GitHub イベントを Discord に転送するための Webhook を一括設定

## 重要ルール

- **会話言語**: 日本語
- **コミット規約**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う
  - 形式: `<type>(<scope>): <description>`
  - `<description>` は日本語で記載
  - 例: `feat: Webhook 登録処理を最適化`
- **コード内コメント**: 日本語
- **エラーメッセージ**: 英語（ただし、ユーザー向けログは絵文字付き日本語も可）

## 環境のルール

- **ブランチ命名**: [Conventional Branch](https://conventional-branch.github.io) に従う
  - 形式: `<type>/<description>`
  - `<type>` は短縮形（feat, fix）を使用
  - 例: `feat/add-logging-feature`
- **GitHub リポジトリ調査**: テンポラリディレクトリに git clone して調査する
- **実行環境**: Linux (Git Bash on Windows も対応)
- **Renovate PR**: Renovate が作成した既存の PR に対して追加コミットや更新を行わない

## コード改修時のルール

- **日本語と英数字の間**: 半角スペースを挿入する
- **既存のエラーメッセージ**: 先頭に絵文字がある場合は、全体で統一する（✅、❌、⚠️、📦、🚀など）
- **TypeScript 規約**:
  - `skipLibCheck` での回避は禁止
  - 関数・インターフェースに docstring（JSDoc）を日本語で記載
  - 命名規則: 変数・関数は camelCase、定数は UPPER_SNAKE_CASE

## 相談ルール

他エージェントに相談することができる。以下の観点で使い分ける：

### Codex CLI (ask-codex)

- 実装コードに対するソースコードレビュー
- 関数設計、モジュール内部の実装方針などの局所的な技術判断
- アーキテクチャ、モジュール間契約、パフォーマンス／セキュリティといった全体影響の判断
- 実装の正当性確認、機械的ミスの検出、既存コードとの整合性確認

### Gemini CLI (ask-gemini)

- GitHub API の最新仕様や機能
- Octokit ライブラリの最新仕様や機能
- Node.js の最新仕様や機能
- 外部一次情報の確認、最新仕様の調査、外部前提条件の検証

### 指摘への対応

他エージェントが指摘・異議を提示した場合、以下のいずれかを行う。黙殺・無言での不採用は禁止する。

- 指摘を受け入れ、判断を修正する
- 指摘を退け、その理由を明示する

以下は必ず実施する：

- 他エージェントの提案を鵜呑みにせず、その根拠や理由を理解する
- 自身の分析結果と他エージェントの意見が異なる場合は、双方の視点を比較検討する
- 最終的な判断は、両者の意見を総合的に評価した上で、自身で下す

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

# Prettier チェック
pnpm run lint:prettier

# Prettier 自動修正
pnpm run fix:prettier

# ESLint チェック
pnpm run lint:eslint

# ESLint 自動修正
pnpm run fix:eslint
```

## アーキテクチャと主要ファイル

### アーキテクチャサマリー

このプロジェクトは、以下のコンポーネントで構成される：

1. **src/main.ts**: メインエントリーポイント
   - 環境変数の検証
   - GitHub API を使用したリポジトリ一覧の取得
   - 各リポジトリに対する Webhook の作成・削除
   - エラーハンドリングとロギング

### 主要ディレクトリ

```
.
├── src/
│   └── main.ts                   # メインエントリーポイント
├── package.json                  # 依存関係と開発コマンド
├── tsconfig.json                 # TypeScript 設定
├── eslint.config.mjs             # ESLint 設定
├── .prettierrc                   # Prettier 設定（あれば）
├── README.md                     # プロジェクト概要と使い方
├── .github/
│   └── copilot-instructions.md   # GitHub Copilot 向けプロンプト
├── CLAUDE.md                     # Claude Code 向けプロンプト（このファイル）
├── AGENTS.md                     # 汎用 AI エージェント向けプロンプト
└── GEMINI.md                     # Gemini CLI 向けプロンプト
```

## 実装パターン

### 推奨パターン

#### 環境変数の検証

```typescript
// 必須環境変数の存在確認
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
const personalAccessToken = process.env.PERSONAL_ACCESS_TOKEN
if (!discordWebhookUrl || !personalAccessToken) {
  logger.error('❌ Required environment variables are not set')
  process.exitCode = 1
  return
}
```

#### Octokit を使用した GitHub API 呼び出し

```typescript
// 認証
const octokit = new Octokit({ auth: personalAccessToken })

// ページネーション
const repos = await octokit.paginate(octokit.rest.repos.listForUser, {
  username: authenticatedUser.data.login,
  per_page: 100,
})
```

#### ロギング

```typescript
// @book000/node-utils を使用
const logger = Logger.configure('main')
logger.info('✅ Done')
logger.warn('⚠️ Warning message')
logger.error('❌ Error message')
```

### 非推奨パターン

- **グローバル変数の乱用**: 関数内でスコープを明確にする
- **エラーハンドリングの省略**: GitHub API 呼び出しは try-catch でラップするか、適切にエラーを処理する
- **ハードコーディング**: 環境変数で設定可能にする
- **絵文字の不統一**: 既存のログメッセージの絵文字スタイルに従う

## テスト

### テスト方針

- 現在、テストフレームワークは導入されていない
- 動作確認は実際の GitHub API を使用して行う
- 今後テストを追加する場合は、Jest または Vitest の使用を推奨

### 追加テスト条件

変更を加えた場合、以下を確認する：

1. TypeScript の型チェックがパスすること（`pnpm run lint:tsc`）
2. ESLint のチェックがパスすること（`pnpm run lint:eslint`）
3. Prettier のチェックがパスすること（`pnpm run lint:prettier`）
4. 環境変数が正しく検証されること
5. 既存の Webhook が正しく検出されること
6. Webhook が正常に作成されること
7. `GWB_CHECK_MODE` の動作が正しいこと

## ドキュメント更新ルール

### 更新対象

以下のファイルを変更した場合は、関連ドキュメントを更新する：

- **src/main.ts**: 環境変数や処理ロジックの変更
- **package.json**: 開発コマンドや依存関係の変更
- **README.md**: 使い方や環境変数の変更

### 更新タイミング

- 技術スタックの変更時
- 開発コマンドの変更時
- プロジェクト要件の変更時
- 環境変数の追加・変更時
- 品質チェックで問題検出時

## 作業チェックリスト

### 新規改修時

1. プロジェクトを理解する
2. 作業ブランチが適切であることを確認する
3. 最新のリモートブランチに基づいた新規ブランチであることを確認する
4. PR がクローズされた不要ブランチが削除済みであることを確認する
5. pnpm で依存関係をインストールする（`pnpm install`）

### コミット・プッシュ前

1. Conventional Commits に従っていることを確認する
2. センシティブな情報が含まれていないことを確認する
3. Lint / Format エラーがないことを確認する（`pnpm lint`）
4. 動作確認を行う（`pnpm start` または `pnpm dev`）

### PR 作成前

1. PR 作成の依頼があることを確認する
2. センシティブな情報が含まれていないことを確認する
3. コンフリクトの恐れがないことを確認する

### PR 作成後

1. コンフリクトがないことを確認する
2. PR 本文が最新状態のみを網羅していることを確認する
3. `gh pr checks <PR ID> --watch` で CI を確認する
4. Copilot レビューに対応し、コメントに返信する
5. Codex のコードレビューを実施し、信頼度スコアが 50 以上の指摘対応を行う
6. PR 本文の崩れがないことを確認する

## リポジトリ固有

### 環境変数

以下の環境変数が必須またはオプションで使用される：

- `DISCORD_WEBHOOK_URL`: Discord Webhook の転送先 URL（**必須**）
- `PERSONAL_ACCESS_TOKEN`: GitHub API 認証トークン（**必須**）
- `WEBHOOK_SECRET`: Webhook シークレット（**推奨**）
- `GWB_BASE_URL`: GitHub Webhook Bridge のベース URL（デフォルト: `https://github-webhook-bridge.vercel.app/`）
- `GWB_PATH`: Webhook リクエストパス（デフォルト: 空文字列）
- `GWB_QUERY`: Webhook リクエストクエリパラメータ（デフォルト: `?url={url}`）
- `GWB_CHECK_MODE`: Webhook 設定の比較モード（`BASE_URL` または `FULL_URL`、デフォルト: `BASE_URL`）

### Webhook 設定モード

- **BASE_URL モード**: ベース URL が一致する Webhook が存在すればスキップ
- **FULL_URL モード**: 完全に一致する URL の Webhook が存在すればスキップし、ベース URL のみ一致する Webhook は削除

### 対象リポジトリ

- アーカイブされたリポジトリ（`archived: true`）は除外
- フォークされたリポジトリ（`fork: true`）は除外
- オリジナルのリポジトリのみが対象

### 注意事項

- **単一ファイル構成**: `src/main.ts` が唯一のソースファイル。シンプルな構成を維持する
- **エラーメッセージ**: 絵文字（✅、❌、⚠️、📦、🚀、🔧、👤、⏭️、🚮など）を使用してユーザーフレンドリーなログを出力している。既存のスタイルに従う
- **認証情報の扱い**: Personal Access Token は絶対に Git にコミットしない。`.env` ファイルで管理する
- **ログ出力**: 設定情報をログに出力する際は、Personal Access Token や Webhook シークレット、Discord Webhook URL などの認証情報を平文で出力しない。必ずマスクするか、存在有無などの非機密なメタ情報のみをログに出すこと
