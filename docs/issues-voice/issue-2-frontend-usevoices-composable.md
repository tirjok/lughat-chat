# Frontend: Create `useVoices` Composable

## Type
AFK (Automated — can be implemented without human interaction)

## Blocked by
None — can start immediately (parallel with backend work; just calls `/api/voices`)

---

## What to build

A new `useVoices` composable that fetches the voice list from `/api/voices` on creation and exposes it as a reactive ref. This follows existing composable patterns (e.g., `useHealthPoll`) and provides a clean, testable interface for the voice dropdown.

### Acceptance criteria

- [ ] New composable file created at `app/composables/useVoices.ts`
- [ ] Composable fetches `/api/voices` on creation (onMount)
- [ ] Returns `{ voices: ref<Voice[]> }` where `Voice = { id: string, name: string }`
- [ ] Handles fetch errors gracefully (e.g., logs error, returns empty array)
- [ ] No refresh capability — one fetch on mount is sufficient per PRD scope
- [ ] Inline unit test file (`useVoices.test.ts`) verifies the fetch and ref behavior
- [ ] Test mocks `fetch` to return a sample voice list

### Prototype / Decision Record

```typescript
export interface Voice {
  id: string
  name: string
}

export const useVoices = () => {
  const voices = ref<Voice[]>([])

  onMounted(async () => {
    try {
      const response = await fetch('/api/voices')
      if (response.ok) {
        voices.value = await response.json()
      }
    } catch (error) {
      console.error('Failed to load voices:', error)
    }
  })

  return { voices }
}
```

### Notes

- This composable is intentionally simple — no polling, no refresh button. The PRD scope does not include voice management UI.
- The composable mirrors the pattern used by `useHealthPoll` but without polling (just a single fetch).
- The `/api/voices` response shape is `{ id: string, name: string }` per the backend contract.
