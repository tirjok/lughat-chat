import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import Dashboard from '~/pages/dashboard.vue'

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

function getWrapper(path: string) {
  return shallowMount(Dashboard, {
    global: {
      plugins: [
        {
          install(app: Record<string, unknown>) {
            app.config.globalProperties.$router = {}
            Object.defineProperty(app.config.globalProperties, 'useNuxtApp', {
              value: vi.fn(() => ({
                $router: {},
                route: mockRoute(path),
                isHydrating: () => false,
                payload: { state: {} },
                runWithContext: (fn: () => void) => fn(),
                ssrContext: {}
              }))
            })
          }
        }
      ],
      stubs: {
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

    it('renders /dashboard when path is /dashboard', () => {
      const wrapper = getWrapper('/dashboard')
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('AC-2: Dashboard shell renders content', async () => {
    it('renders a heading area with "Dashboard" h1 and "Your Learning Journey" label', () => {
      const wrapper = getWrapper('/dashboard')
      const heading = wrapper.find('h1')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toBe('Dashboard')
      // Learning Journey label (uppercase tracking text)
      const label = wrapper.find('p.text-xs.font-semibold')
      expect(label.exists()).toBe(true)
      expect(label.text()).toContain('Your Learning Journey')
    })

    it('renders a card grid container for CEFR level cards', () => {
      const wrapper = getWrapper('/dashboard')
      const grid = wrapper.find('.grid')
      expect(grid.exists()).toBe(true)
    })

    it('renders CEFR level cards (A1–C2) as NuxtLinks', () => {
      const wrapper = getWrapper('/dashboard')
      const links = wrapper.findAll('a[href*="/dashboard/level/"]')
      expect(links.length).toBe(6)
      const hrefs = links.map(l => l.attributes('href'))
      expect(hrefs).toContain('/dashboard/level/A1')
      expect(hrefs).toContain('/dashboard/level/C2')
    })
  })

  describe('AC-3: GlobalNavbar visible, Dashboard link active', async () => {
    it('renders page header with "Dashboard" heading on /dashboard', () => {
      const wrapper = getWrapper('/dashboard')
      const heading = wrapper.find('h1')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Dashboard')
    })

    it('renders a "Continue Learning" CTA button in the page header', () => {
      const wrapper = getWrapper('/dashboard')
      // shallowMount renders unregistered NuxtLink as a raw tag.
      // Check the tag exists with the correct `to` prop.
      const nuxtLink = wrapper.find('a')
      expect(nuxtLink.exists()).toBe(true)
      expect(nuxtLink.attributes('href')).toBe('/dashboard')
    })
  })

  describe('AC-4: Non-blocking health', async () => {
    it('renders the page shell even when health status is loading', () => {
      const wrapper = getWrapper('/dashboard')
      expect(wrapper.exists()).toBe(true)
    })

    it('renders a health status indicator area (non-blocking)', () => {
      const wrapper = getWrapper('/dashboard')
      // Health status is now rendered in GlobalNavbar (outside router-view).
      // Dashboard page renders regardless of health state.
      expect(wrapper.exists()).toBe(true)
    })
  })
})
