# Issue 6: Frontend RTL Textarea Component

## What to build

Build the Arabic text input textarea with proper RTL layout, Arabic-optimized font stack, and auto-direction detection. This is the primary user input mechanism for the application.

After this is complete, users can type Arabic text into a properly styled textarea — no generation or validation yet.

## Acceptance criteria

- [ ] Textarea has `dir="auto"` for automatic RTL/LTR detection
- [ ] Uses Arabic-optimized font stack: Noto Sans Arabic, Amiri, Scheherazade New
- [ ] Font size is 1.35rem (22px) for Arabic readability
- [ ] Line-height is 2.1 for Arabic descenders (ي، ب، ت، ن)
- [ ] Text aligns right-to-left by default
- [ ] Placeholder text is in English with example sentence
- [ ] Textarea auto-resizes vertically (min 6rem, max 20rem)
- [ ] Styled with border, rounded corners, and focus ring matching design system

## Blocked by

- Issue 2: Backend API Foundation — FastAPI Endpoints & Health Check
