import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SectionRenderer from '../app/components/SectionRenderer.vue'

// Stub useTtsApi so SectionRenderer can mount
vi.mock('../app/composables/useTtsApi', () => ({
  useTtsApi: () => ({
    synthesize: vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' }))
  })
}))

// ─── Behavioral Tests (black-box: rendered component tree, emitted events) ──

describe('SectionRenderer (Slice 9)', () => {
  describe('dialogue section', () => {
    it('When section is dialogue then renders scenes and lines', async () => {
      const mockSection = {
        type: 'dialogue',
        title: 'Main Text',
        content: {
          scenes: [
            {
              label: 'Scene 1',
              lines: [
                { speaker: 'Muhammad', arabic: 'السَّلَامُ عَلَيْكُمْ', english: 'Peace be upon you' }
              ]
            }
          ]
        }
      }

      const wrapper = await mountSuspended(SectionRenderer, {
        props: { section: mockSection, lessonId: 1 }
      })

      expect(wrapper.text()).toContain('Main Text')
      expect(wrapper.text()).toContain('Scene 1')
      expect(wrapper.text()).toContain('السَّلَامُ عَلَيْكُمْ')
    })

    it('When section is dialogue then renders TTS buttons', async () => {
      const mockSection = {
        type: 'dialogue',
        title: 'Test',
        content: {
          scenes: [{ label: 'Scene 1', lines: [{ speaker: 'A', arabic: 'مرحبا', english: 'Hello' }] }]
        }
      }

      const wrapper = await mountSuspended(SectionRenderer, {
        props: { section: mockSection, lessonId: 1 }
      })

      const ttsButtons = wrapper.findAll('.tts-btn')
      expect(ttsButtons.length).toBeGreaterThan(0)
    })
  })

  describe('vocabulary section', () => {
    it('When section is vocabulary then renders categories, words, and plurals', async () => {
      const mockSection = {
        type: 'vocabulary',
        title: 'Vocabulary',
        content: {
          categories: [
            {
              label: 'Salutations',
              words: [
                { arabic: 'تَحِيَّة', english: 'salutation', singular: 'تَحِيَّة', plural: 'تَحِيَاتٌ' }
              ]
            }
          ]
        }
      }

      const wrapper = await mountSuspended(SectionRenderer, {
        props: { section: mockSection, lessonId: 1 }
      })

      expect(wrapper.text()).toContain('Salutations')
      expect(wrapper.text()).toContain('تَحِيَّة')
      expect(wrapper.text()).toContain('تَحِيَاتٌ')
    })
  })

  describe('pronouns section', () => {
    it('When section is pronouns then renders table with arabic, english, and examples', async () => {
      const mockSection = {
        type: 'pronouns',
        title: 'Pronouns',
        content: {
          pronouns: [
            { arabic: 'أَنَا', english: 'I', example: 'أَنَا أَخٌ' }
          ]
        }
      }

      const wrapper = await mountSuspended(SectionRenderer, {
        props: { section: mockSection, lessonId: 1 }
      })

      expect(wrapper.text()).toContain('أَنَا')
      expect(wrapper.text()).toContain('I')
      expect(wrapper.text()).toContain('أَنَا أَخٌ')
    })
  })

  describe('expressions section', () => {
    it('When section is expressions then renders translations', async () => {
      const mockSection = {
        type: 'expressions',
        title: 'Expressions',
        content: {
          expressions: [
            { arabic: 'السَّلَامُ عَلَيْكُمْ', english: 'Peace be upon you' }
          ]
        }
      }

      const wrapper = await mountSuspended(SectionRenderer, {
        props: { section: mockSection, lessonId: 1 }
      })

      expect(wrapper.text()).toContain('السَّلَامُ عَلَيْكُمْ')
      expect(wrapper.text()).toContain('Peace be upon you')
    })
  })

  describe('grammar section', () => {
    it('When section is grammar then renders topics with examples', async () => {
      const mockSection = {
        type: 'grammar',
        title: 'Grammar',
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

      const wrapper = await mountSuspended(SectionRenderer, {
        props: { section: mockSection, lessonId: 1 }
      })

      expect(wrapper.text()).toContain('Nominative Sentences')
      expect(wrapper.text()).toContain('أَنَا مُسْلِم')
    })
  })

  describe('unknown section type', () => {
    it('When section type is unknown then shows error message', async () => {
      const mockSection = {
        type: 'unknown-type',
        title: 'Unknown',
        content: {}
      }

      const wrapper = await mountSuspended(SectionRenderer, {
        props: { section: mockSection, lessonId: 1 }
      })

      expect(wrapper.text()).toContain('Unknown section type: unknown-type')
    })
  })
})
