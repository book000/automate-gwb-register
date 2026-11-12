const CHECK_MODES = ['BASE_URL', 'FULL_URL'] as const

/** Validated runtime configuration derived from environment variables. */
export interface AppConfig {
  discordWebhookUrl: string
  webhookSecret: string | undefined
  personalAccessToken: string
  baseUrl: string
  path: string
  query: string
  /** The full webhook URL to register. */
  url: string
  checkMode: (typeof CHECK_MODES)[number]
}

/** Why the configuration is unusable. The boolean flags are true when that variable is set and non-empty. */
export type ConfigError =
  | {
      kind: 'missing-required'
      discordWebhookUrl: boolean
      personalAccessToken: boolean
    }
  | { kind: 'invalid-check-mode' }

/**
 * Builds the configuration from environment variables.
 * Checks run in this order: required variables, `GWB_BASE_URL` validity, `GWB_CHECK_MODE`.
 * @param env - The environment variables (normally `process.env`)
 * @returns The configuration, or the first error found
 * @throws {TypeError} If `GWB_BASE_URL` is not a valid URL
 */
export function loadConfig(
  env: NodeJS.ProcessEnv
): { ok: true; config: AppConfig } | { ok: false; errors: ConfigError } {
  const discordWebhookUrl = env.DISCORD_WEBHOOK_URL
  const webhookSecret = env.WEBHOOK_SECRET
  const personalAccessToken = env.PERSONAL_ACCESS_TOKEN
  if (!discordWebhookUrl || !personalAccessToken) {
    return {
      ok: false,
      errors: {
        kind: 'missing-required',
        discordWebhookUrl: Boolean(discordWebhookUrl),
        personalAccessToken: Boolean(personalAccessToken),
      },
    }
  }

  const baseUrl = env.GWB_BASE_URL ?? 'https://gwb.tomacheese.com/'
  const path = env.GWB_PATH ?? ''
  const query = env.GWB_QUERY ?? '?url={url}'

  const url = `${baseUrl}${path}${query}`.replace(
    '{url}',
    () => discordWebhookUrl
  )

  if (!URL.canParse(baseUrl)) {
    throw new TypeError(`GWB_BASE_URL is not a valid URL: "${baseUrl}"`)
  }

  const checkMode = env.GWB_CHECK_MODE ?? 'BASE_URL'
  const validCheckMode = CHECK_MODES.find((mode) => mode === checkMode)
  if (!validCheckMode) {
    return { ok: false, errors: { kind: 'invalid-check-mode' } }
  }

  return {
    ok: true,
    config: {
      discordWebhookUrl,
      webhookSecret,
      personalAccessToken,
      baseUrl,
      path,
      query,
      url,
      checkMode: validCheckMode,
    },
  }
}
