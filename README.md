# automate-gwb-register

Registers [github-webhook-bridge](https://github.com/book000/github-webhook-bridge) webhooks on the repositories of the authenticated GitHub user.

For every public repository of the user that is neither archived nor a fork (the repositories are listed with `repos.listForUser`, so private repositories are not processed), it creates a webhook (all events, JSON payload) that points to the bridge and forwards events to a Discord webhook. Existing bridge webhooks are detected and not duplicated.

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

The script modifies webhooks on real repositories. The repositories are listed with the user of `PERSONAL_ACCESS_TOKEN`, so use a token with permission to manage repository webhooks.

The scheduled workflow `.github/workflows/auto-register.yml` runs it hourly (and on manual dispatch) using the repository secrets `DISCORD_WEBHOOK_URL`, `WEBHOOK_SECRET`, `PERSONAL_ACCESS_TOKEN` and `GWB_QUERY`. In that workflow an unset `GWB_QUERY` secret is passed as an empty string, which overrides the default query.

## Environment variables

- `DISCORD_WEBHOOK_URL`: The Discord webhook URL that events are forwarded to. It is substituted for `{url}` in `GWB_QUERY`.
  - Required
- `PERSONAL_ACCESS_TOKEN`: GitHub token used to list the user's repositories and manage their webhooks.
  - Required
- `WEBHOOK_SECRET`: Secret of the created webhooks, used to verify that payloads come from GitHub.
  - Optional (a warning is logged if unset), but strongly recommended
- `GWB_BASE_URL`: Base URL of the GitHub Webhook Bridge service.
  - Default: `https://gwb.tomacheese.com/`
- `GWB_PATH`: Path appended to `GWB_BASE_URL`.
  - Default: empty
- `GWB_QUERY`: Query string appended after the path. `{url}` is replaced by the value of `DISCORD_WEBHOOK_URL`.
  - Default: `?url={url}`
- `GWB_CHECK_MODE`: How an existing webhook is matched.
  - Choices: `BASE_URL`, `FULL_URL`
  - Default: `BASE_URL`
  - `BASE_URL`: A webhook whose URL starts with `GWB_BASE_URL` counts as already registered, and the repository is skipped.
  - `FULL_URL`: Only a webhook whose URL equals the full generated URL counts as registered. If there is none, webhooks that start with `GWB_BASE_URL` but differ from the full URL are deleted and a new one is created.

The webhook URL is `GWB_BASE_URL` + `GWB_PATH` + `GWB_QUERY`.

The script logs the configuration at startup. `PERSONAL_ACCESS_TOKEN`, `WEBHOOK_SECRET` and `DISCORD_WEBHOOK_URL` are logged only as set (✅) or unset (❌), and the Discord webhook URL embedded in the generated URL is masked as `***`.

## Legacy webhook migration

If a repository has a webhook pointing to a previously known GitHub Webhook Bridge host (e.g. the old `https://github-webhook-bridge.vercel.app/` hosting), it is detected and deleted, and a webhook is then created against the current `GWB_BASE_URL` (or left as is if one already exists there). This migration runs regardless of `GWB_CHECK_MODE`.

The set of known hosts (`KNOWN_GWB_BASE_URLS` in `src/main.ts`) is hardcoded. If you explicitly set `GWB_BASE_URL` to a known host other than the default, webhooks pointing to the other known hosts are treated as legacy and removed.

## License

[MIT License](LICENSE)
