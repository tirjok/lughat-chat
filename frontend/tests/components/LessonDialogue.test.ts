import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LessonDialogue from '~/components/lesson/LessonDialogue.vue'
import type { SectionDefinition } from '~/data/curriculum'

const MALE_PATTERNS = ['Muhammad', 'Ali', 'Abraham', 'Ibrahim', 'Musa', 'Moses', 'Isa', 'Jesus', 'Umar', 'Uthman']

const DIALOGUE_SECTION: SectionDefinition = {
  name: 'Dialogue',
  type: 'dialogue',
  content: {
    type: 'dialogue',
    scenes: [
      {
        label: 'Scene 1: Muhammad ↔ Ali',
        lines: [
          { speaker: 'Muhammad', arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ', english: 'Peace be upon you and Allah\'s mercy', notes: 'Formal Islamic greeting' },
          { speaker: 'Ali', arabic: 'وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ', english: 'And upon you be peace and Allah\'s mercy and blessings', notes: 'Complete response — adds \'and His blessings\'' }
        ]
      },
      {
        label: 'Scene 2: Khadija ↔ Aisha',
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

const MALFORMED_SECTION: SectionDefinition = {
  name: 'Dialogue',
  type: 'dialogue',
  content: { type: 'vocabulary', categories: [] },
  _lessonId: 'a1-01',
  get items(): never[] { return [] }
}

const NO_CONTENT_SECTION: SectionDefinition = {
  name: 'Dialogue',
  type: 'dialogue',
  content: { type: 'dialogue', scenes: [] },
  _lessonId: 'a1-01',
  get items(): never[] { return [] }
}

function getWrapper(section: SectionDefinition = DIALOGUE_SECTION) {
  return shallowMount(LessonDialogue, {
    props: { section, malePatterns: MALE_PATTERNS }
  })
}

describe('LessonDialogue', () => {
  it('renders one tab per scene label', () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    expect(tabs).toHaveLength(2)
  })

  it('renders each tab with the correct scene label text', () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    expect(tabs[0].text()).toContain('Scene 1: Muhammad ↔ Ali')
    expect(tabs[1].text()).toContain('Scene 2: Khadija ↔ Aisha')
  })

  it('highlights the first scene tab as active by default', () => {
    const wrapper = getWrapper()
    const activeTab = wrapper.find('[data-testid="scene-tab"].active')
    expect(activeTab.exists()).toBe(true)
  })

  it('switches active scene when a tab is clicked', async () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    await tabs[1].trigger('click')
    await nextTick()

    const allTabs = wrapper.findAll('[data-testid="scene-tab"]')
    expect(allTabs[0].classes()).not.toContain('active')
    expect(allTabs[1].classes()).toContain('active')
  })

  it('shows line cards for the active scene', () => {
    const wrapper = getWrapper()
    expect(wrapper.findAll('[data-testid^="line-card-"]')).toHaveLength(2)
  })

  it('shows line cards when switching scenes', async () => {
    const wrapper = getWrapper()
    await wrapper.findAll('[data-testid="scene-tab"]')[1].trigger('click')
    await nextTick()
    expect(wrapper.findAll('[data-testid^="line-card-"]')).toHaveLength(2)
  })

  it('renders male speaker badges with teal gradient', () => {
    const wrapper = getWrapper()
    const muhammadBadge = wrapper.findAll('[data-testid^="speaker-badge-"]').find(badge => badge.text().includes('Muhammad'))
    expect(muhammadBadge?.classes()).toContain('from-teal-700')
  })

  it('renders non-male speaker badges with stone gradient', async () => {
    const wrapper = getWrapper()
    await wrapper.findAll('[data-testid="scene-tab"]')[1].trigger('click')
    await nextTick()

    const khadijaBadge = wrapper.findAll('[data-testid^="speaker-badge-"]').find(badge => badge.text().includes('Khadija'))
    expect(khadijaBadge?.classes()).toContain('from-stone-500')
  })

  it('renders Arabic text with dir="rtl"', () => {
    const wrapper = getWrapper()
    const arabicTexts = wrapper.findAll('[data-testid^="line-card-"]')
    arabicTexts.forEach((card) => {
      const p = card.find('p[dir="rtl"]')
      expect(p.exists()).toBe(true)
    })
  })

  it('renders Arabic text with Cairo font class', () => {
    const wrapper = getWrapper()
    const arabicElements = wrapper.findAll('p[dir="rtl"]')
    expect(arabicElements.length).toBeGreaterThan(0)
    arabicElements.forEach((el) => {
      expect(el.classes()).toContain('font-arabic')
    })
  })

  it('emits playLine(index) when a line play button is clicked', async () => {
    const wrapper = getWrapper()
    const playButtons = wrapper.findAll('[data-testid^="play-line-"]')
    await playButtons[0].trigger('click')
    expect(wrapper.emitted('playLine')).toHaveLength(1)
    expect(wrapper.emitted('playLine')?.[0]).toEqual([0])
  })

  it('emits playLine with the correct index for each line', async () => {
    const wrapper = getWrapper()
    const playButtons = wrapper.findAll('[data-testid^="play-line-"]')
    await playButtons[1].trigger('click')
    expect(wrapper.emitted('playLine')?.[0]).toEqual([1])
  })

  it('selects the line card on body click without emitting playLine', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    await lineCards[1].trigger('click')
    await nextTick()

    expect(wrapper.emitted('playLine')).toBeUndefined()
    expect(lineCards[1].classes()).toContain('from-primary-100')
  })

  it('applies active styling to the clicked line card', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    await lineCards[1].trigger('click')
    await nextTick()

    expect(lineCards[1].classes()).toContain('from-primary-100')
    expect(lineCards[1].classes()).toContain('border-primary-300')
  })

  it('removes active styling from the previously active line', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    await lineCards[0].trigger('click')
    await nextTick()

    await lineCards[1].trigger('click')
    await nextTick()

    expect(lineCards[0].classes()).not.toContain('from-primary-100')
    expect(lineCards[0].classes()).not.toContain('border-primary-300')
  })

  it('emits playScene when the Play Scene button is clicked', async () => {
    const wrapper = getWrapper()
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    await playSceneButton.trigger('click')
    expect(wrapper.emitted('playScene')).toHaveLength(1)
  })

  it('disables the Play Scene button when audio is disabled', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: DIALOGUE_SECTION, isAudioDisabled: true }
    })
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    expect(playSceneButton.attributes('disabled')).toBe('')
    expect(playSceneButton.attributes('title')).toBe('Audio is currently disabled')
  })

  it('does not disable the Play Scene button when audio is enabled', () => {
    const wrapper = getWrapper()
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    expect(playSceneButton.attributes('disabled')).toBeUndefined()
    expect(playSceneButton.attributes('title')).toBeUndefined()
  })

  it('cycles to the next tab with ArrowRight', async () => {
    const wrapper = getWrapper()
    const tablist = wrapper.find('[data-testid="scene-tabs"]')
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')

    await tablist.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()

    expect(tabs[1].classes()).toContain('active')
  })

  it('cycles to the previous tab with ArrowLeft', async () => {
    const wrapper = getWrapper()
    const tablist = wrapper.find('[data-testid="scene-tabs"]')
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')

    await tabs[1].trigger('click')
    await nextTick()

    await tablist.trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()

    expect(tabs[0].classes()).toContain('active')
  })

  it('sets tabindex="0" on active tab and tabindex="-1" on inactive tabs', () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    expect(tabs[0].attributes('tabindex')).toBe('0')
    expect(tabs[1].attributes('tabindex')).toBe('-1')
  })

  it('sets aria-activedescendant bound to the active tab id', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('[data-testid="scene-tabs"]').attributes('aria-activedescendant')).toBe('scene-tab-0')
  })

  it('renders "No dialogue content for this lesson." when content.type is not dialogue', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: MALFORMED_SECTION }
    })
    const message = wrapper.find('p.text-center')
    expect(message.exists()).toBe(true)
    expect(message.text()).toBe('No dialogue content for this lesson.')
  })

  it('renders "No dialogue content for this lesson." when scenes array is empty', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: NO_CONTENT_SECTION }
    })
    const message = wrapper.find('p.text-center')
    expect(message.exists()).toBe(true)
    expect(message.text()).toBe('No dialogue content for this lesson.')
  })

  it('does not render the error message when scenes have content', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('p.text-center').exists()).toBe(false)
  })

  it('uses text-stone-400 class for the error message', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: NO_CONTENT_SECTION }
    })
    expect(wrapper.find('p.text-center').classes()).toContain('text-stone-400')
  })
})

