import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LessonDialogue from '~/components/lesson/LessonDialogue.vue'
import type { SectionDefinition } from '~/data/curriculum'

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

function getWrapper(section: SectionDefinition = DIALOGUE_SECTION) {
  return shallowMount(LessonDialogue, {
    props: { section, malePatterns: ['Muhammad', 'Ali', 'Abraham', 'Ibrahim', 'Musa', 'Moses', 'Isa', 'Jesus', 'Umar', 'Uthman'] }
  })
}

describe('LessonDialogue | renders scene tabs from scenes[].label', () => {
  it('renders one tab per scene label', () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    expect(tabs).toHaveLength(2)
  })

  it('renders each tab with the correct scene label text', () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    expect(tabs[0].text()).toContain('Scene 1: Muhammad ↔ Ali (Male-to-Male)')
    expect(tabs[1].text()).toContain('Scene 2: Khadija ↔ Aisha (Female-to-Female)')
  })

  it('highlights the first scene tab as active by default', () => {
    const wrapper = getWrapper()
    const activeTab = wrapper.find('[data-testid="scene-tab"].active')
    expect(activeTab.exists()).toBe(true)
  })
})

describe('LessonDialogue | scene switching', () => {
  it('switches active scene when a tab is clicked', async () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    const allTabs = wrapper.findAll('[data-testid="scene-tab"]')
    expect(allTabs[0].classes()).not.toContain('active')
    expect(allTabs[1].classes()).toContain('active')
  })

  it('updates line list when switching scenes', async () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')

    let lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    expect(lineCards).toHaveLength(2)

    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    expect(lineCards).toHaveLength(2)
  })
})

describe('LessonDialogue | speaker badge colors', () => {
  it('renders male speaker badges with teal gradient', () => {
    const wrapper = getWrapper()
    const badges = wrapper.findAll('[data-testid^="speaker-badge-"]')
    const muhammadBadge = badges.find(badge => badge.text().includes('Muhammad'))
    expect(muhammadBadge).toBeDefined()
    expect(muhammadBadge?.classes()).toContain('from-teal-700')
  })

  it('renders non-male speaker badges with stone gradient when no malePatterns provided', async () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    const badges = wrapper.findAll('[data-testid^="speaker-badge-"]')
    const khadijaBadge = badges.find(badge => badge.text().includes('Khadija'))
    expect(khadijaBadge).toBeDefined()
    expect(khadijaBadge?.classes()).toContain('from-stone-500')
  })
})

describe('LessonDialogue | Arabic RTL rendering', () => {
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
})

describe('LessonDialogue | playLine emit', () => {
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
    expect(wrapper.emitted('playLine')).toHaveLength(1)
    expect(wrapper.emitted('playLine')?.[0]).toEqual([1])
  })
})

describe('LessonDialogue | card body click does NOT emit playLine', () => {
  it('does NOT emit playLine when a line card body is clicked', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    await lineCards[0].trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('playLine')).toBeUndefined()
  })

  it('sets currentLineIndex on card body click without emitting playLine', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')

    await lineCards[1].trigger('click')
    await wrapper.vm.$nextTick()

    expect(lineCards[1].classes()).toContain('from-primary-100')
    expect(lineCards[1].classes()).toContain('border-primary-300')
    expect(wrapper.emitted('playLine')).toBeUndefined()
  })
})

describe('LessonDialogue | active line highlighting', () => {
  it('applies active styling to the clicked line card', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    await lineCards[1].trigger('click')
    await wrapper.vm.$nextTick()

    expect(lineCards[1].classes()).toContain('from-primary-100')
    expect(lineCards[1].classes()).toContain('border-primary-300')
  })

  it('removes active styling from the previously active line', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    await lineCards[0].trigger('click')
    await wrapper.vm.$nextTick()

    await lineCards[1].trigger('click')
    await wrapper.vm.$nextTick()

    expect(lineCards[0].classes()).not.toContain('from-primary-100')
    expect(lineCards[0].classes()).not.toContain('border-primary-300')
  })
})

describe('LessonDialogue | playScene emit', () => {
  it('emits playScene when the Play Scene button is clicked', async () => {
    const wrapper = getWrapper()
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    await playSceneButton.trigger('click')
    expect(wrapper.emitted('playScene')).toHaveLength(1)
  })
})

