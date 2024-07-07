# automate-gwb-register

Automatically register [github-webhook-bridge](https://github.com/book000/github-webhook-bridge) webhooks in the user's repository.

## Environment variables

- `DISCORD_WEBHOOK_URL`: Used to construct the URL to which GitHub webhook events will be forwarded. This URL is specific to a Discord webhook, allowing GitHub events to be sent to a Discord channel.
  - Required
- `WEBHOOK_SECRET`: Utilized as a secret token for securing webhooks, ensuring that the sender of the webhook payload is actually GitHub.
  - Optional, but strongly recommended to be set
- `GITHUB_PERSONAL_ACCESS_TOKEN`: Required for authenticating with the GitHub API to fetch user repositories and manage webhooks.
- `GWB_BASE_URL`: Specifies the base URL of the GitHub Webhook Bridge service. If not set, it defaults to `https://github-webhook-bridge.vercel.app/`. This service is used to bridge GitHub webhooks to other services like Discord.
  - Default: `https://github-webhook-bridge.vercel.app/`

## License

The license for this project is [MIT License](LICENSE).
