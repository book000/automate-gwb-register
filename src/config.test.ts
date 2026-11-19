import { describe, expect, it } from 'vitest'
import { loadConfig } from './config'

const REQUIRED = {
  DISCORD_WEBHOOK_URL: 'https://example.test/hook',
  PERSONAL_ACCESS_TOKEN: 'dummy-token',
}

describe('loadConfig', () => {
  it('applies the defaults and builds the URL', () => {
    expect(loadConfig(REQUIRED)).toEqual({
      ok: true,
      config: {
        discordWebhookUrl: 'https://example.test/hook',
        webhookSecret: undefined,
        personalAccessToken: 'dummy-token',
        baseUrl: 'https://gwb.tomacheese.com/',
        path: '',
        query: '?url={url}',
        url: 'https://gwb.tomacheese.com/?url=https%3A%2F%2Fexample.test%2Fhook',
        checkMode: 'BASE_URL',
      },
    })
  })

  it('uses the provided optional variables', () => {
    expect(
      loadConfig({
        ...REQUIRED,
        WEBHOOK_SECRET: 'secret',
        GWB_BASE_URL: 'https://gwb.example.test/',
        GWB_PATH: 'discord',
        GWB_QUERY: '?target={url}&x=1',
        GWB_CHECK_MODE: 'FULL_URL',
      })
    ).toEqual({
      ok: true,
      config: {
        discordWebhookUrl: 'https://example.test/hook',
        webhookSecret: 'secret',
        personalAccessToken: 'dummy-token',
        baseUrl: 'https://gwb.example.test/',
        path: 'discord',
        query: '?target={url}&x=1',
        url: 'https://gwb.example.test/discord?target=https%3A%2F%2Fexample.test%2Fhook&x=1',
        checkMode: 'FULL_URL',
      },
    })
  })

  it('inserts the Discord URL literally even if it contains replacement patterns', () => {
    const result = loadConfig({
      ...REQUIRED,
      DISCORD_WEBHOOK_URL: 'https://example.test/a$&b$1c',
    })
    if (!result.ok) {
      throw new Error('expected a valid configuration')
    }
    expect(result.config.url).toBe(
      'https://gwb.tomacheese.com/?url=https%3A%2F%2Fexample.test%2Fa%24%26b%241c'
    )
    expect(new URL(result.config.url).searchParams.get('url')).toBe(
      'https://example.test/a$&b$1c'
    )
  })

  it('percent-encodes a Discord URL that has its own query string', () => {
    const discordUrl =
      'https://discord.com/api/webhooks/1/x?wait=true&thread_id=42'
    const result = loadConfig({
      ...REQUIRED,
      DISCORD_WEBHOOK_URL: discordUrl,
    })
    expect(result).toMatchObject({
      ok: true,
      config: {
        discordWebhookUrl: discordUrl,
        url: 'https://gwb.tomacheese.com/?url=https%3A%2F%2Fdiscord.com%2Fapi%2Fwebhooks%2F1%2Fx%3Fwait%3Dtrue%26thread_id%3D42',
      },
    })
    if (!result.ok) {
      throw new Error('expected a valid configuration')
    }
    expect(new URL(result.config.url).searchParams.get('url')).toBe(discordUrl)
  })

  it.each([
    ['the default query', undefined, 'url'],
    ['a custom query', '?target={url}&x=1', 'target'],
  ])('round-trips special characters with %s', (_name, query, key) => {
    const discordUrl = 'https://discord.com/api/webhooks/1/x?a=b&c=d#frag%20+e'
    const result = loadConfig({
      ...REQUIRED,
      DISCORD_WEBHOOK_URL: discordUrl,
      GWB_QUERY: query,
    })
    if (!result.ok) {
      throw new Error('expected a valid configuration')
    }
    const params = new URL(result.config.url).searchParams
    expect(params.get(key)).toBe(discordUrl)
    if (query) {
      expect(params.get('x')).toBe('1')
    }
  })

  it('reports which required variables are missing', () => {
    expect(loadConfig({})).toEqual({
      ok: false,
      errors: {
        kind: 'missing-required',
        discordWebhookUrl: false,
        personalAccessToken: false,
      },
    })
    expect(
      loadConfig({ DISCORD_WEBHOOK_URL: 'https://example.test/hook' })
    ).toEqual({
      ok: false,
      errors: {
        kind: 'missing-required',
        discordWebhookUrl: true,
        personalAccessToken: false,
      },
    })
    expect(loadConfig({ PERSONAL_ACCESS_TOKEN: 'dummy-token' })).toEqual({
      ok: false,
      errors: {
        kind: 'missing-required',
        discordWebhookUrl: false,
        personalAccessToken: true,
      },
    })
  })

  it('treats empty required variables as missing', () => {
    expect(
      loadConfig({ DISCORD_WEBHOOK_URL: '', PERSONAL_ACCESS_TOKEN: '' })
    ).toEqual({
      ok: false,
      errors: {
        kind: 'missing-required',
        discordWebhookUrl: false,
        personalAccessToken: false,
      },
    })
  })

  it('rejects an invalid GWB_CHECK_MODE', () => {
    expect(loadConfig({ ...REQUIRED, GWB_CHECK_MODE: 'INVALID' })).toEqual({
      ok: false,
      errors: { kind: 'invalid-check-mode' },
    })
  })

  it('keeps empty optional variables as they are', () => {
    expect(
      loadConfig({
        ...REQUIRED,
        GWB_PATH: '',
        GWB_QUERY: '',
        WEBHOOK_SECRET: '',
      })
    ).toMatchObject({
      ok: true,
      config: {
        path: '',
        query: '',
        webhookSecret: '',
        url: 'https://gwb.tomacheese.com/',
      },
    })
  })

  it('throws a TypeError for an invalid GWB_BASE_URL', () => {
    expect(() =>
      loadConfig({ ...REQUIRED, GWB_BASE_URL: 'not-a-url' })
    ).toThrow(TypeError)
    expect(() => loadConfig({ ...REQUIRED, GWB_BASE_URL: '' })).toThrow(
      TypeError
    )
  })

  it('throws a masked TypeError when the combined webhook URL is invalid', () => {
    const env = {
      ...REQUIRED,
      GWB_BASE_URL: 'https://example.test',
      GWB_PATH: ':99999',
    }
    expect(() => loadConfig(env)).toThrow(
      new TypeError(
        'Webhook URL built from GWB_BASE_URL, GWB_PATH and GWB_QUERY is not a valid URL: "https://example.test:99999?url=***"'
      )
    )
  })

  it('reports an invalid combined webhook URL before an invalid GWB_CHECK_MODE', () => {
    expect(() =>
      loadConfig({
        ...REQUIRED,
        GWB_BASE_URL: 'https://example.test',
        GWB_PATH: ':99999',
        GWB_CHECK_MODE: 'INVALID',
      })
    ).toThrow(/is not a valid URL: "https:\/\/example\.test:99999\?url=\*\*\*"/)
  })

  it('returns missing-required without throwing even if the combined URL would be invalid', () => {
    expect(
      loadConfig({ GWB_BASE_URL: 'https://example.test', GWB_PATH: ':99999' })
    ).toEqual({
      ok: false,
      errors: {
        kind: 'missing-required',
        discordWebhookUrl: false,
        personalAccessToken: false,
      },
    })
  })

  it('reports an invalid GWB_BASE_URL before an invalid GWB_CHECK_MODE', () => {
    expect(() =>
      loadConfig({
        ...REQUIRED,
        GWB_BASE_URL: 'not-a-url',
        GWB_CHECK_MODE: 'INVALID',
      })
    ).toThrow(TypeError)
  })
})