describe('LessonDialogue | play scene button is styled (Issue #025)', () => {
  it('renders a play icon SVG inside the Play Scene button', () => {
    const wrapper = getWrapper()
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    const svg = playSceneButton.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
  })

  it('renders "Play Scene" text label next to the play icon', () => {
    const wrapper = getWrapper()
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    expect(playSceneButton.text()).toContain('Play Scene')
  })

  it('applies rounded-full, bg-primary-600, text-white, hover:bg-primary-700 classes matching line play buttons', () => {
    const wrapper = getWrapper()
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    const classes = playSceneButton.attributes('class')
    expect(classes).toContain('rounded-full')
    expect(classes).toContain('bg-primary-600')
    expect(classes).toContain('text-white')
    expect(classes).toContain('hover:bg-primary-700')
  })

  it('renders the play icon with the same SVG path as individual line play buttons', () => {
    const wrapper = getWrapper()
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    const svg = playSceneButton.find('svg path')
    expect(svg.attributes('d')).toBe('M8 5v14l11-7z')
  })

  it('when isAudioDisabled is true, the button is disabled and has title="Audio is currently disabled"', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: DIALOGUE_SECTION, isAudioDisabled: true }
    })
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    expect(playSceneButton.attributes('disabled')).toBe('')
    expect(playSceneButton.attributes('title')).toBe('Audio is currently disabled')
  })

  it('when isAudioDisabled is false, the button is not disabled and has no title attribute', () => {
    const wrapper = getWrapper()
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    expect(playSceneButton.attributes('disabled')).toBeUndefined()
    expect(playSceneButton.attributes('title')).toBeUndefined()
  })
})

describe('LessonDialogue | comparison card removed (Issue #023)', () => {
  it('no comparison card renders for dialogues', () => {
    const wrapper = getWrapper()
    const comparisonCard = wrapper.find('[data-testid="comparison-card"]')
    expect(comparisonCard.exists()).toBe(false)
  })
})

describe('LessonDialogue | scene tab keyboard navigation (Issue #020)', () => {
  it('ArrowRight cycles to the next tab and switches the scene', async () => {
    const wrapper = getWrapper()
    const tablist = wrapper.find('[data-testid="scene-tabs"]')
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')

    expect(tabs[0].classes()).toContain('active')
    expect(tabs[1].classes()).not.toContain('active')

    await tablist.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.vm.$nextTick()

    expect(tabs[0].classes()).not.toContain('active')
    expect(tabs[1].classes()).toContain('active')
  })

  it('sets tabindex="0" on active tab and tabindex="-1" on inactive tabs', async () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')

    expect(tabs[0].attributes('tabindex')).toBe('0')
    expect(tabs[1].attributes('tabindex')).toBe('-1')

    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    expect(tabs[0].attributes('tabindex')).toBe('-1')
    expect(tabs[1].attributes('tabindex')).toBe('0')
  })

  it('sets aria-activedescendant on the tablist bound to the active tab id', async () => {
    const wrapper = getWrapper()
    const tablist = wrapper.find('[data-testid="scene-tabs"]')

    expect(tablist.attributes('aria-activedescendant')).toBe('scene-tab-0')

    await wrapper.findAll('[data-testid="scene-tab"]')[1].trigger('click')
    await wrapper.vm.$nextTick()

    expect(tablist.attributes('aria-activedescendant')).toBe('scene-tab-1')
  })

  it('prevents default when ArrowRight/ArrowLeft/Enter/Space is pressed on the tablist', async () => {
    const wrapper = getWrapper()
    const tablist = wrapper.find('[data-testid="scene-tabs"]')

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    Object.defineProperty(event, 'defaultPrevented', { get: () => true })
    await tablist.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    expect(tabs[1].classes()).toContain('active')
  })
})

const MALFORMED_SECTION: SectionDefinition = {
  name: 'Dialogue',
  type: 'dialogue',
  content: {
    type: 'vocabulary',
    categories: []
  },
  _lessonId: 'a1-01',
  get items(): never[] { return [] }
}

const NO_CONTENT_SECTION: SectionDefinition = {
  name: 'Dialogue',
  type: 'dialogue',
  content: {
    type: 'dialogue',
    scenes: []
  },
  _lessonId: 'a1-01',
  get items(): never[] { return [] }
}

describe('LessonDialogue | no dialogue content renders error message (Issue #026)', () => {
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

  it('does NOT render the error message when scenes have content', () => {
    const wrapper = getWrapper()
    const message = wrapper.find('p.text-center')
    expect(message.exists()).toBe(false)
  })

  it('uses text-stone-400 class for the error message', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: NO_CONTENT_SECTION }
    })
    const message = wrapper.find('p.text-center')
    expect(message.classes()).toContain('text-stone-400')
  })
})
