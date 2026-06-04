## Parent

Lughat Chat PRD — Frontend Audio Player Container

## What to build

A container component that assembles all audio player sub-components (play/pause button, progress bar, time display, download button) into a cohesive audio player UI. It should appear after successful audio generation and hide when no audio is available.

The container should:
- Wrap all sub-components in a unified layout with consistent styling
- Appear/disappear based on whether audio is available (audioUrl ref)
- Include a header with title ("النتيجة") and duration badge
- Use smooth enter/leave animations (slide up/down)
- Maintain consistent spacing and visual hierarchy

## Acceptance criteria

- [ ] Container assembles play/pause button, progress bar, time display, and download button
- [ ] Container appears after successful audio generation (conditional rendering)
- [ ] Container hides when no audio is available
- [ ] Header displays "النتيجة" title and duration badge
- [ ] Smooth slide-up/slide-down animations on mount/unmount
- [ ] Consistent spacing and visual hierarchy matching the design system

## Blocked by

- Issue 14 (Play/Pause Button)
- Issue 15 (Seekable Progress Bar)
- Issue 16 (Time Display)
- Issue 17 (Download Button)

---

## Triage: ready-for-agent
