import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTtsApi } from '~/composables/useTtsApi'

describe('useTtsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('new SynthesisRequest interface (ISSUE-006)', () => {
    it('When synthesize is called with text, language, and voice then sends POST body with language and voice (no speaker/speed/seed)', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi()
      // Act
      await synthesize({ text: 'مرحبا', language: 'ar', voice: 'female' })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body).toEqual({
        text: 'مرحبا',
        language: 'ar',
        voice: 'female'
      })
      expect(body).not.toHaveProperty('speaker')
      expect(body).not.toHaveProperty('speed')
      expect(body).not.toHaveProperty('seed')
    })

    it('When synthesize is called with only text then defaults language to "ar" and omits voice', async () => {
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
      expect(body.text).toBe('Hello')
      expect(body.language).toBe('ar')
      expect(body).not.toHaveProperty('voice')
      expect(body).not.toHaveProperty('speaker')
      expect(body).not.toHaveProperty('speed')
      expect(body).not.toHaveProperty('seed')
    })

    it('When text and voice are provided then sends correct POST body', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi()
      // Act
      await synthesize({ text: 'مرحبا', voice: 'female', language: 'ar' })
      // Assert
      expect(fetch).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'مرحبا',
            voice: 'female',
            language: 'ar'
          })
        })
      )
    })

    it('When voice is not provided then omits voice from POST body', async () => {
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
      expect(body).not.toHaveProperty('voice')
    })

    it('When custom voice name is provided then sends it as a plain string', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi()
      // Act
      await synthesize({ text: 'Hello', voice: 'ahmed_ksa' })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.voice).toBe('ahmed_ksa')
    })

    it('When language is provided then includes it in POST body', async () => {
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

    it('When language is not provided then always sends "ar"', async () => {
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

    it('When API returns OK then returns a Blob', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi()
      // Act
      const result = await synthesize({ text: 'Hello' })
      // Assert
      expect(result).toBeInstanceOf(Blob)
    })
  })

  describe('#sanity error handling', () => {
    it('When API returns non-OK status then throws Arabic error', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ detail: 'Model not ready' })
      }))
      const { synthesize } = useTtsApi()
      // Act
      // Assert
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Server is currently unavailable')
    })

    it('When response.json fails then throws Arabic unknown error', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('parse error'))
      }))
      const { synthesize } = useTtsApi()
      // Act
      // Assert
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('An error occurred on the server')
    })

    it('When network fails then throws Arabic connection error', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
      const { synthesize } = useTtsApi()
      // Act
      // Assert
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Unable to connect to the server')
    })

    it('When custom baseUrl is provided then uses that URL', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi({ baseUrl: 'http://custom-api.local' })
      // Act
      await synthesize({ text: 'Hello' })
      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://custom-api.local/api/generate',
        expect.any(Object)
      )
    })
  })

  describe('#sanity healthCheck', () => {
    it('When called then sends GET request to /health', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))
      const { healthCheck } = useTtsApi()
      // Act
      await healthCheck()
      // Assert
      expect(fetch).toHaveBeenCalledWith('/health')
    })

    it('When health check succeeds then returns HealthResponse', async () => {
      // Arrange
      const mockHealth = { status: 'ready' as const, model_loaded: true }
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHealth)
      }))
      const { healthCheck } = useTtsApi()
      // Act
      const result = await healthCheck()
      // Assert
      expect(result).toEqual(mockHealth)
    })

    it('When health check returns non-OK then throws Arabic error', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503
      }))
      const { healthCheck } = useTtsApi()
      // Act
      // Assert
      await expect(healthCheck()).rejects.toThrow('Health check failed: 503')
    })

    it('When health check network fails then throws Arabic connection error', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
      const { healthCheck } = useTtsApi()
      // Act
      // Assert
      await expect(healthCheck()).rejects.toThrow('Unable to check health status: Network error')
    })

    it('When network fails with non-Error value then includes it in error message', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.reject('string error'))
      const { healthCheck } = useTtsApi()
      // Act
      // Assert
      await expect(healthCheck()).rejects.toThrow('Unable to check health status: string error')
    })
  })
})
