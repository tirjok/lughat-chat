import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTtsApi } from '../app/composables/useTtsApi'

// ─── Slice S-04: Seed support to frontend (RC-029) ────────────────────

describe('useTtsApi — seed field (S-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SynthesisRequest interface', () => {
    it('When seed is provided then passes it to the backend', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi()
      // Act
      await synthesize({ text: 'Hello', seed: 123 })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.seed).toBe(123)
    })

    it('When seed is 42 then passes 42 to the backend', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi()
      // Act
      await synthesize({ text: 'Hello', seed: 42 })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.seed).toBe(42)
    })

    it('When seed is not provided then does NOT include seed in request body', async () => {
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
      expect(body).not.toHaveProperty('seed')
    })
  })
})
