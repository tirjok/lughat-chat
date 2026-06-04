import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTtsApi } from './useTtsApi'

describe('useTtsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('synthesize', () => {
    it('should throw error when fetch fails (network error)', async () => {
      const { synthesize } = useTtsApi()

      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))

      await expect(synthesize({ text: 'مرحبا' })).rejects.toThrow('Unable to connect to the server')
    })

    it('should throw error for 400 status (invalid text)', async () => {
      const { synthesize } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({}),
      } as Response)

      await expect(synthesize({ text: '' })).rejects.toThrow('Invalid text for synthesis')
    })

    it('should throw error for 503 status (server unavailable)', async () => {
      const { synthesize } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response)

      await expect(synthesize({ text: 'مرحبا' })).rejects.toThrow('Server is currently unavailable')
    })

    it('should throw error for unknown status with detail', async () => {
      const { synthesize } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal error' }),
      } as Response)

      await expect(synthesize({ text: 'مرحبا' })).rejects.toThrow('Server error: Internal error')
    })

    it('should throw error for unknown status without detail', async () => {
      const { synthesize } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({}),
      } as Response)

      await expect(synthesize({ text: 'مرحبا' })).rejects.toThrow('An error occurred on the server')
    })

    it('should return audio blob on successful response', async () => {
      const { synthesize } = useTtsApi()

      const mockBlob = new Blob(['audio data'], { type: 'audio/mpeg' })
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      } as Response)

      const result = await synthesize({ text: 'مرحبا' })
      expect(result).toBe(mockBlob)
    })

    it('should send correct request payload', async () => {
      const { synthesize } = useTtsApi()

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        blob: async () => new Blob([], { type: 'audio/mpeg' }),
      } as Response)

      await synthesize({ text: 'مرحبا', speaker: 'test-speaker', speed: 1.5 })

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'مرحبا',
            speaker: 'test-speaker',
            speed: 1.5,
            language: 'ar',
          }),
        })
      )
    })
  })

  describe('healthCheck', () => {
    it('should throw error when fetch fails', async () => {
      const { healthCheck } = useTtsApi()

      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))

      await expect(healthCheck()).rejects.toThrow('Unable to check health status: Network failure')
    })

    it('should throw error for non-ok response', async () => {
      const { healthCheck } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 503,
      } as Response)

      await expect(healthCheck()).rejects.toThrow('Health check failed: 503')
    })

    it('should return health response on success', async () => {
      const { healthCheck } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ready', model_loaded: true }),
      } as Response)

      const result = await healthCheck()
      expect(result).toEqual({ status: 'ready', model_loaded: true })
    })
  })
})
