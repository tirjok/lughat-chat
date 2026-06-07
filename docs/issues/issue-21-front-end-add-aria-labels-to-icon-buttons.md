## What to build

Add `aria-label` attributes to all icon-only buttons so screen readers can announce their actions. Currently, DownloadButton, PlayPauseButton, and the ToastNotification close button have no accessible name — a screen reader user would only hear "button" with no indication of what the button does.

## Acceptance criteria

- [ ] DownloadButton has `aria-label` describing the download action (e.g., "Download audio")
- [ ] PlayPauseButton has `aria-label` that updates dynamically: "Play" when paused, "Pause" when playing
- [ ] ToastNotification close button has `aria-label` such as "Close notification"
- [ ] All icon buttons remain visually unchanged (no layout shift)

## Blocked by

None - can start immediately
