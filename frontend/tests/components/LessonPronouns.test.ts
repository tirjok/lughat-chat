import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LessonPronouns from '~/components/lesson/LessonPronouns.vue'
import type { SectionDefinition } from '~/data/curriculum'

function makePronounSection(): SectionDefinition {
  return {
    name: 'Pronouns',
    type: 'pronouns',
    content: {
      type: 'pronouns',
      pronouns: [
        { arabic: 'أَنَا', english: 'I', example: 'أَنَا أَخٌ / أُخْت' },
        { arabic: 'أَنْتَ', english: 'you (male)', example: 'أَنْتَ أَخ' },
        { arabic: 'أَنْتِ', english: 'you (female)', example: 'أَنْتِ أُخْت' }
      ]
    },
    _lessonId: 'a1-01',
    get items(): never[] { return [] }
  }
}

function getWrapper(section: SectionDefinition = makePronounSection()) {
  return shallowMount(LessonPronouns, {
    props: { section }
  })
}

describe('LessonPronouns', () => {
  it('renders all 5 legend items with correct hex colors', () => {
    const wrapper = getWrapper()
    const legendItems = wrapper.findAll('[data-testid^="pronoun-legend-"]')
    expect(legendItems).toHaveLength(5)

    const coloredDots = wrapper.findAll('[data-testid^="pronoun-legend-"] [style]')
    expect(coloredDots).toHaveLength(5)
    expect(coloredDots[0].attributes('style')).to.contain('rgb(59, 130, 246)')
    expect(coloredDots[1].attributes('style')).to.contain('rgb(236, 72, 153)')
    expect(coloredDots[2].attributes('style')).to.contain('rgb(16, 185, 129)')
    expect(coloredDots[3].attributes('style')).to.contain('rgb(245, 158, 11)')
    expect(coloredDots[4].attributes('style')).to.contain('rgb(139, 92, 246)')
  })

  it('renders cards in a 2-column grid matching the number of pronouns', () => {
    const wrapper = getWrapper()
    const cards = wrapper.findAll('[data-testid^="pronoun-card-"]')
    expect(cards).toHaveLength(3)
  })

  it('applies dir="rtl" to Arabic text in cards', () => {
    const wrapper = getWrapper()
    const arabicTexts = wrapper.findAll('[data-testid^="pronoun-card-"] [data-testid="pronoun-arabic"]')
    expect(arabicTexts).toHaveLength(3)
    arabicTexts.forEach((card) => {
      expect(card.attributes('dir')).toBe('rtl')
    })
  })

  it('applies dir="rtl" to example text in cards', () => {
    const wrapper = getWrapper()
    const examples = wrapper.findAll('[data-testid^="pronoun-card-"] [data-testid="pronoun-example"]')
    expect(examples).toHaveLength(3)
    examples.forEach((card) => {
      expect(card.attributes('dir')).toBe('rtl')
    })
  })

  it('emits playPronoun(index) when a play button is clicked', () => {
    const wrapper = getWrapper()
    const buttons = wrapper.findAll('[data-testid^="play-pronoun-"]')
    buttons[0].trigger('click')
    expect(wrapper.emitted('playPronoun')).toHaveLength(1)
    expect(wrapper.emitted('playPronoun')?.[0]).toEqual([0])
  })

  it('emits the correct index for each pronoun card', () => {
    const wrapper = getWrapper()
    const buttons = wrapper.findAll('[data-testid^="play-pronoun-"]')
    buttons.forEach((button) => {
      button.trigger('click')
    })
    const emitted = wrapper.emitted('playPronoun') as unknown[][]
    expect(emitted).toHaveLength(3)
    expect(emitted[0]).toEqual([0])
    expect(emitted[1]).toEqual([1])
    expect(emitted[2]).toEqual([2])
  })

  it('renders Arabic, English, and example text from pronouns data', () => {
    const wrapper = getWrapper()
    const arabicEls = wrapper.findAll('[data-testid="pronoun-arabic"]')
    const englishEls = wrapper.findAll('[data-testid="pronoun-english"]')
    const exampleEls = wrapper.findAll('[data-testid="pronoun-example"]')
    expect(arabicEls).toHaveLength(3)
    expect(englishEls).toHaveLength(3)
    expect(exampleEls).toHaveLength(3)
    expect(arabicEls[0].text()).toBe('أَنَا')
    expect(arabicEls[1].text()).toBe('أَنْتَ')
    expect(arabicEls[2].text()).toBe('أَنْتِ')
    expect(englishEls[0].text()).toBe('I')
    expect(englishEls[1].text()).toBe('you (male)')
    expect(englishEls[2].text()).toBe('you (female)')
    expect(exampleEls[0].text()).toBe('أَنَا أَخٌ / أُخْت')
    expect(exampleEls[1].text()).toBe('أَنْتَ أَخ')
    expect(exampleEls[2].text()).toBe('أَنْتِ أُخْت')
  })
})
