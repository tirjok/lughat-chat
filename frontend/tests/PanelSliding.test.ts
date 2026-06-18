import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import * as fs from 'fs'
import * as path from 'path'
import Index from '../app/pages/index.vue'
import { createMockUseAudioModule, createMockUseTtsApi, createMockUseHealthPoll, createMockUseInputValidation, createMockUseToast } from './mocks'

// ─── Source file helper ────────────────────────────────────────────────
const getSource = () =>
  fs.readFileSync(path.resolve(__dirname, '../app/pages/index.vue'), 'utf-8')

// ─── Template: data attributes for :has() selectors ────────────────────

describe('Panel sliding — template bindings', () => {
  it('outer container has :data-active-panel bound to activePanel', () => {
    expect(getSource()).toContain(':data-active-panel="activePanel"')
  })

  it('aside panel has data-panel="control-deck"', () => {
    expect(getSource()).toContain('data-panel="control-deck"')
  })

  it('main panel has data-panel="canvas"', () => {
    expect(getSource()).toContain('data-panel="canvas"')
  })

  it('no panelSlideClass function in source (CSS-only)', () => {
    expect(getSource()).not.toContain('panelSlideClass')
  })

  it('no hidden-slide or visible-slide class references in template', () => {
    expect(getSource()).not.toContain('hidden-slide')
    expect(getSource()).not.toContain('visible-slide')
  })
})

// ─── CSS: mobile-only sliding via :has() ──────────────────────────────

describe('Panel sliding — CSS selectors (mobile <768px)', () => {
  it('scoped to @media (max-width: 767px)', () => {
    expect(getSource()).toContain('@media (max-width: 767px)')
  })

  it('both panels get width: 100% on mobile', () => {
    expect(getSource()).toContain('width: 100%')
  })

  it('both panels get transition on transform and opacity', () => {
    expect(getSource()).toContain('transition: transform')
    expect(getSource()).toContain('opacity')
  })

  it('transition uses 500ms cubic-bezier(0.16, 1, 0.3, 1)', () => {
    expect(getSource()).toContain('500ms cubic-bezier(0.16, 1, 0.3, 1)')
  })

  it('control-deck active selector exists', () => {
    expect(getSource()).toContain('[data-active-panel="control-deck"] [data-panel="control-deck"]')
  })

  it('control-deck visible: translateY(0), opacity: 1, pointer-events: auto', () => {
    expect(getSource()).toContain('translateY(0)')
    expect(getSource()).toContain('opacity: 1')
    expect(getSource()).toContain('pointer-events: auto')
  })

  it('control-deck active → canvas hidden: translateY(150%), opacity: 0, pointer-events: none', () => {
    expect(getSource()).toContain('[data-active-panel="control-deck"] [data-panel="canvas"]')
    expect(getSource()).toContain('translateY(150%)')
    expect(getSource()).toContain('opacity: 0')
    expect(getSource()).toContain('pointer-events: none')
  })

  it('canvas active selector exists', () => {
    expect(getSource()).toContain('[data-active-panel="canvas"] [data-panel="canvas"]')
  })

  it('canvas active → control-deck hidden selector exists', () => {
    expect(getSource()).toContain('[data-active-panel="canvas"] [data-panel="control-deck"]')
  })
})

// ─── No dead code from old JS approach ────────────────────────────────

describe('Panel sliding — no dead code', () => {
  it('no .hidden-slide class', () => {
    expect(getSource()).not.toContain('.hidden-slide')
  })

  it('no .visible-slide class', () => {
    expect(getSource()).not.toContain('.visible-slide')
  })

  it('no .panel-slide-enter-active class', () => {
    expect(getSource()).not.toContain('.panel-slide-enter-active')
  })

  it('no .panel-slide-leave-active class', () => {
    expect(getSource()).not.toContain('.panel-slide-leave-active')
  })

  it('no @media (min-width: 768px) desktop override (not needed)', () => {
    expect(getSource()).not.toContain('@media (min-width: 768px)')
  })

  it('no !important overrides in CSS', () => {
    expect(getSource()).not.toContain('!important')
  })
})

// ─── Mounted component test (mocked) ──────────────────────────────────

describe('Panel sliding — mounted component', () => {
  const mockAudio = createMockUseAudioModule()
  const mockTts = createMockUseTtsApi()
  const mockHealth = createMockUseHealthPoll()
  const mockValidation = createMockUseInputValidation()
  const mockToast = createMockUseToast()

  const voiceRefs = ref([
    { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' },
    { id: 'tariq', name: 'Tariq - News Anchor', dialect: 'Modern Standard Arabic [MSA]', tag: 'MSA', icon: 'waveform', speaker_wav: 'male.wav' },
    { id: 'laila', name: 'Laila - Storyteller', dialect: 'Levantine Arabic [AR-LB]', tag: 'AR-LB', icon: 'waveform', speaker_wav: 'female.wav' }
  ])

  beforeEach(() => {
    Object.assign(globalThis, {
      useAudioModule: vi.fn(() => mockAudio),
      useTtsApi: vi.fn(() => mockTts),
      useVoices: vi.fn(() => ({ voices: voiceRefs })),
      useHealthPoll: vi.fn(() => mockHealth),
      useInputValidation: vi.fn(() => mockValidation),
      showToast: mockToast.showToast ?? (() => {})
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders both panels with correct data attributes', () => {
    const wrapper = shallowMount(Index)
    const container = wrapper.find('[data-active-panel]')
    expect(container.exists()).toBe(true)

    const controlDeck = wrapper.find('[data-panel="control-deck"]')
    expect(controlDeck.exists()).toBe(true)

    const canvas = wrapper.find('[data-panel="canvas"]')
    expect(canvas.exists()).toBe(true)
  })
})
