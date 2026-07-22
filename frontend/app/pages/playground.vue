<script setup lang="ts">
// Full-page TTS Studio — complete integration of all 6 components
// Two-panel layout: Left (Control Deck) + Right (Canvas)
// Mobile: both panels stacked vertically (canvas top, controls bottom)
// Desktop: side-by-side panels
import MobileStatusIndicator from '../components/MobileStatusIndicator.vue'
import WaveformCanvas from '../components/WaveformCanvas.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePanelToggle } from '../composables/usePanelToggle'
import { useAudioModule } from '../composables/useAudioModule'
import { useScrollReveal } from '../composables/useScrollReveal'
import { useHealthPoll } from '../composables/useHealthPoll'
import { useVoices } from '../composables/useVoices'
import { useTtsApi } from '../composables/useTtsApi'
import { showToast } from '../composables/useToast'

// SEO metadata for playground page
useSeoMeta({
  title: 'TTS Playground — LughatChat',
  description: 'Arabic Text-to-Speech Studio — Generate speech with XTTS-v2'
})

const { togglePanel } = usePanelToggle()
const audioModule = useAudioModule({
  onPlaybackEnd: () => {
    isPlaying.value = false
    isPaused.value = false
  }
})
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

// Keyboard shortcut: Ctrl/Cmd+Enter triggers synthesis
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

// Handle keyboard shortcut
async function handleKeydown(e: KeyboardEvent): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const key = (e as any).key
  const modifier = e.ctrlKey || e.metaKey

  if (key === 'Enter' && modifier) {
    e.preventDefault()
    await handleGenerate()
  }
}

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
    @keydown="handleKeydown"
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
        <!-- Audio Player Panel -->
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
      <!-- Mobile status indicator (FAB) -->
      <MobileStatusIndicator />

      <!-- Canvas top -->
      <div
        class="canvas-mobile flex-shrink-0 overflow-y-auto"
        :style="{ height: `${canvasRatio * 100}%` }"
        @click.stop="togglePanel"
      >
        <div class="p-4">
          <!-- No-audio placeholder (hidden when audio exists) -->
          <div
            v-if="!audioUrlRef"
            class="flex flex-col items-center justify-center py-8 text-gray-500"
          >
            <span
              aria-hidden="true"
              class="ph ph-speaker-simple-none text-3xl mb-2 opacity-40"
            />
            <p class="text-xs">
              Generate speech to see audio output
            </p>
          </div>
          <div
            v-if="audioUrlRef"
            class="mt-4"
          >
            <div
              class="rounded-2xl bg-studio-800 border border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.2)] overflow-hidden"
            >
              <div class="flex justify-between items-center px-3 py-2.5 gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="w-7 h-7 rounded-full bg-gradient-to-br from-sunrise-orange to-sunrise-magenta flex items-center justify-center shadow-[0_4px_16px_rgba(255,81,47,0.25)] shrink-0"
                  >
                    <span
                      aria-hidden="true"
                      class="ph-fill ph-music-notes text-white text-xs"
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
                    class="w-7 h-7 rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex items-center justify-center hover:text-white text-gray-400"
                    title="Download MP3"
                    @click="audioDownload(selectedVoiceName)"
                  >
                    <span class="rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
                      <span
                        aria-hidden="true"
                        class="ph ph-download-simple text-base"
                      />
                    </span>
                  </button>
                  <button
                    class="w-7 h-7 rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex items-center justify-center hover:text-red-400 text-gray-400"
                    title="Close Player"
                    @click="dispose"
                  >
                    <span class="rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
                      <span
                        aria-hidden="true"
                        class="ph ph-x text-base"
                      />
                    </span>
                  </button>
                </div>
              </div>

              <div class="px-3 pb-3">
                <div class="rounded-xl bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-2.5 flex items-center gap-2">
                  <button
                    class="rounded-full bg-sunrise-magenta text-white flex items-center justify-center shadow-[0_0_20px_rgba(221,36,118,0.3)] active:scale-[0.96] hover:scale-[1.04] w-8 h-8 transition-all"
                    @click="audioToggle"
                  >
                    <span
                      v-if="isPlaying && !isPaused"
                      aria-hidden="true"
                      class="ph-fill ph-pause text-base"
                    />
                    <span
                      v-else
                      aria-hidden="true"
                      class="ph-fill ph-play text-base"
                    />
                  </button>
                  <div class="flex-1 h-8 relative w-full overflow-hidden min-w-[80px]">
                    <WaveformCanvas
                      :visible="true"
                      :is-playing="isPlaying"
                      :current-time="currentTime"
                      :duration="duration"
                      @seek="audioSeek"
                    />
                  </div>
                  <span class="text-[10px] font-mono text-gray-400 flex-shrink-0 w-9 text-right">
                    {{ formatTime(duration) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Drag divider -->
      <div
        class="drag-divider h-4 bg-gray-800 cursor-ns-resize flex-center"
        :class="{ 'bg-green-600': isDragging }"
        @touchstart="onDragStart"
        @touchmove="onDragMove"
        @touchend="onDragEnd"
        @mousedown="onDragStart"
      >
        <div class="w-12 h-1 bg-gray-500 rounded-full" />
      </div>

      <!-- Control deck bottom -->
      <div
        class="control-deck-mobile flex-1 overflow-y-auto p-4"
        :style="{ height: `${(1 - canvasRatio) * 100}%` }"
      >
        <VoiceSelector
          v-model="selectedVoice"
          :voices="voices"
        />
        <textarea
          v-model="textInput"
          placeholder="Type or paste Arabic text here..."
          class="tts-input w-full min-h-[100px] resize-y"
          dir="rtl"
        />
        <SpeedSlider />
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
