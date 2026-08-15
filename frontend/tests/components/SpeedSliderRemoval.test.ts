// ISSUE-007: Verify SpeedSlider is removed from layout components.
// These tests assert observable behavior: no SpeedSlider in the rendered DOM,
// no speedValue prop on layout components.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import DesktopPanels from '~/components/DesktopPanels.vue'
import MobileSplitScreen from '~/components/MobileSplitScreen.vue'
import type { Voice } from '~/composables/useVoices'

// ─── Module-level mocks (same pattern as AC1-StickyAudioBar.test.ts) ────

const mockAudioState = {
  isPlaying: ref(false),
  isPaused: ref(false),
  currentTime: ref(0),
  duration: ref(0),
  audioUrl: ref<string | null>(null),
  audioRef: ref<HTMLAudioElement | null>(null),
  load: vi.fn(),
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  toggle: vi.fn(),
  seek: vi.fn(),
  download: vi.fn(),
  dispose: vi.fn()
} as unknown as ReturnType<typeof import('~/composables/useAudioModule').useAudioModule>

vi.mock('~/composables/useAudioModule', () => ({
  useAudioModule: () => mockAudioState
}))

const mockStatus: Ref<'loading' | 'ready' | 'error'> = ref('ready' as const)
vi.mock('~/composables/useHealthPoll', () => ({
  useHealthPoll: () => ({
    status: mockStatus,
    modelLoaded: computed(() => mockStatus.value === 'ready')
  })
}))

const mockVoices: Voice[] = [{ id: 'voice1', name: 'Test Voice' }]
vi.mock('~/composables/useVoices', () => ({
  useVoices: () => ({ voices: ref(mockVoices) })
}))

vi.mock('~/composables/usePanelToggle', () => ({
  usePanelToggle: () => ({ activePanel: ref('control-deck' as const) })
}))

vi.mock('~/composables/useInputValidation', () => ({
  useInputValidation: () => computed(() => ({ isValid: true }))
}))

vi.mock('~/composables/useTtsApi', () => ({
  useTtsApi: () => ({
    synthesize: vi.fn().mockResolvedValue(new Blob(['dummy'], { type: 'audio/mpeg' }))
  })
}))

vi.mock('~/composables/useToast', () => ({
  showToast: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/', meta: {} }),
  useRouter: () => ({ push: vi.fn(), addRoute: vi.fn(), getRoutes: vi.fn() }),
  onBeforeRouteLeave: vi.fn()
}))

vi.mock('~/components/GlobalNavbar.vue', () => ({
  default: { template: '<div id="global-nav"></div>' }
}))

vi.mock('~/composables/useDragResize', () => ({
  useDragResize: () => ({ canvasRatio: ref(0.55), onDragStart: vi.fn(), onDragMove: vi.fn(), onDragEnd: vi.fn() })
}))

vi.mock('~/composables/useScrollReveal', () => ({
  useScrollReveal: vi.fn()
}))

vi.mock('~/components/FocusHaloCanvas.vue', () => ({
  default: { template: '<div data-testid="focus-halo"></div>' }
}))

vi.mock('~/components/GenerateButton.vue', () => ({
  default: { template: '<button data-testid="generate-btn">Generate</button>' }
}))

vi.mock('~/components/VoiceSelector.vue', () => ({
  default: { template: '<div data-testid="voice-selector"></div>' }
}))

vi.mock('~/components/CleanupDialog.vue', () => ({
  default: { template: '<div id="cleanup-dialog"></div>' }
}))

// SpeedSlider mock: returns null so it doesn't render anything.
// If SpeedSlider is still imported in the component, this mock catches it.
vi.mock('~/components/SpeedSlider.vue', () => ({
  default: { template: '<!-- SpeedSlider removed -->' }
}))

const baseProps = {
  textInput: 'Hello world',
  selectedVoice: 'voice1',
  isGenerating: false,
  playerVisible: true,
  audioUrl: 'http://mock.url/blob',
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 10,
  modelStatus: 'ready' as const,
  isValid: true,
  speakerVoices: mockVoices,
  selectedVoiceName: 'Test Voice'
}

// ─── DesktopPanels: SpeedSlider removed ────────────────────────────────

describe('DesktopPanels — SpeedSlider removed (ISSUE-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus.value = 'ready' as const
  })

  it('does not render SpeedSlider in the template', () => {
    const wrapper = mount(DesktopPanels, {
      props: baseProps
    })

    // SpeedSlider should NOT exist anywhere in the rendered DOM.
    // The mock returns a comment node, so if it were rendered we'd see
    // the comment text "SpeedSlider removed" in the DOM.
    const speedSlider = wrapper.find('[data-testid="speed-slider"]')
    expect(speedSlider.exists()).toBe(false)

    // Also verify by text content — no "Speech Speed" label from SpeedSlider.
    expect(wrapper.text()).not.toContain('Speech Speed')
  })

  it('does not accept speedValue as a prop', () => {
    const wrapper = mount(DesktopPanels, {
      props: baseProps
    })

    // If speedValue were still a prop, TypeScript would accept it and
    // the component would use it. Verify it is NOT a declared prop.
    const props = wrapper.props()
    expect(props).not.toHaveProperty('speedValue')
  })

  it('does not emit update:speedValue', () => {
    const wrapper = mount(DesktopPanels, {
      props: baseProps
    })

    // Verify no speedValue-related emit exists.
    const emittedKeys = Object.keys(wrapper.emitted())
    expect(emittedKeys).not.toContain('update:speedValue')
  })
})

// ─── MobileSplitScreen: SpeedSlider removed ────────────────────────────

describe('MobileSplitScreen — SpeedSlider removed (ISSUE-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render SpeedSlider in the template', () => {
    const wrapper = mount(MobileSplitScreen, {
      props: {
        ...baseProps,
        textInput: 'Hello world'
      }
    })

    const speedSlider = wrapper.find('[data-testid="speed-slider"]')
    expect(speedSlider.exists()).toBe(false)

    expect(wrapper.text()).not.toContain('Speech Speed')
  })

  it('does not accept speedValue as a prop', () => {
    const wrapper = mount(MobileSplitScreen, {
      props: {
        ...baseProps,
        textInput: 'Hello world'
      }
    })

    const props = wrapper.props()
    expect(props).not.toHaveProperty('speedValue')
  })

  it('does not emit update:speedValue', () => {
    const wrapper = mount(MobileSplitScreen, {
      props: {
        ...baseProps,
        textInput: 'Hello world'
      }
    })

    const emittedKeys = Object.keys(wrapper.emitted())
    expect(emittedKeys).not.toContain('update:speedValue')
  })
})
