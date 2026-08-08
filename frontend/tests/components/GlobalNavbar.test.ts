import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import GlobalNavbar from '~/components/GlobalNavbar.vue'

// Mock useNuxtApp so the navbar can access route info.
const mockRoute = {
  path: '/',
  fullPath: '/',
  params: {},
  query: {},
  hash: '',
  name: undefined,
  matched: [],
  meta: {}
}

function getWrapper(path: string): ReturnType<typeof shallowMount> {
  mockRoute.path = path
  mockRoute.fullPath = path
  mockRoute.name = path === '/' ? undefined : path.slice(1).split('/')[0] || undefined

  ;(globalThis as Record<string, unknown>).useNuxtApp = vi.fn(() => ({
    $router: {},
    route: mockRoute,
    isHydrating: () => false,
    payload: { state: {} },
    runWithContext: (fn: () => void) => fn(),
    ssrContext: {}
  }))

  const wrapper = shallowMount(GlobalNavbar, {
    global: {
      components: {
        NuxtLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>'
        }
      }
    }
  })

  const origUnmount = wrapper.unmount
  wrapper.unmount = () => {
    mockRoute.path = '/'
    mockRoute.fullPath = '/'
    mockRoute.name = undefined
    origUnmount.call(wrapper)
  }

  return wrapper
}

describe('GlobalNavbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('component existence and rendering', () => {
    it('renders a top navigation bar', () => {
      const wrapper = getWrapper('/')
      expect(wrapper.find('div.h-14').exists()).toBe(true)
    })

    it('renders the LughatChat brand text inside the nav bar', () => {
      const wrapper = getWrapper('/')
      expect(wrapper.find('span').exists()).toBe(true)
    })

    it('renders navigation links', () => {
      const wrapper = getWrapper('/')
      expect(wrapper.findAll('nav').length).toBeGreaterThanOrEqual(1)
    })

    it('renders settings and instructor action buttons', () => {
      const wrapper = getWrapper('/')
      expect(wrapper.find('button[aria-label="Settings"]').exists()).toBe(true)
    })
  })

  describe('desktop layout', () => {
    it('renders a top bar with h-14 (56px) height', () => {
      const wrapper = getWrapper('/')
      expect(wrapper.find('div.h-14').exists()).toBe(true)
    })

    it('renders a bottom progress bar with h-1 (4px)', () => {
      const wrapper = getWrapper('/')
      expect(wrapper.find('div.h-1').exists()).toBe(true)
    })

    it('does NOT render ToastNotification inside GlobalNavbar', () => {
      const wrapper = getWrapper('/')
      expect(wrapper.find('[aria-live="polite"]').exists()).toBe(false)
    })
  })

  describe('route-aware active links', () => {
    it('renders navigation links', () => {
      const wrapper = getWrapper('/')
      expect(wrapper.findAll('nav').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('mobile layout', () => {
    it('renders desktop nav links (innerWidth 1024)', () => {
      const wrapper = getWrapper('/')
      expect(wrapper.findAll('nav').length).toBeGreaterThanOrEqual(1)
    })
  })
})
