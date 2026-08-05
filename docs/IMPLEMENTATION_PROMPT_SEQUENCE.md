# Lughat Chat — Implementation Prompt Sequence

> **Purpose:** 16 ready-to-paste prompts (plus 1 audit prompt), one per issue, in dependency order.
> Each prompt matches the work type to the correct verification method: TDD for behavior, visual audit for CSS, grep for configuration.
> **Source:** `docs/issues/`, `docs/workflows/`, `docs/adr/`, `docs/workflows/REGISTRY.md`


---

## How to Use

Paste each prompt into your AI coding agent **in order** (or in parallel per the map below). Each prompt is self-contained — it states its dependencies, scope, and the exact acceptance criteria to implement.

**Verification method varies by work type:**
| Work Type | Verification | Prompt Pattern |
|---|---|---|
| New component/page with behavior | TDD (red-green-refactor) | Prompts 1, 2, 3, 5, 6, 7, 8, 9, 10, 13, 15a, 15b |
| Configuration change | Diff review + lint/typecheck | Prompt 4 |
| CSS/token migration (find-replace) | Grep audit + visual screenshots | Prompts 11, 12 |
| Regression verification | QA walkthrough + existing tests | Prompt 14 |

---

## Shared Limits Template

Every prompt below includes the LIMITS block. Two variants exist:

**TDD LIMITS** (for prompts 1-3, 5-10, 13, 15a, 15b):
- One vertical slice: complete red-green-refactor for ONE acceptance criterion before touching the next.
- Only files within the issue's scope. No drive-by refactors.
- No new dependencies.
- NEVER modify or delete an existing test to make it pass — fix the implementation, or stop and explain why the test is wrong.
- Nuxt tests: auto-imports are stubbed in `frontend/tests/setup.ts` — read it before mocking. No `@nuxt/test-utils` / `mountSuspended` patterns; they are not installed.
- Where documents conflict with each other or with the current code: STOP and report the conflict — do not resolve it silently.

**NON-TDD LIMITS** (for prompts 4, 11, 12, 14):
- Only files within the issue's scope. No drive-by refactors.
- No new dependencies.
- NEVER modify or delete an existing test to make it pass — fix the implementation, or stop and explain why the test is wrong.
- Where documents conflict with each other or with the current code: STOP and report the conflict — do not resolve it silently.

---


## Prompt 0 — Audit & Context Load (Pre-Implementation)

```
Read CONTEXT.md (architecture, API schemas, Docker internals, debugging history).
Then read these files:
  1. docs/issues/ISSUE-001-global-navbar.md
  2. docs/issues/ISSUE-002-app-vue-layout.md
  3. docs/workflows/WORKFLOW-global-navbar-navigation.md (full)
  4. docs/workflows/WORKFLOW-multi-page-spa-routing.md (full)
  5. docs/adr/ADR-001-shared-layout-with-global-navbar.md
  6. docs/adr/ADR-002-multi-page-spa-routing.md
  7. docs/adr/ADR-003-theme-rebrand.md
  8. docs/adr/ADR-004-sticky-audio-bar.md
  9. docs/workflows/REGISTRY.md (View 2: By Component)

State a brief summary of the current codebase state:
  - What exists today (pages, components, composables)
  - What's missing (new files to create)
  - What constraints apply (UnoCSS tokens, backend health, Docker)

Do NOT write code yet. Just confirm understanding.
```

---

## Prompt 1 — ISSUE-001: GlobalNavbar Component

```
Implement ISSUE-001: Create GlobalNavbar Component with Route-Aware Active State and Progress Bar using the tdd skill.

CONTEXT:
- Acceptance criteria: AC-1 (component exists, renders on all pages, not on 404), AC-2 (desktop 56px top bar + 4px progress bar, <NuxtLink> only), AC-3 (route-aware active link via useRoute()), AC-4 (mobile collapse < 768px, h-16, 44px touch targets), AC-5 (never uses navigateTo()).
- WORKFLOW: WORKFLOW-global-navbar-navigation.md Steps 1-2 (app shell restructuring, GlobalNavbar creation).
- ADR: ADR-001 (top bar 56px + progress bar 4px, mobile collapse at < 768px, h-16 for WCAG), ADR-002 (three route groups: /, /dashboard, /dashboard/level/**).
- Files: `frontend/app/components/GlobalNavbar.vue` (new), `frontend/tests/GlobalNavbar.test.ts` (new).

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/VoiceSelector.test.ts` (component test with props/emit assertions) and `frontend/tests/ModelStatusIndicator.test.ts` (component with health status display).

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 2 — ISSUE-002: app.vue Layout Restructuring

