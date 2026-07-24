import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { createMockUseAudioModule, createMockUseTtsApi } from './mocks'

import SectionRenderer from '../app/components/SectionRenderer.vue'

// ─── Mock composables (Pattern 4: 1–3 deps) ────────────────────────────

const mockAudioModule = shallowRef(createMockUseAudioModule())
const mockTtsApi = shallowRef(createMockUseTtsApi())

vi.mock('../app/composables/useAudioModule', () => ({
  useAudioModule: () => mockAudioModule.value
}))

vi.mock('../app/composables/useTtsApi', () => ({
  useTtsApi: () => mockTtsApi.value
}))

// ─── Section data helpers ──────────────────────────────────────────────

function makeDialogueSection(): unknown {
  return {
    type: 'dialogue',
    title: 'Main Text',
    content: {
      scenes: [
        {
          label: 'Scene 1',
          lines: [
            { speaker: 'Ali', arabic: 'السَّلَامُ عَلَيْكُمْ', english: 'Peace be upon you' }
          ]
        }
      ]
    }
  }
}

function makeVocabularySection(): unknown {
  return {
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
}

function makePronounsSection(): unknown {
  return {
    type: 'pronouns',
    title: 'Pronouns',
    content: {
      pronouns: [
        { arabic: 'أَنَا', english: 'I', example: 'أَنَا أَخٌ' }
      ]
    }
  }
}

function makeExpressionsSection(): unknown {
  return {
    type: 'expressions',
    title: 'Expressions',
    content: {
      expressions: [
        { arabic: 'كَيْفَ حَالُكَ؟', english: 'How are you? (male)' }
      ]
    }
  }
}

function makeGrammarSection(): unknown {
  return {
    type: 'grammar',
    title: 'Grammar',
    content: {
      topics: [
        {
          name: 'Nominative Sentences',
          description: 'A sentence starting with a noun.',
          examples: [
            { arabic: 'أَنَا مُسْلِم', english: 'I am a Muslim' }
          ]
        }
      ]
    }
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe('SectionRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAudioModule.value = createMockUseAudioModule()
    mockTtsApi.value = createMockUseTtsApi()
  })

  it('When section type is dialogue then renders scenes with speaker lines and TTS buttons', () => {
    // Act
    const wrapper = mount(SectionRenderer, {
      props: { section: makeDialogueSection() as never, lessonId: 1 }
    })

    // Assert — section header
    expect(wrapper.find('h3').text()).toBe('Main Text')
    expect(wrapper.text()).toContain('Dialogue Practice')

    // Assert — scene label
    expect(wrapper.text()).toContain('Scene 1')

    // Assert — speaker line
    expect(wrapper.text()).toContain('Ali:')
    expect(wrapper.text()).toContain('السَّلَامُ عَلَيْكُمْ')
    expect(wrapper.text()).toContain('Peace be upon you')

    // Assert — TTS button
    const ttsButtons = wrapper.findAll('button')
    expect(ttsButtons.length).toBeGreaterThan(0)
  })

  it('When section type is vocabulary then renders categories with words and TTS buttons', () => {
    // Act
    const wrapper = mount(SectionRenderer, {
      props: { section: makeVocabularySection() as never, lessonId: 1 }
    })

    // Assert — section header
    expect(wrapper.find('h3').text()).toBe('Vocabulary')

    // Assert — category label is rendered
    expect(wrapper.text()).toContain('Salutations')

    // Assert — word content is rendered
    expect(wrapper.text()).toContain('تَحِيَّة')
    expect(wrapper.text()).toContain('salutation')

    // Assert — TTS button exists
    expect(wrapper.findAll('button').length).toBeGreaterThan(0)
  })

  it('When section type is pronouns then renders pronoun entries with TTS buttons', () => {
    // Act
    const wrapper = mount(SectionRenderer, {
      props: { section: makePronounsSection() as never, lessonId: 1 }
    })

    // Assert — section header
    expect(wrapper.find('h3').text()).toBe('Pronouns')

    // Assert — pronoun content is rendered
    expect(wrapper.text()).toContain('أَنَا')
    expect(wrapper.text()).toContain('I')

    // Assert — TTS button exists
    expect(wrapper.findAll('button').length).toBeGreaterThan(0)
  })

  it('When section type is expressions then renders expression phrases with TTS buttons', () => {
    // Act
    const wrapper = mount(SectionRenderer, {
      props: { section: makeExpressionsSection() as never, lessonId: 1 }
    })

    // Assert — section header
    expect(wrapper.find('h3').text()).toBe('Expressions')

    // Assert — expression content is rendered
    expect(wrapper.text()).toContain('كَيْفَ حَالُكَ؟')
    expect(wrapper.text()).toContain('How are you? (male)')

    // Assert — TTS button exists
    expect(wrapper.findAll('button').length).toBeGreaterThan(0)
  })

  it('When section type is grammar then renders topics with explanations and examples', () => {
    // Act
    const wrapper = mount(SectionRenderer, {
      props: { section: makeGrammarSection() as never, lessonId: 1 }
    })

    // Assert — section header
    expect(wrapper.find('h3').text()).toBe('Grammar')

    // Assert — topic name is rendered
    expect(wrapper.text()).toContain('Nominative Sentences')

    // Assert — topic description is rendered
    expect(wrapper.text()).toContain('A sentence starting with a noun.')

    // Assert — example content is rendered
    expect(wrapper.text()).toContain('أَنَا مُسْلِم')
    expect(wrapper.text()).toContain('I am a Muslim')
  })
})
