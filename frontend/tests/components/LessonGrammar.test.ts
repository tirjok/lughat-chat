import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LessonGrammar from '~/components/LessonGrammar.vue'
import type { SectionDefinition } from '~/data/curriculum'

function makeGrammarSection(): SectionDefinition {
  return {
    name: 'Grammar',
    type: 'grammar',
    content: {
      type: 'grammar',
      topics: [
        {
          name: 'Nominative Sentences (الجملة الاسمية)',
          description:
            'A sentence starting with a noun (ism) followed by a predicate (khabar). Common pattern: Pronoun + Noun/Adjective',
          examples: [
            { arabic: 'أَنَا مُسْلِم', english: 'I am a Muslim' },
            { arabic: 'هُوَ أَخِي', english: 'He is my brother' },
            { arabic: 'هِيَ أُخْتِي', english: 'She is my sister' },
            { arabic: 'أَحْمَدُ طَالِب', english: 'Ahmad is a student' }
          ]
        },
        {
          name: 'Gender Agreement in Pronouns',
          description:
            'Arabic pronouns encode gender. The verb/adjective must match the pronoun\'s gender.',
          examples: [
            { arabic: 'كَيْفَ حَالُك؟', english: 'How are you? (to a male)' },
            { arabic: 'كَيْفَ حَالُكِ؟', english: 'How are you? (to a female)' },
            { arabic: 'هُوَ مُسْلِمٌ', english: 'He is Muslim (m.)' },
            { arabic: 'هِيَ مُسْلِمَةٌ', english: 'She is Muslim (f.)' }
          ]
        },
        {
          name: 'Number: Singular, Dual, Plural',
          description:
            'Arabic has three grammatical numbers: singular (مفرد), dual (مثنى), and plural (جمع).',
          examples: [
            { arabic: 'أَخ', english: 'brother (singular)' },
            { arabic: 'أَخَوَان', english: 'two brothers (dual)' },
            { arabic: 'إِخْوَة', english: 'brothers (plural)' }
          ]
        }
      ]
    },
    _lessonId: 'a1-01',
    get items(): never[] { return [] }
  }
}

function makeEmptyGrammarSection(): SectionDefinition {
  return {
    name: 'Grammar',
    type: 'grammar',
    content: { type: 'grammar', topics: [] },
    _lessonId: 'a1-02',
    get items(): never[] { return [] }
  }
}

function makePlaceholderGrammarSection(): SectionDefinition {
  return {
    name: 'Grammar',
    type: 'grammar',
    content: {
      type: 'grammar',
      topics: [{ name: '', description: '', examples: [] }]
    },
    _lessonId: 'a1-05',
    get items(): never[] { return [] }
  }
}

function getWrapper(section: SectionDefinition = makeGrammarSection()) {
  return shallowMount(LessonGrammar, { props: { section } })
}

describe('LessonGrammar', () => {
  it('renders one topic card per grammar topic', () => {
    const wrapper = getWrapper()
    const cards = wrapper.findAll('[data-testid^="grammar-topic-card-"]')
    expect(cards).toHaveLength(3)
  })

  it('shows the topic name in each card header', () => {
    const wrapper = getWrapper()
    const names = wrapper.findAll('[data-testid^="grammar-topic-name-"]')
    expect(names).toHaveLength(3)
    expect(names[0].text()).toContain('Nominative Sentences')
    expect(names[1].text()).toBe('Gender Agreement in Pronouns')
    expect(names[2].text()).toBe('Number: Singular, Dual, Plural')
  })

  it('renders an icon in each card header', () => {
    const wrapper = getWrapper()
    const icons = wrapper.findAll('[data-testid^="grammar-topic-icon-"]')
    expect(icons).toHaveLength(3)
    icons.forEach((icon) => {
      expect(icon.find('svg').exists()).toBe(true)
    })
  })

  it('renders the coming-soon fallback card when the section has no topics', () => {
    const wrapper = getWrapper(makeEmptyGrammarSection())
    const fallback = wrapper.find('[data-testid="grammar-empty"]')
    expect(fallback.exists()).toBe(true)
    expect(fallback.text()).toBe('Content coming soon.')
    expect(wrapper.findAll('[data-testid^="grammar-topic-card-"]')).toHaveLength(0)
  })

  it('renders the coming-soon fallback when topics are nameless placeholders', () => {
    const wrapper = getWrapper(makePlaceholderGrammarSection())
    expect(wrapper.find('[data-testid="grammar-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="grammar-empty"]').text()).toBe('Content coming soon.')
    expect(wrapper.findAll('[data-testid^="grammar-topic-card-"]')).toHaveLength(0)
  })

  it('renders a description paragraph for each topic', () => {
    const wrapper = getWrapper()
    const descriptions = wrapper.findAll('[data-testid^="grammar-topic-description-"]')
    expect(descriptions).toHaveLength(3)
    expect(descriptions[0].text()).toBe(
      'A sentence starting with a noun (ism) followed by a predicate (khabar). Common pattern: Pronoun + Noun/Adjective'
    )
    expect(descriptions[1].text()).toBe(
      'Arabic pronouns encode gender. The verb/adjective must match the pronoun\'s gender.'
    )
    expect(descriptions[2].text()).toBe(
      'Arabic has three grammatical numbers: singular (مفرد), dual (مثنى), and plural (جمع).'
    )
  })

  it('renders an example row for each example with the Arabic and English text', () => {
    const wrapper = getWrapper()
    expect(wrapper.findAll('[data-testid^="grammar-example-row-0-"]')).toHaveLength(4)
    expect(wrapper.findAll('[data-testid^="grammar-example-row-1-"]')).toHaveLength(4)
    expect(wrapper.findAll('[data-testid^="grammar-example-row-2-"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="grammar-example-arabic-0-0"]').text()).toBe('أَنَا مُسْلِم')
    expect(wrapper.find('[data-testid="grammar-example-english-0-0"]').text()).toBe('I am a Muslim')
    expect(wrapper.find('[data-testid="grammar-example-arabic-1-2"]').text()).toBe('هُوَ مُسْلِمٌ')
    expect(wrapper.find('[data-testid="grammar-example-english-1-2"]').text()).toBe('He is Muslim (m.)')
    expect(wrapper.find('[data-testid="grammar-example-arabic-2-1"]').text()).toBe('أَخَوَان')
    expect(wrapper.find('[data-testid="grammar-example-english-2-1"]').text()).toBe('two brothers (dual)')
  })

  it('renders the Arabic example text with dir="rtl"', () => {
    const wrapper = getWrapper()
    const arabicElements = wrapper.findAll('[data-testid^="grammar-example-arabic-"]')
    expect(arabicElements.length).toBeGreaterThan(0)
    arabicElements.forEach((element) => {
      expect(element.attributes('dir')).toBe('rtl')
    })
  })

  it('renders no interactive controls or playback events (informational section)', () => {
    const wrapper = getWrapper()
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.emitted()).toEqual({})
  })

  it('places the Arabic text before the English text in each example pair', () => {
    const wrapper = getWrapper()
    const pairs = wrapper.findAll('[data-testid^="grammar-example-row-"]')
    expect(pairs.length).toBeGreaterThan(0)
    pairs.forEach((pair) => {
      const paragraphs = pair.findAll('p')
      expect(paragraphs).toHaveLength(2)
      expect(paragraphs[0].attributes('dir')).toBe('rtl')
      expect(paragraphs[1].attributes('dir')).toBeUndefined()
    })
  })
})
