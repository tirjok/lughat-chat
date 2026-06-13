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
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLDivElement | null>(null)

const selectedVoice = computed(() => {
  const voice = props.voices.find(v => v.id === props.modelValue)
  return voice ?? null
})

const displayVoice = computed(() => {
  // Show the first voice as default when no selection
  if (!props.modelValue && props.voices.length > 0) {
    return props.voices[0]
  }
  return selectedVoice.value
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
  showToast(`Playing 1-second preview of ${voice.name}...`)
}

// Close dropdown when clicking outside — uses mousedown to race ahead of document click
function handleOutsideMousedown(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node
  // Check the trigger container and the teleported menu — if click is outside both, close the dropdown
  const insideTrigger = dropdownRef.value && dropdownRef.value.contains(target)
  const insideMenu = menuRef.value && menuRef.value.contains(target)
  if (!insideTrigger && !insideMenu) {
    isOpen.value = false
  }
}

// Compute the teleported menu's position based on the trigger button
const menuPositionStyle = computed(() => {
  if (!triggerRef.value) return {}
  const rect = triggerRef.value.getBoundingClientRect()
  return {
    top: `${rect.bottom + 8}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`
  }
})

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideMousedown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideMousedown)
})
</script>

<template>
  <div
    ref="dropdownRef"
    class="flex flex-col gap-3"
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
      ref="triggerRef"
      class="w-full bg-studio-900 rounded-xl p-4 flex items-center justify-between transition-colors focus:outline-none relative overflow-hidden group"
      :class="isOpen ? 'border-sunrise-orange' : 'border-studio-700 hover:border-sunrise-orange/50'"
      style="border-width: 1px;"
      @click="toggleDropdown"
    >
      <!-- Gradient overlay on hover -->
      <div
        class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style="background: linear-gradient(to right, rgba(255, 81, 47, 0.05), transparent);"
      />

      <!-- Selected voice info -->
      <div class="flex items-center gap-3 relative z-10">
        <span
          v-if="displayVoice"
          aria-hidden="true"
          class="i-lucide-waves text-2xl"
          :class="getVoiceColorClass(displayVoice)"
          style="filter: drop-shadow(0 0 8px rgba(255, 81, 47, 0.5));"
        />
        <div class="flex flex-col items-start">
          <span class="text-sm font-bold text-white tracking-wide">
            {{ displayVoice?.name ?? 'Select a voice' }}
          </span>
          <span class="text-xs text-gray-400 font-medium">
            {{ displayVoice?.dialect ?? '' }}
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
  </div>

  <!-- Dropdown Menu (Teleported to body to avoid overflow clipping) -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="menuRef"
      class="fixed z-50 bg-studio-800 border border-studio-700 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden"
      :style="menuPositionStyle"
    >
      <div class="max-h-[280px] overflow-y-auto p-2 flex flex-col gap-1">
        <button
          v-for="voice in voices"
          :key="voice.id"
          class="voice-option w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors group"
          :class="[
            voice.id === modelValue
              ? 'bg-[#2a1a1a] border border-studio-600/50 is-selected'
              : 'bg-studio-700/40 hover:bg-studio-700/70 border border-transparent'
          ]"
          @click="selectVoice(voice)"
        >
          <div class="flex items-center gap-3">
            <!-- Icon circle -->
            <div
              class="w-10 h-10 rounded-full bg-studio-900 border border-studio-600 flex items-center justify-center transition-colors"
              :class="[
                voice.id === modelValue
                  ? 'border-sunrise-orange'
                  : 'group-hover:border-sunrise-orange',
                { 'group-hover:border-sunrise-magenta': getVoiceColorClass(voice).includes('magenta') }
              ]"
            >
              <span
                aria-hidden="true"
                class="i-lucide-waves text-gray-500 transition-colors text-lg"
                :class="[
                  voice.id === modelValue
                    ? 'text-sunrise-orange'
                    : 'group-hover:text-sunrise-orange',
                  { 'group-hover:text-sunrise-magenta': getVoiceColorClass(voice).includes('magenta') }
                ]"
              />
            </div>
            <div
              class="flex flex-col"
            >
              <span class="text-sm font-bold text-white">{{ voice.name }}</span>
              <span class="text-xs text-gray-400 font-medium">{{ voice.dialect }}</span>
            </div>
          </div>

          <!-- Preview play button (visible on hover) -->
          <span
            class="w-8 h-8 rounded-full bg-studio-900 border border-studio-600 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:scale-110 text-gray-500"
            :class="{
              'hover:text-sunrise-orange hover:border-sunrise-orange': getVoiceColorClass(voice).includes('orange'),
              'hover:text-sunrise-magenta hover:border-sunrise-magenta': getVoiceColorClass(voice).includes('magenta')
            }"
            title="Preview Voice"
            @click.stop="previewVoice(voice)"
          >
            <span
              aria-hidden="true"
              class="i-lucide-play text-sm"
            />
          </span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
