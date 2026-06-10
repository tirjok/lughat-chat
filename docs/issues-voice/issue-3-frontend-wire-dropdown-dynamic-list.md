# Frontend: Wire Voice Dropdown to Dynamic List

## Type
AFK (Automated — can be implemented without human interaction)

## Blocked by
- Issue 1: Backend dynamic voice discovery (must be deployed first for the dropdown to show voices)
- Issue 2: `useVoices` composable (must exist for the dropdown to consume)

---

## What to build

Replace the hardcoded `speakers` array in `index.vue` with a dropdown populated from the `useVoices()` composable. The selected voice is sent as a plain string value in the synthesis request, allowing any discovered voice to be used without type constraints.

### Acceptance criteria

- [ ] `index.vue` removes the hardcoded `speakers` array
- [ ] Dropdown renders from `useVoices().voices` using `v-for`
- [ ] Each option displays `voice.name` and uses `voice.id` as the value
- [ ] `selectedSpeaker` type changes from `'female' | 'male'` to `string`
- [ ] Default selected voice is the first item in the list (or empty if no voices)
- [ ] Dropdown updates automatically when new voices appear from the API (reactive ref)
- [ ] Existing visual styling of the dropdown is preserved (no UI regression)
- [ ] Dark mode variants continue to work

### Prototype / Decision Record

**Before (hardcoded):**
```vue
<script setup>
const speakers = [
  { value: 'female', label: 'Female Voice' },
  { value: 'male', label: 'Male Voice' }
]
const selectedSpeaker = ref<'female' | 'male'>('female')
</script>

<template>
  <select v-model="selectedSpeaker">
    <option v-for="speaker in speakers" :key="speaker.value" :value="speaker.value">
      {{ speaker.label }}
    </option>
  </select>
</template>
```

**After (dynamic):**
```vue
<script setup>
const { voices } = useVoices()
const selectedSpeaker = ref<string>('')

// Set default to first voice when loaded (or empty)
watch(voices, (v) => {
  if (!selectedSpeaker.value && v.length > 0) {
    selectedSpeaker.value = v[0].id
  }
}, { immediate: true })
</script>

<template>
  <select v-model="selectedSpeaker">
    <option v-for="voice in voices" :key="voice.id" :value="voice.id">
      {{ voice.name }}
    </option>
  </select>
</template>
```

### Notes

- The `selectedSpeaker` type change from `'female' | 'male'` to `string` is a breaking change for any code that assumes a fixed set of values. Ensure all references are updated (see Issue 4).
- If no voices are available yet (API hasn't returned), the dropdown should render empty — this is acceptable since backend Issue 1 ensures at least `female.wav` and `male.wav` exist.
- The PRD scope does not include a "refresh voices" button — the list is fetched once on page load.
