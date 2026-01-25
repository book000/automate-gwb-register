# AI エージェント向け作業方針

## 目的

このドキュメントは、一般的な AI エージェントがこのプロジェクトで作業する際の基本方針とルールを定義します。

## 基本方針

- **会話言語**: 日本語
- **コード内コメント**: 日本語
- **エラーメッセージ**: 英語
- **コミット規約**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う
  - 形式: `<type>(<scope>): <description>`
  - `<description>` は日本語で記載
  - 例: `feat: Webhook 登録機能を追加`

## 判断記録のルール

すべての判断は、以下の形式で記録すること：

1. **判断内容の要約**: 何を決定したか
2. **検討した代替案**: どのような選択肢があったか
3. **採用しなかった案とその理由**: なぜその選択肢を選ばなかったか
4. **前提条件・仮定・不確実性**: 判断の基盤となる前提、仮定、不確実な要素

前提・仮定・不確実性を明示し、仮定を事実のように扱わないこと。

## プロジェクト概要

- **目的**: GitHub Webhook Bridge (github-webhook-bridge) の Webhook をユーザーのリポジトリに自動登録する
- **主な機能**:
  - GitHub API を使用してユーザーのリポジトリ一覧を取得
  - 既存の Webhook を確認し、必要に応じて作成または削除
  - GitHub イベントを Discord に転送するための Webhook を一括設定
- **技術スタック**:
  - 言語: TypeScript
  - ランタイム: Node.js
  - パッケージマネージャー: pnpm (10.28.1)

## 開発手順（概要）

1. **プロジェクト理解**
   - README.md とソースコードを読み、プロジェクトの目的と機能を理解する
   - 環境変数の要件を確認する

2. **依存関係インストール**
   ```bash
   pnpm install
   ```

3. **変更実装**
   - 既存のコーディングスタイルに従う
   - 日本語と英数字の間に半角スペースを入れる
   - 関数には JSDoc で日本語のドキュメントを記載する

4. **テストと Lint/Format 実行**
   ```bash
   pnpm lint
   pnpm fix  # 自動修正
   ```

5. **動作確認**
   ```bash
   pnpm start
   ```

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
```

## セキュリティ / 機密情報

- **環境変数**: `DISCORD_WEBHOOK_URL` と `PERSONAL_ACCESS_TOKEN` は必須。`.env` ファイルで管理し、Git にコミットしない。
- **認証情報**: GitHub Personal Access Token は `.env` ファイルで管理し、絶対に Git にコミットしない。
- **ログ出力**: 設定情報をログに出力する際は、Personal Access Token や Webhook シークレット、Discord Webhook URL などの認証情報を平文で出力しない。必ずマスクするか、存在有無などの非機密なメタ情報のみをログに出すこと。

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

### 対象リポジトリ

- アーカイブされたリポジトリとフォークは自動的に除外される
- オリジナルのリポジトリのみが対象

### エラーメッセージ

- 絵文字（✅、❌、⚠️、📦、🚀など）を使用してユーザーフレンドリーなログを出力している
- 既存のスタイルに従う

### 注意事項

- **単一ファイル構成**: `src/main.ts` が唯一のソースファイル。シンプルな構成を維持する
- **TypeScript**: `skipLibCheck` での回避は禁止
- **日本語と英数字の間**: 半角スペースを挿入する
