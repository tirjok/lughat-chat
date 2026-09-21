import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LessonHero from '~/components/lesson/LessonHero.vue'

function getWrapper(overrides: Record<string, unknown> = {}): ReturnType<typeof shallowMount<InstanceType<typeof LessonHero>>> {
  return shallowMount(LessonHero, {
    props: {
      level: 'A1',
      lessonNumber: 1,
      arabicTitle: 'مرحبا',
      estimatedTime: '15 min',
      scenes: '3 scenes',
      isReady: true,
      ...overrides
    }
  })
}

// ─── Status Pills ───────────────────────────────────────────────────

describe('LessonHero | status pills', () => {
  it('renders the level pill', async () => {
    const wrapper = getWrapper({ level: 'B2' })
    await nextTick()

    const levelPill = wrapper.find('span.px-3.py-1.bg-white\\/20')
    expect(levelPill.text()).toContain('LEVEL B2')
  })

  it('renders the lesson number pill', async () => {
    const wrapper = getWrapper({ lessonNumber: 5 })
    await nextTick()

    const lessonPill = wrapper.find('span.px-3.py-1.bg-gold-400\\/90')
    expect(lessonPill.text()).toContain('LESSON 5')
  })

  it('shows the ready indicator when model is ready', async () => {
    const wrapper = getWrapper({ isReady: true })
    await nextTick()

    const readyIndicator = wrapper.find('span.px-3.py-1.bg-green-400\\/90')
    expect(readyIndicator.text()).toContain('Ready')
  })

  it('hides the ready indicator when model is not ready', async () => {
    const wrapper = getWrapper({ isReady: false })
    await nextTick()

    const readyIndicator = wrapper.find('span.px-3.py-1.bg-green-400\\/90')
    expect(readyIndicator.exists()).toBe(false)
  })
})

// ─── Metadata Row ───────────────────────────────────────────────────

describe('LessonHero | metadata row', () => {
  it('renders estimated time when provided', async () => {
    const wrapper = getWrapper({ estimatedTime: '20 min' })
    await nextTick()

    const metadataRow = wrapper.find('[class*="flex-wrap"]')
    expect(metadataRow.text()).toContain('20 min')
  })

  it('hides metadata row when no estimatedTime or scenes', async () => {
    const wrapper = getWrapper({ estimatedTime: undefined, scenes: undefined })
    await nextTick()

    const metadataRow = wrapper.find('[class*="flex-wrap"]')
    expect(metadataRow.exists()).toBe(false)
  })

  it('renders scenes with microphone icon', async () => {
    const wrapper = getWrapper({ scenes: '4 scenes' })
    await nextTick()

    const metadataRow = wrapper.find('[class*="flex-wrap"]')
    const sceneSpans = metadataRow.findAll('[class*="flex items-center gap-1.5"]')
    const scenesMatch = sceneSpans.find(s => s.text().includes('scenes'))
    expect(scenesMatch).toBeDefined()
    expect(scenesMatch!.find('svg').exists()).toBe(true)
  })
})

// ─── Props Reflection ───────────────────────────────────────────────────

describe('LessonHero | props are reflected in rendered output', () => {
  it('all props produce visible output in the DOM', async () => {
    const wrapper = shallowMount(LessonHero, {
      props: {
        level: 'A2',
        lessonNumber: 3,
        title: 'Numbers and Counting',
        arabicTitle: 'الأَعْدَادُ',
        estimatedTime: '20 min',
        scenes: '5 scenes',
        isReady: true
      }
    })
    await nextTick()

    const html = wrapper.html()

    // Level
    expect(html).toContain('LEVEL A2')
    // Lesson number
    expect(html).toContain('LESSON 3')
    // Arabic title
    expect(html).toContain('الأَعْدَادُ')
    // Metadata
    expect(html).toContain('20 min')
    expect(html).toContain('5 scenes')
    // Ready indicator
    expect(html).toContain('Ready')
  })

  it('renders with numeric lessonNumber', async () => {
    const wrapper = getWrapper({ lessonNumber: 7, isReady: false })
    await nextTick()

    expect(wrapper.html()).toContain('LESSON 7')
  })

  it('renders with string lessonNumber', async () => {
    const wrapper = getWrapper({ lessonNumber: '7', isReady: false })
    await nextTick()

    expect(wrapper.html()).toContain('LESSON 7')
  })
})

// ─── Dark Mode ──────────────────────────────────────────────────────────

describe('LessonHero | dark mode support', () => {
  it('applies dark background and border on dark mode', async () => {
    const wrapper = getWrapper({ isReady: false })
    await nextTick()

    const outer = wrapper.find('[class*="rounded-2xl"]')
    const classes = outer.classes()
    expect(classes).toContain('dark:bg-stone-900')
    expect(classes).toContain('dark:border-stone-700')
  })
})
