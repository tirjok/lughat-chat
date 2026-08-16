# ADR-006: Partial Theme Rebrand — Light Mode Complete, Dark Mode Incomplete

**Status:** Accepted
**Date:** 2026-08-16
**Supersedes:** ADR-003 (Theme Rebrand) section on fonts

---

## Context

ADR-003 documented a "Full Theme Rebrand" that included three changes: (1) color palette replacement, (2) font replacement (Inter + Amiri), and (3) background/shadow redesign.

Subsequent decisions modified this plan:
- **ADR-005** rejected the font replacement (kept Plus Jakarta Sans + Noto Sans Arabic + Cairo).
- The color tokens (`primary` teal, `gold` accent) were fully migrated across all 10+ components.
- The dark mode gradient background (`body::before`) was NOT migrated — it still uses `#DD2476` (sunrise-magenta) and `#FF512F` (sunrise-orange) in the radial gradient orbs.
- The dark mode caret color (`#FF512F`) was NOT migrated.

The result is a **partial rebrand**: light mode is fully rebranded; dark mode retains elements of the old identity.

---

## Decision

**Accept the partial rebrand as-is.** The dark mode gradient orbs and dark caret color are low-visibility legacy artifacts that do not affect functionality. Migrating them would require changes to `main.css` (lines 149–154 for orbs, line 190 for caret) but provides negligible user value.

This is a conscious acceptance of technical debt — the dark mode gradient is a cosmetic holdout from the old theme, not a functional gap.

---

## Consequences

### What becomes easier
- **No unnecessary CSS work:** The dark gradient orbs are subtle (opacity 0.03–0.06 on dark backgrounds). Users are unlikely to notice the color difference between old and new palettes in dark mode.
- **Consistent documentation:** ADR-003's font section is acknowledged as superseded by ADR-005. The partial rebrand status accurately reflects reality.

### What becomes harder
- **Internal inconsistency:** A reader scanning `main.css` will find old color references (`#DD2476`, `#FF512F`) in dark mode despite the color tokens being fully migrated. This is confusing during code review.
- **Future rebrand confusion:** If a future rebrand occurs, the dark mode gradient will be a "second-class" target — easy to miss because it uses literal hex values rather than UnoCSS tokens.

### Trade-off summary

| Aspect | Light Mode | Dark Mode |
|--------|-----------|-----------|
| Color tokens | Fully migrated (`primary`, `gold`) | Fully migrated in components |
| Gradient orbs | Migrated (teal) | NOT migrated (orange/magenta/purple) |
| Caret color | Migrated (teal) | NOT migrated (orange) |
| Fonts | Kept (Jakarta + Noto) | Kept (Jakarta + Noto) |
| Shadows | Migrated | Migrated |
| Film grain | Migrated (opacity adjusted) | Migrated (opacity adjusted) |

---

## Related

- ADR-003: Full Theme Rebrand (superseded on font decision)
- ADR-005: Font Family Choice (kept production fonts)
