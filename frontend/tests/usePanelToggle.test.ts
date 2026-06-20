import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { usePanelToggle } from '../app/composables/usePanelToggle'
import { setBreakpoint } from './mocks'

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

  // ─── isMobile Tests ─────────────────────────────────────────────────

  describe('isMobile', () => {
    it('returns true at 375px (mobile)', () => {
      setBreakpoint(375)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(true)
    })

    it('returns true at 414px (mobile)', () => {
      setBreakpoint(414)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(true)
    })

    it('returns true at 767px (just below breakpoint)', () => {
      setBreakpoint(767)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(true)
    })

    it('returns false at 768px (desktop breakpoint)', () => {
      setBreakpoint(768)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(false)
    })

    it('returns false at 1024px (tablet landscape)', () => {
      setBreakpoint(1024)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(false)
    })

    it('returns false at 1920px (desktop)', () => {
      setBreakpoint(1920)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(false)
    })
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

  // ─── isMobile is reactive via useMediaQuery (VueUse) ────────────────

  describe('isMobile (useMediaQuery)', () => {
    it('returns true at 375px (mobile)', () => {
      setBreakpoint(375)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(true)
    })

    it('returns true at 414px (mobile)', () => {
      setBreakpoint(414)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(true)
    })

    it('returns true at 767px (just below breakpoint)', () => {
      setBreakpoint(767)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(true)
    })

    it('returns false at 768px (desktop breakpoint)', () => {
      setBreakpoint(768)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(false)
    })

    it('returns false at 1024px (tablet landscape)', () => {
      setBreakpoint(1024)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(false)
    })

    it('returns false at 1920px (desktop)', () => {
      setBreakpoint(1920)
      const { isMobile } = usePanelToggle()
      expect(isMobile.value).toBe(false)
    })
  })
})
