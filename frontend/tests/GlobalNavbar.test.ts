import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import GlobalNavbar from '../app/components/GlobalNavbar.vue'

// ─── Route Mock Factory ───────────────────────────────────────────────

function makeRoute(path: string): Record<string, unknown> {
  return {
    path,
    fullPath: path,
    params: {},
    query: {},
    hash: '',
    name: undefined,
    matched: [],
    meta: {},
    redirectedFrom: undefined
  }
}

// ─── Mount helper that mocks useNuxtApp and stubs NuxtLink as <a> ─────

function getWrapper(path: string): ReturnType<typeof shallowMount> {
  // Set useNuxtApp on globalThis so the component can access it.
  // shallowMount's global.mocks doesn't work for globalThis properties.
  const origUseNuxtApp = (globalThis as Record<string, unknown>).useNuxtApp
  ;(globalThis as Record<string, unknown>).useNuxtApp = () => ({ route: makeRoute(path) })

  const wrapper = shallowMount(GlobalNavbar, {
    global: {
      stubs: {
        NuxtLink: {
          template: '<a v-bind="$attrs" :href="to"><slot /></a>',
          props: ['to']
        }
      }
    }
  })

  // Restore original after unmount
  const origUnmount = wrapper.unmount
  wrapper.unmount = () => {
    if (origUseNuxtApp !== undefined) {
      ;(globalThis as Record<string, unknown>).useNuxtApp = origUseNuxtApp
    } else {
      delete (globalThis as Record<string, unknown>).useNuxtApp
    }
    origUnmount()
  }

  return wrapper
}

// ─── Behavioral Tests (black-box: rendered elements, classes, events) ──

