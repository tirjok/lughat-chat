# Issue: Create LessonHero Component with Gradient Banner

**PRD Reference:** VISUAL_UNIFY.md — Solution #4 (hero banners), User Stories #2, #11, #12, Implementation: "Hero banner component"

**Type:** New Component

**Estimated Effort:** 3-4 hours

---

## Problem

The dashboard lesson page has a simple hero section (just a heading + subheading) without the premium hero banner shown in the design proto. The proto defines a rich hero with:

- `bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden` outer card
- `bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900` inner banner
- Decorative Arabic text overlay at `opacity-10`
- Status pills (level pill, lesson badge, ready indicator) as `rounded-full` pills
- Metadata: estimated time, scenes, audio type

This is a reusable component needed across dashboard pages.

---

## Acceptance Criteria

1. **New component:** `LessonHero.vue` created in `app/components/`.
2. **Outer card:** `bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden`.
3. **Gradient banner:** Inner banner uses `bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900`.
4. **Decorative Arabic text:** Semi-transparent Arabic text overlay (`opacity-10`) positioned at top-right and bottom-left.
5. **Status pills:** Renders level pill (`bg-white/20 rounded-full`), lesson badge (`bg-gold-400/90 rounded-full`), and ready indicator (green dot + "Ready" text).
6. **Metadata row:** Displays estimated time, scenes, and audio type with icons.
7. **Props interface:** Accepts `level`, `lessonNumber`, `title`, `arabicTitle`, `estimatedTime`, `scenes`, `audioType`, `isReady`.
8. **Responsive:** Hero scales appropriately on mobile (padding reduction, text size adjustment).
9. **Reusable:** Can be imported and used by both the dashboard index page and the lesson detail page.
10. `./run-tests.sh` passes.

---

## Proto Reference

From `docs/proto/lesson-details.html` lines 222-256:

```html
<div class="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
  <div class="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 px-8 py-10 relative overflow-hidden">
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-4 right-8 font-arabic text-7xl text-white">السَّلَامُ عَلَيْكُمْ</div>
      <div class="absolute bottom-4 left-8 font-arabic text-5xl text-white">مَرْحَبًا</div>
    </div>
    <!-- Status pills, heading, metadata -->
  </div>
</div>
```

---

## Files Changed

- `frontend/app/components/LessonHero.vue` (new)
- `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (replace existing hero with `<LessonHero>`)

---

## Dependencies

Requires: Issue #1 (extended tokens). Can be done in parallel with Issues #2, #5, #6, #7.

---

## Tests

- **Hero rendering:** Verify `LessonHero` renders with `rounded-2xl`, `bg-white`, `border-stone-200`.
- **Gradient:** Verify inner banner has `from-primary-700 via-primary-800 to-primary-900`.
- **Arabic overlay:** Verify decorative Arabic text elements exist with `opacity-10`.
- **Status pills:** Verify level pill, lesson badge, and ready indicator render correctly.
- **Props:** Verify all props (`level`, `lessonNumber`, `title`, etc.) are reflected in the rendered output.
