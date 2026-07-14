# ADR-013: Testing Strategy and LLM Test Generation

- **Status**: Accepted
- **Date**: 2026-07-14
- **Context**: The LLM consistently fails when writing Vitest tests due to ambiguous mocking patterns, missing source context, and overly complex mock factory APIs.

## Problem Statement

The LLM struggles to write correct Vitest tests for this Nuxt 4 project because:

1. **Three conflicting mock strategies** exist (`global.fetch`, `registerEndpoint`, `vi.mock`) with no decision tree telling the LLM which to use.
2. **Source code is not included** in the LLM's context when writing tests, so it hallucinates return types, method names, and reactive state.
3. **No copy-paste templates** exist for common test patterns, so the LLM reinvents the wheel every time.
4. **Mock factory API is overly complex** — 5 separate factory functions force combinatorial configuration for multi-composable components.
5. **Anti-patterns table is reactive, not proactive** — it tells the LLM what *not* to do, but not what *to* do in ambiguous cases.

## Decision

We adopt a **four-pillar approach** to make tests reliably generatable by an LLM:

### Pillar 1: Decision Tree Document

A single reference document (`tests/PATTERNS.md`) that maps every scenario to exactly one correct mocking pattern:

```
## For composables (app/composables/*.ts):
  Does the composable make HTTP requests (fetch/$fetch/useFetch)?
    YES → Use `registerEndpoint()` from @nuxt/test-utils/runtime.
           Call the public method directly. Do NOT rely on onMounted.
           Reference: tests/useVoices.test.ts

    NO  → Use `setup.ts` global mocks (ref, computed, watch).
           Safe to call directly in describe blocks.
           Reference: tests/useInputValidation.test.ts

## For components (app/components/*.ts):
  Does the component use any composables that make HTTP requests?
    YES → Use `vi.mock()` for each API composable.
           Provide mock return values matching the real interface.
           Reference: tests/ModelStatusIndicator.test.ts

    NO  → Use `shallowMount()` directly. No mocking needed.

## For pages (app/pages/*.vue):
  Uses 4+ composables?
    YES → Use `vi.hoisted()` + `mockNuxtImport()` + `mountSuspended()` (Pattern 5).
           Reference: tests/index.test.ts (the **only** working page test).
           **Do NOT** use `Object.assign(globalThis, {...})` — this is the broken
           `PanelSliding.test.ts` pattern that produces unhandled rejection errors.
  NO  → Use `vi.mock()` per composable (Pattern 4).
```

### Pillar 2: Source-Code-in-Context Requirement

When generating a test for a new component or composable, the LLM **must** read and include the source file content in its context before writing any test. This is enforced in AGENTS.md:

> "When generating a test for a new component or composable, always read the source file first and include its content in the context."

### Pillar 3: Copy-Paste Test Templates

`tests/PATTERNS.md` contains ready-to-copy templates for every pattern:

```ts
// Pattern: Composable with API calls
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useMyComposable } from '../app/composables/useMyComposable'

describe('useMyComposable', () => {
  it('does X when API returns Y', async () => {
    registerEndpoint('/api/endpoint', () => mockData)
    const { method, state } = useMyComposable()
    await method()
    expect(state.value).toBe(expected)
  })
})

// Pattern: Component with mocked composables
vi.mock('../app/composables/useMyComposable', () => ({
  useMyComposable: () => ({ state: ref('value'), method: vi.fn() })
}))
```

### Pillar 4: Pre-Test Checklist in AGENTS.md

Added to AGENTS.md "Testing" section (updated to reflect Pattern 5):

> **Before writing any test, answer these questions:**
> 1. Does the source make HTTP requests? → Choose `registerEndpoint` (composable) or `vi.mock` (component)
> 2. How many composables does the source use? → 4+ means Pattern 5: `vi.hoisted()` + `mockNuxtImport()` + `mountSuspended()`
> 3. Does the source use `onMounted`? → Call public methods directly, don't trigger lifecycle
> 4. Is the source a page with 4+ composables? → See `tests/PATTERNS.md` Pattern 5 (not `mocks.ts` factory functions)

## Consequences

### Positive
- LLM test generation accuracy expected to improve by 60-80% (single highest-impact change)
- New contributors can write tests by following the decision tree, without deep framework knowledge
- Fewer "works in isolation but fails in the Nuxt test env" bugs

### Negative
- Adds documentation overhead to maintain PATTERNS.md alongside existing tests
- Requires discipline from all agents to follow the pre-test checklist

### Trade-offs Considered

1. **Consolidate mocks.ts into a single builder function** — Would reduce API surface from 5 factories to 1, but adds indirection. Deferred to future iteration.
2. **Add a test-generation CLI tool** — Would automate template selection, but over-engineers a documentation problem.
3. **Remove `global.fetch` mocking entirely** — Would simplify to 2 patterns, but `useTtsApi.test.ts` uses it successfully and is the simplest pattern for pure method tests.
4. **Use `Object.assign(globalThis)` for pages** — The original approach (now superseded by Pattern 5) produced unhandled rejection errors. Replaced with `vi.hoisted()` + `mockNuxtImport()` + `mountSuspended()`.

## Related

- AGENTS.md — Project context and testing anti-patterns table (updated to reference Pattern 5)
- `tests/PATTERNS.md` — 7-pattern decision tree with code templates (authoritative reference)
- `tests/setup.ts` — Global mock setup for unit tests
- `tests/setup.component.ts` — Global mock setup for component tests
- `tests/mocks.ts` — Mock factory functions for component tests (used by Pattern 4)
- `tests/index.test.ts` — Working Pattern 5 page test (single reference)
- `tests/PanelSlading.test.ts` — **BROKEN** — uses `shallowMount` + `Object.assign(globalThis)` (documented as cautionary example)
- `vitest.config.ts` — Vitest configuration (environment: 'nuxt', domEnvironment: 'jsdom')
- `vitest.component.config.ts` — Component test configuration
