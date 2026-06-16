import { describe, it, expect } from 'vitest'
import { usePanelToggle } from '../app/composables/usePanelToggle'

describe('usePanelToggle composable', () => {
  it('returns activePanel as control-deck by default', () => {
    const { activePanel } = usePanelToggle()
    expect(activePanel.value).toBe('control-deck')
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
      'togglePanel',
      'focusFirstInteractiveElement'
    ])
  })
})
