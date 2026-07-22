<script setup lang="ts">
// Full-page TTS Studio — complete integration of all 6 components
// Two-panel layout: Left (Control Deck) + Right (Canvas)
// Mobile: both panels stacked vertically (canvas top, controls bottom)
// Desktop: side-by-side panels
import MobileStatusIndicator from '../components/MobileStatusIndicator.vue'
import WaveformCanvas from '../components/WaveformCanvas.vue'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { usePanelToggle } from '../composables/usePanelToggle'
import { useAudioModule } from '../composables/useAudioModule'
import { useScrollReveal } from '../composables/useScrollReveal'
import { useHealthPoll } from '../composables/useHealthPoll'
import { useVoices } from '../composables/useVoices'
import { useTtsApi } from '../composables/useTtsApi'
import { showToast } from '../composables/useToast'
import { useMagicKeys, whenever } from '@vueuse/core'

// SEO metadata for playground page
useSeoMeta({
  title: 'TTS Playground — LughatChat',
  description: 'Arabic Text-to-Speech Studio — Generate speech with XTTS-v2'
})

const { togglePanel } = usePanelToggle()
const audioModule = useAudioModule()
const {
  isPlaying,
  isPaused,
  currentTime,
  duration,
  audioUrl: audioUrlRef,

  audioRef,
  load: audioLoad,
  toggle: audioToggle,
  seek: audioSeek,
  download: audioDownload,
  dispose
} = audioModule

// Template binding state
const speedValue = ref(1.0)

// Scroll-reveal: observe desktop control deck sections for fade-up
const controlDeckDesktopRef = ref<HTMLElement | null>(null)
useScrollReveal(controlDeckDesktopRef)

// Scroll-reveal: observe desktop canvas header for fade-up
const canvasHeaderRef = ref<HTMLElement | null>(null)
useScrollReveal(canvasHeaderRef)

// Mobile split-screen: ratio of canvas height (0.0–1.0)
const canvasRatio = ref(0.55)
const isDragging = ref(false)
let startY = 0
let startRatio = 0

function getClientY(e: TouchEvent | MouseEvent): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ('touches' in e ? (e as any).touches[0].clientY : e.clientY)
}

function onDragStart(e: TouchEvent | MouseEvent) {
  startY = getClientY(e)
  startRatio = canvasRatio.value
  isDragging.value = true
  document.body.classList.add('dragging')
}

function onDragMove(e: TouchEvent | MouseEvent) {
  if (!isDragging.value) return
  const clientY = getClientY(e)
  const delta = (startY - clientY) / window.innerHeight
  canvasRatio.value = Math.max(0.25, Math.min(0.85), startRatio + delta)
}

function onDragEnd() {
  isDragging.value = false
  document.body.classList.remove('dragging')
}

// Keyboard shortcut: VueUse useMagicKeys handles Ctrl/Cmd+Enter declaratively
const isGenerating = ref(false)
const textInput = ref('')

async function handleGenerate(): Promise<void> {
  if (!textInput.value.trim()) {
    showToast('Please enter some text', 'error')
    return
  }

  isGenerating.value = true
  try {
    const { synthesize } = useTtsApi()
    const blob = await synthesize({
      text: textInput.value,
      speaker: selectedVoice.value || 'female',
      speed: speedValue.value
    })
    audioLoad(blob)
    showToast('Speech generated successfully!', 'success')
  } catch {
    showToast('Failed to generate speech. Please try again.', 'error')
  } finally {
    isGenerating.value = false
  }
}

// VueUse: reactive Ctrl+Enter shortcut (no manual keydown handler)
const { Ctrl_Enter: ctrlEnter } = useMagicKeys()
whenever(computed(() => ctrlEnter!.value), async () => {
  await handleGenerate()
})

// Health polling (model ready state tracked but not displayed)
const health = useHealthPoll()

// Compute whether the Generate button should be disabled
// — during generation, or when model is not ready (loading/error/retrying)
const isGenerateDisabled = computed(() => {
  return isGenerating.value || !health.modelLoaded
})

