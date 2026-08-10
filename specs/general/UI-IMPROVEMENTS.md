# UI/UX Improvements — LughatChat Index Page

## Summary

Review of the LughatChat Arabic TTS main page (desktop + mobile) conducted on 2026-08-09. The interface is visually polished with a premium dark-theme aesthetic, strong RTL Arabic support, and a well-structured two-panel desktop layout with a split-screen mobile layout. However, the review identified several critical accessibility gaps, usability frictions in the mobile experience, and structural inconsistencies that undermine the premium feel.

---

## Critical Issues

### Issue 1: `dir="ltr"` on Root Element Contradicts Arabic-First Content

**Current State**: The root wrapper on `index.vue` line 183 sets `dir="ltr"` explicitly:
```html
<div ... dir="ltr">
```

**Problem**: The textarea content is Arabic (RTL), the placeholder is Arabic, and the application's entire purpose is Arabic text-to-speech. Forcing `dir="ltr"` on the root while individual textareas use `dir="rtl"` creates a layout paradox: flexbox ordering, text alignment, and icon placement all follow LTR conventions, fighting against the RTL nature of the content. This causes visual confusion — icons like "Generate Speech" with an arrow pointing up-right (`ph-arrow-up-right`) point in the wrong direction for Arabic readers.

**Recommendation**: Set `dir="rtl"` on the root wrapper. Swap `flex-row` to `flex-row-reverse` (or rely on RTL flexbox mirroring) on desktop. Move the control deck (currently `order-2` on mobile, `order-1` on desktop) to follow RTL reading flow: control deck on the right, canvas on the left. This is the single most impactful RTL fix for the interface.

**Impact**: Corrects all layout mirroring for Arabic readers. Icons, navigation, and panel ordering align with Arabic reading direction.

**Implementation Notes**: Requires flipping panel order, swapping `flex-row` → `flex-row-reverse` (or relying on CSS logical properties), and reversing the "arrow-up-right" icon to "arrow-up-left" (or using `ph-arrow-up-right` with `dir="rtl"` which should auto-mirror).

---

### Issue 2: Voice Selector Dropdown Uses `title` Instead of `aria-label` on Preview Button

**Current State**: The voice preview button in `VoiceSelector.vue` (line 197) uses `title="Preview Voice"`:
```html
<span class="..." title="Preview Voice" @click.stop="previewVoice(voice)">
  <span class="ph-fill ph-play text-sm" aria-hidden="true" />
</span>
```

**Problem**: The preview button has no visible label, no `aria-label`, and no `role="button"`. Screen readers will only announce "play icon" — users cannot discover this button exists. The `title` attribute is not announced by screen readers. Additionally, `previewVoice()` calls `showToast()` with a message that is not accessible to non-visual users.

**Recommendation**: Add `aria-label="Preview ${voice.name} voice"` to the preview button. Replace `showToast()` with a live region announcement or a proper audio playback with accessible controls. Add `role="button"` explicitly if the element is not a native `<button>`.

**Impact**: Voice preview becomes discoverable and usable by keyboard and screen reader users.

---

### Issue 3: Generate Button Has No Accessible Label When Disabled

**Current State**: The `GenerateButton` component (lines 17-60) renders a `<button :disabled="disabled">` but when disabled, there is no `aria-label` or `title` explaining *why* it is disabled. The button text changes to "Processing Model..." when the model is loading, but when `!isValid` (no text entered), the button is disabled with no explanation.

**Problem**: A disabled button with no accessible label is invisible to screen readers. Users who cannot see the UI cannot know why they cannot generate speech. The validation error is only shown in a toast (which is also not reliably announced).

**Recommendation**: Add conditional `aria-label` to the disabled button: "Generate Speech — text is required" or "Generate Speech — model is not ready". When the model is loading, the text "Processing Model..." is adequate. When no text is entered, the aria-label should explain the validation state.

**Impact**: Disabled state becomes semantically meaningful to assistive technology users.

---

### Issue 4: Mobile Audio Player Lacks Keyboard Focus Management

**Current State**: The mobile audio player (lines 192-294 in `MobileSplitScreen.vue`) renders inline below the control deck when `playerVisible && audioUrl`. The play/pause, download, and close buttons are native `<button>` elements, but there is no focus trap, no visible focus indicator, and no `tabindex` management when the player appears.

