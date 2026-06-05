<script setup lang="ts">
// Audio player composable for playback state management
// Toast notification for API errors
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
    // Reset play state when audio ends
    isPlaying.value = false
    isPaused.value = false
  }
})

// API composable for TTS backend calls
const { synthesize, healthCheck: _healthCheck } = useTtsApi()

// Model loading status via Issue 4 composable
const { status: modelStatus, modelLoaded: _modelLoaded } = useHealthPoll()

// Reactive state for form inputs
const textInput = ref('')
const selectedSpeaker = ref('default')
const speedValue = ref(1.0)

// Reactive state for UI feedback
const isGenerating = ref(false)

// Input validation composable — reactive via computed
const validationState = computed(() =>
  useInputValidation(textInput.value, modelStatus.value)
)
const isValid = computed(() => validationState.value.isValid)
const validationError = computed(() => validationState.value.error)

// Available speakers (can be extended with backend speaker list)
const speakers = [
  { value: 'default', label: 'Default Voice' }
]

// Format time in MM:SS format
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Handle synthesis request
async function handleSynthesize() {
  // Reset previous states
  audioError.value = null

  // Validate input (composable handles text + model status)
  if (!isValid.value) {
    showToast(validationError.value ?? 'Invalid text')
    return
  }

  // Set loading state
  isGenerating.value = true

  try {
    // Call TTS API
    const audioBlob = await synthesize({
      text: textInput.value,
      speaker: selectedSpeaker.value,
      speed: speedValue.value
    })

    // Load audio blob into player
    const url = loadAudio(audioBlob)

    // Auto-play the generated audio
    if (audioRef.value && url) {
      await play()
    }
  } catch (err) {
    // Handle error — show error message in toast
    if (err instanceof Error) {
      showToast(err.message)
    } else {
      showToast('An unexpected error occurred during generation')
    }
  } finally {
    // Reset loading state
    isGenerating.value = false
  }
}

// Handle download
function handleDownload() {
  const filename = `tts_output_${Date.now()}.mp3`
  downloadAudio(filename)
}

// Handle keyboard shortcut (Ctrl+Enter to generate)
function handleKeyDown(event: KeyboardEvent) {
  // Composable validates text + model status internally
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    handleSynthesize()
  }
}
</script>

