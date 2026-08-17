// ─── Curriculum Data Source ──────────────────────────────────────────────
// Centralized curriculum data shared across Dashboard, Level Index, and
// Lesson pages. This file is the single source of truth for CEFR levels,
// lessons, and section content.
//
// When backend endpoints exist (GET /api/levels, GET /api/lessons), this
// file can be replaced with a composable that fetches from the API.

// ─── Level definitions ──────────────────────────────────────────────────

export interface CurriculumLevel {
  code: string
  title: string
  arabicTitle: string
  description: string
  lessonRange: string
  vocabularyCount: string
  speakingWPM: string
  readingWPM: string
  goal: string
  keySkills: string[]
  lessons: LessonDefinition[]
  gradient: string
}

export interface LessonDefinition {
  id: string
  title: string
  arabicTitle: string
  description: string
  sections: SectionDefinition[]
  /** Learning outcomes from the lesson (from lesson-01.json). */
  competencies?: string[]
  /** Ordering within a level. */
  sequence?: number
  /** Rich activity definitions (from lesson-01.json). */
  activities: ActivityDefinition[]
}

export interface SectionDefinition {
  name: string
  /** Section type discriminator (dialogue, vocabulary, etc.). */
  type?: SectionType
  /** Bilingual section title. */
  title?: string
  /** Nested, type-aware content (SectionContent discriminated union). */
  content: SectionContent
  /** Parent lesson ID, used by the `items` getter for backward-compatible ID generation. */
  _lessonId: string
  /** Getter: flattens nested `content` into `SectionItem[]` with backward-compatible IDs. */
  get items(): SectionItem[]
}


// ─── Section flattening helper ──────────────────────────────────────────
// Generates backward-compatible IDs: "${lessonId}-${sectionChar}${index}"
// where sectionChar is derived from SectionType.

const SECTION_CHARS: Record<string, string> = {
  dialogue: 'd',
  vocabulary: 'v',
  pronouns: 'p',
  expressions: 'e',
  grammar: 'g',
  activity: 'a',
}

/** Build a backward-compatible ID for a flat section item. */
function buildSectionId(lessonId: string, sectionType: string, index: number): string {
  const char = SECTION_CHARS[sectionType] ?? 'x'
  return `${lessonId}-${char}${index}`
}

/** Flatten any SectionContent into SectionItem[] with backward-compatible IDs. */
function flattenSectionContent(content: SectionContent, lessonId: string): SectionItem[] {
  switch (content.type) {
    case 'dialogue': {
      const scenes = content as { type: 'dialogue', scenes: { label: string, lines: DialogueLine[] }[] }
      return scenes.scenes.flatMap(scene => scene.lines).map((line, index) => ({
        id: buildSectionId(lessonId, 'dialogue', index + 1),
        arabic: line.arabic,
        english: line.english,
        notes: line.notes,
      }))
    }
    case 'vocabulary': {
      const vocab = content as { type: 'vocabulary', categories: { label: string, words: VocabWord[] }[] }
      return vocab.categories.flatMap(cat => cat.words).map((word, index) => ({
        id: buildSectionId(lessonId, 'vocabulary', index + 1),
        arabic: word.arabic,
        english: word.english,
        notes: word.singular ?? word.plural,
      }))
    }
    case 'pronouns': {
      const pron = content as { type: 'pronouns', pronouns: { arabic: string, english: string, example: string }[] }
      return pron.pronouns.map((p, index) => ({
        id: buildSectionId(lessonId, 'pronouns', index + 1),
        arabic: p.arabic,
        english: p.english,
        notes: p.example,
      }))
    }
    case 'expressions': {
      const expr = content as { type: 'expressions', expressions: { arabic: string, english: string }[] }
      return expr.expressions.map((e, index) => ({
        id: buildSectionId(lessonId, 'expressions', index + 1),
        arabic: e.arabic,
        english: e.english,
      }))
    }
    case 'grammar': {
      const gram = content as { type: 'grammar', topics: { name: string, description: string, examples: { arabic: string, english: string }[] }[] }
      return gram.topics.flatMap(topic => topic.examples.map((ex, index) => ({
        id: buildSectionId(lessonId, 'grammar', index + 1),
        arabic: ex.arabic,
        english: ex.english,
        notes: topic.description,
      }))).flat()
    }
    default:
      return []
  }
}

export type SectionItemType = 'dialogue' | 'vocabulary' | 'pronoun' | 'expression' | 'grammar' | 'activity'

