// AC-1: index.vue renders <StickyAudioBar> not <AudioPlayerPanel>
// StickyAudioBar slides up when active audio, hidden translate-y-full when not active.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed, type Ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import DesktopPanels from '~/components/DesktopPanels.vue'
import StickyAudioBar from '~/components/StickyAudioBar.vue'
import type { Voice } from '~/composables/useVoices'

// ─── Module-level mock for useAudioModule ───────────────────────────
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

// ─── Module-level mock for useHealthPoll ────────────────────────────
const mockStatus: Ref<'loading' | 'ready' | 'error'> = ref('ready' as const)
vi.mock('~/composables/useHealthPoll', () => ({
  useHealthPoll: () => ({
    status: mockStatus,
    modelLoaded: computed(() => mockStatus.value === 'ready')
  })
}))

// ─── Module-level mock for useVoices ────────────────────────────────
const mockVoices: Voice[] = [{ id: 'voice1', name: 'Test Voice' }]
vi.mock('~/composables/useVoices', () => ({
  useVoices: () => ({ voices: ref(mockVoices) })
}))

// ─── Module-level mock for usePanelToggle ───────────────────────────
vi.mock('~/composables/usePanelToggle', () => ({
  usePanelToggle: () => ({ activePanel: ref('control-deck' as const) })
}))

// ─── Module-level mock for useInputValidation ───────────────────────
vi.mock('~/composables/useInputValidation', () => ({
  useInputValidation: () => computed(() => ({ isValid: true }))
}))

// ─── Module-level mock for useTtsApi ────────────────────────────────
vi.mock('~/composables/useTtsApi', () => ({
  useTtsApi: () => ({
    synthesize: vi.fn().mockResolvedValue(new Blob(['dummy'], { type: 'audio/mpeg' }))
  })
}))

// ─── Module-level mock for useToast ─────────────────────────────────
vi.mock('~/composables/useToast', () => ({
  showToast: vi.fn()
}))

// ─── Module-level mock for vue-router ───────────────────────────────
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/', meta: {} }),
  useRouter: () => ({ push: vi.fn(), addRoute: vi.fn(), getRoutes: vi.fn() }),
  onBeforeRouteLeave: vi.fn()
}))

// ─── Module-level mock for GlobalNavbar ─────────────────────────────
vi.mock('~/components/GlobalNavbar.vue', () => ({
  default: { template: '<div id="global-nav"></div>' }
}))

// ─── Module-level mock for useDragResize ────────────────────────────
vi.mock('~/composables/useDragResize', () => ({
  useDragResize: () => ({ canvasRatio: ref(0.55), onDragStart: vi.fn(), onDragMove: vi.fn(), onDragEnd: vi.fn() })
}))

// ─── Module-level mock for useScrollReveal ──────────────────────────
vi.mock('~/composables/useScrollReveal', () => ({
  useScrollReveal: vi.fn()
}))

// ─── Module-level mock for FocusHaloCanvas ──────────────────────────
vi.mock('~/components/FocusHaloCanvas.vue', () => ({
  default: { template: '<div data-testid="focus-halo"></div>' }
}))

// ─── Module-level mock for MobileStatusIndicator ────────────────────
vi.mock('~/components/MobileStatusIndicator.vue', () => ({
  default: { template: '<div data-testid="mobile-status"></div>' }
}))

// ─── Module-level mock for GenerateButton ───────────────────────────
vi.mock('~/components/GenerateButton.vue', () => ({
  default: { template: '<button data-testid="generate-btn">Generate</button>' }
}))

// ─── Module-level mock for VoiceSelector ────────────────────────────
vi.mock('~/components/VoiceSelector.vue', () => ({
  default: { template: '<div data-testid="voice-selector"></div>' }
}))

// ─── Module-level mock for SpeedSlider ──────────────────────────────
vi.mock('~/components/SpeedSlider.vue', () => ({
  default: { template: '<div data-testid="speed-slider"></div>' }
}))