<template>
  <div
    class="tts-page"
    dir="ltr"
    @keydown="handleKeyDown"
  >
    <!-- Subtle background gradient -->
    <div class="tts-page__bg" />

    <div class="tts-page__wrapper">
      <!-- Compact Header -->
      <header class="tts-header">
        <div class="tts-header__content">
          <!-- Small icon with subtle glow -->
          <div class="tts-header__icon">
            <span
              aria-hidden="true"
              class="i-lucide-volume-2"
            />
          </div>

          <!-- Title and description -->
          <div class="tts-header__text">
            <h1 class="tts-header__title">
              Lughat Chat
            </h1>
            <p class="tts-header__subtitle">
              Instant Arabic Text-to-Speech
            </p>
          </div>
        </div>

        <!-- Model loading indicator -->
        <ModelStatusIndicator />

        <!-- Keyboard shortcut hint -->
        <p class="tts-header__shortcut">
          Press
          <kbd class="tts-header__kbd">Ctrl</kbd> +
          <kbd class="tts-header__kbd">Enter</kbd>
          for quick generation
        </p>
      </header>

      <!-- Main Content Card -->
      <div class="tts-card">
        <!-- Text Input Section -->
        <ArabicTextarea
          v-model="textInput"
          :max-length="2000"
        />

        <!-- Controls Section — horizontal compact layout -->
        <div class="tts-controls">
          <!-- Speaker Selection -->
          <div class="tts-control-group">
            <label
              for="speaker-select"
              class="tts-control-group__label"
            >
              <span
                aria-hidden="true"
                class="i-lucide-user"
              />
              Voice
            </label>
            <div class="tts-select-wrapper">
              <select
                id="speaker-select"
                v-model="selectedSpeaker"
                class="tts-select"
                autocomplete="off"
              >
                <option
                  v-for="speaker in speakers"
                  :key="speaker.value"
                  :value="speaker.value"
                >
                  {{ speaker.label }}
                </option>
              </select>
              <span
                aria-hidden="true"
                class="i-lucide-chevron-down tts-select__arrow"
              />
            </div>
          </div>

          <!-- Speed Control -->
          <div class="tts-control-group">
            <label
              for="speed-slider"
              class="tts-control-group__label"
            >
              <span
                aria-hidden="true"
                class="i-lucide-gauge"
              />
              Speech Speed
            </label>
            <div class="tts-speed-control">
              <input
                id="speed-slider"
                v-model.number="speedValue"
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                class="tts-range"
                autocomplete="off"
              >
              <div class="tts-speed-value">
                {{ speedValue }}x
              </div>
            </div>
          </div>
        </div>

        <!-- Generate Button -->
        <button
          :disabled="!isValid || isGenerating"
          class="tts-btn-generate"
          :class="{ 'tts-btn-generate--loading': isGenerating }"
          @click="handleSynthesize"
        >
          <div class="tts-btn-generate__content">
            <span
              v-if="isGenerating"
              aria-hidden="true"
              class="i-lucide-loader tts-btn-generate__icon"
            />
            <span
              v-else-if="modelStatus === 'loading'"
              aria-hidden="true"
              class="i-lucide-loader animate-spin tts-btn-generate__icon"
            />
            <span
              v-else
              aria-hidden="true"
              class="i-lucide-mic tts-btn-generate__icon"
            />
            <span>
              {{ isGenerating ? 'Generating…' : modelStatus === 'loading' ? 'Loading…' : 'Generate Speech' }}
            </span>
          </div>
        </button>

        <!-- Audio Player Section -->
        <Transition name="tts-slide-up">
          <div
            v-if="audioUrl"
            class="tts-audio"
          >
            <div class="tts-audio__header">
              <h3 class="tts-audio__title">
                <span
                  aria-hidden="true"
                  class="i-lucide-headphones"
                />
                Result
              </h3>
              <span class="tts-audio__duration">{{ formatTime(duration) }}</span>
            </div>

            <!-- Audio Element (hidden, controlled by composable) -->
            <audio
              ref="audioRef"
              class="hidden"
            />

            <!-- Custom Audio Controls -->
            <div class="tts-audio__container">
              <!-- Waveform-style Progress Bar -->
              <SeekableProgressBar
                :current-time="currentTime"
                :duration="duration"
                @seek="(ratio) => { if (audioRef.value && duration) audioRef.value.currentTime = ratio * duration }"
              />

              <!-- Time Display -->
              <div class="tts-audio__time">
                <span>{{ formatTime(currentTime) }}</span>
                <span>{{ formatTime(duration) }}</span>
              </div>

              <!-- Control Buttons -->
              <div class="tts-audio__controls">
                <!-- Play/Pause Button -->
                <PlayPauseButton
                  :is-playing="isPlaying"
                  :is-paused="isPaused"
                  :is-loading="isLoading"
                  @toggle="togglePlayPause"
                />

                <!-- Download Button -->
                <button
                  aria-label="Download audio"
                  class="tts-audio__download-btn"
                  @click="handleDownload"
                >
                  <span
                    aria-hidden="true"
                    class="i-lucide-download"
                  />
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Footer -->
      <footer class="tts-footer">
        <p>Lughat Chat — Arabic Text-to-Speech</p>
        <p class="mt-1">
          Powered by Nuxt and UnoCSS
        </p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* ===================================
   Page Block (tts-page)
   =================================== */
.tts-page {
  @apply min-h-screen relative overflow-hidden;

  &__bg {
    @apply absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900;
    z-index: -1;
  }

  &__wrapper {
    @apply max-w-2xl mx-auto px-4 py-6 space-y-5 relative;
  }
}

/* ===================================
   Header Block (tts-header)
   =================================== */
.tts-header {
  @apply text-center;

  &__content {
    @apply flex items-center justify-center gap-3;
  }

  &__icon {
    @apply w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm;

    .i-lucide-volume-2 {
      @apply w-5 h-5 text-white;
    }
  }

  &__text {
    @apply text-right;
  }

  &__title {
    @apply text-xl font-bold text-gray-900 dark:text-white;
  }

  &__subtitle {
    @apply text-xs text-gray-500 dark:text-gray-400;
  }

  &__status {
    @apply flex items-center justify-center gap-2 mt-1;

    &-text {
      @apply text-xs font-medium;
    }
  }

  &__shortcut {
    @apply text-[10px] text-gray-400 dark:text-gray-500 mt-1;
  }

  &__kbd {
    @apply px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-mono;
  }
}

/* ===================================
   Card Block (tts-card)
   =================================== */
.tts-card {
  @apply bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 dark:border-gray-700/50 p-5 space-y-4;
}

