import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowRef } from 'vue'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'
import LessonDetail from '../app/pages/lessons/[id].vue'

// Module-level reactive refs — the mock composable reads these at mount time.
const mockCurrentLesson = shallowRef(null)
const mockCurrentLoading = shallowRef(false)
const mockCurrentError = shallowRef(null)
const mockFetchLesson = vi.fn().mockResolvedValue(null)

// vi.mock is hoisted to the top of the file by Vitest.
vi.mock('../app/composables/useLessons', () => ({
  useLessons: () => ({
    currentLesson: mockCurrentLesson,
    currentLoading: mockCurrentLoading,
    currentError: mockCurrentError,
    fetchLesson: mockFetchLesson
  })
}))

// Mock useTtsApi (stub — no TTS behavior to test here)
vi.mock('../app/composables/useTtsApi', () => ({
  useTtsApi: () => ({
    synthesize: vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' }))
  })
}))

// Stub SectionRenderer so mountSuspended doesn't try to render it
mockComponent('SectionRenderer', {
  props: ['section', 'lessonId'],
  template: '<div class="section-renderer" data-testid="section-renderer"></div>'
})

// Mock useRoute — the page reads route.params.id
vi.mock('#imports', () => ({
  useRoute: () => ({ params: { id: '1' } })
}))

const mockLesson = {
  id: 1,
  level: 'A1',
  sequence: 1,
  title: 'The Salutations — التحيّة الأولى',
  competencies: [
    'Can read fluently short paragraphs with harakat',
    'Good understanding of basic salutations',
    'Ability to use pronouns correctly',
    'Differentiates between the pronouns used when talking to the different genders',
    'Grasps the method of forming nominative sentences with pronouns + nouns'
  ],
  sections: [
    {
      type: 'dialogue',
      title: 'Main Text — الحوار',
      content: {
        scenes: [
          {
            label: 'Scene 1: Muhammad ↔ Ali',
            lines: [
              { speaker: 'Muhammad', arabic: 'السَّلَامُ عَلَيْكُمْ', english: 'Peace be upon you', notes: 'Formal greeting' }
            ]
          }
        ]
      }
    },
    {
      type: 'vocabulary',
      title: 'Vocabulary — المفردات',
      content: {
        categories: [
          {
            label: 'Salutations',
            words: [
              { arabic: 'تَحِيَّة', english: 'salutation/greeting', singular: 'تَحِيَّة', plural: 'تَحِيَاتٌ' }
            ]
          }
        ]
      }
    },
    {
      type: 'pronouns',
      title: 'Pronouns — الضمائر',
      content: {
        pronouns: [
          { arabic: 'أَنَا', english: 'I', example: 'أَنَا أَخٌ' }
        ]
      }
    },
    {
      type: 'expressions',
      title: 'Expressions — العبارات',
      content: {
        expressions: [
          { arabic: 'السَّلَامُ عَلَيْكُمْ', english: 'Peace be upon you' }
        ]
      }
    },
    {
      type: 'grammar',
      title: 'Grammar — القواعد',
      content: {
        topics: [
          {
            name: 'Nominative Sentences',
            description: 'A sentence starting with a noun',
            examples: [
              { arabic: 'أَنَا مُسْلِم', english: 'I am a Muslim' }
            ]
          }
        ]
      }
    }
  ],
  activities: [
    { id: 1, type: 'listen-translate', title: 'Read & Translate', description: '', order: 1, competency_map: {}, max_attempts: 3 },
    { id: 2, type: 'translate-to-english', title: 'Translate', description: '', order: 2, competency_map: {}, max_attempts: 3 },
    { id: 3, type: 'translate-to-arabic', title: 'Translate to Arabic', description: '', order: 3, competency_map: {}, max_attempts: 3 },
    { id: 4, type: 'introduce-characters', title: 'Characters', description: '', order: 4, competency_map: {}, max_attempts: 3 },
    { id: 5, type: 'role-play', title: 'Role-Play', description: '', order: 5, competency_map: {}, max_attempts: 3 }
  ],
  progress: {
    status: 'available',
    activities: {
      1: { score: 0, status: 'available', attempts: 0 },
      2: { score: 0, status: 'available', attempts: 0 },
      3: { score: 0, status: 'available', attempts: 0 },
      4: { score: 0, status: 'available', attempts: 0 },
      5: { score: 0, status: 'available', attempts: 0 }
    }
  }
}

// ─── Behavioral Tests (black-box: rendered component tree, emitted events) ──

describe('lessons/[id].vue — Lesson Detail Page (Slice 9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentLesson.value = null
    mockCurrentLoading.value = false
    mockCurrentError.value = null
    mockFetchLesson.mockResolvedValue(null)
  })

  describe('component tree', () => {
    it('When lesson is loaded then title is displayed', async () => {
      mockCurrentLesson.value = mockLesson
      const wrapper = await mountSuspended(LessonDetail)
      expect(wrapper.text()).toContain('The Salutations — التحيّة الأولى')
    })

    it('When lesson is loaded then level badge is displayed', async () => {
      mockCurrentLesson.value = mockLesson
      const wrapper = await mountSuspended(LessonDetail)
      expect(wrapper.text()).toContain('A1')
    })

    it('When lesson is loaded then all 5 section types are rendered by SectionRenderer', async () => {
      mockCurrentLesson.value = mockLesson
      const wrapper = await mountSuspended(LessonDetail)
      const renderers = wrapper.findAll('[data-testid="section-renderer"]')
      expect(renderers.length).toBe(5)
    })

    it('When lesson is loaded then competencies are listed', async () => {
      mockCurrentLesson.value = mockLesson
      const wrapper = await mountSuspended(LessonDetail)
      expect(wrapper.text()).toContain('Can read fluently short paragraphs with harakat')
    })
  })

  describe('section rendering', () => {
    it('When lesson is loaded then 5 SectionRenderer stubs are rendered', async () => {
      mockCurrentLesson.value = mockLesson
      const wrapper = await mountSuspended(LessonDetail)
      const renderers = wrapper.findAll('[data-testid="section-renderer"]')
      expect(renderers.length).toBe(5)
    })

    it('When lesson is loaded then practice activities are listed', async () => {
      mockCurrentLesson.value = mockLesson
      const wrapper = await mountSuspended(LessonDetail)
      expect(wrapper.text()).toContain('Practice Activities')
      expect(wrapper.text()).toContain('Read & Translate')
    })
  })

  describe('error and loading states', () => {
    it('When loading then shows loading message', async () => {
      mockCurrentLoading.value = true
      const wrapper = await mountSuspended(LessonDetail)
      expect(wrapper.text()).toContain('Loading lesson...')
    })

    it('When error then shows error message', async () => {
      mockCurrentError.value = 'Lesson not found'
      const wrapper = await mountSuspended(LessonDetail)
      expect(wrapper.text()).toContain('Lesson not found')
    })
  })

  describe('RTL support', () => {
    it('When rendered then RTL direction is applied', async () => {
      mockCurrentLesson.value = mockLesson
      const wrapper = await mountSuspended(LessonDetail)
      expect(wrapper.attributes('dir')).toBe('rtl')
    })

    it('When rendered then Arabic text is displayed correctly', async () => {
      mockCurrentLesson.value = mockLesson
      const wrapper = await mountSuspended(LessonDetail)
      expect(wrapper.text()).toContain('التحيّة الأولى')
    })
  })
})
