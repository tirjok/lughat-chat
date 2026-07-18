<script setup lang="ts">
// Full-page TTS Studio — complete integration of all 6 components
// Two-panel layout: Left (Control Deck) + Right (Canvas)
// Mobile: both panels stacked vertically (canvas top, controls bottom)
// Desktop: side-by-side panels
import AudioPlayerPanel from '../components/AudioPlayerPanel.vue'
import MobileStatusIndicator from '../components/MobileStatusIndicator.vue'
import WaveformCanvas from '../components/WaveformCanvas.vue'
import { onUnmounted, ref } from 'vue'
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

const { activePanel } = usePanelToggle()
const {
  isPlaying,
  isPaused,
  currentTime,
  duration,
  audioUrl: audioUrlRef
} = useAudioModule()

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
const audioUrl = ref<string | null>(null)

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
    audioUrl.value = URL.createObjectURL(blob)
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
const { status: modelStatus } = useHealthPoll()
const { voices, loadVoices } = useVoices()
const selectedVoice = ref('KSA Zariyah - Female')
const selectedVoiceName = ref(selectedVoice.value)

// Load voices on mount
onMounted(() => {
  loadVoices()
})

// Cleanup audio URL on unmount
onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})
</script>

<template>
  <div
    class="tts-page min-h-screen bg-[#121212] dark:bg-[#0a0a0a]"
    dir="ltr"
    @keydown="handleKeydown"
  >
    <!-- Navigation bar (compact: no hamburger since Playground has no sidebar) -->
    <NavBar compact />
    <!-- Hidden audio element for download -->
    <audio
      v-if="audioUrl"
      ref="audioRef"
      :src="audioUrl"
      class="hidden"
    />

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
            :model-status="modelStatus"
            :disabled="isGenerating"
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
      >
        <!-- Canvas header -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-white">
            Output
          </h2>
        </div>

        <!-- Waveform Canvas -->
        <WaveformCanvas
          :audio-url="audioUrlRef"
          :is-playing="isPlaying"
          :is-generating="isGenerating"
          :current-time="currentTime"
          :duration="duration"
          :visible="true"
        />

        <!-- Audio Player Panel -->
        <AudioPlayerPanel
          v-if="audioUrl"
          :audio-url="audioUrlRef"
          :is-playing="isPlaying"
          :is-paused="isPaused"
          :current-time="currentTime"
          :duration="duration"
          :visible="activePanel === 'canvas'"
          :selected-voice-name="selectedVoiceName"
          :speed-value="speedValue"
          @toggle="() => {}"
        />
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
      >
        <div class="p-4">
          <WaveformCanvas
            :audio-url="audioUrlRef"
            :is-playing="isPlaying"
            :is-generating="isGenerating"
            :current-time="currentTime"
            :duration="duration"
            :visible="true"
          />
          <AudioPlayerPanel
            v-if="audioUrl"
            :audio-url="audioUrlRef"
            :is-playing="isPlaying"
            :is-paused="isPaused"
            :current-time="currentTime"
            :duration="duration"
            :visible="activePanel === 'canvas'"
            :selected-voice-name="selectedVoiceName"
            :speed-value="speedValue"
            @toggle="() => {}"
          />
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
          :model-status="modelStatus"
          :disabled="isGenerating"
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
</style>
