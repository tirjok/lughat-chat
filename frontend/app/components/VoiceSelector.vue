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
  if (id.includes('female') || id.includes('zariyah') || id.includes('aisha')) {
    return 'text-gold'
  }
  return 'text-ink-dim'
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
    <!-- Dropdown Trigger — Double-Bezel -->
    <button
      ref="triggerRef"
      class="w-full rounded-xl bg-studio-900 ring-1 ring-white/[0.06]
             hover:ring-gold/30 p-3 flex items-center justify-between
             focus:outline-none relative overflow-hidden group
             transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
      :class="{ 'ring-gold/30': isOpen }"
      @click="toggleDropdown"
    >
      <!-- Hover glow -->
      <div
        class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style="background: linear-gradient(to right, rgba(200, 164, 92, 0.05), transparent);"
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
          :style="`filter: drop-shadow(0 0 6px ${getVoiceColorClass(displayVoice) === 'text-gold' ? 'rgba(200, 164, 92, 0.4)' : 'transparent'});`"
        />
        <div class="flex flex-col items-start min-w-0">
          <span class="text-sm font-semibold text-ink tracking-wide truncate">
            {{ displayVoice.name }}
          </span>
          <span class="text-xs text-ink-dim/70 truncate">
            {{ displayVoice.dialect }}
          </span>
        </div>
      </div>
      <span
        v-else
        class="text-sm text-ink-dim/50 relative z-10"
      >
        Select a voice
      </span>

      <!-- Chevron -->
      <span class="w-7 h-7 rounded-full flex items-center justify-center group-hover:bg-white/[0.04] transition-all duration-500 shrink-0">
        <span
          class="ph ph-caret-down text-ink-dim/60 transition-transform duration-500"
          :class="{ 'rotate-180': isOpen }"
        />
      </span>
    </button>

    <!-- Dropdown Menu — Glass card -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="fixed z-50 bg-studio-800/95 backdrop-blur-xl ring-1 ring-white/[0.06]
               rounded-xl shadow-ambient overflow-hidden
               transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
               origin-top"
        :style="menuPositionStyle"
      >
        <div class="max-h-[280px] overflow-y-auto p-2 flex flex-col gap-1">
          <button
            v-for="(voice, index) in voices"
            :key="voice.id"
            class="voice-option w-full text-left rounded-lg ring-1 ring-white/[0.04]
                   p-3 flex items-center justify-between
                   transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                   fade-up group"
            :data-voice="voice.id"
            :data-name="voice.name"
            :data-tag="voice.tag"
            :data-color="getVoiceColorClass(voice)"
            :class="[
              voice.id === modelValue
                ? 'bg-studio-700/50 ring-gold/20'
                : 'bg-studio-700/30 hover:bg-studio-700/60'
            ]"
            :style="{ transitionDelay: `${index * 50}ms` }"
            @click="selectVoice(voice)"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-full bg-studio-900 ring-1 ring-white/[0.06]
                       flex items-center justify-center
                       transition-all duration-500"
                :class="[voice.id === modelValue ? 'ring-gold/40' : 'group-hover:ring-gold/30']"
              >
                <span
                  aria-hidden="true"
                  class="ph-fill ph-waves text-ink-dim/60 transition-colors text-base group-hover:text-gold"
                  :style="voice.id === modelValue ? 'filter: drop-shadow(0 0 4px rgba(200, 164, 92, 0.4));' : ''"
                />
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-semibold text-ink truncate">{{ voice.name }}</span>
                <span class="text-xs text-ink-dim/60 truncate">{{ voice.dialect }}</span>
              </div>
            </div>

            <!-- Preview play button -->
            <span
              class="w-7 h-7 rounded-full bg-studio-900 flex items-center justify-center
                     cursor-pointer opacity-0 group-hover:opacity-100
                     transition-all duration-500 hover:scale-110 text-ink-dim/60 hover:text-gold"
              title="Preview Voice"
              @click.stop="previewVoice(voice)"
            >
              <span class="ph-fill ph-play text-xs" />
            </span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.voice-option {
  transition: transform 400ms var(--ease-spring), background-color 400ms var(--ease-spring);
}
.voice-option:active {
  transform: scale(0.98);
}
</style>
