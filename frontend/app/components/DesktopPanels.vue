<script setup lang="ts">
// DesktopPanels: Desktop side-by-side layout.
// Contains: left panel (control deck) + right panel (canvas/editor).

import { computed, useTemplateRef, watch } from 'vue'
import { useScrollReveal } from '../composables/useScrollReveal'
import FocusHaloCanvas from './FocusHaloCanvas.vue'
import VoiceSelector from './VoiceSelector.vue'
import GenerateButton from './GenerateButton.vue'
import StickyAudioBar from './StickyAudioBar.vue'
import type { Voice } from '../composables/useVoices'

interface Props {
  textInput: string
  selectedVoice: string
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
  (e: 'seek', ratio: number): void
  (e: 'synthesize' | 'clearText' | 'closePlayer' | 'toggle' | 'download'): void
  (e: 'setAudioRef', ref: HTMLAudioElement | null): void
}
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const _controlDeckDesktopRef = useTemplateRef<HTMLDivElement | null>('control-deck-ref')
const canvasHeaderRef = useTemplateRef<HTMLDivElement | null>('canvas-header-ref')

// Scroll-reveal: observe desktop control deck sections for fade-up
useScrollReveal(canvasHeaderRef as import('vue').Ref<HTMLElement | null>)
const audioTemplateRef = useTemplateRef<HTMLAudioElement | null>('audio-el')

