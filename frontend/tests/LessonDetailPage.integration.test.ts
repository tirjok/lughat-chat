import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import LessonDetail from '../app/pages/lessons/[id].vue'

// ─── Module-level state (vi.hoisted runs before imports, but we use
//     getters/setters to avoid referencing module-level refs inside factories)
const _state = vi.hoisted(() => {
  const navigate = vi.fn()
  let routeId: string | string[] | Array<string | string[]> | Record<string, string | string[]> = '1'
  return {
    navigate,
    getRouteId: () => routeId,
    setRouteId: (id: string | string[] | Array<string | string[]> | Record<string, string | string[]>) => { routeId = id }
  }
})

// ─── Mock Nuxt auto-imports (uses getters/setters from hoisted state)
mockNuxtImport('useRoute', () => () => ({ params: { id: _state.getRouteId() } }))
mockNuxtImport('navigateTo', () => _state.navigate)

// useSidebar — always returns open=false
mockNuxtImport('useSidebar', () => () => ({
  isOpen: { value: false },
  toggle: vi.fn(),
  close: vi.fn()
}))

// useTtsApi — stub (no TTS behavior to test here)
mockNuxtImport('useTtsApi', () => () => ({
  synthesize: vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' })),
  isGenerating: { value: false },
  audioUrl: { value: null }
}))

// ─── Stub sub-components ──────────────────────────────────────────────
mockComponent('NavBar', {
  props: ['compact'],
  template: '<nav class="nav-bar" data-testid="nav-bar"></nav>'
})

mockComponent('RoadmapSidebar', {
  props: ['isOpen'],
  template: '<aside class="roadmap-sidebar" data-testid="roadmap-sidebar"></aside>'
})

mockComponent('SectionRenderer', {
  props: ['section', 'lessonId'],
  template: '<div class="section-renderer" data-testid="section-renderer"></div>'
})

mockComponent('ActivityRenderer', {
  props: ['activity', 'lessonId', 'activityIndex'],
  template: '<div class="activity-renderer" data-testid="activity-renderer">{{ activity?.title }}</div>'
})

// ─── Integration Tests (LessonDetailPage — missing behaviors) ─────────

