import { describe, it, expect } from 'vitest'
import {
  getLessonById,
  getLevelByCode,
  getLevelForLesson,
  getAllLessons,
  getActivitiesByLesson,
  getTotalLessonCount
} from '~/data/curriculum'

describe('curriculum.ts — Issue 2: Restructured interfaces', () => {
  describe('SectionDefinition restructured', () => {
    it('has a working `items` property that returns SectionItem[]', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()
      expect(lesson!.sections.length).toBeGreaterThan(0)

      const firstSection = lesson!.sections[0]
      expect(firstSection).toHaveProperty('name')
      expect(firstSection).toHaveProperty('items')

      const items = (firstSection as { items: unknown[] }).items
      expect(Array.isArray(items)).toBe(true)
      expect(items.length).toBeGreaterThan(0)
    })

    it('has optional `type` field (SectionType union)', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()

      lesson!.sections.forEach((section) => {
        const s = section as Record<string, unknown>
        expect(s).toHaveProperty('type')
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
    it('a1-01 vocabulary items have IDs matching current flat format (a1-01-v1 through a1-01-v8)', () => {
      const lesson = getLessonById('a1-01')
      const vocabSection = lesson!.sections.find(s => s.name === 'Vocabulary')
      expect(vocabSection).toBeDefined()
      const items = vocabSection!.items
      expect(items.length).toBe(8)
      expect(items.map(i => i.id)).toEqual(['a1-01-v1', 'a1-01-v2', 'a1-01-v3', 'a1-01-v4', 'a1-01-v5', 'a1-01-v6', 'a1-01-v7', 'a1-01-v8'])
    })

    it('a1-01 pronouns items have IDs matching current flat format (a1-01-p1 through a1-01-p12)', () => {
      const lesson = getLessonById('a1-01')
      const pronounsSection = lesson!.sections.find(s => s.name === 'Pronouns')
      expect(pronounsSection).toBeDefined()
      const items = pronounsSection!.items
      expect(items.length).toBe(12)
      expect(items.map(i => i.id)).toEqual(['a1-01-p1', 'a1-01-p2', 'a1-01-p3', 'a1-01-p4', 'a1-01-p5', 'a1-01-p6', 'a1-01-p7', 'a1-01-p8', 'a1-01-p9', 'a1-01-p10', 'a1-01-p11', 'a1-01-p12'])
    })

    it('a1-01 expressions items have IDs matching current flat format (a1-01-e1 through a1-01-e16)', () => {
      const lesson = getLessonById('a1-01')
      const expressionsSection = lesson!.sections.find(s => s.name === 'Expressions')
      expect(expressionsSection).toBeDefined()
      const items = expressionsSection!.items
      expect(items.length).toBe(16)
      expect(items.map(i => i.id)).toEqual(['a1-01-e1', 'a1-01-e2', 'a1-01-e3', 'a1-01-e4', 'a1-01-e5', 'a1-01-e6', 'a1-01-e7', 'a1-01-e8', 'a1-01-e9', 'a1-01-e10', 'a1-01-e11', 'a1-01-e12', 'a1-01-e13', 'a1-01-e14', 'a1-01-e15', 'a1-01-e16'])
    })

    it('a1-01 grammar items have IDs matching current flat format (a1-01-g1 through a1-01-g11)', () => {
      const lesson = getLessonById('a1-01')
      const grammarSection = lesson!.sections.find(s => s.name === 'Grammar')
      expect(grammarSection).toBeDefined()
      const items = grammarSection!.items
      expect(items.length).toBe(11)
      expect(items.map(i => i.id)).toEqual(['a1-01-g1', 'a1-01-g2', 'a1-01-g3', 'a1-01-g4', 'a1-01-g5', 'a1-01-g6', 'a1-01-g7', 'a1-01-g8', 'a1-01-g9', 'a1-01-g10', 'a1-01-g11'])
    })
  })

  describe('arabic / english / notes preservation', () => {
    it('dialogue items preserve arabic, english, and notes from nested content', () => {
      const lesson = getLessonById('a1-01')
      const dialogueSection = lesson!.sections.find(s => s.name === 'Dialogue')
      const items = dialogueSection!.items
      expect(items[0].arabic).toBe('السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ')
      expect(items[0].english).toBe('Peace be upon you and Allah\'s mercy')
      expect(items[0].notes).toBe('Formal Islamic greeting')
      expect(items[3].arabic).toBe('اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ، شُكْرًا. وَكَيْفَ حَالُكَ؟')
      expect(items[3].english).toBe('All praise be to Allah, I am fine, thank you. And how are you?')
    })

    it('vocabulary items preserve arabic, english; notes = singular ?? plural ?? undefined', () => {
      const lesson = getLessonById('a1-01')
      const vocabSection = lesson!.sections.find(s => s.name === 'Vocabulary')
      const items = vocabSection!.items
      expect(items[0].arabic).toBe('تَحِيَّة')
      expect(items[0].english).toBe('salutation/greeting')
      expect(items[0].notes).toBe('تَحِيَّة')
      expect(items[7].arabic).toBe('فِي')
      expect(items[7].english).toBe('in')
      expect(items[7].notes).toBeUndefined()
    })

    it('pronouns items: notes = example from nested pronoun', () => {
      const lesson = getLessonById('a1-01')
      const pronounsSection = lesson!.sections.find(s => s.name === 'Pronouns')
      const items = pronounsSection!.items
      expect(items[0].arabic).toBe('أَنَا')
      expect(items[0].english).toBe('I')
      expect(items[0].notes).toBe('أَنَا أَخٌ / أُخْت')
      expect(items[11].arabic).toBe('هُنَّ')
      expect(items[11].english).toBe('they (female)')
      expect(items[11].notes).toBe('هُنَّ أُخَوَات')
    })

    it('grammar items: notes = topic.description from nested topic', () => {
      const lesson = getLessonById('a1-01')
      const grammarSection = lesson!.sections.find(s => s.name === 'Grammar')
      const items = grammarSection!.items
      expect(items[0].arabic).toBe('أَنَا مُسْلِم')
      expect(items[0].english).toBe('I am a Muslim')
      expect(items[0].notes).toBe('A sentence starting with a noun (ism) followed by a predicate (khabar). Common pattern: Pronoun + Noun/Adjective')
      expect(items[10].arabic).toBe('إِخْوَة / أُخَوَات')
      expect(items[10].english).toBe('brothers (m.pl.) / sisters (f.pl.)')
      expect(items[10].notes).toBe('Arabic has three numbers: singular (مفرد), dual (ثنائي), and plural (جمع).')
    })
  })

  describe('curriculum.ts — Issue 5: Migrate 7 remaining lessons', () => {
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
        lesson!.sections.forEach((section) => {
          section.items.forEach((item) => {
            expect(item.transliteration).toBeUndefined()
          })
        })
      })

      it('flat accessor does not produce audioUrl (undefined for all items)', () => {
        const lesson = getLessonById('a1-01')
        lesson!.sections.forEach((section) => {
          section.items.forEach((item) => {
            expect(item.audioUrl).toBeUndefined()
          })
        })
      })
    })
  })

  const nonA101Lessons = [
    'a1-02', 'a2-01', 'a2-02', 'b1-01', 'b2-01', 'c1-01', 'c2-01'
  ]

  describe('TC-competencies-undefined: non-a1-01 lessons have no competencies field', () => {
    for (const lessonId of nonA101Lessons) {
      it(`getLessonById('${lessonId}')?.competencies is undefined (not [] or null)`, () => {
        const lesson = getLessonById(lessonId)
        expect(lesson).toBeDefined()
        const l = lesson!
        expect(l.competencies).toBeUndefined()
      })
    }
  })

  describe('TC-sequence-undefined: non-a1-01 lessons have no sequence field', () => {
    for (const lessonId of nonA101Lessons) {
      it(`getLessonById('${lessonId}')?.sequence is undefined (not 0 or null)`, () => {
        const lesson = getLessonById(lessonId)
        expect(lesson).toBeDefined()
        const l = lesson!
        expect(l.sequence).toBeUndefined()
      })
    }
  })

  describe('TC-empty-activities: non-a1-01 lessons have empty activities array', () => {
    for (const lessonId of nonA101Lessons) {
      it(`getLessonById('${lessonId}').activities is []`, () => {
        const lesson = getLessonById(lessonId)
        expect(lesson).toBeDefined()
        const l = lesson!
        expect(l.activities).toEqual([])
      })
    }
  })

  describe('TC-items-accessor: flat items accessor works for all sections of all 7 lessons', () => {
    for (const lessonId of nonA101Lessons) {
      it(`getLessonById('${lessonId}') sections.items produces valid SectionItem[] for every section`, () => {
        const lesson = getLessonById(lessonId)
        expect(lesson).toBeDefined()
        const l = lesson!

        for (const section of l.sections) {
          const items = section.items
          expect(Array.isArray(items)).toBe(true)
          for (const item of items) {
            expect(typeof item.id).toBe('string')
            expect(item.id).toMatch(new RegExp(`^${lessonId}-[a-z]\\d+$`))
            expect(typeof item.arabic).toBe('string')
            expect(item.arabic.length).toBeGreaterThan(0)
          }
        }
      })
    }
  })

  describe('TC-competencies-a101-still-present: a1-01 competencies unchanged', () => {
    it('getLessonById("a1-01")?.competencies is defined with 5 strings', () => {
      const lesson = getLessonById('a1-01')
      expect(lesson).toBeDefined()
      const l = lesson!
      expect(Array.isArray(l.competencies)).toBe(true)
      expect(l.competencies!.length).toBe(5)
    })
  })

  describe('curriculum.ts — Issue 6: getActivitiesByLesson helper', () => {
    it('TC-02: returns 5 ActivityDefinition objects for \'a1-01\'', () => {
      const activities = getActivitiesByLesson('a1-01')
      expect(activities.length).toBe(5)
    })

    const nonA101Lessons = [
      'a1-02', 'a2-01', 'a2-02', 'b1-01', 'b2-01', 'c1-01', 'c2-01'
    ]

    describe('TC-03: other lessons return empty array', () => {
      for (const lessonId of nonA101Lessons) {
        it(`returns [] for '${lessonId}'`, () => {
          const activities = getActivitiesByLesson(lessonId)
          expect(activities).toEqual([])
        })
      }
    })
  })
})
