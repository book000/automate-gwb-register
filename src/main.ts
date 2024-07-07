import { Octokit } from '@octokit/rest'
import { Logger } from '@book000/node-utils'

async function main() {
  const logger = Logger.configure('main')

  // environment variables
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
  const webhookSecret = process.env.WEBHOOK_SECRET
  const personalAccessToken = process.env.PERSONAL_ACCESS_TOKEN
  if (!discordWebhookUrl || !personalAccessToken) {
    logger.error('❌ Required environment variables are not set')
    process.exitCode = 1
    return
  }

  if (!webhookSecret) {
    logger.warn('⚠️ WEBHOOK_SECRET is not set')
  }

  const baseUrl =
    process.env.GWB_BASE_URL ?? 'https://github-webhook-bridge.vercel.app/'
  const url = `${baseUrl}?url=${discordWebhookUrl}`

  const octokit = new Octokit({ auth: personalAccessToken })

  const authenticatedUser = await octokit.rest.users.getAuthenticated()

  logger.info(`👤 Authenticated as ${authenticatedUser.data.login}`)

  const repos = await octokit.paginate(octokit.rest.repos.listForUser, {
    username: authenticatedUser.data.login,
    per_page: 100,
  })

  const filteredRepos = repos.filter((repo) => repo.archived === false)

  for (const repo of filteredRepos) {
    logger.info(`📦 ${repo.full_name}`)

    const hooks = await octokit.paginate(octokit.rest.repos.listWebhooks, {
      owner: repo.owner.login,
      repo: repo.name,
      per_page: 100,
    })

    const filteredHooks = hooks.filter((hook) =>
      hook.config.url?.startsWith(baseUrl)
    )
    if (filteredHooks.length > 0) {
      // already exists, skip
      logger.info('⏭️ Webhook already exists, skip')
      continue
    }

    // create webhook
    await octokit.rest.repos.createWebhook({
      owner: repo.owner.login,
      repo: repo.name,
      name: 'web',
      config: {
        url,
        content_type: 'json',
        secret: webhookSecret,
      },
      events: ['*'],
    })

    logger.info('🚀 Webhook created')
  }

  logger.info('✅ Done')
}

;(async () => {
  await main()
})()
