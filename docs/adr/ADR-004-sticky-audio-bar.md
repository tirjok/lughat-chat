# ADR-004: Sticky Bottom Audio Player Bar

**Status:** Accepted
**Date:** 2026-08-03
**Context:** `docs/requirements/navigation-dashboard.md` (R-10), `docs/proto/lesson-details.html` (lines 319–369)

---

## Context

LughatChat's current audio playback is handled by **`AudioPlayerPanel.vue`**, a full-panel component embedded within the TTS Studio's two-panel layout. It occupies a significant portion of the screen (roughly 40% of the canvas panel on desktop, full width on mobile) and is only visible after a successful synthesis. Its interface includes: play/pause, seek, speed control, download, and volume.

The multi-page platform introduces new contexts for audio playback:

- **Lesson pages** (`/level/{level}/{lesson_id}`): Audio is tied to individual dialogue lines, vocabulary words, and expressions. Users tap any line to hear it — playback is contextual, not post-synthesis.
- **Dashboard** (`/dashboard`): May surface "Continue Learning" with an audio preview of the last lesson.
- **TTS Studio** (`/`): The existing synthesis workflow still produces audio, but the full `AudioPlayerPanel` is visually excessive when a shared navbar now occupies the top 60px of the viewport.

The prototype establishes a **fixed-bottom sticky audio bar** (`StickyAudioBar`) that slides up when active, containing: prev/next line, play/pause, current line text (RTL, with wave animation), progress bar, speed toggle (0.75x/1x/1.25x), repeat, and close.

The decision point is whether to **replace** `AudioPlayerPanel` with `StickyAudioBar` across all pages, or to **keep both** (AudioPlayerPanel for TTS Studio, StickyAudioBar for lesson/dashboard pages).

## Decision

The application introduces a **new component** (`app/components/StickyAudioBar.vue`) as a **fixed-bottom, slide-up audio player** that **replaces** `AudioPlayerPanel` on all pages (TTS Studio, Dashboard, and Lesson pages).

### Component Specification (from prototype)

- **Position:** `fixed bottom-0 left-0 right-0 z-50` — sits above all page content.
- **Behavior:** Hidden by default (`translate-y-full`), slides up (`translate-y-0`) when active audio is available.
- **Height:** Auto-sized content (~60–72px), adding to the navbar's 60px, meaning all pages must account for ~120px of top-fixed chrome.
- **Controls (left):** Previous line, play/pause (primary-600 rounded-full, 44px touch target), next line.
- **Controls (center):** Current line Arabic text (RTL, `font-arabic text-lg`), wave animation during playback, progress bar, time display.
- **Controls (right):** Speed toggle (0.75x/1x/1.25x pill), repeat button, close button.
- **Dark mode:** `bg-white` → `bg-stone-800`, `text-stone-800` → `text-stone-200`, `border-stone-200` → `border-stone-700`.

### Integration with Existing Code

- `AudioPlayerPanel.vue` is **retired** — its functionality (play, pause, seek, speed, download) is absorbed into `StickyAudioBar`. The download capability is preserved as a button within the bar.
- The TTS Studio page (`index.vue`) no longer renders `AudioPlayerPanel`. Instead, when synthesis completes, `StickyAudioBar` slides up.
- On lesson pages, `StickyAudioBar` slides up when any line/word/phrase is tapped for audio.
- On the dashboard, `StickyAudioBar` slides up when "Continue Learning" triggers a preview audio.

### Routing Context

The sticky bar is aware of its routing context:
- On `/` (TTS Studio): Shows synthesized audio file path, download button visible.
- On `/level/{level}/{lesson_id}`: Shows lesson line context (Arabic text, line number), prev/next line buttons enabled, download hidden.
- On `/dashboard`: Shows preview context, limited controls.

## Consequences

### What becomes easier

- **Consistent audio experience across pages** — Users interact with audio the same way regardless of which page they are on. The sticky bar is always accessible at the bottom, never hidden behind a panel toggle.
- **Space efficiency on desktop** — The existing `AudioPlayerPanel` occupies ~40% of the canvas. The sticky bar occupies ~60px fixed height, freeing ~300+ pixels of vertical space on desktop. This partially offsets the 60px navbar tax from ADR-001.
- **Context-aware controls** — The bar adapts its controls to the page context (download on TTS Studio, prev/next on lessons, preview on dashboard). This is impossible with a single shared panel that must serve all contexts.
- **Mobile-first design** — The sticky bar is inherently mobile-friendly: fixed bottom, large touch targets (44px minimum per WCAG), no panel resizing needed. This simplifies the mobile layout that ADR-001 made more complex.

### What becomes harder

- **Vertical space is still constrained** — The navbar (60px) + sticky bar (60–72px) = 120–132px of fixed chrome. On desktop, the TTS Studio panels have `calc(100vh - 60px)` but must now also account for the sticky bar when visible. On mobile, the navbar may grow to `h-16` (64px), and the sticky bar adds another ~72px, leaving `calc(100vh - 136px - safe-area-insets)` for actual content. This is a **permanent reduction** in usable viewport, especially on phones with screens < 600px tall.
- **Z-index and stacking complexity** — The sticky bar sits at `z-50`, above all page content. This means any modal, dropdown, or floating element on the page must use a higher z-index to appear above the audio bar, or accept that the audio bar will obscure them. This creates a **z-index hierarchy** that all new components must respect.
- **AudioPlayerPanel retirement is a breaking change** — Any existing tests, composables, or documentation referencing `AudioPlayerPanel` must be updated. The component's API (play, pause, seek, download, volume) must be preserved in the new component's interface, or callers must be migrated. This is a **migration cost** across the test suite and any external consumers.
- **State management complexity** — The sticky bar must coordinate with the existing `useAudioModule` composable (which currently feeds `AudioPlayerPanel`). The composable's API may need extension to support per-line audio context (lesson pages) alongside full-synthesis context (TTS Studio). This introduces a **coupling** between the sticky bar and page-level state that didn't exist before.
- **Keyboard shortcut conflicts** — The existing Ctrl/Cmd+Enter keyboard shortcut triggers synthesis on the TTS Studio page. The sticky bar introduces new keyboard interactions (prev/next line, speed toggle, repeat). These must not conflict with existing shortcuts or the synthesis shortcut. This adds **input handling complexity** to an already keyboard-rich interface.
