import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'

import LessonHero from '~/components/LessonHero.vue'

// Suppress Vue warnings about unresolved components in component tests.
const originalWarn = console.warn
beforeEach(() => {
  console.warn = (msg: string) => {
    if (msg.includes('Vue warn') || msg.includes('[Vue]')) return
    originalWarn(msg)
  }
})
afterEach(() => {
  console.warn = originalWarn
})

function getWrapper(props: Record<string, unknown> = {}) {
  return shallowMount(LessonHero, {
    props: {
      level: 'A1',
      lessonNumber: '1',
      title: 'Greetings',
      ...props
    }
  })
}

// ─── Hero Rendering ────────────────────────────────────────────────────

describe('LessonHero | renders outer card structure', () => {
  it('renders outer container with bg-white, rounded-2xl, border-stone-200', async () => {
    const wrapper = getWrapper()
    await nextTick()

    const outer = wrapper.find('[class*="rounded-2xl"]')
    expect(outer.exists()).toBe(true)

    const classes = outer.classes()
    expect(classes).toContain('bg-white')
    expect(classes).toContain('rounded-2xl')
    expect(classes).toContain('shadow-sm')
    expect(classes).toContain('border-stone-200')
    expect(classes).toContain('overflow-hidden')
  })
})

describe('LessonHero | gradient banner', () => {
  it('renders inner banner with gradient classes', async () => {
    const wrapper = getWrapper()
    await nextTick()

    const banner = wrapper.find('[class*="from-primary-700"]')
    expect(banner.exists()).toBe(true)

    const classes = banner.classes()
    expect(classes).toContain('from-primary-700')
    expect(classes).toContain('via-primary-800')
    expect(classes).toContain('to-primary-900')
  })
})

// ─── Arabic Text Overlay ────────────────────────────────────────────────

describe('LessonHero | decorative Arabic text overlay', () => {
  it('renders decorative Arabic text at opacity-10', async () => {
    const wrapper = getWrapper({ arabicTitle: 'التَّحِيَّةُ' })
    await nextTick()

    const overlay = wrapper.find('[class*="opacity-10"]')
    expect(overlay.exists()).toBe(true)

    // Decorative text elements
    const texts = overlay.findAll('[class*="font-arabic"]')
    expect(texts.length).toBeGreaterThanOrEqual(2)
  })

  it('uses provided arabicTitle for top-right decorative text', async () => {
    const wrapper = getWrapper({ arabicTitle: 'التَّحِيَّةُ' })
    await nextTick()

    const overlay = wrapper.find('[class*="opacity-10"]')
    const topText = overlay.find('[class*="top-4"]')
    expect(topText.text()).toBe('التَّحِيَّةُ')
  })

  it('falls back to السَّلَامُ عَلَيْكُمْ when no arabicTitle', async () => {
    const wrapper = getWrapper()
    await nextTick()

    const overlay = wrapper.find('[class*="opacity-10"]')
    const topText = overlay.find('[class*="top-4"]')
    expect(topText.text()).toBe('السَّلَامُ عَلَيْكُمْ')
  })
})

// ─── Status Pills ───────────────────────────────────────────────────────

describe('LessonHero | status pills', () => {
  it('renders LEVEL pill with correct level value', async () => {
    const wrapper = getWrapper({ level: 'B1' })
    await nextTick()

    const pills = wrapper.findAll('[class*="bg-white/20"]')
    expect(pills.length).toBeGreaterThan(0)
    expect(pills[0].text()).toContain('LEVEL B1')
  })

  it('renders LESSON badge with lesson number', async () => {
    const wrapper = getWrapper({ lessonNumber: '5' })
    await nextTick()

    const lessonBadge = wrapper.find('[class*="bg-gold-400"]')
    expect(lessonBadge.exists()).toBe(true)
    expect(lessonBadge.text()).toContain('LESSON 5')
  })

  it('renders Ready indicator when isReady is true', async () => {
    const wrapper = getWrapper({ isReady: true })
    await nextTick()

    const readyPill = wrapper.find('[class*="bg-green-400/90"]')
    expect(readyPill.exists()).toBe(true)
    expect(readyPill.text()).toContain('Ready')

    // Check the dot indicator
    const dot = readyPill.find('[class*="bg-green-700"]')
    expect(dot.exists()).toBe(true)
  })

  it('does not render Ready indicator when isReady is false', async () => {
    const wrapper = getWrapper({ isReady: false })
    await nextTick()

    const readyPill = wrapper.find('[class*="bg-green-400/90"]')
    expect(readyPill.exists()).toBe(false)
  })
})

// ─── Title Rendering ────────────────────────────────────────────────────