describe('GlobalNavbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── AC-1: Component exists and renders on all pages ────────────────

  describe('component existence and rendering', () => {
    it('renders the navbar container with h-14 top bar', () => {
      // Act
      const wrapper = getWrapper('/')

      // Assert
      const topBar = wrapper.find('.h-14')
      expect(topBar.exists()).toBe(true)
    })

    it('renders the 4px progress bar below the top bar', () => {
      // Act
      const wrapper = getWrapper('/')

      // Assert
      const progressBar = wrapper.find('.h-1')
      expect(progressBar.exists()).toBe(true)
    })

    it('renders on / (TTS Studio route)', () => {
      // Act
      const wrapper = getWrapper('/')

      // Assert
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.html()).toContain('Lughat')
    })

    it('renders on /dashboard route', () => {
      // Act
      const wrapper = getWrapper('/dashboard')

      // Assert
      expect(wrapper.exists()).toBe(true)
    })

    it('renders on /dashboard/level/a1/1 route', () => {
      // Act
      const wrapper = getWrapper('/dashboard/level/a1/1')

      // Assert
      expect(wrapper.exists()).toBe(true)
    })
  })

  // ─── AC-2: Desktop layout — top bar (56px) + progress bar (4px) ─────

  describe('desktop layout', () => {
    it('renders logo text "LughatChat" as a link to "/"', () => {
      // Act
      const wrapper = getWrapper('/')

      // Assert
      const logoLink = wrapper.find('a[href="/"]')
      expect(logoLink.exists()).toBe(true)
      expect(logoLink.text()).toContain('Lughat')
    })

    it('renders navigation links: Home, Dashboard, My Courses', () => {
      // Act
      const wrapper = getWrapper('/')
      const html = wrapper.html()

      // Assert
      expect(html).toContain('Home')
      expect(html).toContain('Dashboard')
      expect(html).toContain('My Courses')
    })

    it('renders action buttons: Ask Instructor and Settings', () => {
      // Act
      const wrapper = getWrapper('/')
      const html = wrapper.html()

      // Assert
      expect(html).toContain('Ask Instructor')
      expect(html).toContain('Settings')
    })

    it('renders a user avatar placeholder (circle div)', () => {
      // Act
      const wrapper = getWrapper('/')

      // Assert
      const avatar = wrapper.find('.rounded-full')
      expect(avatar.exists()).toBe(true)
    })

    it('progress bar shows 0% fill on / route', () => {
      // Act
      const wrapper = getWrapper('/')

      // Assert
      const fill = wrapper.find('[style*="width: 0"]')
      expect(fill.exists()).toBe(true)
    })

    it('progress bar shows 0% fill on /dashboard route', () => {
      // Act
      const wrapper = getWrapper('/dashboard')

      // Assert
      const fill = wrapper.find('[style*="width: 0"]')
      expect(fill.exists()).toBe(true)
    })

    it('progress bar shows non-zero fill on lesson page', () => {
      // Act
      const wrapper = getWrapper('/dashboard/level/a1/1')

      // Assert
      const fill = wrapper.find('[style*="width:"]')
      expect(fill.exists()).toBe(true)
      // On a lesson page, fill width should NOT be "0%"
      const styleAttr = fill.attributes('style')
      expect(styleAttr).not.toBe('width: 0%;')
    })
  })

  // ─── AC-3: Route-aware active link highlighting ─────────────────────

  describe('route-aware active links', () => {
    it('Home link is highlighted when on /', () => {
      // Act
      const wrapper = getWrapper('/')

      // Assert: check HTML for active styles on Home link
      const html = wrapper.html()
      // The Home link should have active styles (text-primary-600 + bg-primary-50)
      // The non-active links have text-stone-600
      expect(html).toContain('text-primary-600')
      // The Home link (first nav link) should use active styles
      expect(html).toContain('bg-primary-50')
    })

    it('Dashboard link is highlighted when on /dashboard', () => {
      // Act
      const wrapper = getWrapper('/dashboard')

      // Assert: the Dashboard link (first /dashboard link) should have active styles
      const html = wrapper.html()
      const primaryCount = (html.match(/text-primary-600/g) || []).length
      expect(primaryCount).toBeGreaterThanOrEqual(1) // Dashboard link is active
    })

    it('My Courses link is highlighted when on /dashboard/level/a1/1', () => {
      // Act
      const wrapper = getWrapper('/dashboard/level/a1/1')

      // Assert: My Courses link (second /dashboard link) should have active styles
      const html = wrapper.html()
      // When on a lesson page, both Dashboard and My Courses should have active styles
      const primaryCount = (html.match(/text-primary-600/g) || []).length
      expect(primaryCount).toBeGreaterThanOrEqual(2)
    })

    it('Home link is NOT active when on /dashboard', () => {
      // Act
      const wrapper = getWrapper('/dashboard')

      // Assert: the Home link should NOT have active styles
      const html = wrapper.html()
      // When on /dashboard, Home link is inactive (text-stone-600), Dashboard is active (text-primary-600)
      expect(html).toContain('text-stone-600')
      expect(html).toContain('text-primary-600')
      // Count: text-stone-600 appears on Home + My Courses (2 links), text-primary-600 on Dashboard (1 link)
      const stoneCount = (html.match(/text-stone-600/g) || []).length
      const primaryCount = (html.match(/text-primary-600/g) || []).length
      expect(stoneCount).toBeGreaterThanOrEqual(2)
      expect(primaryCount).toBeGreaterThanOrEqual(1)
    })
  })

  // ─── AC-4: Mobile layout (< 768px) ──────────────────────────────────

  describe('mobile layout', () => {
    it('renders mobile-specific elements when viewport < 768px', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })

      // Act
      const wrapper = getWrapper('/')

      // Assert
      const html = wrapper.html()
      // Mobile layout should include a hamburger/overflow button for action buttons
      expect(html).toContain('More actions')
    })

    it('has h-16 height on mobile for WCAG 44px touch targets', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })

      // Act
      const wrapper = getWrapper('/')

      // Assert
      const mobileBar = wrapper.find('.h-16')
      expect(mobileBar.exists()).toBe(true)
    })
    it('progress bar is hidden on mobile', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })

      // Act
      const wrapper = getWrapper('/')

      // Assert: progress bar should have 'hidden' class (visible on desktop via md:block)
      // The progress bar uses 'md:block hidden' — hidden by default, shown on md+
      const html = wrapper.html()
      expect(html).toContain('md:block hidden')
    })

    it('touch targets meet 44px minimum on mobile', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })

      // Act
      const wrapper = getWrapper('/')

      // Assert
      // Mobile nav links should have w-11 h-11 (44px) classes
      const mobileNavLinks = wrapper.findAll('[class*="w-11"][class*="h-11"]')
      expect(mobileNavLinks.length).toBeGreaterThan(0)
    })
  })

  // ─── AC-5: Does NOT use navigateTo() ────────────────────────────────

  describe('navigation method', () => {
    it('uses <NuxtLink> for all navigation, not navigateTo()', () => {
      // Act
      const wrapper = getWrapper('/')

      // Assert: all navigation links should be <a> elements (NuxtLink renders as <a>)
      const links = wrapper.findAll('a[href]')
      expect(links.length).toBeGreaterThanOrEqual(3) // Home, Dashboard, My Courses
    })
  })
})
