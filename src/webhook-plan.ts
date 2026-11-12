/** Known GitHub Webhook Bridge host URLs, used to detect legacy webhooks for migration. */
export const KNOWN_GWB_BASE_URLS = [
  'https://github-webhook-bridge.vercel.app/',
  'https://gwb.tomacheese.com/',
]

/** A webhook as returned by the GitHub API, reduced to the fields used for planning. */
interface HookLike {
  id: number
  config: { url?: string }
}

/**
 * Returns the origin (scheme + host) of a webhook URL.
 * Used to compare hosts regardless of trailing slashes and similar notation differences.
 * @param hookUrl - The webhook's config.url (may be unset)
 * @returns The origin string, or null if the URL is unset or invalid
 */
export function getHookOrigin(hookUrl: string | undefined): string | null {
  if (!hookUrl) {
    return null
  }
  try {
    return new URL(hookUrl).origin
  } catch {
    return null
  }
}

/**
 * Keeps only the repositories that webhooks may be registered on.
 * @param repos - Repositories as returned by the GitHub API
 * @returns The repositories that are explicitly not archived, not forks, and administrable by the token's user (managing webhooks requires admin permission)
 */
export function filterTargetRepositories<
  R extends {
    archived?: boolean
    fork?: boolean
    permissions?: { admin?: boolean }
  },
>(repos: R[]): R[] {
  return repos.filter(
    (repo) =>
      repo.archived === false && !repo.fork && repo.permissions?.admin === true
  )
}

/**
 * Decides which webhooks of one repository to delete and whether to create one.
 * Legacy hooks are always deleted; stale hooks are only reported in FULL_URL mode
 * when no exact match exists. The returned arrays hold the input objects in input order.
 * @param hooks - The repository's existing webhooks
 * @param options - `url` is the full webhook URL, `baseUrl` the GWB base URL
 * @returns The hooks to delete and whether a new webhook must be created
 * @throws {TypeError} If `options.baseUrl` is not a valid URL
 */
export function planWebhookActions<T extends HookLike>(
  hooks: T[],
  options: { url: string; baseUrl: string; checkMode: 'BASE_URL' | 'FULL_URL' }
): {
  legacyHooks: T[]
  alreadyRegistered: boolean
  staleHooks: T[]
  shouldCreate: boolean
} {
  const { url, baseUrl, checkMode } = options
  const baseUrlOrigin = new URL(baseUrl).origin
  const knownOrigins = new Set(
    KNOWN_GWB_BASE_URLS.map((knownBaseUrl) => new URL(knownBaseUrl).origin)
  )

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

  // The checks below use only the hooks that were not removed as legacy
  const legacyHookIds = new Set(legacyHooks.map((hook) => hook.id))
  const remainingHooks = hooks.filter((hook) => !legacyHookIds.has(hook.id))

  const alreadyRegistered = remainingHooks.some((hook) =>
    checkMode === 'FULL_URL'
      ? hook.config.url === url
      : hook.config.url?.startsWith(baseUrl)
  )

  const staleHooks =
    checkMode === 'FULL_URL' && !alreadyRegistered
      ? remainingHooks.filter(
          (hook) =>
            hook.config.url?.startsWith(baseUrl) && hook.config.url !== url
        )
      : []

  return {
    legacyHooks,
    alreadyRegistered,
    staleHooks,
    shouldCreate: !alreadyRegistered,
  }
}
