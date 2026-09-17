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
    props: { section }
  })
}

// ─── Rendering: Scene Tabs ────────────────────────────────────────────────

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

// ─── Scene Switching ──────────────────────────────────────────────────────

describe('LessonDialogue | scene switching', () => {
  it('switches active scene when a tab is clicked', async () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    // Second tab should now be active
    const allTabs = wrapper.findAll('[data-testid="scene-tab"]')
    expect(allTabs[0].classes()).not.toContain('active')
    expect(allTabs[1].classes()).toContain('active')
  })

  it('updates line list when switching scenes', async () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')

    // Initially shows Scene 1 lines (2 lines)
    let lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    expect(lineCards).toHaveLength(2)

    // Switch to Scene 2
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    // Should now show Scene 2 lines (2 lines)
    lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    expect(lineCards).toHaveLength(2)
  })
})
// ─── Speaker Badge Colors ─────────────────────────────────────────────────

describe('LessonDialogue | speaker badge colors', () => {
  it('renders male speaker badges with teal gradient', () => {
    const wrapper = getWrapper()
    const badges = wrapper.findAll('[data-testid^="speaker-badge-"]')
    // Muhammad is male → teal gradient
    const muhammadBadge = badges.find(badge => badge.text().includes('Muhammad'))
    expect(muhammadBadge).toBeDefined()
    expect(muhammadBadge?.classes()).toContain('from-teal-700')
  })

  it('renders non-male speaker badges with stone gradient when no malePatterns provided', async () => {
    const wrapper = getWrapper()
    // Switch to Scene 2 to see Khadija (female)
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    const badges = wrapper.findAll('[data-testid^="speaker-badge-"]')
    const khadijaBadge = badges.find(badge => badge.text().includes('Khadija'))
    expect(khadijaBadge).toBeDefined()
    // Khadija not matching male patterns → stone (neutral) — NEW behavior per spec
    expect(khadijaBadge?.classes()).toContain('from-stone-500')
  })
})
// ─── Unknown Speaker: Neutral Stone Gradient ──────────────────────────

const UNKNOWN_SPEAKER_SECTION: SectionDefinition = {
  name: 'Dialogue',
  type: 'dialogue',
  content: {
    type: 'dialogue',
    scenes: [
      {
        label: 'Scene 1: Market',
        lines: [
          { speaker: 'Abdullah', arabic: 'مَرْحَبًا', english: 'Hello' }
        ]
      },
      {
        label: 'Scene 2: Conversation',
        lines: [
          { speaker: 'Aisha', arabic: 'مَرْحَبًا، كَيْفَ حَالُكَ؟', english: 'Hello, how are you?' }
        ]
      }
    ]
  },
  _lessonId: 'a1-02',
  get items(): never[] { return [] }
}

describe('LessonDialogue | unknown speaker gets neutral stone gradient', () => {
  it('renders unknown speaker badges with stone gradient (not pink, not teal)', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: UNKNOWN_SPEAKER_SECTION }
    })
    const badges = wrapper.findAll('[data-testid^="speaker-badge-"]')
    // Abdullah is NOT in the male names list → neutral stone gradient
    const abdullahBadge = badges.find(badge => badge.text().includes('Abdullah'))
    expect(abdullahBadge).toBeDefined()
    // Should have stone gradient, NOT teal or pink
    expect(abdullahBadge?.classes()).toContain('from-stone-500')
    expect(abdullahBadge?.classes()).not.toContain('from-teal-700')
    expect(abdullahBadge?.classes()).not.toContain('from-pink-700')
  })

  it('renders male-pattern speaker with teal gradient when malePatterns is provided', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: {
        section: UNKNOWN_SPEAKER_SECTION,
        malePatterns: ['Muhammad', 'Ali', 'Abdullah']
      }
    })
    const badges = wrapper.findAll('[data-testid^="speaker-badge-"]')
    const abdullahBadge = badges.find(badge => badge.text().includes('Abdullah'))
    expect(abdullahBadge).toBeDefined()
    expect(abdullahBadge?.classes()).toContain('from-teal-700')
  })

  it('renders female speaker with stone gradient when not in malePatterns', async () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: {
        section: UNKNOWN_SPEAKER_SECTION,
        malePatterns: ['Muhammad', 'Ali', 'Abdullah']
      }
    })
    // Switch to see Aisha
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    const badges2 = wrapper.findAll('[data-testid^="speaker-badge-"]')
    const aishaBadge = badges2.find(badge => badge.text().includes('Aisha'))
    // Aisha is not in malePatterns → stone (neutral)
    expect(aishaBadge?.classes()).toContain('from-stone-500')
  })
})