```
Implement ISSUE-002: Update app.vue Layout to Wrap NuxtPage with GlobalNavbar using the tdd skill.

CONTEXT:
- Acceptance criteria: AC-1 (app.vue wraps <NuxtPage /> inside layout with <GlobalNavbar />, min-h-screen), AC-2 (SEO title inheritance: root sets base title via useSeoMeta, per-page appends), AC-3 (no regression on existing / page — TTS Studio renders identically modulo navbar chrome).
- WORKFLOW: WORKFLOW-global-navbar-navigation.md Step 1 (app shell restructuring).
- ADR: ADR-001 (exact wrapper structure: <GlobalNavbar /> above <NuxtPage />).
- Dependencies: ISSUE-001 (GlobalNavbar must exist).
- Files: `frontend/app/app.vue` (modified).

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/app.test.ts` (existing app.vue test) and `frontend/tests/VoiceSelector.test.ts` (component rendering assertions).

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 3 — ISSUE-003: TTS Studio Layout Adaptation

```
Implement ISSUE-003: Adapt TTS Studio Layout for Navbar Height using the tdd skill.

CONTEXT:
- Acceptance criteria: AC-1 (panels use calc(100vh - 60px) desktop, calc(100vh - 64px - safe-area) mobile), AC-2 (mobile layout < 768px, draggable divider works), AC-3 (no visual regression — waveform/audio panel not clipped behind navbar).
- NOTE: AC-4 ("all 11 customer journeys remain functional") is deferred to Prompt 14 (ISSUE-011) which runs full journey verification after all layout changes are complete. This prompt only verifies layout-specific behavior.
- WORKFLOW: WORKFLOW-global-navbar-navigation.md Step 3 (TTS Studio layout adaptation).
- ADR: ADR-001 (60px vertical space tax: 56px top bar + 4px progress bar, calc(100vh - 60px) adjustment, mobile h-16).
- Dependencies: ISSUE-001, ISSUE-002.
- Files: `frontend/app/pages/index.vue` (modified), possibly `frontend/app/components/AudioPlayerPanel.vue`, `frontend/app/components/WaveformCanvas.vue`.

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/index.test.ts` (existing TTS Studio page tests) and `frontend/tests/PanelSliding.test.ts` (layout interaction tests).

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 4 — ISSUE-007: Route Rules (Configuration Only)

```
Implement ISSUE-007: Update nuxt.config.ts routeRules for New Pages.

This is a configuration change — NO TDD cycle required.

CONTEXT:
- Acceptance criteria: AC-1 (routeRules explicitly excludes /dashboard and /dashboard/level/** from prerendering), AC-2 (nginx.conf SPA fallback already handles all new routes — verify, no change needed), AC-3 (dev proxy handles new routes — verify, no change needed).
- WORKFLOW: WORKFLOW-multi-page-spa-routing.md Prerequisites (routeRules updated).
- ADR: ADR-002 (prerender tradeoff: / prerendered, /dashboard dynamic per RC-5, nginx SPA fallback handles all routes per RC-4).
- Dependencies: None (configuration change only).
- Files: `frontend/nuxt.config.ts` (modified).

LIMITS: See NON-TDD LIMITS above.

EXAMPLE: Match the structure of the existing routeRules block in `frontend/nuxt.config.ts`.

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me the final diff. No red/green phase — configuration changes are verified by the test suite passing and the diff showing correct routeRules.

HUMAN ROLE: I review the diff, confirm routeRules match the ADR, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 5 — ISSUE-004: Dashboard Page Shell

```
Implement ISSUE-004: Create Dashboard Page Shell using the tdd skill.

