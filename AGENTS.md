# AGENTS.md

Guidance for AI coding agents and contributors. `CLAUDE.md` imports this file, and `.github/copilot-instructions.md` adds the review checklist.

## Language

- All deliverables are written in **English**: commit messages, PR/Issue titles and bodies, review comments, code comments and docstrings, and documentation (`README.md`, `AGENTS.md`, etc.).
- Exceptions (keep as is): quotations, technical identifiers, generated files, and external source text.
- Runtime messages (logs, errors) are English.
- Do not rewrite Git history to change the language of past commits.

## Overview

A batch script that registers [github-webhook-bridge](https://github.com/book000/github-webhook-bridge) webhooks (forwarding to Discord) on all public, non-archived, non-fork repositories of the user that owns `PERSONAL_ACCESS_TOKEN`. It deletes and creates webhooks on real repositories, so never run it against real credentials while developing. See `README.md` for the environment variables, `GWB_CHECK_MODE` and legacy webhook migration.

## Commands

```bash
pnpm install        # install dependencies (other package managers are rejected by preinstall)
pnpm start          # run src/main.ts with tsx
pnpm dev            # same, in watch mode
pnpm lint           # prettier --check + eslint + tsc
pnpm test           # run the vitest unit tests once
pnpm fix            # prettier --write + eslint --fix
```

Unit tests use vitest and live next to the modules as `src/*.test.ts`; run them with `pnpm test` (CI runs `pnpm run test` automatically). They cover the pure logic only, so for changes to the Octokit calls in `src/main.ts`, verify by reading the code and, if needed, by a run against a throwaway account. Node.js is pinned in `.node-version` and pnpm in `package.json`. CI (`.github/workflows/nodejs-ci-pnpm.yml`) uses the reusable workflow from `book000/templates`.

## Structure

- `src/main.ts`: the entry point (Octokit calls for listing repositories and creating/deleting webhooks, and logging).
- `src/config.ts`: `loadConfig`, which validates environment variables and builds the webhook URL.
- `src/webhook-plan.ts`: pure decision logic (`planWebhookActions`, `filterTargetRepositories`, `getHookOrigin`) that decides which webhooks to delete or create.
- `.github/workflows/auto-register.yml`: runs `pnpm start` hourly with repository secrets.
- `scripts/load-env.ps1`: loads a `.env` file into the current PowerShell session. The app itself does not read `.env`.

## Conventions

- Use `Logger` from `@book000/node-utils` for output, and `octokit.paginate` to fetch all repositories and webhooks.
- Avoid `any`. Do not enable `skipLibCheck` in `tsconfig.json`.
- Keep log messages consistent with the existing emoji prefix style.
- Compare webhook hosts by `URL().origin` so that trailing slashes do not matter, and never treat the current `GWB_BASE_URL` host as legacy.
- Credentials and webhook URLs must not be logged in plain text: startup logs show `DISCORD_WEBHOOK_URL`, `WEBHOOK_SECRET` and `PERSONAL_ACCESS_TOKEN` only as set/unset, and the embedded Discord webhook URL is masked as `***`. Do not add log lines that output them.
- When behavior or environment variables change, update `README.md` and this file.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/); branches follow [Conventional Branch](https://conventional-branch.github.io) short form (`feat/...`, `fix/...`).
- Do not commit to Renovate PRs. Never commit secrets. Address every review comment or explain why not.
- Put new decision logic in pure functions outside `src/main.ts` and cover it with a `src/*.test.ts` test; importing `src/main.ts` runs it.
