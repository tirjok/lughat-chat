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
  isLoading,
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

const audioElement = computed(() => audioRef.value ?? undefined)

const { synthesize, healthCheck: _healthCheck } = useTtsApi()
const { status: modelStatus, modelLoaded: _modelLoaded } = useHealthPoll()
const { voices: speakerVoices } = useVoices()

const textInput = shallowRef('')
const selectedSpeaker = shallowRef('')
const speedValue = shallowRef(1.0)
const isGenerating = shallowRef(false)

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
</script>

<template>
  <div
    class="min-h-screen"
    style="background-color: #121212;"
    dir="ltr"
    @keydown="handleKeyDown"
  >
    <!-- Two-Panel Layout -->
    <div class="flex min-h-screen">
      <!-- Left Sidebar (~30% desktop, ~25% lg+) -->
      <aside class="w-[30%] lg:w-[25%]">
        <AppHeader />
      </aside>

      <!-- Right Content Area (~70% desktop, ~75% lg+) -->
      <main class="w-[70%] lg:w-[75%]">
        <div class="mx-auto max-w-2xl px-4 py-6">
          <!-- Text Input -->
          <ArabicTextarea
            v-model="textInput"
            :max-length="3000"
          />

          <!-- Controls -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Speaker Selection -->
            <div class="space-y-1.5">
              <label
                for="speaker-select"
                class="flex items-center gap-2 text-xs font-semibold text-gray-300"
              >
                <span
                  aria-hidden="true"
                  class="i-lucide-user"
                />
                Voice
              </label>
              <div class="relative">
                <select
                  id="speaker-select"
                  v-model="selectedSpeaker"
                  class="w-full appearance-none rounded-lg border border-gray-600 bg-gray-900/40 p-2.5 text-sm text-gray-100 focus:border-blue-500"
                  autocomplete="off"
                >
                  <option
                    v-for="voice in speakerVoices"
                    :key="voice.id"
                    :value="voice.id"
                  >
                    {{ voice.name }}
                  </option>
                </select>
                <span
                  aria-hidden="true"
                  class="i-lucide-chevron-down absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
            </div>

            <!-- Speed Control -->
            <div class="space-y-1.5">
              <label
                for="speed-slider"
                class="flex items-center gap-2 text-xs font-semibold text-gray-300"
              >
                <span
                  aria-hidden="true"
                  class="i-lucide-gauge"
                />
                Speech Speed
              </label>
              <SpeedSlider v-model="speedValue" />
            </div>
          </div>

          <!-- Generate Button -->
          <GenerateButton
            :is-generating="isGenerating"
            :model-status="modelStatus"
            :disabled="!isValid || isGenerating || modelStatus === 'loading'"
            @click="handleSynthesize"
          />

          <!-- Audio Player Section -->
          <Transition name="slide-up">
            <div
              v-if="audioUrl"
              class="space-y-3 rounded-xl border-t border-gray-700/60 bg-gray-900/30 p-4"
            >
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-semibold text-gray-300">
                  <span
                    aria-hidden="true"
                    class="i-lucide-headphones"
                  />
                  Result
                </h3>
                <span class="font-mono text-[10px] text-gray-500">
                  {{ formatTime(duration) }}
                </span>
              </div>

              <audio
                ref="audioRef"
                class="hidden"
              />

              <!-- Progress Bar -->
              <SeekableProgressBar
                :current-time="currentTime"
                :duration="duration"
                @seek="(ratio) => { if (audioElement && duration) audioElement.currentTime = ratio * duration }"
              />

              <!-- Time Display -->
              <div class="flex justify-between font-mono text-[10px] text-gray-500">
                <span>{{ formatTime(currentTime) }}</span>
                <span>{{ formatTime(duration) }}</span>
              </div>

              <!-- Controls -->
              <div class="flex items-center justify-center gap-3">
                <PlayPauseButton
                  :is-playing="isPlaying"
                  :is-paused="isPaused"
                  :is-loading="isLoading"
                  @toggle="togglePlayPause"
                />

                <button
                  aria-label="Download audio"
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-gray-200 transition-transform active:scale-95 hover:bg-gray-600"
                  @click="handleDownload"
                >
                  <span
                    aria-hidden="true"
                    class="i-lucide-download h-4 w-4"
                  />
                </button>
              </div>
            </div>
          </Transition>

          <!-- Footer -->
          <footer class="pt-2 text-center text-[10px] text-gray-500">
            <p>Lughat Chat — Arabic Text-to-Speech</p>
            <p class="mt-1">
              Powered by Nuxt and UnoCSS
            </p>
          </footer>
        </div>

        <!-- Floating Keyboard Hint (bottom-right of canvas) -->
        <div class="fixed bottom-4 right-4">
          <div
            class="rounded-lg bg-gray-800/90 px-3 py-2 text-[10px] text-gray-400 shadow-lg backdrop-blur-sm"
          >
            <KeyboardHint />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
/* ===================================
   Page Block (tts-page)
   =================================== */
.min-h-screen {
  @apply min-h-screen relative overflow-hidden;
}

/* ===================================
   Transition Animations
   =================================== */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform, opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* ===================================
   Focus Styles
   =================================== */
.tts-input:focus-visible,
select:focus-visible {
  outline: none;
}

/* ===================================
   Toast Block (tts-toast)
   =================================== */
.tts-toast {
  @apply fixed top-4 left-1/2 -translate-x-1/2 z-50 p-3 bg-gray-800 rounded-lg shadow-xl border border-gray-700 flex items-center gap-3 max-w-md;

  &--error {
    @apply border-red-700;
  }

  &__icon {
    @apply w-5 h-5 text-red-500 flex-shrink-0;
  }

  &__message {
    @apply text-sm text-white flex-1;
  }

  &__close {
    @apply w-5 h-5 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer;
  }
}

.tts-toast-enter-active,
.tts-toast-leave-active {
  transition: transform, opacity 0.3s ease;
}

.tts-toast-enter-from,
.tts-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}

/* ===================================
   Margin Top Utility
   =================================== */
.mt-1 {
  @apply mt-1;
}
</style>
