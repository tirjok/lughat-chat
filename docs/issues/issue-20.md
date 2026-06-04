## What to build

Generate button that connects all inputs — validates text, checks model status, calls API with text + speed + speaker settings, and triggers audio playback.

## Acceptance criteria

- [ ] Generate button is disabled when text input is empty
- [ ] Generate button is disabled while model is still loading (health check shows `loading`)
- [ ] On click, button shows "Generating..." loading state with spinner icon
- [ ] Sends POST request to `/api/generate` with text, speed value, and speaker selection
- [ ] On success: loads returned MP3 blob into audio player and auto-plays
- [ ] On failure: shows English error toast via composable from Issue 19
- [ ] Button returns to normal state after generation completes (success or error)
- [ ] Ctrl+Enter keyboard shortcut triggers same generate flow

## Blocked by

- Issue 4: Frontend Health Polling Composable
- Issue 5: Frontend Model Loading Indicator UI
- Issue 6: Frontend RTL Textarea Component
- Issue 7: Frontend Character Counter Ring
- Issue 8: Frontend Input Validation Logic
- Issue 9: Frontend Speed Slider Component
- Issue 10: Frontend Speaker Selector Dropdown
- Issue 11: Frontend API Composable (Network Layer)
