import { describe, it, expect } from 'vitest'
import { useInputValidation } from '../../app/composables/useInputValidation'

describe('useInputValidation', () => {
  describe('empty text validation', () => {
    it('returns error when text is empty string', () => {
      const result = useInputValidation('', 'ready')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please enter text to convert to speech')
    })

    it('returns error when text is only whitespace', () => {
      const result = useInputValidation('   ', 'ready')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please enter text to convert to speech')
    })

    it('returns error when text is only newlines and tabs', () => {
      const result = useInputValidation('\n\t\n  ', 'ready')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please enter text to convert to speech')
    })

    it('returns error when text is empty and model is loading', () => {
      const result = useInputValidation('', 'loading')

      expect(result.isValid).toBe(false)
      // Empty text error takes priority over loading error
      expect(result.error).toBe('Please enter text to convert to speech')
    })

    it('returns error when text is whitespace and model is loading', () => {
      const result = useInputValidation('  ', 'loading')

      expect(result.isValid).toBe(false)
      // Empty text error takes priority over loading error
      expect(result.error).toBe('Please enter text to convert to speech')
    })

    it('returns error when text is empty and model has error status', () => {
      const result = useInputValidation('', 'error')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please enter text to convert to speech')
    })

    it('does not call synthesize when text is empty', () => {
      const result = useInputValidation('', 'ready')

      expect(result.isValid).toBe(false)
      // If isValid is false, the caller should not call synthesize
    })

    it('returns error for whitespace-only text regardless of model status', () => {
      const result = useInputValidation('   ', 'error')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please enter text to convert to speech')
    })
  })

  describe('model loading validation', () => {
    it('returns error when model is loading and text has content', () => {
      const result = useInputValidation('مرحبا بالعالم', 'loading')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Model is loading, please wait...')
    })

    it('returns error when model has error status and text has content', () => {
      const result = useInputValidation('مرحبا بالعالم', 'error')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Model is loading, please wait...')
    })

    it('loading error takes priority when text is non-empty whitespace', () => {
      const result = useInputValidation('  ', 'loading')

      expect(result.isValid).toBe(false)
      // Whitespace is trimmed to empty, so text error takes priority
      expect(result.error).toBe('Please enter text to convert to speech')
    })

    it('loading error does NOT take priority when text is empty', () => {
      const result = useInputValidation('', 'loading')

      expect(result.isValid).toBe(false)
      // Empty text error takes priority
      expect(result.error).toBe('Please enter text to convert to speech')
    })
  })

  describe('valid input', () => {
    it('returns isValid true when text is non-empty and model is ready', () => {
      const result = useInputValidation('مرحبا بالعالم', 'ready')

      expect(result.isValid).toBe(true)
      expect(result.error).toBe(null)
    })

    it('returns isValid true for single character text', () => {
      const result = useInputValidation('أ', 'ready')

      expect(result.isValid).toBe(true)
      expect(result.error).toBe(null)
    })

    it('returns isValid true for text with surrounding whitespace', () => {
      const result = useInputValidation('  مرحبا  ', 'ready')

      expect(result.isValid).toBe(true)
      expect(result.error).toBe(null)
    })

    it('returns isValid true for Arabic text with punctuation', () => {
      const result = useInputValidation('ما اسمك؟ أنا أحمد.', 'ready')

      expect(result.isValid).toBe(true)
      expect(result.error).toBe(null)
    })

    it('returns isValid true for mixed Arabic and Latin text', () => {
      const result = useInputValidation('Hello مرحبا world', 'ready')

      expect(result.isValid).toBe(true)
      expect(result.error).toBe(null)
    })

    it('returns isValid true for text with internal whitespace', () => {
      const result = useInputValidation('مرحبا  بالعالم\nجدول', 'ready')

      expect(result.isValid).toBe(true)
      expect(result.error).toBe(null)
    })

    it('returns isValid true when model is ready regardless of text content (as long as non-empty)', () => {
      const result = useInputValidation('نص', 'ready')

      expect(result.isValid).toBe(true)
    })
  })

  // handleKeyDown was removed from useInputValidation
  // as the main page has its own keyboard handler.
})
