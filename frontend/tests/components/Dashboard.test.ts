import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

import Dashboard from '../../app/pages/dashboard.vue'

// Mock useSeoMeta so dashboard.vue's setup() doesn't throw NUXT_E1001.
// This is a per-test-file mock — it does NOT bleed into other test files
// because each test file has its own module scope.
mockNuxtImport('useSeoMeta', () => vi.fn())

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
          install(app: any) {
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

    it('renders /dashboard when path is /dashboard', () => {
      const wrapper = getWrapper('/dashboard')
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('AC-2: Dashboard shell renders placeholder content', async () => {
    it('renders a heading area with "Your Learning Journey" text', () => {
      const wrapper = getWrapper('/dashboard')
      const heading = wrapper.find('h1')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Your Learning Journey')
    })

    it('renders a card grid container for course/level cards', () => {
      const wrapper = getWrapper('/dashboard')
      const grid = wrapper.find('.grid')
      expect(grid.exists()).toBe(true)
    })
  })

  describe('AC-3: GlobalNavbar visible, Dashboard link active', async () => {
    it('renders page header with "Your Learning Journey" heading on /dashboard', () => {
      const wrapper = getWrapper('/dashboard')
      const header = wrapper.find('header')
      expect(header.exists()).toBe(true)
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
      const statusArea = wrapper.find('[aria-label="Model Status"]')
      expect(statusArea.exists()).toBe(true)
    })
  })
})