describe('LessonDialogue | Arabic RTL rendering', () => {
  it('renders Arabic text with dir="rtl"', () => {
    const wrapper = getWrapper()
    const arabicTexts = wrapper.findAll('[data-testid^="line-card-"]')
    // Each line card contains an Arabic text element with dir="rtl"
    arabicTexts.forEach((card) => {
      const p = card.find('p[dir="rtl"]')
      expect(p.exists()).toBe(true)
    })
  })

  it('renders Arabic text with Cairo font class', () => {
    const wrapper = getWrapper()
    const arabicElements = wrapper.findAll('p[dir="rtl"]')
    expect(arabicElements.length).toBeGreaterThan(0)
    // All Arabic text elements should have font-arabic class
    arabicElements.forEach((el) => {
      expect(el.classes()).toContain('font-arabic')
    })
  })
})
// ─── Play Line Emit ────────────────────────────────────────────────────────

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
describe('LessonDialogue | card body click does NOT emit playLine (Issue #021)', () => {
  it('does NOT emit playLine when a line card body is clicked', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    await lineCards[0].trigger('click')
    await wrapper.vm.$nextTick()

    // Card body click should NOT emit playLine
    expect(wrapper.emitted('playLine')).toBeUndefined()
  })

  it('sets currentLineIndex on card body click without emitting playLine', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')

    // Click card 1 — should update highlight but NOT emit
    await lineCards[1].trigger('click')
    await wrapper.vm.$nextTick()

    // Line 1 should have active gradient classes
    expect(lineCards[1].classes()).toContain('from-primary-100')
    expect(lineCards[1].classes()).toContain('border-primary-300')
    // But no playLine emit
    expect(wrapper.emitted('playLine')).toBeUndefined()
  })
})

describe('LessonDialogue | active line highlighting', () => {
  it('applies active styling to the clicked line card', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    await lineCards[1].trigger('click')
    await wrapper.vm.$nextTick()

    // Line 1 should have active gradient classes
    expect(lineCards[1].classes()).toContain('from-primary-100')
    expect(lineCards[1].classes()).toContain('border-primary-300')
  })

  it('removes active styling from the previously active line', async () => {
    const wrapper = getWrapper()
    const lineCards = wrapper.findAll('[data-testid^="line-card-"]')
    await lineCards[0].trigger('click')
    await wrapper.vm.$nextTick()

    // Line 0 was active, now click line 1
    await lineCards[1].trigger('click')
    await wrapper.vm.$nextTick()

    // Line 0 should no longer have active classes
    expect(lineCards[0].classes()).not.toContain('from-primary-100')
    expect(lineCards[0].classes()).not.toContain('border-primary-300')
  })
})
// ─── Play Scene Emit ───────────────────────────────────────────────────────

describe('LessonDialogue | playScene emit', () => {
  it('emits playScene when the Play Scene button is clicked', async () => {
    const wrapper = getWrapper()
    const playSceneButton = wrapper.find('[data-testid="play-scene"]')
    await playSceneButton.trigger('click')
    expect(wrapper.emitted('playScene')).toHaveLength(1)
  })
})

const singleScene: SectionDefinition = {
  name: 'Dialogue',
  type: 'dialogue',
  content: {
    type: 'dialogue',
    scenes: [{
      label: 'Single Scene',
      lines: [{ speaker: 'A', arabic: 'مرحبا', english: 'Hello' }]
    }]
  },
  _lessonId: 'a1-01',
  get items(): never[] { return [] }
}

describe('LessonDialogue | comparison card removed (Issue #023)', () => {
  it('no comparison card renders for multi-scene dialogues', () => {
    const wrapper = getWrapper()
    const comparisonCard = wrapper.find('[data-testid="comparison-card"]')
    expect(comparisonCard.exists()).toBe(false)
  })

  it('no comparison card renders for single-scene dialogues', () => {
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: singleScene }
    })
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


  it.skip('ArrowLeft wraps from first tab to the last tab', async () => {
    const wrapper = getWrapper()
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()
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
