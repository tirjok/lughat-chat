## What to build

Wire API composable errors to toast notification — when `synthesize()` fails, show English error message in a dismissible toast.

## Acceptance criteria

- [ ] API composable catches errors from `/api/generate` and throws descriptive English error messages
- [ ] Toast component displays at top-center of screen with LTR layout
- [ ] Toast is dismissible via X button click
- [ ] Error toast appears when backend is unreachable or returns error status
- [ ] Toast disappears after dismiss button click or 5-second timeout

## Blocked by

- Issue 11: Frontend API Composable (Network Layer)
- Issue 12: Frontend Toast Notification Component
