## What to build

Replace literal `"..."` (three dots) with the proper Unicode ellipsis character `…` (U+2026) in loading text strings throughout index.vue. The ellipsis character is typographically correct and renders consistently across fonts, while three dots can look uneven.

## Acceptance criteria

- [ ] All loading status strings that end with three dots use the proper ellipsis character `…` instead
- [ ] Affected strings include generation-in-progress and loading-in-progress status messages
- [ ] No layout or visual changes (character width may differ slightly but should be negligible)

## Blocked by

None - can start immediately
