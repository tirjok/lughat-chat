<script setup lang="ts">
import type { Voice } from '../composables/useVoices'

interface Props {
  /** Available voice presets from the API */
  voices: Voice[]
  /** Currently selected voice ID */
  modelValue?: string
  /** When true, render as a compact button instead of a full dropdown */
  compact?: boolean
  /** Placeholder text when no voice is selected */
  placeholder?: string
  /** Whether the component is in a disabled/loading state */
  disabled?: boolean
  /** Whether an error state is active */
  hasError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'aisha',
  compact: false,
  placeholder: 'Select a voice preset',
  disabled: false,
  hasError: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const dropdownRef = ref<HTMLDivElement | null>(null)

const selectedVoice = computed(() =>
  props.voices.find(v => v.id === props.modelValue) || props.voices[0]
)

const filteredVoices = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return props.voices
  return props.voices.filter(
    v =>
      v.id.toLowerCase().includes(q)
      || v.name.toLowerCase().includes(q)
      || v.dialect.toLowerCase().includes(q)
      || v.tag.toLowerCase().includes(q)
  )
})

function selectVoice(voice: Voice) {
  emit('update:modelValue', voice.id)
  isOpen.value = false
  searchQuery.value = ''
}

function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
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

// Keyboard navigation
function handleKeydown(e: KeyboardEvent) {
  if (!isOpen.value) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleDropdown()
    }
    return
  }

  if (e.key === 'Escape') {
    isOpen.value = false
    searchQuery.value = ''
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const next = document.querySelector('.voice-option:not(.sr-only)') as HTMLElement
    next?.focus()
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    const prev = document.querySelector('.voice-option:focus')?.previousElementSibling as HTMLElement
    prev?.focus()
  }

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    const focused = document.querySelector('.voice-option:focus') as HTMLElement
    if (focused) {
      focused.click()
    }
  }
}
</script>

<template>
  <div
    ref="dropdownRef"
    class="voice-selector"
    :class="{ 'has-error': hasError }"
  >
    <!-- Compact mode: single button trigger -->
    <button
      v-if="compact"
      class="voice-trigger-btn"
      :class="{ 'is-disabled': disabled, 'is-selected': !!selectedVoice }"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-label="selectedVoice ? selectedVoice.name : placeholder"
      @click.stop="toggleDropdown"
      @keydown="handleKeydown"
    >
      <!-- Icon badge -->
      <span
        v-if="selectedVoice"
        class="voice-icon-badge"
        :class="`icon-${selectedVoice.icon}`"
        aria-hidden="true"
      >
        {{ selectedVoice.tag }}
      </span>

      <span class="voice-trigger-text">
        {{ selectedVoice ? selectedVoice.name : placeholder }}
      </span>

      <span
        class="voice-chevron"
        :class="{ 'is-open': isOpen }"
        aria-hidden="true"
      >
        ▼
      </span>
    </button>

    <!-- Full mode: label + trigger -->
    <div
      v-else
      class="voice-full-selector"
    >
      <label class="voice-label">
        Voice Preset
      </label>

      <button
        class="voice-trigger-btn"
        :class="{ 'is-disabled': disabled, 'is-selected': !!selectedVoice }"
        :disabled="disabled"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-label="selectedVoice ? selectedVoice.name : placeholder"
        @click.stop="toggleDropdown"
        @keydown="handleKeydown"
      >
        <span
          v-if="selectedVoice"
          class="voice-icon-badge"
          :class="`icon-${selectedVoice.icon}`"
          aria-hidden="true"
        >
          {{ selectedVoice.tag }}
        </span>

        <span class="voice-trigger-text">
          {{ selectedVoice ? selectedVoice.name : placeholder }}
        </span>

        <span
          class="voice-chevron"
          :class="{ 'is-open': isOpen }"
          aria-hidden="true"
        >
          ▼
        </span>
      </button>
    </div>

    <!-- Dropdown panel -->
    <Teleport to="body">
      <div
        v-if="isOpen && !compact"
        class="voice-dropdown"
        role="listbox"
        :aria-label="placeholder"
        @click.stop
      >
        <!-- Search bar -->
        <div class="voice-search-bar">
          <span
            class="voice-search-icon"
            aria-hidden="true"
          >🔍</span>
          <input
            v-model="searchQuery"
            class="voice-search-input"
            type="text"
            placeholder="Filter voices..."
            aria-label="Filter voices"
            refocused
          >
        </div>

        <!-- Voice options -->
        <div class="voice-options">
          <button
            v-for="voice in filteredVoices"
            :key="voice.id"
            class="voice-option"
            :class="{ 'is-selected': voice.id === modelValue }"
            role="option"
            :aria-selected="voice.id === modelValue"
            tabindex="-1"
            @click="selectVoice(voice)"
          >
            <!-- Icon badge -->
            <span
              class="voice-option-icon"
              :class="`icon-${voice.icon}`"
              aria-hidden="true"
            >
              {{ voice.tag }}
            </span>

            <!-- Voice info -->
            <div class="voice-option-info">
              <span class="voice-option-name">{{ voice.name }}</span>
              <span class="voice-option-dialect">{{ voice.dialect }}</span>
            </div>

            <!-- Selected check -->
            <span
              v-if="voice.id === modelValue"
              class="voice-option-check"
              aria-hidden="true"
            >
              ✓
            </span>
          </button>

          <!-- Empty state -->
          <div
            v-if="filteredVoices.length === 0"
            class="voice-empty"
          >
            No voice presets match "{{ searchQuery }}"
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Container ─────────────────────────────────── */
.voice-selector {
  position: relative;
  display: inline-block;
  width: 100%;
}

