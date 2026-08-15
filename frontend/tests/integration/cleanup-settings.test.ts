import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import CleanupSettings from '~/components/CleanupSettings.vue'

// ─── Mock fetch (real composable will call it) ────────────────────────
beforeEach(() => {
  vi.restoreAllMocks()
})

// ─── Integration: Full call chain (mount → click → toast) ──────────────

describe('CleanupSettings — integration: full call chain', () => {
  it('When user clicks Run Cleanup Now then fetch is called and toast shows result', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ removed_count: 3 }) })
    ) as unknown as typeof global.fetch

    const wrapper = mount(CleanupSettings)
    await nextTick()

    const button = wrapper.find('[data-cleanup-action="run"]')
    await button.trigger('click')

    // Allow async to settle (fetch → toast)
    await new Promise(r => setTimeout(r, 100))
    await nextTick()

    // fetch was called with POST /api/cleanup
    expect(global.fetch).toHaveBeenCalledWith('/api/cleanup', { method: 'POST' })

    // Status text updated with result
    const statusText = wrapper.find('[data-cleanup-status]')
    expect(statusText.text()).toContain('Last cleanup: 3 files removed')
  })

  it('When fetch returns 503 then info toast is shown', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 503 })
    ) as unknown as typeof global.fetch

    const wrapper = mount(CleanupSettings)
    await nextTick()

    const button = wrapper.find('[data-cleanup-action="run"]')
    await button.trigger('click')

    await new Promise(r => setTimeout(r, 100))
    await nextTick()

    // Status should still show "No cleanup run yet" (503 doesn't update count)
    const statusText = wrapper.find('[data-cleanup-status]')
    expect(statusText.text()).toContain('No cleanup run yet')
  })

  it('When fetch throws (network error) then error toast is shown', async () => {
    global.fetch = vi.fn(() => Promise.reject(new TypeError('Network error')))

    const wrapper = mount(CleanupSettings)
    await nextTick()

    const button = wrapper.find('[data-cleanup-action="run"]')
    await button.trigger('click')

    await new Promise(r => setTimeout(r, 100))
    await nextTick()

    // Status should still show "No cleanup run yet" (error doesn't update count)
    const statusText = wrapper.find('[data-cleanup-status]')
    expect(statusText.text()).toContain('No cleanup run yet')
  })
})
