<script setup lang="ts">
// Full-page TTS Studio — "Manuscript Dark" theme
// Two-panel layout: Left (Control Deck) + Right (Canvas)
// Mobile: both panels stacked (canvas top, controls bottom)
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
    class="tts-page min-h-screen bg-[#0C0A09] dark:bg-[#0C0A09]"
    dir="ltr"
  >
    <!-- Hidden audio element -->
    <audio
      ref="audioRef"
      :src="audioUrlRef || undefined"
      class="hidden"
    />
    <NavBar compact />

    <!-- Desktop: two-panel layout -->
    <div
      data-testid="desktop-panels"
      class="hidden md:flex h-screen"
      style="padding-top: var(--nav-height, 56px)"
    >
      <!-- Left panel: Control Deck -->
      <div
        ref="controlDeckDesktopRef"
        class="control-deck flex-1 p-8 overflow-y-auto"
        data-panel="control-deck"
      >
        <!-- Header: Calligraphic headline -->
        <div class="mb-8">
          <h1
            class="font-arabic text-3xl font-bold text-gold mb-2"
            dir="rtl"
          >
            استوديو نطق
          </h1>
          <p class="text-[10px] font-sans text-ink-dim tracking-[0.2em] uppercase mb-1">
            LughatChat Studio
          </p>
          <p class="text-ink-dim text-sm">
            Arabic Text-to-Speech with XTTS-v2
          </p>
        </div>

        <!-- Voice Selector -->
        <div class="mb-6">
          <VoiceSelector
            v-model="selectedVoice"
            :voices="voices"
          />
        </div>

        <!-- Text Input -->
        <div class="mb-6">
          <label
            for="text-input"
            class="block text-sm font-medium text-ink-dim mb-2"
          >
            Enter Arabic Text
          </label>
          <textarea
            id="text-input"
            v-model="textInput"
            data-testid="text-input"
            placeholder="Type or paste Arabic text here..."
            class="tts-input w-full min-h-[150px] resize-y"
            dir="rtl"
          />
        </div>

        <!-- Speed Slider -->
        <div class="mb-6">
          <SpeedSlider />
        </div>

        <!-- Generate Button -->
        <div class="mb-6">
          <GenerateButton
            :is-generating="isGenerating"
            :model-status="health.status"
            :disabled="isGenerateDisabled"
            :text="textInput"
            @click="handleGenerate"
          />
        </div>

        <!-- Shortcut hint -->
        <div class="text-xs text-ink-dim/60">
          Press <kbd class="px-1.5 py-0.5 bg-studio-700 rounded text-ink-dim">Ctrl</kbd> +
          <kbd class="px-1.5 py-0.5 bg-studio-700 rounded text-ink-dim">Enter</kbd> to generate
        </div>
      </div>

      <!-- Right panel: Canvas -->
      <div
        ref="canvasHeaderRef"
        data-testid="canvas-panel"
        class="canvas flex-1 p-8 overflow-y-auto"
        data-panel="canvas"
        @click.stop="togglePanel"
      >
        <div class="mb-6">
          <h2 class="text-xl font-bold text-ink">
            Output
          </h2>
        </div>

        <!-- No-audio placeholder -->
        <div
          v-if="!audioUrlRef"
          class="flex flex-col items-center justify-center py-12 text-ink-dim/50"
        >
          <span
            aria-hidden="true"
            class="ph ph-speaker-simple-none text-4xl mb-3 opacity-40"
          />
          <p class="text-sm">
            Generate speech to see audio output
          </p>
        </div>

        <!-- Audio Player Panel -->
        <div
          v-if="audioUrlRef"
          class="mt-6 animate-slide-up"
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
    <div class="md:hidden h-screen flex flex-col">
      <!-- Canvas (top) -->
      <div
        class="canvas flex-1 overflow-y-auto relative"
        style="height: calc(100vh - 56px - 44px)"
        @click.stop="togglePanel"
      >
        <div class="mb-6 px-4 pt-2">
          <h2 class="text-xl font-bold text-ink">
            Output
          </h2>
        </div>

        <div
          v-if="!audioUrlRef"
          class="flex flex-col items-center justify-center py-12 text-ink-dim/50"
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
          class="mt-6 animate-slide-up px-4"
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
      <div class="fixed bottom-4 right-4 z-40 md:hidden">
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
          <div class="mb-4">
            <VoiceSelector
              v-model="selectedVoice"
              :voices="voices"
            />
          </div>
          <div class="mb-4">
            <label
              for="text-input-mobile"
              class="block text-sm font-medium text-ink-dim mb-2"
            >
              Enter Arabic Text
            </label>
            <textarea
              id="text-input-mobile"
              v-model="textInput"
              placeholder="Type or paste Arabic text here..."
              class="tts-input w-full min-h-[100px] resize-y"
              dir="rtl"
            />
          </div>
          <div class="mb-4">
            <SpeedSlider />
          </div>
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
