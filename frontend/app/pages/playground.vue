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

    <!-- Desktop: bento grid layout — tightened -->
    <div
      data-testid="desktop-panels"
      class="hidden md:flex min-h-[100dvh]"
      style="padding-top: var(--nav-offset);"
    >
      <!-- Control Deck — Left bento column (taller, 45% width) -->
      <div
        ref="controlDeckDesktopRef"
        data-panel="control-deck"
        class="control-deck flex flex-col p-5 pt-4 md:p-6 overflow-y-auto"
        style="width: 45%; max-width: 520px; min-width: 300px;"
      >
        <!-- Eyebrow badge -->
        <div class="mb-2 fade-up">
          <span class="eyebrow-badge">Studio</span>
        </div>

        <!-- Header: Calligraphic headline — compact -->
        <div class="mb-6 fade-up delay-100">
          <h1
            class="font-arabic text-3xl font-bold text-gold mb-1.5"
            dir="rtl"
          >
            استوديو نطق
          </h1>
          <p class="text-ink-dim text-xs">
            Arabic Text-to-Speech with XTTS-v2
          </p>
        </div>

        <!-- Voice Selector — Double-Bezel card -->
        <div class="mb-4 fade-up delay-150">
          <div class="bezel mb-2">
            <div class="bezel-inner p-3">
              <label class="block text-[11px] font-medium text-ink-dim/60 mb-1.5 tracking-wide">
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
        <div class="mb-4 fade-up delay-200">
          <div class="bezel">
            <div class="bezel-inner p-3">
              <label
                for="text-input"
                class="block text-[11px] font-medium text-ink-dim/60 mb-1.5 tracking-wide"
              >
                Arabic Text
              </label>
              <textarea
                id="text-input"
                v-model="textInput"
                data-testid="text-input"
                placeholder="Type or paste Arabic text here..."
                class="tts-input w-full min-h-[120px] resize-y rounded-xl bg-studio-900 text-ink font-arabic text-sm leading-relaxed p-3 border border-white/[0.04] focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all duration-500"
                dir="rtl"
              />
            </div>
          </div>
        </div>

        <!-- Speed Slider — Double-Bezel card -->
        <div class="mb-4 fade-up delay-200">
          <div class="bezel">
            <div class="bezel-inner p-3">
              <SpeedSlider />
            </div>
          </div>
        </div>

        <!-- Generate Button — Island pill -->
        <div class="mb-4 fade-up delay-300">
          <GenerateButton
            :is-generating="isGenerating"
            :model-status="health.status"
            :disabled="isGenerateDisabled"
            :text="textInput"
            @click="handleGenerate"
          />
        </div>

        <!-- Shortcut hint -->
        <div class="text-[10px] text-ink-dim/40 fade-up delay-300">
          <kbd class="px-1 py-0.5 bg-studio-700/80 rounded text-ink-dim/70 border border-white/[0.04]">Ctrl</kbd>
          <span class="mx-0.5">+</span>
          <kbd class="px-1 py-0.5 bg-studio-700/80 rounded text-ink-dim/70 border border-white/[0.04]">Enter</kbd>
          <span class="ml-0.5">to generate</span>
        </div>
      </div>

      <!-- Canvas — Right bento column (flex-1) — tightened -->
      <div
        ref="canvasHeaderRef"
        data-testid="canvas-panel"
        class="canvas flex-1 p-5 pt-4 md:p-6 overflow-y-auto"
        data-panel="canvas"
        @click.stop="togglePanel"
      >
        <!-- Eyebrow badge -->
        <div class="mb-2 fade-up">
          <span class="eyebrow-badge">Output</span>
        </div>

        <!-- No-audio placeholder — improved visual grounding -->
        <div
          v-if="!audioUrlRef"
          class="flex flex-col items-center justify-center py-16 text-ink-dim/35 fade-up"
        >
          <span
            aria-hidden="true"
            class="ph ph-speaker-simple-none text-4xl mb-3 opacity-25"
          />
          <p class="text-xs font-medium text-ink-dim/50">
            Generate speech to see audio output
          </p>
          <p class="text-[10px] text-ink-dim/35 mt-1">
            Your waveform will appear here
          </p>
        </div>

        <!-- Audio Player Panel -->
        <div
          v-if="audioUrlRef"
          class="mt-4 fade-up"
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

    <!-- Mobile: stacked layout — tightened -->
    <div class="md:hidden min-h-[100dvh] flex flex-col">
      <!-- Canvas (top) — compact -->
      <div
        class="canvas flex-1 overflow-y-auto relative"
        style="height: calc(100dvh - var(--nav-offset));"
        @click.stop="togglePanel"
      >
        <div class="px-3 pt-1.5 pb-3">
          <!-- Eyebrow badge -->
          <span class="eyebrow-badge mb-1.5 inline-block text-[9px]">Output</span>
          <h2 class="text-base font-bold text-ink">
            Audio
          </h2>
        </div>

        <div
          v-if="!audioUrlRef"
          class="flex flex-col items-center justify-center py-12 text-ink-dim/40 px-3"
        >
          <span
            aria-hidden="true"
            class="ph ph-speaker-simple-none text-3xl mb-2 opacity-30"
          />
          <p class="text-xs">
            Generate speech to see audio output
          </p>
        </div>

        <div
          v-if="audioUrlRef"
          class="mt-3 px-3"
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

      <!-- Mobile FAB: status indicator — repositioned to not overlap divider -->
      <div class="fixed bottom-2 right-2 z-40 md:hidden">
        <MobileStatusIndicator />
      </div>

      <!-- Control Deck (bottom, draggable divider) — compact -->
      <div
        data-testid="control-deck-panel"
        class="control-deck border-t border-white/[0.06]"
        :style="{ height: `${canvasRatio * 100}%`, maxHeight: '80vh' }"
        @touchstart="onDragStart"
        @touchmove="onDragMove"
        @touchend="onDragEnd"
        @mousedown="onDragStart"
      >
        <!-- Drag divider handle — more visible -->
        <div
          data-testid="drag-divider"
          class="drag-divider h-2 cursor-ns-resize flex items-center justify-center"
        >
          <div class="w-10 h-1 bg-ink-dim/40 rounded-full" />
        </div>

        <!-- Content — compact -->
        <div class="p-3 overflow-y-auto">
          <!-- Voice Selector -->
          <div class="mb-3">
            <div class="bezel mb-2">
              <div class="bezel-inner p-2.5">
                <label class="block text-[10px] font-medium text-ink-dim/50 mb-1 tracking-wide">
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
          <div class="mb-3">
            <div class="bezel">
              <div class="bezel-inner p-2.5">
                <label
                  for="text-input-mobile"
                  class="block text-[10px] font-medium text-ink-dim/50 mb-1 tracking-wide"
                >
                  Arabic Text
                </label>
                <textarea
                  id="text-input-mobile"
                  v-model="textInput"
                  placeholder="Type or paste Arabic text here..."
                  class="tts-input w-full min-h-[70px] resize-y rounded-lg bg-studio-900 text-ink text-xs font-arabic p-2.5 border border-white/[0.04] focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all duration-500"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          <!-- Speed Slider -->
          <div class="mb-3">
            <div class="bezel">
              <div class="bezel-inner p-2.5">
                <SpeedSlider />
              </div>
            </div>
          </div>

          <!-- Generate Button -->
          <div class="mb-3">
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
