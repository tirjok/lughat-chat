<script setup lang="ts">
import type { Voice } from '../composables/useVoices'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { showToast } from '../composables/useToast'

interface Props {
  voices: Voice[]
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

const selectedVoice = computed(() => {
  const voice = props.voices.find(v => v.id === props.modelValue)
  if (voice) return voice
  // Default to first voice if none selected
  if (props.voices.length > 0) {
    emit('update:modelValue', props.voices[0]!.id)
    return props.voices[0]
  }
  return null
})

// Color mapping for voices (matching design: orange/magenta)
function getVoiceColorClass(voice: Voice): string {
  const id = voice.id.toLowerCase()
  if (id === 'aisha' || id === 'female') {
    return 'text-sunrise-orange'
  }
  if (id === 'tariq' || id === 'male') {
    return 'text-sunrise-magenta'
  }
  return 'text-sunrise-orange'
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectVoice(voice: Voice) {
  emit('update:modelValue', voice.id)
  isOpen.value = false
}

function previewVoice(voice: Voice) {
  showToast(`Playing 1-second preview of ${voice.name}...`, 'success')
}

// Close dropdown when clicking outside
function handleOutsideClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div
    ref="dropdownRef"
    class="flex flex-col gap-3 relative"
  >
    <!-- Label -->
    <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
      <span
        aria-hidden="true"
        class="i-lucide-user text-lg"
      />
      Voice Model
    </label>

    <!-- Dropdown Trigger Button -->
    <button
      class="w-full bg-studio-900 rounded-xl p-4 flex items-center justify-between transition-colors focus:outline-none relative overflow-hidden group"
      :class="isOpen ? 'border-sunrise-orange' : 'border-studio-700 hover:border-sunrise-orange/50'"
      style="border-width: 1px;"
      @click.stop="toggleDropdown"
    >
      <!-- Gradient overlay on hover -->
      <div
        class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style="background: linear-gradient(to right, rgba(255, 81, 47, 0.05), transparent);"
      />

      <!-- Selected voice info -->
      <div class="flex items-center gap-3 relative z-10">
        <span
          v-if="selectedVoice"
          aria-hidden="true"
          class="i-lucide-waveform text-2xl"
          :class="getVoiceColorClass(selectedVoice)"
          style="filter: drop-shadow(0 0 8px rgba(255, 81, 47, 0.5));"
        />
        <div class="flex flex-col items-start">
          <span class="text-sm font-bold text-white tracking-wide">
            {{ selectedVoice?.name ?? 'Select a voice' }}
          </span>
          <span class="text-xs text-gray-400 font-medium">
            {{ selectedVoice?.dialect ?? '' }}
          </span>
        </div>
      </div>

      <!-- Animated chevron -->
      <span
        class="i-lucide-chevron-down text-gray-400 transition-transform duration-300"
        :class="{ 'rotate-180': isOpen }"
        style="transition: transform 0.3s;"
      />
    </button>

    <!-- Dropdown Menu (absolute positioned) -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="absolute top-full left-0 w-80 mt-2 bg-studio-800 border border-studio-700 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
        style="transform: opacity 0.2s, transform 0.2s;"
        @click.stop
      >
        <div class="max-h-[280px] overflow-y-auto p-2 flex flex-col gap-1">
          <button
            v-for="voice in voices"
            :key="voice.id"
            class="voice-option w-full text-left p-3 rounded-lg flex items-center justify-between hover:bg-studio-700/70 transition-colors group"
            :class="{ 'is-selected': voice.id === modelValue }"
            @click="selectVoice(voice)"
          >
            <div class="flex items-center gap-3">
              <!-- Icon circle -->
              <div
                class="w-10 h-10 rounded-full bg-studio-900 border border-studio-700 flex items-center justify-center group-hover:border-sunrise-orange transition-colors"
                :class="{ 'group-hover:border-sunrise-magenta': getVoiceColorClass(voice).includes('magenta') }"
              >
                <span
                  aria-hidden="true"
                  class="i-lucide-waveform text-gray-400 group-hover:text-sunrise-orange transition-colors text-lg"
                  :class="{ 'group-hover:text-sunrise-magenta': getVoiceColorClass(voice).includes('magenta') }"
                />
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-bold text-white">{{ voice.name }}</span>
                <span class="text-xs text-gray-500 font-medium">{{ voice.dialect }}</span>
              </div>
            </div>

            <!-- Preview play button (visible on hover) -->
            <button
              class="w-8 h-8 rounded-full bg-studio-900 border border-studio-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 text-gray-400"
              :class="{ 'hover:text-sunrise-orange hover:border-sunrise-orange': getVoiceColorClass(voice).includes('orange'), 'hover:text-sunrise-magenta hover:border-sunrise-magenta': getVoiceColorClass(voice).includes('magenta') }"
              title="Preview Voice"
              @click.stop="previewVoice(voice)"
            >
              <span
                aria-hidden="true"
                class="i-lucide-play text-sm"
              />
            </button>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.voice-option.is-selected {
  background: rgba(255, 81, 47, 0.1);
}
</style>
