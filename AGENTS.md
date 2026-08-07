# AGENTS.md — Lughat Chat (Agent Contract)

> This file is loaded on EVERY session. It is the behavioral contract.
> Deep architecture, API schemas, Docker internals, debugging history,
> and CI/CD details live in `CONTEXT.md` — read it when a task requires it.
> If a rule here conflicts with your training data, this file wins.

---

## 1. Project Identity (5 lines, memorize)

- Arabic TTS web app: Nuxt 4 + Vue 3 + UnoCSS frontend, FastAPI + Coqui XTTS-v2 backend.
- Deployed via Docker Compose (Nginx reverse proxy). Host ports: backend 9000, frontend 9001.
- Package manager: pnpm 10.33.4. Backend is Docker-first (no host Python).
- Test runner: Vitest (two configs with Nuxt test environment) + pytest (in Docker). Quality gate: `./run-tests.sh`.
- Arabic-first UI: RTL support, Cairo font, dark theme.

---

## 2. HARD RULES — Non-Negotiable

Violation of any rule in this section = stop, revert, report. No exceptions.

### 2.1 Test Integrity

1. NEVER modify, weaken, or delete an existing test to make it pass.
   If a test fails, fix the implementation.
2. If you believe a test is genuinely wrong: STOP. Explain why.
   Wait for explicit human approval before touching it.
3. Tests assert OBSERVABLE BEHAVIOR only — never internal state,
   implementation details, or private structure.
4. No tautological mocks. Never mock a dependency and then assert the
   function returns the mock's payload. That tests the mock, not the code.
5. Every new behavior gets a test. No untested features. No exceptions
   for "trivial" code.

### 2.2 TDD Mandate

6. For ANY feature work: invoke the `tdd` skill. Follow red-green-refactor.
   Do not write implementation before a failing test exists.
7. ONE failing test at a time. Confirm it fails for the RIGHT reason
   (missing behavior, not a broken import or bad mock) before implementing.
8. Write the MINIMAL code to pass. No extra features, no speculative
   abstractions, no "while I'm here" improvements.
9. Never write tests and implementation in the same step. Test first,
   fresh context, then implement.

### 2.3 Scope Discipline

10. Touch ONLY files relevant to the task. No drive-by refactors.
    No reformatting of untouched code. No "cleanup" unless asked.
11. NO new dependencies without explicit human approval. State the
    dependency, its size, and why an existing tool can't do the job.
12. If requirements are ambiguous: ASK. Do not guess. A wrong
    assumption costs more than a question.

### 2.4 Security & Safety

13. Never commit secrets, tokens, or credentials. Never widen CORS
    (`*` is dev-only) or expose new endpoints without flagging it.
14. Never write files outside designated dirs (`backend/downloads/` for
    audio, `frontend/tests/` / `backend/tests/` for tests).

---

## 3. Testing Conventions (Nuxt-Specific — Read Carefully)

- **`@nuxt/test-utils/module`** is added to `nuxt.config.ts` with a `testUtils` config block (`startOnBoot: true`). This enables the full Nuxt Vitest integration: proper auto-import resolution, in-test devtools, and a test server that starts automatically.
- **`defineVitestConfig`** is used in both configs with `environmentOptions.nuxt.rootDir` pointing to the project root. This activates the Nuxt test environment — auto-imports (`ref`, `computed`, `useRoute`, `onMounted`, etc.) are provided natively. No manual stubs needed.
- **`globals: true`** is set in both configs so Vitest testing globals (`describe`, `it`, `expect`, `vi`, `beforeEach`) are available without explicit imports.
- **`setup.ts`** handles only browser-level mocks that jsdom doesn't provide: `IntersectionObserver`, `URL.createObjectURL`, `URL.revokeObjectURL`, `matchMedia`. Nuxt composables come from the runtime.
- **`setup.component.ts`** handles browser mocks + a fallback `useNuxtApp` stub (only for tests not using `mountSuspended`). It also provides `setBreakpoint()` for responsive testing.
- **Component tests** use `shallowMount`/`mount` from `@vue/test-utils` directly. For tests needing the full Nuxt runtime (plugins, router, config), use `mountSuspended()` or `renderSuspended()` from `@nuxt/test-utils/runtime`.
- **Mocking auto-imports**: use `mockNuxtImport()` from `@nuxt/test-utils/runtime` (the official pattern). It's a macro that gets hoisted by Vitest — the import must be at the top of the file, before any other code. Example:
  ```ts
  import { mockNuxtImport } from '@nuxt/test-utils/runtime'
  mockNuxtImport('onMounted', (original) => (cb) => { /* custom impl */ })
  ```
