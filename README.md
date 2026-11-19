# automate-gwb-register

Registers [github-webhook-bridge](https://github.com/book000/github-webhook-bridge) webhooks on the repositories the authenticated GitHub user can administer.

For every repository that the user of `PERSONAL_ACCESS_TOKEN` can access (their own public and private repositories, plus collaborator and organization repositories), is neither archived nor a fork, and on which the user has admin permission, it creates a webhook (all events, JSON payload) that points to the bridge and forwards events to a Discord webhook. Existing bridge webhooks are detected and not duplicated.

## Setup

Requires the Node.js version in `.node-version` and pnpm.

```bash
pnpm install
```

The script reads its configuration from environment variables only; it does not load a `.env` file by itself. On PowerShell, `scripts/load-env.ps1` loads a `.env` file (`NAME=value` lines) into the current session.

## Usage

```bash
DISCORD_WEBHOOK_URL=... PERSONAL_ACCESS_TOKEN=... WEBHOOK_SECRET=... pnpm start
```

`pnpm dev` runs the same entry point (`src/main.ts`) in watch mode.

The process exits with code 0 only if every targeted repository was processed without error. If a repository fails (for example an API 403), the remaining repositories are still processed, a failure summary is logged, and the process exits with code 1. A failure during setup (authentication or listing repositories) also exits with code 1.

The script modifies webhooks on real repositories. The repositories are listed with the user of `PERSONAL_ACCESS_TOKEN`, so use a token with permission to manage repository webhooks. Private repositories are processed only if the token can access them (a classic token with the `repo` scope, or a fine-grained token with access to them).

The scheduled workflow `.github/workflows/auto-register.yml` runs it hourly (and on manual dispatch) using the repository secrets `DISCORD_WEBHOOK_URL`, `WEBHOOK_SECRET`, `PERSONAL_ACCESS_TOKEN` and `GWB_QUERY`. In that workflow an unset or empty `GWB_QUERY` secret is not passed to the app, so the default `?url={url}` is used.

## Environment variables

- `DISCORD_WEBHOOK_URL`: The Discord webhook URL that events are forwarded to. It is percent-encoded and substituted for `{url}` in `GWB_QUERY`, so a query string such as `?thread_id=42` reaches the bridge intact. Provide it in its plain form: an already percent-encoded value would be encoded twice.
  - Required
- `PERSONAL_ACCESS_TOKEN`: GitHub token used to list the user's repositories and manage their webhooks.
  - Required
- `WEBHOOK_SECRET`: Secret of the created webhooks, used to verify that payloads come from GitHub.
  - Optional (a warning is logged if unset), but strongly recommended
- `GWB_BASE_URL`: Base URL of the GitHub Webhook Bridge service.
  - Default: `https://gwb.tomacheese.com/`
- `GWB_PATH`: Path appended to `GWB_BASE_URL`.
  - Default: empty
- `GWB_QUERY`: Query string appended after the path. `{url}` is replaced by the percent-encoded value of `DISCORD_WEBHOOK_URL`.
  - Default: `?url={url}`
- `GWB_CHECK_MODE`: How an existing webhook is matched.
  - Choices: `BASE_URL`, `FULL_URL`
  - Default: `BASE_URL`
  - `BASE_URL`: A webhook whose URL starts with `GWB_BASE_URL` counts as already registered, and the repository is skipped.
  - `FULL_URL`: Only a webhook whose URL equals the full generated URL counts as registered. If there is none, the first webhook that starts with `GWB_BASE_URL` but differs from the full URL is updated in place to the full URL, and any further such webhooks are deleted after the update succeeded. A new webhook is created only when there is no such webhook.

The webhook URL is `GWB_BASE_URL` + `GWB_PATH` + `GWB_QUERY`. The script stops before calling the GitHub API if the resulting URL is not a valid URL.

Webhooks registered before the Discord URL was percent-encoded keep the raw form. With `GWB_CHECK_MODE=FULL_URL` they are updated once to the encoded URL on the next run; with `BASE_URL` existing webhooks are not rewritten.

The script logs the configuration at startup. `PERSONAL_ACCESS_TOKEN`, `WEBHOOK_SECRET` and `DISCORD_WEBHOOK_URL` are logged only as set (✅) or unset (❌), and the Discord webhook URL embedded in the generated URL is masked as `***`. The log also contains the names of the processed private repositories, so it is publicly readable when the script runs in the GitHub Actions of a repository that is public.

## Legacy webhook migration

If a repository has a webhook pointing to a previously known GitHub Webhook Bridge host (e.g. the old `https://github-webhook-bridge.vercel.app/` hosting), it is detected and updated in place to the current webhook URL (or deleted if a webhook already exists at the current `GWB_BASE_URL`). Old webhooks are never deleted before their replacement has been updated or created, so a failed update or creation leaves them untouched. If a delete fails after a successful update, the run exits with an error: leftover legacy webhooks are removed by the next run, but leftover stale webhooks (`FULL_URL` mode) must be deleted manually. This migration runs regardless of `GWB_CHECK_MODE`.

The set of known hosts (`KNOWN_GWB_BASE_URLS` in `src/webhook-plan.ts`) is hardcoded. If you explicitly set `GWB_BASE_URL` to a known host other than the default, webhooks pointing to the other known hosts are treated as legacy and migrated as described above.

## License

[MIT License](LICENSE)
