import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { usePanelToggle } from '../app/composables/usePanelToggle'

describe('usePanelToggle composable', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth })
  })

  it('returns activePanel as control-deck by default', () => {
    const { activePanel } = usePanelToggle()
    expect(activePanel.value).toBe('control-deck')
  })

  // ─── isMobile Breakpoint Tests ──────────────────────────────────────

  describe('isMobile breakpoint simulation', () => {
    it.each([
      [375, true, 'iPhone SE (mobile)'],
      [414, true, 'iPhone Max (mobile)'],
      [767, true, 'iPad portrait (tablet, below breakpoint)']
    ])('returns isMobile as %p at %dpx', (width, expected) => {
      Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(expected)
    })

    it.each([
      [768, false, 'iPad portrait (at breakpoint)'],
      [1024, false, 'tablet landscape'],
      [1920, false, 'desktop']
    ])('returns isMobile as %p at %dpx', (width, expected) => {
      Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(expected)
    })
  })

  it('returns isMobile as false on desktop (width >= 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    const { isMobile } = usePanelToggle()
    expect(isMobile.value).toBe(false)
  })

  it('returns isMobile as true on mobile (width < 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    const { isMobile } = usePanelToggle()
    expect(isMobile.value).toBe(true)
  })

  it('returns isMobile as false when window is undefined (SSR)', () => {
    const originalWindow = globalThis.window
    // @ts-expect-error - intentionally testing SSR
    delete globalThis.window
    try {
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(false)
    } finally {
      globalThis.window = originalWindow
    }
  })

  // ─── togglePanel Tests ──────────────────────────────────────────────

  describe('togglePanel', () => {
    it('flips state from control-deck to canvas', () => {
      const { activePanel, togglePanel } = usePanelToggle()
      expect(activePanel.value).toBe('control-deck')
      togglePanel()
      expect(activePanel.value).toBe('canvas')
    })

    it('flips state from canvas back to control-deck', () => {
      const { activePanel, togglePanel } = usePanelToggle()
      togglePanel()
      expect(activePanel.value).toBe('canvas')
      togglePanel()
      expect(activePanel.value).toBe('control-deck')
    })

    it('cycles through multiple toggles correctly', () => {
      const { activePanel, togglePanel } = usePanelToggle()
      togglePanel() // → canvas
      togglePanel() // → control-deck
      togglePanel() // → canvas
      expect(activePanel.value).toBe('canvas')
    })
  })

  it('focusFirstInteractiveElement is a function', () => {
    const { focusFirstInteractiveElement } = usePanelToggle()
    expect(typeof focusFirstInteractiveElement).toBe('function')
  })

  it('returns all expected properties', () => {
    const result = usePanelToggle()
    expect(Object.keys(result)).toEqual([
      'activePanel',
      'isMobile',
      'togglePanel',
      'focusFirstInteractiveElement'
    ])
  })
})
