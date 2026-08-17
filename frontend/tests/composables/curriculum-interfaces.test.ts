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

// ─── Issue 3: Flat `items` Accessor Tests ───────────────────────────────
// These tests verify that SectionDefinition.items is a **getter** (not a
// static property) that flattens nested `content` into SectionItem[] with
// IDs matching the current flat data format. This is the backward-compatibility
// contract — any code reading `item.id` must get the same values as before.

describe('curriculum.ts — Issue 3: Flat items accessor', () => {
  describe('Backward-compatible ID generation', () => {
    it('a1-01 dialogue items have IDs matching current flat format (a1-01-d1 through a1-01-d10)', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()
      const dialogueSection = lesson!.sections.find(s => s.name === 'Dialogue')
      expect(dialogueSection).toBeDefined()
      const items = dialogueSection!.items
      expect(items.length).toBe(10)
      expect(items.map(i => i.id)).toEqual(['a1-01-d1', 'a1-01-d2', 'a1-01-d3', 'a1-01-d4', 'a1-01-d5', 'a1-01-d6', 'a1-01-d7', 'a1-01-d8', 'a1-01-d9', 'a1-01-d10'])
    })
    it('a1-01 vocabulary items have IDs matching current flat format (a1-01-v1 through a1-01-v5)', () => {
      const lesson = getLessonById('a1-01')
      const vocabSection = lesson!.sections.find(s => s.name === 'Vocabulary')
      expect(vocabSection).toBeDefined()
      const items = vocabSection!.items
      expect(items.length).toBe(5)
      expect(items.map(i => i.id)).toEqual(['a1-01-v1', 'a1-01-v2', 'a1-01-v3', 'a1-01-v4', 'a1-01-v5'])
    })

    it('a1-01 pronouns items have IDs matching current flat format (a1-01-p1 through a1-01-p4)', () => {
      const lesson = getLessonById('a1-01')
      const pronounsSection = lesson!.sections.find(s => s.name === 'Pronouns')
      expect(pronounsSection).toBeDefined()
      const items = pronounsSection!.items
      expect(items.length).toBe(4)
      expect(items.map(i => i.id)).toEqual(['a1-01-p1', 'a1-01-p2', 'a1-01-p3', 'a1-01-p4'])
    })

    it('a1-01 expressions items have IDs matching current flat format (a1-01-e1 through a1-01-e2)', () => {
      const lesson = getLessonById('a1-01')
      const expressionsSection = lesson!.sections.find(s => s.name === 'Expressions')
      expect(expressionsSection).toBeDefined()
      const items = expressionsSection!.items
      expect(items.length).toBe(2)
      expect(items.map(i => i.id)).toEqual(['a1-01-e1', 'a1-01-e2'])
    })

    it('a1-01 grammar items have IDs matching current flat format (a1-01-g1 through a1-01-g2)', () => {
      const lesson = getLessonById('a1-01')
      const grammarSection = lesson!.sections.find(s => s.name === 'Grammar')
      expect(grammarSection).toBeDefined()
      const items = grammarSection!.items
      expect(items.length).toBe(2)
      expect(items.map(i => i.id)).toEqual(['a1-01-g1', 'a1-01-g2'])
    })
  })
  describe('arabic / english / notes preservation', () => {
    it('dialogue items preserve arabic, english, and notes from nested content', () => {
      const lesson = getLessonById('a1-01')
      const dialogueSection = lesson!.sections.find(s => s.name === 'Dialogue')
      const items = dialogueSection!.items
      // First line: formal Islamic greeting (Scene 1, line 1)
      expect(items[0].arabic).toBe('السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ')
      expect(items[0].english).toBe('Peace be upon you and Allah\'s mercy')
      expect(items[0].notes).toBe('Formal Islamic greeting')
      // Fourth line: standard positive response (Scene 1, line 4)
      expect(items[3].arabic).toBe('اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ، شُكْرًا. وَكَيْفَ حَالُكَ؟')
      expect(items[3].english).toBe('All praise be to Allah, I am fine, thank you. And how are you?')
    })

    it('vocabulary items preserve arabic, english; notes = singular ?? plural ?? undefined', () => {
      const lesson = getLessonById('a1-01')
      const vocabSection = lesson!.sections.find(s => s.name === 'Vocabulary')
      const items = vocabSection!.items
      expect(items[0].arabic).toBe('صَباحَ الخَيْر')
      expect(items[0].english).toBe('Good morning')
      // Vocab section: notes comes from singular (no plural field set)
      expect(items[0].notes).toBe('Ṣabāḥ al-khayr')
    })

    it('pronouns items: notes = example from nested pronoun', () => {
      const lesson = getLessonById('a1-01')
      const pronounsSection = lesson!.sections.find(s => s.name === 'Pronouns')
      const items = pronounsSection!.items
      expect(items[0].arabic).toBe('أَنَا')
      expect(items[0].english).toBe('I / me')
      expect(items[0].notes).toBe('Anā')
    })

    it('grammar items: notes = topic.description from nested topic', () => {
      const lesson = getLessonById('a1-01')
      const grammarSection = lesson!.sections.find(s => s.name === 'Grammar')
      const items = grammarSection!.items
      expect(items[0].arabic).toBe('أنا طالب')
      expect(items[0].english).toBe('I am a student')
      expect(items[0].notes).toBe('')
      expect(items[1].notes).toBe('')
    })
  })

  describe('cross-lesson ID format consistency', () => {
    it('a1-02 dialogue IDs follow lesson-prefix format (a1-02-d1, a1-02-d2)', () => {
      const lesson = getLessonById('a1-02')
      expect(lesson).toBeDefined()
      const dialogueSection = lesson!.sections.find(s => s.name === 'Dialogue')
      const items = dialogueSection!.items
      expect(items.length).toBe(2)
      expect(items.map(i => i.id)).toEqual(['a1-02-d1', 'a1-02-d2'])
    })

    it('a1-02 vocabulary IDs follow lesson-prefix format (a1-02-v1 through a1-02-v5)', () => {
      const lesson = getLessonById('a1-02')
      const vocabSection = lesson!.sections.find(s => s.name === 'Vocabulary')
      const items = vocabSection!.items
      expect(items.length).toBe(5)
      expect(items.map(i => i.id)).toEqual(['a1-02-v1', 'a1-02-v2', 'a1-02-v3', 'a1-02-v4', 'a1-02-v5'])
    })

    it('a2-01 dialogue IDs follow lesson-prefix format (a2-01-d1, a2-01-d2)', () => {
      const lesson = getLessonById('a2-01')
      expect(lesson).toBeDefined()
      const dialogueSection = lesson!.sections.find(s => s.name === 'Dialogue')
      const items = dialogueSection!.items
      expect(items.length).toBe(2)
      expect(items.map(i => i.id)).toEqual(['a2-01-d1', 'a2-01-d2'])
    })
  })

  describe('transliteration and audioUrl are undefined', () => {
    it('flat accessor does not produce transliteration (undefined for all items)', () => {
      const lesson = getLessonById('a1-01')
      lesson!.sections.forEach(section => {
        section.items.forEach(item => {
          expect(item.transliteration).toBeUndefined()
        })
      })
    })

    it('flat accessor does not produce audioUrl (undefined for all items)', () => {
      const lesson = getLessonById('a1-01')
      lesson!.sections.forEach(section => {
        section.items.forEach(item => {
          expect(item.audioUrl).toBeUndefined()
        })
      })
    })
  })
})
