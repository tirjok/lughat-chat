# Issue 8: Frontend Model Loading Indicator UI

## What to build

A header status bar component that displays the TTS model loading state with Arabic text and icons. Shows a spinning loader while the model is downloading/loading, then switches to a checkmark when ready.

## Acceptance criteria

- [ ] Component displays in the page header below the title
- [ ] Shows spinning loader icon + "جاري التحميل..." while model is loading
- [ ] Shows checkmark icon + "النموذج جاهز" when model is ready
- [ ] Shows alert icon + error message if model fails to load
- [ ] Component updates reactively as status changes from the health polling composable
- [ ] RTL layout matches existing header design

## Blocked by

- Issue 7: Frontend Health Polling Composable (provides the reactive status)
