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

// ─── Template: mobile split-screen bindings ────────────────────────────

describe('Mobile split-screen — template bindings', () => {
  it('mobile split-screen wrapper exists (md:hidden flex-col)', () => {
    expect(getSource()).toContain('md:hidden flex-col')
  })

  it('canvas panel has dynamic height via canvasRatio', () => {
    expect(getSource()).toContain('canvasRatio')
  })

  it('control-deck panel has dynamic height via canvasRatio', () => {
    expect(getSource()).toContain('(1 - canvasRatio)')
  })

  it('drag divider exists with touch/mouse handlers', () => {
    expect(getSource()).toContain('@touchstart')
    expect(getSource()).toContain('@touchmove')
    expect(getSource()).toContain('@touchend')
    expect(getSource()).toContain('@mousedown')
    expect(getSource()).toContain('@mousemove')
    expect(getSource()).toContain('@mouseup')
  })

  it('no panelSlideClass function in source (CSS-only)', () => {
    expect(getSource()).not.toContain('panelSlideClass')
  })

  it('no hidden-slide or visible-slide class references in template', () => {
    expect(getSource()).not.toContain('hidden-slide')
    expect(getSource()).not.toContain('visible-slide')
  })

  it('no :data-active-panel binding (replaced by split-screen)', () => {
    expect(getSource()).not.toContain(':data-active-panel')
  })

  it('panelToggle FAB removed from template', () => {
    expect(getSource()).not.toMatch(/<PanelToggle/)
  })
})

// ─── CSS: mobile split-screen styles ──────────────────────────────────

describe('Mobile split-screen — CSS selectors', () => {
  it('scoped to @media (max-width: 767px)', () => {
    expect(getSource()).toContain('@media (max-width: 767px)')
  })

  it('body.dragging class for user-select prevention', () => {
    expect(getSource()).toContain('body.dragging')
  })

  it('panels get transition on height', () => {
    expect(getSource()).toContain('transition: height')
  })

  it('no transform/opacity transitions (replaced by height)', () => {
    const source = getSource()
    const mediaBlock = source.substring(source.indexOf('@media (max-width: 767px)'))
    expect(mediaBlock).not.toContain('translateY')
    expect(mediaBlock).not.toContain('opacity: 0')
    expect(mediaBlock).not.toContain('opacity: 1')
  })

  it('no :data-active-panel selectors (replaced by split-screen)', () => {
    expect(getSource()).not.toContain('[data-active-panel=')
  })
})

// ─── No dead code from old JS approach ────────────────────────────────

describe('Mobile split-screen — no dead code', () => {
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

  it('no PanelToggle component import in source', () => {
    expect(getSource()).not.toMatch(/import.*PanelToggle.*from.*components/i)
  })

  it('no togglePanel function in source', () => {
    expect(getSource()).not.toContain('togglePanel')
  })

  it('no isMobile destructured from usePanelToggle', () => {
    expect(getSource()).not.toMatch(/isMobile\s*\}/)
  })
})

// ─── Mounted component test (mocked) ──────────────────────────────────

describe('Mobile split-screen — mounted component', () => {
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
    const controlDeck = wrapper.find('[data-panel="control-deck"]')
    expect(controlDeck.exists()).toBe(true)

    const canvas = wrapper.find('[data-panel="canvas"]')
    expect(canvas.exists()).toBe(true)
  })

  it('mobile split-screen wrapper renders (md:hidden)', () => {
    const wrapper = shallowMount(Index)
    const mobileWrapper = wrapper.find('.md\\:hidden.flex-col')
    expect(mobileWrapper.exists()).toBe(true)
  })

  it('drag divider renders', () => {
    const wrapper = shallowMount(Index)
    const divider = wrapper.find('[style*="height: 16px"]')
    expect(divider.exists()).toBe(true)
  })
})
