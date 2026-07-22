<script setup lang="ts">
import type { Voice } from '../composables/useVoices'
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
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

// VueUse: declarative click-outside handler (no manual add/removeEventListener)
onClickOutside(dropdownRef, () => {
  isOpen.value = false
}, { ignore: [menuRef] })

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

const menuPositionStyle = computed(() => {
  if (!triggerRef.value) return {}
  const rect = triggerRef.value.getBoundingClientRect()
  return {
    top: `${rect.bottom + 8}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`
  }
})
</script>

<template>
  <div ref="dropdownRef">
    <!-- Label -->
    <label
      class="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-2"
    >
      <span
        aria-hidden="true"
        class="ph ph-user-sound text-lg"
      />
      Voice Model
    </label>

    <!-- Dropdown Trigger -->
    <button
      ref="triggerRef"
      class="w-full bg-studio-900 ring-1 ring-white/[0.06] hover:ring-sunrise-orange/30 rounded-[0.875rem] p-3 flex items-center justify-between focus:outline-none relative overflow-hidden group transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
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
          class="ph-fill ph-waves text-xl"
          :class="getVoiceColorClass(displayVoice)"
          :style="`filter: drop-shadow(0 0 6px ${getShadowColor(displayVoice)});`"
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

      <!-- Trailing chevron -->
      <span
        class="w-7 h-7 rounded-full flex items-center justify-center group-hover:bg-white/5 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 shrink-0"
      >
        <span
          class="ph ph-caret-down text-gray-400"
          :class="{ 'rotate-180': isOpen }"
        />
      </span>
    </button>

    <!-- Dropdown Menu (Teleported to body, animated) -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="fixed z-50 bg-studio-800 ring-1 ring-white/[0.06] rounded-[1.125rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top opacity-100 scale-100 pointer-events-auto"
        :style="menuPositionStyle"
      >
        <div class="max-h-[280px] overflow-y-auto p-2 flex flex-col gap-1">
          <button
            v-for="(voice, index) in voices"
            :key="voice.id"
            class="voice-option w-full text-left rounded-[0.875rem] ring-1 ring-white/[0.06] p-3 flex items-center justify-between transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group fade-up"
            :data-voice="voice.id"
            :data-name="voice.name"
            :data-tag="voice.tag"
            :data-color="getVoiceColorClass(voice)"
            :class="[
              voice.id === modelValue
                ? 'bg-[#2a1a1a]'
                : 'bg-studio-700/40 hover:bg-studio-700/70'
            ]"
            :style="{ transitionDelay: `${index * 50}ms` }"
            @click="selectVoice(voice)"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-studio-900 ring-1 ring-white/[0.06] flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
                :class="[
                  voice.id === modelValue
                    ? 'ring-sunrise-orange'
                    : 'group-hover:ring-sunrise-orange',
                  { 'group-hover:ring-sunrise-magenta': getVoiceColorClass(voice).includes('magenta') }
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
              class="w-8 h-8 rounded-full bg-studio-900 ring-1 ring-white/[0.06] flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-110 text-gray-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
              :class="{
                'hover:text-sunrise-orange hover:ring-sunrise-orange': getVoiceColorClass(voice).includes('orange'),
                'hover:text-sunrise-magenta hover:ring-sunrise-magenta': getVoiceColorClass(voice).includes('magenta')
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