const { voices, loadVoices } = useVoices()
const selectedVoice = ref('KSA Zariyah - Female')
const selectedVoiceName = ref(selectedVoice.value)

// Load voices on mount
onMounted(() => {
  loadVoices()
})

// Show error toast when model enters error state (reactive watch on getter)
watch(
  () => health.status,
  (status) => {
    if (status === 'error') {
      showToast('TTS model is not ready. Please try again later.', 'error')
    }
  }
)

// Cleanup audio URL on unmount
onUnmounted(() => {
  dispose()
})

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div
    class="tts-page min-h-screen bg-[#121212] dark:bg-[#0a0a0a]"
    dir="ltr"
  >
    <!-- Hidden audio element (bound to composable's audioRef for playback) -->
    <audio
      ref="audioRef"
      :src="audioUrlRef || undefined"
      class="hidden"
    />
    <NavBar compact />

    <!-- Desktop: two-panel layout (padding-top from CSS variable) -->
    <div
      data-testid="desktop-panels"
      class="hidden md:flex h-screen"
      style="padding-top: var(--nav-height, 56px)"
    >
      <!-- Left panel: Control Deck -->
      <div
        ref="controlDeckDesktopRef"
        class="control-deck flex-1 p-8 overflow-y-auto"
        data-panel="control-deck"
      >
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">
            Lughat Chat Studio
          </h1>
          <p class="text-gray-400">
            Arabic Text-to-Speech with XTTS-v2
          </p>
        </div>

        <!-- Voice Selector -->
        <div class="mb-6">
          <VoiceSelector
            v-model="selectedVoice"
            :voices="voices"
          />
        </div>

        <!-- Text Input -->
        <div class="mb-6">
          <label
            for="text-input"
            class="block text-sm font-medium text-gray-300 mb-2"
          >
            Enter Arabic Text
          </label>
          <textarea
            id="text-input"
            v-model="textInput"
            data-testid="text-input"
            placeholder="Type or paste Arabic text here..."
            class="tts-input w-full min-h-[150px] resize-y"
            dir="rtl"
          />
        </div>

        <!-- Speed Slider -->
        <div class="mb-6">
          <SpeedSlider />
        </div>

        <!-- Generate Button -->
        <div class="mb-6">
          <GenerateButton
            :is-generating="isGenerating"
            :model-status="health.status"
            :disabled="isGenerateDisabled"
            :text="textInput"
            @click="handleGenerate"
          />
        </div>

        <!-- Shortcut hint -->
        <div class="text-xs text-gray-500">
          Press <kbd class="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">Ctrl</kbd> +
          <kbd class="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">Enter</kbd> to generate
        </div>
      </div>

      <!-- Right panel: Canvas -->
      <div
        ref="canvasHeaderRef"
        data-testid="canvas-panel"
        class="canvas flex-1 p-8 overflow-y-auto"
        data-panel="canvas"
        @click.stop="togglePanel"
      >
        <!-- Canvas header -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-white">
            Output
          </h2>
        </div>

        <!-- No-audio placeholder (hidden when audio exists — inline player takes over) -->
        <div
          v-if="!audioUrlRef"
          class="flex flex-col items-center justify-center py-12 text-gray-500"
        >
          <span
            aria-hidden="true"
            class="ph ph-speaker-simple-none text-4xl mb-3 opacity-40"
          />
          <p class="text-sm">
            Generate speech to see audio output
          </p>
        </div>
        <!-- Audio Player Panel (inline in canvas flow) -->
        <div
          v-if="audioUrlRef"
          class="mt-6 animate-slide-up"
        >
          <div
            class="rounded-2xl bg-studio-800 border border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.2)] overflow-hidden"
          >
            <!-- Player Header -->
            <div class="flex justify-between items-center px-4 py-3 gap-2">
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-sunrise-orange to-sunrise-magenta flex items-center justify-center shadow-[0_4px_16px_rgba(255,81,47,0.25)] shrink-0"
                >
                  <span
                    aria-hidden="true"
                    class="ph-fill ph-music-notes text-white text-sm"
                  />
                </div>
                <div class="overflow-hidden min-w-0">
                  <h3 class="text-white font-semibold text-xs truncate">
                    Generated Audio
                  </h3>
                  <p class="text-[10px] text-gray-400 truncate">
                    {{ selectedVoiceName }} • {{ speedValue.toFixed(1) }}x Speed
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  class="w-8 h-8 rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex items-center justify-center hover:text-white text-gray-400 transition-all"
                  title="Download MP3"
                  @click="audioDownload(selectedVoiceName)"
                >
                  <span class="rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
                    <span
                      aria-hidden="true"
                      class="ph ph-download-simple text-lg"
                    />
                  </span>
                </button>
                <button
                  class="w-8 h-8 rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex items-center justify-center hover:text-red-400 text-gray-400 transition-all"
                  title="Close Player"
                  @click="dispose"
                >
                  <span class="rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
                    <span
                      aria-hidden="true"
                      class="ph ph-x text-lg"
                    />
                  </span>
                </button>
              </div>
            </div>

            <!-- Player Controls -->
            <div class="px-4 pb-4">
              <div class="rounded-xl bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-3 flex items-center gap-3">
                <!-- Play/Pause -->
                <button
                  class="rounded-full bg-sunrise-magenta text-white flex items-center justify-center shadow-[0_0_20px_rgba(221,36,118,0.3)] active:scale-[0.96] hover:scale-[1.04] w-10 h-10 transition-all"
                  @click="audioToggle"
                >
                  <span
                    v-if="isPlaying && !isPaused"
                    aria-hidden="true"
                    class="ph-fill ph-pause text-lg"
                  />
                  <span
                    v-else
                    aria-hidden="true"
                    class="ph-fill ph-play text-lg"
                  />
                </button>

                <!-- Waveform -->
                <div class="flex-1 h-8 relative w-full overflow-hidden min-w-[100px]">
                  <WaveformCanvas
                    :visible="true"
                    :is-playing="isPlaying"
                    :current-time="currentTime"
                    :duration="duration"
                    @seek="audioSeek"
                  />
                </div>

                <!-- Time -->
                <span class="text-[10px] font-mono text-gray-400 flex-shrink-0 w-10 text-right">
                  {{ formatTime(duration) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile: stacked layout -->
    <div class="md:hidden h-screen flex flex-col">
      <!-- Canvas (top) -->
      <div
        class="canvas flex-1 overflow-y-auto relative"
        style="height: calc(100vh - 56px - 44px)"
        @click.stop="togglePanel"
      >
        <!-- Canvas header -->
        <div class="mb-6 px-4 pt-2">
          <h2 class="text-xl font-semibold text-white">
            Output
          </h2>
        </div>

        <!-- No-audio placeholder -->
        <div
          v-if="!audioUrlRef"
          class="flex flex-col items-center justify-center py-12 text-gray-500"
        >
          <span
            aria-hidden="true"
            class="ph ph-speaker-simple-none text-4xl mb-3 opacity-40"
          />
          <p class="text-sm">
            Generate speech to see audio output
          </p>
        </div>

        <!-- Audio Player Panel (inline in canvas flow) -->
        <div
          v-if="audioUrlRef"
          class="mt-6 animate-slide-up px-4"
        >
          <div
            class="rounded-2xl bg-studio-800 border border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.2)] overflow-hidden"
          >
            <!-- Player Header -->
            <div class="flex justify-between items-center px-4 py-3 gap-2">
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-sunrise-orange to-sunrise-magenta flex items-center justify-center shadow-[0_4px_16px_rgba(255,81,47,0.25)] shrink-0"
                >
                  <span
                    aria-hidden="true"
                    class="ph-fill ph-music-notes text-white text-sm"
                  />
                </div>
                <div class="overflow-hidden min-w-0">
                  <h3 class="text-white font-semibold text-xs truncate">
                    Generated Audio
                  </h3>
                  <p class="text-[10px] text-gray-400 truncate">
                    {{ selectedVoiceName }} • {{ speedValue.toFixed(1) }}x Speed
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  class="w-8 h-8 rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex items-center justify-center hover:text-white text-gray-400 transition-all"
                  title="Download MP3"
                  @click="audioDownload(selectedVoiceName)"
                >
                  <span class="rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
                    <span
                      aria-hidden="true"
                      class="ph ph-download-simple text-lg"
                    />
                  </span>
                </button>
                <button
                  class="w-8 h-8 rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex items-center justify-center hover:text-red-400 text-gray-400 transition-all"
                  title="Close Player"
                  @click="dispose"
                >
                  <span class="rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
                    <span
                      aria-hidden="true"
                      class="ph ph-x text-lg"
                    />
                  </span>
                </button>
              </div>
            </div>

            <!-- Player Controls -->
            <div class="px-4 pb-4">
              <div class="rounded-xl bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-3 flex items-center gap-3">
                <!-- Play/Pause -->
                <button
                  class="rounded-full bg-sunrise-magenta text-white flex items-center justify-center shadow-[0_0_20px_rgba(221,36,118,0.3)] active:scale-[0.96] hover:scale-[1.04] w-10 h-10 transition-all"
                  @click="audioToggle"
                >
                  <span
                    v-if="isPlaying && !isPaused"
                    aria-hidden="true"
                    class="ph-fill ph-pause text-lg"
                  />
                  <span
                    v-else
                    aria-hidden="true"
                    class="ph-fill ph-play text-lg"
                  />
                </button>

                <!-- Waveform -->
                <div class="flex-1 h-8 relative w-full overflow-hidden min-w-[100px]">
                  <WaveformCanvas
                    :visible="true"
                    :is-playing="isPlaying"
                    :current-time="currentTime"
                    :duration="duration"
                    @seek="audioSeek"
                  />
                </div>

                <!-- Time -->
                <span class="text-[10px] font-mono text-gray-400 flex-shrink-0 w-10 text-right">
                  {{ formatTime(duration) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile FAB: status indicator -->
      <div class="fixed bottom-4 right-4 z-40 md:hidden">
        <MobileStatusIndicator />
      </div>

      <!-- Control Deck (bottom, draggable divider) -->
      <div
        data-testid="control-deck-panel"
        class="control-deck border-t border-white/[0.06]"
        :style="{ height: `${canvasRatio * 100}%`, maxHeight: '85vh' }"
        @touchstart="onDragStart"
        @touchmove="onDragMove"
        @touchend="onDragEnd"
        @mousedown="onDragStart"
      >
        <!-- Drag divider handle -->
        <div
          data-testid="drag-divider"
          class="drag-divider h-1.5 cursor-ns-resize flex items-center justify-center"
        >
          <div class="w-12 h-1 bg-gray-600 rounded-full" />
        </div>

        <!-- Content -->
        <div class="p-4 overflow-y-auto">
          <!-- Voice Selector -->
          <div class="mb-4">
            <VoiceSelector
              v-model="selectedVoice"
              :voices="voices"
            />
          </div>

          <!-- Text Input -->
          <div class="mb-4">
            <label
              for="text-input-mobile"
              class="block text-sm font-medium text-gray-300 mb-2"
            >
              Enter Arabic Text
            </label>
            <textarea
              id="text-input-mobile"
              v-model="textInput"
              placeholder="Type or paste Arabic text here..."
              class="tts-input w-full min-h-[100px] resize-y"
              dir="rtl"
            />
          </div>

          <!-- Speed Slider -->
          <div class="mb-4">
            <SpeedSlider />
          </div>

          <!-- Generate Button -->
          <div class="mb-4">
            <GenerateButton
              :is-generating="isGenerating"
              :model-status="health.status"
              :disabled="isGenerateDisabled"
              :text="textInput"
              @click="handleGenerate"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dragging {
  cursor: ns-resize;
}

.dragging .drag-divider {
  background-color: rgb(22, 163, 74); /* green-600 */
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
