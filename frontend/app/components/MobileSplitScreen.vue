<script setup lang="ts">
// MobileSplitScreen: Mobile split-screen layout with draggable divider.
// Contains: mobile canvas (top) + drag divider + control deck (bottom) + inline audio player.

import { computed, useTemplateRef, watch } from 'vue'
// TODO: migrated from studio-900/sunrise-orange/sunrise-magenta (see ISSUE-014)
import { useDragResize } from '../composables/useDragResize'
import { formatTime } from '../utils/formatTime'
import FocusHaloCanvas from './FocusHaloCanvas.vue'
import VoiceSelector from './VoiceSelector.vue'
import SpeedSlider from './SpeedSlider.vue'
import GenerateButton from './GenerateButton.vue'
import WaveformCanvas from './WaveformCanvas.vue'
import type { Voice } from '../composables/useVoices'

interface Props {
  textInput: string
  selectedVoice: string
  speedValue: number
  isGenerating: boolean
  playerVisible: boolean
  audioUrl: string | null
  isPlaying: boolean
  isPaused: boolean
  currentTime: number
  duration: number
  modelStatus: 'loading' | 'ready' | 'error'
  isValid: boolean
  speakerVoices: Voice[]
  selectedVoiceName: string
}

interface Emits {
  (e: 'update:textInput' | 'update:selectedVoice', value: string): void
  (e: 'update:speedValue' | 'seek', ratio: number): void
  (e: 'synthesize' | 'clearText' | 'closePlayer' | 'toggle' | 'download'): void
  (e: 'setAudioRef', ref: HTMLAudioElement | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { canvasRatio, onDragStart, onDragMove, onDragEnd } = useDragResize({
  initialRatio: 0.55
})

const charCount = computed(() => props.textInput.length)
const isWarnLimit = computed(() => {
  const ratio = charCount.value / 3000
  return ratio >= 0.6 && charCount.value <= 3000
})
const isNearLimit = computed(() => {
  const ratio = charCount.value / 3000
  return ratio >= 0.8 && charCount.value <= 3000
})
const isOverLimit = computed(() => charCount.value > 3000)
const formatDuration = computed(() => formatTime(props.duration))
const audioTemplateRef = useTemplateRef<HTMLAudioElement | null>('audio-el')
watch(audioTemplateRef, (el) => {
  if (el) {
    emit('setAudioRef', el)
  }
})
</script>

<template>
  <div
    data-test-id="mobile-split-screen"
    class="flex md:hidden flex-col h-[calc(100vh-4rem)] w-full overflow-hidden"
  >
    <!-- Mobile: Canvas (top half) -->
    <main
      role="region"
      aria-labelledby="canvas-heading"
      data-panel="canvas"
      class="w-full bg-stone-100 dark:bg-stone-900 relative flex flex-col overflow-hidden"
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
          <h2 class="text-stone-500 dark:text-gray-400 font-medium text-xs flex items-center gap-1.5">
            <span
              aria-hidden="true"
              class="ph ph-keyboard"
            />
            <span class="inline">Editor Canvas</span>
          </h2>
          <div class="flex items-center gap-2 text-xs text-stone-500 dark:text-gray-500">
            <span
              class="font-mono"
              :class="{ 'text-red-500 dark:text-red-400': isNearLimit, 'text-amber-600 dark:text-amber-400': isWarnLimit, 'text-stone-500 dark:text-gray-500': !isWarnLimit && !isNearLimit && !isOverLimit }"
            >
              {{ charCount }} / 3000
            </span>
            <!-- Clear text button: Double-Bezel -->
            <span class="rounded-full ring-1 ring-stone-300 dark:ring-white/[0.06] p-0.5 bg-stone-100 dark:bg-white/[0.02]">
              <button
                class="rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] active:scale-95"
                @click="emit('clearText')"
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
          :value="textInput"
          dir="rtl"
          class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-lg leading-loose text-stone-800 dark:text-gray-100 placeholder-stone-500 dark:placeholder-gray-600 scroll-smooth z-10"
          style="caret-color: #14b8a6;"
          placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
          @input="emit('update:textInput', ($event.target as HTMLTextAreaElement).value)"
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
      <div class="w-full h-px bg-stone-300 dark:bg-white/[0.06]" />
    </div>

    <!-- Mobile: Control Deck (bottom half) -->
    <aside
      role="region"
      aria-labelledby="control-deck-heading"
      data-panel="control-deck"
      class="flex-1 w-full bg-stone-50 dark:bg-stone-800 flex flex-col overflow-hidden border-t border-stone-200 dark:border-stone-700"
      :style="{ height: `${(1 - canvasRatio) * 100}%` }"
    >
      <!-- Controls Container — compact -->
      <div class="flex-1 p-3 overflow-y-auto flex flex-col">
        <div class="flex flex-col gap-4">
          <!-- Voice Selection -->
          <VoiceSelector
            :model-value="selectedVoice"
            :voices="speakerVoices"
            @update:model-value="emit('update:selectedVoice', $event)"
          />

          <!-- Speed Control -->
          <SpeedSlider
            :model-value="speedValue"
            @update:model-value="emit('update:speedValue', $event)"
          />
        </div>
      </div>

      <!-- Generate Button -->
      <div class="p-3 border-t border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 shrink-0">
        <GenerateButton
          :is-generating="isGenerating"
          :model-status="modelStatus"
          :disabled="!isValid || isGenerating || modelStatus === 'loading'"
          @click="emit('synthesize')"
        />
      </div>
      <!-- Mobile: Keyboard shortcut hint -->
      <div class="px-3 py-2 text-center">
        <span class="text-[10px] text-stone-500 dark:text-gray-500">
          Press
          <span class="rounded-md ring-1 ring-stone-300 dark:ring-white/[0.06] p-0.5 bg-stone-100 dark:bg-white/[0.02] inline-flex">
            <span class="rounded-md bg-stone-200 dark:bg-stone-700 px-1.5 py-0.5 font-mono text-[9px] text-stone-600 dark:text-gray-400">Ctrl</span>
          </span>
          +
          <span class="rounded-md ring-1 ring-stone-300 dark:ring-white/[0.06] p-0.5 bg-stone-100 dark:bg-white/[0.02] inline-flex">
            <span class="rounded-md bg-stone-200 dark:bg-stone-700 px-1.5 py-0.5 font-mono text-[9px] text-stone-600 dark:text-gray-400">Enter</span>
          </span>
          to generate
        </span>
      </div>

      <!-- Mobile: Generated Audio Card: Double-Bezel -->
      <div
        v-if="playerVisible && audioUrl"
        class="border-t border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 shrink-0"
      >
        <!-- Outer Shell -->
        <div class="p-2.5 rounded-[1.125rem] ring-1 ring-stone-300 dark:ring-white/[0.06] bg-stone-100 dark:bg-white/[0.02]">
          <!-- Inner Core -->
          <div class="rounded-[calc(1.125rem-0.25rem)] bg-white dark:bg-stone-800 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-3 flex flex-col gap-3">
            <!-- Header: Gradient music icon + title + action buttons -->
            <div class="flex items-center gap-3">
              <!-- Gradient music icon -->
              <div
                class="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center shadow-[0_4px_16px_rgba(20,184,166,0.25)] dark:shadow-[0_4px_16px_rgba(20,184,166,0.25)] shrink-0"
              >
                <span
                  aria-hidden="true"
                  class="ph-fill ph-music-notes text-white text-sm"
                />
              </div>
              <!-- Title + subtitle -->
              <div class="overflow-hidden min-w-0 flex-1">
                <h3 class="text-stone-800 dark:text-white font-semibold text-xs truncate">
                  Generated Audio
                </h3>
                <p class="text-[10px] text-stone-500 dark:text-gray-400 truncate">
                  {{ selectedVoiceName }} • {{ speedValue.toFixed(1) }}x Speed
                </p>
              </div>
              <!-- Action buttons: Double-Bezel + Magnetic -->
              <div class="flex items-center gap-2 shrink-0">
                <button
                  class="magnetic-hover w-8 h-8 rounded-full ring-1 ring-stone-300 dark:ring-white/[0.06] p-0.5 bg-stone-100 dark:bg-white/[0.02] flex items-center justify-center text-stone-600 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  title="Download MP3"
                  @click="emit('download')"
                >
                  <span class="rounded-full bg-stone-200 dark:bg-stone-900 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
                    <span
                      aria-hidden="true"
                      class="ph ph-download-simple text-lg"
                    />
                  </span>
                </button>
                <button
                  class="magnetic-hover w-8 h-8 rounded-full ring-1 ring-stone-300 dark:ring-white/[0.06] p-0.5 bg-stone-100 dark:bg-white/[0.02] flex items-center justify-center text-stone-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  title="Close Player"
                  @click="emit('closePlayer')"
                >
                  <span class="rounded-full bg-stone-200 dark:bg-stone-900 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
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
            <div class="rounded-[0.875rem] ring-1 ring-stone-300 dark:ring-white/[0.06] p-1 bg-stone-100 dark:bg-white/[0.02] flex items-center gap-2">
              <!-- Inner Core -->
              <div class="rounded-[calc(0.875rem-0.25rem)] bg-stone-200 dark:bg-stone-900 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center gap-2 p-2">
                <!-- Play/Pause button: Double-Bezel -->
                <!-- Outer Shell -->
                <span class="rounded-full ring-1 ring-stone-300 dark:ring-white/[0.06] p-0.5 bg-stone-100 dark:bg-white/[0.02] flex-shrink-0">
                  <!-- Inner Core -->
                  <button
                    class="group rounded-full bg-gold-500 text-white flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.98] hover:scale-[1.02] w-9 h-9"
                    @click="emit('toggle')"
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
                    @seek="(ratio) => emit('seek', ratio)"
                  />
                </div>

                <!-- Duration -->
                <span class="text-[10px] font-mono text-stone-500 dark:text-gray-400 flex-shrink-0 w-8 text-right">
                  {{ formatDuration }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
    <audio
      ref="audio-el"
      class="hidden"
    />
  </div>
</template>
