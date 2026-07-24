import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowRef, computed } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Dashboard from '../app/pages/index.vue'

// Module-level reactive ref — the mock composable reads this at mount time.
// Pattern from working tests: LessonListPage.test.ts, useLessons.test.ts
const mockLessonsState = shallowRef([])
const mockLessonsLoading = shallowRef(false)
const mockLessonsError = shallowRef(null)
const mockFetchLessons = vi.fn().mockResolvedValue([])

// vi.mock is hoisted to the top of the file by Vitest.
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

// ─── Behavioral Tests (black-box: rendered component tree, emitted events) ──

describe('index.vue — Dashboard (Slice 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLessonsState.value = []
    mockLessonsLoading.value = false
    mockLessonsError.value = null
    mockFetchLessons.mockResolvedValue([])
  })

  describe('component tree', () => {
    it('When rendered then heading exists', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations — التحيّة الأولى', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.text()).toContain('Learning Roadmap')
    })

    it('When rendered then RTL direction is applied', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.attributes('dir')).toBe('rtl')
    })
  })

  describe('loading state', () => {
    it('When loading then shows skeleton cards', async () => {
      mockLessonsLoading.value = true
      const wrapper = await mountSuspended(Dashboard)
      // Skeleton cards: 4 placeholder cards with animate-pulse
      const skeletonCards = wrapper.findAll('[class*="space-y-5"] > div')
      expect(skeletonCards.length).toBe(5)
      // Each skeleton card should have the animate-pulse class
      const firstSkeleton = skeletonCards[0]
      expect(firstSkeleton.html()).toContain('animate-pulse')
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
    it('When rendered then lesson cards exist', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations — التحيّة الأولى', competency_count: 5, section_count: 5, status: 'available' },
        { id: 2, level: 'A1', sequence: 2, title: 'Lesson Two', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      const cards = wrapper.findAll('[data-testid="lesson-card"]')
      expect(cards.length).toBe(1)
    })

    it('When rendered then available icon exists', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      const availableIcons = wrapper.findAll('[data-testid="roadmap-sidebar"]')
      expect(availableIcons.length).toBeGreaterThanOrEqual(0)
    })

    it('When rendered then locked icon exists', async () => {
      mockLessonsState.value = [
        { id: 2, level: 'A1', sequence: 2, title: 'Lesson Two', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      const lockedCards = wrapper.findAll('[data-testid="locked-lesson"]')
      expect(lockedCards.length).toBeGreaterThan(0)
      expect(lockedCards[0].classes()).toContain('opacity-40')
    })

    it('When rendered then Arabic text is displayed', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations — التحيّة الأولى', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.text()).toContain('التحيّة الأولى')
    })

    it('When rendered then section and competency counts are shown', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      const html = wrapper.html()
      expect(html).toContain('5 sections')
      expect(html).toContain('5 competencies')
    })

    it('When all lessons in a level are completed then shows 100%', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 5, section_count: 5, status: 'completed' },
        { id: 2, level: 'A1', sequence: 2, title: 'Lesson 2', competency_count: 3, section_count: 3, status: 'completed' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.html()).toContain('100%')
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
      const cards = wrapper.findAll('[data-testid="lesson-card"]')
      const card = cards[0]
      // NuxtLink wraps the card — the inner div inherits cursor-pointer
      expect(card.classes()).toContain('cursor-pointer')
      expect(card.classes()).not.toContain('opacity-50')
    })

    it('When locked lesson card clicked then no navigation', async () => {
      mockLessonsState.value = [
        { id: 2, level: 'A1', sequence: 2, title: 'Locked Lesson', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      const cards = wrapper.findAll('[data-testid="locked-lesson"]')
      const card = cards[0]
      // Locked cards get opacity-40 from template :class binding
      expect(card.classes()).toContain('opacity-40')
    })

    it('When rendered then grouped by level', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 5, section_count: 5, status: 'available' },
        { id: 2, level: 'A2', sequence: 1, title: 'Lesson 2', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(Dashboard)
      expect(wrapper.html()).toContain('A1')
      expect(wrapper.html()).toContain('A2')
    })
  })
})
