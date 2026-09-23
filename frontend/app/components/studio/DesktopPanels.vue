<script setup lang="ts">
// DesktopPanels: Desktop side-by-side layout.
import { computed, useTemplateRef, watch, onMounted, onBeforeUnmount } from 'vue'
import { useScrollReveal } from '../../composables/common/useScrollReveal'
import { usePanelToggle } from '~/composables/studio/usePanelToggle'
import { animate, spring } from '@motionone/dom'
import FocusHaloCanvas from './FocusHaloCanvas.vue'
import VoiceSelector from './VoiceSelector.vue'
import SpeedSlider from './SpeedSlider.vue'
import GenerateButton from './GenerateButton.vue'
import StickyAudioBar from '../common/StickyAudioBar.vue'
import type { Voice } from '../../composables/studio/useVoices'

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
  activePanel?: 'control-deck' | 'canvas'
}

interface Emits {
  (e: 'update:textInput' | 'update:selectedSpeaker', value: string): void
  (e: 'update:speedValue' | 'seek', ratio: number): void
  (e: 'synthesize' | 'clearText' | 'closePlayer' | 'toggle' | 'download' | 'panelToggle'): void
  (e: 'setAudioRef', ref: HTMLAudioElement | null): void
}

const props = withDefaults(defineProps<Props>(), {
  activePanel: 'control-deck'
})

const emit = defineEmits<Emits>()

const { activePanel: _toggleActivePanel, isMobile, togglePanel } = usePanelToggle()

const controlDeckRef = useTemplateRef<HTMLDivElement | null>('control-deck-ref')
const canvasHeaderRef = useTemplateRef<HTMLDivElement | null>('canvas-header-ref')

// Scroll-reveal: observe desktop control deck sections for fade-up
const { observe, disconnect } = useScrollReveal(canvasHeaderRef as import('vue').Ref<HTMLElement | null>)

onMounted(() => observe())
onBeforeUnmount(() => disconnect())

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

// Animate control deck width on panel toggle
let currentAnimation: ReturnType<typeof animate> | null = null
watch(() => props.activePanel, (newPanel) => {
  const el = controlDeckRef.value
  if (!el || !isMobile.value) return

  currentAnimation?.cancel()

  const currentWidth = el.getBoundingClientRect().width
  const targetWidth = newPanel === 'control-deck' ? 0.35 : 0
  const finalWidth = Math.max(10, targetWidth * window.innerWidth)

  currentAnimation = animate(el, { width: [`${currentWidth}px`, `${finalWidth}px`] }, { duration: 0.4, easing: spring({ stiffness: 200, damping: 18 }) })
})

function handlePanelToggle() {
  togglePanel()
  emit('panelToggle')
}
</script>

<template>
  <div
    class="hidden md:flex flex-row h-full w-full"
    style="background-color: #fafaf9;"
  >
    <!-- LEFT PANEL: The Control Deck (35% md, 30% lg, 25% xl) — Spring animated -->
    <aside
      ref="controlDeckRef"
      role="region"
      aria-labelledby="control-deck-heading"
      data-panel="control-deck"
      class="w-full md:w-[35%] lg:w-[30%] xl:w-[25%] bg-white dark:bg-stone-800 border-t md:border-t-0 md:border-r border-stone-200 dark:border-stone-700 flex flex-col h-[45dvh] md:h-full z-20 shadow-sm dark:shadow-[0_-8px_32px_rgba(0,0,0,0.25)] md:shadow-sm dark:md:shadow-[0_-16px_48px_rgba(0,0,0,0.35)] shrink-0 order-2 md:order-1"
    >
      <!-- Toggle button (mobile-visible area on desktop for panel toggle) -->
      <button
        v-if="!isMobile"
        class="hidden md:flex absolute top-1/2 -right-3 w-6 h-10 rounded-l-lg bg-stone-200 dark:bg-stone-600 items-center justify-center cursor-col-resize group"
        style="transform: translateY(-50%);"
        aria-label="Toggle panel"
        @click="handlePanelToggle"
      >
        <span class="ph ph-arrows-left-right text-stone-500 dark:text-stone-300 text-xs" />
      </button>

      <!-- Controls Container — unified, compact -->
      <div class="flex-1 p-3 overflow-y-auto flex flex-col">
        <div class="flex flex-col gap-4 fade-up delay-200">
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
      ref="canvasHeaderRef"
      role="region"
      aria-labelledby="canvas-heading"
      data-panel="canvas"
      class="flex-1 w-full bg-stone-100 dark:bg-stone-900 relative flex flex-col overflow-hidden order-1 md:order-2"
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
                class="rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white cursor-pointer shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] active:scale-95"
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
              class="rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-gray-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] active:scale-95"
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

      <!-- Text Input Area (desktop: full width minus sidebar) -->
      <div class="flex-1 relative w-full px-4 md:px-6 lg:px-8 flex flex-col min-h-0">
        <textarea
          :value="textInput"
          dir="rtl"
          class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-lg leading-loose text-stone-800 dark:text-gray-100 placeholder-stone-500 dark:placeholder-gray-600 scroll-smooth"
          style="caret-color: #14b8a6;"
          placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
          @input="emit('update:textInput', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- Sticky Audio Player (when active) -->
      <StickyAudioBar
        v-if="props.playerVisible"
        :active="props.playerVisible"
        :is-playing="props.isPlaying"
        :is-paused="props.isPaused"
        :current-time="props.currentTime"
        :duration="props.duration"
        :speed-value="props.speedValue"
        :text-content="textInput"
        @close="emit('closePlayer')"
        @toggle="emit('toggle')"
        @seek="emit('seek', $event)"
        @speed-change="emit('update:speedValue', $event)"
        @download="emit('download')"
      />
    </main>
  </div>
</template>
