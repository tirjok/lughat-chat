<script setup lang="ts">
// Full-page TTS Studio — complete integration of all 6 components
// Two-panel layout: Left (Control Deck) + Right (Canvas)
// Mobile: both panels stacked vertically (canvas top, controls bottom)
// Desktop: side-by-side panels
import AudioPlayerPanel from '../components/AudioPlayerPanel.vue'
import MobileStatusIndicator from '../components/MobileStatusIndicator.vue'
import WaveformCanvas from '../components/WaveformCanvas.vue'
import { computed, nextTick, shallowRef, watch, onUnmounted, onMounted, ref } from 'vue'
import { usePanelToggle } from '../composables/usePanelToggle'
import { useAudioModule } from '../composables/useAudioModule'
import { showToast } from '../composables/useToast'

const { activePanel } = usePanelToggle()

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

const audioModule = useAudioModule({
  onPlaybackEnd: () => {
    // State (isPlaying, isPaused, currentTime=0) is already reset by the composable's 'ended' handler.
    // This callback is intentionally left as a hook for future use (e.g., auto-close panel).
  }
})

const { audioRef, audioUrl, duration, currentTime, isPlaying, isPaused } = audioModule

const { synthesize } = useTtsApi()
const { status: modelStatus, start } = useHealthPoll()
onMounted(() => {
  start()
})
const { voices: speakerVoices } = useVoices()

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Safety net: dispose on unmount
onUnmounted(() => audioModule.dispose())