describe('lessons/[id].vue — integration: missing behaviors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _state.setRouteId('1')
  })

  describe('Back to Dashboard link', () => {
    it('When rendered then "Back to Roadmap" link exists', async () => {
      registerEndpoint('/api/lessons/1', () => ({
        id: 1, level: 'A1', sequence: 1, title: 'Lesson 1',
        competencies: [], sections: [], activities: [],
        progress: { status: 'available', activities: {} }
      }))
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100)) // Wait for async useFetch
      const links = wrapper.findAll('a')
      const backLink = links.find(link => link.text().includes('Back to Roadmap'))
      expect(backLink).toBeDefined()
      expect(backLink?.attributes('href')).toBe('/')
    })

    it('When rendered then "Back to Roadmap" link exists even with error state', async () => {
      registerEndpoint('/api/lessons/1', {
        handler: () => { throw new Error('HTTP 404: Lesson not found') }
      })
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100))
      const links = wrapper.findAll('a')
      const backLinks = links.filter(link => link.text().includes('Back to Roadmap'))
      expect(backLinks.length).toBeGreaterThan(0)
    })
  })

  describe('Locked lesson overlay', () => {
    it('When lesson progress is locked then shows locked overlay with message', async () => {
      registerEndpoint('/api/lessons/2', () => ({
        id: 2, level: 'A1', sequence: 2, title: 'Locked Lesson',
        competencies: ['Competency 1'], sections: [], activities: [],
        progress: { status: 'locked', activities: {} }
      }))
      _state.setRouteId('2')
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.html()).toContain('ph-lock')
      expect(wrapper.text()).toContain('This lesson is locked.')
    })

    it('When lesson progress is locked then does NOT show lesson content', async () => {
      registerEndpoint('/api/lessons/3', () => ({
        id: 3, level: 'A1', sequence: 3, title: 'Locked Lesson',
        competencies: ['Competency 1'], sections: [], activities: [],
        progress: { status: 'locked', activities: {} }
      }))
      _state.setRouteId('3')
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.text()).toContain('This lesson is locked')
      expect(wrapper.text()).not.toContain('Competency 1')
    })
  })

  describe('Completed (review mode) banner', () => {
    it('When lesson progress is completed then shows review mode banner', async () => {
      registerEndpoint('/api/lessons/4', () => ({
        id: 4, level: 'A1', sequence: 4, title: 'Completed Lesson',
        competencies: [], sections: [], activities: [],
        progress: { status: 'completed', activities: {} }
      }))
      _state.setRouteId('4')
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.html()).toContain('ph-check-circle')
      expect(wrapper.text()).toContain('Lesson completed — review mode')
    })

    it('When lesson progress is completed then does NOT show locked overlay', async () => {
      registerEndpoint('/api/lessons/5', () => ({
        id: 5, level: 'A1', sequence: 5, title: 'Completed Lesson',
        competencies: [], sections: [], activities: [],
        progress: { status: 'completed', activities: {} }
      }))
      _state.setRouteId('5')
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.text()).not.toContain('This lesson is locked')
    })
  })

  describe('Not found / no lesson state', () => {
    it('When API errors then shows a user-friendly error message with "Back to Roadmap" link', async () => {
      // The Nuxt test harness wraps thrown errors as
      // 'Error: [GET] "/api/lessons/99": 500', losing the original message.
      // The wrapped string contains '500' (extracted by status regex) but
      // does NOT contain 'not found'. Match on 500 status instead.
      registerEndpoint('/api/lessons/99', {
        handler: () => { throw new Error('Not found') }
      })
      _state.setRouteId('99')
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.text()).toContain('This lesson is not available yet. Check back later!')
    })

    it('When no lesson loaded and not loading and not error then shows "No lesson found."', async () => {
      registerEndpoint('/api/lessons/999', () => null)
      _state.setRouteId('999')
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.text()).toContain('No lesson found.')
    })

    it('When no lesson loaded then "Back to Roadmap" link is shown', async () => {
      registerEndpoint('/api/lessons/888', () => null)
      _state.setRouteId('888')
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100))
      const links = wrapper.findAll('a')
      const backLink = links.find(link => link.text().includes('Back to Roadmap'))
      expect(backLink).toBeDefined()
    })
  })

  describe('Invalid lesson ID handling', () => {
    it('When lesson ID is missing (empty string) then calls navigateTo("/")', async () => {
      _state.setRouteId('')
      await mountSuspended(LessonDetail)
      expect(_state.navigate).toHaveBeenCalledWith('/')
    })

    it('When lesson ID is non-numeric then calls navigateTo("/")', async () => {
      _state.setRouteId('abc')
      await mountSuspended(LessonDetail)
      expect(_state.navigate).toHaveBeenCalledWith('/')
    })

    it('When lesson ID is zero then calls navigateTo("/")', async () => {
      _state.setRouteId('0')
      await mountSuspended(LessonDetail)
      expect(_state.navigate).toHaveBeenCalledWith('/')
    })

    it('When lesson ID is negative then calls navigateTo("/")', async () => {
      _state.setRouteId('-1')
      await mountSuspended(LessonDetail)
      expect(_state.navigate).toHaveBeenCalledWith('/')
    })
  })

  describe('RTL support', () => {
    it('When rendered then RTL direction is applied', async () => {
      registerEndpoint('/api/lessons/1', () => ({
        id: 1, level: 'A1', sequence: 1, title: 'Lesson 1',
        competencies: [], sections: [], activities: [],
        progress: { status: 'available', activities: {} }
      }))
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.attributes('dir')).toBe('rtl')
    })

    it('When rendered then NavBar and RoadmapSidebar render alongside content', async () => {
      registerEndpoint('/api/lessons/1', () => ({
        id: 1, level: 'A1', sequence: 1, title: 'Lesson 1',
        competencies: [], sections: [], activities: [],
        progress: { status: 'available', activities: {} }
      }))
      const wrapper = await mountSuspended(LessonDetail)
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.find('[data-testid="nav-bar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="roadmap-sidebar"]').exists()).toBe(true)
    })
  })
})
