# ISSUE-014: Migrate Theme Tokens Across 9+ Components (Replace studio-/sunrise-* with primary-/gold-)

**Spec Reference:** `docs/workflows/WORKFLOW-global-navbar-navigation.md` (Step 4 — Theme Token Migration), ADR-003 (Full Theme Rebrand — Color Palette)
**Dependencies:** ISSUE-007 (UnoCSS config updated with `primary` and `gold` palettes), ISSUE-001 (GlobalNavbar uses new tokens), ISSUE-013 (health poll singleton — ensures clean state before migration)
**Scope:** Frontend components (10 files)

---

## Problem

The theme rebrand replaces the old color identity (`studio-*` dark backgrounds, `sunrise-orange` / `sunrise-magenta` accents) with a new teal/gold palette (`primary-*`, `gold-*`). This migration touches **10 component files**, each of which may reference old tokens in templates, styles, or inline expressions.

The spec's Step 4 explicitly states: **"Zero `studio-*` or `sunrise-*` references remain"** — this is the success criterion. A single missed reference produces a visual inconsistency that is hard to debug because the token name no longer exists in the UnoCSS config.

The spec lists 4 failure modes:
- `FAILURE(incomplete_migration)`: One or more components still reference removed tokens → abort, run `grep -rn "studio-\|sunrise-" frontend/app/` to audit
- `FAILURE(color_contrast)`: New colors fail WCAG AA contrast ratio (4.5:1 for text) → abort, adjust token values
- `FAILURE(gradient_mismatch)`: Multi-stop gradient doesn't render in UnoCSS → use CSS custom property or inline style

**No existing issue in `docs/issues/` covers this migration.** The closest coverage is implicit in ISSUE-001 (GlobalNavbar uses new tokens) and ISSUE-011 (verify journeys), but neither performs the required grep audit across all 10 affected components.

---

## Affected Components

| Component | File | Tokens to Migrate |
|-----------|------|-------------------|
| AudioPlayerPanel | `app/components/AudioPlayerPanel.vue` | `studio-900`, `studio-800`, `studio-700`, `sunrise-orange`, `sunrise-magenta` |
| WaveformCanvas | `app/components/WaveformCanvas.vue` | `sunrise-orange → primary-500`, `sunrise-magenta → gold-500`, gradients |
| SpeedSlider | `app/components/SpeedSlider.vue` | `studio-*`, `sunrise-*` |
| GenerateButton | `app/components/GenerateButton.vue` | `sunrise-orange → primary-500`, `sunrise-magenta → gold-500`, gradients |
| VoiceSelector | `app/components/VoiceSelector.vue` | `studio-*`, `sunrise-*` |
| ModelStatusIndicator | `app/components/ModelStatusIndicator.vue` | `studio-*`, `sunrise-*` |
| MobileStatusIndicator | `app/components/MobileStatusIndicator.vue` | `studio-*`, `sunrise-*` |
| ToastNotification | `app/components/ToastNotification.vue` | `studio-*`, `sunrise-*` |
| FocusHaloCanvas | `app/components/FocusHaloCanvas.vue` | `sunrise-orange → primary-500`, `sunrise-magenta → gold-500`, gradients |
| index.vue (TTS Studio) | `app/pages/index.vue` | All `studio-*` and `sunrise-*` references |

**Token mapping** (from spec Step 4):
- `studio-900` (`#121212`) → `stone-900` (dark) / `white` (light)
- `studio-800` → `stone-800` (dark) / `white` (light)
- `studio-700` → `stone-700` (dark) / `stone-200` (light)
- `sunrise-orange` (`#FF512F`) → `primary-500` (`#14b8a6`)
- `sunrise-magenta` (`#DD2476`) → `gold-500` (`#f59e0b`)
- Gradient `#FF512F → #DD2476` → `#14b8a6 → #0f766e` (teal)
- Gradient `#0d9488 → #115e59` (dark teal)

---

## Acceptance Criteria

### AC-1: Zero old token references remain
- Run `grep -rn "studio-\|sunrise-" frontend/app/` — **zero matches** expected (excluding comments that document the migration)
- If any matches found: **abort**, fix the remaining references, re-audit
- The grep audit must be run **after** the migration is complete — it is the pass/fail gate

### AC-2: All new tokens generate correct CSS
- `bg-primary-500` generates `#14b8a6` (teal)
- `bg-primary-600` generates `#0f766e` (dark teal)
- `text-gold-500` generates `#f59e0b`
- `bg-gradient-to-r from-primary-500 to-primary-600` generates correct gradient in UnoCSS output
- All gradient utilities (`from-primary-500 to-primary-600`, `from-primary-500 to-gold-500`) render correctly

### AC-3: Color contrast passes WCAG AA (4.5:1 for text)
- All text on colored backgrounds meets WCAG AA contrast ratio of 4.5:1 minimum
- Primary-500 (`#14b8a6`) on stone-50 (light mode): verify contrast
- Gold-500 (`#f59e0b`) on stone-50 (light mode): verify contrast
- Primary-500 on stone-900 (dark mode): verify contrast
- Gold-500 on stone-900 (dark mode): verify contrast
- If any combination fails: adjust token values or add explicit contrast overrides

### AC-4: No visual regression on existing pages
- TTS Studio (`/`) renders correctly in both light and dark mode
- Dashboard (`/dashboard`) renders correctly in both light and dark mode
- Lesson pages (`/dashboard/level/{level}/{lesson}`) render correctly in both light and dark mode
- All 11 existing customer journeys on `/` remain functional (verified by ISSUE-011)

### AC-5: Gradient rendering works in UnoCSS
- Multi-stop gradients (`from-primary-500 to-primary-600`) render correctly in all affected components
- If UnoCSS `presetWind3` does not support custom color gradients, use CSS custom property or inline style (spec failure path)
- WaveformCanvas gradient, FocusHaloCanvas radial gradient, and any icon/splash assets using old gradients are regenerated or restyled

---

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-04: Happy path — theme migration | Load any page in light mode, toggle dark mode — no `studio-*` or `sunrise-*` references remain, teal/gold palette renders correctly |
| TC-09: Failure — incomplete theme migration | Run `grep -rn "studio-\|sunrise-" frontend/app/` — zero matches expected; if any match found, workflow fails |
| TC-04 (contrast) | Color contrast passes WCAG AA 4.5:1 for text on all page backgrounds |

---

## ADR References

- **ADR-003** (Full Theme Rebrand): Defines the complete color palette replacement (studio-/sunrise-* → primary-/gold-), font replacement, background/shadow redesign
- **ADR-003** Consequences: "10+ component files must be audited and updated — Every component referencing `studio-*`, `sunrise-orange`, or `sunrise-magenta` tokens must be individually reviewed"
- **WORKFLOW-global-navbar-navigation.md** Step 4: "Zero `studio-*` or `sunrise-*` references remain"

---

## Files

Components to audit and migrate (10 files):
- `frontend/app/components/AudioPlayerPanel.vue`
- `frontend/app/components/WaveformCanvas.vue`
- `frontend/app/components/SpeedSlider.vue`
- `frontend/app/components/GenerateButton.vue`
- `frontend/app/components/VoiceSelector.vue`
- `frontend/app/components/ModelStatusIndicator.vue`
- `frontend/app/components/MobileStatusIndicator.vue`
- `frontend/app/components/ToastNotification.vue`
- `frontend/app/components/FocusHaloCanvas.vue`
- `frontend/app/pages/index.vue`

Component test: `frontend/tests/ThemeMigration.test.ts` (new — grep audit script, contrast ratio checks)
