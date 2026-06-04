# Issue 9: Frontend RTL Textarea Component

## What to build

A right-to-left textarea component optimized for Arabic text input with proper font stack, line-height, and character rendering.

## Acceptance criteria

- [ ] Textarea has `dir="auto"` attribute for proper RTL rendering
- [ ] Font stack prioritizes Arabic fonts: Noto Sans Arabic, Amiri, Scheherazade New
- [ ] Font size is 1.35rem (~22px) for generous Arabic readability
- [ ] Line-height is 2.1 to accommodate Arabic descenders (ي، ب، ت، ن)
- [ ] Letter-spacing and word-spacing tuned for Arabic text
- [ ] Textarea auto-resizes vertically (min-height 6rem, max-height 20rem)
- [ ] Placeholder text in Arabic: "اكتب النص العربي هنا... مثال: السلام عليكم ورحمة الله وبركته"
- [ ] Focus state has blue border glow matching design system

## Blocked by

- Issue 2: Backend API Foundation (provides the API composable for validation)
