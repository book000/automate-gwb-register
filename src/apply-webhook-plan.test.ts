import { describe, expect, it, vi } from 'vitest'
import { applyWebhookPlan } from './apply-webhook-plan'

const TARGET = { owner: 'octo', repo: 'repo' }
const URL_ = 'https://gwb.tomacheese.com/?url=https://example.test/hook'
const HOOK_CONFIG = { url: URL_, secret: 'secret' }
const CONFIG = { url: URL_, content_type: 'json', secret: 'secret' }

function hook(id: number, url?: string) {
  return { id, config: { url } }
}

function setup() {
  const logs: string[] = []
  const client = {
    updateWebhook: vi.fn(() => Promise.resolve()),
    createWebhook: vi.fn(() => Promise.resolve()),
    deleteWebhook: vi.fn(() => Promise.resolve()),
  }
  const logger = {
    info: (message: string) => {
      logs.push(message)
    },
  }
  return { client, logger, logs }
}

const legacy1 = hook(1, 'https://github-webhook-bridge.vercel.app/?url=old')
const stale2 = hook(2, 'https://gwb.tomacheese.com/?url=other')

describe('applyWebhookPlan', () => {
  it('creates a webhook when there are no old hooks', async () => {
    const { client, logger, logs } = setup()
    await applyWebhookPlan(
      client,
      TARGET,
      { legacyHooks: [], staleHooks: [], alreadyRegistered: false },
      HOOK_CONFIG,
      logger
    )
    expect(client.createWebhook).toHaveBeenCalledExactlyOnceWith({
      ...TARGET,
      name: 'web',
      config: CONFIG,
      events: ['*'],
    })
    expect(client.updateWebhook).not.toHaveBeenCalled()
    expect(client.deleteWebhook).not.toHaveBeenCalled()
    expect(logs).toEqual(['🚀 Webhook created'])
  })

  it('keeps old hooks when creation fails', async () => {
    const { client, logger } = setup()
    client.createWebhook.mockRejectedValue(new Error('create failed'))
    await expect(
      applyWebhookPlan(
        client,
        TARGET,
        { legacyHooks: [], staleHooks: [], alreadyRegistered: false },
        HOOK_CONFIG,
        logger
      )
    ).rejects.toThrow('create failed')
    expect(client.deleteWebhook).not.toHaveBeenCalled()
  })

  it('updates a lone legacy hook in place without deleting or creating', async () => {
    const { client, logger, logs } = setup()
    await applyWebhookPlan(
      client,
      TARGET,
      { legacyHooks: [legacy1], staleHooks: [], alreadyRegistered: false },
      HOOK_CONFIG,
      logger
    )
    expect(client.updateWebhook).toHaveBeenCalledExactlyOnceWith({
      ...TARGET,
      hook_id: 1,
      config: CONFIG,
      events: ['*'],
      active: true,
    })
    expect(client.createWebhook).not.toHaveBeenCalled()
    expect(client.deleteWebhook).not.toHaveBeenCalled()
    expect(logs).toEqual([
      '🔄 Update webhook (hook_id=1)',
      '🔄 Webhook updated',
    ])
  })

  it('updates the first legacy hook, then deletes the rest', async () => {
    const { client, logger, logs } = setup()
    await applyWebhookPlan(
      client,
      TARGET,
      {
        legacyHooks: [legacy1],
        staleHooks: [stale2],
        alreadyRegistered: false,
      },
      HOOK_CONFIG,
      logger
    )
    expect(client.updateWebhook).toHaveBeenCalledExactlyOnceWith({
      ...TARGET,
      hook_id: 1,
      config: CONFIG,
      events: ['*'],
      active: true,
    })
    expect(client.deleteWebhook).toHaveBeenCalledExactlyOnceWith({
      ...TARGET,
      hook_id: 2,
    })
    expect(client.updateWebhook.mock.invocationCallOrder[0]).toBeLessThan(
      client.deleteWebhook.mock.invocationCallOrder[0]
    )
    expect(logs).toEqual([
      '🔄 Update webhook (hook_id=1)',
      '🔄 Webhook updated',
      '🚮 Remove webhook (hook_id=2)',
    ])
  })

  it('updates a stale hook when there is no legacy hook', async () => {
    const { client, logger } = setup()
    await applyWebhookPlan(
      client,
      TARGET,
      { legacyHooks: [], staleHooks: [stale2], alreadyRegistered: false },
      HOOK_CONFIG,
      logger
    )
    expect(client.updateWebhook).toHaveBeenCalledOnce()
    expect(client.deleteWebhook).not.toHaveBeenCalled()
  })

  it('repairs a matching hook before removing legacy hooks and preserves its URL', async () => {
    const { client, logger } = setup()
    const current = hook(3, 'https://gwb.tomacheese.com/?url=other')
    await applyWebhookPlan(
      client,
      TARGET,
      {
        legacyHooks: [legacy1],
        staleHooks: [],
        alreadyRegistered: false,
        hookToUpdate: current,
      },
      HOOK_CONFIG,
      logger
    )
    expect(client.updateWebhook).toHaveBeenCalledExactlyOnceWith({
      ...TARGET,
      hook_id: 3,
      config: { ...CONFIG, url: current.config.url },
      events: ['*'],
      active: true,
    })
    expect(client.updateWebhook.mock.invocationCallOrder[0]).toBeLessThan(
      client.deleteWebhook.mock.invocationCallOrder[0]
    )
  })

  it('keeps legacy hooks if repairing a matching hook fails', async () => {
    const { client, logger } = setup()
    client.updateWebhook.mockRejectedValue(new Error('update failed'))
    await expect(
      applyWebhookPlan(
        client,
        TARGET,
        {
          legacyHooks: [legacy1],
          staleHooks: [],
          alreadyRegistered: false,
          hookToUpdate: hook(3, URL_),
        },
        HOOK_CONFIG,
        logger
      )
    ).rejects.toThrow('update failed')
    expect(client.deleteWebhook).not.toHaveBeenCalled()
  })

  it('deletes nothing when the update fails', async () => {
    const { client, logger } = setup()
    client.updateWebhook.mockRejectedValue(new Error('update failed'))
    await expect(
      applyWebhookPlan(
        client,
        TARGET,
        {
          legacyHooks: [legacy1],
          staleHooks: [stale2],
          alreadyRegistered: false,
        },
        HOOK_CONFIG,
        logger
      )
    ).rejects.toThrow('update failed')
    expect(client.deleteWebhook).not.toHaveBeenCalled()
    expect(client.createWebhook).not.toHaveBeenCalled()
  })

  it('stops after the first failed delete', async () => {
    const { client, logger } = setup()
    client.deleteWebhook.mockRejectedValue(new Error('delete failed'))
    await expect(
      applyWebhookPlan(
        client,
        TARGET,
        {
          legacyHooks: [legacy1],
          staleHooks: [stale2, hook(3, 'https://gwb.tomacheese.com/?url=x')],
          alreadyRegistered: false,
        },
        HOOK_CONFIG,
        logger
      )
    ).rejects.toThrow('delete failed')
    expect(client.deleteWebhook).toHaveBeenCalledOnce()
  })

  it('only deletes legacy hooks when a current webhook already exists', async () => {
    const { client, logger, logs } = setup()
    await applyWebhookPlan(
      client,
      TARGET,
      { legacyHooks: [legacy1], staleHooks: [], alreadyRegistered: true },
      HOOK_CONFIG,
      logger
    )
    expect(client.deleteWebhook).toHaveBeenCalledExactlyOnceWith({
      ...TARGET,
      hook_id: 1,
    })
    expect(client.updateWebhook).not.toHaveBeenCalled()
    expect(client.createWebhook).not.toHaveBeenCalled()
    expect(logs).toEqual([
      '🚮 Remove legacy webhook (hook_id=1, origin=https://github-webhook-bridge.vercel.app)',
      '⏭️ Webhook already exists, skip',
    ])
  })

  it('rejects without logging the skip when deleting a legacy hook fails', async () => {
    const { client, logger, logs } = setup()
    client.deleteWebhook.mockRejectedValue(new Error('delete failed'))
    await expect(
      applyWebhookPlan(
        client,
        TARGET,
        { legacyHooks: [legacy1], staleHooks: [], alreadyRegistered: true },
        HOOK_CONFIG,
        logger
      )
    ).rejects.toThrow('delete failed')
    expect(logs).not.toContain('⏭️ Webhook already exists, skip')
  })

  it('passes an undefined secret through unchanged', async () => {
    const { client, logger } = setup()
    await applyWebhookPlan(
      client,
      TARGET,
      { legacyHooks: [legacy1], staleHooks: [], alreadyRegistered: false },
      { url: URL_, secret: undefined },
      logger
    )
    expect(client.updateWebhook).toHaveBeenCalledExactlyOnceWith({
      ...TARGET,
      hook_id: 1,
      config: { url: URL_, content_type: 'json', secret: undefined },
      events: ['*'],
      active: true,
    })
  })
})