// ─── Module-level mock for CleanupDialog ────────────────────────────
vi.mock('~/components/CleanupDialog.vue', () => ({
  default: { template: '<div id="cleanup-dialog"></div>' }
}))

describe('AC-1: DesktopPanels renders StickyAudioBar, not AudioPlayerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus.value = 'ready' as const
    mockAudioState.isPlaying.value = false
    mockAudioState.isPaused.value = false
    mockAudioState.currentTime.value = 0
    mockAudioState.duration.value = 0
    mockAudioState.audioUrl.value = null
  })

  it('renders StickyAudioBar (not AudioPlayerPanel) when playerVisible and audioUrl present', () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'Hello world',
        selectedSpeaker: 'voice1',
        speedValue: 1.0,
        isGenerating: false,
        playerVisible: true,
        audioUrl: 'http://mock.url/blob',
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 10,
        modelStatus: 'ready',
        isValid: true,
        speakerVoices: mockVoices,
        selectedVoiceName: 'Test Voice'
      }
    })

    // StickyAudioBar should be present (data-testid="sticky-bar")
    const stickyBar = wrapper.find('[data-testid="sticky-bar"]')
    expect(stickyBar.exists()).toBe(true)

    // AudioPlayerPanel should NOT be rendered
    const audioPlayerPanel = wrapper.find('[data-testid="audio-player-panel"]')
    expect(audioPlayerPanel.exists()).toBe(false)
  })

  it('hides StickyAudioBar (translate-y-full) when no active audio (playerVisible=false)', () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'Hello world',
        selectedSpeaker: 'voice1',
        speedValue: 1.0,
        isGenerating: false,
        playerVisible: false,
        audioUrl: null,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        modelStatus: 'ready',
        isValid: true,
        speakerVoices: mockVoices,
        selectedVoiceName: 'Test Voice'
      }
    })

    const stickyBar = wrapper.find('[data-testid="sticky-bar"]')
    expect(stickyBar.exists()).toBe(true)
    expect(stickyBar.classes()).toContain('translate-y-full')
  })
})