**Problem**: When the mobile audio card appears, the user's focus does not move to the new player controls. Keyboard users continue tabbing from where they were (e.g., the textarea). The player is invisible to keyboard navigation until they happen to tab to the right place. No `aria-live` region announces the player's appearance.

**Recommendation**: When `playerVisible` becomes true, programmatically move focus to the play/pause button. Add `aria-live="polite"` to a region that announces "Audio player visible" when the card appears. Ensure the player has a visible focus ring (currently missing — no `focus:ring` classes on any button).

**Impact**: Keyboard and screen reader users can discover and interact with the audio player when it appears.

---

### Issue 5: Sticky Audio Bar on Desktop Missing Keyboard Shortcut Announcements

**Current State**: The `StickyAudioBar` component (lines 78-99) registers keyboard shortcuts (` `, `ArrowLeft`, `ArrowRight`, `Escape`) but these are only active when `shortcutsEnabled` is true. The shortcuts are not documented visually in the bar itself, and pressing them produces no accessible feedback.

**Problem**: Keyboard shortcuts are invisible to users who do not see the UI. The spacebar toggles play/pause, arrow keys seek — but there is no accessible announcement when these shortcuts fire. The bar also has no visible help text listing available shortcuts.

**Recommendation**: Add an `aria-live="assertive"` region that announces the action when a shortcut fires (e.g., "Paused", "Seeked forward 5 seconds", "Audio player closed"). Display a keyboard shortcut help indicator (e.g., "?" icon) that opens a tooltip/list of available shortcuts.

**Impact**: Keyboard power users get feedback; screen reader users are informed of shortcut actions.

---

## High Priority Improvements

### Issue 6: Toast Notifications Are Not Announced to Screen Readers

**Current State**: Toast notifications (`ToastNotification.vue`) use `aria-live="polite"` on the container, but each toast message is rendered inside a `<p class="text-sm text-white">` without `role="status"` or `role="alert"`. The toast appears with a slide-in animation.

**Problem**: Toast messages for errors (e.g., "Invalid text", "An unexpected error occurred") are critical user feedback but may not be reliably announced. The `aria-live="polite"` on the container is good, but individual toasts need `role="alert"` for errors and `role="status"` for info to ensure proper screen reader behavior.

**Recommendation**: Add `role="alert"` to error toasts and `role="status"` to info/success toasts. Ensure the toast container has `aria-atomic="true"` so screen readers announce the full message.

**Impact**: Error and success feedback is reliably communicated to assistive technology users.

---

### Issue 7: Character Counter Lacks Accessible State Communication

**Current State**: The character count (`{{ charCount }} / 3000`) is displayed as plain text with color coding (red when over limit, amber when near limit). There is no `aria-live` region or `aria-describedby` linking the textarea to the counter.

**Problem**: Screen reader users are not informed when they approach or exceed the 3000-character limit. The color change is purely visual. When the text exceeds 3000 characters, the synthesis is silently blocked (the button is disabled), but no accessible warning is provided.

**Recommendation**: Add `aria-describedby="char-count"` to the textarea. Give the character counter `id="char-count"` and `role="status"`. When the character count exceeds 3000, use `aria-live="assertive"` to announce "Text exceeds maximum of 3000 characters."

**Impact**: Users who cannot see color changes are informed about character limit status.

---

### Issue 8: Double-Bezel Pattern Creates Cognitive Overload

**Current State**: Nearly every interactive element uses a "Double-Bezel" pattern: an outer shell (`rounded-[0.875rem] ring-1 ring-stone-300 ... p-0.5 bg-stone-100`) wrapping an inner core (`rounded-[calc(0.75rem-0.125rem)] bg-white ...`). This pattern appears on: GenerateButton, SpeedSlider, VoiceSelector, Clear button, AI Tools toolbar, shortcut hint, audio player, and StickyAudioBar.

**Problem**: The double-bezel pattern adds visual noise and cognitive overhead without functional benefit. It creates a "nested container" mental model that is confusing — users perceive two layers of interaction when there is only one. The pattern is inconsistent: some elements use it, others don't. It also increases DOM depth unnecessarily, impacting render performance.

