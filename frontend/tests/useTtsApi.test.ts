import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTtsApi } from '../app/composables/useTtsApi'

describe('useTtsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('#sync mode (backwards-compatible)', () => {
    it('When text and speaker are provided then sends correct POST body', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi({ asyncMode: false })
      // Act
      await synthesize({ text: 'مرحبا', speaker: 'female', speed: 1.2 })
      // Assert
      expect(fetch).toHaveBeenCalledWith(
        '/api/generate_sync',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'مرحبا',
            speaker: 'female',
            speed: 1.2,
            language: 'ar',
            pitch: 0.0
          })
        })
      )
    })

    it('When speaker is not provided then sends undefined speaker', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi({ asyncMode: false })
      // Act
      await synthesize({ text: 'Hello' })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.speaker).toBeUndefined()
    })

    it('When custom voice name is provided then sends it as a plain string', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi({ asyncMode: false })
      // Act
      await synthesize({ text: 'Hello', speaker: 'ahmed_ksa' })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.speaker).toBe('ahmed_ksa')
    })

    it('When speed is not provided then defaults to 1.0', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi({ asyncMode: false })
      // Act
      await synthesize({ text: 'Hello' })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.speed).toBe(1.0)
    })

    it('When language is not provided then always sends "ar"', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi({ asyncMode: false })
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
      const { synthesize } = useTtsApi({ asyncMode: false })
      // Act
      const result = await synthesize({ text: 'Hello' })
      // Assert
      expect(result).toBeInstanceOf(Blob)
    })
  })

  describe('#async mode (job-based)', () => {
    it('submitJob returns job_id from the API', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ job_id: 'abc123', status: 'pending' })
      }))
      const { submitJob } = useTtsApi()
      // Act
      const jobId = await submitJob({ text: 'Hello' })
      // Assert
      expect(jobId).toBe('abc123')
    })

    it('submitJob sends correct request body', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ job_id: 'abc123', status: 'pending' })
      }))
      const { submitJob } = useTtsApi()
      // Act
      await submitJob({ text: 'مرحبا', speaker: 'ksa_hamed', speed: 1.5, pitch: -1.0, seed: 42 })
      // Assert
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body).toEqual({
        text: 'مرحبا',
        speaker: 'ksa_hamed',
        voice: undefined,
        speed: 1.5,
        language: 'ar',
        pitch: -1.0,
        seed: 42
      })
    })

    it('getJobStatus returns job status from the API', async () => {
      // Arrange
      const mockStatus = { status: 'completed' as const, audio_url: '/downloads/test.mp3', filename: 'test.mp3' }
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockStatus)
      }))
      const { getJobStatus } = useTtsApi()
      // Act
      const result = await getJobStatus('abc123')
      // Assert
      expect(result).toEqual(mockStatus)
      expect(fetch).toHaveBeenCalledWith('/api/jobs/abc123')
    })

    it('getJobStatus returns error for unknown job', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: 'Job not found' })
      }))
      const { getJobStatus } = useTtsApi()
      // Act
      await expect(getJobStatus('unknown')).rejects.toThrow('Job error: Job not found')
    })

    it('synthesize in async mode: submit → poll → fetch audio', async () => {
      // Arrange — simulate a job that completes on second poll
      const mockBlob = new Blob(['audio-data'], { type: 'audio/mpeg' })
      let callCount = 0
      global.fetch = vi.fn((url: string) => {
        if (url.includes('/api/generate')) {
          // submitJob response
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ job_id: 'job-1', status: 'pending' })
          })
        }
        if (url.includes('/api/jobs/')) {
          // getJobStatus response
          callCount++
          if (callCount === 1) {
            // First poll: still running
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ status: 'running' })
            })
          }
          // Second poll: completed
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'completed',
              audio_url: '/downloads/test.mp3',
              filename: 'test.mp3'
            })
          })
        }
        if (url.includes('/downloads/')) {
          // Fetch audio
          return Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(mockBlob)
          })
        }
        return Promise.resolve({ ok: false })
      })

      const { synthesize } = useTtsApi()
      // Act
      const result = await synthesize({ text: 'Hello', speaker: 'female' })
      // Assert
      expect(result).toBeInstanceOf(Blob)
      // The first call is submitJob (POST /api/generate)
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/api/generate',
        expect.any(Object)
      )
      // The second call is getJobStatus (GET /api/jobs/job-1)
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        '/api/jobs/job-1'
      )
      // The third call is also getJobStatus (second poll)
      expect(fetch).toHaveBeenNthCalledWith(
        3,
        '/api/jobs/job-1'
      )
      // The fourth call fetches the audio
      expect(fetch).toHaveBeenNthCalledWith(
        4,
        '/downloads/test.mp3'
      )
    })

    it('synthesize in async mode: handles failed job', async () => {
      // Arrange — simulate a job that is submitted then fails
      global.fetch = vi.fn((url) => {
        if (url.includes('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ job_id: 'job-fail', status: 'pending' })
          })
        }
        if (url.includes('/api/jobs/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'failed',
              error: 'Model error'
            })
          })
        }
        return Promise.resolve({ ok: false })
      })

      const { synthesize } = useTtsApi()
      // Act — synthesize should throw when job fails
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Model error')
    })

    it('synthesize in async mode: handles server error on submit', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Model not ready' })
      }))
      const { submitJob } = useTtsApi()
      // Act
      await expect(submitJob({ text: 'Hello' })).rejects.toThrow('Server error: Model not ready')
    })
  })

  describe('#sync mode (backwards-compatible) — error handling', () => {
    it('When API returns non-OK status then throws Arabic error', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ detail: 'Model not ready' })
      }))
      const { synthesize } = useTtsApi({ asyncMode: false })
      // Act
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Server is currently unavailable')
    })

    it('When response.json fails then throws Arabic unknown error', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('parse error'))
      }))
      const { synthesize } = useTtsApi({ asyncMode: false })
      // Act
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('An error occurred on the server')
    })

    it('When network fails then throws connection error', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
      const { synthesize } = useTtsApi({ asyncMode: false })
      // Act
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Network error')
    })

    it('When custom baseUrl is provided then uses that URL', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }))
      const { synthesize } = useTtsApi({ baseUrl: 'http://custom-api.local', asyncMode: false })
      // Act
      await synthesize({ text: 'Hello' })
      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://custom-api.local/api/generate_sync',
        expect.any(Object)
      )
    })
  })

  describe('#sync mode (backwards-compatible) — healthCheck', () => {
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
      await expect(healthCheck()).rejects.toThrow('Health check failed: 503')
    })

    it('When health check network fails then throws Arabic connection error', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
      const { healthCheck } = useTtsApi()
      // Act
      await expect(healthCheck()).rejects.toThrow('Unable to check health status: Network error')
    })

    it('When network fails with non-Error value then includes it in error message', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.reject('string error'))
      const { healthCheck } = useTtsApi()
      // Act
      await expect(healthCheck()).rejects.toThrow('Unable to check health status: string error')
    })
  })
})
