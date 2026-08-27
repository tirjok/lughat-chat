import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LessonExpressions from '~/components/LessonExpressions.vue'
import type { SectionDefinition } from '~/data/curriculum'

function makeExpressionSection(): SectionDefinition {
  return {
    name: 'Expressions',
    type: 'expressions',
    content: {
      type: 'expressions',
      expressions: [
        { arabic: 'السَّلَامُ عَلَيْكُمْ', english: 'Peace be upon you' },
        { arabic: 'كَيْفَ حَالُكَ؟', english: 'How are you? (male)' },
        { arabic: 'مَرْحَبًا', english: 'Welcome' }
      ]
    },
    _lessonId: 'a1-01',
    get items(): never[] { return [] }
  }
}

function getWrapper(section: SectionDefinition = makeExpressionSection()) {
  return shallowMount(LessonExpressions, {
    props: { section }
  })
}

describe('LessonExpressions', () => {
  it('renders expression cards in a 2-column CSS grid matching the number of expressions', () => {
    const wrapper = getWrapper()
    const cards = wrapper.findAll('[data-testid^="expression-card-"]')
    expect(cards).toHaveLength(3)
  })

  it('renders Arabic text with dir="rtl" in each card', () => {
    const wrapper = getWrapper()
    const arabicTexts = wrapper.findAll('[data-testid="expression-arabic"]')
    expect(arabicTexts).toHaveLength(3)
    arabicTexts.forEach((card) => {
      expect(card.attributes('dir')).toBe('rtl')
    })
  })

  it('renders English text in each card', () => {
    const wrapper = getWrapper()
    const englishTexts = wrapper.findAll('[data-testid="expression-english"]')
    expect(englishTexts).toHaveLength(3)
    expect(englishTexts[0].text()).toBe('Peace be upon you')
    expect(englishTexts[1].text()).toBe('How are you? (male)')
    expect(englishTexts[2].text()).toBe('Welcome')
  })

  it('emits playExpression(index) when a play button is clicked', () => {
    const wrapper = getWrapper()
    const buttons = wrapper.findAll('[data-testid^="play-expression-"]')
    buttons[0].trigger('click')
    expect(wrapper.emitted('playExpression')).toHaveLength(1)
    expect(wrapper.emitted('playExpression')?.[0]).toEqual([0])
  })

  it('emits the correct index for each expression card', () => {
    const wrapper = getWrapper()
    const buttons = wrapper.findAll('[data-testid^="play-expression-"]')
    buttons.forEach((button) => {
      button.trigger('click')
    })
    const emitted = wrapper.emitted('playExpression') as unknown[][]
    expect(emitted).toHaveLength(3)
    expect(emitted[0]).toEqual([0])
    expect(emitted[1]).toEqual([1])
    expect(emitted[2]).toEqual([2])
  })
})
