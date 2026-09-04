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

  it('renders female speaker badges with pink gradient', async () => {
    const wrapper = getWrapper()
    // Switch to Scene 2 to see Khadija (female)
    const tabs = wrapper.findAll('[data-testid="scene-tab"]')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    const badges = wrapper.findAll('[data-testid^="speaker-badge-"]')
    // Khadija is female → pink gradient
    const khadijaBadge = badges.find(badge => badge.text().includes('Khadija'))
    expect(khadijaBadge).toBeDefined()
    expect(khadijaBadge?.classes()).toContain('from-pink-700')
  })
})
// ─── Arabic RTL Rendering ─────────────────────────────────────────────────

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
// ─── Active Line Highlighting ──────────────────────────────────────────────

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
// ─── Comparison Card ───────────────────────────────────────────────────────

describe('LessonDialogue | comparison card', () => {
  it('renders a comparison card when there are multiple scenes', () => {
    const wrapper = getWrapper()
    const comparisonCard = wrapper.find('[data-testid="comparison-card"]')
    expect(comparisonCard.exists()).toBe(true)
  })

  it('renders key differences text in the comparison card', () => {
    const wrapper = getWrapper()
    const comparisonCard = wrapper.find('[data-testid="comparison-card"]')
    expect(comparisonCard.text()).toContain('Gender suffixes')
    expect(comparisonCard.text()).toContain('Verb conjugation')
    expect(comparisonCard.text()).toContain('Welcome phrases')
  })

  it('does not render a comparison card when there is only one scene', () => {
    const singleSceneSection: SectionDefinition = {
      name: 'Dialogue',
      type: 'dialogue',
      content: {
        type: 'dialogue',
        scenes: [
          {
            label: 'Single Scene',
            lines: [
              { speaker: 'A', arabic: 'مرحبا', english: 'Hello' }
            ]
          }
        ]
      },
      _lessonId: 'a1-01',
      get items(): never[] { return [] }
    }
    const wrapper = shallowMount(LessonDialogue, {
      props: { section: singleSceneSection }
    })
    const comparisonCard = wrapper.find('[data-testid="comparison-card"]')
    expect(comparisonCard.exists()).toBe(false)
  })
})
