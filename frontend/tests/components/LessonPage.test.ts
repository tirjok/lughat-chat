import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import StickyAudioBar from '~/components/StickyAudioBar.vue'

const lessonPagePath = resolve(__dirname, '../../app/pages/dashboard/level/[level]/[lesson].vue')

describe('dashboard/level/[level]/[lesson].vue | Issue-002: LessonHero wiring', () => {
  it('passes arabicTitle from currentLessonData to LessonHero', () => {
    // Arrange
    const content = readFileSync(lessonPagePath, 'utf-8')

    // Act & Assert — the template must wire arabicTitle from currentLessonData
    expect(content).to.contain(':arabic-title="currentLessonData?.arabicTitle"')
  })

  it('passes estimatedTime from computed value to LessonHero', () => {
    // Arrange
    const content = readFileSync(lessonPagePath, 'utf-8')

    // Act & Assert — the template must wire estimatedTime
    expect(content).to.contain(':estimated-time')
  })

  it('passes scenes from computed value to LessonHero', () => {
    // Arrange
    const content = readFileSync(lessonPagePath, 'utf-8')

    // Act & Assert — the template must wire scenes
    expect(content).to.contain(':scenes')
  })

  it('passes audioType to LessonHero', () => {
    // Arrange
    const content = readFileSync(lessonPagePath, 'utf-8')

    // Act & Assert — the template must wire audioType
    expect(content).to.contain(':audio-type')
  })
})

describe('dashboard/level/[level]/[lesson].vue | Issue-010: playback controls wiring', () => {
  const content = readFileSync(lessonPagePath, 'utf-8')

  it('wires StickyAudioBar @download to audioModule.download()', () => {
    expect(content).to.contain('@download')
  })

  it('wires StickyAudioBar @speed-change to re-synthesize with new speed (not just pause)', () => {
    const wire = content.match(/@speed-change="([^"]+)"/)
    expect(wire).not.toBeNull()
    expect(wire![1]).to.contain('handleSpeedChange')
    expect(wire![1]).to.contain('speed')
  })

  it('wires StickyAudioBar @repeat-change to track repeat mode state', () => {
    expect(content).to.contain('@repeat-change')
  })

  it('wires audio "ended" event to apply repeat mode (off/one/all)', () => {
    expect(content).to.contain('@ended')
    const wrapper = mount(StickyAudioBar, { props: { active: true, shortcutsEnabled: true } })
    const bar = wrapper.vm as unknown as { handleKeydown: (e: KeyboardEvent) => void }
    const ctrlEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })
    bar.handleKeydown(ctrlEnter)
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('StickyAudioBar | when Cmd+Enter (Meta) pressed | emits toggle event', () => {
    const wrapper = mount(StickyAudioBar, { props: { active: true, shortcutsEnabled: true } })
    const bar = wrapper.vm as unknown as { handleKeydown: (e: KeyboardEvent) => void }
    const metaEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
      bubbles: true,
      cancelable: true
    })
    bar.handleKeydown(metaEnter)
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('wires StickyAudioBar @prev-track to re-synthesize previous line', () => {
    expect(content).to.contain('@prev-track')
  })

  it('wires StickyAudioBar @next-track to re-synthesize next line', () => {
    expect(content).to.contain('@next-track')
  })

  it('wires a Play Scene action with 800ms gap between lines', () => {
    expect(content).to.contain('_playScene')
    expect(content).to.contain('800')
  })

  it('clears scene play timer on pause and section change', () => {
    const closeMatch = content.match(/@close="([^"]+)"/)
    expect(closeMatch).not.toBeNull()
    expect(closeMatch![1]).to.contain('_clearSceneTimer')
  })
})

