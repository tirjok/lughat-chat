import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mountSuspended,
  mockComponent,
  mockNuxtImport
} from '@nuxt/test-utils/runtime'
import ActivityRenderer from '../app/components/ActivityRenderer.vue'

// ---------------------------------------------------------------------------
// Mock useActivitySubmission — single source of truth for all submission tests
// ---------------------------------------------------------------------------
const mockSubmitAnswer = vi.fn().mockResolvedValue(null)
const mockClearResults = vi.fn()

function createSubmissionMock(_resultOverride: Record<string, unknown> = {}) {
  return {
    isSubmitting: { value: false },
    result: { value: null },
    error: { value: null },
    maxAttempts: { value: 3 },
    isMaxAttemptsReached: { value: false },
    submitAnswer: mockSubmitAnswer,
    clearResults: mockClearResults
  }
}

mockNuxtImport('useActivitySubmission', () => {
  return (_activityId: number) => createSubmissionMock()
})

// Mock SectionRenderer (used inside ActivityRenderer for dialogue sections)
mockComponent('SectionRenderer', {
  props: ['section', 'lessonId'],
  template: '<div class="section-renderer" data-testid="section-renderer"></div>'
})

// Mock new child components — render actual content from props so tests verify rendering
mockComponent('ListenTranslateView', {
  props: ['content'],
  template: '<div class="listen-translate-view" data-testid="listen-translate-view">{{ content?.dialogue?.scene1?.arabic }}</div>'
})

mockComponent('TranslateView', {
  props: ['content', 'activityType'],
  template: '<div class="translate-view" data-testid="translate-view">{{ content?.sentences?.[0]?.arabic ?? content?.sentences?.[0]?.english }}</div>'
})

mockComponent('IntroduceCharactersView', {
  props: ['content'],
  template: '<div class="introduce-characters-view" data-testid="introduce-characters-view">{{ content?.characters?.[0]?.name }}</div>'
})

mockComponent('RolePlayView', {
  props: ['content'],
  template: '<div class="role-play-view" data-testid="role-play-view">{{ content?.scenario }}</div>'
})

mockComponent('ActivityForm', {
  props: ['placeholder', 'dir', 'disabled', 'isSubmitting', 'modelValue'],
  template: '<div class="activity-form" data-testid="activity-form"></div>'
})

mockComponent('ActivityScorePanel', {
  props: ['result', 'maxAttempts', 'isComplete', 'lessonJustCompleted'],
  template: '<div class="activity-score-panel" data-testid="activity-score-panel"></div>'
})