CONTEXT:
- Acceptance criteria: AC-1 (frontend/app/pages/dashboard.vue exists, /dashboard maps to it), AC-2 (renders placeholder content — card grid, does NOT import useAudioModule/useTtsApi/useInputValidation/usePanelToggle/useVoices per RC-2), AC-3 (GlobalNavbar visible, "Dashboard" link highlighted as active), AC-4 (health poll non-blocking — dashboard renders regardless of health status).
- WORKFLOW: WORKFLOW-global-navbar-navigation.md Step 7 (Dashboard page shell).
- ADR: ADR-002 (D3: flat page file, D2: secondary to TTS Studio, RC-1: non-blocking health, RC-2: no useVoices).
- Dependencies: ISSUE-001 (GlobalNavbar), ISSUE-002 (app.vue layout).
- Files: `frontend/app/pages/dashboard.vue` (new), `frontend/tests/Dashboard.test.ts` (new).

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/index.test.ts` (page component tests) and `frontend/tests/ModelStatusIndicator.test.ts` (health status display component).

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 6 — ISSUE-005: Level Index Page Shell

```
Implement ISSUE-005: Create Level Index Page Shell using the tdd skill.

CONTEXT:
- Acceptance criteria: AC-1 (frontend/app/pages/dashboard/level/[level]/index.vue exists, /dashboard/level/{level} maps to it), AC-2 (renders placeholder — level display, content list), AC-3 (navigation from Dashboard highlights "My Courses"), AC-4 (does NOT import useAudioModule/useTtsApi/useInputValidation/usePanelToggle/useVoices per RC-2).
- WORKFLOW: WORKFLOW-global-navbar-navigation.md Step 8 (Lesson page shell — level index sub-step).
- ADR: ADR-002 (D4: nested dynamic route /dashboard/level/{level}, RC-2: no useVoices).
- Dependencies: ISSUE-004 (Dashboard page shell exists).
- Files: `frontend/app/pages/dashboard/level/[level]/index.vue` (new), `frontend/tests/LevelIndex.test.ts` (new).

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/Dashboard.test.ts` (from Prompt 5) and `frontend/tests/index.test.ts` (page component patterns).

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 7 — ISSUE-006: Lesson Page Shell

```
Implement ISSUE-006: Create Lesson Page Shell using the tdd skill.

CONTEXT:
- Acceptance criteria: AC-1 (frontend/app/pages/dashboard/level/[level]/[lesson].vue exists, /dashboard/level/{level}/{lesson} maps to it), AC-2 (renders placeholder — breadcrumbs, hero, section tabs), AC-3 (navigation from Level Index highlights "My Courses"), AC-4 (does NOT import useAudioModule/useTtsApi/useInputValidation/usePanelToggle/useVoices per RC-2), AC-5 (404 handling: /dashboard/level/ redirects to /dashboard, /nonexistent renders Nuxt 404).
- WORKFLOW: WORKFLOW-global-navbar-navigation.md Step 8 (Lesson page shell).
- ADR: ADR-002 (D4: deepest nested dynamic route /dashboard/level/{level}/{lesson}, RC-2: no useVoices).
- Dependencies: ISSUE-005 (Level index page exists).
- Files: `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (new), `frontend/tests/LessonPage.test.ts` (new).

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/LevelIndex.test.ts` (from Prompt 6) and `frontend/tests/index.test.ts` (page component patterns).

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 8 — ISSUE-009: StickyAudioBar Component

```
Implement ISSUE-009: Create StickyAudioBar Component using the tdd skill.

CONTEXT:
- Acceptance criteria: AC-1 (fixed bottom-0 left-0 right-0 z-50, hidden by default translate-y-full, slides up translate-y-0 when active), AC-2 (left controls: prev/next, play/pause primary-600 rounded-full 44px), AC-3 (center: Arabic text RTL, wave animation, progress bar seek, time display), AC-4 (right: speed toggle 0.75x/1x/1.25x, repeat, close), AC-5 (dark mode: bg-stone-800 text-stone-200 border-stone-700), AC-6 (does NOT migrate index.vue yet — that's Issue-010), AC-7 (keyboard shortcuts: Space play/pause, Arrow keys seek, no conflict with Ctrl+Enter).
- WORKFLOW: WORKFLOW-multi-page-spa-routing.md Step 3 (audio playback integration).
- ADR: ADR-004 (fixed-bottom slide-up bar, controls layout, dark mode, z-index hierarchy).
- Dependencies: None (standalone component).
- Files: `frontend/app/components/StickyAudioBar.vue` (new), `frontend/tests/StickyAudioBar.test.ts` (new).

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/AudioPlayerPanel.test.ts` (audio playback component tests) and `frontend/tests/SpeedSlider.test.ts` (slider interaction tests).

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 9 — ISSUE-008: Cleanup Guard