.voice-selector.has-error .voice-trigger-btn {
  border-color: var(--color-red-500);
}

/* ── Trigger Button ────────────────────────────── */
.voice-trigger-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-gray-300, #d1d5db);
  border-radius: 0.5rem;
  background: var(--color-white, #fff);
  color: var(--color-gray-700, #374151);
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  text-align: left;
}

.dark .voice-trigger-btn {
  background: var(--color-gray-800, #1f2937);
  border-color: var(--color-gray-600, #4b5563);
  color: var(--color-gray-200, #e5e7eb);
}

.voice-trigger-btn:hover:not(.is-disabled) {
  border-color: var(--color-green-400, #4ade80);
  box-shadow: 0 0 0 2px var(--color-green-100, #dcfce7);
}

.voice-trigger-btn.is-selected {
  border-color: var(--color-green-500, #22c55e);
}

.voice-trigger-btn.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Icon Badge ────────────────────────────────── */
.voice-icon-badge,
.voice-option-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  flex-shrink: 0;
}

.icon-ar {
  background: #fef3c7;
  color: #92400e;
}

.dark .icon-ar {
  background: #78350f;
  color: #fde68a;
}

.icon-en {
  background: #dbeafe;
  color: #1e40af;
}

.dark .icon-en {
  background: #1e3a5f;
  color: #93c5fd;
}

.icon-ml {
  background: #fce7f3;
  color: #9d174d;
}

.dark .icon-ml {
  background: #500724;
  color: #f9a8d4;
}

/* ── Trigger Text ──────────────────────────────── */
.voice-trigger-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Chevron ───────────────────────────────────── */
.voice-chevron {
  display: inline-block;
  transition: transform 0.2s ease;
  font-size: 0.625rem;
  color: var(--color-gray-400, #9ca3af);
}

.voice-chevron.is-open {
  transform: rotate(180deg);
}

/* ── Full Selector (with label) ────────────────── */
.voice-full-selector {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.voice-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-gray-600, #4b5563);
}

.dark .voice-label {
  color: var(--color-gray-400, #9ca3af);
}

/* ── Dropdown Panel ────────────────────────────── */
.voice-dropdown {
  position: absolute;
  z-index: 50;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: var(--color-white, #fff);
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  max-height: 20rem;
  overflow-y: auto;
}

.dark .voice-dropdown {
  background: var(--color-gray-800, #1f2937);
  border-color: var(--color-gray-700, #374151);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
}

/* ── Search Bar ────────────────────────────────── */
.voice-search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
}

.dark .voice-search-bar {
  border-color: var(--color-gray-700, #374151);
}

.voice-search-icon {
  font-size: 0.875rem;
  opacity: 0.5;
}

.voice-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--color-gray-700, #374151);
  outline: none;
}

.dark .voice-search-input {
  color: var(--color-gray-200, #e5e7eb);
}

/* ── Voice Options ─────────────────────────────── */
.voice-options {
  padding: 0.25rem;
}

.voice-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--color-gray-700, #374151);
}

.voice-option:hover,
.voice-option:focus-visible {
  background: var(--color-gray-100, #f3f4f6);
}

.dark .voice-option:hover,
.dark .voice-option:focus-visible {
  background: var(--color-gray-700, #374151);
}

.voice-option.is-selected {
  background: var(--color-green-50, #f0fdf4);
  font-weight: 600;
}

.dark .voice-option.is-selected {
  background: #052e16;
}

/* ── Option Info ───────────────────────────────── */
.voice-option-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.voice-option-name {
  font-size: 0.875rem;
}

.voice-option-dialect {
  font-size: 0.75rem;
  color: var(--color-gray-500, #6b7280);
}

.dark .voice-option-dialect {
  color: var(--color-gray-400, #9ca3af);
}

/* ── Selected Check ────────────────────────────── */
.voice-option-check {
  color: var(--color-green-500, #22c55e);
  font-weight: 700;
  font-size: 1rem;
}

/* ── Empty State ───────────────────────────────── */
.voice-empty {
  padding: 1rem 0.75rem;
  text-align: center;
  color: var(--color-gray-400, #9ca3af);
  font-size: 0.875rem;
}
</style>
