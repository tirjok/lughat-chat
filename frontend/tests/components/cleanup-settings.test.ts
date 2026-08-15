import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import { mount } from '@vue/test-utils'
import CleanupSettings from '~/components/CleanupSettings.vue'

// ─── Top-level mock (hoisted) ────────────────────────────────────────
let mockRunCleanup: ReturnType<typeof vi.fn>
let mockLastRemovedCount: ReturnType<typeof shallowRef>

vi.mock('~/composables/useCleanupSettings', () => ({
  useCleanupSettings: () => ({
    runCleanup: (...args: Parameters<typeof mockRunCleanup>) => mockRunCleanup(...args),
    isLoading: shallowRef(false),
    lastRemovedCount: mockLastRemovedCount
  })
}))

beforeEach(() => {
  mockRunCleanup = vi.fn(() => Promise.resolve())
  mockLastRemovedCount = shallowRef<number | null>(null)
  vi.restoreAllMocks()
})

// ─── AC: Component renders status ──────────────────────────────────────

describe('CleanupSettings.vue — renders status', () => {
  it('When lastRemovedCount is null then shows "No cleanup run yet"', () => {
    const wrapper = mount(CleanupSettings)
    const statusText = wrapper.find('[data-cleanup-status]')
    expect(statusText.exists()).toBe(true)
    expect(statusText.text()).toContain('No cleanup run yet')
  })

  it('When lastRemovedCount is set then shows "Last cleanup: N files removed"', async () => {
    mockLastRemovedCount.value = 7
    const wrapper = mount(CleanupSettings)
    await nextTick()

    const statusText = wrapper.find('[data-cleanup-status]')
    expect(statusText.exists()).toBe(true)
    expect(statusText.text()).toContain('Last cleanup: 7 files removed')
  })

  it('When lastRemovedCount is 0 then shows "Last cleanup: 0 files removed"', async () => {
    mockLastRemovedCount.value = 0
    const wrapper = mount(CleanupSettings)
    await nextTick()

    const statusText = wrapper.find('[data-cleanup-status]')
    expect(statusText.text()).toContain('Last cleanup: 0 files removed')
  })
})

// ─── AC: Run Cleanup Now button ────────────────────────────────────────

describe('CleanupSettings.vue — Run Cleanup Now button', () => {
  it('Button renders with ph ph-broom icon', () => {
    const wrapper = mount(CleanupSettings)
    const button = wrapper.find('[data-cleanup-action="run"]')
    expect(button.exists()).toBe(true)
  })

  it('When button is clicked then runCleanup is called', async () => {
    const wrapper = mount(CleanupSettings)
    const button = wrapper.find('[data-cleanup-action="run"]')
    await button.trigger('click')
    expect(mockRunCleanup).toHaveBeenCalledTimes(1)
  })
})

// ─── AC: Loading state ─────────────────────────────────────────────────

describe('CleanupSettings.vue — loading state', () => {
  it('When isLoading is true then button shows loading indicator', () => {
    // Mock isLoading as true
    vi.doMock('~/composables/useCleanupSettings', () => ({
      useCleanupSettings: () => ({
        runCleanup: mockRunCleanup,
        isLoading: shallowRef(true),
        lastRemovedCount: shallowRef<number | null>(null)
      })
    }))

    const wrapper = mount(CleanupSettings)
    const button = wrapper.find('[data-cleanup-action="run"]')
    expect(button.exists()).toBe(true)
  })
})

// ─── AC: Dark theme ────────────────────────────────────────────────────

describe('CleanupSettings.vue — dark theme', () => {
  it('Component has dark: variants for all styled elements', () => {
    const wrapper = mount(CleanupSettings)
    const container = wrapper.find('[data-cleanup-container]')
    expect(container.exists()).toBe(true)
    const classes = container.element.className
    expect(classes).toContain('dark:')
  })
})