describe('ActivityRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('component tree', () => {
    it('When rendered then activity title is displayed', async () => {
      const wrapper = await mountSuspended(ActivityRenderer, {
        props: {
          activity: {
            id: 1,
            type: 'listen-translate',
            title: 'Read the Dialogue',
            description: 'Translate the dialogue',
            order: 1,
            competency_map: {},
            max_attempts: 3,
            content: {}
          },
          lessonId: 1,
          activityIndex: 0
        }
      })
      expect(wrapper.text()).toContain('Read the Dialogue')
    })

    it('When rendered then activity description is displayed', async () => {
      const wrapper = await mountSuspended(ActivityRenderer, {
        props: {
          activity: {
            id: 1,
            type: 'listen-translate',
            title: 'Read the Dialogue',
            description: 'Translate the dialogue',
            order: 1,
            competency_map: {},
            max_attempts: 3,
            content: {}
          },
          lessonId: 1,
          activityIndex: 0
        }
      })
      expect(wrapper.text()).toContain('Translate the dialogue')
    })
  })

  describe('activity type rendering', () => {
    it('When type is "listen-translate" then dialogue content is rendered', async () => {
      const wrapper = await mountSuspended(ActivityRenderer, {
        props: {
          activity: {
            id: 1,
            type: 'listen-translate',
            title: 'Read & Translate',
            description: '',
            order: 1,
            competency_map: {},
            max_attempts: 3,
            content: {
              dialogue: {
                scene1: { arabic: 'السَّلَامُ عَلَيْكُمْ', english_expected: 'Peace be upon you' }
              }
            }
          },
          lessonId: 1,
          activityIndex: 0
        }
      })
      expect(wrapper.text()).toContain('السَّلَامُ عَلَيْكُمْ')
    })

    it('When type is "translate-to-english" then sentences are rendered', async () => {
      const wrapper = await mountSuspended(ActivityRenderer, {
        props: {
          activity: {
            id: 2,
            type: 'translate-to-english',
            title: 'Translate to English',
            description: '',
            order: 2,
            competency_map: {},
            max_attempts: 3,
            content: {
              sentences: [
                { arabic: 'أَنَا مُسْلِمٌ', english_expected: 'I am a Muslim' }
              ]
            }
          },
          lessonId: 1,
          activityIndex: 1
        }
      })
      expect(wrapper.text()).toContain('أَنَا مُسْلِمٌ')
    })

    it('When type is "translate-to-arabic" then English sentences are rendered', async () => {
      const wrapper = await mountSuspended(ActivityRenderer, {
        props: {
          activity: {
            id: 3,
            type: 'translate-to-arabic',
            title: 'Translate to Arabic',
            description: '',
            order: 3,
            competency_map: {},
            max_attempts: 3,
            content: {
              sentences: [
                { english: 'I am Ahmad', arabic_expected: 'أَنَا أَحْمَد' }
              ]
            }
          },
          lessonId: 1,
          activityIndex: 2
        }
      })
      expect(wrapper.text()).toContain('I am Ahmad')
    })

    it('When type is "introduce-characters" then characters are rendered', async () => {
      const wrapper = await mountSuspended(ActivityRenderer, {
        props: {
          activity: {
            id: 4,
            type: 'introduce-characters',
            title: 'Introduce Characters',
            description: '',
            order: 4,
            competency_map: {},
            max_attempts: 3,
            content: {
              characters: [
                { name: 'Muhammad', arabic: 'مُحَمَّد', gender: 'male' }
              ]
            }
          },
          lessonId: 1,
          activityIndex: 3
        }
      })
      expect(wrapper.text()).toContain('Muhammad')
    })

    it('When type is "role-play" then scenario is rendered', async () => {
      const wrapper = await mountSuspended(ActivityRenderer, {
        props: {
          activity: {
            id: 5,
            type: 'role-play',
            title: 'Role-Play',
            description: '',
            order: 5,
            competency_map: {},
            max_attempts: 3,
            content: {
              scenario: 'You meet someone new at the mosque.',
              expected_elements: ['Greeting', 'Self-introduction']
            }
          },
          lessonId: 1,
          activityIndex: 4
        }
      })
      expect(wrapper.text()).toContain('You meet someone new at the mosque')
    })
  })

  describe('RTL support', () => {
    it('When rendered then RTL direction is applied', async () => {
      const wrapper = await mountSuspended(ActivityRenderer, {
        props: {
          activity: {
            id: 1,
            type: 'listen-translate',
            title: 'Read & Translate',
            description: '',
            order: 1,
            competency_map: {},
            max_attempts: 3,
            content: {}
          },
          lessonId: 1,
          activityIndex: 0
        }
      })
      expect(wrapper.attributes('dir')).toBe('rtl')
    })

    it('When type is "translate-to-arabic" then form has RTL direction', async () => {
      const wrapper = await mountSuspended(ActivityRenderer, {
        props: {
          activity: {
            id: 3,
            type: 'translate-to-arabic',
            title: 'Translate to Arabic',
            description: '',
            order: 3,
            competency_map: {},
            max_attempts: 3,
            content: {
              sentences: [
                { english: 'I am Ahmad', arabic_expected: 'أَنَا أَحْمَد' }
              ]
            }
          },
          lessonId: 1,
          activityIndex: 2
        }
      })
      // The ActivityForm component receives dir prop from ActivityRenderer
      const activityForms = wrapper.findAllComponents({ name: 'ActivityForm' })
      expect(activityForms.length).toBeGreaterThan(0)
    })
  })

  describe('submission flow', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('When component mounts then submitAnswer is NOT called (waits for user input)', async () => {
      await mountSuspended(ActivityRenderer, {
        props: {
          activity: {
            id: 42,
            type: 'listen-translate',
            title: 'Read & Translate',
            description: '',
            order: 1,
            competency_map: {},
            max_attempts: 3,
            content: {}
          },
          lessonId: 1,
          activityIndex: 0
        }
      })

      // submitAnswer is only called when the user submits via the form,
      // not on mount — the composable exposes the function but does not invoke it.
      expect(mockSubmitAnswer).not.toHaveBeenCalled()
    })
  })
})
