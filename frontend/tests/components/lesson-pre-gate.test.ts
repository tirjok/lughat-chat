import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LessonDialogue from '~/components/lesson/LessonDialogue.vue'
import LessonVocabulary from '~/components/lesson/LessonVocabulary.vue'
import LessonPronouns from '~/components/lesson/LessonPronouns.vue'
import LessonExpressions from '~/components/lesson/LessonExpressions.vue'
import type { SectionDefinition } from '~/data/curriculum'

// ─── Shared Section Factories ────────────────────────────────────────────────

const DIALOGUE_SECTION: SectionDefinition = {
  name: 'Dialogue',
  type: 'dialogue',
  content: {
    type: 'dialogue',
    scenes: [
      {
        label: 'Scene 1: Muhammad ↔ Ali (Male-to-Male)',
        lines: [
          { speaker: 'Muhammad', arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ', english: 'Peace be upon you and Allah\'s mercy', notes: 'Formal Islamic greeting' },
          { speaker: 'Ali', arabic: 'وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ', english: 'And upon you be peace and Allah\'s mercy and blessings', notes: 'Complete response — adds \'and His blessings\'' }
        ]
      },
      {
        label: 'Scene 2: Khadija ↔ Aisha (Female-to-Female)',
        lines: [
          { speaker: 'Khadija', arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ', english: 'Same greeting, gender-neutral' },
          { speaker: 'Aisha', arabic: 'وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ', english: 'Same complete response' }
        ]
      }
    ]
  },
  _lessonId: 'a1-01',
  get items(): never[] { return [] }
}

const VOCAB_SECTION: SectionDefinition = {
  name: 'Vocabulary',
  type: 'vocabulary',
  content: {
    type: 'vocabulary',
    categories: [
      {
        label: 'Greetings',
        words: [
          { arabic: 'مَرْحَبًا', english: 'Hello' },
          { arabic: 'السَّلَامُ عَلَيْكُمْ', english: 'Peace be upon you' }
        ]
      }
    ]
  },
  _lessonId: 'a1-01',
  get items(): never[] { return [] }
}

const PRONOUN_SECTION: SectionDefinition = {
  name: 'Pronouns',
  type: 'pronouns',
  content: {
    type: 'pronouns',
    pronouns: [
      { arabic: 'هُوَ', english: 'He (male)', example: 'هُوَ طَبِيبٌ' },
      { arabic: 'هِيَ', english: 'She (female)', example: 'هِيَ مُدَرِّسَةٌ' }
    ]
  },
  _lessonId: 'a1-01',
  get items(): never[] { return [] }
}

const EXPRESSION_SECTION: SectionDefinition = {
  name: 'Expressions',
  type: 'expressions',
  content: {
    type: 'expressions',
    expressions: [
      { arabic: 'السَّلَامُ عَلَيْكُمْ', english: 'Peace be upon you' },
      { arabic: 'مَرْحَبًا', english: 'Welcome' }
    ]
  },
  _lessonId: 'a1-01',
  get items(): never[] { return [] }
}

// ─── Test: Dialogue — disabled state ─────────────────────────────────────────

describe('Issue #17: LessonDialogue audio tap gating', () => {
  it('disables all audio affordances when isAudioDisabled is true', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: DIALOGUE_SECTION, isAudioDisabled: true }
    })

    // Play buttons should be disabled
    const playButtons = wrapper.findAll('[data-testid^="play-line-"]')
    playButtons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBe('')
    })

    // Play scene button should be disabled
    const sceneButton = wrapper.find('[data-testid="play-scene"]')
    expect(sceneButton.attributes('disabled')).toBe('')

    // Line cards should have disabled styling
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    lineCards.forEach((card) => {
      const classes = card.classes()
      expect(classes).toContain('opacity-40')
      expect(classes).toContain('cursor-not-allowed')
    })
  })

  it('enables all audio affordances when isAudioDisabled is false', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: DIALOGUE_SECTION, isAudioDisabled: false }
    })

    const playButtons = wrapper.findAll('[data-testid^="play-line-"]')
    playButtons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBeUndefined()
    })

    const sceneButton = wrapper.find('[data-testid="play-scene"]')
    expect(sceneButton.attributes('disabled')).toBeUndefined()
  })

  it('enables all audio affordances when isAudioDisabled is not provided (default)', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: DIALOGUE_SECTION }
    })

    const playButtons = wrapper.findAll('[data-testid^="play-line-"]')
    playButtons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBeUndefined()
    })
  })
})

// ─── Test: Vocabulary — disabled state ───────────────────────────────────────

describe('Issue #17: LessonVocabulary audio tap gating', () => {
  it('disables all audio affordances when isAudioDisabled is true', () => {
    const wrapper = shallowMount(LessonVocabulary, {
      props: { section: VOCAB_SECTION, isAudioDisabled: true }
    })

    const playButtons = wrapper.findAll('[data-testid^="play-word-"]')
    playButtons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBe('')
    })
  })

  it('enables all audio affordances when isAudioDisabled is false', () => {
    const wrapper = shallowMount(LessonVocabulary, {
      props: { section: VOCAB_SECTION, isAudioDisabled: false }
    })

    const playButtons = wrapper.findAll('[data-testid^="play-word-"]')
    playButtons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBeUndefined()
    })
  })
})

// ─── Test: Pronouns — disabled state ─────────────────────────────────────────

describe('Issue #17: LessonPronouns audio tap gating', () => {
  it('disables all audio affordances when isAudioDisabled is true', () => {
    const wrapper = shallowMount(LessonPronouns, {
      props: { section: PRONOUN_SECTION, isAudioDisabled: true }
    })

    const playButtons = wrapper.findAll('[data-testid^="play-pronoun-"]')
    playButtons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBe('')
    })
  })

  it('enables all audio affordances when isAudioDisabled is false', () => {
    const wrapper = shallowMount(LessonPronouns, {
      props: { section: PRONOUN_SECTION, isAudioDisabled: false }
    })

    const playButtons = wrapper.findAll('[data-testid^="play-pronoun-"]')
    playButtons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBeUndefined()
    })
  })
})

// ─── Test: Expressions — disabled state ──────────────────────────────────────

describe('Issue #17: LessonExpressions audio tap gating', () => {
  it('disables all audio affordances when isAudioDisabled is true', () => {
    const wrapper = shallowMount(LessonExpressions, {
      props: { section: EXPRESSION_SECTION, isAudioDisabled: true }
    })

    const playButtons = wrapper.findAll('[data-testid^="play-expression-"]')
    playButtons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBe('')
    })
  })

  it('enables all audio affordances when isAudioDisabled is false', () => {
    const wrapper = shallowMount(LessonExpressions, {
      props: { section: EXPRESSION_SECTION, isAudioDisabled: false }
    })

    const playButtons = wrapper.findAll('[data-testid^="play-expression-"]')
    playButtons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBeUndefined()
    })
  })
})
