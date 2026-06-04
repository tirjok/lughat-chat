import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTtsApi } from './useTtsApi'

describe('useTtsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('synthesize', () => {
    it('should throw Arabic error when fetch fails (network error)', async () => {
      const { synthesize } = useTtsApi()

      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))

      await expect(synthesize({ text: 'مرحبا' })).rejects.toThrow('تعذر الاتصال بالخادم')
    })

    it('should throw Arabic error for 400 status (invalid text)', async () => {
      const { synthesize } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({}),
      } as Response)

      await expect(synthesize({ text: '' })).rejects.toThrow('نص غير صالح للتوليد')
    })

    it('should throw Arabic error for 503 status (server unavailable)', async () => {
      const { synthesize } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response)

      await expect(synthesize({ text: 'مرحبا' })).rejects.toThrow('الخادم غير متاح حالياً')
    })

    it('should throw Arabic error for unknown status with detail', async () => {
      const { synthesize } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal error' }),
      } as Response)

      await expect(synthesize({ text: 'مرحبا' })).rejects.toThrow('خطأ في الخادم: Internal error')
    })

    it('should throw Arabic error for unknown status without detail', async () => {
      const { synthesize } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({}),
      } as Response)

      await expect(synthesize({ text: 'مرحبا' })).rejects.toThrow('حدث خطأ في الخادم')
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
    it('should throw Arabic error when fetch fails', async () => {
      const { healthCheck } = useTtsApi()

      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))

      await expect(healthCheck()).rejects.toThrow('تعذر فحص حالة الصحة: Network failure')
    })

    it('should throw Arabic error for non-ok response', async () => {
      const { healthCheck } = useTtsApi()

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 503,
      } as Response)

      await expect(healthCheck()).rejects.toThrow('فشل فحص الصحة: 503')
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
