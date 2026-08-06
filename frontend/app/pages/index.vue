<script setup lang="ts">
// Full-page TTS Studio — complete integration of all 6 components
// Two-panel layout: Left (Control Deck) + Right (Canvas)
// Mobile: both panels stacked vertically (canvas top, controls bottom)
// Desktop: side-by-side panels
import AudioPlayerPanel from '../components/AudioPlayerPanel.vue'
import MobileStatusIndicator from '../components/MobileStatusIndicator.vue'
import WaveformCanvas from '../components/WaveformCanvas.vue'
import { computed, nextTick, shallowRef, watch, onUnmounted, ref, type Ref } from 'vue'
import { usePanelToggle } from '../composables/usePanelToggle'
import { useAudioModule } from '../composables/useAudioModule'
import { useScrollReveal } from '../composables/useScrollReveal'
import { showToast } from '../composables/useToast'

const { activePanel } = usePanelToggle()

// Scroll-reveal: observe desktop control deck sections for fade-up
const controlDeckDesktopRef = ref<HTMLElement | null>(null)
useScrollReveal(controlDeckDesktopRef as Ref<HTMLElement | null>)

// Scroll-reveal: observe desktop canvas header for fade-up
const canvasHeaderRef = ref<HTMLElement | null>(null)
useScrollReveal(canvasHeaderRef as Ref<HTMLElement | null>)

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
const { status: modelStatus } = useHealthPoll()
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
      speed: speedValue.value,
      seed: 42
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
    class="flex flex-col md:flex-row h-[calc(100vh-60px)] w-full overflow-hidden text-studio-text antialiased bg-studio-900"
    data-test-id="main-wrapper"
    style="background-color: #121212;"
    dir="ltr"
    @keydown="handleKeyDown"
  >
    <!-- Toast Notification Container (prototype positioning) -->
    <!-- Mobile: positioned below the floating header pill (~64px navbar + ~10px margin = ~74px) -->
    <div class="fixed top-[74px] md:top-4 left-4 right-4 md:left-auto md:w-80 z-50 flex flex-col gap-2 pointer-events-none">
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
    <div class="flex md:hidden flex-col h-[calc(100vh-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full overflow-hidden"
      data-test-id="mobile-split-screen"
    >
      <!-- Mobile Top Bar (logo + status) — Floating Glass Pill (safe-area aware) -->
      <header
        class="flex justify-between items-center px-3 py-2.5 bg-studio-800/90 backdrop-blur-xl ring-1 ring-white/[0.06] rounded-full mx-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] mt-[max(0.625rem,env(safe-area-inset-top))] shrink-0 z-40 shadow-[0_8px_32px_rgba(0,0,0,0.3)] fade-up"
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
              <!-- Clear text button: Double-Bezel -->
              <span class="rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
                <button
                  class="rounded-full bg-studio-700 text-gray-500 hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] active:scale-95"
                  @click="handleClearText"
                >
                  <span
                    aria-hidden="true"
                    class="ph ph-trash"
                  />
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Text Input Area (mobile: full width, text-3xl, generous spacing) -->
        <div class="flex-1 relative w-full px-4 flex flex-col min-h-0">
          <textarea
            v-model="textInput"
            dir="rtl"
            class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-lg leading-loose text-gray-100 placeholder-gray-600 scroll-smooth z-10"
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
        <div class="w-full h-px bg-white/[0.06]" />
      </div>

      <!-- Mobile: Control Deck (bottom half) -->
      <aside
        role="region"
        aria-labelledby="control-deck-heading"
        data-panel="control-deck"
        class="flex-1 w-full bg-studio-800 flex flex-col overflow-hidden border-t border-white/[0.06]"
        :style="{ height: `${(1 - canvasRatio) * 100}%` }"
      >
        <!-- Controls Container — compact -->
        <div class="flex-1 p-3 overflow-y-auto flex flex-col">
          <div class="flex flex-col gap-4">
            <!-- Voice Selection -->
            <VoiceSelector
              v-model="selectedSpeaker"
              :voices="speakerVoices"
            />

            <!-- Speed Control -->
            <SpeedSlider v-model="speedValue" />
          </div>
        </div>

        <!-- Generate Button -->
        <div class="p-3 border-t border-white/[0.06] bg-studio-800 shrink-0">
          <GenerateButton
            :is-generating="isGenerating"
            :model-status="modelStatus"
            :disabled="!isValid || isGenerating || modelStatus === 'loading'"
            @click="handleSynthesize"
          />
        </div>

        <!-- Mobile: Generated Audio Card: Double-Bezel -->
        <div
          v-if="playerVisible && audioUrl"
          class="border-t border-white/[0.06] bg-studio-800 shrink-0"
        >
          <!-- Outer Shell -->
          <div class="p-2.5 rounded-[1.125rem] ring-1 ring-white/[0.06] bg-white/[0.02]">
            <!-- Inner Core -->
            <div class="rounded-[calc(1.125rem-0.25rem)] bg-studio-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-3 flex flex-col gap-3">
              <!-- Header: Gradient music icon + title + action buttons -->
              <div class="flex items-center gap-3">
                <!-- Gradient music icon -->
                <div
                  class="w-9 h-9 rounded-full bg-gradient-to-br from-sunrise-orange to-sunrise-magenta flex items-center justify-center shadow-[0_4px_16px_rgba(255,81,47,0.25)] shrink-0"
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
                <!-- Action buttons: Double-Bezel + Magnetic -->
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    class="magnetic-hover w-8 h-8 rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex items-center justify-center text-gray-400 hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    title="Download MP3"
                    @click="handleDownload"
                  >
                    <span class="rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
                      <span
                        aria-hidden="true"
                        class="ph ph-download-simple text-lg"
                      />
                    </span>
                  </button>
                  <button
                    class="magnetic-hover w-8 h-8 rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex items-center justify-center text-gray-400 hover:text-red-400 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    title="Close Player"
                    @click="handleClosePlayer"
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

              <!-- Waveform + Play: Double-Bezel -->
              <!-- Outer Shell -->
              <div class="rounded-[0.875rem] ring-1 ring-white/[0.06] p-1 bg-white/[0.02] flex items-center gap-2">
                <!-- Inner Core -->
                <div class="rounded-[calc(0.875rem-0.25rem)] bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center gap-2 p-2">
                  <!-- Play/Pause button: Double-Bezel -->
                  <!-- Outer Shell -->
                  <span class="rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex-shrink-0">
                    <!-- Inner Core -->
                    <button
                      class="group rounded-full bg-sunrise-magenta text-white flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_0_20px_rgba(221,36,118,0.3)] active:scale-[0.98] hover:scale-[1.02] w-9 h-9"
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
                        class="ph-fill ph-play text-base"
                      />
                    </button>
                  </span>

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
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Desktop: Side-by-side (hidden on mobile) -->
    <div
      class="hidden md:flex flex-row h-full w-full"
      style="background-color: #121212;"
    >
      <!-- LEFT PANEL: The Control Deck (35% md, 30% lg, 25% xl) — Fade-up -->
      <aside
        ref="controlDeckDesktopRef"
        role="region"
        aria-labelledby="control-deck-heading"
        data-panel="control-deck"
        class="w-full md:w-[35%] lg:w-[30%] xl:w-[25%] bg-studio-800 border-t md:border-t-0 md:border-r border-white/[0.06] flex flex-col h-[45dvh] md:h-full z-20 shadow-[0_-8px_32px_rgba(0,0,0,0.25)] md:shadow-[0_-16px_48px_rgba(0,0,0,0.35)] shrink-0 order-2 md:order-1 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] fade-up delay-100"
      >
        <!-- Mobile Header (logo + status, visible below 768px) -->
        <header
          class="flex md:hidden justify-between items-center px-4 py-3 bg-studio-800 border-b border-white/[0.06] shrink-0 z-30"
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
          class="hidden md:flex p-6 border-b border-white/[0.06] justify-between items-center bg-gradient-to-b from-[#1f1f1f] to-transparent shrink-0"
        >
          <div>
            <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span
                aria-hidden="true"
                class="ph-fill ph-waves text-sunrise-orange"
              />
              Lughat<span class="text-sunrise-magenta">Chat</span>
            </h1>
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] font-medium bg-white/[0.04] text-gray-400">
              Premium Audio Studio
            </span>
          </div>

          <!-- Status Indicator (pill style) -->
          <ModelStatusIndicator />
        </header>

        <!-- Controls Container — unified, compact -->
        <div class="flex-1 p-5 overflow-y-auto flex flex-col">
          <div class="flex flex-col gap-5 fade-up delay-200">
            <VoiceSelector
              v-model="selectedSpeaker"
              :voices="speakerVoices"
            />
            <SpeedSlider v-model="speedValue" />
          </div>
        </div>

        <!-- Generate Button — full-width anchor -->
        <div class="p-5 border-t border-white/[0.06] bg-studio-800 shrink-0">
          <GenerateButton
            :is-generating="isGenerating"
            :model-status="modelStatus"
            :disabled="!isValid || isGenerating || modelStatus === 'loading'"
            @click="handleSynthesize"
          />
        </div>
      </aside>

      <!-- RIGHT PANEL: The Canvas (65% md, 70% lg, 75% xl) — Fade-up -->
      <main
        ref="canvasHeaderRef"
        role="region"
        aria-labelledby="canvas-heading"
        data-panel="canvas"
        class="flex-1 w-full bg-studio-900 relative flex flex-col overflow-hidden order-1 md:order-2 fade-up delay-100"
      >
        <!-- Focus Halo (radial gradient glow behind textarea) -->
        <FocusHaloCanvas :focused="!!textInput" />

        <!-- Header / Context: Eyebrow tag -->
        <div
          class="w-full p-4 md:p-6 lg:p-8 pb-2 md:pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 shrink-0"
        >
          <span class="hidden md:inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] font-medium ring-1 ring-white/[0.08] bg-studio-700 text-gray-300">
            Text Editor
          </span>
          <!-- Mobile: Title + Char Count (stacked, full width) -->
          <div class="flex justify-between items-center w-full md:w-auto md:hidden">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] font-medium ring-1 ring-white/[0.08] bg-studio-700 text-gray-300 md:hidden">
                Editor
              </span>
              <h2 class="text-gray-400 font-medium text-sm flex items-center gap-2">
                <span
                  aria-hidden="true"
                  class="ph ph-keyboard text-sm -translate-y-[1px]"
                />
                <span class="inline">Editor Canvas</span>
              </h2>
            </div>
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
            <div class="hidden md:flex items-center gap-2">
              <h2 class="text-gray-400 font-medium text-sm flex items-center gap-2">
                <span
                  aria-hidden="true"
                  class="ph ph-keyboard text-sm -translate-y-[1px]"
                />
                <span>Editor Canvas</span>
              </h2>
            </div>

            <!-- AI Smart Tools Toolbar: Double-Bezel -->
            <!-- Outer Shell -->
            <div class="hidden items-center gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar pb-1 md:pb-0 md:pl-4 border-l border-white/[0.06] shrink-0">
              <!-- Outer Shell per button -->
              <span class="shrink-0 rounded-[0.75rem] ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
                <!-- Inner Core -->
                <button
                  class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-[calc(0.75rem-0.125rem)] bg-studio-800 hover:bg-studio-700 px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] group"
                  title="Type in any language and translate to Arabic"
                >
                  <span class="group-hover:animate-pulse">✨</span> Translate
                </button>
              </span>
              <span class="shrink-0 rounded-[0.75rem] ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
                <!-- Inner Core -->
                <button
                  class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-sunrise-orange transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-[calc(0.75rem-0.125rem)] bg-studio-800 hover:bg-studio-700 px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] group"
                  title="Add Harakat (diacritics) for perfect TTS pronunciation"
                >
                  <span class="group-hover:animate-pulse">✨</span> Add Diacritics
                </button>
              </span>
              <span class="shrink-0 rounded-[0.75rem] ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
                <!-- Inner Core -->
                <button
                  class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-sunrise-magenta transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-[calc(0.75rem-0.125rem)] bg-studio-800 hover:bg-studio-700 px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] group"
                  title="Let AI write the next few sentences"
                >
                  <span class="group-hover:animate-pulse">✨</span> Continue Script
                </button>
              </span>
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
            <!-- Clear text button: Double-Bezel -->
            <span class="rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
              <button
                class="rounded-full bg-studio-700 text-gray-500 hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] active:scale-95"
                @click="handleClearText"
              >
                <span
                  aria-hidden="true"
                  class="ph ph-trash text-lg"
                />
              </button>
            </span>
          </div>
        </div>

        <!-- Text Input Area (mobile: px-4 pb-4, no max-width; desktop: px-4 md:px-8 pb-4 md:pb-32 max-w-5xl) -->
        <div class="flex-1 relative w-full max-w-5xl mx-auto px-4 md:px-8 pb-4 md:pb-32 flex flex-col">
          <textarea
            v-model="textInput"
            dir="rtl"
            class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-lg md:text-xl lg:text-2xl leading-relaxed text-gray-100 placeholder-gray-600 scroll-smooth z-10"
            style="caret-color: #FF512F;"
            placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
          />
        </div>

        <!-- Floating Shortcut Hint: Double-Bezel -->
        <div class="absolute bottom-6 right-8 text-gray-600 text-sm font-medium flex items-center gap-2 hidden md:flex">
          <!-- Outer Shell -->
          <div class="rounded-[0.875rem] ring-1 ring-white/[0.06] p-1 bg-studio-800/80 backdrop-blur bg-white/[0.02]">
            <!-- Inner Core -->
            <div class="rounded-[calc(0.875rem-0.25rem)] px-4 py-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
              Press
              <!-- Outer Shell per kbd -->
              <span class="rounded-md ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
                <kbd class="rounded-md bg-studio-900 px-2 py-1 font-mono text-gray-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">Ctrl</kbd>
              </span>
              +
              <!-- Outer Shell per kbd -->
              <span class="rounded-md ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
                <kbd class="rounded-md bg-studio-900 px-2 py-1 font-mono text-gray-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">Enter</kbd>
              </span>
              to generate
            </div>
          </div>
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
  position: fixed;
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 100px;
  background: radial-gradient(ellipse at center, rgba(255, 81, 47, 0.15) 0%, rgba(221, 36, 118, 0.05) 50%, transparent 70%);
  opacity: 0;
  transition: opacity 700ms var(--ease-spring);
  pointer-events: none;
  z-index: 0;
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
    transition: height 700ms var(--ease-spring);
  }
}
</style>
