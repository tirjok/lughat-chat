<script setup lang="ts">
// Full-page TTS Studio — complete integration of all 6 components
// Two-panel layout: Left (Control Deck) + Right (Canvas)
import AudioPlayerPanel from '../components/AudioPlayerPanel.vue'
import MobileStatusIndicator from '../components/MobileStatusIndicator.vue'
import PanelToggle from '../components/PanelToggle.vue'
import { computed, nextTick, shallowRef, watch, onUnmounted } from 'vue'
import { usePanelToggle } from '../composables/usePanelToggle'
import { useAudioModule } from '../composables/useAudioModule'
import { showToast } from '../composables/useToast'

const { activePanel, togglePanel } = usePanelToggle()

const audioModule = useAudioModule({
  onPlaybackEnd: () => {
    audioModule.isPlaying.value = false
    audioModule.isPaused.value = false
  }
})

const { audioRef, audioUrl: _audioUrl, duration: _duration, currentTime: _currentTime, isPlaying: _isPlaying, isPaused: _isPaused, isLoading: _isLoading, error: audioError } = audioModule

const { synthesize, healthCheck: _healthCheck } = useTtsApi()
const { status: modelStatus, modelLoaded: _modelLoaded } = useHealthPoll()
const { voices: speakerVoices } = useVoices()

// Safety net: dispose on unmount
onUnmounted(() => audioModule.dispose())

const textInput = shallowRef('')
const selectedSpeaker = shallowRef('')
const speedValue = shallowRef(1.0)
const isGenerating = shallowRef(false)
const playerVisible = shallowRef(false)

// Track selected voice for display
const selectedVoiceName = computed(() => {
  const voice = speakerVoices.value.find(v => v.id === selectedSpeaker.value)
  return voice ? voice.name : ''
})

watch(speakerVoices, (v) => {
  if (!selectedSpeaker.value && v.length > 0) {
    selectedSpeaker.value = v[0]!.id
  }
}, { immediate: true })

const validationState = computed(() =>
  useInputValidation(textInput.value, modelStatus.value)
)

// Panel announcement for screen readers
const panelAnnouncement = computed(() => {
  return activePanel.value === 'control-deck'
    ? 'Switched to voice settings panel'
    : 'Switched to text editor panel'
})
const isValid = computed(() => validationState.value.isValid)
const validationError = computed(() => validationState.value.error)
const charCount = computed(() => textInput.value.length)
const isNearLimit = computed(() => {
  const ratio = charCount.value / 3000
  return ratio >= 0.8 && charCount.value <= 3000
})
const isOverLimit = computed(() => charCount.value > 3000)

async function handleSynthesize() {
  audioError.value = null

  if (!isValid.value) {
    showToast(validationError.value ?? 'Invalid text')
    return
  }

  isGenerating.value = true
  playerVisible.value = false

  try {
    const audioBlob = await synthesize({
      text: textInput.value,
      speaker: selectedSpeaker.value,
      speed: speedValue.value
    })

    audioModule.load(audioBlob)
    await nextTick()

    if (audioRef.value) {
      await audioModule.play()
    }

    await nextTick()
    playerVisible.value = true
  } catch (err) {
    if (err instanceof Error) {
      showToast(err.message, 'error')
    } else {
      showToast('An unexpected error occurred during generation', 'error')
    }
  } finally {
    isGenerating.value = false
  }
}

function handleDownload() {
  const filename = `tts_output_${Date.now()}.mp3`
  audioModule.download(filename)
}

function handleKeyDown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    handleSynthesize()
  }
}

function handleClearText() {
  textInput.value = ''
}

function handleClosePlayer() {
  playerVisible.value = false
  audioModule.pause()
}
</script>

