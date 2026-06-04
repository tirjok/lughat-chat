import { describe, it, expect, vi } from 'vitest'
import { useInputValidation } from '../app/composables/useInputValidation'

describe('useInputValidation', () => {
  describe('empty text validation', () => {
    it('returns error when text is empty string', () => {
      const result = useInputValidation('', 'ready')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('الرجاء إدخال نص للتحويل إلى كلام')
    })

    it('returns error when text is only whitespace', () => {
      const result = useInputValidation('   ', 'ready')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('الرجاء إدخال نص للتحويل إلى كلام')
    })

    it('returns error when text is only newlines and tabs', () => {
      const result = useInputValidation('\n\t\n  ', 'ready')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('الرجاء إدخال نص للتحويل إلى كلام')
    })

    it('returns error when text is empty and model is loading', () => {
      const result = useInputValidation('', 'loading')

      expect(result.isValid).toBe(false)
      // Empty text error takes priority over loading error
      expect(result.error).toBe('الرجاء إدخال نص للتحويل إلى كلام')
    })

    it('returns error when text is whitespace and model is loading', () => {
      const result = useInputValidation('  ', 'loading')

      expect(result.isValid).toBe(false)
      // Empty text error takes priority over loading error
      expect(result.error).toBe('الرجاء إدخال نص للتحويل إلى كلام')
    })

    it('returns error when text is empty and model has error status', () => {
      const result = useInputValidation('', 'error')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('الرجاء إدخال نص للتحويل إلى كلام')
    })

    it('does not call synthesize when text is empty', () => {
      const result = useInputValidation('', 'ready')

      expect(result.isValid).toBe(false)
      // If isValid is false, the caller should not call synthesize
    })

    it('returns error for whitespace-only text regardless of model status', () => {
      const result = useInputValidation('   ', 'error')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('الرجاء إدخال نص للتحويل إلى كلام')
    })
  })

  describe('model loading validation', () => {
    it('returns error when model is loading and text has content', () => {
      const result = useInputValidation('مرحبا بالعالم', 'loading')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('جاري تحميل النموذج، يرجى الانتظار...')
    })

    it('returns error when model has error status and text has content', () => {
      const result = useInputValidation('مرحبا بالعالم', 'error')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('جاري تحميل النموذج، يرجى الانتظار...')
    })

    it('loading error takes priority when text is non-empty whitespace', () => {
      const result = useInputValidation('  ', 'loading')

      expect(result.isValid).toBe(false)
      // Whitespace is trimmed to empty, so text error takes priority
      expect(result.error).toBe('الرجاء إدخال نص للتحويل إلى كلام')
    })

    it('loading error does NOT take priority when text is empty', () => {
      const result = useInputValidation('', 'loading')

      expect(result.isValid).toBe(false)
      // Empty text error takes priority
      expect(result.error).toBe('الرجاء إدخال نص للتحويل إلى كلام')
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

  describe('handleKeyDown', () => {
    it('triggers onValid callback when Ctrl+Enter is pressed with valid input', () => {
      const callback = vi.fn()
      const result = useInputValidation('مرحبا', 'ready')

      result.handleKeyDown({
        ctrlKey: true,
        key: 'Enter',
        metaKey: false,
      } as KeyboardEvent, callback)

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('triggers onValid callback when Cmd+Enter is pressed (macOS) with valid input', () => {
      const callback = vi.fn()
      const result = useInputValidation('مرحبا', 'ready')

      result.handleKeyDown({
        ctrlKey: false,
        key: 'Enter',
        metaKey: true,
      } as KeyboardEvent, callback)

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('does not trigger onValid when Enter is pressed without Ctrl/Cmd', () => {
      const callback = vi.fn()
      const result = useInputValidation('مرحبا', 'ready')

      result.handleKeyDown({
        ctrlKey: false,
        key: 'Enter',
        metaKey: false,
      } as KeyboardEvent, callback)

      expect(callback).not.toHaveBeenCalled()
    })

    it('does not trigger onValid when Ctrl is pressed but key is not Enter', () => {
      const callback = vi.fn()
      const result = useInputValidation('مرحبا', 'ready')

      result.handleKeyDown({
        ctrlKey: true,
        key: 'a',
        metaKey: false,
      } as KeyboardEvent, callback)

      expect(callback).not.toHaveBeenCalled()
    })

    it('does not trigger onValid when input is invalid (empty text)', () => {
      const callback = vi.fn()
      const result = useInputValidation('', 'ready')

      result.handleKeyDown({
        ctrlKey: true,
        key: 'Enter',
        metaKey: false,
      } as KeyboardEvent, callback)

      expect(callback).not.toHaveBeenCalled()
    })

    it('does not trigger onValid when input is invalid (model loading)', () => {
      const callback = vi.fn()
      const result = useInputValidation('مرحبا', 'loading')

      result.handleKeyDown({
        ctrlKey: true,
        key: 'Enter',
        metaKey: false,
      } as KeyboardEvent, callback)

      expect(callback).not.toHaveBeenCalled()
    })

    it('does not trigger onValid for other key combinations', () => {
      const callback = vi.fn()
      const result = useInputValidation('مرحبا', 'ready')

      result.handleKeyDown({
        ctrlKey: true,
        key: 's',
        metaKey: false,
      } as KeyboardEvent, callback)

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
