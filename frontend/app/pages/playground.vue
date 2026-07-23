<script setup lang="ts">
// Full-page TTS Studio — "Ethereal Glass" redesign
// Bento grid layout: Control Deck + Canvas as nested Double-Bezel cards
// Mobile: stacked with touch-draggable divider
import MobileStatusIndicator from '../components/MobileStatusIndicator.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { usePanelToggle } from '../composables/usePanelToggle'
import { useAudioModule } from '../composables/useAudioModule'
import { useScrollReveal } from '../composables/useScrollReveal'
import { useHealthPoll } from '../composables/useHealthPoll'
import { useVoices } from '../composables/useVoices'
import { useTtsApi } from '../composables/useTtsApi'
import { showToast } from '../composables/useToast'
import { useMagicKeys, whenever } from '@vueuse/core'

useSeoMeta({
  title: 'TTS Playground — LughatChat',
  description: 'Arabic Text-to-Speech Studio — Generate speech with XTTS-v2'
})

const { togglePanel } = usePanelToggle()
const audioModule = useAudioModule()
const {
  isPlaying, isPaused, currentTime, duration,
  audioUrl: audioUrlRef, audioRef, load: audioLoad,
  toggle: audioToggle, seek: audioSeek,
  download: audioDownload, dispose
} = audioModule

const speedValue = ref(1.0)
const controlDeckDesktopRef = ref<HTMLElement | null>(null)
useScrollReveal(controlDeckDesktopRef)
const canvasHeaderRef = ref<HTMLElement | null>(null)
useScrollReveal(canvasHeaderRef)

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

const isGenerating = ref(false)
const textInput = ref('')

async function handleGenerate(): Promise<void> {
  if (!textInput.value.trim()) {
    showToast('Please enter some text', 'error')
    return
  }
  isGenerating.value = true
  try {
    const { synthesize } = useTtsApi()
    const blob = await synthesize({
      text: textInput.value,
      speaker: selectedVoice.value || 'female',
      speed: speedValue.value
    })
    audioLoad(blob)
    showToast('Speech generated successfully!', 'success')
  } catch {
    showToast('Failed to generate speech. Please try again.', 'error')
  } finally {
    isGenerating.value = false
  }
}

const { Ctrl_Enter: ctrlEnter } = useMagicKeys()
whenever(computed(() => ctrlEnter!.value), async () => {
  await handleGenerate()
})

const health = useHealthPoll()
const isGenerateDisabled = computed(() => isGenerating.value || !health.modelLoaded)
const { voices, loadVoices } = useVoices()
const selectedVoice = ref('KSA Zariyah - Female')
const selectedVoiceName = ref(selectedVoice.value)

onMounted(() => loadVoices())
watch(() => health.status, (status) => {
  if (status === 'error') {
    showToast('TTS model is not ready. Please try again later.', 'error')
  }
})
onUnmounted(() => dispose())
</script>