**Recommendation**: Standardize on a single border/ring pattern. Choose either (a) a single ring with appropriate padding, or (b) the double-bezel for *primary* actions only (Generate button, Play button) and remove it from secondary elements (clear button, toolbar buttons, shortcut hint). Document the decision in the design system.

**Impact**: Reduces visual clutter, improves scan time, and creates a clearer visual hierarchy between primary and secondary actions.

---

### Issue 9: AI Smart Tools Toolbar Buttons Are Non-Functional Placeholders

**Current State**: The AI Smart Tools toolbar (lines 199-230 in `DesktopPanels.vue`) contains three buttons: "Translate", "Add Diacritics", and "Continue Script". Each has an emoji (`✨`) and a description in the `title` attribute. None of these buttons have any `@click` handler — they are dead UI.

**Problem**: These buttons create user expectations that cannot be fulfilled. Users will click them expecting functionality. The sparkle emoji (`✨`) implies AI magic that does not exist. This is a "fake feature" — it damages trust when users discover the buttons do nothing.

**Recommendation**: Either implement the functionality (translation via API, diacritics via NLP library, script continuation via LLM API) or remove the buttons entirely. If the features are planned but not ready, replace them with a disabled state and a tooltip: "Coming soon" rather than implying functionality.

**Impact**: Restores user trust. Prevents frustration from clicking non-functional controls.

---

### Issue 10: Focus Halo Canvas Has Broken Logic

**Current State**: The `FocusHaloCanvas` component (`FocusHaloCanvas.vue`, lines 20-28) attempts to find the textarea using `document.activeElement` and `document.querySelector('textarea[dir="rtl"]')`. However, `haloRef` is a `<div>` with `position: absolute; bottom: 0;` — it is positioned at the bottom of its container, not behind the textarea.

**Problem**: The halo is visually positioned at the bottom of the canvas area, not behind the textarea. When the user focuses the textarea (which may be anywhere vertically in the scrollable area), the glow appears at the wrong location. The component also does not update when the textarea scrolls — the halo stays fixed while the textarea moves.

**Recommendation**: Either (a) position the halo absolutely behind the textarea element itself (not at the bottom of the container), or (b) remove the halo entirely as it provides no functional value and is visually confusing. If keeping the halo, bind its position to the textarea's scroll position.

**Impact**: Eliminates a visual element that does not match user expectation, reducing confusion.

---

## Medium Priority Enhancements

### Issue 11: Mobile Header Pill Floats Without Clear Purpose

**Current State**: On mobile, the header (`MobileSplitScreen.vue` lines 65-78) renders as a floating glass pill detached from edges with `mx-[max(0.75rem,...)] mt-[max(0.625rem,...)] rounded-full backdrop-blur-xl`.

**Problem**: This floating pill takes up valuable screen real estate on an already small mobile canvas. It sits between the safe area and the canvas content, creating a visual gap that serves no function. The logo + status indicator could be integrated into the canvas header area without a floating container.

**Recommendation**: On mobile, make the header flush with the top edge (respecting safe-area insets only). Remove the floating pill styling — it adds no value and consumes ~48px of vertical space that would otherwise extend the canvas.

**Impact**: Gains ~48px of vertical canvas space on mobile devices.

---

### Issue 12: Drag Divider Has Minimal Visual Feedback

**Current State**: The mobile drag divider (lines 141-153 in `MobileSplitScreen.vue`) is a 16px-tall area with a single 1px line (`w-full h-px bg-stone-300 dark:bg-white/[0.06]`).

**Problem**: The divider is nearly invisible, especially in dark mode where `bg-white/[0.06]` is barely perceptible. Users may not discover that they can resize the panels. There is no hover state, no cursor change, and no touch feedback.

**Recommendation**: Make the divider more visible with a 2px line, add a subtle handle (two or three dots centered), and add `cursor: row-resize` / `cursor: grab`. On touch, show a subtle highlight. This is a discoverable interaction pattern.

**Impact**: Increases discoverability of the resizeable panel feature on mobile.

---

### Issue 13: Speed Slider Thumb Track Positioning (RESOLVED)

**Current State**: The `SpeedSlider` (lines 46-72 in `SpeedSlider.vue`) previously used a native `<input type="range">` with a JavaScript-driven `linear-gradient` background. The gradient filled the entire input width, causing the filled color to extend past the native thumb — making the thumb visually appear off-center.

