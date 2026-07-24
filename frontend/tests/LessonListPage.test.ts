import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowRef } from 'vue'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'
import LessonsIndex from '../app/pages/lessons/index.vue'

// Module-level reactive ref — the mock composable reads this at mount time.
const mockLessonsState = shallowRef([])
const mockLessonsLoading = shallowRef(false)
const mockLessonsError = shallowRef(null)
const mockFetchLessons = vi.fn().mockResolvedValue([])

// vi.mock is hoisted to the top of the file by Vitest.
vi.mock('../app/composables/useLessons', () => ({
  useLessons: () => ({
    lessons: mockLessonsState,
    loading: mockLessonsLoading,
    error: mockLessonsError,
    fetchLessons: mockFetchLessons
  })
}))

// Stub sub-components so mountSuspended can render them
mockComponent('SectionRenderer', {
  props: ['section', 'lessonId'],
  template: '<div class="section-renderer" data-testid="section-renderer"></div>'
})

// ─── Behavioral Tests (black-box: rendered component tree, emitted events) ──

describe('lessons/index.vue — Lesson List Page (Slice 8)', () => {
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
      const wrapper = await mountSuspended(LessonsIndex)
      expect(wrapper.text()).toContain('Learning Roadmap')
    })

    it('When rendered then lesson cards exist', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations — التحيّة الأولى', competency_count: 5, section_count: 5, status: 'available' },
        { id: 2, level: 'A1', sequence: 2, title: 'Lesson Two', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(LessonsIndex)
      const cards = wrapper.findAll('[class*="rounded-2xl"][class*="border-white/\\[0.12\\]"]')
      expect(cards.length).toBe(2)
    })

    it('When rendered then available icon exists', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations — التحيّة الأولى', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(LessonsIndex)
      const availableIcons = wrapper.findAll('a[href*="/lessons/"]')
      expect(availableIcons.length).toBeGreaterThan(0)
    })

    it('When rendered then locked icon exists', async () => {
      mockLessonsState.value = [
        { id: 2, level: 'A1', sequence: 2, title: 'Lesson Two', competency_count: 3, section_count: 3, status: 'locked' }
      ]
      const wrapper = await mountSuspended(LessonsIndex)
      const lockedIcons = wrapper.findAll('[class*="text-ink-dim/40"]')
      expect(lockedIcons.length).toBeGreaterThan(0)
    })
  })

  describe('branding and content', () => {
    it('When rendered then Arabic text is displayed', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations — التحيّة الأولى', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(LessonsIndex)
      expect(wrapper.text()).toContain('The Salutations — التحيّة الأولى')
    })

    it('When rendered then section and competency counts are shown', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations — التحيّة الأولى', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(LessonsIndex)
      const html = wrapper.html()
      expect(html).toContain('5 sections')
      expect(html).toContain('5 competencies')
    })

    it('When rendered then RTL direction is applied', async () => {
      mockLessonsState.value = [
        { id: 1, level: 'A1', sequence: 1, title: 'The Salutations — التحيّة الأولى', competency_count: 5, section_count: 5, status: 'available' }
      ]
      const wrapper = await mountSuspended(LessonsIndex)
      expect(wrapper.attributes('dir')).toBe('rtl')
    })
  })
})
