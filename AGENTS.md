# AI Agents Guidelines

## 目的
このドキュメントは、このリポジトリで作業するすべての AI エージェント（汎用エージェント）向けの基本方針とルールを定義します。

## 基本方針
- **会話言語**: 日本語
- **コメント言語**: 日本語
- **エラーメッセージ**: 英語（ユーザー向けは日本語可）
- **コミット規約**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  - `<description>` は日本語
- **日本語と英数字の間**: 半角スペースを挿入

## 判断記録のルール
重要な決定を行う際は、以下を明示してください：
1. **判断内容**: 何を決めたか
2. **代替案**: 他の選択肢
3. **採用理由**: なぜその選択肢を選んだか
4. **前提条件**: 判断のベースにある前提
5. **不確実性**: 確信が持てない点

## 開発手順（概要）
1. **プロジェクト理解**: `README.md` やソースコードを読み、目的と構造を理解する。
2. **依存関係インストール**: `pnpm install` を実行する。
3. **変更実装**: プロジェクトのコーディング規約（Lint/Format）に従い実装する。
4. **検証**:
   - `pnpm lint`: Lint チェック
   - `pnpm run lint:tsc`: TypeScript 型チェック
   - `pnpm start` または `pnpm dev`: 動作確認

## セキュリティ / 機密情報
- **認証情報**: `PERSONAL_ACCESS_TOKEN` や `WEBHOOK_SECRET`、`DISCORD_WEBHOOK_URL` などの機密情報は絶対に Git にコミットしない。
- **ログ出力**: ログに機密情報を出力する際は注意する（現在のコードでは設定確認のため平文で出力している）。

## リポジトリ固有
- **技術スタック**: TypeScript, Node.js
- **主要ファイル**: `src/main.ts` (単一ファイル構成)
- **環境変数**: `.env` ファイルで管理（必須: `DISCORD_WEBHOOK_URL`, `PERSONAL_ACCESS_TOKEN`）
- **Webhook 設定モード**（`GWB_CHECK_MODE`）:
  - `BASE_URL`: ベース URL が一致する Webhook が存在すればスキップ
  - `FULL_URL`: 完全に一致する URL の Webhook が存在すればスキップし、ベース URL のみ一致する Webhook は削除
- **エラーメッセージスタイル**: 絵文字（✅、❌、⚠️、📦、🚀、🔧、👤、⏭️、🚮など）を使用し、既存スタイルに準拠する
- **TypeScript 制約**: `skipLibCheck` の使用は禁止
- **ログ出力**: 認証情報や Webhook URL は、コンフィグレーション確認のために平文でログ出力される