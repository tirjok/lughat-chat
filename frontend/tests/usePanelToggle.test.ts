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

  it('toggles activePanel from control-deck to canvas', () => {
    const { activePanel, togglePanel } = usePanelToggle()
    expect(activePanel.value).toBe('control-deck')
    togglePanel()
    expect(activePanel.value).toBe('canvas')
  })

  it('toggles activePanel from canvas back to control-deck', () => {
    const { activePanel, togglePanel } = usePanelToggle()
    togglePanel()
    togglePanel()
    expect(activePanel.value).toBe('control-deck')
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
