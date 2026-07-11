# WORKFLOW: Playground (TTS Studio) Access
**Version**: 0.1
**Date**: 2026-07-10
**Author**: Workflow Architect
**Status**: Draft
**Implements**: PRD — "As a learner, I want a Playground page where I can freely type Arabic text and hear it spoken — no lessons, no structure — just experimentation"

---

## Executive Summary
User clicks "Playground" in navigation bar → navigates to `/playground` → existing TTS Studio renders (text input, voice selector, speed slider, Generate Speech button, audio player). **Critical gap:** no `/playground` route exists, no navigation bar exists. **Post-ADR-003 update:** Playground now also needs a microphone button for pronunciation recording (ADR-008), adding `useMicrophone` composable + `MicrophoneButton` component integration. The existing TTS Studio code is reused as-is — only routing and page structure change (plus new recording UI).

---

## Overview
The **Playground** is the existing TTS Studio, moved from `/` to `/playground`. It provides free-form text input + audio output with no lessons, no activities, no progress tracking. Users can type Arabic or English text, select a voice and speed, and generate speech. This workflow covers the **Playground page** specifically — how it's accessed, how it integrates with the navigation bar, and how it coexists with the learning pages.

---

## Actors
| Actor | Role in this workflow |
|---|---|
| Learner (Customer) | Accesses the Playground from the navigation bar, types text, generates speech |
| Frontend (Nuxt SPA) | Serves Playground page at `/playground` |
| Nginx (reverse proxy) | Routes `/playground` to SPA, proxies `/api/*` to backend |
| Backend (FastAPI) | Serves TTS synthesis (existing `/api/generate` endpoint) |

---

## Prerequisites
- Playground page exists at `app/pages/playground.vue` (or `app/pages/playground/index.vue`)
- Navigation bar exists (see Dashboard Navigation workflow)
- TTS model is loaded (`/health` returns `status: "ready"`)
- Existing TTS components are available: `useTtsApi`, `useHealthPoll`, `useVoices`, `SpeedSlider`, `AudioPlayerPanel`, `GenerateButton`, `VoiceSelector`, `ToastNotification`

---

## Trigger
**Primary**: User clicks "Playground" link in the navigation bar.
**Secondary**: User navigates directly to `/playground` (bookmarks, shared links).

---

## Workflow Tree

### STEP 1: Playground Page Loads (Frontend)
**Actor**: Frontend (Playground page — `app/pages/playground.vue`)
**Action**: Render the existing TTS Studio interface:
  1. Two-panel layout (desktop): Control Deck (left) + Canvas (right).
  2. Mobile: stacked panels with draggable divider.
  3. Text input area (RTL, Arabic font).
  4. Voice selector + speed slider (Control Deck).
  5. Generate Speech button (Control Deck).
  6. Audio player panel (Canvas — slides up on successful synthesis).
  7. Toast notifications (top-center).

**Timeout**: N/A (synchronous render, < 200ms)
**Input**: `{ }` (no parameters)
**Output on SUCCESS**: Playground fully rendered → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(missing_components)`: One or more TTS components don't exist → Playground renders with degraded UI (missing features).
  - `FAILURE(no_tts_model)`: TTS model is not loaded (`/health` returns `status: "loading"` or `"error"`) → Generate button is disabled, status indicator shows "Loading..." or "Error".

**Observable states during this step**:
  - Customer sees: Playground page loads with text input area, voice selector, speed slider, Generate Speech button (disabled if model is loading), status indicator (top-right).
  - Operator sees: Nginx serves `playground.html`, frontend renders TTS Studio.
  - Database: No changes.
  - Logs: (no logs from frontend render).

---

### STEP 2: User Interacts with Playground (Existing Workflow)
**Actor**: User (Customer)
**Action**: User performs the existing TTS Studio interactions:
  1. Types Arabic or English text in the textarea.
  2. Selects a voice from the voice selector.
  3. Adjusts speech speed with the speed slider.
  4. Clicks "Generate Speech" or presses `Ctrl+Enter`.
  5. Listens to generated audio (play/pause, seek, download).

**Timeout**: N/A (interactive — see Speech Synthesis workflow for API details)
**Input**: `{ text, speaker, speed }` (user inputs)
**Output on SUCCESS**: Audio plays, waveform animates, audio player slides up → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(model_not_ready)`: TTS model is still loading → Generate button is disabled, status indicator shows "Loading..." → User waits.
  - `FAILURE(synthesis_failed)`: TTS synthesis fails (see Speech Synthesis workflow) → Error toast shown.

