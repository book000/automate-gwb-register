import { Octokit } from '@octokit/rest'
import { Logger } from '@book000/node-utils'
import { loadConfig } from './config'
import {
  filterTargetRepositories,
  getHookOrigin,
  planWebhookActions,
} from './webhook-plan'

async function main() {
  const logger = Logger.configure('main')

  const loaded = loadConfig(process.env)
  if (!loaded.ok && loaded.errors.kind === 'missing-required') {
    logger.error('❌ Required environment variables are not set')
    logger.error(
      `  DISCORD_WEBHOOK_URL: ${loaded.errors.discordWebhookUrl ? '✅' : '❌'}`
    )
    logger.error(
      `  PERSONAL_ACCESS_TOKEN: ${loaded.errors.personalAccessToken ? '✅' : '❌'}`
    )
    process.exitCode = 1
    return
  }

  if (!process.env.WEBHOOK_SECRET) {
    logger.warn('⚠️ WEBHOOK_SECRET is not set')
  }

  if (!loaded.ok) {
    logger.error('❌ GWB_CHECK_MODE is invalid. Must be BASE_URL or FULL_URL')
    process.exitCode = 1
    return
  }

  const {
    discordWebhookUrl,
    webhookSecret,
    personalAccessToken,
    baseUrl,
    path,
    query,
    url,
    checkMode,
  } = loaded.config

  const maskedUrl = `${baseUrl}${path}${query}`.replace('{url}', () => '***')

  logger.info('🔧 Configuration')
  logger.info(`  DISCORD_WEBHOOK_URL: ${discordWebhookUrl ? '✅' : '❌'}`)
  logger.info(`  WEBHOOK_SECRET: ${webhookSecret ? '✅' : '❌'}`)
  logger.info(`  PERSONAL_ACCESS_TOKEN: ${personalAccessToken ? '✅' : '❌'}`)
  logger.info(`  GWB_BASE_URL: ${baseUrl}`)
  logger.info(`  GWB_PATH: ${path}`)
  logger.info(`  GWB_QUERY: ${query}`)
  logger.info(`  URL: ${maskedUrl}`)
  logger.info(`  GWB_CHECK_MODE: ${checkMode}`)

  const octokit = new Octokit({ auth: personalAccessToken })

  const authenticatedUser = await octokit.rest.users.getAuthenticated()

  logger.info(`👤 Authenticated as ${authenticatedUser.data.login}`)

  const repos = await octokit.paginate(octokit.rest.repos.listForUser, {
    username: authenticatedUser.data.login,
    per_page: 100,
  })

  for (const repo of filterTargetRepositories(repos)) {
    logger.info(`📦 ${repo.full_name}`)

    const hooks = await octokit.paginate(octokit.rest.repos.listWebhooks, {
      owner: repo.owner.login,
      repo: repo.name,
      per_page: 100,
    })

    const plan = planWebhookActions(hooks, { url, baseUrl, checkMode })

    for (const hook of plan.legacyHooks) {
      logger.info(
        `🚮 Remove legacy webhook (hook_id=${hook.id}, origin=${getHookOrigin(hook.config.url)})`
      )
      await octokit.rest.repos.deleteWebhook({
        owner: repo.owner.login,
        repo: repo.name,
        hook_id: hook.id,
      })
    }

    if (plan.alreadyRegistered) {
      logger.info('⏭️ Webhook already exists, skip')
      continue
    }

    for (const hook of plan.staleHooks) {
      logger.info(`🚮 Remove webhook (hook_id=${hook.id})`)
      await octokit.rest.repos.deleteWebhook({
        owner: repo.owner.login,
        repo: repo.name,
        hook_id: hook.id,
      })
    }

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