watch(audioTemplateRef, (el) => {
  if (el) {
    emit('setAudioRef', el)
  }
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
</script>

<template>
  <div
    class="hidden md:flex flex-row h-full w-full"
    style="background-color: #fafaf9;"
  >
    <!-- LEFT PANEL: The Control Deck (35% md, 30% lg, 25% xl) — Fade-up -->
    <aside
      ref="control-deck-ref"
      role="region"
      aria-labelledby="control-deck-heading"
      data-panel="control-deck"
      class="w-full md:w-[35%] lg:w-[30%] xl:w-[25%] bg-white dark:bg-stone-800 border-t md:border-t-0 md:border-r border-stone-200 dark:border-stone-700 flex flex-col h-[45dvh] md:h-full z-20 shadow-sm dark:shadow-[0_-8px_32px_rgba(0,0,0,0.25)] md:shadow-sm dark:md:shadow-[0_-16px_48px_rgba(0,0,0,0.35)] shrink-0 order-2 md:order-1 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] fade-up delay-100"
    >
      <!-- Controls Container — unified, compact -->
      <div class="flex-1 p-3 overflow-y-auto flex flex-col">
        <div class="flex flex-col gap-4 fade-up delay-200">
          <VoiceSelector
            :model-value="selectedVoice"
            :voices="speakerVoices"
            @update:model-value="emit('update:selectedVoice', $event)"
          />
        </div>
      </div>

      <!-- Generate Button — full-width anchor -->
      <div class="p-3 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 shrink-0">
        <GenerateButton
          :is-generating="isGenerating"
          :model-status="modelStatus"
          :disabled="!isValid || isGenerating || modelStatus === 'loading'"
          @click="emit('synthesize')"
        />
      </div>
    </aside>

    <!-- RIGHT PANEL: The Canvas (65% md, 70% lg, 75% xl) — Fade-up -->
    <main
      ref="canvas-header-ref"
      role="region"
      aria-labelledby="canvas-heading"
      data-panel="canvas"
      class="flex-1 w-full bg-stone-100 dark:bg-stone-900 relative flex flex-col overflow-hidden order-1 md:order-2 fade-up delay-100"
    >
      <!-- Focus Halo (radial gradient glow behind textarea) -->
      <FocusHaloCanvas :focused="!!textInput" />

      <!-- Header / Context: Eyebrow tag -->
      <div
        class="w-full p-4 md:p-6 lg:p-8 pb-2 md:pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 shrink-0"
      >
        <span class="hidden md:inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] font-medium ring-1 ring-stone-300 dark:ring-white/[0.08] bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-gray-300">
          Text Editor
        </span>
        <!-- Mobile: Title + Char Count (stacked, full width) -->
        <div class="flex justify-between items-center w-full md:w-auto md:hidden">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] font-medium ring-1 ring-stone-300 dark:ring-white/[0.08] bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-gray-300 md:hidden">
              Editor
            </span>
            <h2 class="text-stone-500 dark:text-gray-400 font-medium text-sm flex items-center gap-2">
              <span
                aria-hidden="true"
                class="ph ph-keyboard text-sm -translate-y-[1px]"
              />
              <span class="inline">Editor Canvas</span>
            </h2>
          </div>
          <div class="flex items-center gap-3 text-sm text-stone-500 dark:text-gray-500">
            <span
              class="font-mono text-xs"
              :class="{ 'text-red-500 dark:text-red-400': isNearLimit, 'text-amber-600 dark:text-amber-400': isWarnLimit, 'text-stone-500 dark:text-gray-500': !isWarnLimit && !isNearLimit && !isOverLimit }"
            >
              {{ charCount }} / 3000
            </span>
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

        <div class="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 w-full md:w-auto">
          <div class="hidden md:flex items-center gap-2">
            <h2 class="text-stone-500 dark:text-gray-400 font-medium text-sm flex items-center gap-2">
              <span
                aria-hidden="true"
                class="ph ph-keyboard text-sm -translate-y-[1px]"
              />
              <span>Editor Canvas</span>
            </h2>
          </div>

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
                class="ph ph-trash text-lg"
              />
            </button>
          </span>
        </div>
      </div>

      <!-- Text Input Area (mobile: px-4 pb-4, no max-width; desktop: px-4 md:px-8 pb-4 md:pb-32 max-w-5xl) -->
      <div class="flex-1 relative w-full max-w-5xl mx-auto px-4 md:px-8 pb-4 md:pb-32 flex flex-col">
        <textarea
          :value="textInput"
          dir="rtl"
          class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-lg md:text-xl lg:text-2xl leading-relaxed text-stone-800 dark:text-gray-100 placeholder-stone-500 dark:placeholder-gray-600 scroll-smooth z-10"
          style="caret-color: #14b8a6;"
          placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
          @input="emit('update:textInput', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- Floating Shortcut Hint: Double-Bezel -->
      <div class="absolute bottom-6 right-8 text-stone-600 dark:text-gray-600 text-sm font-medium flex items-center gap-2 hidden md:flex">
        <!-- Outer Shell -->
        <div class="rounded-[0.875rem] ring-1 ring-stone-300 dark:ring-white/[0.06] p-1 bg-stone-200/80 dark:bg-stone-800/80 backdrop-blur bg-stone-100 dark:bg-white/[0.02]">
          <!-- Inner Core -->
          <div class="rounded-[calc(0.875rem-0.25rem)] px-4 py-2 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
            Press
            <!-- Outer Shell per kbd -->
            <span class="rounded-md ring-1 ring-stone-300 dark:ring-white/[0.06] p-0.5 bg-stone-100 dark:bg-white/[0.02]">
              <kbd class="rounded-md bg-stone-200 dark:bg-stone-900 px-2 py-1 font-mono text-stone-600 dark:text-gray-400 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">Ctrl</kbd>
            </span>
            +
            <!-- Outer Shell per kbd -->
            <span class="rounded-md ring-1 ring-stone-300 dark:ring-white/[0.06] p-0.5 bg-stone-100 dark:bg-white/[0.02]">
              <kbd class="rounded-md bg-stone-200 dark:bg-stone-900 px-2 py-1 font-mono text-stone-600 dark:text-gray-400 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">Enter</kbd>
            </span>
            to generate
          </div>
        </div>
      </div>

      <!-- Sticky Audio Bar (slides up from bottom) -->
      <StickyAudioBar
        :active="playerVisible && !!audioUrl"
        :text-content="textInput"
        :is-playing="isPlaying"
        :is-paused="isPaused"
        :current-time="currentTime"
        :duration="duration"
        @close="emit('closePlayer')"
        @toggle="emit('toggle')"
        @seek="(ratio) => emit('seek', ratio)"
      />

      <!-- Hidden audio element -->
      <audio
        ref="audio-el"
        class="hidden"
      />
    </main>
  </div>
</template>
