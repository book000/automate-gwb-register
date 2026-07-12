import { Octokit } from '@octokit/rest'
import { Logger } from '@book000/node-utils'

/** 既知の GitHub Webhook Bridge ホスティング先 URL 一覧（レガシー Webhook 移行検出用） */
const KNOWN_GWB_BASE_URLS = [
  'https://github-webhook-bridge.vercel.app/',
  'https://gwb.tomacheese.com/',
]

/**
 * Webhook の URL からオリジン (scheme + host) を取得する。
 * 末尾スラッシュの有無等の表記ゆれに影響されず、ホストの同一性を判定するために使用する。
 * @param hookUrl - Webhook の config.url (未設定の場合もある)
 * @returns オリジン文字列。URL として不正、または未設定の場合は null
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

  // environment variables
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

  // URLの比較モード (ベースURL一致、または完全一致)
  const checkMode = process.env.GWB_CHECK_MODE ?? 'BASE_URL'
  if (!['BASE_URL', 'FULL_URL'].includes(checkMode)) {
    logger.error('❌ GWB_CHECK_MODE is invalid. Must be BASE_URL or FULL_URL')
    process.exitCode = 1
    return
  }

  // 設定情報の表示
  logger.info('🔧 Configuration')
  logger.info(`  DISCORD_WEBHOOK_URL: ${discordWebhookUrl}`)
  logger.info(`  WEBHOOK_SECRET: ${webhookSecret}`)
  logger.info(`  PERSONAL_ACCESS_TOKEN: ${personalAccessToken}`)
  logger.info(`  GWB_BASE_URL: ${baseUrl}`)
  logger.info(`  GWB_PATH: ${path}`)
  logger.info(`  GWB_QUERY: ${query}`)
  logger.info(`  URL: ${url}`)
  logger.info(`  GWB_CHECK_MODE: ${checkMode}`)

  const octokit = new Octokit({ auth: personalAccessToken })

  const authenticatedUser = await octokit.rest.users.getAuthenticated()

  logger.info(`👤 Authenticated as ${authenticatedUser.data.login}`)

  const repos = await octokit.paginate(octokit.rest.repos.listForUser, {
    username: authenticatedUser.data.login,
    per_page: 100,
  })

  // アーカイブとフォークを除外 (オリジナルのリポジトリのみ)
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

    // 既知の旧ホスト URL に一致し、現在の baseUrl とは異なる Webhook をレガシーとみなし削除する
    // (GWB_CHECK_MODE の値に関わらず常に実行する)
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
        `🚮 Remove legacy webhook (hook_id=${hook.id}, url=${hook.config.url})`
      )
      await octokit.rest.repos.deleteWebhook({
        owner: repo.owner.login,
        repo: repo.name,
        hook_id: hook.id,
      })
    }

    // レガシー Webhook を除いた残りの一覧で、以降の判定・削除処理を行う
    const legacyHookIds = new Set(legacyHooks.map((hook) => hook.id))
    const remainingHooks = hooks.filter((hook) => !legacyHookIds.has(hook.id))

    const filteredHooks = remainingHooks.filter((hook) =>
      checkMode === 'FULL_URL'
        ? hook.config.url === url
        : hook.config.url?.startsWith(baseUrl)
    )
    if (filteredHooks.length > 0) {
      // already exists, skip
      logger.info('⏭️ Webhook already exists, skip')
      continue
    }

    // FULL_URL モードの場合、BASE_URL で始まる Webhook を削除
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