/* ===================================
   Section Block (tts-section)
   =================================== */
.tts-section {
  @apply space-y-2;

  &__label {
    @apply block text-sm font-semibold text-gray-900 dark:text-white;
  }
}

/* ===================================
   Text Input Block (tts-input)
   =================================== */
.tts-input {
  @apply w-full p-5 border rounded-xl focus:border-blue-400 dark:focus:border-blue-500 bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500;
  transition: border-color, background-color 0.2s ease;
  border-width: 1.5px;

  /* Prevent horizontal overflow */
  box-sizing: border-box;
  min-width: 0;              /* critical for flex/grid containers */
  overflow-x: hidden;

  /* Reliable auto-resize: grows vertically with content */
  resize: vertical;
  min-height: 6rem;          /* starts taller, expands as user types */
  max-height: 20rem;         /* caps at ~320px to prevent page overflow */
  overflow-y: auto;          /* scrollbar only when exceeding max-height */

  /* Arabic text optimization — larger, more readable */
  font-size: 1.35rem;        /* ~22px — generous size for Arabic readability */
  line-height: 2.1;          /* extra spacing for Arabic descenders (ي، ب، ت، ن) */
  letter-spacing: 0.015em;   /* subtle widening without gaps */
  word-spacing: 0.08em;      /* slight breathing room between Arabic words */

  /* Font stack: prioritize Arabic-optimized fonts */
  font-family:
    'Noto Sans Arabic',     /* Google's best Arabic sans-serif */
    'Amiri',                /* beautiful Naskh-style fallback */
    'Scheherazade New',     /* another Arabic serif option */
    'Segoe UI',             /* Windows fallback */
    system-ui,              /* modern system font */
    -apple-system,          /* macOS/iOS fallback */
    'Helvetica Neue',       /* older Western fallback */
    Arial,                  /* universal fallback */
    sans-serif;             /* final fallback */

  /* Crisp text rendering for Arabic glyphs */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;

  /* Subtle inner shadow for depth */
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);

  &:focus {
    @apply border-blue-400 dark:border-blue-500 bg-white/80 dark:bg-gray-900/60;
    box-shadow:
      inset 0 1px 3px rgba(0, 0, 0, 0.04),
      0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    @apply text-gray-400 dark:text-gray-500;
    font-size: inherit;
    line-height: inherit;
  }

  &__meta {
    @apply flex justify-between text-xs text-gray-500 dark:text-gray-400;

    &--error {
      @apply text-red-500;
    }
  }

}

/* ===================================
   Controls Block (tts-controls)
   =================================== */
.tts-controls {
  @apply grid grid-cols-1 md:grid-cols-2 gap-3;
}

/* Control Group */
.tts-control-group {
  @apply space-y-1.5;

  &__label {
    @apply flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300;
  }
}

/* ===================================
   Select Block (tts-select)
   =================================== */
.tts-select {
  @apply w-full p-2.5 border rounded-lg focus:border-blue-400 dark:focus:border-blue-500 bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm text-gray-900 dark:text-white appearance-none;
  transition: border-color, background-color 0.2s ease;
  border-width: 1.5px;
  font-size: 0.9rem;

  &__arrow {
    @apply absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none;
  }
}

/* ===================================
   Range Slider Block (tts-range)
   =================================== */
.tts-range {
  @apply w-full h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500;

  &__labels {
    @apply flex justify-between text-xs text-gray-500 dark:text-gray-400;
  }
}

/* ===================================
   Generate Button Block (tts-btn-generate)
   =================================== */
.tts-btn-generate {
  @apply w-full px-6 py-3.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98];
  transition: box-shadow, transform 0.2s ease;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
  color: white;
  border-radius: 1rem;
  box-shadow:
    0 4px 12px rgba(59, 130, 246, 0.25),
    0 1px 3px rgba(0, 0, 0, 0.08);

  &:hover:not(:disabled) {
    box-shadow:
      0 6px 20px rgba(59, 130, 246, 0.35),
      0 2px 6px rgba(0, 0, 0, 0.1);
  }

  &__content {
    @apply flex items-center justify-center gap-2;
  }

  &__icon {
    @apply w-4 h-4;
  }

  &--loading &__icon {
    @apply animate-spin;
  }
}

/* ===================================
   Error Display Block (tts-error)
   =================================== */
