# github-webhook-bridge ホスティング先切り替え対応 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GWB_BASE_URL` のデフォルトを新ホスト `https://gwb.tomacheese.com/` に切り替え、各リポジトリに残る旧 Vercel URL 宛のレガシー Webhook を自動検出・削除して新ホスト宛に作り直す。

**Architecture:** `src/main.ts` 単一ファイルに、既知ホスト URL の定数 `KNOWN_GWB_BASE_URLS` を追加し、リポジトリごとの Webhook 一覧取得後・既存の `checkMode` 判定の前に「レガシー Webhook 検出・削除」ステップを挿入する。`GWB_CHECK_MODE` の値に関わらず常に実行する独立ロジックとする。

**Tech Stack:** TypeScript, `@octokit/rest`, `@book000/node-utils` (`Logger`), pnpm

## Global Constraints

- `GWB_BASE_URL` のデフォルト値: `https://gwb.tomacheese.com/`
- 既知ホスト一覧（コード内定数、環境変数化しない）:
  - `https://github-webhook-bridge.vercel.app/`
  - `https://gwb.tomacheese.com/`
- レガシー Webhook 削除ログの絵文字は新規追加せず、既存の `🚮` を流用する
- レガシー Webhook 移行処理は `GWB_CHECK_MODE` (`BASE_URL` / `FULL_URL`) の値に関わらず常に実行する
- TypeScript: `any` 不使用、`skipLibCheck` 禁止
- コメント・docstring: 日本語
- 半角スペースを日本語と英数字の間に挿入
- 参照spec: `docs/superpowers/specs/2026-07-01-gwb-host-migration-design.md`

---

### Task 1: `src/main.ts` にレガシー Webhook 移行ロジックを実装する

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Produces: 定数 `KNOWN_GWB_BASE_URLS: string[]`（モジュールスコープ、`main()` 関数の外）
- このタスクのみで完結（後続タスクへの新規インターフェース提供なし）

- [ ] **Step 1: `KNOWN_GWB_BASE_URLS` 定数を追加する**

`src/main.ts` の `import` 文の直後（`async function main()` の直前）に追加する:

```typescript
import { Octokit } from '@octokit/rest'
import { Logger } from '@book000/node-utils'

/** 既知の GitHub Webhook Bridge ホスティング先 URL 一覧（レガシー Webhook 移行検出用） */
const KNOWN_GWB_BASE_URLS = [
  'https://github-webhook-bridge.vercel.app/',
  'https://gwb.tomacheese.com/',
]

async function main() {
```

- [ ] **Step 2: `GWB_BASE_URL` のデフォルト値を変更する**

`src/main.ts:25-26` を変更する。

変更前:
```typescript
  const baseUrl =
    process.env.GWB_BASE_URL ?? 'https://github-webhook-bridge.vercel.app/'
```

変更後:
```typescript
  const baseUrl = process.env.GWB_BASE_URL ?? 'https://gwb.tomacheese.com/'
```

- [ ] **Step 3: レガシー Webhook 検出・削除ロジックを追加する**

`src/main.ts` のリポジトリループ内、`hooks` 取得直後・`filteredHooks` 算出より前に挿入する。

変更前（`src/main.ts:67-80` 付近）:
```typescript
  for (const repo of filteredRepos) {
    logger.info(`📦 ${repo.full_name}`)

    const hooks = await octokit.paginate(octokit.rest.repos.listWebhooks, {
      owner: repo.owner.login,
      repo: repo.name,
      per_page: 100,
    })

    const filteredHooks = hooks.filter((hook) =>
      checkMode === 'FULL_URL'
        ? hook.config.url === url
        : hook.config.url?.startsWith(baseUrl)
    )
```

変更後:
```typescript
  for (const repo of filteredRepos) {
    logger.info(`📦 ${repo.full_name}`)

    const hooks = await octokit.paginate(octokit.rest.repos.listWebhooks, {
      owner: repo.owner.login,
      repo: repo.name,
      per_page: 100,
    })

    // 既知の旧ホスト URL に一致し、現在の baseUrl とは異なる Webhook をレガシーとみなし削除する
    // (GWB_CHECK_MODE の値に関わらず常に実行する)
    const legacyHooks = hooks.filter(
      (hook) =>
        KNOWN_GWB_BASE_URLS.some((knownBaseUrl) =>
          hook.config.url?.startsWith(knownBaseUrl)
        ) && !hook.config.url?.startsWith(baseUrl)
    )
    for (const hook of legacyHooks) {
      logger.info(
        `🚮 Remove legacy webhook (hook_id=${hook.id}, url=${hook.config.url})`
      )
      await octokit.rest.repos.deleteWebhook({
        owner: repo.owner.login,
        repo: repo.name,
        hook_id: hook.id,
      })
    }

    // レガシー Webhook を除いた残りの一覧で、以降の判定・削除処理を行う
    const remainingHooks = hooks.filter((hook) => !legacyHooks.includes(hook))

    const filteredHooks = remainingHooks.filter((hook) =>
      checkMode === 'FULL_URL'
        ? hook.config.url === url
        : hook.config.url?.startsWith(baseUrl)
    )
```