<template>
  <div
    class="flex flex-col md:flex-row h-dvh w-full overflow-hidden text-studio-text antialiased"
    style="background-color: #121212;"
    dir="ltr"
    @keydown="handleKeyDown"
  >
    <!-- Toast Notification Container -->
    <ToastNotification />

    <!-- Screen reader live region for panel announcements -->
    <div
      role="status"
      class="absolute -translate-x-9999 -translate-y-9999 opacity-0 overflow-hidden h-0 w-0"
      aria-live="polite"
    >
      {{ panelAnnouncement }}
    </div>

    <!-- Panel Toggle FAB (mobile only) -->
    <PanelToggle
      :active-panel="activePanel"
      :toggle-panel="togglePanel"
    />

    <!-- Two-Panel Layout (CSS-only sliding via :has() on mobile) -->
    <div
      :data-active-panel="activePanel"
      class="relative flex flex-col md:flex-row h-dvh w-full overflow-hidden text-studio-text antialiased"
      style="background-color: #121212;"
    >
      <!-- LEFT PANEL: The Control Deck (35% md, 30% lg, 25% xl) -->
      <aside
        role="region"
        aria-labelledby="control-deck-heading"
        data-panel="control-deck"
        class="w-full md:w-[35%] lg:w-[30%] xl:w-[25%] bg-studio-800 border-t md:border-t-0 md:border-r border-studio-700 flex flex-col h-[45dvh] md:h-full z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.4)] md:shadow-2xl shrink-0 order-2 md:order-1"
      >
        <!-- Mobile Header (logo + status, visible below 768px) -->
        <header
          class="flex md:hidden justify-between items-center px-4 py-3 bg-studio-800 border-b border-studio-700 shrink-0 z-30 shadow-md"
          style="padding-top: env(safe-area-inset-top);"
        >
          <div class="flex items-center gap-2">
            <span
              aria-hidden="true"
              class="i-lucide-audio-waveform text-sunrise-orange text-xl"
            />
            <h1 class="text-lg font-bold text-white tracking-tight">
              Lughat<span class="text-sunrise-magenta">Chat</span>
            </h1>
          </div>
          <MobileStatusIndicator />
        </header>

        <!-- Desktop Header (hidden on mobile) -->
        <header
          class="hidden md:flex p-6 border-b border-studio-700 justify-between items-center bg-gradient-to-b from-[#1f1f1f] to-transparent shrink-0"
        >
          <div>
            <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span
                aria-hidden="true"
                class="i-lucide-audio-waveform text-sunrise-orange"
                style="filter: drop-shadow(0 0 6px rgba(255,81,47,0.6));"
              />
              Lughat<span style="color: #DD2476;">Chat</span>
            </h1>
            <p class="text-xs text-gray-400 mt-1 uppercase tracking-wider">
              Premium Audio Studio
            </p>
          </div>

          <!-- Status Indicator (pill style) -->
          <ModelStatusIndicator />
        </header>

        <!-- Controls Container -->
        <div class="flex-1 p-6 overflow-y-auto flex flex-col gap-6 border-b border-studio-700">
          <!-- Voice Selection -->
          <VoiceSelector
            v-model="selectedSpeaker"
            :voices="speakerVoices"
          />

          <!-- Speed Control -->
          <SpeedSlider v-model="speedValue" />

          <!-- Output Settings (matches sample design) -->
          <div class="flex flex-col gap-3 border-b border-studio-700 pb-6">
            <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <span
                aria-hidden="true"
                class="i-lucide-sliders-horizontal text-lg"
              />
              Output Settings
            </label>
            <div class="flex items-center justify-between bg-studio-900 p-3 rounded-lg border border-studio-700 shadow-inner">
              <span class="text-sm text-gray-400">High Quality Audio</span>
              <button
                class="w-8 h-4 bg-sunrise-orange rounded-full relative transition-colors duration-300 ease-in-out"
                title="High Quality Audio (placeholder)"
              >
                <span
                  class="w-3 h-3 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Action Area -->
        <div class="p-6 border-t border-studio-700 bg-studio-800">
          <GenerateButton
            :is-generating="isGenerating"
            :model-status="modelStatus"
            :disabled="!isValid || isGenerating || modelStatus === 'loading'"
            @click="handleSynthesize"
          />
        </div>
      </aside>

      <!-- RIGHT PANEL: The Canvas (65% md, 70% lg, 75% xl) -->
      <main
        role="region"
        aria-labelledby="canvas-heading"
        data-panel="canvas"
        class="w-full md:w-[65%] lg:w-[70%] xl:w-[75%] bg-studio-900 relative flex flex-col h-full overflow-hidden md:border-l border-studio-700 p-4 md:p-6 lg:p-8 pb-2 md:pb-4 order-1 md:order-2"
        style="padding-bottom: env(safe-area-inset-bottom);"
      >
        <!-- Focus Halo (radial gradient glow behind textarea) -->
        <FocusHaloCanvas :focused="!!textInput" />

        <!-- Header / Context -->
        <div class="w-full p-4 md:p-6 lg:p-8 pb-2 md:pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 shrink-0 border-b border-studio-700">
          <!-- Mobile Canvas Header (horizontal row, visible below 768px) -->
          <div class="flex justify-between items-center w-full md:w-auto md:hidden">
            <h2 class="text-gray-400 font-medium text-sm flex items-center gap-2">
              <span
                aria-hidden="true"
                class="i-lucide-terminal text-lg"
              />
              Editor Canvas
            </h2>
            <div class="flex items-center gap-3 text-sm text-gray-500">
              <span
                class="font-mono text-xs"
                :class="{ 'text-red-400': isOverLimit, 'text-amber-400': isNearLimit, 'text-gray-500': !isNearLimit && !isOverLimit }"
              >
                {{ charCount }} / 3000
              </span>
              <button
                class="hover:text-white transition-colors p-1"
                title="Clear Canvas"
                @click="handleClearText"
              >
                <span
                  aria-hidden="true"
                  class="i-lucide-trash text-lg"
                />
              </button>
            </div>
          </div>

          <!-- Desktop Canvas Header (label + AI toolbar row) -->
          <div class="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 w-full md:w-auto">
            <h2 class="hidden md:flex text-gray-400 font-medium text-sm items-center gap-2">
              <span
                aria-hidden="true"
                class="i-lucide-terminal text-lg"
              />
              Editor Canvas
            </h2>
          </div>

          <!-- Desktop Char Count & Clear (hidden on mobile) -->
          <div class="hidden md:flex items-center gap-4 text-sm text-gray-500 shrink-0">
            <span
              class="font-mono"
              :class="{ 'text-red-400': isOverLimit, 'text-amber-400': isNearLimit, 'text-gray-500': !isNearLimit && !isOverLimit }"
            >
              {{ charCount }} / 3000
            </span>
            <button
              class="hover:text-white transition-colors p-1"
              title="Clear Canvas"
              @click="handleClearText"
            >
              <span
                aria-hidden="true"
                class="i-lucide-trash text-lg"
              />
            </button>
          </div>
        </div>

        <!-- Text Input Area -->
        <div class="flex-1 relative w-full max-w-5xl mx-auto px-8 pb-32 flex flex-col border-b border-studio-700">
          <textarea
            v-model="textInput"
            dir="rtl"
            class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-2xl md:text-4xl lg:text-5xl leading-relaxed md:leading-[1.6] text-gray-200 placeholder-gray-700 scroll-smooth z-10"
            style="caret-color: #FF512F;"
            placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
          />
        </div>

        <!-- Floating Shortcut Hint (hidden on mobile, visible at md+) -->
        <div class="absolute bottom-6 right-8 text-gray-600 text-sm font-medium flex items-center gap-2 bg-studio-800/90 backdrop-blur px-4 py-2 rounded-lg border border-studio-700 hidden md:flex">
          Press
          <kbd class="bg-studio-900 px-2 py-1 rounded border border-studio-700 font-mono text-gray-400 shadow-sm">Ctrl</kbd>
          +
          <kbd class="bg-studio-900 px-2 py-1 rounded border border-studio-700 font-mono text-gray-400 shadow-sm">Enter</kbd>
          to generate
        </div>

        <!-- Audio Player Panel (slides up from bottom) -->
        <AudioPlayerPanel
          :visible="playerVisible && !!audioModule.audioUrl.value"
          :is-playing="audioModule.isPlaying.value"
          :is-paused="audioModule.isPaused.value"
          :current-time="audioModule.currentTime.value"
          :duration="audioModule.duration.value"
          :audio-url="audioModule.audioUrl.value"
          :selected-voice-name="selectedVoiceName"
          :speed-value="speedValue"
          @close="handleClosePlayer"
          @toggle="audioModule.pause"
          @download="handleDownload"
        />
      </main>

      <!-- Hidden audio element -->
      <audio
        ref="audioRef"
        class="hidden"
      />
    </div>
  </div>