describe('LessonDialogue | keyboard and scroll', () => {
  it('scrolls into view when a line card body is clicked', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    const scrollCards = wrapper.element.querySelectorAll('[data-testid^="line-card-"]')
    const scrollSpy = vi.spyOn(scrollCards[1] as HTMLElement, 'scrollIntoView')
    await lineCards[1].trigger('click')
    await nextTick()

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('scrolls into view when a play button is clicked', async () => {
    const wrapper = getWrapper()
    const playButtons = wrapper.findAll('[data-testid^="play-line-"]')
    const scrollCards = wrapper.element.querySelectorAll('[data-testid^="line-card-"]')
    const scrollSpy = vi.spyOn(scrollCards[0] as HTMLElement, 'scrollIntoView')
    await playButtons[0].trigger('click')
    await nextTick()

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })
})

describe('LessonDialogue | playing indicator', () => {
  it('applies a pulse animation class to the line card matching playingLineIndex', async () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: DIALOGUE_SECTION, malePatterns: MALE_PATTERNS, playingLineIndex: 0 }
    })
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')

    await nextTick()

    expect(lineCards[0].classes()).toContain('playing')
    expect(lineCards[1].classes()).not.toContain('playing')
  })

  it('removes the pulse animation class when playingLineIndex is null', async () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: DIALOGUE_SECTION, malePatterns: MALE_PATTERNS, playingLineIndex: null }
    })
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')

    await nextTick()

    lineCards.forEach((card) => {
      expect(card.classes()).not.toContain('playing')
    })
  })

  it('keeps the playing line highlighted with the active-line gradient', async () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: DIALOGUE_SECTION, malePatterns: MALE_PATTERNS, playingLineIndex: 1 }
    })
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')

    await nextTick()

    expect(lineCards[1].classes()).toContain('from-primary-100')
    expect(lineCards[1].classes()).toContain('playing')
  })
})
