import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTtsApi } from '../app/composables/useTtsApi'

describe('useTtsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('synthesize', () => {
    it('sends POST request with correct JSON body', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))

      const { synthesize } = useTtsApi()
      await synthesize({ text: 'مرحبا', speaker: 'female', speed: 1.2 })

      expect(fetch).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'مرحبا',
            speaker: 'female',
            speed: 1.2,
            language: 'ar'
          })
        })
      )
    })

    it('defaults speaker to "default" when not provided', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))

      const { synthesize } = useTtsApi()
      await synthesize({ text: 'Hello' })

      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.speaker).toBe('default')
    })

    it('defaults speed to 1.0 when not provided', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))

      const { synthesize } = useTtsApi()
      await synthesize({ text: 'Hello' })

      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.speed).toBe(1.0)
    })

    it('always sends language as "ar"', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))

      const { synthesize } = useTtsApi()
      await synthesize({ text: 'Hello' })

      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.language).toBe('ar')
    })

    it('returns a Blob on success', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))

      const { synthesize } = useTtsApi()
      const result = await synthesize({ text: 'Hello' })

      expect(result).toBeInstanceOf(Blob)
    })

    it('throws Arabic error when API returns non-OK status', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ detail: 'Model not ready' })
      }))

      const { synthesize } = useTtsApi()
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Server is currently unavailable')
    })

    it('throws Arabic unknown error when response.json fails', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('parse error'))
      }))

      const { synthesize } = useTtsApi()
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('An error occurred on the server')
    })

    it('throws Arabic error for network failures', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      const { synthesize } = useTtsApi()
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Unable to connect to the server')
    })

    it('uses custom baseUrl when provided', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))

      const { synthesize } = useTtsApi({ baseUrl: 'http://custom-api.local' })
      await synthesize({ text: 'Hello' })

      expect(fetch).toHaveBeenCalledWith(
        'http://custom-api.local/api/generate',
        expect.any(Object)
      )
    })
  })

  describe('healthCheck', () => {
    it('sends GET request to /health', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))

      const { healthCheck } = useTtsApi()
      await healthCheck()

      expect(fetch).toHaveBeenCalledWith('/health')
    })

    it('returns HealthResponse on success', async () => {
      const mockHealth = { status: 'ready' as const, model_loaded: true }
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHealth)
      }))

      const { healthCheck } = useTtsApi()
      const result = await healthCheck()

      expect(result).toEqual(mockHealth)
    })

    it('throws Arabic error when health check fails', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503
      }))

      const { healthCheck } = useTtsApi()
      await expect(healthCheck()).rejects.toThrow('Health check failed: 503')
    })

    it('throws Arabic error on network failure', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      const { healthCheck } = useTtsApi()
      await expect(healthCheck()).rejects.toThrow('Unable to check health status: Network error')
    })

    it('throws Arabic error for non-Error exceptions', async () => {
      global.fetch = vi.fn(() => Promise.reject('string error'))

      const { healthCheck } = useTtsApi()
      await expect(healthCheck()).rejects.toThrow('Unable to check health status: string error')
    })
  })

  describe('returned interface', () => {
    it('returns synthesize and healthCheck functions', () => {
      const api = useTtsApi()

      expect(typeof api.synthesize).toBe('function')
      expect(typeof api.healthCheck).toBe('function')
    })

    it('does not return unexpected properties', () => {
      const api = useTtsApi()

      expect(Object.keys(api)).toEqual(['synthesize', 'healthCheck'])
    })
  })
})
