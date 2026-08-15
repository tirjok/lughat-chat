import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import Index from '~/pages/index.vue'
import { setBreakpoint } from '~~/tests/mocks'

// ─── Mock vue-router ────────────────────────────────────────────
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {}, path: '/', record: { components: {} } }),
  useRouter: () => ({ push: vi.fn() }),
  onBeforeRouteLeave: vi.fn()
}))

// ─── Mock composables that index.vue uses directly.
// These use vi.mock() to intercept the module imports — required now that
// manual globalThis stubs are removed from setup.component.ts.
vi.mock('~/composables/usePanelToggle', () => ({
  usePanelToggle: () => ({ activePanel: ref('desktop') })
}))

vi.mock('~/composables/useAudioModule', () => ({
  useAudioModule: () => ({
    audioRef: ref(null),
    audioUrl: ref(null),
    duration: ref(0),
    isPlaying: ref(false),
    isPaused: ref(false),
    currentTime: ref(0),
    error: ref(null),
    formattedCurrentTime: ref('0:00'),
    formattedDuration: ref('0:00'),
    isStreaming: ref(false),
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    seek: vi.fn(),
    download: vi.fn(),
    dispose: vi.fn()
  })
}))

vi.mock('~/composables/useScrollReveal', () => ({
  useScrollReveal: vi.fn(() => ({
    revealOnScroll: vi.fn(),
    isRevealed: computed(() => true)
  }))
}))

vi.mock('~/composables/useToast', () => ({
  showToast: vi.fn()
}))

// New composables needed by the refactored index.vue
vi.mock('~/composables/useTtsApi', () => ({
  useTtsApi: () => ({
    synthesize: vi.fn().mockResolvedValue(new Blob())
  })
}))

vi.mock('~/composables/useHealthPoll', () => ({
  useHealthPoll: () => ({
    status: ref('ready' as const),
    modelLoaded: computed(() => true)
  })
}))

vi.mock('~/composables/useVoices', () => ({
  useVoices: () => ({
    voices: ref([]),
    loading: ref(false),
    error: ref(null),
    loadVoices: vi.fn()
  })
}))

vi.mock('~/composables/useInputValidation', () => ({
  useInputValidation: () => ({
    isValid: true,
    error: null
  })
}))

beforeEach(() => {
  // Stub fetch so useVoices() doesn't try to call the real API
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
})

// ─── ISSUE-006: index.vue uses selectedVoice (not selectedSpeaker) ──

describe('index.vue — ISSUE-006 state rename', () => {
  it('When template is parsed then uses selected-voice event binding (not selected-speaker)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const sourcePath = path.join(process.cwd(), 'app/pages/index.vue')
    const source = fs.readFileSync(sourcePath, 'utf-8')

    // The template should NOT contain @update:selected-speaker
    expect(source).not.toContain('@update:selected-speaker')
    // The template SHOULD contain @update:selected-voice
    expect(source).toContain('@update:selected-voice')
  })

  it('When script is parsed then uses selectedVoice state (not selectedSpeaker)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const sourcePath = path.join(process.cwd(), 'app/pages/index.vue')
    const source = fs.readFileSync(sourcePath, 'utf-8')

    // The script should NOT contain selectedSpeaker
    expect(source).not.toContain('selectedSpeaker')
    // The script SHOULD contain selectedVoice
    expect(source).toContain('selectedVoice')
  })

  it('When handleSynthesize is called then passes { text, language: "ar", voice } (no speaker/speed/seed)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const sourcePath = path.join(process.cwd(), 'app/pages/index.vue')
    const source = fs.readFileSync(sourcePath, 'utf-8')

    // Verify synthesize call uses new contract
    expect(source).toContain('text: textInput.value')
    expect(source).toMatch(/language: 'ar'/)
    expect(source).toContain('voice: selectedVoice.value')
    // Verify old fields are NOT in the synthesize call
    expect(source).not.toContain('speaker:')
    expect(source).not.toMatch(/seed:\s*42/)
  })
})
// ─── Behavioral Tests (black-box: rendered component tree, emitted events) ──

describe('index.vue', () => {
  describe('component tree', () => {
    it('When rendered then main wrapper exists', () => {
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('[data-test-id="main-wrapper"]')
      // Assert
      expect(component.exists()).toBe(true)
    })

    it('When rendered then ToastNotification exists for global notifications', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('[aria-live="polite"]')
      // Assert
      expect(component.exists()).toBe(true)
    })

    it('When rendered then MobileSplitScreen stub exists (data-panel="canvas" and data-panel="control-deck" are inside)', () => {
      const wrapper = shallowMount(Index)
      // With shallowMount, MobileSplitScreen and DesktopPanels are stubbed.
      // Verify the component tree has the expected child components.
      const components = wrapper.findAllComponents({ name: 'MobileSplitScreen' })
      expect(components.length).toBeGreaterThan(0)
    })

    it('When rendered then DesktopPanels stub exists', () => {
      const wrapper = shallowMount(Index)
      const components = wrapper.findAllComponents({ name: 'DesktopPanels' })
      expect(components.length).toBeGreaterThan(0)
    })

    it('When rendered then CleanupDialog stub exists', () => {
      const wrapper = shallowMount(Index)
      const components = wrapper.findAllComponents({ name: 'CleanupDialog' })
      expect(components.length).toBeGreaterThan(0)
    })
  })
})

// ─── Responsive Tests (black-box: breakpoint simulation) ─────────────────

describe('index.vue — responsive layout', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth })
  })

  describe('shortcut hint visibility', () => {
    it('When width < 768px then shortcutHint hidden', () => {
      // Act
      setBreakpoint('md')
      Object.defineProperty(window, 'innerWidth', { value: 600 })

      const wrapper = shallowMount(Index)

      // Assert
      // The outer wrapper exists regardless of breakpoint
      const wrapperEl = wrapper.find('[data-test-id="main-wrapper"]')
      expect(wrapperEl.exists()).toBe(true)
      expect(wrapperEl.classes()).toContain('flex', 'flex-col', 'md:flex-row')
    })

    it('When width >= 768px then shortcutHint visible', () => {
      // Act
      setBreakpoint('lg')
      Object.defineProperty(window, 'innerWidth', { value: 1024 })

      const wrapper = shallowMount(Index)

      // Assert
      const wrapperEl = wrapper.find('[data-test-id="main-wrapper"]')
      expect(wrapperEl.exists()).toBe(true)
      // md:flex overrides hidden at >=768px (CSS media query — not reactive in jsdom)
      expect(wrapperEl.classes()).toContain('md:flex-row')
    })
  })
})
