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
        url: 'https://gwb.tomacheese.com/?url=https://example.test/hook',
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
        url: 'https://gwb.example.test/discord?target=https://example.test/hook&x=1',
        checkMode: 'FULL_URL',
      },
    })
  })

  it('inserts the Discord URL literally even if it contains replacement patterns', () => {
    const result = loadConfig({
      ...REQUIRED,
      DISCORD_WEBHOOK_URL: 'https://example.test/a$&b$1c',
    })
    expect(result).toMatchObject({
      ok: true,
      config: {
        url: 'https://gwb.tomacheese.com/?url=https://example.test/a$&b$1c',
      },
    })
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