```
Implement ISSUE-008: Add onBeforeRouteLeave Guard with Cleanup Dialog using the tdd skill.

CONTEXT:
- Acceptance criteria: AC-1 (onBeforeRouteLeave fires when navigating away from /), AC-2 (no dialog when no in-flight synthesis, dialog shown when isGenerating=true or audioModule.isStreaming), AC-3 (confirmation dialog: "A synthesis is in progress. Clean up the generated files when you leave?" with "Clean & Leave" and "Stay" buttons, accessible — keyboard focus trap, ESC, ARIA), AC-4 ("Clean & Leave": audioModule.dispose(), POST /api/cleanup, navigation proceeds, toast on success/failure), AC-5 ("Stay": navigation cancelled, synthesis continues, toast), AC-6 (network error handling: 503 -> "Backend unavailable — orphan files will be cleaned by scheduled job.", network error -> "Cleanup failed — files will be cleaned by 24h TTL.", navigation ALWAYS proceeds).
- WORKFLOW: WORKFLOW-multi-page-spa-routing.md Step 2a (in-flight synthesis cleanup — R-7).
- ADR: ADR-001 (RC-3: Critical — index.vue has no onBeforeRouteLeave guard; R-7 must be implemented before testing).
- Dependencies: ISSUE-003 (TTS Studio layout adapted), ISSUE-004 (Dashboard page exists for navigation target).
- Files: `frontend/app/pages/index.vue` (modified), `frontend/tests/index.cleanup-guard.test.ts` (new).

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/index.test.ts` (existing TTS Studio page tests) and `frontend/tests/useAudioModule.test.ts` (audio module interaction tests).

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 10 — ISSUE-013: Health Poll Singleton

```
Implement ISSUE-013: Refactor useHealthPoll to Singleton using the tdd skill.

CONTEXT:
- Acceptance criteria: AC-1 (singleton pattern: same instance returned regardless of caller, first caller starts 2s interval, last unmount cleans up), AC-2 (all existing callers work without modification — index.vue, ModelStatusIndicator.vue, GlobalNavbar.vue receive health status exactly as before), AC-3 (health poll respects terminal state per spec — loading/ready/error states displayed correctly, 150 retries max), AC-4 (dashboard/lesson pages do NOT restart polling on navigation — existing interval continues), AC-5 (no regression: ./run-tests.sh passes, exactly ONE 2s interval in Network tab).
- WORKFLOW: WORKFLOW-global-navbar-navigation.md Step 11 (backend health integration), WORKFLOW-multi-page-spa-routing.md Step 4 (composable initialization).
- ADR: ADR-001 (RC-1: Critical — 3 simultaneous health polls = 6 intervals firing every 2s, RC-2: High — 4 instances total).
- Dependencies: ISSUE-001 (GlobalNavbar exists and calls useHealthPoll), ISSUE-004 (Dashboard page may call useHealthPoll), ISSUE-003 (TTS Studio index.vue calls useHealthPoll).
- Files: `frontend/app/composables/useHealthPoll.ts` (modified), `frontend/tests/useHealthPoll.test.ts` (new — existing test file may already exist; extend it).

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/useHealthPoll.test.ts` (existing composable tests) and `frontend/tests/useAudioModule.test.ts` (composable with interval/state management).

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 11 — ISSUE-014: Theme Token Migration (10 Components)

