# Issue #2: feat: wire LessonHero with actual lesson data from curriculum

## What to build

Connect the existing `LessonHero` component to real lesson data from `getLessonById()`. The hero currently receives hardcoded props (`:is-ready="true"`, static title). Wire `arabicTitle`, `estimatedTime`, `scenes` (scene count + line count), `audioType`, and `isReady` from the resolved `LessonDefinition`.

The hero receives: `level`, `lessonNumber`, `arabicTitle`, `estimatedTime`, `scenes`, `audioType`, `isReady`. All props are already accepted by `LessonHero.vue` — only the page wiring is missing.

## Acceptance criteria

- [ ] `LessonHero` receives `:arabicTitle="currentLessonData?.arabicTitle"` from resolved lesson
- [ ] `LessonHero` receives `:estimatedTime` computed from lesson sections (e.g., "~20 mins")
- [ ] `LessonHero` receives `:scenes` computed as `"{N} Scenes • {M} Lines"` from nested content
- [ ] `LessonHero` receives `:audioType="'AI-Generated Audio'"` (static, per spec)
- [ ] `LessonHero` receives `:is-ready="true"` (static, per spec — backend readiness handled separately)
- [ ] Hero renders correctly with real curriculum data for a1-01
- [ ] Existing `LessonHero.test.ts` still passes (props interface unchanged)

## Blocked by

- #1 (fix skeleton bug — tabs must render correctly for hero to be meaningful)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 2 (page shell render — hero renders with `arabicTitle`, `estimatedTime`, scene summary, `audioType`, `isReady`)
- ADR-008: Component map (LessonHero wired)

## Test Cases Covered

- "renders hero, competencies, tab bar, first section" (hero data wired)
