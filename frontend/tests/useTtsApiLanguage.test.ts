import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTtsApi } from '../app/composables/useTtsApi'

// ─── Slice S-03: Language field to frontend API (RC-030) ─────────────

describe('useTtsApi — language field (S-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SynthesisRequest interface', () => {
    it('When language is provided then passes it to the backend', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi()
      // Act
      await synthesize({ text: 'Hello', language: 'en' })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.language).toBe('en')
    })

    it('When language is "ar" then passes "ar" to the backend', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi()
      // Act
      await synthesize({ text: 'مرحبا', language: 'ar' })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.language).toBe('ar')
    })

    it('When language is not provided then defaults to "ar"', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi()
      // Act
      await synthesize({ text: 'Hello' })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.language).toBe('ar')
    })
  })
})
