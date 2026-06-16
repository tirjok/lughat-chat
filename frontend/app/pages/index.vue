<script setup lang="ts">
// Full-page TTS Studio — complete integration of all 6 components
// Two-panel layout: Left (Control Deck) + Right (Canvas)
import AudioPlayerPanel from '../components/AudioPlayerPanel.vue'
import PanelToggle from '../components/PanelToggle.vue'
import { computed, nextTick, shallowRef, watch, onUnmounted } from 'vue'
import { usePanelToggle } from '../composables/usePanelToggle'
import { useAudioModule } from '../composables/useAudioModule'
import { showToast } from '../composables/useToast'

const { activePanel, isMobile, togglePanel } = usePanelToggle()

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
  if (!isMobile.value) return ''
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
    class="h-dvh w-screen overflow-y-auto text-studio-text antialiased"
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
      {{ isMobile && panelAnnouncement }}
    </div>

    <!-- Panel Toggle FAB (mobile only) -->
    <PanelToggle
      :active-panel="activePanel"
      :toggle-panel="togglePanel"
    />

    <!-- Two-Panel Layout -->
    <div class="flex h-screen w-screen">
      <!-- LEFT PANEL: The Control Deck (30% desktop, 100% mobile) -->
      <aside
        role="region"
        aria-labelledby="control-deck-heading"
        data-panel="control-deck"
        :class="[
          'w-full md:w-[30%] lg:w-[25%] bg-studio-800 border-r border-studio-700 flex flex-col h-full z-20 shadow-2xl md:overflow-y-auto',
          isMobile && activePanel === 'control-deck' ? 'panel-slide-enter' : '',
          isMobile && activePanel !== 'control-deck' ? 'panel-slide-leave' : ''
        ]"
        style="padding-top: env(safe-area-inset-top);"
      >
        <!-- Header with gradient fade (matches sample exactly) -->
        <header
          class="p-6 border-b border-studio-700 flex justify-between items-center bg-gradient-to-b from-[#1f1f1f] to-transparent"
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

      <!-- RIGHT PANEL: The Canvas (70% desktop, 100% mobile) -->
      <main
        role="region"
        aria-labelledby="canvas-heading"
        data-panel="canvas"
        :class="[
          'w-full md:w-[70%] lg:w-[75%] bg-studio-900 relative flex flex-col h-full overflow-y-auto md:overflow-hidden',
          isMobile && activePanel === 'canvas' ? 'panel-slide-enter' : '',
          isMobile && activePanel !== 'canvas' ? 'panel-slide-leave' : ''
        ]"
        style="border-left: 1px solid #333333; padding-bottom: env(safe-area-inset-bottom);"
      >
        <!-- Focus Halo (radial gradient glow behind textarea) -->
        <FocusHaloCanvas :focused="!!textInput" />

        <!-- Header / Context -->
        <div class="w-full p-6 pb-4 flex justify-between items-center opacity-70 border-b border-studio-700">
          <h2 class="text-gray-400 font-medium text-sm flex items-center gap-2">
            <span
              aria-hidden="true"
              class="i-lucide-terminal text-lg"
            />
            Editor Canvas
          </h2>
          <div class="flex items-center gap-4 text-sm text-gray-500">
            <span
              class="font-mono"
              :class="{ 'text-red-400': isOverLimit, 'text-amber-400': isNearLimit, 'text-gray-500': !isNearLimit && !isOverLimit }"
            >
              {{ charCount }} / 3000
            </span>
            <button
              class="hover:text-white transition-colors bg-studio-900 border border-studio-700 rounded-full w-8 h-8 flex items-center justify-center"
              title="Clear Canvas"
              @click="handleClearText"
            >
              <span
                aria-hidden="true"
                class="i-lucide-trash"
              />
            </button>
          </div>
        </div>

        <!-- Text Input Area -->
        <div class="flex-1 relative w-full max-w-5xl mx-auto px-8 pb-32 flex flex-col border-b border-studio-700">
          <textarea
            v-model="textInput"
            dir="rtl"
            class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-3xl md:text-5xl leading-relaxed text-gray-200 placeholder-gray-700 scroll-smooth z-10"
            style="caret-color: #FF512F;"
            placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
          />
        </div>

        <!-- Floating Shortcut Hint (hidden on mobile) -->
        <div class="absolute bottom-6 right-8 text-gray-600 text-sm font-medium flex items-center gap-2 bg-studio-800/90 backdrop-blur px-4 py-2 rounded-lg border border-studio-700 hidden sm:flex">
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
    </div>

    <!-- Hidden audio element -->
    <audio
      ref="audioRef"
      class="hidden"
    />
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
   Hidden utility
   =================================== */
.hidden {
  @apply hidden;
}
</style>
