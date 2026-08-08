# Issue: Evaluate and Align Font Families with Proto

**PRD Reference:** VISUAL_UNIFY.md — User Story #20, Implementation: "Font family alignment", Further Notes: "Font file changes" (marked as a decision, not a prescription)

**Type:** Decision / Configuration

**Estimated Effort:** 1-2 hours (decision + implementation)

---

## Problem

The current production code uses self-hosted fonts:

```ts
// uno.config.ts
fontFamily: {
  sans: ['"Plus Jakarta Sans"', 'sans-serif'],
  arabic: ['"Noto Sans Arabic"', 'Cairo', 'sans-serif']
}
```

While `main.css` defines `@font-face` for:
- **Plus Jakarta Sans** (Latin UI labels) — 5 weights (400, 500, 600, 700, 800)
- **Noto Sans Arabic** (Arabic body text) — 3 weights (400, 500, 700)
- **Cairo** (Arabic fallback) — 3 weights (400, 500, 700)

The design proto specifies:
```ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  arabic: ['Amiri', 'serif']
}
```

The proto uses **Inter** (Google Font, system fallback) and **Amiri** (Google Font, serif for Arabic). The production code uses **Plus Jakarta Sans** (self-hosted, offline) and **Noto Sans Arabic** (self-hosted, offline).

The PRD explicitly states: *"Whether to switch from Plus Jakarta Sans/Noto Sans Arabic to Inter/Amiri is a decision to be made during implementation, not prescribed here."*

---

## Decision Framework

**Option A: Keep production fonts (Plus Jakarta Sans + Noto Sans Arabic + Cairo)**
- **Pros:** 100% offline, no CDN dependency, consistent rendering across all environments
- **Cons:** Doesn't match the proto's visual intent
- **Action:** Document the decision in an Architecture Decision Record (ADR). The fonts are self-hosted in `frontend/app/assets/fonts/` and loaded via `@font-face` in `main.css`.

**Option B: Switch to proto fonts (Inter + Amiri)**
- **Pros:** Matches the design proto exactly
- **Cons:** Requires CDN links (Google Fonts) or self-hosting the font files
- **Action:** Add CDN `<link>` tags to the proto-style head, or self-host Inter + Amiri font files.

**Recommendation:** Option A (keep production fonts) with documentation. The production team likely chose self-hosted fonts for offline reliability. The visual difference between Plus Jakarta Sans and Inter is subtle (both are geometric sans-serifs), and between Noto Sans Arabic and Amiri (one is sans, one is serif — that's a more noticeable difference for Arabic text).

---

## Acceptance Criteria

1. **Decision documented:** An ADR (Architecture Decision Record) in `docs/adr/` explains the font choice, referencing the proto's preference and the production rationale.
2. **If switching:** `uno.config.ts` updated to `Inter` + `Amiri`, `main.css` updated with corresponding `@font-face` declarations, CDN links added to the proto style.
3. **If keeping:** `uno.config.ts` remains unchanged, but a comment in `uno.config.ts` references the proto's font choice and explains the deviation.
4. **Arabic text rendering:** Arabic text uses the correct font family (`font-arabic` class) across all pages.
5. `./run-tests.sh` passes.

---

## Files Changed

- `frontend/uno.config.ts` (possibly — depends on decision)
- `frontend/app/assets/css/main.css` (possibly — depends on decision)
- `docs/adr/NN-font-family-choice.md` (new — always)

---

## Dependencies

Requires: Issue #1 (tokens). This can be done in parallel with all other issues.

---

## Tests
## Proto Reference

From `docs/proto/lesson-details.html` lines 14-16, 46-47:

```ts
fontFamily: {
  arabic: ['Amiri', 'serif'],
  sans: ['Inter', 'system-ui', 'sans-serif'],
}
```

```css
body { font-family: 'Inter', system-ui, sans-serif; }
.font-arabic { font-family: 'Amiri', serif; }
```

---

- **Font family test:** Verify `font-sans` resolves to the expected font family name.
- **Arabic font test:** Verify `font-arabic` resolves to the expected Arabic font family name.
