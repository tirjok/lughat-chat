<script setup lang="ts">
// Index: Thin composition surface for the main TTS page.
import { computed, nextTick, onUnmounted, shallowRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { usePanelToggle } from '../composables/usePanelToggle'
import { useAudioModule } from '../composables/useAudioModule'
import { useTtsApi } from '../composables/useTtsApi'
import { useHealthPoll } from '../composables/useHealthPoll'
import { useVoices } from '../composables/useVoices'
import { useInputValidation } from '../composables/useInputValidation'
import { showToast } from '../composables/useToast'
import MobileSplitScreen from '../components/MobileSplitScreen.vue'
import DesktopPanels from '../components/DesktopPanels.vue'
import { useCleanupNavigation } from '../composables/useCleanupNavigation'

const { activePanel } = usePanelToggle()

const audioModule = useAudioModule({
  onPlaybackEnd: () => {
    // State (isPlaying, isPaused, currentTime=0) is already reset by the composable's 'ended' handler.
    // This callback is intentionally left as a hook for future use (e.g., auto-close panel).
  }
})

const {
  audioRef,
  audioUrl,
  duration,
  currentTime,
  isPlaying,
  isPaused
} = audioModule

const { synthesize } = useTtsApi()
const { status: modelStatus } = useHealthPoll()
const { voices: speakerVoices } = useVoices()

// ── Form state ──────────────────────────────────────────────────
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

const isValid = computed(() => validationState.value.isValid)

// Panel announcement for screen readers
const panelAnnouncement = computed(() => {
  return activePanel.value === 'control-deck'
    ? 'Switched to voice settings panel'
    : 'Switched to text editor panel'
})

// ── In-flight synthesis cleanup guard (R-7) ──
const cleanup = useCleanupNavigation(audioModule)
// ─── Cleanup navigation logic (extracted for testability) ───────────────

onBeforeRouteLeave(async () => {
  // AC-1: guard fires when navigating away from /
  // AC-2: show dialog when isGenerating=true or isStreaming
  const hasInFlightSynthesis = isGenerating.value

  if (!hasInFlightSynthesis) {
    // No in-flight synthesis — allow navigation without dialog
    return true
  }

  // AC-2: Show dialog when isGenerating=true or isStreaming
  cleanup.dialogVisible.value = true

  // Block navigation until user responds
  return false
})

// ── Business logic ──────────────────────────────────────────────
async function handleSynthesize() {
  if (!isValid.value) {
    showToast(validationState.value.error ?? 'Invalid text')
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

// Safety net: dispose on unmount
onUnmounted(() => audioModule.dispose())

// ── Derived data for child components ───────────────────────────
const mobileScreenProps = computed(() => ({
  textInput: textInput.value,
  selectedSpeaker: selectedSpeaker.value,
  speedValue: speedValue.value,
  isGenerating: isGenerating.value,
  playerVisible: playerVisible.value,
  audioUrl: audioUrl.value,
  isPlaying: isPlaying.value,
  isPaused: isPaused.value,
  currentTime: currentTime.value,
  duration: duration.value,
  modelStatus: modelStatus.value,
  isValid: isValid.value,
  speakerVoices: speakerVoices.value,
  selectedVoiceName: selectedVoiceName.value
}))

const desktopPanelProps = computed(() => ({
  ...mobileScreenProps.value
}))
</script>

<template>
  <div
    class="flex flex-col md:flex-row h-[calc(100vh-60px)] w-full overflow-hidden text-stone-text antialiased bg-stone-50 dark:bg-stone-950"
    data-test-id="main-wrapper"
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

    <!-- Mobile: Split-screen -->
    <MobileSplitScreen
      v-if="mobileScreenProps"
      v-bind="mobileScreenProps"
      @update:text-input="textInput = $event"
      @update:selected-speaker="selectedSpeaker = $event"
      @update:speed-value="speedValue = $event"
      @synthesize="handleSynthesize"
      @clear-text="handleClearText"
      @close-player="handleClosePlayer"
      @toggle="audioModule.toggle()"
      @download="handleDownload"
      @seek="audioModule.seek"
      @set-audio-ref="audioRef = $event"
    />

    <!-- Desktop: Side-by-side panels -->
    <DesktopPanels
      v-if="desktopPanelProps"
      v-bind="desktopPanelProps"
      @update:text-input="textInput = $event"
      @update:selected-speaker="selectedSpeaker = $event"
      @update:speed-value="speedValue = $event"
      @synthesize="handleSynthesize"
      @clear-text="handleClearText"
      @close-player="handleClosePlayer"
      @toggle="audioModule.toggle()"
      @seek="audioModule.seek"
      @set-audio-ref="audioRef = $event"
    />

    <!-- ── In-flight synthesis cleanup dialog ── -->
    <CleanupDialog
      :visible="cleanup.dialogVisible.value"
      @cleanup="cleanup.handleCleanupAndLeave"
      @stay="cleanup.handleStay"
    />
  </div>
</template>
