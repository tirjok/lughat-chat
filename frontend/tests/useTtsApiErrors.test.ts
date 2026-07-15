import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTtsApi } from '../app/composables/useTtsApi'

// ─── Slice S-06: Frontend error handling — specific 500 messages (RC-028) ──

describe('useTtsApi — specific error messages (S-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('500 error detail mapping', () => {
    it('When 500 with "Speaker WAV file not found" then throws voice-not-available message', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Speaker WAV file not found for voice unknown' })
      }))
      const { synthesize } = useTtsApi()
      // Act
      // Assert
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Voice not available. Please select a different voice.')
    })

    it('When 500 with "Speaker WAV file is too short" then throws voice-too-short message', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Speaker WAV file is too short (must be >= 0.33 seconds)' })
      }))
      const { synthesize } = useTtsApi()
      // Act
      // Assert
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Voice reference audio is too short. Please select a different voice.')
    })

    it('When 500 with "Failed to generate audio" then throws synthesis-failed message', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Failed to generate audio' })
      }))
      const { synthesize } = useTtsApi()
      // Act
      // Assert
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Speech synthesis failed. Please try again.')
    })

    it('When 500 with unknown detail then falls back to generic server error', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Some unexpected error' })
      }))
      const { synthesize } = useTtsApi()
      // Act
      // Assert
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('An error occurred on the server')
    })
  })

  describe('400 error', () => {
    it('When 400 then throws "Invalid text for synthesis"', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ detail: 'Text is empty or too long' })
      }))
      const { synthesize } = useTtsApi()
      // Act
      // Assert
      await expect(synthesize({ text: '' })).rejects.toThrow('Invalid text for synthesis')
    })
  })

  describe('503 error (model loading)', () => {
    it('When 503 then throws "Server is currently unavailable"', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ detail: 'TTS model not ready yet' })
      }))
      const { synthesize } = useTtsApi()
      // Act
      // Assert
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Server is currently unavailable')
    })
  })

  describe('Connection error', () => {
    it('When network fails then throws "Unable to connect to the server"', async () => {
      // Arrange
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
      const { synthesize } = useTtsApi()
      // Act
      // Assert
      await expect(synthesize({ text: 'Hello' })).rejects.toThrow('Unable to connect to the server')
    })
  })
})