export interface SectionItem {
  id: string
  arabic: string
  transliteration?: string
  english?: string
  notes?: string
  audioUrl?: string
  /** For activities: the activity type */
  activityType?: ActivityType
  /** For activities: expected answer / options */
  answer?: string
  options?: string[]
}

export type SectionType =
  | 'dialogue'
  | 'vocabulary'
  | 'pronouns'
  | 'expressions'
  | 'grammar'
  | 'activity'
export interface DialogueLine {
  speaker: string
  arabic: string
  english: string
  notes?: string
}

export interface VocabWord {
  arabic: string
  english: string
  singular?: string
  plural?: string
}

export type SectionContent
  =
  | { type: 'dialogue', scenes: { label: string, lines: DialogueLine[] }[] }
  | { type: 'vocabulary', categories: { label: string, words: VocabWord[] }[] }
  | { type: 'pronouns', pronouns: { arabic: string, english: string, example: string }[] }
  | { type: 'expressions', expressions: { arabic: string, english: string }[] }
  | { type: 'grammar', topics: { name: string, description: string, examples: { arabic: string, english: string }[] }[] }

export type ActivityContent
  =
  | { type: 'listen-translate', dialogue: { [sceneKey: string]: { label: string, arabic: string, english_expected: string } } }
  | { type: 'translate-to-english', sentences: { arabic: string, english_expected: string }[] }
  | { type: 'translate-to-arabic', sentences: { english: string, arabic_expected: string }[] }
  | { type: 'introduce-characters', characters: { name: string, arabic: string, gender: string, sentences: { english: string, arabic_expected: string }[] }[] }
  | { type: 'role-play', scenario: string, expectedElements: string[] }
  | { type: 'fill-blank', prompt: string, answer: string, options?: string[] }
  | { type: 'matching', pairs: { source: string, target: string }[] }

export interface ActivityDefinition {
  id: number
  type: ActivityType
  title: string
  description: string
  order: number
  competencyMap: Record<string, number>
  maxAttempts: number
  content: ActivityContent
}
export type ActivityType
  =
  | 'listen-translate'
  | 'role-play'
  | 'fill-blank'
  | 'matching'
  | 'translate-to-english'
  | 'translate-to-arabic'
  | 'introduce-characters'

// ─── Curricula ──────────────────────────────────────────────────────────

