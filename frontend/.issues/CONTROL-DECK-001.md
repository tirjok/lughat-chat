# Issue: Control deck side panel looks broken on desktop

## What happened

On desktop, the left control deck panel (Voice Model selector + Speech Speed slider + Generate Speech button) looks visually broken and unpolished:

- The **Speech Speed** section has a faded/muted label and a flat gray track with a glowing teal thumb — it looks disconnected and half-broken, as if the control is disabled but isn't.
- The **Voice Model** dropdown has an oversized teal glowing icon that dominates the control, making the panel feel unbalanced.
- There is **too much whitespace** — large padding (`p-5`) and gaps (`gap-5`) leave the narrow left panel feeling sparse and empty.
- The **Generate Speech** button, when disabled, renders as a dark button with 40% opacity on a light background — it looks dead and jarring rather than gracefully disabled.
- Overall, the controls feel visually disconnected from each other and the panel lacks visual hierarchy.

## What I expected

A compact, visually cohesive control deck where:

- The Voice Model selector and Speech Speed slider feel like a unified control group, not two disconnected widgets.
- The Speech Speed label has proper contrast and the slider track is visually connected to the label.
- The disabled Generate Speech button has a graceful disabled style (not a dark button at 40% opacity).
- The panel feels dense enough to be useful but not cramped — appropriate for a narrow side panel.

## Steps to reproduce

1. Open Lughat Chat on desktop (viewport width ≥ 1024px, where `lg:w-[30%]` applies — panel is ~432px wide).
2. Ensure the TTS model is loaded (status = 'Ready').
3. Observe the left panel (control deck) showing:
   - The "Lughat Chat" header with "Premium Audio Studio" badge and "Ready" status pill.
   - The Voice Model dropdown showing the selected voice (e.g., "KSA Hamed - Male").
   - The Speech Speed slider below it.
   - The Generate Speech button at the bottom (disabled if no text is entered).
4. Note the visual problems described below.

## Additional context

The same controls render more compactly in the mobile layout (`MobileSplitScreen.vue`), where they use `p-3` and `gap-4`. The desktop version uses `p-5` and `gap-5` which are too generous for a narrow side panel (~25–35% of viewport width).

### Files to inspect

- `frontend/app/components/DesktopPanels.vue` — the desktop layout container (control deck section, lines 64–131)
  - Header: `p-6` (line 89)
  - Controls container: `p-5`, `gap-5` (lines 109–110)
  - Button container: `p-5`, `bg-stone-50` (line 124)
  - Panel width: `md:w-[35%] lg:w-[30%] xl:w-[25%]` (line 69)
- `frontend/app/components/VoiceSelector.vue` — voice dropdown (template lines 86–216)
  - Icon: `text-xl` + `filter: drop-shadow(0 0 6px rgba(20,184,166,0.5))` (lines 115–120)
  - Label: `text-stone-700 dark:text-gray-300` (line 90)
- `frontend/app/components/SpeedSlider.vue` — speed slider (template lines 45–73, styles lines 75–125)
  - Label: `text-gray-300` — **light gray text on a white panel** = poor contrast (line 48)
  - Track: `background: #d6d3d1` — warm light gray nearly invisible on white (line 95)
  - Thumb: `background: #14b8a6` + `box-shadow: 0 0 10px rgba(20, 184, 166, 0.8)` — teal glow (lines 77–85)
- `frontend/app/components/GenerateButton.vue` — generate button (template lines 16–61, styles lines 63–163)
  - Disabled state: `opacity: 0.4` on `background: #1A1A1A` (lines 68, 96–98)
  - Container: `bg-stone-50` — light background contrasts with dark button (line 124 in DesktopPanels)

### Specific visual problems from screenshot (with code trace)

1. **Speech Speed label is light gray on white** — `text-gray-300` renders as `#d1d5db` on a `bg-white` panel. The label is barely readable and visually disconnected from the rest of the UI.

2. **Slider track is nearly invisible** — `#d6d3d1` (warm light gray) on a white panel has insufficient contrast. The teal glowing thumb (`#14b8a6` with 10px box-shadow) sits on it, looking like it belongs to a different control.

3. **Voice selector icon dominates** — The `ph-waves` icon is `text-xl` with a 6px drop-shadow glow (`rgba(20,184,166,0.5)`). In a narrow panel, this icon takes up disproportionate visual weight compared to the text.

4. **Disabled generate button** — `opacity: 0.4` on a `#1A1A1A` dark button against `bg-stone-50` looks like a broken element. The dark button at 40% opacity is neither clearly active nor clearly disabled — it's just dead.

5. **Panel feels empty** — The control deck is 25–35% of viewport width (~360–432px on typical screens). With `p-5` (20px padding each side) and `gap-5` (20px between controls), the actual content area is ~320–392px for two controls. This leaves too much dead space, making the panel feel sparse.
