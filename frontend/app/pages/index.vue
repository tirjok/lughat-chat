<script setup lang="ts">
// Audio player composable for playback state management
// Toast notification for API errors
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

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

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
        <Transition name="slide-up-player">
          <div
            v-if="playerVisible && audioUrl"
            class="absolute bottom-0 left-0 w-full bg-studio-800 border-t border-studio-700 p-6 flex flex-col gap-4 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          >
            <!-- Player Header -->
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-sunrise-orange to-sunrise-magenta flex items-center justify-center shadow-lg">
                  <span
                    aria-hidden="true"
                    class="i-lucide-music-notes text-white"
                  />
                </div>
                <div>
                  <h3 class="text-white font-semibold text-sm">
                    Generated Audio
                  </h3>
                  <p class="text-xs text-gray-400">
                    {{ selectedVoiceName }} • {{ speedValue.toFixed(1) }}x Speed
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="w-10 h-10 rounded-full bg-studio-900 border border-studio-700 flex items-center justify-center hover:text-white text-gray-400 transition-colors"
                  title="Download MP3"
                  @click="handleDownload"
                >
                  <span
                    aria-hidden="true"
                    class="i-lucide-download-simple"
                  />
                </button>
                <button
                  class="w-10 h-10 rounded-full bg-studio-900 border border-studio-700 flex items-center justify-center hover:text-red-400 text-gray-400 transition-colors"
                  title="Close Player"
                  @click="handleClosePlayer"
                >
                  <span
                    aria-hidden="true"
                    class="i-lucide-x"
                  />
                </button>
              </div>
            </div>

            <!-- Heatmap Waveform Container -->
            <div class="w-full bg-studio-900 rounded-lg border border-studio-700 p-4 flex items-center gap-4">
              <button
                class="w-12 h-12 rounded-full bg-sunrise-magenta text-white flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(221,36,118,0.4)] flex-shrink-0"
                @click="togglePlayPause"
              >
                <span
                  v-if="isPlaying"
                  aria-hidden="true"
                  class="i-lucide-pause text-xl"
                />
                <span
                  v-else
                  aria-hidden="true"
                  class="i-lucide-play text-xl ml-1"
                />
              </button>

              <!-- Canvas for dynamic waveform -->
              <div class="flex-1 h-12 relative w-full overflow-hidden">
                <WaveformCanvas
                  :is-playing="isPlaying"
                  :current-time="currentTime"
                  :duration="duration"
                />
              </div>

              <span class="text-xs font-mono text-gray-400 flex-shrink-0 w-10 text-right">
                {{ formatTime(duration) }}
              </span>
            </div>
          </div>
        </Transition>
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
   Slide-Up Player Animation
   =================================== */
.slide-up-player-enter-active,
.slide-up-player-leave-active {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-player-enter-from,
.slide-up-player-leave-to {
  opacity: 0;
  transform: translateY(150%);
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
