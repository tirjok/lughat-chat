# Issue 5: Frontend Model Loading Indicator UI

## What to build

Build the header status bar component that displays model loading progress with Arabic text and icons. Shows a spinning loader while the TTS model downloads, then switches to a checkmark when ready.

After this is complete, users see clear visual feedback about model status on app startup — no generation functionality required.

## Acceptance criteria

- [ ] Status bar appears in page header below title
- [ ] Shows spinning loader icon + "جاري التحميل..." while model is loading
- [ ] Shows green checkmark icon + "النموذج جاهز" when model is ready
- [ ] Shows red alert icon + error message if model fails to load
- [ ] Uses Issue 4 composable for reactive status updates
- [ ] Status bar is RTL-aligned and matches existing header design
- [ ] Auto-updates as status changes (no page refresh needed)

## Blocked by

- Issue 4: Frontend Health Polling Composable