```
Implement ISSUE-014: Migrate Theme Tokens Across 10 Components.

This is a visual migration — NO TDD cycle. Verification is grep audit + visual screenshots.

CONTEXT:
- Acceptance criteria: AC-1 (zero old token references remain — grep audit: grep -rn "studio-\|sunrise-" frontend/app/ | grep -v "ISSUE-014" | grep -v "TODO: migrated from" | grep -v "Migrated:" | grep -v "was replaced" returns empty), AC-2 (all new tokens generate correct CSS: primary-500=#14b8a6, primary-600=#0f766e, gold-500=#f59e0b, gradients render), AC-3 (WCAG AA contrast ratio 4.5:1 for text on colored backgrounds), AC-4 (no visual regression on /, /dashboard, /dashboard/level/** in both light and dark mode), AC-5 (multi-stop gradients render in UnoCSS — fallback to CSS custom property or inline style if needed).
- WORKFLOW: WORKFLOW-global-navbar-navigation.md Step 4 (theme token migration).
- ADR: ADR-003 (complete color palette replacement: studio-/sunrise-* -> primary-/gold-, 10+ component files audited).
- Token mapping:
    studio-900 (#121212) -> stone-900 (dark) / white (light)
    studio-800 -> stone-800 (dark) / white (light)
    studio-700 -> stone-700 (dark) / stone-200 (light)
    sunrise-orange (#FF512F) -> primary-500 (#14b8a6)
    sunrise-magenta (#DD2476) -> gold-500 (#f59e0b)
    Gradient #FF512F -> #DD2476 -> #14b8a6 -> #0f766e (teal)
    Gradient #0d9488 -> #115e59 (dark teal)
- One migration comment per file (max one per file), MUST reference ISSUE-014:
    // TODO: migrated from studio-900 (see ISSUE-014)
    <!-- Migrated: sunrise-orange -> primary-500 (ISSUE-014) -->
    /* studio-800 was replaced with stone-800 (ISSUE-014) */
- Files to migrate (10): AudioPlayerPanel.vue, WaveformCanvas.vue, SpeedSlider.vue, GenerateButton.vue, VoiceSelector.vue, ModelStatusIndicator.vue, MobileStatusIndicator.vue, ToastNotification.vue, FocusHaloCanvas.vue, index.vue (TTS Studio).
- Dependencies: ISSUE-007 (UnoCSS config updated with primary/gold palettes), ISSUE-001 (GlobalNavbar uses new tokens), ISSUE-013 (health poll singleton).

LIMITS: See NON-TDD LIMITS above.

EXAMPLE: Match the migration pattern of `frontend/app/components/VoiceSelector.vue` (existing component with studio-/sunrise- tokens) and `frontend/app/pages/index.vue`.

DONE WHEN:
  1. Run the grep audit command from AC-1 — output must be empty. Show me the command and its empty output.
  2. ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests).
  3. Show me before/after screenshots of each page (/, /dashboard, /dashboard/level/a1/1) in both light and dark mode.
  4. Show the final diff.
  No red/green phase — visual migration is verified by audit + screenshots + existing tests passing.

HUMAN ROLE: I review the grep audit output, approve the screenshots, and confirm no visual regression. Nothing merges on your word alone.
```

---

## Prompt 12 — ISSUE-015: Full Theme Rebrand (Global CSS)

```
Implement ISSUE-015: Implement Full Light/Dark Theme Rebrand (Global CSS).

This is a CSS migration — NO TDD cycle. Verification is visual screenshots + existing tests passing.

CONTEXT:
- Acceptance criteria: AC-1 (body background: bg-stone-50 light / bg-stone-900 dark, renders on /, /dashboard, /dashboard/level/**), AC-2 (gradient orbs: dark mode preserved .dark: variants, light mode subtle teal orbs), AC-3 (scrollbar styling: light track #fafaf9 (stone-50), dark track #1c1917 (stone-900), thumb colors adjusted), AC-4 (textarea caret: #14b8a6 primary-500 on light, preserved dark styling), AC-5 (placeholder: #78716c stone-500 on light, preserved dark styling), AC-6 (film grain: opacity 0.01 light / 0.025 dark via .dark: override), AC-7 (every light-mode rule has a corresponding .dark: override, no .dark: variant lost).
- WORKFLOW: WORKFLOW-global-navbar-navigation.md Step 13 (full theme rebrand).
- ADR: ADR-003 (background and shadow redesign, font replacement, bundle size 200-400KB for Inter + Amiri).
- Failure modes to verify:
    FAILURE(light_mode_missing): Light mode not implemented (only .dark: variants exist)
    FAILURE(scrollbar_regression): Light mode scrollbar uses dark colors
    FAILURE(film_grain_visible): Film grain too visible in light mode
    FAILURE(caret_visible): Textarea caret #FF512F too bright on light background
- Dependencies: ISSUE-007 (UnoCSS config updated with primary/gold palettes), ISSUE-014 (theme tokens migrated across all components).
- Files: `frontend/app/assets/main.css` (modified), `frontend/nuxt.config.ts` (possibly modified for font preload).

LIMITS: See NON-TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/app/assets/main.css` (existing global CSS) and the dark mode patterns already present in the file.

