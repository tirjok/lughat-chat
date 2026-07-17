import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'
import ActivityRenderer from '../app/components/ActivityRenderer.vue'

// Mock SectionRenderer (used inside ActivityRenderer for dialogue sections)
mockComponent('SectionRenderer', {
  props: ['section', 'lessonId'],
  template: '<div class="section-renderer" data-testid="section-renderer"></div>'
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
  })
})
