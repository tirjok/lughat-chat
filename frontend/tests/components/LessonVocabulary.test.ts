import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LessonVocabulary from '~/components/LessonVocabulary.vue'
import type { SectionDefinition } from '~/data/curriculum'

function makeVocabSection(): SectionDefinition {
  return {
    name: 'Vocabulary',
    type: 'vocabulary',
    content: {
      type: 'vocabulary',
      categories: [
        {
          label: 'Salutations',
          words: [
            { arabic: 'تَحِيَّة', english: 'salutation/greeting', singular: 'تَحِيَّة', plural: 'تَحِيَاتٌ' },
            { arabic: 'سَلَام', english: 'peace', singular: 'سَلَام', plural: 'سُلُومٌ' }
          ]
        },
        {
          label: 'Nouns',
          words: [
            { arabic: 'دَرْس', english: 'lesson', singular: 'دَرْس', plural: 'دُرُوسٌ' },
            { arabic: 'مَسْجِد', english: 'mosque', singular: 'مَسْجِد', plural: 'مَسَاجِد' }
          ]
        }
      ]
    },
    _lessonId: 'a1-01',
    get items(): never[] { return [] }
  }
}

function makeSimpleVocabSection(): SectionDefinition {
  return {
    name: 'Vocabulary',
    type: 'vocabulary',
    content: {
      type: 'vocabulary',
      categories: [{
        label: 'Simple Words',
        words: [
          { arabic: 'مَرْحَبًا', english: 'hello' },
          { arabic: 'شُكْرًا', english: 'thank you' }
        ]
      }]
    },
    _lessonId: 'a1-01',
    get items(): never[] { return [] }
  }
}

function getWrapper(section: SectionDefinition = makeVocabSection()) {
  return shallowMount(LessonVocabulary, {
    props: { section }
  })
}

describe('LessonVocabulary', () => {
  it('renders one header per category label', () => {
    const wrapper = getWrapper()
    const headers = wrapper.findAll('[data-testid="vocab-category-header"]')
    expect(headers).toHaveLength(2)
    expect(headers[0].text()).toBe('Salutations')
    expect(headers[1].text()).toBe('Nouns')
  })

  it('renders a table per category', () => {
    const wrapper = getWrapper()
    const tables = wrapper.findAll('table')
    expect(tables).toHaveLength(2)
  })

  it('renders word rows with Arabic and English text', () => {
    const wrapper = getWrapper()
    const arabicCells = wrapper.findAll('[data-testid="vocab-arabic-cell"]')
    const englishCells = wrapper.findAll('[data-testid="vocab-english-cell"]')
    expect(arabicCells).toHaveLength(4)
    expect(englishCells).toHaveLength(4)
  })

  it('renders Arabic text in RTL direction', () => {
    const wrapper = getWrapper()
    const arabicCells = wrapper.findAll('[data-testid="vocab-arabic-cell"]')
    arabicCells.forEach(cell => {
      expect(cell.attributes('dir')).toBe('rtl')
    })
  })

  it('renders play buttons for each word', () => {
    const wrapper = getWrapper()
    const playButtons = wrapper.findAll('[data-testid^="play-word-"]')
    expect(playButtons).toHaveLength(4)
  })

  it('hides Singular and Plural columns when no words have them', () => {
    const wrapper = shallowMount(LessonVocabulary, {
      props: { section: makeSimpleVocabSection() }
    })
    const singularCells = wrapper.findAll('[data-testid="vocab-singular-cell"]')
    const pluralCells = wrapper.findAll('[data-testid="vocab-plural-cell"]')
    expect(singularCells).toHaveLength(0)
    expect(pluralCells).toHaveLength(0)
  })

  it('shows Singular and Plural columns when words have them', () => {
    const wrapper = getWrapper()
    const singularCells = wrapper.findAll('[data-testid="vocab-singular-cell"]')
    const pluralCells = wrapper.findAll('[data-testid="vocab-plural-cell"]')
    expect(singularCells).toHaveLength(4)
    expect(pluralCells).toHaveLength(4)
  })

  it('emits playWord(index) when a play button is clicked', () => {
    const wrapper = getWrapper()
    const buttons = wrapper.findAll('[data-testid^="play-word-"]')
    buttons[0].trigger('click')
    expect(wrapper.emitted('playWord')).toHaveLength(1)
    expect(wrapper.emitted('playWord')?.[0]).toEqual([0])
  })

  it('emits the correct index for each word across categories', () => {
    const wrapper = getWrapper()
    const buttons = wrapper.findAll('[data-testid^="play-word-"]')
    buttons.forEach(button => {
      button.trigger('click')
    })
    const emitted = wrapper.emitted('playWord') as unknown[][]
    expect(emitted).toHaveLength(4)
    expect(emitted[0]).toEqual([0])
    expect(emitted[1]).toEqual([1])
    expect(emitted[2]).toEqual([2])
    expect(emitted[3]).toEqual([3])
  })
})