**Observable states during this step**:
  - Customer sees: Existing TTS Studio behavior — text input, voice selection, speed adjustment, generate button, audio playback.
  - Operator sees: (nothing — existing behavior).
  - Database: No changes (read-only).
  - Logs: (existing backend logs for synthesis).

---

### STEP 3: User Navigates Away from Playground
**Actor**: User (Customer)
**Action**: User navigates away from the Playground to another page (Dashboard, Lesson View, or another Playground session).
**Timeout**: N/A (client-side navigation, < 100ms)
**Input**: `{ destination: "/ | /lesson/:id" }` (navigation bar click)
**Output on SUCCESS**: Navigate to destination page → GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(navigation_fails)`: Navigation fails (route not configured) → Stay on Playground.

**Observable states during this step**:
  - Customer sees: Playground fades out, destination page loads.
  - Operator sees: (nothing — client-side).
  - Database: No changes.
  - Logs: (no logs from frontend navigation).

---

## Reality Checker Findings
| # | Finding | Severity | Spec section | Resolution |
|---|---|---|---|-------------|
| RC-1 | **Playground page does not exist** — The current `app/pages/index.vue` IS the TTS Studio. There is no `/playground` route. | **Critical** | STEP 1 | The current `index.vue` must be moved to `playground.vue`, and a new Dashboard must be created at `index.vue`. |
| RC-2 | **No navigation bar exists** — Users cannot access the Playground from a navigation bar (there is no navigation bar). | **High** | STEP 1 | A new `NavigationBar` component must be created with a "Playground" link. |
| RC-3 | **The existing TTS Studio code IS the Playground** — No changes to the TTS Studio code are needed; only the routing and page structure change. | Low | STEP 1 | The existing `index.vue` code can be reused as the Playground page (just move it to a new route). |

---

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Playground loads | User navigates to `/playground` | TTS Studio renders (text input, voice selector, speed slider, Generate Speech button) |
| TC-02: Playground loads with model loading | TTS model is still loading | Generate button is disabled, status indicator shows "Loading..." |
| TC-03: User generates speech | User types text, clicks Generate Speech | Audio plays (existing behavior) |
| TC-04: User navigates to Playground from Dashboard | User clicks "Playground" in navigation bar | Navigate to `/playground`, TTS Studio renders |
| TC-05: User navigates away from Playground | User clicks "Roadmap" in navigation bar | Navigate to `/`, Playground unmounts |
| TC-06: Direct navigation to /playground | User types `/playground` in browser | TTS Studio renders |

---

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | The existing TTS Studio code (`index.vue`) can be reused as the Playground page | Current codebase (verified) | Low — confirmed |
| A2 | No changes to the TTS Studio functionality are needed — only routing changes | PRD ("Moved from `/` to `/playground`. All existing components preserved.") | Low — confirmed by PRD |
| A3 | Navigation bar will have a "Playground" link | ADR-009 (PRD) | Low — confirmed by PRD |

---

## Open Questions
- Should the Playground preserve the two-panel layout (Control Deck + Canvas) or use a simpler single-panel layout?
- Should the Playground show any learning-related UI elements (e.g., "Save this text to a lesson" button)?
- Should the Playground integrate with the lesson system (e.g., "Use this text in an activity" button)?
