import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSidebar } from '../app/composables/useSidebar'

// Mock useMediaQuery — the test env's matchMedia mock is too simple
// for VueUse's useMediaQuery which needs addEventListener/removeEventListener.
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useMediaQuery: vi.fn(() => ({ value: false }) as ReturnType<typeof import('@vueuse/core').useMediaQuery>)
  }
})

describe('useSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with isOpen = false', () => {
      const { isOpen } = useSidebar()
      expect(isOpen.value).toBe(false)
    })
  })

  describe('toggle', () => {
    it('opens sidebar when closed', () => {
      const { isOpen, toggle } = useSidebar()
      expect(isOpen.value).toBe(false)
      toggle()
      expect(isOpen.value).toBe(true)
    })

    it('closes sidebar when open', () => {
      const { isOpen, toggle } = useSidebar()
      toggle() // open
      expect(isOpen.value).toBe(true)
      toggle() // close
      expect(isOpen.value).toBe(false)
    })
  })

  describe('close', () => {
    it('sets isOpen to false', () => {
      const { isOpen, close, toggle } = useSidebar()
      toggle() // open
      close()
      expect(isOpen.value).toBe(false)
    })
  })

  describe('open', () => {
    it('sets isOpen to true', () => {
      const { isOpen, open } = useSidebar()
      open()
      expect(isOpen.value).toBe(true)
    })
  })

  describe('isMobile', () => {
    it('returns a ref (boolean)', () => {
      const { isMobile } = useSidebar()
      expect(typeof isMobile.value).toBe('boolean')
    })
  })

  describe('sidebarWidth', () => {
    it('returns a computed string (width)', () => {
      const { sidebarWidth } = useSidebar()
      expect(typeof sidebarWidth.value).toBe('string')
    })
  })
})
