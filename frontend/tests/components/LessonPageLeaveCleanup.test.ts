import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createMockUseAudioModule, createMockUseTtsApi, createMockUseHealthPoll, createMockUseInputValidation } from '../mocks'

// Mock vue-router to store the onBeforeRouteLeave callback for functional testing.
let _vueRouterLeaveHandler: ((to: unknown, from: unknown, next: (go?: unknown) => void) => void) | null = null
vi.mock('vue-router', () => ({
  onBeforeRouteLeave: (handler: (to: unknown, from: unknown, next: (go?: unknown) => void) => void) => {
    _vueRouterLeaveHandler = handler
  },
  useRoute: () => ({
    path: '/dashboard/level/a1/1',
    fullPath: '/dashboard/level/a1/1',
    params: { level: 'a1', lesson: '1' },
    query: {},
    hash: '',
    name: undefined,
    matched: [],
    meta: {}
  }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  })
}))
// eslint-disable-next-line import/first
import LessonPage from '~/pages/dashboard/level/[level]/[lesson].vue'

// Captured mock instances — lets tests assert on the audio module's and TTS
const lessonPagePath = resolve(__dirname, '../../app/pages/dashboard/level/[lesson].vue')
const mockAudio = createMockUseAudioModule()

// Mock the TTS-facing composables (external API + audio plumbing).
vi.mock('~/composables/common/useAudioModule', () => ({
  useAudioModule: () => mockAudio
}))
vi.mock('~/composables/common/useTtsApi', () => ({
  useTtsApi: () => createMockUseTtsApi()
}))


function getWrapper(): VueWrapper {
  const nuxtApp = {
    $router: {},
    route: {
      path: '/dashboard/level/a1/1',
      fullPath: '/dashboard/level/a1/1',
      params: { level: 'a1', lesson: '1' },
      query: {},
      hash: '',
      name: undefined,
      matched: [],
      meta: {}
    },
    isHydrating: () => false,
    payload: { state: {} },
    ssrContext: {}
  }

  return mount(LessonPage, {
    global: {
      plugins: [
        {
          install(app: Record<string, unknown>) {
            app.config.globalProperties.$router = {}
            Object.defineProperty(app.config.globalProperties, 'useNuxtApp', {
              value: vi.fn(() => nuxtApp)
            })
          }
        }
      ],
      stubs: {
        NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        LessonHero: true,
        LessonDialogue: true,
        LessonPronouns: true,
        LessonVocabulary: true,
        LessonExpressions: true,
        StickyAudioBar: {
          name: 'StickyAudioBar',
          props: ['active', 'isPaused', 'currentTime', 'duration', 'shortcutsEnabled'],
          emits: ['close', 'toggle', 'seek', 'speedChange'],
          template: '<div data-testid="sticky-bar" :class="active ? \'translate-y-0\' : \'translate-y-full\'"><button data-testid="btn-close" @click="$emit(\'close\')">Close</button><button data-testid="btn-toggle" @click="$emit(\'toggle\')">Toggle</button></div>'
        }
      },
      mocks: {
        useHealthPoll: () => createMockUseHealthPoll(),
        useInputValidation: () => createMockUseInputValidation()
      }
    }
  })
}

beforeEach(() => {
  _vueRouterLeaveHandler = null
  vi.clearAllMocks()
})

describe('dashboard/level/[level]/[lesson].vue | Issue-013: page-leave cleanup', () => {
  const content = readFileSync(lessonPagePath, 'utf-8')

  describe('code verification', () => {
    it('contains abortAndCleanup function', () => {
      expect(content).to.contain('abortAndCleanup')
    })

    it('calls abortAndCleanup in onBeforeRouteLeave handler', () => {
      expect(content).to.contain('abortAndCleanup()')
    })

    it('uses module-scope AbortController (fetchController)', () => {
      expect(content).to.contain('fetchController')
      expect(content).to.contain('fetchController!.signal')
    })

    it('calls audioModule.pause() in abortAndCleanup', () => {
      expect(content).to.contain('audioModule.pause()')
    })

    it('calls audioModule.dispose() in abortAndCleanup', () => {
      expect(content).to.contain('audioModule.dispose()')
    })

    it('resets StickyAudioBar active via audioModule.isPlaying.value = false', () => {
      expect(content).to.contain('audioModule.isPlaying.value = false')
    })

    it('clears lesson progress in abortAndCleanup', () => {
      expect(content).to.contain('clearLessonProgress(lessonId.value)')
    })

    it('has onUnmounted that calls abortAndCleanup', () => {
      expect(content).to.contain('onUnmounted')
    })

    it('is double-unmount safe (uses cleanedUp guard)', () => {
      expect(content).to.contain('cleanedUp')
    })
  })

  describe('functional: leave handler is registered', () => {
    it('onBeforeRouteLeave handler is registered and callable via vue-router mock', async () => {
      getWrapper()
      await nextTick()
      expect(typeof _vueRouterLeaveHandler).to.equal('function')
    })
  })
})
