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
- Test runner: Vitest (two configs) + pytest (in Docker). Quality gate: `./run-tests.sh`.
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

This project does NOT use `@nuxt/test-utils`, `mountSuspended`, or
`mockNuxtImport`. Do not generate them — they will not run.

- **Auto-imports are stubbed manually** in `frontend/tests/setup.ts`
  (`ref`, `computed`, `watch`, `onMounted`). READ this file before
  mocking anything. Do not re-mock what it already provides.
- **Two Vitest configs:**
  - `vitest.config.ts` — unit tests (jsdom), setup: `tests/setup.ts`
  - `vitest.component.config.ts` — component tests (jsdom), setup: `tests/setup.component.ts`
- **Test location is law:** all `.test.ts` in `frontend/tests/`, all
  `test_*.py` in `backend/tests/`. NEVER in `app/`, `components/`,
  `composables/`, or any source directory. If you find inline test
  files in source dirs, move them to `tests/`.
- Naming: `<name>.test.ts` mirroring the source name.
- When a component test needs async DOM settling, use `await nextTick()`
  (elements inside `<Transition>`/`v-if` don't exist immediately — see
  CONTEXT.md debugging history).

---

## 4. Commands (Single Source of Truth)

```bash
# Quality gate — run before EVERY commit/push (also called by pre-commit hooks)
./run-tests.sh        # backend pytest (Docker) → lint → typecheck → frontend tests

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