DONE WHEN:
  1. ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests).
  2. Show me screenshots of each page (/, /dashboard, /dashboard/level/a1/1) in both light and dark mode, demonstrating: body background, scrollbar colors, textarea caret, placeholder text, film grain visibility, and gradient orbs.
  3. Show the final diff.
  No red/green phase — CSS changes are verified by screenshots + existing tests passing.

HUMAN ROLE: I review the screenshots for all failure modes, confirm no visual regression, and approve the diff. Nothing merges on your word alone.
```

---

## Prompt 13 — ISSUE-010: Migrate TTS Studio to StickyAudioBar

```
Implement ISSUE-010: Migrate TTS Studio to StickyAudioBar (Retire AudioPlayerPanel) using the tdd skill.

CONTEXT:
- Acceptance criteria: AC-1 (index.vue renders <StickyAudioBar> not <AudioPlayerPanel>, slides up when active audio, hidden translate-y-full when not active), AC-2 (useAudioModule feeds data to StickyAudioBar — play, pause, seek, speed, volume; audioModule.dispose() on navigation hides bar; audioModule.load(audioBlob) on synthesis shows bar), AC-3 (AudioPlayerPanel.vue removed from codebase; ALL references to AudioPlayerPanel removed from index.vue; NO re-export stubs or aliases — clean cutover), AC-4 (synthesis workflow preserved: text input -> select voice -> generate -> audio plays in sticky bar; download button visible; speed/seek/volume functional), AC-5 (TTS Studio panels gain ~300+ pixels vertical space from retired panel, 60px navbar tax partially offset).
- WORKFLOW: WORKFLOW-multi-page-spa-routing.md Step 3 (audio playback integration, cleanup inventory).
- ADR: ADR-004 (AudioPlayerPanel retired, StickyAudioBar replaces on all pages — fixed-bottom slide-up bar, context-aware controls).
- Dependencies: ISSUE-009 (StickyAudioBar exists), ISSUE-003 (TTS Studio layout adapted).
- Files: `frontend/app/pages/index.vue` (modified), `frontend/app/components/StickyAudioBar.vue` (modified), `frontend/app/components/AudioPlayerPanel.vue` (deleted), `frontend/tests/` (updated).

TEST MIGRATION: `frontend/tests/AudioPlayerPanel.test.ts` must be handled:
  - Migrate any behavioral assertions (playback controls, audio events) to `frontend/tests/StickyAudioBar.test.ts`.
  - Delete the old test file AFTER migrating its assertions. This is NOT "deleting a test to make it pass" — it's a clean cutover where the behavior is preserved in the new component's tests.
  - If an assertion cannot be meaningfully migrated (e.g., panel-specific layout tests), document the reason and delete it.

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/AudioPlayerPanel.test.ts` (for migration source) and `frontend/tests/StickyAudioBar.test.ts` (for migration target, from Prompt 8).

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), the migrated test content, and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the test migration, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 14 — ISSUE-011: Verify All 11 Customer Journeys

```
Implement ISSUE-011: Verify All 11 Existing Customer Journeys on /.

This is a verification task — use the qa skill, NOT the tdd skill. No new behavior is being implemented.

CONTEXT:
- Acceptance criteria: AC-1 (all 11 existing customer journeys on / verified end-to-end: (1) text input + voice + generate -> audio in sticky bar, (2) playback controls play/pause/seek/speed/volume, (3) speed slider during playback, (4) voice change + re-generate, (5) text validation errors, (6) health status loading/ready/error, (7) panel toggle control-deck/canvas on desktop, (8) mobile stacked layout with draggable divider, (9) toast notifications, (10) scroll reveal animations, (11) keyboard shortcuts Ctrl/Cmd+Enter), AC-2 (no layout regression from navbar — panels at calc(100vh - 60px), no content hidden, no overlap), AC-3 (no regression from StickyAudioBar — synthesis works end-to-end, all playback controls functional, bar slides up/hides correctly, no visual overlap between navbar and sticky bar), AC-4 (all existing tests pass — pnpm test + component tests, no existing tests modified/weakened/deleted).
- WORKFLOW: WORKFLOW-multi-page-spa-routing.md Prerequisites R-13 (all 11 existing customer journeys on / remain functional).
- ADR: ADR-001 (Assumption A10: all 11 existing customer journeys on / remain functional after layout changes), ADR-002 (D2: TTS Studio stays at / — existing user journeys preserved).
- Dependencies: ISSUE-003 (TTS Studio layout adapted), ISSUE-010 (StickyAudioBar migration complete).
- Files: `frontend/tests/integration/journeys.test.ts` (new — integration smoke tests).

