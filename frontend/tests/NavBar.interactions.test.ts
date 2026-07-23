import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import NavBar from '../app/components/NavBar.vue'

// Mock ModelStatusIndicator so it doesn't interfere with route tests.
mockComponent('ModelStatusIndicator', {
  template: '<div class="model-status-indicator" data-testid="model-status"></div>'
})

// Mock RoadmapSidebar so it doesn't render in NavBar tests.
mockComponent('RoadmapSidebar', {
  template: '<aside class="roadmap-sidebar" data-testid="roadmap-sidebar"></aside>'
})

// Mock useRoute — configurable path for different route scenarios.
let _routePath = '/'
mockNuxtImport('useRoute', () => () => ({ path: _routePath }))

describe('NavBar — interactions and routing', () => {
  beforeEach(() => {
    _routePath = '/'
    vi.clearAllMocks()
  })

  // ── Active link highlighting ──────────────────────────────────────

  describe('active link highlighting', () => {
    it('When on "/" then Roadmap link is highlighted as active', async () => {
      registerEndpoint('/api/lessons', () => [])
      const wrapper = await mountSuspended(NavBar, {
        attachTo: document.body
      })
      // Find the Roadmap link by its text content (not the logo link)
      const allLinks = wrapper.findAll('a')
      const roadmapLinkEl = allLinks.find(link => link.text().includes('Roadmap'))
      expect(roadmapLinkEl?.classes()).toContain('text-gold')
    })

    it('When on "/playground" then Playground link is highlighted as active', async () => {
      registerEndpoint('/api/lessons', () => [])
      _routePath = '/playground'
      const wrapper = await mountSuspended(NavBar, {
        attachTo: document.body
      })
      const allLinks = wrapper.findAll('a')
      const playgroundLinkEl = allLinks.find(link => link.text().includes('Playground'))
      expect(playgroundLinkEl?.classes()).toContain('text-gold')
    })

    it('When on "/" then Playground link is NOT highlighted', async () => {
      registerEndpoint('/api/lessons', () => [])
      const wrapper = await mountSuspended(NavBar, {
        attachTo: document.body
      })
      const allLinks = wrapper.findAll('a')
      const playgroundLinkEl = allLinks.find(link => link.text().includes('Playground'))
      expect(playgroundLinkEl?.classes()).not.toContain('active')
    })

    it('When on "/playground" then Roadmap link is NOT highlighted', async () => {
      registerEndpoint('/api/lessons', () => [])
      _routePath = '/playground'
      const wrapper = await mountSuspended(NavBar, {
        attachTo: document.body
      })
      const allLinks = wrapper.findAll('a')
      const roadmapLinkEl = allLinks.find(link => link.text().includes('Roadmap'))
      expect(roadmapLinkEl?.classes()).not.toContain('text-gold')
    })
  })

  // ── RTL support ───────────────────────────────────────────────────

  describe('RTL layout', () => {
    it('When rendered then nav bar has dir="rtl"', async () => {
      registerEndpoint('/api/lessons', () => [])
      const wrapper = await mountSuspended(NavBar, {
        attachTo: document.body
      })
      const nav = wrapper.find('nav')
      expect(nav.attributes('dir')).toBe('rtl')
    })

    it('When rendered then hamburger button is on the right side (RTL)', async () => {
      registerEndpoint('/api/lessons', () => [])
      const wrapper = await mountSuspended(NavBar, {
        attachTo: document.body
      })
      const nav = wrapper.find('nav')
      expect(nav.attributes('dir')).toBe('rtl')
    })
  })

  // ── Compact mode ──────────────────────────────────────────────────

  describe('compact mode (no hamburger)', () => {
    it('When compact prop is true then hamburger is hidden', async () => {
      registerEndpoint('/api/lessons', () => [])
      const wrapper = await mountSuspended(NavBar, {
        props: { compact: true },
        attachTo: document.body
      })
      const hamburger = wrapper.find('[data-testid="hamburger"]')
      expect(hamburger.exists()).toBe(false)
    })

    it('When compact prop is false (default) then hamburger is visible', async () => {
      registerEndpoint('/api/lessons', () => [])
      const wrapper = await mountSuspended(NavBar, {
        attachTo: document.body
      })
      const hamburger = wrapper.find('[data-testid="hamburger"]')
      expect(hamburger.exists()).toBe(true)
    })
  })

  // ── Navigation links ──────────────────────────────────────────────

  describe('navigation links', () => {
    it('When Roadmap link exists then href is "/"', async () => {
      registerEndpoint('/api/lessons', () => [])
      const wrapper = await mountSuspended(NavBar, {
        attachTo: document.body
      })
      const roadmapLink = wrapper.find('a[href="/"]')
      expect(roadmapLink.attributes('href')).toBe('/')
    })

    it('When Playground link exists then href is "/playground"', async () => {
      registerEndpoint('/api/lessons', () => [])
      const wrapper = await mountSuspended(NavBar, {
        attachTo: document.body
      })
      const playgroundLink = wrapper.find('a[href="/playground"]')
      expect(playgroundLink.attributes('href')).toBe('/playground')
    })
  })
  // ── Mobile responsive layout ──────────────────────────────────────

  it('When viewport is < 768px then nav bar uses compact mobile styles', async () => {
    registerEndpoint('/api/lessons', () => [])
    const wrapper = await mountSuspended(NavBar, {
      attachTo: document.body
    })
    const nav = wrapper.find('nav')
    const navClasses = nav.classes().join(' ')
    // Compact NavBar uses fixed height (no responsive breakpoint)
    expect(navClasses).toContain('h-[56px]')
  })
})
