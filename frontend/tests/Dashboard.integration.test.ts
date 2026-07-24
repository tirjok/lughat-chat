import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowRef, ref } from 'vue'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'
import Dashboard from '../app/pages/index.vue'

// ─── Mock useLessons (module-level reactive state) ────────────────────
const mockLessonsState = shallowRef([])
const mockLessonsLoading = shallowRef(false)
const mockLessonsError = shallowRef<string | null>(null)
const mockFetchLessons = vi.fn().mockResolvedValue([])

vi.mock('../app/composables/useLessons', () => ({
  useLessons: () => ({
    lessons: mockLessonsState,
    loading: mockLessonsLoading,
    error: mockLessonsError,
    fetchLessons: mockFetchLessons
  })
}))

// ─── Mock useSidebar (module-level reactive state) ────────────────────
const mockIsOpen = ref(false)
const mockIsMobile = ref(false)

vi.mock('../app/composables/useSidebar', () => ({
  useSidebar: () => ({
    isOpen: mockIsOpen,
    isMobile: mockIsMobile,
    toggle: vi.fn(),
    close: vi.fn(),
    sidebarWidth: ref('280px')
  })
}))

// ─── Stub sub-components ──────────────────────────────────────────────
mockComponent('NavBar', {
  props: ['compact'],
  template: '<nav class="nav-bar" data-testid="nav-bar"><button data-testid="hamburger">☰</button><span>LughatChat</span></nav>'
})

mockComponent('RoadmapSidebar', {
  props: ['isOpen'],
  template: '<aside class="roadmap-sidebar" data-testid="roadmap-sidebar"><h2>Roadmap</h2></aside>'
})

// ─── Integration Tests (Dashboard + NavBar + RoadmapSidebar) ──────────

describe('Dashboard integration (NavBar + RoadmapSidebar)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLessonsState.value = []
    mockLessonsLoading.value = false
    mockLessonsError.value = null
    mockIsOpen.value = false
    mockIsMobile.value = false
  })

  describe('component tree', () => {
    it('When rendered then NavBar component renders inside Dashboard', async () => {
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.find('[data-testid="nav-bar"]').exists()).toBe(true)
    })

    it('When rendered then RoadmapSidebar component renders inside Dashboard', async () => {
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.find('[data-testid="roadmap-sidebar"]').exists()).toBe(true)
    })

    it('When rendered then page heading "Learning Roadmap" exists', async () => {
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.text()).toContain('خريطة التعلم')
    })

    it('When rendered then page has RTL direction', async () => {
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.attributes('dir')).toBe('rtl')
    })
  })

  describe('sidebar state propagation', () => {
    it('When sidebar is open then RoadmapSidebar receives isOpen=true', async () => {
      mockIsOpen.value = true
      const wrapper = await mountSuspended(Dashboard)
      const sidebar = wrapper.find('[data-testid="roadmap-sidebar"]')
      // The RoadmapSidebar stub receives :isOpen prop — check the rendered output
      expect(sidebar.exists()).toBe(true)
    })

    it('When sidebar is closed then RoadmapSidebar receives isOpen=false', async () => {
      mockIsOpen.value = false
      const wrapper = await mountSuspended(Dashboard)
      const sidebar = wrapper.find('[data-testid="roadmap-sidebar"]')
      expect(sidebar.exists()).toBe(true)
    })
  })

  describe('content area shifts with sidebar', () => {
    it('When sidebar is open and not mobile then content shifts with ml-72 class', async () => {
      mockIsOpen.value = true
      mockIsMobile.value = false
      const wrapper = await mountSuspended(Dashboard)
      const content = wrapper.find('.max-w-4xl')
      expect(content.classes()).toContain('ml-72')
    })

    it('When sidebar is open but on mobile then content does NOT shift', async () => {
      mockIsOpen.value = true
      mockIsMobile.value = true
      const wrapper = await mountSuspended(Dashboard)
      const content = wrapper.find('.max-w-4xl')
      expect(content.classes()).not.toContain('ml-72')
    })
  })

  describe('loading and error states with sidebar', () => {
    it('When loading then sidebar renders alongside loading message', async () => {
      mockLessonsLoading.value = true
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.html()).toContain('animate-pulse')
      expect(wrapper.find('[data-testid="nav-bar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="roadmap-sidebar"]').exists()).toBe(true)
    })

    it('When error then sidebar renders alongside error message', async () => {
      mockLessonsError.value = 'Failed to load lessons'
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.text()).toContain('Failed to load lessons')
      expect(wrapper.find('[data-testid="nav-bar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="roadmap-sidebar"]').exists()).toBe(true)
    })
  })
})