LIMITS: See NON-TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/index.test.ts` (existing TTS Studio tests) and `frontend/tests/AudioPlayerPanel.test.ts` (if not yet deleted) for journey patterns.

DONE WHEN:
  1. ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests).
  2. Show me the new integration test file with all 11 journey tests.
  3. Show me screenshots of each journey's key interaction point (at minimum: synthesis workflow, playback controls, mobile layout).
  4. Show the final diff.
  No red/green phase — verification is confirmed by existing tests passing + new integration tests passing.

HUMAN ROLE: I review the journey test coverage and screenshots, confirm no regression, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 15a — ISSUE-012 Part A: Happy Path Navigation

```
Implement ISSUE-012 Part A: Test Cross-Page Navigation — Happy Paths using the tdd skill.

This is the first half of ISSUE-012. Part B (error paths) follows.

CONTEXT:
- Acceptance criteria (happy paths only):
  AC-1: Dashboard: click "Dashboard" in GlobalNavbar from /, /dashboard renders, GlobalNavbar highlights "Dashboard", health poll starts (non-blocking).
  AC-2: Lesson: click "My Courses" -> select level -> select lesson, /dashboard/level/a1/1 renders, GlobalNavbar highlights "My Courses".
  AC-3: Browser back/forward: back from /dashboard to /, TTS Studio remounts, health poll restarts, GlobalNavbar highlights "Home".
  AC-7: Direct URL: type /dashboard/level/a1/1, page renders, health poll starts.
  AC-15: Active synthesis — no navigation: isGenerating=false, no cleanup dialog, direct navigation works.
- WORKFLOW: WORKFLOW-multi-page-spa-routing.md (Full workflow: Steps 1-5, happy paths).
- ADR: ADR-002 (complete multi-page routing structure D2/D3/D4, RC-1 through RC-5).
- Dependencies: ALL previous issues (001-011).
- Files: `frontend/tests/integration/cross-page-navigation.test.ts` (new).

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/integration/journeys.test.ts` (from Prompt 14) and `frontend/tests/index.test.ts` for navigation test patterns.

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Prompt 15b — ISSUE-012 Part B: Error & Edge Case Navigation

```
Implement ISSUE-012 Part B: Test Cross-Page Navigation — Error & Edge Cases using the tdd skill.

This is the second half of ISSUE-012. Requires Part A to be complete.