- [ ] **Step 4: `FULL_URL` モードの既存削除ロジックを `remainingHooks` ベースに変更する**

変更前（`src/main.ts:87-101` 付近）:
```typescript
    // FULL_URLモードの場合、BASE_URLで始まるWebhookを削除
    if (checkMode === 'FULL_URL') {
      const baseHooks = hooks.filter(
        (hook) =>
          hook.config.url?.startsWith(baseUrl) && hook.config.url !== url
      )
      for (const hook of baseHooks) {
        logger.info(`🚮 Remove webhook (hook_id=${hook.id})`)
        await octokit.rest.repos.deleteWebhook({
          owner: repo.owner.login,
          repo: repo.name,
          hook_id: hook.id,
        })
      }
    }
```

変更後:
```typescript
    // FULL_URLモードの場合、BASE_URLで始まるWebhookを削除
    if (checkMode === 'FULL_URL') {
      const baseHooks = remainingHooks.filter(
        (hook) =>
          hook.config.url?.startsWith(baseUrl) && hook.config.url !== url
      )
      for (const hook of baseHooks) {
        logger.info(`🚮 Remove webhook (hook_id=${hook.id})`)
        await octokit.rest.repos.deleteWebhook({
          owner: repo.owner.login,
          repo: repo.name,
          hook_id: hook.id,
        })
      }
    }
```

- [ ] **Step 5: Lint・型チェックを実行する**

Run: `pnpm lint`
Expected: エラーなし（warning も 0 件であること）

Run: `pnpm run lint:tsc`
Expected: 型エラーなし

- [ ] **Step 6: 変更後の `src/main.ts` 全体を読み、ロジックの整合性を目視確認する**

確認観点:
- `legacyHooks` の判定が `KNOWN_GWB_BASE_URLS` のいずれかで始まり、かつ現在の `baseUrl` で始まらないことを正しく判定しているか
- `remainingHooks` がそれ以降の `filteredHooks` / `baseHooks` 算出の両方で使われているか（`hooks` を直接参照している箇所が残っていないか）
- 削除ログの絵文字が `🚮` に統一されているか（新規絵文字を追加していないか）

- [ ] **Step 7: コミットする**

```bash
git add src/main.ts
git commit -m "feat(webhook): レガシー Webhook を自動検出・削除し新ホストへ移行する"
```

---

### Task 2: `README.md` を更新する

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1 で実装した挙動（`KNOWN_GWB_BASE_URLS` によるレガシー Webhook 自動移行、`GWB_BASE_URL` デフォルト値変更）をドキュメント化するのみ。コードへの依存はなし

- [ ] **Step 1: `GWB_BASE_URL` のデフォルト値記述を更新する**

`README.md:12-13` を変更する。

変更前:
```markdown
- `GWB_BASE_URL`: Specifies the base URL of the GitHub Webhook Bridge service. If not set, it defaults to `https://github-webhook-bridge.vercel.app/`. This service is used to bridge GitHub webhooks to other services like Discord.
  - Default: `https://github-webhook-bridge.vercel.app/`
```

変更後:
```markdown
- `GWB_BASE_URL`: Specifies the base URL of the GitHub Webhook Bridge service. If not set, it defaults to `https://gwb.tomacheese.com/`. This service is used to bridge GitHub webhooks to other services like Discord.
  - Default: `https://gwb.tomacheese.com/`
```

- [ ] **Step 2: レガシー Webhook 自動移行の挙動説明を追加する**

`README.md` の `GWB_CHECK_MODE` の説明（`README.md:17-20` 付近）の直後に、新しいセクションとして追加する。

変更前:
```markdown
- `GWB_CHECK_MODE`: Specify conditions for determining whether to replace existing Webhook settings when they exist.
  - Choices: `BASE_URL`, `FULL_URL`
  - Default: `BASE_URL`
  - If FULL_URL is specified, settings that match only BASE_URL will be deleted.