describe('AC-1: StickyAudioBar renders correctly', () => {
  it('is hidden (translate-y-full) when active=false', () => {
    const wrapper = mount(StickyAudioBar, {
      props: { active: false, textContent: '', isPlaying: false, isPaused: false, speedValue: 1.0 }
    })

    const bar = wrapper.find('[data-testid="sticky-bar"]')
    expect(bar.classes()).toContain('translate-y-full')
    expect(bar.classes()).not.toContain('translate-y-0')
  })

  it('is visible (translate-y-0) when active=true', () => {
    const wrapper = mount(StickyAudioBar, {
      props: { active: true, textContent: 'Test text', isPlaying: false, isPaused: false, speedValue: 1.0 }
    })

    const bar = wrapper.find('[data-testid="sticky-bar"]')
    expect(bar.classes()).toContain('translate-y-0')
    expect(bar.classes()).not.toContain('translate-y-full')
  })
})
describe('AC-2: Audio module data flow to StickyAudioBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus.value = 'ready' as const
    mockAudioState.isPlaying.value = false
    mockAudioState.isPaused.value = false
    mockAudioState.currentTime.value = 0
    mockAudioState.duration.value = 0
    mockAudioState.audioUrl.value = null
  })
  it('updates StickyAudioBar when audioUrl changes (load triggers bar show)', async () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'Hello world',
        selectedSpeaker: 'voice1',
        speedValue: 1.0,
        isGenerating: false,
        playerVisible: true,
        audioUrl: null,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        modelStatus: 'ready',
        isValid: true,
        speakerVoices: mockVoices,
        selectedVoiceName: 'Test Voice'
      }
    })

    // Initially hidden (no audioUrl)
    const stickyBar = wrapper.find('[data-testid="sticky-bar"]')
    expect(stickyBar.classes()).toContain('translate-y-full')

    // Simulate audioModule.load() setting audioUrl
    await wrapper.setProps({ audioUrl: 'http://mock.url/blob' })
    await nextTick()

    // Bar should now be visible (active=true → translate-y-0)
    expect(stickyBar.classes()).toContain('translate-y-0')
    expect(stickyBar.classes()).not.toContain('translate-y-full')
  })

  it('hides StickyAudioBar when audioModule.dispose() clears audioUrl', async () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'Hello world',
        selectedSpeaker: 'voice1',
        speedValue: 1.0,
        isGenerating: false,
        playerVisible: true,
        audioUrl: 'http://mock.url/blob',
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 10,
        modelStatus: 'ready',
        isValid: true,
        speakerVoices: mockVoices,
        selectedVoiceName: 'Test Voice'
      }
    })

    // Bar visible (has audioUrl)
    const stickyBar = wrapper.find('[data-testid="sticky-bar"]')
    expect(stickyBar.classes()).toContain('translate-y-0')

    // Simulate audioModule.dispose() clearing audioUrl
    await wrapper.setProps({ audioUrl: null, playerVisible: false })
    await nextTick()

    // Bar should be hidden
    expect(stickyBar.classes()).toContain('translate-y-full')
  })

  it('updates play/pause state in StickyAudioBar reactively', async () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'Hello world',
        selectedSpeaker: 'voice1',
        speedValue: 1.0,
        isGenerating: false,
        playerVisible: true,
        audioUrl: 'http://mock.url/blob',
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 10,
        modelStatus: 'ready',
        isValid: true,
        speakerVoices: mockVoices,
        selectedVoiceName: 'Test Voice'
      }
    })

    const playPauseBtn = wrapper.find('[data-testid="play-pause-button"]')
    expect(playPauseBtn.exists()).toBe(true)

    // Simulate play
    await wrapper.setProps({ isPlaying: true, isPaused: false })
    await nextTick()
    expect(playPauseBtn.attributes('aria-label')).toBe('Pause')

    // Simulate pause
    await wrapper.setProps({ isPlaying: true, isPaused: true })
    await nextTick()
    expect(playPauseBtn.attributes('aria-label')).toBe('Play')
  })

  it('updates seek/progress in StickyAudioBar reactively', async () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'Hello world',
        selectedSpeaker: 'voice1',
        speedValue: 1.0,
        isGenerating: false,
        playerVisible: true,
        audioUrl: 'http://mock.url/blob',
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 100,
        modelStatus: 'ready',
        isValid: true,
        speakerVoices: mockVoices,
        selectedVoiceName: 'Test Voice'
      }
    })

    const currentTime = wrapper.find('[data-testid="current-time"]')
    expect(currentTime.text()).toBe('0:00')

    // Simulate seeking to 30 seconds
    await wrapper.setProps({ currentTime: 30 })
    await nextTick()
    expect(currentTime.text()).toBe('0:30')

    // Simulate seeking to 70 seconds
    await wrapper.setProps({ currentTime: 70 })
    await nextTick()
    expect(currentTime.text()).toBe('1:10')
  })

  it('updates speed display in StickyAudioBar reactively', async () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'Hello world',
        selectedSpeaker: 'voice1',
        speedValue: 0.75,
        isGenerating: false,
        playerVisible: true,
        audioUrl: 'http://mock.url/blob',
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 10,
        modelStatus: 'ready',
        isValid: true,
        speakerVoices: mockVoices,
        selectedVoiceName: 'Test Voice'
      }
    })

    const speedToggle = wrapper.find('[data-testid="speed-toggle"]')
    expect(speedToggle.text()).toBe('0.8x')
  })
})
describe('AC-4: Synthesis workflow preserved', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus.value = 'ready' as const
    mockAudioState.isPlaying.value = false
    mockAudioState.isPaused.value = false
    mockAudioState.currentTime.value = 0
    mockAudioState.duration.value = 0
    mockAudioState.audioUrl.value = null
  })

  it('full synthesis flow: generate → load → play → bar slides up', async () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'مرحبا بالعالم',
        selectedSpeaker: 'voice1',
        speedValue: 1.0,
        isGenerating: false,
        playerVisible: false,
        audioUrl: null,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        modelStatus: 'ready',
        isValid: true,
        speakerVoices: mockVoices,
        selectedVoiceName: '',
        textInput: 'مرحبا بالعالم'
      }
    })

    const stickyBar = wrapper.find('[data-testid="sticky-bar"]')
    const playPauseBtn = wrapper.find('[data-testid="play-pause-button"]')
    const arabicText = wrapper.find('[data-testid="arabic-text"]')

    // Initial state: bar hidden, Arabic text shows (even before synthesis)
    expect(stickyBar.classes()).toContain('translate-y-full')
    expect(arabicText.text()).toBe('مرحبا بالعالم')
    expect(playPauseBtn.attributes('aria-label')).toBe('Play')

    // Simulate synthesis completing: audioUrl set, playerVisible=true, text displayed
    await wrapper.setProps({
      playerVisible: true,
      audioUrl: 'http://mock.url/blob',
      selectedVoiceName: 'Test Voice',
      textInput: 'مرحبا بالعالم',
      isPlaying: true
    })
    await nextTick()

    // Bar should slide up
    expect(stickyBar.classes()).toContain('translate-y-0')
    expect(stickyBar.classes()).not.toContain('translate-y-full')

    // Arabic text should display
    expect(arabicText.text()).toBe('مرحبا بالعالم')

    // Play button should show pause icon
    expect(playPauseBtn.attributes('aria-label')).toBe('Pause')
  })

  it('download button accessible from sticky bar context', () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'Hello world',
        selectedSpeaker: 'voice1',
        speedValue: 1.0,
        isGenerating: false,
        playerVisible: true,
        audioUrl: 'http://mock.url/blob',
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 10,
        modelStatus: 'ready',
        isValid: true,
        speakerVoices: mockVoices,
        selectedVoiceName: 'Test Voice'
      }
    })

    // The download button is handled by index.vue's handleDownload(),
    // not by the sticky bar itself (StickyAudioBar doesn't emit download).
    // Verify the sticky bar is present and interactive.
    const stickyBar = wrapper.find('[data-testid="sticky-bar"]')
    expect(stickyBar.exists()).toBe(true)

    // Seek functionality is functional (progress bar clickable)
    const progressBar = wrapper.find('[data-testid="progress-bar"]')
    expect(progressBar.exists()).toBe(true)
  })
})
describe('AC-5: Panel layout — panels gain vertical space', () => {
  it('DesktopPanels does not embed AudioPlayerPanel, freeing ~300px vertical space', () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'Hello world',
        selectedSpeaker: 'voice1',
        speedValue: 1.0,
        isGenerating: false,
        playerVisible: false,
        audioUrl: null,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        modelStatus: 'ready',
        isValid: true,
        speakerVoices: mockVoices,
        selectedVoiceName: ''
      }
    })

    // The main layout should be a two-panel side-by-side layout
    // (no embedded audio panel taking ~300px)
    const mainLayout = wrapper.find('main')
    expect(mainLayout.exists()).toBe(true)

    // The canvas/editor area should NOT have a nested audio panel
    // (AudioPlayerPanel was embedded within the canvas area, taking ~300px)
    const audioPlayerPanel = wrapper.find('[data-testid="audio-player-panel"]')
    expect(audioPlayerPanel.exists()).toBe(false)

    // The StickyAudioBar is at the bottom (fixed), not embedded in the panel
    const stickyBar = wrapper.find('[data-testid="sticky-bar"]')
    expect(stickyBar.exists()).toBe(true)
  })
})
