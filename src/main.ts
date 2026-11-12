import { Octokit } from '@octokit/rest'
import { Logger } from '@book000/node-utils'

/** Known GitHub Webhook Bridge host URLs, used to detect legacy webhooks for migration. */
const KNOWN_GWB_BASE_URLS = [
  'https://github-webhook-bridge.vercel.app/',
  'https://gwb.tomacheese.com/',
]

/**
 * Returns the origin (scheme + host) of a webhook URL.
 * Used to compare hosts regardless of trailing slashes and similar notation differences.
 * @param hookUrl - The webhook's config.url (may be unset)
 * @returns The origin string, or null if the URL is unset or invalid
 */
function getHookOrigin(hookUrl: string | undefined): string | null {
  if (!hookUrl) {
    return null
  }
  try {
    return new URL(hookUrl).origin
  } catch {
    return null
  }
}

async function main() {
  const logger = Logger.configure('main')

  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
  const webhookSecret = process.env.WEBHOOK_SECRET
  const personalAccessToken = process.env.PERSONAL_ACCESS_TOKEN
  if (!discordWebhookUrl || !personalAccessToken) {
    logger.error('❌ Required environment variables are not set')
    logger.error(`  DISCORD_WEBHOOK_URL: ${discordWebhookUrl ? '✅' : '❌'}`)
    logger.error(
      `  PERSONAL_ACCESS_TOKEN: ${personalAccessToken ? '✅' : '❌'}`
    )
    process.exitCode = 1
    return
  }

  if (!webhookSecret) {
    logger.warn('⚠️ WEBHOOK_SECRET is not set')
  }

  const baseUrl = process.env.GWB_BASE_URL ?? 'https://gwb.tomacheese.com/'
  const path = process.env.GWB_PATH ?? ''
  const query = process.env.GWB_QUERY ?? '?url={url}'

  const url = `${baseUrl}${path}${query}`.replace(
    '{url}',
    () => discordWebhookUrl
  )

  const baseUrlOrigin = new URL(baseUrl).origin
  const knownOrigins = new Set(
    KNOWN_GWB_BASE_URLS.map((knownBaseUrl) => new URL(knownBaseUrl).origin)
  )

  const checkMode = process.env.GWB_CHECK_MODE ?? 'BASE_URL'
  if (!['BASE_URL', 'FULL_URL'].includes(checkMode)) {
    logger.error('❌ GWB_CHECK_MODE is invalid. Must be BASE_URL or FULL_URL')
    process.exitCode = 1
    return
  }

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

  const filteredRepos = repos.filter(
    (repo) => repo.archived === false && !repo.fork
  )

  for (const repo of filteredRepos) {
    logger.info(`📦 ${repo.full_name}`)

    const hooks = await octokit.paginate(octokit.rest.repos.listWebhooks, {
      owner: repo.owner.login,
      repo: repo.name,
      per_page: 100,
    })

    // A webhook on a known host other than the current baseUrl is legacy and is always deleted,
    // regardless of GWB_CHECK_MODE.
    const legacyHooks = hooks.filter((hook) => {
      const hookOrigin = getHookOrigin(hook.config.url)
      return (
        hookOrigin !== null &&
        knownOrigins.has(hookOrigin) &&
        hookOrigin !== baseUrlOrigin
      )
    })
    for (const hook of legacyHooks) {
      logger.info(
        `🚮 Remove legacy webhook (hook_id=${hook.id}, origin=${getHookOrigin(hook.config.url)})`
      )
      await octokit.rest.repos.deleteWebhook({
        owner: repo.owner.login,
        repo: repo.name,
        hook_id: hook.id,
      })
    }

    // The checks below use only the hooks that were not removed as legacy
    const legacyHookIds = new Set(legacyHooks.map((hook) => hook.id))
    const remainingHooks = hooks.filter((hook) => !legacyHookIds.has(hook.id))

    const filteredHooks = remainingHooks.filter((hook) =>
      checkMode === 'FULL_URL'
        ? hook.config.url === url
        : hook.config.url?.startsWith(baseUrl)
    )
    if (filteredHooks.length > 0) {
      logger.info('⏭️ Webhook already exists, skip')
      continue
    }

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