.tts-error {
  @apply p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg space-y-2;

  &__content {
    @apply flex items-start gap-3;
  }

  &__icon {
    @apply w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5;
  }

  &__body {
    @apply flex-1;
  }

  &__title {
    @apply font-semibold text-red-800 dark:text-red-200;
  }

  &__message {
    @apply text-sm text-red-700 dark:text-red-300;
  }

  &__close {
    @apply text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors;

    .i-lucide-x {
      @apply w-4 h-4;
    }
  }
}

/* ===================================
   Audio Player Block (tts-audio)
   =================================== */
.tts-audio {
  @apply space-y-3 pt-4 border-t border-gray-200/60 dark:border-gray-700/60;

  &__header {
    @apply flex items-center justify-between;
  }

  &__title {
    @apply text-xs font-semibold text-gray-700 dark:text-gray-300;
  }

  &__duration {
    @apply text-[10px] font-mono text-gray-400 dark:text-gray-500;
  }

  &__container {
    @apply bg-gray-50/60 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 space-y-2.5;
  }

  &__progress {
    @apply relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden;

    &-fill {
      @apply absolute top-0 right-0 h-full bg-gradient-to-l from-blue-500 to-indigo-500;
    transition: width 0.1s ease;
      border-radius: inherit;
    }

    &-wrapper {
      @apply relative cursor-pointer;
    }

    &-thumb {
      @apply absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full -translate-x-1/2 shadow-md;
    }
  }

  &__time {
    @apply flex justify-between text-[10px] font-mono text-gray-500 dark:text-gray-400;
  }

  &__controls {
    @apply flex items-center justify-center gap-3;
  }

  &__play-btn {
    @apply w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white flex items-center justify-center shadow-md active:scale-95;
    transition: box-shadow, transform 0.2s ease;

    .i-lucide-play,
    .i-lucide-pause {
      @apply w-5 h-5 fill-current;
    }

    &:disabled {
      @apply opacity-50 cursor-not-allowed;
    }
  }

  &__download-btn {
    @apply w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center active:scale-95;
    transition: background-color, transform 0.2s ease;

    .i-lucide-download {
      @apply w-4 h-4;
    }
  }
}

/* ===================================
   Footer Block (tts-footer)
   =================================== */
.tts-footer {
  @apply text-center text-[10px] text-gray-400 dark:text-gray-500 pt-2;
}

/* ===================================
   Icon Block (tts-icon)
   =================================== */
.tts-icon {
  @apply inline-block align-middle;
}

/* ===================================
   Transition Animations (tts-transition)
   =================================== */
.tts-fade-enter-active,
.tts-fade-leave-active {
  transition: opacity 0.3s ease;
}

.tts-fade-enter-from,
.tts-fade-leave-to {
  opacity: 0;
}

.tts-slide-up-enter-active,
.tts-slide-up-leave-active {
  transition: transform, opacity 0.3s ease;
}

.tts-slide-up-enter-from,
.tts-slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* ===================================
   Range Slider Thumb (tts-range-thumb)
   =================================== */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.2);
  }
}

input[type='range']::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}

/* ===================================
   Focus Styles (tts-focus)
   =================================== */
.tts-input:focus-visible,
.tts-select:focus-visible {
  outline: none;
}

/* ===================================
   Toast Block (tts-toast)
   =================================== */
.tts-toast {
  @apply fixed top-4 left-1/2 -translate-x-1/2 z-50 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3 max-w-md;

  &--error {
    @apply border-red-300 dark:border-red-700;
  }

  &__icon {
    @apply w-5 h-5 text-red-500 flex-shrink-0;
  }

  &__message {
    @apply text-sm text-gray-900 dark:text-white flex-1;
  }

  &__close {
    @apply w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer;
  }
}

/* ===================================
   Select Wrapper (tts-select-wrapper)
   =================================== */
.tts-select-wrapper {
  @apply relative;
}

/* ===================================
   Speed Control (tts-speed-control)
   =================================== */
.tts-speed-control {
  @apply flex items-center gap-3;

  &__value {
    @apply text-sm font-semibold text-blue-600 dark:text-blue-400 min-w-[3rem];
  }
}

/* ===================================
   Input Wrapper (tts-input-wrapper)
   =================================== */
.tts-input-wrapper {
  @apply relative;
}

/* ===================================
   Hidden Utility (hidden)
   =================================== */
.hidden {
  @apply hidden;
}

/* ===================================
   Margin Top Utility (mt-1)
   =================================== */
.mt-1 {
  @apply mt-1;
}
</style>
