import { describe, expect, it } from 'vitest'
import {
  filterTargetRepositories,
  getHookOrigin,
  planWebhookActions,
} from './webhook-plan'

const BASE_URL = 'https://gwb.tomacheese.com/'
const FULL_URL = `${BASE_URL}?url=https://example.test/hook`
const LEGACY_URL = 'https://github-webhook-bridge.vercel.app/?url=old'

function hook(id: number, url?: string) {
  return { id, config: { url } }
}

describe('getHookOrigin', () => {
  it('returns the origin without a trailing slash', () => {
    expect(getHookOrigin('https://gwb.tomacheese.com/')).toBe(
      'https://gwb.tomacheese.com'
    )
    expect(getHookOrigin('https://gwb.tomacheese.com')).toBe(
      'https://gwb.tomacheese.com'
    )
  })

  it('drops path and query', () => {
    expect(getHookOrigin(FULL_URL)).toBe('https://gwb.tomacheese.com')
  })

  it('returns null for undefined, empty and invalid input', () => {
    expect(getHookOrigin(undefined)).toBeNull()
    expect(getHookOrigin('')).toBeNull()
    expect(getHookOrigin('not-a-url')).toBeNull()
  })
})

describe('planWebhookActions', () => {
  it('creates a webhook when there are no hooks', () => {
    for (const checkMode of ['BASE_URL', 'FULL_URL'] as const) {
      expect(
        planWebhookActions([], { url: FULL_URL, baseUrl: BASE_URL, checkMode })
      ).toEqual({
        legacyHooks: [],
        alreadyRegistered: false,
        staleHooks: [],
        shouldCreate: true,
      })
    }
  })

  it('skips in BASE_URL mode when a hook starts with the base URL', () => {
    const existing = hook(1, `${BASE_URL}?url=https://other.test/hook`)
    expect(
      planWebhookActions([existing], {
        url: FULL_URL,
        baseUrl: BASE_URL,
        checkMode: 'BASE_URL',
      })
    ).toEqual({
      legacyHooks: [],
      alreadyRegistered: true,
      staleHooks: [],
      shouldCreate: false,
    })
  })

  it('does not match in BASE_URL mode when the hook is on another host', () => {
    const other = hook(1, 'https://unrelated.test/hook')
    expect(
      planWebhookActions([other], {
        url: FULL_URL,
        baseUrl: BASE_URL,
        checkMode: 'BASE_URL',
      })
    ).toEqual({
      legacyHooks: [],
      alreadyRegistered: false,
      staleHooks: [],
      shouldCreate: true,
    })
  })

  it('skips in FULL_URL mode on an exact match', () => {
    expect(
      planWebhookActions([hook(1, FULL_URL)], {
        url: FULL_URL,
        baseUrl: BASE_URL,
        checkMode: 'FULL_URL',
      })
    ).toEqual({
      legacyHooks: [],
      alreadyRegistered: true,
      staleHooks: [],
      shouldCreate: false,
    })
  })

  it('treats a different hook under the base URL as stale in FULL_URL mode', () => {
    const stale = hook(1, `${BASE_URL}?url=https://other.test/hook`)
    const unrelated = hook(2, 'https://unrelated.test/hook')
    const result = planWebhookActions([stale, unrelated], {
      url: FULL_URL,
      baseUrl: BASE_URL,
      checkMode: 'FULL_URL',
    })
    expect(result.alreadyRegistered).toBe(false)
    expect(result.shouldCreate).toBe(true)
    expect(result.staleHooks).toEqual([stale])
    expect(result.staleHooks[0]).toBe(stale)
  })

  it('does not delete stale hooks in FULL_URL mode when an exact match exists', () => {
    const stale = hook(1, `${BASE_URL}?url=https://other.test/hook`)
    expect(
      planWebhookActions([stale, hook(2, FULL_URL)], {
        url: FULL_URL,
        baseUrl: BASE_URL,
        checkMode: 'FULL_URL',
      })
    ).toEqual({
      legacyHooks: [],
      alreadyRegistered: true,
      staleHooks: [],
      shouldCreate: false,
    })
  })

  it('never reports stale hooks in BASE_URL mode', () => {
    const existing = hook(1, `${BASE_URL}?url=https://other.test/hook`)
    expect(
      planWebhookActions([existing], {
        url: FULL_URL,
        baseUrl: BASE_URL,
        checkMode: 'BASE_URL',
      }).staleHooks
    ).toEqual([])
  })

  it('lists a legacy hook and still creates in both modes', () => {
    const legacy = hook(1, LEGACY_URL)
    for (const checkMode of ['BASE_URL', 'FULL_URL'] as const) {
      const result = planWebhookActions([legacy], {
        url: FULL_URL,
        baseUrl: BASE_URL,
        checkMode,
      })
      expect(result).toEqual({
        legacyHooks: [legacy],
        alreadyRegistered: false,
        staleHooks: [],
        shouldCreate: true,
      })
      expect(result.legacyHooks[0]).toBe(legacy)
    }
  })

  it('lists a legacy hook and skips creation when a current hook exists', () => {
    const legacy = hook(1, LEGACY_URL)
    const current = hook(2, FULL_URL)
    for (const checkMode of ['BASE_URL', 'FULL_URL'] as const) {
      expect(
        planWebhookActions([legacy, current], {
          url: FULL_URL,
          baseUrl: BASE_URL,
          checkMode,
        })
      ).toEqual({
        legacyHooks: [legacy],
        alreadyRegistered: true,
        staleHooks: [],
        shouldCreate: false,
      })
    }
  })

  it('does not treat the current base origin as legacy', () => {
    const vercelBase = 'https://github-webhook-bridge.vercel.app/'
    const current = hook(1, `${vercelBase}?url=https://example.test/hook`)
    const result = planWebhookActions([current], {
      url: `${vercelBase}?url=https://example.test/hook`,
      baseUrl: vercelBase,
      checkMode: 'BASE_URL',
    })
    expect(result.legacyHooks).toEqual([])
    expect(result.alreadyRegistered).toBe(true)
  })

  it('treats the other known host as legacy when the base URL is the vercel host', () => {
    const vercelBase = 'https://github-webhook-bridge.vercel.app/'
    const legacy = hook(1, 'https://gwb.tomacheese.com/?url=old')
    expect(
      planWebhookActions([legacy], {
        url: `${vercelBase}?url=https://example.test/hook`,
        baseUrl: vercelBase,
        checkMode: 'BASE_URL',
      }).legacyHooks
    ).toEqual([legacy])
  })

  it('compares hosts by origin so a missing trailing slash is still legacy', () => {
    const legacy = hook(1, 'https://github-webhook-bridge.vercel.app')
    expect(
      planWebhookActions([legacy], {
        url: FULL_URL,
        baseUrl: BASE_URL,
        checkMode: 'BASE_URL',
      }).legacyHooks
    ).toEqual([legacy])
  })

  it('ignores hooks with undefined or invalid URLs', () => {
    const hooks = [hook(1, undefined), hook(2, 'not-a-url'), hook(3, '')]
    for (const checkMode of ['BASE_URL', 'FULL_URL'] as const) {
      expect(
        planWebhookActions(hooks, {
          url: FULL_URL,
          baseUrl: BASE_URL,
          checkMode,
        })
      ).toEqual({
        legacyHooks: [],
        alreadyRegistered: false,
        staleHooks: [],
        shouldCreate: true,
      })
    }
  })

  it('preserves input order in the returned arrays', () => {
    const legacyA = hook(3, LEGACY_URL)
    const legacyB = hook(1, `${LEGACY_URL}2`)
    const staleA = hook(5, `${BASE_URL}?url=a`)
    const staleB = hook(2, `${BASE_URL}?url=b`)
    const result = planWebhookActions([legacyA, staleA, legacyB, staleB], {
      url: FULL_URL,
      baseUrl: BASE_URL,
      checkMode: 'FULL_URL',
    })
    expect(result.legacyHooks.map((h) => h.id)).toEqual([3, 1])
    expect(result.staleHooks.map((h) => h.id)).toEqual([5, 2])
  })
})

describe('filterTargetRepositories', () => {
  it('keeps only non-archived, non-fork repositories', () => {
    const active = { name: 'active', archived: false, fork: false }
    const archived = { name: 'archived', archived: true, fork: false }
    const forked = { name: 'forked', archived: false, fork: true }
    const both = { name: 'both', archived: true, fork: true }
    expect(filterTargetRepositories([active, archived, forked, both])).toEqual([
      active,
    ])
  })

  it('excludes repositories whose archived flag is not explicitly false', () => {
    expect(
      filterTargetRepositories([{ name: 'unknown', fork: false }])
    ).toEqual([])
  })
})
