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
  activity: 'a'
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
        notes: line.notes
      }))
    }
    case 'vocabulary': {
      const vocab = content as { type: 'vocabulary', categories: { label: string, words: VocabWord[] }[] }
      return vocab.categories.flatMap(cat => cat.words).map((word, index) => ({
        id: buildSectionId(lessonId, 'vocabulary', index + 1),
        arabic: word.arabic,
        english: word.english,
        notes: word.singular ?? word.plural
      }))
    }
    case 'pronouns': {
      const pron = content as { type: 'pronouns', pronouns: { arabic: string, english: string, example: string }[] }
      return pron.pronouns.map((p, index) => ({
        id: buildSectionId(lessonId, 'pronouns', index + 1),
        arabic: p.arabic,
        english: p.english,
        notes: p.example
      }))
    }
    case 'expressions': {
      const expr = content as { type: 'expressions', expressions: { arabic: string, english: string }[] }
      return expr.expressions.map((e, index) => ({
        id: buildSectionId(lessonId, 'expressions', index + 1),
        arabic: e.arabic,
        english: e.english
      }))
    }
    case 'grammar': {
      const gram = content as { type: 'grammar', topics: { name: string, description: string, examples: { arabic: string, english: string }[] }[] }
      let globalIndex = 0
      return gram.topics.flatMap(topic => topic.examples.map((ex) => {
        const id = buildSectionId(lessonId, 'grammar', globalIndex + 1)
        globalIndex++
        return {
          id,
          arabic: ex.arabic,
          english: ex.english,
          notes: topic.description
        }
      })).flat()
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

export type SectionType
  = | 'dialogue'
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
  = | { type: 'dialogue', scenes: { label: string, lines: DialogueLine[] }[] }
    | { type: 'vocabulary', categories: { label: string, words: VocabWord[] }[] }
    | { type: 'pronouns', pronouns: { arabic: string, english: string, example: string }[] }
    | { type: 'expressions', expressions: { arabic: string, english: string }[] }
    | { type: 'grammar', topics: { name: string, description: string, examples: { arabic: string, english: string }[] }[] }

export type ActivityContent
  = | { type: 'listen-translate', dialogue: { [sceneKey: string]: { label: string, arabic: string, english_expected: string } } }
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
  = | 'listen-translate'
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
                label: 'Scene 1: Muhammad ↔ Ali (Male-to-Male)',
                lines: [
                  { speaker: 'Muhammad', arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ', english: 'Peace be upon you and Allah\'s mercy', notes: 'Formal Islamic greeting' },
                  { speaker: 'Ali', arabic: 'وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ', english: 'And upon you be peace and Allah\'s mercy and blessings', notes: 'Complete response — adds \'and His blessings\'' },
                  { speaker: 'Muhammad', arabic: 'كَيْفَ حَالُكَ يَا أَخِي؟', english: 'How are you? (asking a male)', notes: 'أَخِي = my brother (male address)' },
                  { speaker: 'Ali', arabic: 'اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ، شُكْرًا. وَكَيْفَ حَالُكَ؟', english: 'All praise be to Allah, I am fine, thank you. And how are you?', notes: 'Standard positive response' },
                  { speaker: 'Muhammad', arabic: 'اَلْحَمْدُ لِلَّهِ، أَنَا أَيْضًا بِخَيْرٍ. مَرْحَبًا بِكَ فِي مَسْجِدِنَا', english: 'All praise be to Allah, I am fine as well. Welcome to our mosque.', notes: 'مَرْحَبًا بِكَ = welcome (addressing male)' }
                ]
              }, {
                label: 'Scene 2: Khadija ↔ Aisha (Female-to-Female)',
                lines: [
                  { speaker: 'Khadija', arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ', english: 'Peace be upon you and Allah\'s mercy', notes: 'Same greeting, gender-neutral' },
                  { speaker: 'Aisha', arabic: 'وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ', english: 'And upon you be peace and Allah\'s mercy and blessings', notes: 'Same complete response' },
                  { speaker: 'Khadija', arabic: 'كَيْفَ حَالُكِ يَا أُخْتِي؟', english: 'How are you? (asking a female)', notes: 'أُخْتِي = my sister; حَالُكِ = your state (female)' },
                  { speaker: 'Aisha', arabic: 'اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ، شُكْرًا. وَكَيْفَ حَالُكِ؟', english: 'All praise be to Allah, I am fine, thank you. And how are you?', notes: 'Same response, gender-neutral' },
                  { speaker: 'Khadija', arabic: 'اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ أَيْضًا. مَرْحَبًا بِكِ فِي بَيْتِنَا', english: 'All praise be to Allah, I am fine as well. Welcome to our house.', notes: 'مَرْحَبًا بِكِ = welcome (addressing female)' }
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
                label: 'Salutations',
                words: [
                  { arabic: 'تَحِيَّة', english: 'salutation/greeting', singular: 'تَحِيَّة', plural: 'تَحِيَاتٌ' },
                  { arabic: 'سَلَام', english: 'peace', singular: 'سَلَام', plural: 'سُلُومٌ' }
                ]
              }, {
                label: 'Nouns',
                words: [
                  { arabic: 'دَرْس', english: 'lesson', singular: 'دَرْس', plural: 'دُرُوسٌ' },
                  { arabic: 'أَوَّل', english: 'first', singular: 'أَوَّل', plural: 'أَوَّلُونَ' },
                  { arabic: 'مَسْجِد', english: 'mosque', singular: 'مَسْجِد', plural: 'مَسَاجِد' },
                  { arabic: 'بَيْت', english: 'house', singular: 'بَيْت', plural: 'بُيُوت' }
                ]
              }, {
                label: 'Key Words',
                words: [
                  { arabic: 'كَيْف', english: 'how' },
                  { arabic: 'فِي', english: 'in' }
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
                { arabic: 'أَنَا', english: 'I', example: 'أَنَا أَخٌ / أُخْت' },
                { arabic: 'أَنْتَ', english: 'you (male)', example: 'أَنْتَ أَخ' },
                { arabic: 'أَنْتِ', english: 'you (female)', example: 'أَنْتِ أُخْت' },
                { arabic: 'نَحْنُ', english: 'we', example: 'نَحْنُ إِخْوَةٌ / أُخَوَات' },
                { arabic: 'أَنْتُمَا', english: 'you (dual)', example: 'أَنْتُمَا أَخَوَانِ / أُخْتَانِ' },
                { arabic: 'أَنْتُمْ', english: 'you (male plural)', example: 'أَنْتُمْ إِخْوَة' },
                { arabic: 'أَنْتُنَّ', english: 'you (female plural)', example: 'أَنْتُنَّ أُخَوَات' },
                { arabic: 'هُوَ', english: 'he', example: 'هُوَ أَخ' },
                { arabic: 'هِيَ', english: 'she', example: 'هِيَ أُخْت' },
                { arabic: 'هُمَا', english: 'they (dual)', example: 'هُمَا أَخَوَانِ / أُخْتَانِ' },
                { arabic: 'هُمْ', english: 'they (male)', example: 'هُمْ إِخْوَة' },
                { arabic: 'هُنَّ', english: 'they (female)', example: 'هُنَّ أُخَوَات' }
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
                { arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ', english: 'Peace be upon you and Allah\'s mercy' },
                { arabic: 'وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ', english: 'And upon you be peace and Allah\'s mercy and blessings' },
                { arabic: 'كَيْفَ حَالُكَ؟', english: 'How are you? (male)' },
                { arabic: 'كَيْفَ حَالُكِ؟', english: 'How are you? (female)' },
                { arabic: 'يَا أَخِي', english: 'Oh! My brother' },
                { arabic: 'يَا أُخْتِي', english: 'Oh! My sister' },
                { arabic: 'اَلْحَمْدُ لِلَّهِ', english: 'All praise be to Allah' },
                { arabic: 'أَنَا بِخَيْرٍ، شُكْرًا', english: 'I am fine, thank you' },
                { arabic: 'أَنَا بِخَيْرٍ أَيْضًا', english: 'I am fine as well' },
                { arabic: 'مَرْحَبًا بِكَ', english: 'Welcome (male)' },
                { arabic: 'مَرْحَبًا بِكِ', english: 'Welcome (female)' },
                { arabic: 'مَا اسْمُكَ؟', english: 'What is your name? (male)' },
                { arabic: 'مَا اسْمُكِ؟', english: 'What is your name? (female)' },
                { arabic: 'اسْمِي ...', english: 'My name is ...' },
                { arabic: 'مِنْ أَيْنَ أَنْتَ؟', english: 'Where are you from?' },
                { arabic: 'إِلَى اللِّقَاء', english: 'Until next time' }
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
              topics: [
                {
                  name: 'Nominative Sentences (الجملة الاسمية)',
                  description: 'A sentence starting with a noun (ism) followed by a predicate (khabar). Common pattern: Pronoun + Noun/Adjective',
                  examples: [
                    { arabic: 'أَنَا مُسْلِم', english: 'I am a Muslim' },
                    { arabic: 'هُوَ أَخِي', english: 'He is my brother' },
                    { arabic: 'هِيَ أُخْتِي', english: 'She is my sister' },
                    { arabic: 'نَحْنُ مُسْلِمُونَ', english: 'We are Muslims' }
                  ]
                },
                {
                  name: 'Gender Agreement in Pronouns',
                  description: 'Arabic pronouns encode gender. The verb/adjective must match the pronoun\'s gender.',
                  examples: [
                    { arabic: 'كَيْفَ حَالُكَ؟', english: 'How are you? (to male) — حَالُكَ uses masculine suffix' },
                    { arabic: 'كَيْفَ حَالُكِ؟', english: 'How are you? (to female) — حَالُكِ uses feminine suffix' },
                    { arabic: 'مَرْحَبًا بِكَ', english: 'Welcome (to male)' },
                    { arabic: 'مَرْحَبًا بِكِ', english: 'Welcome (to female)' }
                  ]
                },
                {
                  name: 'Number: Singular, Dual, Plural',
                  description: 'Arabic has three numbers: singular (مفرد), dual (ثنائي), and plural (جمع).',
                  examples: [
                    { arabic: 'أَخ', english: 'brother (singular)' },
                    { arabic: 'أَخَوَانِ / أُخْتَانِ', english: 'two brothers / two sisters (dual)' },
                    { arabic: 'إِخْوَة / أُخَوَات', english: 'brothers (m.pl.) / sisters (f.pl.)' }
                  ]
                }
              ]
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
        activities: [
          {
            id: 1,
            type: 'listen-translate',
            title: 'Read the Dialogue & Translate',
            description: 'Read the Arabic dialogue, then translate it to English.',
            order: 1,
            competencyMap: {
              read_fluently_with_harakat: 0.4,
              understand_basic_salutations: 0.3
            },
            maxAttempts: 3,
            content: {
              type: 'listen-translate',
              dialogue: {
                scene1: {
                  label: 'Muhammad ↔ Ali',
                  arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ — وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ — كَيْفَ حَالُكَ يَا أَخِي؟ — اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ، شُكْرًا. وَكَيْفَ حَالُكَ؟ — اَلْحَمْدُ لِلَّهِ، أَنَا أَيْضًا بِخَيْرٍ. مَرْحَبًا بِكَ فِي مَسْجِدِنَا',
                  english_expected: 'Peace be upon you and Allah\'s mercy — And upon you be peace and Allah\'s mercy and blessings — How are you? (my brother) — All praise be to Allah, I am fine, thank you. And how are you? — All praise be to Allah, I am fine as well. Welcome to our mosque.'
                },
                scene2: {
                  label: 'Khadija ↔ Aisha',
                  arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ — وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ — كَيْفَ حَالُكِ يَا أُخْتِي؟ — اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ، شُكْرًا. وَكَيْفَ حَالُكِ؟ — اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ أَيْضًا. مَرْحَبًا بِكِ فِي بَيْتِنَا',
                  english_expected: 'Peace be upon you and Allah\'s mercy — And upon you be peace and Allah\'s mercy and blessings — How are you? (my sister) — All praise be to Allah, I am fine, thank you. And how are you? — All praise be to Allah, I am fine as well. Welcome to our house.'
                }
              }
            }
          },
          {
            id: 2,
            type: 'translate-to-english',
            title: 'Translate Sentences to English',
            description: 'Translate the following Arabic sentences into English.',
            order: 2,
            competencyMap: {
              understand_basic_salutations: 0.5,
              use_pronouns_correctly: 0.5
            },
            maxAttempts: 3,
            content: {
              type: 'translate-to-english',
              sentences: [
                { arabic: 'أَنَا مُسْلِمٌ', english_expected: 'I am a Muslim' },
                { arabic: 'أَنْتَ مُسْلِمٌ', english_expected: 'You are a Muslim (male)' },
                { arabic: 'أَنَا عَائِشَةُ، وَأَنَا مُسْلِمَةٌ', english_expected: 'I am Aisha, and I am a Muslim (female)' },
                { arabic: 'نَحْنُ مُسْلِمُونَ', english_expected: 'We are Muslims' },
                { arabic: 'هُمْ مُسْلِمُونَ', english_expected: 'They (males) are Muslims' },
                { arabic: 'هُوَ أَخِي', english_expected: 'He is my brother' },
                { arabic: 'هِيَ أُخْتِي', english_expected: 'She is my sister' }
              ]
            }
          },
          {
            id: 3,
            type: 'translate-to-arabic',
            title: 'Translate Sentences to Arabic',
            description: 'Translate the following English sentences into Arabic with harakat.',
            order: 3,
            competencyMap: {
              use_pronouns_correctly: 0.5,
              form_nominative_sentences: 0.5
            },
            maxAttempts: 3,
            content: {
              type: 'translate-to-arabic',
              sentences: [
                { english: 'I am Ahmad, and I am a Muslim', arabic_expected: 'أَنَا أَحْمَد، وَأَنَا مُسْلِم' },
                { english: 'You (male) are a Muslim', arabic_expected: 'أَنْتَ مُسْلِم' },
                { english: 'I am Aisha, and I am a Muslim', arabic_expected: 'أَنَا عَائِشَةُ، وَأَنَا مُسْلِمَةٌ' },
                { english: 'We are Muslims', arabic_expected: 'نَحْنُ مُسْلِمُونَ' },
                { english: 'They (males) are Muslims', arabic_expected: 'هُمْ مُسْلِمُونَ' },
                { english: 'You (females) are Muslims', arabic_expected: 'أَنْتُنَّ مُسْلِمَات' },
                { english: 'You (two) are Muslims', arabic_expected: 'أَنْتُمَا مُسْلِمَان' }
              ]
            }
          },
          {
            id: 4,
            type: 'introduce-characters',
            title: 'Introduce the Characters',
            description: 'Introduce these characters to your teacher using proper Arabic sentences.',
            order: 4,
            competencyMap: {
              differentiate_pronouns_by_gender: 0.6,
              form_nominative_sentences: 0.4
            },
            maxAttempts: 3,
            content: {
              type: 'introduce-characters',
              characters: [
                { name: 'Muhammad', arabic: 'مُحَمَّد', gender: 'male', sentences: [
                  { english: 'He is Muhammad', arabic_expected: 'هُوَ مُحَمَّد' },
                  { english: 'They are Muhammad and Aisha', arabic_expected: 'هُمَا مُحَمَّدٌ وَعَائِشَةُ' },
                  { english: 'They are Muslims', arabic_expected: 'هُمْ مُسْلِمُونَ' }
                ] },
                { name: 'Aisha', gender: 'female', arabic: 'عَائِشَةُ', sentences: [
                  { english: 'She is Aisha', arabic_expected: 'هِيَ عَائِشَةُ' },
                  { english: 'They (females) are Muslims', arabic_expected: 'هُنَّ مُسْلِمَات' }
                ] }
              ]
            }
          },
          {
            id: 5,
            type: 'role-play',
            title: 'Role-Play: Introduce Yourself',
            description: 'Role-play with your teacher and introduce yourself using what you\'ve learned.',
            order: 5,
            competencyMap: {
              use_pronouns_correctly: 0.3,
              differentiate_pronouns_by_gender: 0.3,
              understand_basic_salutations: 0.4
            },
            maxAttempts: 3,
            content: {
              type: 'role-play',
              scenario: 'You meet someone new at the mosque. Exchange greetings, introduce yourself, and ask how they are.',
              expectedElements: [
                'Greeting (السَّلَامُ عَلَيْكُمْ)',
                'Response (وَعَلَيْكُمُ السَّلَام)',
                'Self-introduction (أَنَا ...)',
                'Asking how they are (كَيْفَ حَالُكَ/حَالُكِ؟)',
                'Response (اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ)'
              ]
            }
          }
        ]
      },
      {
        id: 'a1-02',
        arabicTitle: 'الأرقام والمعلومات الشخصية',
        title: 'Numbers & Personal Info',
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
                  { speaker: '', arabic: 'أَصْحُو سَادِسَ الصَّبَاح', english: 'I wake up at six o\'clock.', notes: 'Uses the accusative case for time' },
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
/**
 * Returns all activities for a given lesson.
 * @deprecated — used when activity rendering component is built (Phase 2+).
 * Returns 5 activities for 'a1-01', [] for all others.
 */
export function getActivitiesByLesson(lessonId: string): ActivityDefinition[] {
  const lesson = getLessonById(lessonId)
  return lesson?.activities ?? []
}
