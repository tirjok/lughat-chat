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
  if (!props.modelValue && props.voices.length > 0) {
    return props.voices[0]
  }
  return selectedVoice.value
})

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

function getShadowColor(voice: Voice): string {
  const cls = getVoiceColorClass(voice)
  return cls.includes('orange') ? 'rgba(255,81,47,0.5)' : 'rgba(221,36,118,0.5)'
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectVoice(voice: Voice) {
  emit('update:modelValue', voice.id)
  isOpen.value = false
}

function previewVoice(voice: Voice) {
  showToast(`Playing 1-second preview of ${voice.name}...`, 'info')
}

function handleOutsideMousedown(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node
  const insideTrigger = dropdownRef.value && dropdownRef.value.contains(target)
  const insideMenu = menuRef.value && menuRef.value.contains(target)
  if (!insideTrigger && !insideMenu) {
    isOpen.value = false
  }
}

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
    class="flex flex-col gap-3 border-b border-studio-700/60 pb-6"
  >
    <!-- Label -->
    <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
      <span
        aria-hidden="true"
        class="ph ph-user-sound text-lg"
      />
      Voice Model
    </label>

    <!-- Dropdown Trigger -->
    <button
      ref="triggerRef"
      class="w-full bg-studio-900 border border-studio-700/60 hover:border-sunrise-orange/50 rounded-xl p-4 flex items-center justify-between transition-colors focus:outline-none relative overflow-hidden group shadow-inner"
      @click="toggleDropdown"
    >
      <div
        class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style="background: linear-gradient(to right, rgba(255, 81, 47, 0.05), transparent);"
      />

      <!-- Selected voice -->
      <div
        v-if="displayVoice"
        class="flex items-center gap-3 relative z-10"
      >
        <span
          aria-hidden="true"
          class="ph-fill ph-waves text-2xl"
          :class="getVoiceColorClass(displayVoice)"
          :style="`filter: drop-shadow(0 0 8px ${getShadowColor(displayVoice)});`"
        />
        <div class="flex flex-col items-start">
          <span class="text-sm font-bold text-white tracking-wide">
            {{ displayVoice.name }}
          </span>
          <span class="text-xs text-gray-400 font-medium">
            {{ displayVoice.dialect }}
          </span>
        </div>
      </div>

      <span
        v-else
        class="text-sm text-gray-500 relative z-10"
      >
        Select a voice
      </span>

      <span
        class="ph ph-caret-down text-gray-400"
        :class="{ 'rotate-180': isOpen }"
        style="transition: transform 0.3s;"
      />
    </button>

    <!-- Dropdown Menu (Teleported to body, animated) -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="fixed z-50 bg-studio-800 border border-studio-700/60 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-200 origin-top opacity-100 scale-100 pointer-events-auto"
        :style="menuPositionStyle"
      >
        <div class="max-h-[280px] overflow-y-auto p-2 flex flex-col gap-1">
          <button
            v-for="voice in voices"
            :key="voice.id"
            class="voice-option w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors group"
            :data-voice="voice.id"
            :data-name="voice.name"
            :data-tag="voice.tag"
            :data-color="getVoiceColorClass(voice)"
            :class="[
              voice.id === modelValue
                ? 'bg-[#2a1a1a] border border-studio-600/50'
                : 'bg-studio-700/40 hover:bg-studio-700/70 border border-transparent'
            ]"
            @click="selectVoice(voice)"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-studio-900 border border-studio-700/60 flex items-center justify-center transition-colors"
                :class="[
                  voice.id === modelValue
                    ? 'border-sunrise-orange'
                    : 'group-hover:border-sunrise-orange',
                  { 'group-hover:border-sunrise-magenta': getVoiceColorClass(voice).includes('magenta') }
                ]"
              >
                <span
                  aria-hidden="true"
                  class="ph-fill ph-waves text-gray-500 transition-colors text-lg"
                  :class="[
                    voice.id === modelValue
                      ? 'text-sunrise-orange'
                      : 'group-hover:text-sunrise-orange',
                    { 'group-hover:text-sunrise-magenta': getVoiceColorClass(voice).includes('magenta') }
                  ]"
                  :style="voice.id === modelValue ? `filter: drop-shadow(0 0 6px rgba(255,81,47,0.5));` : ''"
                />
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-bold text-white">{{ voice.name }}</span>
                <span class="text-xs text-gray-500 font-medium">{{ voice.dialect }}</span>
              </div>
            </div>

            <!-- Preview play button (visible on hover) -->
            <span
              class="w-8 h-8 rounded-full bg-studio-900 border border-studio-700/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:scale-110 text-gray-500"
              :class="{
                'hover:text-sunrise-orange hover:border-sunrise-orange': getVoiceColorClass(voice).includes('orange'),
                'hover:text-sunrise-magenta hover:border-sunrise-magenta': getVoiceColorClass(voice).includes('magenta')
              }"
              title="Preview Voice"
              @click.stop="previewVoice(voice)"
            >
              <span
                aria-hidden="true"
                class="ph-fill ph-play text-sm"
              />
            </span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