const textInput = shallowRef('')
const selectedSpeaker = shallowRef('')
const speedValue = shallowRef(1.0)
const isGenerating = shallowRef(false)
const playerVisible = shallowRef(false)
const hqAudioEnabled = shallowRef(true)

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
    class="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden text-studio-text antialiased bg-studio-900"
    style="background-color: #121212;"
    dir="ltr"
    @keydown="handleKeyDown"
  >
    <!-- Toast Notification Container (prototype positioning) -->
    <div class="fixed top-20 md:top-4 left-4 right-4 md:left-auto md:w-80 z-50 flex flex-col gap-2 pointer-events-none">
      <ToastNotification />
    </div>

    <!-- Screen reader live region for panel announcements -->
    <div
      role="status"
      class="absolute -translate-x-9999 -translate-y-9999 opacity-0 overflow-hidden h-0 w-0"
      aria-live="polite"
    >
      {{ panelAnnouncement }}
    </div>

    <!-- Mobile: Split-screen (hidden on desktop) -->
    <div class="flex md:hidden flex-col h-dvh w-full overflow-hidden">
      <!-- Mobile Top Bar (logo + status, matching prototype) -->
      <header
        class="flex justify-between items-center px-4 py-3 bg-studio-800 border-b border-studio-700/40 shrink-0 z-40"
      >
        <div class="flex items-center gap-2">
          <span
            aria-hidden="true"
            class="ph-fill ph-waves text-sunrise-orange text-xl"
          />
          <h1 class="text-lg font-bold text-white tracking-tight">
            Lughat<span class="text-sunrise-magenta">Chat</span>
          </h1>
        </div>
        <MobileStatusIndicator />
      </header>

      <!-- Mobile: Canvas (top half) -->
      <main
        role="region"
        aria-labelledby="canvas-heading"
        data-panel="canvas"
        class="w-full bg-studio-900 relative flex flex-col overflow-hidden"
        :style="{ height: `${canvasRatio * 100}%` }"
      >
        <!-- Focus Halo (radial gradient glow behind textarea) -->
        <FocusHaloCanvas :focused="!!textInput" />

        <!-- Header / Context (mobile: compact layout matching prototype) -->
        <div
          class="w-full px-4 pt-3 pb-2 flex flex-col gap-2 shrink-0"
        >
          <!-- Mobile: Title + Char Count (full width row) -->
          <div class="flex justify-between items-center w-full">
            <h2 class="text-gray-400 font-medium text-xs flex items-center gap-1.5">
              <span
                aria-hidden="true"
                class="ph ph-keyboard"
              />
              <span class="inline">Editor Canvas</span>
            </h2>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span
                class="font-mono"
                :class="{ 'text-red-400': isOverLimit, 'text-amber-400': isNearLimit, 'text-gray-500': !isNearLimit && !isOverLimit }"
              >
                {{ charCount }} / 3000
              </span>
              <button
                class="text-gray-500 bg-transparent hover:text-white p-0.5"
                @click="handleClearText"
              >
                <span
                  aria-hidden="true"
                  class="ph ph-trash"
                />
              </button>
            </div>
          </div>

          <!-- Mobile: AI Toolbar (compact, no extra padding) hide it for now -->
          <div class="hidden items-center gap-2 w-full overflow-x-auto hide-scrollbar">
            <button
              class="shrink-0 flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-white transition-colors bg-studio-800 hover:bg-studio-700 px-2.5 py-1 rounded-lg border border-studio-700/60 hover:border-gray-500 group"
              title="Type in any language and translate to Arabic"
            >
              <span class="group-hover:animate-pulse">✨</span> Translate
            </button>
            <button
              class="shrink-0 flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-sunrise-orange transition-colors bg-studio-800 hover:bg-studio-700 px-2.5 py-1 rounded-lg border border-studio-700/60 hover:border-sunrise-orange group"
              title="Add Harakat (diacritics) for perfect TTS pronunciation"
            >
              <span class="group-hover:animate-pulse">✨</span> Add Diacritics
            </button>
            <button
              class="shrink-0 flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-sunrise-magenta transition-colors bg-studio-800 hover:bg-studio-700 px-2.5 py-1 rounded-lg border border-studio-700/60 hover:border-sunrise-magenta group"
              title="Let AI write the next few sentences"
            >
              <span class="group-hover:animate-pulse">✨</span> Continue Script
            </button>
          </div>
        </div>

        <!-- Text Input Area (mobile: full width, text-3xl, generous spacing) -->
        <div class="flex-1 relative w-full px-4 flex flex-col min-h-0">
          <textarea
            v-model="textInput"
            dir="rtl"
            class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-3xl leading-relaxed text-gray-200 placeholder-gray-700 scroll-smooth z-10"
            style="caret-color: #FF512F;"
            placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
          />
        </div>
      </main>

      <!-- Mobile drag divider (compact, minimal visual presence) -->
      <div
        class="relative z-30 flex items-center justify-center"
        style="height: 16px;"
        @touchstart="onDragStart"
        @touchmove="onDragMove"
        @touchend="onDragEnd"
        @mousedown="onDragStart"
        @mousemove="onDragMove"
        @mouseup="onDragEnd"
        @mouseleave="onDragEnd"
      >
        <div class="w-full h-px bg-studio-700/40" />
      </div>

      <!-- Mobile: Control Deck (bottom half) -->
      <aside
        role="region"
        aria-labelledby="control-deck-heading"
        data-panel="control-deck"
        class="flex-1 w-full bg-studio-800 flex flex-col overflow-hidden"
        :style="{ height: `${(1 - canvasRatio) * 100}%` }"
      >
        <!-- Controls Container (compact spacing for mobile) -->
        <div class="flex-1 p-3 overflow-y-auto flex flex-col gap-4">
          <!-- Voice Selection -->
          <VoiceSelector
            v-model="selectedSpeaker"
            :voices="speakerVoices"
          />

          <!-- Speed Control -->
          <SpeedSlider v-model="speedValue" />

          <!-- Output Settings (matches sample design) -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
              <span class="ph ph-sliders-horizontal" /> Output Settings
            </label>
            <div class="flex items-center justify-between bg-studio-900 px-3 py-2 rounded-lg border border-studio-700/60">
              <span class="text-xs text-gray-400">High Quality Audio</span>
              <button
                class="w-8 h-4 bg-sunrise-orange rounded-full relative cursor-pointer transition-colors duration-300 ease-in-out hover:bg-sunrise-orange/90 active:scale-95"
                style="box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2);"
                @click="hqAudioEnabled = !hqAudioEnabled"
              >
                <div
                  class="w-3 h-3 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"
                  :class="hqAudioEnabled ? 'right-0.5' : 'left-0.5'"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Action Area (compact) -->
        <div class="p-3 border-t border-studio-700/40 bg-studio-800 shrink-0">
          <GenerateButton
            :is-generating="isGenerating"
            :model-status="modelStatus"
            :disabled="!isValid || isGenerating || modelStatus === 'loading'"
            @click="handleSynthesize"
          />
        </div>

        <!-- Mobile: Generated Audio Card (appears after generation) -->
        <div
          v-if="playerVisible && audioUrl"
          class="p-3 border-t border-studio-700/40 bg-studio-800 shrink-0"
        >
          <div class="flex items-center gap-3">
            <!-- Gradient music icon -->
            <div
              class="w-9 h-9 rounded-full bg-gradient-to-br from-sunrise-orange to-sunrise-magenta flex items-center justify-center shadow-lg shrink-0"
            >
              <span
                aria-hidden="true"
                class="ph-fill ph-music-notes text-white text-sm"
              />
            </div>
            <!-- Title + subtitle -->
            <div class="overflow-hidden min-w-0 flex-1">
              <h3 class="text-white font-semibold text-xs truncate">
                Generated Audio
              </h3>
              <p class="text-[10px] text-gray-400 truncate">
                {{ selectedVoiceName }} • {{ speedValue.toFixed(1) }}x Speed
              </p>
            </div>
            <!-- Action buttons -->
            <div class="flex items-center gap-2 shrink-0">
              <button
                class="w-8 h-8 rounded-full bg-studio-900 border border-studio-700/60 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title="Download MP3"
                @click="handleDownload"
              >
                <span
                  aria-hidden="true"
                  class="ph ph-download-simple text-lg"
                />
              </button>
              <button
                class="w-8 h-8 rounded-full bg-studio-900 border border-studio-700/60 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                title="Close Player"
                @click="handleClosePlayer"
              >
                <span
                  aria-hidden="true"
                  class="ph ph-x text-lg"
                />
              </button>
            </div>
          </div>

          <!-- Waveform + Play -->
          <div class="mt-2 bg-studio-900 rounded-lg border border-studio-700/60 p-2 flex items-center gap-2">
            <!-- Play/Pause button -->
            <button
              class="w-9 h-9 rounded-full bg-sunrise-magenta text-white flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(221,36,118,0.4)] flex-shrink-0"
              @click="audioModule.toggle"
            >
              <span
                v-if="isPlaying && !isPaused"
                aria-hidden="true"
                class="ph-fill ph-pause text-base"
              />
              <span
                v-else
                aria-hidden="true"
                class="ph-fill ph-play text-base ml-0.5"
              />
            </button>

            <!-- Waveform canvas -->
            <div class="flex-1 h-7 relative w-full overflow-hidden min-w-[80px]">
              <WaveformCanvas
                :visible="playerVisible"
                :is-playing="isPlaying"
                :current-time="currentTime"
                :duration="duration"
                @seek="audioModule.seek"
              />
            </div>

            <!-- Duration -->
            <span class="text-[10px] font-mono text-gray-400 flex-shrink-0 w-8 text-right">
              {{ formatTime(duration) }}
            </span>
          </div>
        </div>
      </aside>
    </div>

    <!-- Desktop: Side-by-side (hidden on mobile) -->
    <div
      class="hidden md:flex flex-row h-dvh w-full"
      style="background-color: #121212;"
    >
      <!-- LEFT PANEL: The Control Deck (35% md, 30% lg, 25% xl) -->
      <aside
        role="region"
        aria-labelledby="control-deck-heading"
        data-panel="control-deck"
        class="w-full md:w-[35%] lg:w-[30%] xl:w-[25%] bg-studio-800 border-t md:border-t-0 md:border-r border-studio-700/60 flex flex-col h-[45dvh] md:h-full z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.4)] md:shadow-2xl shrink-0 order-2 md:order-1 transition-all duration-300"
      >
        <!-- Mobile Header (logo + status, visible below 768px) -->
        <header
          class="flex md:hidden justify-between items-center px-4 py-3 bg-studio-800 border-b border-studio-700/60 shrink-0 z-30 shadow-md"
        >
          <div class="flex items-center gap-2">
            <span
              aria-hidden="true"
              class="ph-fill ph-waves text-sunrise-orange text-xl"
            />
            <h1 class="text-lg font-bold text-white tracking-tight">
              Lughat<span class="text-sunrise-magenta">Chat</span>
            </h1>
          </div>
          <MobileStatusIndicator />
        </header>

        <!-- Desktop Header (hidden on mobile) -->
        <header
          class="hidden md:flex p-6 border-b border-studio-700/60 justify-between items-center bg-gradient-to-b from-[#1f1f1f] to-transparent shrink-0"
        >
          <div>
            <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span
                aria-hidden="true"
                class="ph-fill ph-waves text-sunrise-orange"
              />
              Lughat<span class="text-sunrise-magenta">Chat</span>
            </h1>
            <p class="text-xs text-gray-400 mt-1 uppercase tracking-wider">
              Premium Audio Studio
            </p>
          </div>

          <!-- Status Indicator (pill style) -->
          <ModelStatusIndicator />
        </header>

        <!-- Controls Container (prototype: p-4 md:p-6, gap-6 md:gap-8, no border-b) -->
        <div class="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-6 md:gap-8">
          <!-- Voice Selection -->
          <VoiceSelector
            v-model="selectedSpeaker"
            :voices="speakerVoices"
          />

          <!-- Speed Control -->
          <SpeedSlider v-model="speedValue" />

          <!-- Output Settings (matches sample design) -->
          <div class="flex flex-col gap-3">
            <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <span class="ph ph-sliders-horizontal text-lg" /> Output Settings
            </label>
            <div class="flex items-center justify-between bg-studio-900 p-3 rounded-lg border border-studio-700/60">
              <span class="text-sm text-gray-400">High Quality Audio</span>
              <button
                class="w-10 h-5 bg-sunrise-orange rounded-full relative cursor-pointer transition-colors duration-300 ease-in-out hover:bg-sunrise-orange/90 active:scale-95"
                style="box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2);"
                @click="hqAudioEnabled = !hqAudioEnabled"
              >
                <div
                  class="w-4 h-4 bg-white rounded-full absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out shadow-md"
                  :class="hqAudioEnabled ? 'right-0.5' : 'left-0.5'"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Action Area (prototype: p-4 md:p-6, shrink-0) -->
        <div class="p-4 md:p-6 border-t border-studio-700/60 bg-studio-800 shrink-0">
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
        class="flex-1 w-full bg-studio-900 relative flex flex-col overflow-hidden order-1 md:order-2"
      >
        <!-- Focus Halo (radial gradient glow behind textarea) -->
        <FocusHaloCanvas :focused="!!textInput" />

        <!-- Header / Context -->
        <div
          class="w-full p-4 md:p-6 lg:p-8 pb-2 md:pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 shrink-0"
        >
          <!-- Mobile: Title + Char Count (stacked, full width) -->
          <div class="flex justify-between items-center w-full md:w-auto md:hidden">
            <h2 class="text-gray-400 font-medium text-sm flex items-center gap-2">
              <span
                aria-hidden="true"
                class="ph ph-keyboard text-lg"
              />
              <span class="inline">Editor Canvas</span>
            </h2>
            <div class="flex items-center gap-3 text-sm text-gray-500">
              <span
                class="font-mono text-xs"
                :class="{ 'text-red-400': isOverLimit, 'text-amber-400': isNearLimit, 'text-gray-500': !isNearLimit && !isOverLimit }"
              >
                {{ charCount }} / 3000
              </span>
              <button
                class="text-gray-500 bg-transparent hover:bg-studio-700"
                @click="handleClearText"
              >
                <span
                  aria-hidden="true"
                  class="ph ph-trash text-lg"
                />
              </button>
            </div>
          </div>

          <div class="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 w-full md:w-auto">
            <h2 class="hidden md:flex text-gray-400 font-medium text-sm items-center gap-2">
              <span
                aria-hidden="true"
                class="ph ph-keyboard text-lg"
              />
              <span>Editor Canvas</span>
            </h2>

            <!-- AI Smart Tools Toolbar (mobile: visible, horizontally scrollable) -->
            <div class="hidden items-center gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar pb-1 md:pb-0 md:pl-4 md:border-l border-studio-700 shrink-0">
              <button
                class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors bg-studio-800 hover:bg-studio-700 px-3 py-1.5 rounded-lg border border-studio-700 hover:border-gray-500 group"
                title="Type in any language and translate to Arabic"
              >
                <span class="group-hover:animate-pulse">✨</span> Translate
              </button>
              <button
                class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-sunrise-orange transition-colors bg-studio-800 hover:bg-studio-700 px-3 py-1.5 rounded-lg border border-studio-700 hover:border-sunrise-orange group"
                title="Add Harakat (diacritics) for perfect TTS pronunciation"
              >
                <span class="group-hover:animate-pulse">✨</span> Add Diacritics
              </button>
              <button
                class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-sunrise-magenta transition-colors bg-studio-800 hover:bg-studio-700 px-3 py-1.5 rounded-lg border border-studio-700 hover:border-sunrise-magenta group"
                title="Let AI write the next few sentences"
              >
                <span class="group-hover:animate-pulse">✨</span> Continue Script
              </button>
            </div>
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
              class="text-gray-500 bg-transparent hover:bg-studio-700"
              @click="handleClearText"
            >
              <span
                aria-hidden="true"
                class="ph ph-trash text-lg"
              />
            </button>
          </div>
        </div>

        <!-- Text Input Area (mobile: px-4 pb-4, no max-width; desktop: px-4 md:px-8 pb-4 md:pb-32 max-w-5xl) -->
        <div class="flex-1 relative w-full max-w-5xl mx-auto px-4 md:px-8 pb-4 md:pb-32 flex flex-col">
          <textarea
            v-model="textInput"
            dir="rtl"
            class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-2xl md:text-4xl lg:text-5xl leading-relaxed md:leading-[1.6] text-gray-200 placeholder-gray-700 scroll-smooth z-10"
            style="caret-color: #FF512F;"
            placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
          />
        </div>

        <!-- Floating Shortcut Hint (hidden on mobile, visible at md+) -->
        <div class="absolute bottom-6 right-8 text-gray-600 text-sm font-medium flex items-center gap-2 bg-studio-800/80 backdrop-blur px-4 py-2 rounded-lg border border-studio-700/50 hidden md:flex">
          Press
          <kbd class="bg-studio-900 px-2 py-1 rounded border border-studio-700/60 font-mono text-gray-400 shadow-sm">Ctrl</kbd>
          +
          <kbd class="bg-studio-900 px-2 py-1 rounded border border-studio-700/60 font-mono text-gray-400 shadow-sm">Enter</kbd>
          to generate
        </div>

        <!-- Audio Player Panel (slides up from bottom) -->
        <AudioPlayerPanel
          :visible="playerVisible && !!audioUrl"
          :is-playing="isPlaying"
          :is-paused="isPaused"
          :current-time="currentTime"
          :duration="duration"
          :audio-url="audioUrl"
          :selected-voice-name="selectedVoiceName"
          :speed-value="speedValue"
          @close="handleClosePlayer"
          @toggle="audioModule.toggle"
          @download="handleDownload"
          @seek="audioModule.seek"
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

/* Hide scrollbar for horizontal toolbars but keep functionality */
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
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
   Mobile Split-Screen: Panel Sliding Transitions
   When dragging the divider, panels resize
   via inline styles. When not dragging,
   panels snap to their default ratio.
   =================================== */
@media (max-width: 767px) {
  /* Prevent text selection during drag */
  body.dragging {
    user-select: none !important;
    -webkit-user-select: none !important;
  }

  /* Smooth height transitions when not dragging */
  [data-panel="canvas"],
  [data-panel="control-deck"] {
    transition: height 200ms ease-out;
  }
}
</style>
