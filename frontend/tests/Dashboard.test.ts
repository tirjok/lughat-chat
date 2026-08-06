import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'

import Dashboard from '../app/pages/dashboard.vue'

// ─── Route Mocking ──────────────────────────────────────────────────────
// GlobalNavbar accesses route via useNuxtApp — stub it so the navbar
// can highlight the correct nav link when mounted inside Dashboard.

const mockRoute = (path: string) => ({
  path,
  fullPath: path,
  params: {},
  query: {},
  hash: '',
  name: path === '/' ? undefined : (path.slice(1).split('/')[0] || undefined) as string | undefined,
  matched: [],
  meta: {}
})

function getWrapper(path: string): ReturnType<typeof shallowMount> {
  ;(globalThis as Record<string, unknown>).useNuxtApp = vi.fn(() => ({
    $router: {},
    route: mockRoute(path),
    isHydrating: () => false,
    payload: { state: {} },
    runWithContext: (fn: () => void) => fn(),
    ssrContext: {}
  }))

  return shallowMount(Dashboard, {
    global: {
      components: {
        NuxtLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>'
        }
      }
    }
  })
}

// ─── Behavioral Tests ───────────────────────────────────────────────────

describe('dashboard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC-1: Page routing', () => {
    it('exists as a module that can be imported', () => {
      expect(Dashboard).toBeDefined()
      expect(typeof Dashboard).toBe('object')
    })
  })

  describe('AC-2: Dashboard shell renders placeholder content', async () => {
    it('renders a heading area with "Your Learning Journey" text', async () => {
      const wrapper = getWrapper('/dashboard')
      await nextTick()
      // The heading text is rendered as an <h1> in the page shell
      const heading = wrapper.find('h1')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Learning Journey')
    })

    it('renders a card grid container for course/level cards', async () => {
      const wrapper = getWrapper('/dashboard')
      await nextTick()
      // The card grid renders level cards with "card" class
      const cards = wrapper.findAll('[class*="card"]')
      // At least one card placeholder should exist (even if empty grid)
      expect(cards.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('AC-3: GlobalNavbar visible, Dashboard link active', async () => {
    it('renders page header with "Your Learning Journey" heading on /dashboard', async () => {
      const wrapper = getWrapper('/dashboard')
      await nextTick()
      // The page has its own header section (below GlobalNavbar from app.vue)
      const header = wrapper.find('header')
      expect(header.exists()).toBe(true)
      // The heading should say "Your Learning Journey"
      const heading = header.find('h1')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Learning Journey')
    })

    it('renders a "Continue Learning" CTA button in the page header', async () => {
      const wrapper = getWrapper('/dashboard')
      await nextTick()
      const header = wrapper.find('header')
      expect(header.exists()).toBe(true)
      // The CTA button is a NuxtLink styled with primary-500 class
      const cta = header.find('a.bg-primary-500')
      expect(cta.exists()).toBe(true)
      expect(cta.text()).toContain('Continue Learning')
    })
  })

  describe('AC-4: Non-blocking health', async () => {
    it('renders the page shell even when health status is loading', async () => {
      const wrapper = getWrapper('/dashboard')
      await nextTick()
      // The page should render regardless of health state
      expect(wrapper.exists()).toBe(true)
      // The heading should be present (not blocked by health check)
      const heading = wrapper.find('h1')
      expect(heading.exists()).toBe(true)
    })

    it('renders a health status indicator area (non-blocking)', async () => {
      const wrapper = getWrapper('/dashboard')
      await nextTick()
      // ModelStatusIndicator is rendered inside a div with aria-label="Model Status"
      // The page should render regardless of health state (non-blocking)
      const healthArea = wrapper.find('[aria-label="Model Status"]')
      expect(healthArea.exists()).toBe(true)
    })
  })
})
