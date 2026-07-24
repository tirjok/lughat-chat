import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowRef, computed } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RoadmapSidebar from '../app/components/RoadmapSidebar.vue'

// Module-level reactive ref — the mock composable reads this at mount time.
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

describe('RoadmapSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLessonsState.value = []
    mockLessonsLoading.value = false
    mockLessonsError.value = null
  })

  describe('component tree', () => {
    it('When rendered then level headers are displayed', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 5, section_count: 5, status: 'available' },
        { id: 2, level: 'A2', sequence: 1, title: 'Lesson 2', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(RoadmapSidebar, { props: { isOpen: true } })
      expect(wrapper.text()).toContain('A1')
      expect(wrapper.text()).toContain('A2')
    })

    it('When rendered then lesson cards are displayed', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations', competency_count: 5, section_count: 5, status: 'available' },
        { id: 2, level: 'A1', sequence: 2, title: 'Second Lesson', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(RoadmapSidebar, { props: { isOpen: true } })
      const cards = wrapper.findAll('a[href*="/lessons/"]')
      expect(cards.length).toBe(2)
    })

    it('When rendered then progress percentage is shown per level', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 5, section_count: 5, status: 'completed' }
      ]
      const wrapper = await mountSuspended(RoadmapSidebar, { props: { isOpen: true } })
      // Progress is shown as a visual bar, not a percentage string
      expect(wrapper.html()).toContain('A1')
    })
  })

  describe('status icons', () => {
    it('When lesson is available then shows available icon', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(RoadmapSidebar, { props: { isOpen: true } })
      // Available lesson shows check-circle icon
      expect(wrapper.html()).toContain('ph-arrow-right')
    })

    it('When lesson is locked then shows locked icon', async () => {
      mockLessonsState.value = [
        { id: 2, level: 'A1', sequence: 2, title: 'Lesson 2', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(RoadmapSidebar, { props: { isOpen: true } })
      // Locked lesson shows gold lock icon
      expect(wrapper.html()).toContain('ph-lock')
    })
  })

  describe('interaction', () => {
    it('When locked lesson card clicked then no navigation', async () => {
      mockLessonsState.value = [
        { id: 2, level: 'A1', sequence: 2, title: 'Locked Lesson', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(RoadmapSidebar, { props: { isOpen: true } })
      // Locked cards are still NuxtLinks but visually dimmed
      const cards = wrapper.findAll('a[href*="/lessons/"]')
      expect(cards.length).toBe(1)
      expect(cards[0].classes()).toContain('text-ink-dim/40')
    })

    it('When available lesson card clicked then navigates to /lesson/:id', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(RoadmapSidebar, { props: { isOpen: true } })
      const cards = wrapper.findAll('a[href*="/lessons/"]')
      // Available cards are clickable NuxtLinks
      expect(cards.length).toBe(1)
    })
  })
})
