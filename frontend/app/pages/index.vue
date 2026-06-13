<script setup lang="ts">
// Audio player composable for playback state management
// Toast notification for API errors
import AudioPlayerPanel from '../components/AudioPlayerPanel.vue'
import { computed, nextTick, shallowRef, watch } from 'vue'
import { showToast } from '../composables/useToast'

const {
  audioRef,
  duration,
  currentTime,
  isPlaying,
  isPaused,
  isLoading: _isLoading,
  error: audioError,
  loadAudio,
  play,
  togglePlayPause,
  downloadAudio,
  audioUrl
} = useAudioPlayer({
  onPlaybackEnd: () => {
    isPlaying.value = false
    isPaused.value = false
  }
})

const _audioElement = computed(() => audioRef.value ?? undefined)

const { synthesize, healthCheck: _healthCheck } = useTtsApi()
const { status: modelStatus, modelLoaded: _modelLoaded } = useHealthPoll()
const { voices: speakerVoices } = useVoices()

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
const isValid = computed(() => validationState.value.isValid)
const validationError = computed(() => validationState.value.error)

async function handleSynthesize() {
  audioError.value = null

  if (!isValid.value) {
    showToast(validationError.value ?? 'Invalid text')
    return
  }

  isGenerating.value = true
  // Hide player when starting new generation
  playerVisible.value = false

  try {
    const audioBlob = await synthesize({
      text: textInput.value,
      speaker: selectedSpeaker.value,
      speed: speedValue.value
    })

    const url = loadAudio(audioBlob)
    await nextTick()

    if (audioRef.value && url) {
      await play()
    }

    // Show player after generation
    await nextTick()
    playerVisible.value = true
  } catch (err) {
    if (err instanceof Error) {
      showToast(err.message)
    } else {
      showToast('An unexpected error occurred during generation')
    }
  } finally {
    isGenerating.value = false
  }
}

function handleDownload() {
  const filename = `tts_output_${Date.now()}.mp3`
  downloadAudio(filename)
}

function handleKeyDown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    handleSynthesize()
  }
}

function handleClosePlayer() {
  playerVisible.value = false
  // Stop playback when closing
  const el = audioRef.value
  if (el) {
    el.pause()
    isPlaying.value = false
    isPaused.value = false
  }
}
</script>

<template>
  <div
    class="h-screen w-screen overflow-hidden text-studio-text antialiased"
    style="background-color: #121212;"
    dir="ltr"
    @keydown="handleKeyDown"
  >
    <!-- Two-Panel Layout -->
    <div class="flex h-screen w-screen">
      <!-- LEFT PANEL: The Control Deck (~30% desktop, ~25% lg+) -->
      <aside class="w-full md:w-[30%] lg:w-[25%] bg-studio-800 border-r border-studio-700 flex flex-col h-full z-20 shadow-2xl">
        <!-- Header -->
        <AppHeader />

        <!-- Controls Container -->
        <div class="flex-1 p-6 overflow-y-auto flex flex-col gap-8">
          <VoiceSelector
            v-model="selectedSpeaker"
            :voices="speakerVoices"
          />

          <!-- Speed Control -->
          <SpeedSlider v-model="speedValue" />
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

      <!-- RIGHT PANEL: The Canvas (~70% desktop, ~75% lg+) -->
      <main class="w-full md:w-[70%] lg:w-[75%] bg-studio-900 relative flex flex-col h-full overflow-hidden">
        <!-- Focus Halo (behind textarea) -->
        <FocusHaloCanvas />

        <!-- Header / Context -->
        <div class="w-full p-8 pb-4 flex justify-between items-center opacity-70">
          <h2 class="text-gray-400 font-medium text-sm flex items-center gap-2">
            <span
              aria-hidden="true"
              class="i-lucide-keyboard text-lg"
            />
            Editor Canvas
          </h2>
          <div class="flex items-center gap-4 text-sm text-gray-500">
            <span class="font-mono">{{ textInput.length }} / 3000</span>
            <button
              class="hover:text-white transition-colors"
              title="Clear Canvas"
              @click="textInput = ''"
            >
              <span
                aria-hidden="true"
                class="i-lucide-trash"
              />
            </button>
          </div>
        </div>

        <!-- Text Input Area -->
        <div class="flex-1 relative w-full max-w-5xl mx-auto px-8 pb-32 flex flex-col">
          <textarea
            v-model="textInput"
            dir="rtl"
            class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-3xl md:text-5xl leading-relaxed text-gray-200 placeholder-gray-700 scroll-smooth z-10"
            style="caret-color: #FF512F;"
            placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
          />
        </div>

        <!-- Floating Shortcut Hint (bottom-right of canvas) -->
        <div class="absolute bottom-6 right-8 bg-studio-800/80 backdrop-blur px-4 py-2 rounded-lg border border-studio-700/50">
          <KeyboardHint />
        </div>

        <!-- Audio Player Panel (slides up from bottom) -->
        <AudioPlayerPanel
          :visible="playerVisible && !!audioUrl"
          :is-playing="isPlaying"
          :current-time="currentTime"
          :duration="duration"
          :audio-url="audioUrl"
          :selected-voice-name="selectedVoiceName"
          :speed-value="speedValue"
          @close="handleClosePlayer"
          @toggle="togglePlayPause"
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
