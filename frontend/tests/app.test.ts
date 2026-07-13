import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent } from 'vue'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import App from '../app/app.vue'

// ─── File-level mocks (required by mockNuxtImport macro) ────────────
// mockNuxtImport is a macro that gets transpiled to vi.mock(), which is
// hoisted. We use vi.hoisted() to create mock factories that can be
// referenced inside the macro without hoisting conflicts.

const { useHeadMock, useSeoMetaMock, useToastMock } = vi.hoisted(() => ({
  useHeadMock: vi.fn(),
  useSeoMetaMock: vi.fn(),
  useToastMock: vi.fn(() => ({
    message: ref(''),
    visible: ref(false),
    showToast: vi.fn()
  }))
}))

// Wire the macros at describe-block level (transpiled before Nuxt starts).
mockNuxtImport('useHead', () => useHeadMock)
mockNuxtImport('useSeoMeta', () => useSeoMetaMock)
mockNuxtImport('useToast', () => useToastMock)

// Mock NuxtPage so mountSuspended can render the app shell.
mockComponent('NuxtPage', defineComponent({ template: '<div />' }))

describe('app.vue — dark theme meta tags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls useHead with viewport and favicon meta tags', async () => {
    await mountSuspended(App)

    expect(useHeadMock).toHaveBeenCalledTimes(1)
    const callArgs = useHeadMock.mock.calls[0][0]
    expect(callArgs.meta).toContainEqual(
      expect.objectContaining({ name: 'viewport' })
    )
    expect(callArgs.link).toContainEqual(
      expect.objectContaining({ rel: 'icon', href: '/favicon.ico' })
    )
  })

  it('does NOT render ToastNotification (rendered in index.vue instead)', async () => {
    const wrapper = await mountSuspended(App)

    // ToastNotification is no longer in app.vue (Phase 1: removed duplicate)
    // It is rendered inside index.vue's page content
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(false)
  })
})
