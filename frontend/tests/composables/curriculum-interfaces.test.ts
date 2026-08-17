import { describe, it, expect } from 'vitest'
import {
  getLessonById,
  getLevelByCode,
  getLevelForLesson,
  getAllLessons,
  getTotalLessonCount
} from '~/data/curriculum'

// ─── Issue 2: Restructured Interface Shape Tests ────────────────────────
// These tests verify that SectionDefinition and LessonDefinition have been
// restructured per ADR-007 §7.2 while keeping existing lookup helpers
// type-correct. No data changes yet — data migration is Issues 4-5.

describe('curriculum.ts — Issue 2: Restructured interfaces', () => {
  describe('SectionDefinition restructured', () => {
    it('has a working `items` property that returns SectionItem[]', () => {
      // Arrange — grab any lesson with sections (a1-01 is the first)
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()
      expect(lesson!.sections.length).toBeGreaterThan(0)

      // Act — the restructured SectionDefinition must expose `items`
      const firstSection = lesson!.sections[0]
      expect(firstSection).toHaveProperty('name')
      expect(firstSection).toHaveProperty('items')

      // Assert — items is an array of SectionItem shapes
      const items = (firstSection as { items: unknown[] }).items
      expect(Array.isArray(items)).toBe(true)
      expect(items.length).toBeGreaterThan(0)
    })

    it('has optional `type` field (SectionType union)', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()

      // Every section should have a `type` field (may be undefined for backward-compat)
      lesson!.sections.forEach((section) => {
        const s = section as Record<string, unknown>
        expect(s).toHaveProperty('type')
        // type must be one of the SectionType union values (or undefined)
        const typeVal = s.type as string | undefined
        const validTypes = ['dialogue', 'vocabulary', 'pronouns', 'expressions', 'grammar']
        expect(validTypes.includes(typeVal ?? '')).toBe(true)
      })
    })

    it('has optional `title` field', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()

      lesson!.sections.forEach((section) => {
        const s = section as Record<string, unknown>
        expect(s).toHaveProperty('title')
      })
    })

    it('has `content` field (SectionContent discriminated union)', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()

      lesson!.sections.forEach((section) => {
        const s = section as Record<string, unknown>
        expect(s).toHaveProperty('content')
        expect(typeof s.content).toBe('object')
        const content = s.content as { type?: string }
        expect(content).toHaveProperty('type')
      })
    })

    it('preserves existing `name: string` field', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()

      lesson!.sections.forEach((section) => {
        expect((section as { name: string }).name).toBeTypeOf('string')
        expect((section as { name: string }).name.length).toBeGreaterThan(0)
      })
    })
  })

  describe('LessonDefinition restructured', () => {
    it('has optional `competencies` field (string[] | undefined)', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()

      // a1-01 should have competencies (from lesson-01.json)
      const l = lesson as { competencies?: string[] }
      expect(l).toHaveProperty('competencies')
    })

    it('has optional `sequence` field (number | undefined)', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()

      const l = lesson as { sequence?: number }
      expect(l).toHaveProperty('sequence')
    })

    it('has required `activities` field (ActivityDefinition[])', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()

      const l = lesson as { activities: unknown[] }
      expect(l).toHaveProperty('activities')
      expect(Array.isArray(l.activities)).toBe(true)
    })

    it('preserves existing fields (id, title, arabicTitle, description, sections)', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()

      expect((lesson as { id: string }).id).toBe('a1-01')
      expect((lesson as { title: string }).title).toBeTypeOf('string')
      expect((lesson as { arabicTitle: string }).arabicTitle).toBeTypeOf('string')
      expect((lesson as { description: string }).description).toBeTypeOf('string')
      expect(Array.isArray((lesson as { sections: unknown[] }).sections)).toBe(true)
    })
  })

  describe('Lookup helpers remain type-correct', () => {
    it('getLessonById returns a LessonDefinition with new fields', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()
      expect(lesson!.id).toBe('a1-01')
      expect(Array.isArray(lesson!.sections)).toBe(true)
    })

    it('getLevelByCode returns a CurriculumLevel with lessons', () => {
      const level = getLevelByCode('A1')
      expect(level).toBeDefined()
      expect(level!.lessons.length).toBeGreaterThan(0)
    })

    it('getLevelForLesson returns the containing level', () => {
      const level = getLevelForLesson('a1-01')
      expect(level).toBeDefined()
      expect(level!.code).toBe('A1')
    })

    it('getAllLessons returns all 8 lessons', () => {
      const all = getAllLessons()
      expect(all.length).toBe(8)
    })

    it('getTotalLessonCount returns 8', () => {
      expect(getTotalLessonCount()).toBe(8)
    })
  })
})