describe('LessonHero | title rendering', () => {
  it('renders h1 with title text', async () => {
    const wrapper = getWrapper({ title: 'Greetings and Introductions' })
    await nextTick()

    const heading = wrapper.find('h1')
    expect(heading.exists()).toBe(true)
    expect(heading.text()).toBe('Greetings and Introductions')
  })

  it('renders arabic title paragraph when arabicTitle is provided', async () => {
    const wrapper = getWrapper({ arabicTitle: 'التَّحِيَاتُ' })
    await nextTick()

    const arabicPara = wrapper.find('p[dir="rtl"]')
    expect(arabicPara.exists()).toBe(true)
    expect(arabicPara.text()).toBe('التَّحِيَاتُ')
  })

  it('does not render arabic title paragraph when arabicTitle is empty', async () => {
    const wrapper = getWrapper({ arabicTitle: '' })
    await nextTick()

    const arabicPara = wrapper.find('p[dir="rtl"]')
    expect(arabicPara.exists()).toBe(false)
  })
})

// ─── Metadata Row ────────────────────────────────────────────────────────

describe('LessonHero | metadata row', () => {
  it('renders metadata row when any metadata prop is provided', async () => {
    const wrapper = getWrapper({
      estimatedTime: '15 min',
      scenes: '3 scenes',
      audioType: 'Narration'
    })
    await nextTick()

    const metadataRow = wrapper.find('[class*="flex-wrap"]')
    expect(metadataRow.exists()).toBe(true)
  })

  it('does not render metadata row when all metadata props are empty', async () => {
    const wrapper = getWrapper({
      estimatedTime: '',
      scenes: '',
      audioType: ''
    })
    await nextTick()

    // No metadata row should exist (the flex-wrap container is gated by v-if)
    const metadataRow = wrapper.find('[class*="flex-wrap"]')
    expect(metadataRow.exists()).toBe(false)
  })

  it('renders estimated time with clock icon', async () => {
    const wrapper = getWrapper({ estimatedTime: '15 min' })
    await nextTick()

    const metadataRow = wrapper.find('[class*="flex-wrap"]')
    const timeSpan = metadataRow.find('[class*="flex items-center gap-1.5"]')
    expect(timeSpan.text()).toContain('15 min')

    // Check SVG icon exists
    const svg = timeSpan.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
  })

  it('renders scenes with microphone icon', async () => {
    const wrapper = getWrapper({ scenes: '3 scenes' })
    await nextTick()

    const metadataRow = wrapper.find('[class*="flex-wrap"]')
    const sceneSpan = metadataRow.findAll('[class*="flex items-center gap-1.5"]')
    expect(sceneSpan.length).toBeGreaterThanOrEqual(1)

    // Find the span containing "scenes"
    const scenesMatch = sceneSpan.find(s => s.text().includes('scenes'))
    expect(scenesMatch).toBeDefined()
    expect(scenesMatch!.find('svg').exists()).toBe(true)
  })

  it('renders audio type with music icon', async () => {
    const wrapper = getWrapper({ audioType: 'Narration' })
    await nextTick()

    const metadataRow = wrapper.find('[class*="flex-wrap"]')
    const sceneSpans = metadataRow.findAll('[class*="flex items-center gap-1.5"]')
    const audioMatch = sceneSpans.find(s => s.text().includes('Narration'))
    expect(audioMatch).toBeDefined()
    expect(audioMatch!.find('svg').exists()).toBe(true)
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
        audioType: 'Dialogue',
        isReady: true
      }
    })
    await nextTick()

    const html = wrapper.html()

    // Level
    expect(html).toContain('LEVEL A2')
    // Lesson number
    expect(html).toContain('LESSON 3')
    // Title
    expect(html).toContain('Numbers and Counting')
    // Arabic title
    expect(html).toContain('الأَعْدَادُ')
    // Metadata
    expect(html).toContain('20 min')
    expect(html).toContain('5 scenes')
    expect(html).toContain('Dialogue')
    // Ready indicator
    expect(html).toContain('Ready')
  })

  it('renders with numeric lessonNumber', async () => {
    const wrapper = getWrapper({ lessonNumber: 7 })
    await nextTick()

    expect(wrapper.html()).toContain('LESSON 7')
  })

  it('renders with string lessonNumber', async () => {
    const wrapper = getWrapper({ lessonNumber: '7' })
    await nextTick()

    expect(wrapper.html()).toContain('LESSON 7')
  })
})

// ─── Dark Mode ──────────────────────────────────────────────────────────

describe('LessonHero | dark mode support', () => {
  it('applies dark background and border on dark mode', async () => {
    const wrapper = getWrapper()
    await nextTick()

    const outer = wrapper.find('[class*="rounded-2xl"]')
    const classes = outer.classes()
    expect(classes).toContain('dark:bg-stone-900')
    expect(classes).toContain('dark:border-stone-700')
  })
})
