<script setup lang="ts">
// DesktopPanels: Desktop side-by-side layout.
// Contains: left panel (control deck) + right panel (canvas/editor).

import { computed, useTemplateRef } from 'vue'
import { useScrollReveal } from '../composables/useScrollReveal'
import ModelStatusIndicator from './ModelStatusIndicator.vue'
import MobileStatusIndicator from './MobileStatusIndicator.vue'
import FocusHaloCanvas from './FocusHaloCanvas.vue'
import VoiceSelector from './VoiceSelector.vue'
import SpeedSlider from './SpeedSlider.vue'
import GenerateButton from './GenerateButton.vue'
import StickyAudioBar from './StickyAudioBar.vue'
import type { Voice } from '../composables/useVoices'

// TODO: migrated from studio-900/sunrise-orange/sunrise-magenta (see ISSUE-014)
interface Props {
  textInput: string
  selectedSpeaker: string
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
  (e: 'update:textInput' | 'update:selectedSpeaker', value: string): void
  (e: 'update:speedValue' | 'seek', ratio: number): void
  (e: 'synthesize' | 'clearText' | 'closePlayer' | 'toggle' | 'download'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const controlDeckDesktopRef = useTemplateRef<HTMLDivElement | null>('control-deck-ref')
const canvasHeaderRef = useTemplateRef<HTMLDivElement | null>('canvas-header-ref')

// Scroll-reveal: observe desktop control deck sections for fade-up
useScrollReveal(controlDeckDesktopRef as import('vue').Ref<HTMLElement | null>)
useScrollReveal(canvasHeaderRef as import('vue').Ref<HTMLElement | null>)

const charCount = computed(() => props.textInput.length)
const isNearLimit = computed(() => {
  const ratio = charCount.value / 3000
  return ratio >= 0.8 && charCount.value <= 3000
})
const isOverLimit = computed(() => charCount.value > 3000)
</script>

<template>
  <div
    class="hidden md:flex flex-row h-full w-full"
    style="background-color: #121212;"
  >
    <!-- LEFT PANEL: The Control Deck (35% md, 30% lg, 25% xl) — Fade-up -->
    <aside
      ref="control-deck-ref"
      role="region"
      aria-labelledby="control-deck-heading"
      data-panel="control-deck"
      class="w-full md:w-[35%] lg:w-[30%] xl:w-[25%] bg-stone-800 border-t md:border-t-0 md:border-r border-white/[0.06] flex flex-col h-[45dvh] md:h-full z-20 shadow-[0_-8px_32px_rgba(0,0,0,0.25)] md:shadow-[0_-16px_48px_rgba(0,0,0,0.35)] shrink-0 order-2 md:order-1 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] fade-up delay-100"
    >
      <!-- Mobile Header (logo + status, visible below 768px) -->
      <header
        class="flex md:hidden justify-between items-center px-4 py-3 bg-stone-800 border-b border-white/[0.06] shrink-0 z-30"
      >
        <div class="flex items-center gap-2">
          <span
            aria-hidden="true"
            class="ph-fill ph-waves text-primary-500 text-xl"
          />
          <h1 class="text-lg font-bold text-white tracking-tight">
            Lughat<span class="text-gold-500">Chat</span>
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
              class="ph-fill ph-waves text-primary-500"
            />
            Lughat<span class="text-gold-500">Chat</span>
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
            :model-value="selectedSpeaker"
            :voices="speakerVoices"
            @update:model-value="emit('update:selectedSpeaker', $event)"
          />
          <SpeedSlider
            :model-value="speedValue"
            @update:model-value="emit('update:speedValue', $event)"
          />
        </div>
      </div>

      <!-- Generate Button — full-width anchor -->
      <div class="p-5 border-t border-white/[0.06] bg-stone-800 shrink-0">
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
      class="flex-1 w-full bg-stone-900 relative flex flex-col overflow-hidden order-1 md:order-2 fade-up delay-100"
    >
      <!-- Focus Halo (radial gradient glow behind textarea) -->
      <FocusHaloCanvas :focused="!!textInput" />

      <!-- Header / Context: Eyebrow tag -->
      <div
        class="w-full p-4 md:p-6 lg:p-8 pb-2 md:pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 shrink-0"
      >
        <span class="hidden md:inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] font-medium ring-1 ring-white/[0.08] bg-stone-700 text-gray-300">
          Text Editor
        </span>
        <!-- Mobile: Title + Char Count (stacked, full width) -->
        <div class="flex justify-between items-center w-full md:w-auto md:hidden">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] font-medium ring-1 ring-white/[0.08] bg-stone-700 text-gray-300 md:hidden">
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
              class="text-gray-500 bg-transparent hover:bg-stone-700"
              @click="emit('clearText')"
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
                class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-[calc(0.75rem-0.125rem)] bg-stone-800 hover:bg-stone-700 px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] group"
                title="Type in any language and translate to Arabic"
              >
                <span class="group-hover:animate-pulse">✨</span> Translate
              </button>
            </span>
            <span class="shrink-0 rounded-[0.75rem] ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
              <!-- Inner Core -->
              <button
                class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-primary-500 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-[calc(0.75rem-0.125rem)] bg-stone-800 hover:bg-stone-700 px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] group"
                title="Add Harakat (diacritics) for perfect TTS pronunciation"
              >
                <span class="group-hover:animate-pulse">✨</span> Add Diacritics
              </button>
            </span>
            <span class="shrink-0 rounded-[0.75rem] ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
              <!-- Inner Core -->
              <button
                class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gold-500 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-[calc(0.75rem-0.125rem)] bg-stone-800 hover:bg-stone-700 px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] group"
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
              class="rounded-full bg-stone-700 text-gray-500 hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] active:scale-95"
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
          class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-lg md:text-xl lg:text-2xl leading-relaxed text-gray-100 placeholder-gray-600 scroll-smooth z-10"
          style="caret-color: #14b8a6;"
          placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
          @input="emit('update:textInput', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- Floating Shortcut Hint: Double-Bezel -->
      <div class="absolute bottom-6 right-8 text-gray-600 text-sm font-medium flex items-center gap-2 hidden md:flex">
        <!-- Outer Shell -->
        <div class="rounded-[0.875rem] ring-1 ring-white/[0.06] p-1 bg-stone-800/80 backdrop-blur bg-white/[0.02]">
          <!-- Inner Core -->
          <div class="rounded-[calc(0.875rem-0.25rem)] px-4 py-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
            Press
            <!-- Outer Shell per kbd -->
            <span class="rounded-md ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
              <kbd class="rounded-md bg-stone-900 px-2 py-1 font-mono text-gray-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">Ctrl</kbd>
            </span>
            +
            <!-- Outer Shell per kbd -->
            <span class="rounded-md ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
              <kbd class="rounded-md bg-stone-900 px-2 py-1 font-mono text-gray-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">Enter</kbd>
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
        :speed-value="speedValue"
        @close="emit('closePlayer')"
        @toggle="emit('toggle')"
        @seek="(ratio) => emit('seek', ratio)"
      />

      <!-- Hidden audio element -->
      <audio
        ref="audio"
        class="hidden"
      />
    </main>
  </div>
</template>
