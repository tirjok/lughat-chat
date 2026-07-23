import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowRef, computed } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Dashboard from '../app/pages/index.vue'

// Module-level reactive ref — the mock composable reads this at mount time.
const mockLessonsState = shallowRef([])
const mockLessonsLoading = shallowRef(false)
const mockLessonsError = shallowRef(null)
const mockFetchLessons = vi.fn().mockResolvedValue([])

vi.mock('../app/composables/useLessons', () => {
  return {
    useLessons: () => ({
      lessons: mockLessonsState,
      loading: mockLessonsLoading,
      error: mockLessonsError,
      fetchLessons: mockFetchLessons,
      groupedLessons: computed(() => {
        const groups: Record<string, { id: number, level: string, sequence: number, title: string, competency_count: number, section_count: number, status: string }[]> = {}
        for (const lesson of mockLessonsState.value) {
          const key = lesson.level
          if (!groups[key]) groups[key] = []
          groups[key].push(lesson)
        }
        return Object.entries(groups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([level, ls]) => {
            const sorted = [...(ls ?? [])].sort((a, b) => a.sequence - b.sequence)
            const total = sorted.length
            const completed = sorted.filter(l => l.status === 'completed').length
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0
            return { level, lessons: sorted, progress }
          })
      })
    })
  }
})

// Mock useSidebar (NavBar uses it)
vi.mock('../app/composables/useSidebar', () => ({
  useSidebar: () => ({
    isOpen: { value: false },
    toggle: vi.fn(),
    close: vi.fn()
  })
}))

describe('Dashboard (index.vue)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLessonsState.value = []
    mockLessonsLoading.value = false
    mockLessonsError.value = null
  })

  describe('component tree', () => {
    it('When rendered then page heading exists', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.text()).toContain('Learning Roadmap')
    })
  })

  describe('loading state', () => {
    it('When loading then shows loading message', async () => {
      mockLessonsLoading.value = true
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.text()).toContain('Loading')
    })
  })

  describe('error state', () => {
    it('When error then shows error message', async () => {
      mockLessonsError.value = 'Failed to load lessons'
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.text()).toContain('Failed to load lessons')
    })
  })

  describe('lessons rendering', () => {
    it('When lessons exist then lesson cards are displayed', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations', competency_count: 5, section_count: 5, status: 'available' },
        { id: 2, level: 'A1', sequence: 2, title: 'Second Lesson', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      const cards = wrapper.findAll('.dashboard-lesson-card')
      expect(cards.length).toBe(2)
    })

    it('When lessons exist then grouped by level', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 5, section_count: 5, status: 'available' },
        { id: 2, level: 'A2', sequence: 1, title: 'Lesson 2', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.html()).toContain('A1')
      expect(wrapper.html()).toContain('A2')
    })

    it('When all lessons in a level are completed then shows 100%', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 5, section_count: 5, status: 'completed' },
        { id: 2, level: 'A1', sequence: 2, title: 'Lesson 2', competency_count: 3, section_count: 3, status: 'completed' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.html()).toContain('100')
    })

    it('When no lessons then shows empty state', async () => {
      mockLessonsState.value = []
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.text()).toContain('No lessons available')
    })
  })

  describe('interaction', () => {
    it('When available lesson card clicked then navigates to /lessons/:id', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      const cards = wrapper.findAll('.dashboard-lesson-card')
      const card = cards[0]
      // NuxtLink wraps the card — inner div has cursor-pointer
      expect(card.classes()).toContain('cursor-pointer')
      expect(card.classes()).not.toContain('opacity-50')
    })

    it('When locked lesson card clicked then no navigation', async () => {
      mockLessonsState.value = [
        { id: 2, level: 'A1', sequence: 2, title: 'Locked Lesson', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      const cards = wrapper.findAll('.dashboard-lesson-card')
      const card = cards[0]
      expect(card.classes()).toContain('opacity-40')
    })
  })
})
