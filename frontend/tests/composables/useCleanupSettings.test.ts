import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useCleanupSettings } from '~/composables/useCleanupSettings'

// ─── Top-level mock (hoisted by Vitest — must not reference test-scoped vars) ─
let mockShowToast: ReturnType<typeof vi.fn>

vi.mock(
  '~/composables/useToast',
  () => ({
    showToast: (
      ...args: Parameters<typeof import('~/composables/useToast').showToast>
    ) => mockShowToast(...args)
  })
)

beforeEach(() => {
  mockShowToast = vi.fn()
  vi.restoreAllMocks()
})

// ─── AC: POST /api/cleanup success path ────────────────────────────────

describe('useCleanupSettings — success path', () => {
  it('When cleanup succeeds then showToast is called with success message including count', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ removed_count: 5 }) })
    ) as unknown as typeof global.fetch

    const { runCleanup, lastRemovedCount } = useCleanupSettings()

    await runCleanup()
    await nextTick()

    expect(mockShowToast).toHaveBeenCalledWith(
      'Cleanup complete: 5 files removed',
      'success'
    )
    expect(lastRemovedCount.value).toBe(5)
  })

  it('When cleanup succeeds with 0 removed then toast shows "0 files removed"', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ removed_count: 0 }) })
    ) as unknown as typeof global.fetch

    const { runCleanup, lastRemovedCount } = useCleanupSettings()

    await runCleanup()
    await nextTick()

    expect(mockShowToast).toHaveBeenCalledWith(
      'Cleanup complete: 0 files removed',
      'success'
    )
    expect(lastRemovedCount.value).toBe(0)
  })
})

// ─── AC: 503 (model loading) path ──────────────────────────────────────

describe('useCleanupSettings — 503 error path', () => {
  it('When POST /api/cleanup returns 503 then info toast is shown', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 503 })
    ) as unknown as typeof global.fetch

    const { runCleanup } = useCleanupSettings()

    await runCleanup()
    await nextTick()

    expect(mockShowToast).toHaveBeenCalledWith(
      'Backend unavailable — cleanup will run next scheduled cycle.',
      'info'
    )
  })
})

// ─── AC: Network error path ────────────────────────────────────────────

describe('useCleanupSettings — network error path', () => {
  it('When fetch throws (network error) then error toast is shown and isLoading resets', async () => {
    global.fetch = vi.fn(() => Promise.reject(new TypeError('Network error')))

    const { runCleanup, isLoading } = useCleanupSettings()

    await runCleanup()
    await nextTick()

    expect(mockShowToast).toHaveBeenCalledWith(
      'Cleanup failed — files will be cleaned by 24h TTL.',
      'error'
    )
    expect(isLoading.value).toBe(false)
  })
})

// ─── AC: Loading state ─────────────────────────────────────────────────

describe('useCleanupSettings — loading state', () => {
  it('When runCleanup is executing then isLoading is true', async () => {
    // Delay the response so we can check loading state mid-call
    let resolveFetch: () => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = () =>
        resolve({ ok: true, json: () => Promise.resolve({ removed_count: 1 }) })
    })
    global.fetch = vi.fn(() => fetchPromise) as unknown as typeof global.fetch

    const { runCleanup, isLoading, lastRemovedCount } = useCleanupSettings()

    // Start the async call but don't await yet
    const promise = runCleanup()

    await nextTick()
    expect(isLoading.value).toBe(true)

    // Resolve the fetch
    resolveFetch!()
    await promise
    await nextTick()

    expect(isLoading.value).toBe(false)
    expect(lastRemovedCount.value).toBe(1)
  })
})
