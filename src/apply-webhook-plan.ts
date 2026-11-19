import { getHookOrigin } from './webhook-plan'

interface HookLike {
  id: number
  config: { url?: string }
}

interface HookConfig {
  url: string
  content_type: 'json'
  secret: string | undefined
}

interface Target {
  owner: string
  repo: string
}

/** The GitHub webhook calls used to apply a plan; each takes the same parameters as the Octokit method of the same name. */
export interface WebhookClient {
  updateWebhook(
    params: Target & {
      hook_id: number
      config: HookConfig
      events: string[]
      active: boolean
    }
  ): Promise<unknown>
  createWebhook(
    params: Target & { name: 'web'; config: HookConfig; events: string[] }
  ): Promise<unknown>
  deleteWebhook(params: Target & { hook_id: number }): Promise<unknown>
}

/**
 * Applies a webhook plan to one repository without ever deleting a hook before its replacement exists.
 * An incomplete matching hook is updated in place. Otherwise, the first legacy/stale hook is updated,
 * or a new webhook is created. Old hooks are deleted only after a successful update.
 * When a current webhook is already registered, the legacy hooks are simply deleted.
 * @param client - The GitHub webhook calls
 * @param target - The repository to modify
 * @param plan - The result of `planWebhookActions`
 * @param hookConfig - The webhook URL and secret to register
 * @param logger - Receives progress messages (never URLs or secrets)
 * @throws Whatever the client throws; remaining steps are not attempted after the first failure
 */
export async function applyWebhookPlan(
  client: WebhookClient,
  target: Target,
  plan: {
    legacyHooks: HookLike[]
    staleHooks: HookLike[]
    alreadyRegistered: boolean
    hookToUpdate?: HookLike
  },
  hookConfig: { url: string; secret: string | undefined },
  logger: { info(message: string): void }
): Promise<void> {
  const config: HookConfig = { ...hookConfig, content_type: 'json' }
  const legacyIds = new Set(plan.legacyHooks.map((hook) => hook.id))

  const remove = async (hook: HookLike) => {
    logger.info(
      legacyIds.has(hook.id)
        ? `🚮 Remove legacy webhook (hook_id=${hook.id}, origin=${getHookOrigin(hook.config.url)})`
        : `🚮 Remove webhook (hook_id=${hook.id})`
    )
    await client.deleteWebhook({ ...target, hook_id: hook.id })
  }

  if (plan.alreadyRegistered) {
    for (const hook of plan.legacyHooks) {
      await remove(hook)
    }
    logger.info('⏭️ Webhook already exists, skip')
    return
  }

  const replaceable = [
    ...(plan.hookToUpdate ? [plan.hookToUpdate] : []),
    ...plan.legacyHooks,
    ...plan.staleHooks,
  ]
  if (replaceable.length === 0) {
    await client.createWebhook({
      ...target,
      name: 'web',
      config,
      events: ['*'],
    })
    logger.info('🚀 Webhook created')
    return
  }

  const [first, ...others] = replaceable
  logger.info(`🔄 Update webhook (hook_id=${first.id})`)
  await client.updateWebhook({
    ...target,
    hook_id: first.id,
    config: { ...config, url: plan.hookToUpdate?.config.url ?? config.url },
    events: ['*'],
    active: true,
  })
  logger.info('🔄 Webhook updated')
  for (const hook of others) {
    await remove(hook)
  }
}
