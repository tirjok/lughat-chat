import { describe, it, expect } from 'vitest'
import { getLessonById } from '~/data/curriculum'

// ─── Issue 4: Migrate Lesson a1-01 to Nested Structure ─────────────────
// These tests verify that the a1-01 lesson data has been migrated from
// the incomplete flat/nested hybrid (4 dialogue lines, 5 vocab words,
// etc.) to the full nested structure from lesson-01.json.

describe('curriculum.ts — Issue 4: Migrate a1-01 to nested structure', () => {
  describe('TC-07: Dialogue section items count', () => {
    it('a1-01 dialogue section.items produces exactly 10 entries (2 scenes × 5 lines from lesson-01.json)', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()

      const dialogueSection = lesson!.sections.find(s => s.name === 'Dialogue')
      expect(dialogueSection).toBeDefined()

      const items = dialogueSection!.items
      // Current data has 4 lines; migrated data must have 10 (2 scenes × 5 lines)
      expect(items.length).toBe(10)
    })
  })
})