<template>
  <div
    class="tts-page min-h-[100dvh] bg-[#050505] dark:bg-[#050505]"
    dir="ltr"
  >
    <!-- Hidden audio element -->
    <audio
      ref="audioRef"
      :src="audioUrlRef || undefined"
      class="hidden"
    />

    <!-- Floating glass pill nav -->
    <NavBar compact />

    <!-- Desktop: bento grid layout -->
    <div
      data-testid="desktop-panels"
      class="hidden md:flex min-h-[100dvh]"
      style="padding-top: calc(var(--nav-height, 48px) + 12px)"
    >
      <!-- Control Deck — Left bento column (taller, 45% width) -->
      <div
        ref="controlDeckDesktopRef"
        data-panel="control-deck"
        class="control-deck flex flex-col p-6 md:p-8 overflow-y-auto"
        style="width: 45%; max-width: 520px; min-width: 320px;"
      >
        <!-- Eyebrow badge -->
        <div class="mb-3 fade-up">
          <span class="eyebrow-badge">Studio</span>
        </div>

        <!-- Header: Calligraphic headline -->
        <div class="mb-8 fade-up delay-100">
          <h1
            class="font-arabic text-4xl font-bold text-gold mb-2"
            dir="rtl"
          >
            استوديو نطق
          </h1>
          <p class="text-ink-dim text-sm">
            Arabic Text-to-Speech with XTTS-v2
          </p>
        </div>

        <!-- Voice Selector — Double-Bezel card -->
        <div class="mb-6 fade-up delay-150">
          <div class="bezel mb-3">
            <div class="bezel-inner p-4">
              <label class="block text-xs font-medium text-ink-dim/70 mb-2 tracking-wide">
                Voice
              </label>
              <VoiceSelector
                v-model="selectedVoice"
                :voices="voices"
              />
            </div>
          </div>
        </div>

        <!-- Text Input — Double-Bezel card -->
        <div class="mb-6 fade-up delay-200">
          <div class="bezel">
            <div class="bezel-inner p-4">
              <label
                for="text-input"
                class="block text-xs font-medium text-ink-dim/70 mb-2 tracking-wide"
              >
                Arabic Text
              </label>
              <textarea
                id="text-input"
                v-model="textInput"
                data-testid="text-input"
                placeholder="Type or paste Arabic text here..."
                class="tts-input w-full min-h-[140px] resize-y rounded-xl bg-studio-900 text-ink font-arabic text-sm leading-relaxed p-4 border border-white/[0.04] focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all duration-500"
                dir="rtl"
              />
            </div>
          </div>
        </div>

        <!-- Speed Slider — Double-Bezel card -->
        <div class="mb-6 fade-up delay-200">
          <div class="bezel">
            <div class="bezel-inner p-4">
              <SpeedSlider />
            </div>
          </div>
        </div>

        <!-- Generate Button — Island pill -->
        <div class="mb-6 fade-up delay-300">
          <GenerateButton
            :is-generating="isGenerating"
            :model-status="health.status"
            :disabled="isGenerateDisabled"
            :text="textInput"
            @click="handleGenerate"
          />
        </div>

        <!-- Shortcut hint -->
        <div class="text-[11px] text-ink-dim/50 fade-up delay-300">
          <kbd class="px-1.5 py-0.5 bg-studio-700/80 rounded text-ink-dim/80 border border-white/[0.04]">Ctrl</kbd>
          <span class="mx-1">+</span>
          <kbd class="px-1.5 py-0.5 bg-studio-700/80 rounded text-ink-dim/80 border border-white/[0.04]">Enter</kbd>
          <span class="ml-1">to generate</span>
        </div>
      </div>

      <!-- Canvas — Right bento column (flex-1) -->
      <div
        ref="canvasHeaderRef"
        data-testid="canvas-panel"
        class="canvas flex-1 p-6 md:p-8 overflow-y-auto"
        data-panel="canvas"
        @click.stop="togglePanel"
      >
        <!-- Eyebrow badge -->
        <div class="mb-3 fade-up">
          <span class="eyebrow-badge">Output</span>
        </div>

        <!-- No-audio placeholder -->
        <div
          v-if="!audioUrlRef"
          class="flex flex-col items-center justify-center py-20 text-ink-dim/40 fade-up"
        >
          <span
            aria-hidden="true"
            class="ph ph-speaker-simple-none text-5xl mb-4 opacity-30"
          />
          <p class="text-sm font-medium">
            Generate speech to see audio output
          </p>
          <p class="text-xs text-ink-dim/50 mt-1">
            Your waveform will appear here
          </p>
        </div>

        <!-- Audio Player Panel -->
        <div
          v-if="audioUrlRef"
          class="mt-6 fade-up"
        >
          <AudioPlayerPanel
            :visible="true"
            :is-playing="isPlaying"
            :is-paused="isPaused"
            :current-time="currentTime"
            :duration="duration"
            :audio-url="audioUrlRef"
            :selected-voice-name="selectedVoiceName"
            :speed-value="speedValue"
            @close="dispose"
            @toggle="audioToggle"
            @seek="audioSeek"
            @download="audioDownload(selectedVoiceName)"
          />
        </div>
      </div>
    </div>

    <!-- Mobile: stacked layout -->
    <div class="md:hidden min-h-[100dvh] flex flex-col">
      <!-- Canvas (top) -->
      <div
        class="canvas flex-1 overflow-y-auto relative"
        style="height: calc(100dvh - 48px - 44px)"
        @click.stop="togglePanel"
      >
        <div class="px-4 pt-2 pb-4">
          <!-- Eyebrow badge -->
          <span class="eyebrow-badge mb-2 inline-block">Output</span>
          <h2 class="text-lg font-bold text-ink">
            Audio
          </h2>
        </div>

        <div
          v-if="!audioUrlRef"
          class="flex flex-col items-center justify-center py-16 text-ink-dim/50 px-4"
        >
          <span
            aria-hidden="true"
            class="ph ph-speaker-simple-none text-4xl mb-3 opacity-40"
          />
          <p class="text-sm">
            Generate speech to see audio output
          </p>
        </div>

        <div
          v-if="audioUrlRef"
          class="mt-4 px-4"
        >
          <AudioPlayerPanel
            :visible="true"
            :is-playing="isPlaying"
            :is-paused="isPaused"
            :current-time="currentTime"
            :duration="duration"
            :audio-url="audioUrlRef"
            :selected-voice-name="selectedVoiceName"
            :speed-value="speedValue"
            @close="dispose"
            @toggle="audioToggle"
            @seek="audioSeek"
            @download="audioDownload(selectedVoiceName)"
          />
        </div>
      </div>

      <!-- Mobile FAB: status indicator -->
      <div class="fixed bottom-3 right-3 z-40 md:hidden">
        <MobileStatusIndicator />
      </div>

      <!-- Control Deck (bottom, draggable divider) -->
      <div
        data-testid="control-deck-panel"
        class="control-deck border-t border-white/[0.04]"
        :style="{ height: `${canvasRatio * 100}%`, maxHeight: '85vh' }"
        @touchstart="onDragStart"
        @touchmove="onDragMove"
        @touchend="onDragEnd"
        @mousedown="onDragStart"
      >
        <!-- Drag divider handle -->
        <div
          data-testid="drag-divider"
          class="drag-divider h-1.5 cursor-ns-resize flex items-center justify-center"
        >
          <div class="w-12 h-1 bg-ink-dim/30 rounded-full" />
        </div>

        <!-- Content -->
        <div class="p-4 overflow-y-auto">
          <!-- Voice Selector -->
          <div class="mb-4">
            <div class="bezel mb-3">
              <div class="bezel-inner p-3">
                <label class="block text-[10px] font-medium text-ink-dim/60 mb-2 tracking-wide">
                  Voice
                </label>
                <VoiceSelector
                  v-model="selectedVoice"
                  :voices="voices"
                />
              </div>
            </div>
          </div>

          <!-- Text Input -->
          <div class="mb-4">
            <div class="bezel">
              <div class="bezel-inner p-3">
                <label
                  for="text-input-mobile"
                  class="block text-[10px] font-medium text-ink-dim/60 mb-2 tracking-wide"
                >
                  Arabic Text
                </label>
                <textarea
                  id="text-input-mobile"
                  v-model="textInput"
                  placeholder="Type or paste Arabic text here..."
                  class="tts-input w-full min-h-[80px] resize-y rounded-lg bg-studio-900 text-ink text-xs font-arabic p-3 border border-white/[0.04] focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all duration-500"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          <!-- Speed Slider -->
          <div class="mb-4">
            <div class="bezel">
              <div class="bezel-inner p-3">
                <SpeedSlider />
              </div>
            </div>
          </div>

          <!-- Generate Button -->
          <div class="mb-4">
            <GenerateButton
              :is-generating="isGenerating"
              :model-status="health.status"
              :disabled="isGenerateDisabled"
              :text="textInput"
              @click="handleGenerate"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dragging { cursor: ns-resize; }
.dragging .drag-divider { background-color: var(--gold); }

@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
