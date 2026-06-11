## Type

AFK

## What to build

Replace the compact textarea with a full-size canvas text input area that grows to fill the sidebar height. The component must support:

- **RTL direction** for Arabic text content while the overall page layout remains LTR
- **Real-time character count** displayed as "123/3000" — turns red when the 3000-character limit is exceeded
- **Trash icon button** to clear the text input in one click
- **FocusHalo** — a radial gradient glow (magenta/orange tones with blur) that appears behind/below the textarea when it has focus, automatically appearing and disappearing based on focus state
- **Floating shortcut hint** at the bottom-right of the canvas: "Press Ctrl + Enter" with dark panel background and keyboard key badges
- **Disabled state** with visual feedback when text is invalid or too long (border turns red, input is visually dimmed)

Build two components: `ArabicTextarea` (the input area with controls) and `FocusHalo` (the glow effect rendered behind/below the textarea).

## Acceptance criteria

- [ ] Textarea fills the sidebar area (grows vertically to fill available space)
- [ ] RTL direction applied to textarea content (Arabic text reads naturally)
- [ ] Real-time character count updates as user types ("123/3000" format)
- [ ] Character count turns red when exceeding 3000 characters
- [ ] Trash icon button clears the textarea content when clicked
- [ ] FocusHalo radial gradient glow appears when textarea is focused, disappears when blurred
- [ ] Floating shortcut hint rendered at bottom-right of canvas area
- [ ] Disabled state shows visual feedback (red border, dimmed input) when text is invalid/too long
- [ ] Tests: character count updates, validation state changes (valid/invalid/too long), clear button resets text, disabled state when invalid, FocusHalo appears/disappears on focus/blur

## Blocked by

- #01-two-panel-layout-header-keyboard-shortcut (Slice 1)