## License
```

変更後:
```markdown
- `GWB_CHECK_MODE`: Specify conditions for determining whether to replace existing Webhook settings when they exist.
  - Choices: `BASE_URL`, `FULL_URL`
  - Default: `BASE_URL`
  - If FULL_URL is specified, settings that match only BASE_URL will be deleted.

## Legacy webhook migration

If a repository has a webhook pointing to a previously known GitHub Webhook Bridge host (e.g. the old `https://github-webhook-bridge.vercel.app/` hosting), it is automatically detected, deleted, and recreated against the current `GWB_BASE_URL`. This migration runs regardless of `GWB_CHECK_MODE`.

## License
```

- [ ] **Step 3: 変更内容を確認する**

Run: `git diff README.md`
Expected: 上記2箇所の変更のみが表示されること

- [ ] **Step 4: コミットする**

```bash
git add README.md
git commit -m "docs(readme): GWB_BASE_URL のデフォルト値とレガシー Webhook 移行挙動を追記"
```

---

### Task 3: 手動動作確認を実施する

**Files:**
- なし（コード変更なし。動作確認のみ）

**Interfaces:**
- Consumes: Task 1, Task 2 完了後の `src/main.ts` 全体

このプロジェクトには自動テストフレームワークが未導入のため（`CLAUDE.md` 記載の方針通り）、`pnpm dev` 等による手動確認を実施する。実際の GitHub リポジトリ・Webhook を操作するため、検証用のテストリポジトリ（本番運用対象ではないリポジトリ）を用意して実施すること。

- [ ] **Step 1: 検証用環境変数を準備する**

`.env` に以下を設定する（既存の `.env` がない場合は作成する。値はユーザー自身の検証用トークン・URL を使用すること）:

```
DISCORD_WEBHOOK_URL=<検証用 Discord Webhook URL>
PERSONAL_ACCESS_TOKEN=<検証用 PAT>
```

- [ ] **Step 2: 旧 Vercel URL の Webhook が登録された状態を作る**

検証用リポジトリに、`https://github-webhook-bridge.vercel.app/?url=...` 形式の Webhook を手動で1つ登録しておく（GitHub リポジトリの Settings > Webhooks から作成、または別途スクリプトで作成）。

- [ ] **Step 3: デフォルト設定（`GWB_CHECK_MODE` 未指定 = `BASE_URL`）で実行する**

Run: `pnpm dev`

Expected:
- ログに `🚮 Remove legacy webhook (hook_id=..., url=https://github-webhook-bridge.vercel.app/...)` が出力される
- 続けて `🚀 Webhook created` が出力される
- 検証用リポジトリの Webhook 一覧を確認し、旧 URL の Webhook が削除され、`https://gwb.tomacheese.com/...` 宛の Webhook が新規作成されていることを確認する

- [ ] **Step 4: 新 URL の Webhook が既に存在する場合にスキップされることを確認する**

Run: `pnpm dev`（Step 3 の直後にもう一度実行）

Expected:
- ログに `⏭️ Webhook already exists, skip` が出力される
- 余分な Webhook が作成されていないことを確認する

- [ ] **Step 5: `GWB_CHECK_MODE=FULL_URL` でも移行処理が動作することを確認する**

検証用リポジトリに再度旧 Vercel URL の Webhook を追加したうえで実行する。

Run: `GWB_CHECK_MODE=FULL_URL pnpm dev`

Expected:
- `🚮 Remove legacy webhook (...)` が出力され、旧 URL の Webhook が削除される
- `GWB_BASE_URL` で始まり `url` と完全一致しない Webhook があれば `🚮 Remove webhook (hook_id=...)` で削除される
- 最終的に `url` と完全一致する Webhook のみが残る

- [ ] **Step 6: `KNOWN_GWB_BASE_URLS` に含まれない任意の URL の Webhook には影響がないことを確認する**

検証用リポジトリに `https://example.com/unrelated-webhook` のような無関係な Webhook を追加してから `pnpm dev` を実行する。

Expected: 無関係な Webhook が削除されずそのまま残っていることを確認する

- [ ] **Step 7: 検証用に作成した Webhook を後片付けする**

検証用リポジトリに残った検証用 Webhook を GitHub の Settings > Webhooks から手動で削除する。

---

## Self-Review Notes

- Spec の「全体方針」「詳細設計 1〜5」「テスト方針」「ドキュメント更新」を全て Task 1〜3 でカバーしている
- プレースホルダーなし。全コードブロックは実際の差分として記述済み
- 型・変数名: `legacyHooks` / `remainingHooks` / `KNOWN_GWB_BASE_URLS` は Task 1 内で一貫して使用しており、後続タスクへの型受け渡しはない（README 更新は文書のみ、コード依存なし）