**Resolution**: The component was rewritten to use a `<div>`-based track + fill + thumb (matching the `StickyAudioBar` progress bar pattern). The track is a `<div role="slider">` with three children: a background track div, a fill div whose `width` equals the percentage position, and an absolutely-positioned thumb div whose `left` is `calc(percentage% - 8px)` (half the 16px thumb width). This ensures the thumb center aligns exactly with the filled track edge.

**Impact**: Thumb is now visually centered on the track fill at all values (0.5x → 2.0x). Interaction supports click on track and keyboard arrow keys (ArrowLeft/ArrowRight). Full ARIA attributes (`role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`) for accessibility.
---

### Issue 14: Voice Selector Preview Uses Toast Instead of Audio

**Current State**: The `previewVoice()` function (line 50) calls `showToast()` with the message `"Playing 1-second preview of ${voice.name}..."` — but it does NOT actually play audio. It is a no-op that only shows a toast message.

**Problem**: Users clicking the preview button expect to hear the voice. Getting only a toast message is misleading and breaks the mental model of a voice selector. This is functionally equivalent to Issue 9 (non-functional UI).

**Recommendation**: Implement actual audio preview by fetching a short audio sample for each voice, or remove the preview button entirely. If the backend supports voice preview, wire it up. If not, remove the button and the "Preview Voice" tooltip.

**Impact**: Removes broken interaction; if implemented, provides a valuable voice comparison feature.

---

### Issue 15: Model Status Indicator Uses Pulsing Animation Inappropriately

**Current State**: The `ModelStatusIndicator` (lines 26-47) applies `animate-pulse` to the status dot even in the "Ready" state:
```html
<span class="... bg-green-500 animate-pulse">
```

**Problem**: A pulsing green dot implies "something is happening" — the opposite of "ready." The pulse animation should only appear during loading. In the ready state, a steady green dot communicates stability. The pulsing ready state creates subtle visual noise and may confuse users about the actual system state.

**Recommendation**: Remove `animate-pulse` from the ready state. Keep the pulse only on the loading state (orange dot). The ready state should be a steady, non-animated green dot.

**Impact**: Reduces visual noise and makes the loading state more distinguishable.

---

### Issue 16: Shortcut Hint Is Visually Buried and Non-Discoverable

**Current State**: The keyboard shortcut hint ("Press Ctrl + Enter to generate") is positioned at `absolute bottom-6 right-8` (line 269 in `DesktopPanels.vue`) and hidden on mobile (`hidden md:flex`). It uses the double-bezel pattern and has low contrast (`text-stone-600 dark:text-gray-600`).

**Problem**: This hint is easy to miss — it's small, low-contrast, and positioned in a corner that users rarely look at during text entry. On mobile, it is completely hidden, yet the same shortcut (`Ctrl/Cmd + Enter`) works on mobile too.

**Recommendation**: Move the hint to a more visible location: either inline next to the Generate button text, or as a small label below the textarea. On mobile, replace the keyboard shortcut hint with a tap-to-generate instruction ("Tap Generate to synthesize"). Consider making it dismissible.

**Impact**: Increases shortcut discoverability for new users.

---

## Low Priority Suggestions

### Issue 17: Placeholder Text Could Be More Helpful

**Current State**: The textarea placeholder is `"اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"` (Write text here... Example: Peace be upon you...).

**Problem**: While the Arabic example is culturally appropriate, it doesn't help users understand what *type* of text works best. A short example sentence is good, but adding a hint about supported content (e.g., "Supports Arabic text, numbers, and basic punctuation") would help non-native Arabic speakers.

**Recommendation**: Consider a two-line placeholder: the Arabic example on line 1, and a smaller hint on line 2. Or add a small helper text below the textarea: "Supports Arabic text, numbers, and basic punctuation."

**Impact**: Reduces onboarding friction for non-native Arabic speakers.

---

### Issue 18: No Loading State for Voice List

**Current State**: Voices are loaded via `useVoices()` and immediately rendered. If voice discovery takes time (e.g., scanning `speaker_wavs/`), the dropdown may briefly show "Select a voice" before populating.

**Problem**: A brief "Select a voice" state may confuse users who expect a voice to be pre-selected. The auto-selection logic (lines 55-59 in `index.vue`) handles this, but there is no visual loading indicator during voice discovery.

