# Frontend: Update `SynthesisRequest` Type to Accept Any Voice String

## Type
AFK (Automated — can be implemented without human interaction)

## Blocked by
- Issue 1: Backend dynamic voice discovery (backend must accept any string for `voice`)
- Issue 3: Frontend dropdown wiring (dropdown must send a plain string value)

---

## What to build

Update the `SynthesisRequest` interface and synthesis call in `useTtsApi.ts` to accept any string value for the `speaker` field instead of the fixed `'female' | 'male'` union type. This allows custom voice names (e.g., `ahmed_ksa`, `nada_ksa`) to be sent to the backend without type errors.

### Acceptance criteria

- [ ] `SynthesisRequest.speaker` in `useTtsApi.ts` changes from `'female' | 'male'` to `string | undefined`
- [ ] The `"default"` mapping logic is removed (backend no longer maps "default" → "female")
- [ ] The `synthesize()` call sends the selected voice as a plain string value
- [ ] No TypeScript compilation errors after changes
- [ ] Existing tests updated to reflect the new type (if any reference the old union)

### Prototype / Decision Record

**Before:**
```typescript
export interface SynthesisRequest {
  text: string
  speaker?: 'female' | 'male'
  speed?: number
}

// In synthesize():
body: JSON.stringify({
  text: request.text,
  speaker: request.speaker || 'default',  // "default" mapping
  speed: request.speed || 1.0,
  language: 'ar'
})
```

**After:**
```typescript
export interface SynthesisRequest {
  text: string
  speaker?: string  // any voice name accepted
  speed?: number
}

// In synthesize():
body: JSON.stringify({
  text: request.text,
  speaker: request.speaker,  // plain string, no mapping
  speed: request.speed || 1.0,
  language: 'ar'
})
```

### Notes

- The `voice` field in the backend `SynthesisRequest` also accepts any string (per Issue 1). The frontend `speaker` field maps to the backend's `voice`/`speaker` parameter.
- The `"default"` alias is no longer needed — the dropdown sends actual voice IDs directly.
- If `speaker` is undefined, the backend should fall back to a default behavior (e.g., first voice in the list). This is a decision for Issue 1's implementation.
- The `SynthesisResponse` interface remains unchanged (it was already unused by the actual endpoint).
