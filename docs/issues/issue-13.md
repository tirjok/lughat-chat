## Parent

Lughat Chat PRD — Frontend Toast Notification Component

## What to build

A toast notification component that displays Arabic error messages at the top-center of the screen. It should be dismissible with an X button and support smooth enter/leave animations.

The component should:
- Accept a message string as input
- Display with RTL layout support
- Include an icon (alert circle for errors) and dismiss button
- Support smooth slide-down/slide-up animations
- Be positionable at the top of the viewport (z-index above other content)

## Acceptance criteria

- [ ] Component accepts a message string and displays it in Arabic
- [ ] Toast appears at top-center of viewport with proper z-index
- [ ] Dismissible via X button click
- [ ] Smooth enter/leave animations (slide down/up)
- [ ] RTL layout support (text alignment, icon positioning)
- [ ] Can be triggered programmatically from any composable

## Blocked by

- Issue 11 (Frontend API Composable) — need to wire error messages from API calls

---

## Triage: ready-for-agent
