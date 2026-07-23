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
  if (id.includes('female') || id.includes('zariyah') || id.includes('aisha')) {
    return 'text-gold'
  }
  return 'text-ink-dim'
}

function getShadowColor(): string {
  return 'rgba(200, 164, 92, 0.4)'
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
      class="text-sm font-semibold text-ink-dim flex items-center gap-2 mb-2"
    >

      <!-- Dropdown Trigger -->
      <button
        ref="triggerRef"
        class="w-full bg-studio-900 ring-1 ring-white/[0.06] hover:ring-gold/30 rounded-lg p-3 flex items-center justify-between focus:outline-none relative overflow-hidden group transition-all duration-700"
        @click="toggleDropdown"
      >
        <div
          class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
            :style="`filter: drop-shadow(0 0 6px ${getShadowColor()});`"
          />
          <div class="flex flex-col items-start">
            <span class="text-sm font-bold text-ink tracking-wide">
              {{ displayVoice.name }}
            </span>
            <span class="text-xs text-ink-dim font-medium">
              {{ displayVoice.dialect }}
            </span>
          </div>
        </div>
        <span
          v-else
          class="text-sm text-ink-dim/60 relative z-10"
        >
          Select a voice
        </span>

        <span class="w-7 h-7 rounded-full flex items-center justify-center group-hover:bg-white/5 transition-all shrink-0">
          <span
            class="ph ph-caret-down text-ink-dim"
            :class="{ 'rotate-180': isOpen }"
          />
        </span>
      </button>

      <!-- Dropdown Menu -->
      <Teleport to="body">
        <div
          v-if="isOpen"
          ref="menuRef"
          class="fixed z-50 bg-studio-800 ring-1 ring-white/[0.06] rounded-xl shadow-ambient overflow-hidden transition-all duration-700 origin-top opacity-100 scale-100 pointer-events-auto"
          :style="menuPositionStyle"
        >
          <div class="max-h-[280px] overflow-y-auto p-2 flex flex-col gap-1">
            <button
              v-for="(voice, index) in voices"
              :key="voice.id"
              class="voice-option w-full text-left rounded-lg ring-1 ring-white/[0.04] p-3 flex items-center justify-between transition-all duration-700 group fade-up"
              :data-voice="voice.id"
              :data-name="voice.name"
              :data-tag="voice.tag"
              :data-color="getVoiceColorClass(voice)"
              :class="[voice.id === modelValue ? 'bg-studio-700/50 ring-gold/20' : 'bg-studio-700/30 hover:bg-studio-700/60']"
              :style="{ transitionDelay: `${index * 50}ms` }"
              @click="selectVoice(voice)"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full bg-studio-900 ring-1 ring-white/[0.06] flex items-center justify-center transition-all duration-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
                  :class="[voice.id === modelValue ? 'ring-gold' : 'group-hover:ring-gold/50']"
                >
                  <span
                    aria-hidden="true"
                    class="ph-fill ph-waves text-ink-dim transition-colors text-lg group-hover:text-gold"
                    :style="voice.id === modelValue ? `filter: drop-shadow(0 0 6px rgba(200, 164, 92, 0.5));` : ''"
                  />
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-ink">{{ voice.name }}</span>
                  <span class="text-xs text-ink-dim font-medium">{{ voice.dialect }}</span>
                </div>
              </div>

              <!-- Preview play button -->
              <span
                class="w-8 h-8 rounded-full bg-studio-900 ring-1 ring-white/[0.06] flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:scale-110 text-ink-dim shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] hover:text-gold hover:ring-gold/30"
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
    </label>
  </div>
</template>
