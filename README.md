# automate-gwb-register

Automatically register [github-webhook-bridge](https://github.com/book000/github-webhook-bridge) webhooks in the user's repository.

## Environment variables

- `DISCORD_WEBHOOK_URL`: Used to construct the URL to which GitHub webhook events will be forwarded. This URL is specific to a Discord webhook, allowing GitHub events to be sent to a Discord channel.
  - Required
- `WEBHOOK_SECRET`: Utilized as a secret token for securing webhooks, ensuring that the sender of the webhook payload is actually GitHub.
  - Optional, but strongly recommended to be set
- `PERSONAL_ACCESS_TOKEN`: Required for authenticating with the GitHub API to fetch user repositories and manage webhooks.
- `GWB_BASE_URL`: Specifies the base URL of the GitHub Webhook Bridge service. If not set, it defaults to `https://github-webhook-bridge.vercel.app/`. This service is used to bridge GitHub webhooks to other services like Discord.
  - Default: `https://github-webhook-bridge.vercel.app/`
- `GWB_PATH`: Webhook Request Destination
- `GWB_QUERY`: Query parameter for Webhook request destination
  - Default: `?url={url}` (`{url}` is replaced by the value of DISCORD_WEBHOOK_URL)
- `GWB_CHECK_MODE`: Specify conditions for determining whether to replace existing Webhook settings when they exist.
  - Choices: `BASE_URL`, `FULL_URL`
  - Default: `BASE_URL`
  - If FULL_URL is specified, settings that match only BASE_URL will be deleted.

## License

The license for this project is [MIT License](LICENSE).
