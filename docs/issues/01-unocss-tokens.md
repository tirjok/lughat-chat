# Issue: Extend UnoCSS Design Tokens to Full Primary/Gold Scales

**PRD Reference:** VISUAL_UNIFY.md — Solution #1, User Story #15, Implementation: "UnoCSS token extension"

**Type:** Foundation / Design System

**Estimated Effort:** 1-2 hours

---

## Problem

The current `uno.config.ts` defines only 2 levels of `primary` (500, 600) and 1 level of `gold` (500). The design proto (`docs/proto/lesson-details.html`) defines the full scales:

- `primary.50–900` (10 levels): `#f0fdfa` → `#134e4a`
- `gold.50–600` (7 levels): `#fffbeb` → `#d97706`

Without these extended tokens, components cannot use the complete tonal range for hover states, backgrounds, borders, and status indicators.

---

## Acceptance Criteria

1. `uno.config.ts` defines `primary.50`, `primary.100`, `primary.200`, `primary.300`, `primary.400`, `primary.700`, `primary.800`, `primary.900` matching the exact hex values from `docs/proto/lesson-details.html`.
2. `uno.config.ts` defines `gold.50`, `gold.100`, `gold.200`, `gold.300`, `gold.400`, `gold.600` matching the exact hex values from the proto.
3. Existing `primary.500`, `primary.600`, and `gold.500` values remain unchanged (backward compatible).
4. `./run-tests.sh` passes (lint + typecheck + all tests).
5. No other files are modified — this is purely a config change.

---

## Proto Reference Values

```
primary: 50:#f0fdfa, 100:#ccfbf1, 200:#99f6e4, 300:#5eead4, 400:#2dd4bf, 500:#14b8a6, 600:#0d9488, 700:#0f766e, 800:#115e59, 900:#134e4a
gold:    50:#fffbeb, 100:#fef3c7, 200:#fde68a, 300:#fcd34d, 400:#fbbf24, 500:#f59e0b, 600:#d97706
```

---

## Tests

- **Unit test:** Verify `uno.config.ts` exports the expected hex values for all extended tokens.
- **Component test:** A component using `bg-primary-50`, `text-primary-700`, `border-primary-200`, `bg-gold-400` renders with the correct computed styles.

---

## Files Changed

- `frontend/uno.config.ts` (tokens only — no other edits)

---

## Dependencies

None. This is the foundational change all other issues depend on.