**Recommendation**: Show a loading skeleton in the voice selector dropdown while voices are being discovered. This is a minor polish item.

**Impact**: Smoother perceived loading experience.

---

### Issue 19: Generate Button Trailing Icon Uses Gold-to-Primary Gradient That Clashes

**Current State**: The Generate button's trailing icon (lines 35-39) transitions from gold (`text-gold-500`) to primary (`text-primary-500`) on hover. The icon is `ph-play-circle` wrapped in a gold background circle.

**Problem**: The gold-to-primary color transition on the icon creates a color shift that doesn't match the button's overall gradient (which goes from gold to primary). The icon itself should remain gold throughout, with only the background gradient changing on hover.

**Recommendation**: Keep the icon color constant (gold) and only animate the background gradient. This maintains visual consistency.

**Impact**: Subtle polish — reduces visual noise on interaction.

---

### Issue 20: No Error Recovery Path After Model Error State

**Current State**: When `modelStatus === 'error'`, the Generate button is disabled. The error state is communicated via a red dot in the status indicator, but there is no "Retry" or "Reload" button visible to users.

**Problem**: If the model fails to load (network issue, server crash), users have no visible way to recover. They must refresh the entire page. The status indicator shows "Error" but provides no action.

**Recommendation**: Add a "Retry" button next to the status indicator when `modelStatus === 'error'`. This button should trigger a manual health check retry. Document this as a micro-interaction in the design system.

**Impact**: Gives users a recovery path without page reload.

---

## Positive Observations

1. **Dark theme is well-executed**: The "Sunrise Surge" color system (teal primary, gold accent, stone neutrals) is cohesive and the dark mode variants are carefully tuned.

2. **RTL textarea is correct**: The textarea uses `dir="rtl"` appropriately, and the Arabic font (Noto Sans Arabic + Cairo) is embedded offline — no CDN dependency.

3. **Two-panel desktop layout is logical**: Control deck (left) + Canvas (right) follows standard TTS tool conventions. The panel toggle (`usePanelToggle`) provides accessibility for switching focus.

4. **Mobile split-screen with drag divider is innovative**: The resizable panel approach is a smart use of limited mobile screen real estate.

5. **Sticky audio bar on desktop is well-designed**: Three-section layout (controls | waveform/time | playback controls) with keyboard shortcuts (` `, `←/→`, `Esc`) is a power-user feature well-implemented.

6. **Model health polling is proactive**: The `useHealthPoll` composable proactively checks the TTS model status, preventing user frustration from submitting to an unavailable model.

7. **Cleanup dialog (R-7) is a good safety net**: Preventing navigation away during in-flight synthesis with a "Clean & Leave" / "Stay" choice is excellent UX for a stateful audio application.

8. **Focus halo is an ambitious visual touch**: While currently broken (see Issue 10), the concept of a radial glow behind the focused textarea is a nice premium detail worth fixing rather than discarding.

9. **Consistent use of Phosphor icons**: Icon naming and usage is consistent across all components.

10. **Reduced motion support**: `main.css` includes `@media (prefers-reduced-motion: reduce)` that disables animations for users who need it — a critical accessibility feature.

---

## Priority Matrix

| Priority | Issues | Estimated Effort |
|----------|--------|------------------|
| Critical | 1, 2, 3, 4, 5 | Medium (RTL flip is largest) |
| High | 6, 7, 8, 9, 10 | Medium-High |
| Medium | 11, 12, 13, 14, 15, 16 | Low-Medium |
| Low | 17, 18, 19, 20 | Low |

---

## Recommended Implementation Order

1. **RTL flip** (Issue 1) — foundational, affects everything
2. **Voice selector accessibility** (Issue 2) — small fix, high value
3. **Generate button accessible labels** (Issue 3) — prevents silent failures
4. **Mobile player focus management** (Issue 4) — keyboard accessibility
5. **Sticky bar shortcut announcements** (Issue 5) — power-user feedback
6. **Remove non-functional AI toolbar** (Issue 9) — builds trust
7. **Fix broken Focus Halo** (Issue 10) — polish or remove
8. **Toast accessibility** (Issue 6) — critical feedback channel
9. **Character counter accessibility** (Issue 7) — validation feedback
10. **Standardize double-bezel** (Issue 8) — design system cleanup
11-20. Remaining medium/low priority items