- **Mocking components**: use `mockComponent()` from `@nuxt/test-utils/runtime`.
- **Mocking API endpoints**: use `registerEndpoint()` from `@nuxt/test-utils/runtime`.
- **Two Vitest configs:**
  - `vitest.config.ts` — unit/composable tests (jsdom), setup: `tests/setup.ts`
  - `vitest.component.config.ts` — component tests (jsdom), setup: `tests/setup.component.ts`
- **Test location is law:** all `.test.ts` in `frontend/tests/`, all
  `test_*.py` in `backend/tests/`. NEVER in `app/`, `components/`,
  `composables/`, or any source directory. If you find inline test
  files in source dirs, move them to `tests/`.
- Naming: `<name>.test.ts` mirroring the source name.
- When a component test needs async DOM settling, use `await nextTick()`
  (elements inside `<Transition>`/`v-if` don't exist immediately — see
  CONTEXT.md debugging history).

## 3b. AI Slop Anti-Patterns (from SlopCodeBench 2026)

Research from [SlopCodeBench](https://www.scbench.ai) (arXiv:2603.24755) identifies
two trajectory-level signals that distinguish human-written code from LLM-generated
"slop": **verbosity** (redundant/duplicated code) and **structural erosion**
(complexity concentrated in fewer, more-complex functions). Below are the concrete
anti-patterns found in this codebase, ranked by severity.

### Critical: Tautological Mocks

A tautological mock is when you mock a dependency and then assert that the mock's
return value was produced. **You are testing the mock, not the code.**


**Before (tautological — asserts on mock return value):**

```ts
// setup.ts already mocks createObjectURL to return 'http://mock.url/blob'
expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
// Tests: "does the composable call the mocked function?" — not "does it work?"
```

**After (asserts observable behavior):**

```ts
const module = useAudioModule()
const blob = new Blob(['dummy'], { type: 'audio/mpeg' })
module.load(blob)
expect(module.audioUrl.value).not.toBeNull()
expect(typeof module.audioUrl.value).toBe('string')
```

**Before (tautological — mock returns exactly what the test asserts):**

```ts
vi.mock('../../app/composables/useHealthPoll', () => ({
  useHealthPoll: vi.fn()
}))
vi.mocked(useHealthPoll).mockReturnValue({
  status: ref('loading'),
  modelLoaded: computed(() => false)
})
// The mock returns exactly what the test puts in.
// The test asserts the component reads what the mock provides.
```

**After (use factory from `tests/mocks.ts`):**

```ts
import { createMockUseHealthPoll } from '../mocks'
vi.mock('../../app/composables/useHealthPoll', () => ({
  useHealthPoll: createMockUseHealthPoll
}))
// For parameterized states:
vi.mock('../../app/composables/useHealthPoll', () => ({
  useHealthPoll: () => createMockUseHealthPoll({ status: 'error' })
}))
```

**Key principle:** The test provides the input; the assertion checks the
composable's observable behavior (state changes, DOM updates, events).

### Medium: Duplicated Fixture Data

Defining the same data in multiple places (e.g., a mock in `vi.mock()` AND a
`makeMockVoices()` function) is a maintenance burden with zero behavioral benefit.
Extract to a shared constant.

### Low: Naming Noise

Prefixes like `#sanity` in test names add output noise without semantic value.
Use descriptive names that stand alone: "creates an object URL from the blob"
not "#sanity load: creates an object URL from the blob".

### Low: Missing Module Isolation

The official Nuxt example uses `vi.resetModules()` in setup files. Without it,
module-level state (singletons, intervals, counters) leaks between tests.
Either use `vi.resetModules()` or provide an explicit reset function (like
`resetHealthPoll()`) called in every `beforeEach`.

---

# Frontend (from frontend/)
pnpm dev              # dev server :3000 (proxies to localhost:9000)
pnpm lint             # ESLint (commaDangle: never, braceStyle: 1tbs)
pnpm typecheck        # TypeScript
pnpm test             # Vitest unit tests
npx vitest --config vitest.component.config.ts   # component tests

# Backend (from project root — everything runs in Docker, no host Python)
./scripts/run-backend-tests.sh

# Full stack
docker compose up --build -d
```

---

## 5. Conventions

1. Nuxt file-based routing: pages in `app/pages/`, auto-imported.
2. Composables in `app/composables/`, components in `app/components/` — auto-imported, no explicit imports.
3. Composition API only, `<script setup lang="ts">`. No Options API.
4. Follow existing patterns: before adding a component/composable, read
   a similar existing one first and match its structure.
5. Dark mode: all UnoCSS utilities have `dark:` variants in `main.css`.
6. RTL: Arabic text via Cairo font + RTL direction. Test RTL when touching layout.
7. Icons: Phosphor (`ph ph-<name>` / `ph-fill ph-<name>`), Lucide, Simple Icons.
8. Main page = two-panel layout (Control Deck | Waveform Canvas); mobile stacks with draggable divider.
9. Voices are discovered dynamically from `backend/speaker_wavs/` — never hardcode the voice list.
10. Backend model loading takes ~120s; `/health` returns `loading → ready | error`. Respect 503s.
---

## 5b. Nuxt Development Rules

- This project uses **Nuxt 4** (v4.x). Never generate Nuxt 2 or Nuxt 3 patterns.
- Before writing any Nuxt code, use the `nuxt` MCP tools
  (`get_documentation_page`, `list_documentation_pages`) to verify the
  current v4 API. Do not rely on training-data knowledge of Nuxt APIs.
- Authoritative sources, in priority order:
  1. Nuxt MCP server (official docs, live)
  2. https://nuxt.com/llms.txt and https://nuxt.com/llms-full.txt
  3. https://github.com/nuxt/nuxt (examples/ and docs/ folders)
  4. https://github.com/nuxt/nuxt.com (production reference app)
- v4 directory structure: `app/`, `shared/`, `public/`.
  This project has **no `server/` directory** — API calls are proxied
  through Nginx in production. Do not create server routes unless explicitly asked.
- Data fetching:
  - **Server-side** (composables, server hooks): use `useFetch` / `useAsyncData`.
  - **Client-side** (browser `fetch()`): acceptable when the request is
    proxied through Nginx (as this project does). Do not use raw `$fetch`
    from `#unjs/ofetch` in component setup.
- Config: use `useRuntimeConfig()`, never `process.env` in app code.
- If unsure whether an API changed in v4, call the MCP `migration_help`
  prompt or fetch the upgrade guide before coding.

---


## 6. Agent Operating Procedure
0. Before tasks involving the API, Docker deployment, or debugging:
   read `CONTEXT.md` first. It is NOT auto-loaded.
1. Do NOT say "let me explore the codebase" — this file + CONTEXT.md
   are your context. Read specific files directly when you need details.
2. State the plan in 3-5 lines before touching code. For anything beyond
   a trivial fix, wait for approval.
3. Work in small vertical slices. One feature = one full TDD cycle = one commit.
4. Frontend work: `cd frontend`, pnpm commands. Backend work: Docker only.
5. Commits: atomic, conventional format (`feat:`, `fix:`, `test:`,
   `refactor:`). Run `./run-tests.sh` first. Pre-commit hooks will
   enforce it — don't rely on that, run it yourself.

---

## 7. Definition of Done — Verify Before Reporting Completion

Check every box. If any fails, you are NOT done — do not claim completion.

- [ ] Test written BEFORE implementation (failing first, right failure reason)
- [ ] `./run-tests.sh` passes: backend tests, lint, typecheck, frontend tests
- [ ] Zero existing tests modified, weakened, or deleted
- [ ] New tests assert behavior, not implementation; mocks are not tautological
- [ ] Test files only in `frontend/tests/` or `backend/tests/`
- [ ] No new dependencies without recorded approval
- [ ] No unrelated files touched (check your diff)
- [ ] Commit message is conventional and atomic
- [ ] No tautological mocks (mock returns exactly what the test asserts — see §3b)

---

## 8. UI/UX Skill Routing

| User says | Invoke first |
|---|---|
| "Review the UI" / "UI feels off" | `ui-ux-reviewer` |
| "Design feedback" | `design-review` |
| "Accessibility" / "WCAG" | `accessibility-auditor` |
| "Make it look better" | `frontend-design` |
| "Design the component" | `ui-designer` |
| "Fix layout" / "responsive" | `ux-architect` |
| "Review diff" | `review` |
| "QA" / "report bug" | `qa` |
| "Polish / premium feel" | `high-end-visual-design` |

Any feature work (including UI features) still goes through the `tdd` skill.