</template>

<style>
/* ===================================
   Global Styles (fixed dark theme)
   =================================== */
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* Custom scrollbar for dark UI */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #121212;
}
::-webkit-scrollbar-thumb {
  background: #2A2A2A;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3A3A3A;
}

/* ===================================
   Focus Halo (radial gradient glow)
   =================================== */
.canvas-halo {
  position: absolute;
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 100px;
  background: radial-gradient(ellipse at center, rgba(255, 81, 47, 0.15) 0%, rgba(221, 36, 118, 0.05) 50%, transparent 70%);
  filter: blur(20px);
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  pointer-events: none;
}

.canvas-halo.active {
  opacity: 1;
}

/* ===================================
   Panel Sliding Transitions (CSS-only via :has(), mobile only)
   =================================== */
@media (max-width: 767px) {
  /* Both panels always in DOM; CSS decides which slides */
  [data-panel="control-deck"],
  [data-panel="canvas"] {
    width: 100%;
    transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1),
                opacity 500ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Control deck active → it's visible, canvas slides away */
  [data-active-panel="control-deck"] [data-panel="control-deck"] {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
  [data-active-panel="control-deck"] [data-panel="canvas"] {
    transform: translateY(150%);
    opacity: 0;
    pointer-events: none;
  }

  /* Canvas active → it's visible, control deck slides away */
  [data-active-panel="canvas"] [data-panel="canvas"] {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
  [data-active-panel="canvas"] [data-panel="control-deck"] {
    transform: translateY(150%);
    opacity: 0;
    pointer-events: none;
  }
}
</style>
