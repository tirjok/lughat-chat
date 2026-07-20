import type {
  IntroduceCharactersActivityContent,
  ListenTranslateActivityContent,
  RolePlayActivityContent,
  TranslateActivityContent
} from '../composables/useLessons'

/** Type guard: content is ListenTranslateActivityContent. */
export function isListenTranslateContent(
  content: unknown
): content is ListenTranslateActivityContent {
  return (
    content !== null
    && typeof content === 'object'
    && 'dialogue' in content
  )
}

/** Type guard: content is TranslateActivityContent. */
export function isTranslateContent(
  content: unknown
): content is TranslateActivityContent {
  return (
    content !== null
    && typeof content === 'object'
    && 'sentences' in content
  )
}

/** Type guard: content is IntroduceCharactersActivityContent. */
export function isIntroduceCharactersContent(
  content: unknown
): content is IntroduceCharactersActivityContent {
  return (
    content !== null
    && typeof content === 'object'
    && 'characters' in content
  )
}

/** Type guard: content is RolePlayActivityContent. */
export function isRolePlayContent(
  content: unknown
): content is RolePlayActivityContent {
  return (
    content !== null
    && typeof content === 'object'
    && 'scenario' in content
  )
}