export const curriculum: CurriculumLevel[] = [
  {
    code: 'A1',
    title: 'Beginner',
    arabicTitle: 'المستوى المبتدئ',
    description: 'Memorize ~500 Arabic root words, handle basic everyday interactions with memorized phrases, reduce language-switching, speak at ~20–40 WPM, and read at <30 WPM.',
    lessonRange: 'Lessons 1–10',
    vocabularyCount: '~500',
    speakingWPM: '20–40',
    readingWPM: '<30',
    goal: 'Memorize ~500 Arabic root words, handle basic everyday interactions with memorized phrases, reduce language-switching, speak at ~20–40 WPM, and read at <30 WPM.',
    keySkills: [
      'Greet people and introduce oneself.',
      'Ask and answer simple personal questions (name, age, nationality, how are you).',
      'Talk about family, daily routines, weather, and basic likes/dislikes.',
      'Understand and use basic pronouns and sentence structure (مبتدأ + خبر).',
      'Recognize and read short texts with harakat (vowel marks).',
      'Follow very simple instructions or announcements.'
    ],
    gradient: 'from-teal-700 via-teal-800 to-teal-900',
    lessons: [
      {
        id: 'a1-01',
        title: 'Greetings & Introductions',
        arabicTitle: 'التحيات والتعريف بالنفس',
        description: 'Learn basic Arabic greetings, responses, and how to introduce yourself.',
        sections: [
          {
            name: 'Dialogue',
            type: 'dialogue',
            title: 'Dialogue',
            content: {
              type: 'dialogue',
              scenes: [{
                label: '',
                lines: [
                  { speaker: '', arabic: 'مَرْحَبًا', english: 'Hello', notes: 'Universal greeting, formal and informal' },
                  { speaker: '', arabic: 'كَيْفَ حَالُكَ؟', english: 'How are you? (m.)', notes: 'Used when addressing a male' },
                  { speaker: '', arabic: 'حَمْدًا لِلَّهِ', english: 'Praise be to God / Fine', notes: 'Common polite response' },
                  { speaker: '', arabic: 'شُكْرًا', english: 'Thank you', notes: 'Universal expression of gratitude' }
                ]
              }]
            },
            _lessonId: 'a1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Vocabulary',
            type: 'vocabulary',
            title: 'Vocabulary',
            content: {
              type: 'vocabulary',
              categories: [{
                label: '',
                words: [
                  { arabic: 'صَباحَ الخَيْر', english: 'Good morning', singular: 'Ṣabāḥ al-khayr' },
                  { arabic: 'مَسَاءَ الخَيْر', english: 'Good evening', singular: 'Masāʾ al-khayr' },
                  { arabic: 'مَعَ السَّلَامَة', english: 'Goodbye', singular: 'Maʿa al-salāmah' },
                  { arabic: 'نَعَم', english: 'Yes', singular: 'Naʿam' },
                  { arabic: 'لَا', english: 'No', singular: 'Lā' }
                ]
              }]
            },
            _lessonId: 'a1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Pronouns',
            type: 'pronouns',
            title: 'Pronouns',
            content: {
              type: 'pronouns',
              pronouns: [
                { arabic: 'أَنَا', english: 'I / me', example: 'Anā' },
                { arabic: 'أَنْتَ', english: 'you (m.)', example: 'Anta' },
                { arabic: 'أَنْتِ', english: 'you (f.)', example: 'Anti' },
                { arabic: 'هُوَ', english: 'he', example: 'Huwa' }
              ]
            },
            _lessonId: 'a1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Expressions',
            type: 'expressions',
            title: 'Expressions',
            content: {
              type: 'expressions',
              expressions: [
                { arabic: 'مَا اسْمُكَ؟', english: 'What is your name? (m.)' },
                { arabic: 'أنا من السعودية', english: 'I am from Saudi Arabia' }
              ]
            },
            _lessonId: 'a1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Grammar',
            type: 'grammar',
            title: 'Grammar',
            content: {
              type: 'grammar',
              topics: [{
                name: '',
                description: '',
                examples: [
                  { arabic: 'أنا طالب', english: 'I am a student' },
                  { arabic: 'هذه كتاب', english: 'This is a book' }
                ]
              }]
            },
            _lessonId: 'a1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Activities',
            type: 'grammar',
            title: 'Activities',
            content: { type: 'grammar', topics: [] },
            _lessonId: 'a1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          }
        ],
        competencies: [
          'Can read fluently short paragraphs with harakat',
          'Good understanding of basic salutations',
          'Ability to use pronouns correctly',
          'Differentiates between the pronouns used when talking to the different genders',
          'Grasps the method of forming nominative sentences with pronouns + nouns'
        ],
        sequence: 1,
        activities: [],
      },
      {
        id: 'a1-02',
        title: 'Numbers & Personal Info',
        arabicTitle: 'الأرقام والمعلومات الشخصية',
        description: 'Counting, stating your age, nationality, and basic personal details.',
        sections: [
          {
            name: 'Dialogue',
            type: 'dialogue',
            title: 'Dialogue',
            content: {
              type: 'dialogue',
              scenes: [{
                label: '',
                lines: [
                  { speaker: '', arabic: 'كَمْ عُمْرُكَ؟', english: 'How old are you?', notes: 'Literal: "How much is your age?"' },
                  { speaker: '', arabic: 'عُمْرِي خَمْسَ عَشْرَةَ سَنَةً', english: 'I am fifteen years old.', notes: 'Age uses the word سَنَة (sanah)' }
                ]
              }]
            },
            _lessonId: 'a1-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Vocabulary',
            type: 'vocabulary',
            title: 'Vocabulary',
            content: {
              type: 'vocabulary',
              categories: [{
                label: '',
                words: [
                  { arabic: 'وَاحِد', english: 'One (1)', singular: 'Wāḥid' },
                  { arabic: 'اِثْنَان', english: 'Two (2)', singular: 'Ithnān' },
                  { arabic: 'ثَلَاثَة', english: 'Three (3)', singular: 'Thalāthah' },
                  { arabic: 'أَرْبَعَة', english: 'Four (4)', singular: 'Arbaʿah' },
                  { arabic: 'خَمْسَة', english: 'Five (5)', singular: 'Khamsah' }
                ]
              }]
            },
            _lessonId: 'a1-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Pronouns',
            type: 'pronouns',
            title: 'Pronouns',
            content: {
              type: 'pronouns',
              pronouns: [{ arabic: 'هُمَا', english: 'they two (m./f.)', example: 'Humā' }]
            },
            _lessonId: 'a1-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Expressions',
            type: 'expressions',
            title: 'Expressions',
            content: {
              type: 'expressions',
              expressions: [{ arabic: 'سَاعَة، مِنْ فَضْلِكَ', english: 'One minute, please' }]
            },
            _lessonId: 'a1-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Grammar',
            type: 'grammar',
            title: 'Grammar',
            content: {
              type: 'grammar',
              topics: [{
                name: '',
                description: '',
                examples: [{ arabic: 'لَدَيَّ ثَلَاثُ كُتُب', english: 'I have three books' }]
              }]
            },
            _lessonId: 'a1-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Activities',
            type: 'grammar',
            title: 'Activities',
            content: { type: 'grammar', topics: [] },
            _lessonId: 'a1-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          }
        ],
        activities: []
      }
    ]
  },
  {
    code: 'A2',
    title: 'Elementary',
    arabicTitle: 'المستوى الأساسي',
    description: 'Memorize ~1200 root words, transition from relying on set phrases to constructing your own basic sentences with correct tenses, minimize English usage, speak at ~40–60 WPM, and read at ~30–60 WPM.',
    lessonRange: 'Lessons 11–26',
    vocabularyCount: '~1,200',
    speakingWPM: '40–60',
    readingWPM: '30–60',
    goal: 'Memorize ~1200 root words, transition from relying on set phrases to constructing your own basic sentences with correct tenses, minimize English usage, speak at ~40–60 WPM, and read at ~30–60 WPM.',
    keySkills: [
      'Talk about interest topics (shopping, food, hobbies, travel, and school life).',
      'Give and follow simple directions.',
      'Use present, past, and basic future tense verbs.',
      'Describe people and things using adjectives.',
      'Understand short dialogues and written messages.',
      'Write simple paragraphs about familiar topics.'
    ],
    gradient: 'from-emerald-700 via-emerald-800 to-emerald-900',
    lessons: [
      {
        id: 'a2-01',
        title: 'Daily Routine',
        arabicTitle: 'الروتين اليومي',
        description: 'Talk about daily activities, time, and routines.',
        sections: [
          {
            name: 'Dialogue',
            type: 'dialogue',
            title: 'Dialogue',
            content: {
              type: 'dialogue',
              scenes: [{
                label: '',
                lines: [
                  { speaker: '', arabic: 'أَصْحُو سَادِسَ الصَّبَاح', english: "I wake up at six o'clock.", notes: 'Uses the accusative case for time' },
                  { speaker: '', arabic: 'أَذْهَبُ إِلَى الْمَدْرَسَةِ', english: 'I go to school.' }
                ]
              }]
            },
            _lessonId: 'a2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Vocabulary',
            type: 'vocabulary',
            title: 'Vocabulary',
            content: {
              type: 'vocabulary',
              categories: [{
                label: '',
                words: [
                  { arabic: 'أَكُل', english: 'I eat', singular: 'Akul' },
                  { arabic: 'أَشْرَب', english: 'I drink', singular: 'Ashrab' },
                  { arabic: 'أَنَام', english: 'I sleep', singular: 'Anām' },
                  { arabic: 'أَدْرُس', english: 'I study', singular: 'Adrus' },
                  { arabic: 'أَلْعَب', english: 'I play', singular: 'Alʿab' }
                ]
              }]
            },
            _lessonId: 'a2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Pronouns',
            type: 'pronouns',
            title: 'Pronouns',
            content: {
              type: 'pronouns',
              pronouns: [
                { arabic: 'هُمْ', english: 'they (m.)', example: 'Hum' },
                { arabic: 'هُنَّ', english: 'they (f.)', example: 'Hunna' }
              ]
            },
            _lessonId: 'a2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Expressions',
            type: 'expressions',
            title: 'Expressions',
            content: {
              type: 'expressions',
              expressions: [{ arabic: 'كَيْفَ تَذْهَبُ إِلَى الْمَدْرَسَة؟', english: 'How do you go to school?' }]
            },
            _lessonId: 'a2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Grammar',
            type: 'grammar',
            title: 'Grammar',
            content: {
              type: 'grammar',
              topics: [{
                name: '',
                description: '',
                examples: [{ arabic: 'أَذْهَبُ إِلَى الْمَسْجِد', english: 'I go to the mosque' }]
              }]
            },
            _lessonId: 'a2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Activities',
            type: 'grammar',
            title: 'Activities',
            content: { type: 'grammar', topics: [] },
            _lessonId: 'a2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          }
        ],
        activities: []
      },
      {
        id: 'a2-02',
        title: 'At the Market',
        arabicTitle: 'في السوق',
        description: 'Shopping vocabulary, bargaining, and prices.',
        sections: [
          {
            name: 'Dialogue',
            type: 'dialogue',
            title: 'Dialogue',
            content: {
              type: 'dialogue',
              scenes: [{
                label: '',
                lines: [
                  { speaker: '', arabic: 'بِكَمْ هَٰذَا؟', english: 'How much is this?' },
                  { speaker: '', arabic: 'عَشْرَةُ دَرَاهِم', english: 'Ten dirhams.' }
                ]
              }]
            },
            _lessonId: 'a2-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Vocabulary',
            type: 'vocabulary',
            title: 'Vocabulary',
            content: {
              type: 'vocabulary',
              categories: [{
                label: '',
                words: [
                  { arabic: 'سُوق', english: 'market', singular: 'Sūq' },
                  { arabic: 'سِعْر', english: 'price', singular: 'Siʿr' },
                  { arabic: 'غَالٍ', english: 'expensive', singular: 'Ghālin' },
                  { arabic: 'رَخِيص', english: 'cheap', singular: 'Rakhīṣ' },
                  { arabic: 'شِرَاء', english: 'purchase', singular: 'Sharāʾ' }
                ]
              }]
            },
            _lessonId: 'a2-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Pronouns',
            type: 'pronouns',
            title: 'Pronouns',
            content: { type: 'pronouns', pronouns: [] },
            _lessonId: 'a2-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Expressions',
            type: 'expressions',
            title: 'Expressions',
            content: {
              type: 'expressions',
              expressions: [{ arabic: 'هَلْ تُمْكِنُكَ تَخْفِيضُ السِّعْر؟', english: 'Can you lower the price?' }]
            },
            _lessonId: 'a2-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Grammar',
            type: 'grammar',
            title: 'Grammar',
            content: {
              type: 'grammar',
              topics: [{
                name: '',
                description: '',
                examples: [{ arabic: 'أُرِيدُ أَنْ أَشْرَبَ مَاء', english: 'I want to drink water' }]
              }]
            },
            _lessonId: 'a2-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Activities',
            type: 'grammar',
            title: 'Activities',
            content: { type: 'grammar', topics: [] },
            _lessonId: 'a2-02',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          }
        ],
        activities: []
      }
    ]
  },
  {
    code: 'B1',
    title: 'Conversational',
    arabicTitle: 'المستوى المتوسط',
    description: 'Memorize ~2500 root words, form coherent sentences with fewer errors in gender and tense, participate in everyday discussions fully in Arabic, speak at ~60–90 WPM, and read at ~60–100 WPM.',
    lessonRange: 'Lessons 27–46',
    vocabularyCount: '~2,500',
    speakingWPM: '60–90',
    readingWPM: '60–100',
    goal: 'Memorize ~2500 root words, form coherent sentences with fewer errors in gender and tense, participate in everyday discussions fully in Arabic, speak at ~60–90 WPM, and read at ~60–100 WPM.',
    keySkills: [
      'Describe past experiences, events, and future plans.',
      'Talk about opinions, preferences, and feelings using sentence connectors ولذلك، ومن ثم.',
      'Understand the main idea of news, stories, and Islamic reminders.',
      'Use complex sentence structures (duals, plurals, attached pronouns, etc.).',
      'Read and understand unwoveled short texts.',
      'Write coherent texts like emails, messages, and personal reflections.'
    ],
    gradient: 'from-cyan-700 via-cyan-800 to-cyan-900',
    lessons: [
      {
        id: 'b1-01',
        title: 'Travel Plans',
        arabicTitle: 'خطط السفر',
        description: 'Discussing travel destinations, bookings, and arrangements.',
        sections: [
          {
            name: 'Dialogue',
            type: 'dialogue',
            title: 'Dialogue',
            content: {
              type: 'dialogue',
              scenes: [{
                label: '',
                lines: [
                  { speaker: '', arabic: 'أُرِيدُ أَنْ أُسَافِرَ إِلَى القَاهِرَة', english: 'I want to travel to Cairo.' },
                  { speaker: '', arabic: 'هَلْ حَجَزْتَ فُنْكَةً؟', english: 'Have you booked a hotel?' }
                ]
              }]
            },
            _lessonId: 'b1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Vocabulary',
            type: 'vocabulary',
            title: 'Vocabulary',
            content: {
              type: 'vocabulary',
              categories: [{
                label: '',
                words: [
                  { arabic: 'مَطَار', english: 'airport', singular: 'Maṭār' },
                  { arabic: 'تِكْتُه', english: 'ticket', singular: 'Tiklah' },
                  { arabic: 'حِجْز', english: 'booking', singular: 'Ḥijz' },
                  { arabic: 'وِزَارَة', english: 'ministry', singular: 'Wizārah' },
                  { arabic: 'جَوَّال', english: 'mobile phone', singular: 'Jawwāl' }
                ]
              }]
            },
            _lessonId: 'b1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Pronouns',
            type: 'pronouns',
            title: 'Pronouns',
            content: { type: 'pronouns', pronouns: [] },
            _lessonId: 'b1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Expressions',
            type: 'expressions',
            title: 'Expressions',
            content: {
              type: 'expressions',
              expressions: [{ arabic: 'أَيْنَ الوَقْف؟', english: 'Where is the stop?' }]
            },
            _lessonId: 'b1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Grammar',
            type: 'grammar',
            title: 'Grammar',
            content: {
              type: 'grammar',
              topics: [{
                name: '',
                description: '',
                examples: [{ arabic: 'إِذَا سَافَرْتَ، خُذْ جَوَّابَكَ', english: 'If you travel, take your phone' }]
              }]
            },
            _lessonId: 'b1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Activities',
            type: 'grammar',
            title: 'Activities',
            content: { type: 'grammar', topics: [] },
            _lessonId: 'b1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          }
        ],
        activities: []
      }
    ]
  },
  {
    code: 'B2',
    title: 'Fluent',
    arabicTitle: 'المستوى المتقدم',
    description: 'Memorize ~4000 root words, confidently construct near-perfect sentences, comprehend complex Islamic lectures and Tafsir, speak at ~90–120 WPM, and read at ~100–150 WPM without English reliance.',
    lessonRange: 'Lessons 47–70',
    vocabularyCount: '~4,000',
    speakingWPM: '90–120',
    readingWPM: '100–150',
    goal: 'Memorize ~4000 root words, confidently construct near-perfect sentences, comprehend complex Islamic lectures and Tafsir, speak at ~90–120 WPM, and read at ~100–150 WPM without English reliance.',
    keySkills: [
      'Follow and contribute to discussions on religion, culture, and abstract ideas.',
      'Understand khutbahs, tafsir explanations, and Islamic lectures.',
      'Express and defend opinions clearly in debates or long conversations.',
      'Read and analyze articles or stories with deeper meaning.',
      'Speak fluently without relying on translation.',
      'Write structured essays, summaries, and arguments.'
    ],
    gradient: 'from-sky-700 via-sky-800 to-sky-900',
    lessons: [
      {
        id: 'b2-01',
        title: 'Technology & Society',
        arabicTitle: 'التكنولوجيا والمجتمع',
        description: 'Discussing technology\'s impact on society and daily life.',
        sections: [
          {
            name: 'Dialogue',
            type: 'dialogue',
            title: 'Dialogue',
            content: {
              type: 'dialogue',
              scenes: [{
                label: '',
                lines: [
                  { speaker: '', arabic: 'التِّكْنُولُوجْيَا غَيَّرَتْ حَيَاتِنَا', english: 'Technology has changed our lives.' },
                  { speaker: '', arabic: 'نَعَم، وَلَكِنَّهَا جَاءَتْ بِمُشْكِلات', english: 'Yes, but it brought problems.' }
                ]
              }]
            },
            _lessonId: 'b2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Vocabulary',
            type: 'vocabulary',
            title: 'Vocabulary',
            content: {
              type: 'vocabulary',
              categories: [{
                label: '',
                words: [
                  { arabic: 'إِنْتِرْنِت', english: 'internet', singular: 'Intirnīt' },
                  { arabic: 'حَاسُوب', english: 'computer', singular: 'Ḥāsūb' },
                  { arabic: 'مِعْلُومَات', english: 'information', singular: 'Maʿlūmāt' },
                  { arabic: 'أَمْن', english: 'security', singular: 'Amn' },
                  { arabic: 'خَاصَّة', english: 'privacy', singular: 'Khāṣṣah' }
                ]
              }]
            },
            _lessonId: 'b2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Pronouns',
            type: 'pronouns',
            title: 'Pronouns',
            content: { type: 'pronouns', pronouns: [] },
            _lessonId: 'b2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Expressions',
            type: 'expressions',
            title: 'Expressions',
            content: {
              type: 'expressions',
              expressions: [{ arabic: 'بِحَسَبِي، التِّكْنُولُوجْيَا نَافِعَة', english: 'In my opinion, technology is beneficial' }]
            },
            _lessonId: 'b2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Grammar',
            type: 'grammar',
            title: 'Grammar',
            content: {
              type: 'grammar',
              topics: [{
                name: '',
                description: '',
                examples: [{ arabic: 'لَوْ كَانَ الْإِنْسَانُ أَعْقَلَ، لَمْ يَتْرُكْ الطَّبِيعَة', english: 'If humans were wiser, they would not destroy nature' }]
              }]
            },
            _lessonId: 'b2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Activities',
            type: 'grammar',
            title: 'Activities',
            content: { type: 'grammar', topics: [] },
            _lessonId: 'b2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          }
        ],
        activities: []
      }
    ]
  },
  {
    code: 'C1',
    title: 'Advanced',
    arabicTitle: 'المستوى المتقدم جداً',
    description: 'Professional Arabic: literature, journalism, and academia.',
    lessonRange: 'Lessons 71–85',
    vocabularyCount: '~5,500',
    speakingWPM: '120–150',
    readingWPM: '150–200',
    goal: 'Memorize ~5500 root words, produce sophisticated academic and professional Arabic, read and analyze classical texts, speak at ~120–150 WPM, and read at ~150–200 WPM.',
    keySkills: [
      'Write academic essays and research summaries in Modern Standard Arabic.',
      'Understand and discuss classical Arabic literature and poetry.',
      'Participate in formal debates and professional discussions.',
      'Read and analyze classical Arabic texts without transliteration.',
      'Produce written Arabic suitable for professional and academic contexts.',
      'Understand regional dialect variations and code-switching.'
    ],
    gradient: 'from-indigo-700 via-indigo-800 to-indigo-900',
    lessons: [
      {
        id: 'c1-01',
        title: 'Literary Arabic',
        arabicTitle: 'الأدب العربي',
        description: 'Classical Arabic poetry, prose, and rhetoric.',
        sections: [
          {
            name: 'Dialogue',
            type: 'dialogue',
            title: 'Dialogue',
            content: {
              type: 'dialogue',
              scenes: [{
                label: '',
                lines: [{ speaker: '', arabic: 'الشِّعْر الْجَاهِلِيَّة كَانَتْ مُفْصَّلَة', english: 'Pre-Islamic poetry was detailed.' }]
              }]
            },
            _lessonId: 'c1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Vocabulary',
            type: 'vocabulary',
            title: 'Vocabulary',
            content: {
              type: 'vocabulary',
              categories: [{
                label: '',
                words: [
                  { arabic: 'شِعْر', english: 'poetry', singular: 'Shiʿr' },
                  { arabic: 'نَثْر', english: 'prose', singular: 'Nathr' },
                  { arabic: 'بَلَاغَة', english: 'rhetoric', singular: 'Balāghah' },
                  { arabic: 'بَدِيع', english: 'imaginative writing', singular: 'Badīʿ' },
                  { arabic: 'مَعَانِي', english: 'semantics', singular: 'Maʿānī' }
                ]
              }]
            },
            _lessonId: 'c1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Pronouns',
            type: 'pronouns',
            title: 'Pronouns',
            content: { type: 'pronouns', pronouns: [] },
            _lessonId: 'c1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Expressions',
            type: 'expressions',
            title: 'Expressions',
            content: { type: 'expressions', expressions: [] },
            _lessonId: 'c1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Grammar',
            type: 'grammar',
            title: 'Grammar',
            content: {
              type: 'grammar',
              topics: [{
                name: '',
                description: '',
                examples: [{ arabic: 'كُنْتُ أَكْتُبُ كُلَّ يَوْم', english: 'I used to write every day' }]
              }]
            },
            _lessonId: 'c1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Activities',
            type: 'grammar',
            title: 'Activities',
            content: { type: 'grammar', topics: [] },
            _lessonId: 'c1-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          }
        ],
        activities: []
      }
    ]
  },
  {
    code: 'C2',
    title: 'Proficiency',
    arabicTitle: 'إتقان اللغة',
    description: 'Near-native fluency: nuance, humor, and cultural references.',
    lessonRange: 'Lessons 86–100',
    vocabularyCount: '~7,000',
    speakingWPM: '150+',
    readingWPM: '200+',
    goal: 'Memorize ~7000 root words, achieve near-native fluency in Modern Standard Arabic, comprehend and produce advanced academic, religious, and professional content, speak at ~150+ WPM, and read at ~200+ WPM.',
    keySkills: [
      'Master all Arabic grammatical structures including rare and classical forms.',
      'Produce original Arabic writing at a professional or academic level.',
      'Understand and discuss advanced Islamic scholarship (Tafsir, Fiqh, Hadith).',
      'Navigate all Arabic dialects with ease and code-switch naturally.',
      'Read and analyze classical Arabic texts, poetry, and literature fluently.',
      'Teach or explain Arabic grammar and usage to others.'
    ],
    gradient: 'from-violet-700 via-violet-900',
    lessons: [
      {
        id: 'c2-01',
        title: 'Modern Standard Mastery',
        arabicTitle: 'إتقان الفصحى',
        description: 'Advanced discourse, debate, and cultural fluency.',
        sections: [
          {
            name: 'Dialogue',
            type: 'dialogue',
            title: 'Dialogue',
            content: {
              type: 'dialogue',
              scenes: [{
                label: '',
                lines: [{ speaker: '', arabic: 'اللُّغَة العَرَبِيَّة أَسْمَكُ اللُّغَات', english: 'Arabic is the richest of languages.' }]
              }]
            },
            _lessonId: 'c2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Vocabulary',
            type: 'vocabulary',
            title: 'Vocabulary',
            content: {
              type: 'vocabulary',
              categories: [{
                label: '',
                words: [
                  { arabic: 'إِطْنَاب', english: 'ellipsis', singular: 'Iṭnāb' },
                  { arabic: 'تَضَادّ', english: 'antonymy', singular: 'Taḍādd' },
                  { arabic: 'مُضَارَعَة', english: 'derivation', singular: 'Muḍārah' },
                  { arabic: 'تَرْجَمَة', english: 'translation', singular: 'Tarjamah' },
                  { arabic: 'تَرْبِيب', english: 'arrangement/rhetoric', singular: 'Tarbīb' }
                ]
              }]
            },
            _lessonId: 'c2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Pronouns',
            type: 'pronouns',
            title: 'Pronouns',
            content: { type: 'pronouns', pronouns: [] },
            _lessonId: 'c2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Expressions',
            type: 'expressions',
            title: 'Expressions',
            content: { type: 'expressions', expressions: [] },
            _lessonId: 'c2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Grammar',
            type: 'grammar',
            title: 'Grammar',
            content: {
              type: 'grammar',
              topics: [{
                name: '',
                description: '',
                examples: [{ arabic: 'لَوْ لَا الْكِتَابُ لَمَا عَرَفْنَا', english: 'Were it not for the book, we would not have known' }]
              }]
            },
            _lessonId: 'c2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          },
          {
            name: 'Activities',
            type: 'grammar',
            title: 'Activities',
            content: { type: 'grammar', topics: [] },
            _lessonId: 'c2-01',
            get items(): SectionItem[] { return flattenSectionContent(this.content, this._lessonId) }
          }
        ],
        activities: []
      }
    ]
  }
]

// ─── Lookup helpers ─────────────────────────────────────────────────────

/** Get a level by its code (e.g., 'A1'). */
export function getLevelByCode(code: string): CurriculumLevel | undefined {
  return curriculum.find(l => l.code.toLowerCase() === code.toLowerCase())
}

/** Get a lesson by its ID (e.g., 'a1-01'). */
export function getLessonById(id: string): LessonDefinition | undefined {
  for (const level of curriculum) {
    const lesson = level.lessons.find(l => l.id === id)
    if (lesson) return lesson
  }
  return undefined
}

/** Get the level that contains a given lesson ID. */
export function getLevelForLesson(lessonId: string): CurriculumLevel | undefined {
  return curriculum.find(l => l.lessons.some(l => l.id === lessonId))
}

/** Get all lessons across all levels (flat list). */
export function getAllLessons(): LessonDefinition[] {
  return curriculum.flatMap(l => l.lessons)
}

/** Get total lesson count across all levels. */
export function getTotalLessonCount(): number {
  return curriculum.reduce((sum, l) => sum + l.lessons.length, 0)
}