CONTEXT:
- Acceptance criteria (error/edge cases):
  AC-4: In-flight synthesis — "Clean & Leave": navigate from / while isGenerating=true, cleanup dialog, audioModule.dispose(), POST /api/cleanup succeeds, navigation proceeds.
  AC-5: In-flight synthesis — "Stay": navigate from / while isGenerating=true, "Stay" clicked, navigation cancelled, TTS Studio remains active.
  AC-6: Backend unavailable during cleanup: 503 response, toast: "Backend unavailable — orphan files will be cleaned by scheduled job.", navigation proceeds.
  AC-8: Health poll failure on dashboard: backend loading (120s), dashboard renders (non-blocking), health shows "loading".
  AC-9: Voice load failure on dashboard: /api/voices returns 500, page renders with no voice selector (dashboard doesn't use voices), no crash.
  AC-10: Route not found (404): navigate to /nonexistent, 404 page rendered, GlobalNavbar does NOT render on 404.
  AC-11: Composable error during mount: throws caught, page skeleton with error boundary, toast shown, page still accessible.
  AC-13: Multiple rapid navigations: click "Dashboard" -> immediately click "Home", second navigation aborts first, only last completes.
  AC-14: In-flight synthesis — cleanup network error: orphan files may remain, toast: "Cleanup failed — files will be cleaned by 24h TTL.", navigation proceeds.
- WORKFLOW: WORKFLOW-multi-page-spa-routing.md (Full workflow: Steps 1-5, Abort_Cleanup, error paths).
- ADR: ADR-002 (complete multi-page routing structure D2/D3/D4, RC-1 through RC-5).
- Dependencies: Prompt 15a (happy path tests exist), ALL previous issues (001-011).
- Files: `frontend/tests/integration/cross-page-navigation.test.ts` (extended from Part A), `frontend/tests/mocks.ts` (updated if needed).

LIMITS: See TDD LIMITS above.

EXAMPLE: Match the structure of `frontend/tests/integration/cross-page-navigation.test.ts` (from Part A) and `frontend/tests/useTtsApi.test.ts` for error mocking patterns.

NOTE on AC-12 (SSR hydration mismatch): This is an environmental condition that cannot be reliably triggered in unit tests. Document it as a known acceptable behavior in the test file with a comment, but do NOT write a test for it.

DONE WHEN: ./run-tests.sh passes (backend tests, lint, typecheck, frontend tests) AND you show me, in order: the failing test output (red), the passing output (green), and the final diff.

HUMAN ROLE: I verify the red failed for the right reason, review the diff, and approve the commit. Nothing merges on your word alone.
```

---

## Parallel Execution Map

| Step | Prompts to Run | Shared Files? | Notes |
|------|---------------|---------------|-------|
| 1 | 001, 007, 009 | No — different files | 001 creates GlobalNavbar, 007 updates config, 009 creates StickyAudioBar |
| 2 | 002, 004, 013 | No — 002 modifies app.vue, 004 creates dashboard.vue, 013 modifies useHealthPoll | 013 MUST complete before step 3 (health poll singleton needed for 003's verification) |
| 3 | 003, 005 | No — 003 modifies index.vue, 005 creates level index | 003 depends on 013 (from step 2) for health poll stability |
| 4 | 006, 008 | No — 006 creates lesson page, 008 modifies index.vue (cleanup guard) | 006 creates new file, 008 modifies existing index.vue |
| 5 | 014 | Depends on 007 (UnoCSS tokens), 001 (GlobalNavbar), 013 (health poll) | Visual migration, no TDD |
| 6 | 015 | Depends on 014 (tokens migrated) | CSS rebrand, no TDD |
| 7 | 010 | Depends on 009 (StickyAudioBar exists), 003 (layout adapted) | Retires AudioPlayerPanel, migrates tests |
| 8 | 011 | Depends on 003 (layout), 010 (StickyAudioBar migrated) | QA verification, no TDD |
| 9 | 012a | Depends on ALL (001-011) | Happy path navigation tests |
| 10 | 012b | Depends on 012a + ALL (001-011) | Error/edge case navigation tests |

**Sequential fallback:** If you prefer linear execution, run prompts 0 through 15b in order. The parallel map is an optimization, not a requirement.

---

## Critical Reminders (from AGENTS.md)

- **TDD mandate:** Write failing test FIRST. Fresh context. Then implement. (Applies only to TDD prompts.)
- **Test integrity:** Never modify, weaken, or delete existing tests. Exception: test migration during component retirement (Prompt 13).
- **Test location:** Only `frontend/tests/` (never in source dirs).
- **No drive-by refactors:** Touch ONLY files relevant to the current issue.
- **No new dependencies** without explicit approval.
- **Run `./run-tests.sh`** before reporting completion.
- **Clean cutover:** Migrate every caller; remove obsolete code, no aliases/stubs.
- **Commit atomic, conventional format:** `feat:`, `fix:`, `test:`, `refactor:`.

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-08-05 | Fixed: Prompt 4 no longer demands red-green for config change. Fixed: Prompts 11, 12 use visual verification instead of TDD. Fixed: Prompt 14 uses QA skill instead of TDD. Fixed: Prompt 15 split into 15a/15b (happy paths + error paths). Fixed: Parallel map step 3 no longer runs 013 with 003 (013 moved to step 2). Added: Shared Limits Template to reduce repetition. Added: Specific EXAMPLE references to existing test files. Added: Test migration guidance for Prompt 13. Added: Change log. |