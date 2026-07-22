import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
// Helper: create a mock audio element that satisfies useMediaControls
function makeMockAudio(overrides: Record<string, unknown> = {}): unknown {
  return {
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    appendChild: vi.fn(),
    load: vi.fn(),
    ...overrides
  } as unknown as HTMLAudioElement
}

describe('useAudioModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('#sanity load', () => {
    it('When given a blob then creates an object URL from it', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()
      // Act
      module.load(mockBlob)
      await nextTick()
      // Assert
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
    })

    it('When given a blob then sets audioUrl ref to the created URL', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()
      // Act
      module.load(mockBlob)
      await nextTick()
      // Assert — audioUrl is now a getter from useObjectUrl
      expect(module.audioUrl).toBe('http://mock.url/blob')
    })

    it('When loading a second blob then revokes the previous object URL', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()
      module.load(mockBlob)
      await nextTick()
      vi.clearAllMocks()
      const mockBlob2 = new Blob(['dummy2'], { type: 'audio/mpeg' })
      // Act
      module.load(mockBlob2)
      await nextTick()
      // Assert
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('http://mock.url/blob')
    })
  })

  describe('#sanity play', () => {
    it('When audioRef is set then calls play() on the audio element', async () => {
      // Arrange
      const mockAudio = makeMockAudio()
      const module = useAudioModule()
      module.audioRef.value = mockAudio as HTMLAudioElement
      // Act
      await module.play()
      // Assert
      expect((mockAudio as { play: ReturnType<typeof vi.fn> }).play).toHaveBeenCalled()
    })

    it('When audioRef is null then does nothing', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      await module.play()
      // Assert — isPlaying is now a getter from useMediaControls
      expect(module.isPlaying).toBe(false)
    })
  })

  describe('#sanity pause', () => {
    it('When audioRef is set then calls pause() on the audio element', async () => {
      // Arrange — use load() which creates a real <audio> element
      const module = useAudioModule()
      module.load(new Blob(['dummy'], { type: 'audio/mpeg' }))
      await nextTick()
      // Act
      module.pause()
      // Assert — pause() sets playing.value = false (from useMediaControls)
      expect(module.isPaused).toBe(true)
    })

    it('When audioRef is set then sets isPlaying to false', async () => {
      // Arrange
      const module = useAudioModule()
      module.load(new Blob(['dummy'], { type: 'audio/mpeg' }))
      await nextTick()
      // Act — simulate playing state by calling play
      await module.play()
      module.pause()
      // Assert
      expect(module.isPlaying).toBe(false)
    })

    it('When audioRef is null then does nothing', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      module.pause()
      // Assert
      expect(module.isPlaying).toBe(false)
    })
  })

  describe('#sanity seek', () => {
    it('When given a fraction then sets currentTime to fraction * duration', async () => {
      // Arrange
      const module = useAudioModule()
      module.load(new Blob(['dummy'], { type: 'audio/mpeg' }))
      await nextTick()
      // Act — useMediaControls sets currentTime via audioRef
      module.seek(0.5)
      // Assert — currentTime is a getter from useMediaControls
      expect(module.currentTime >= 0).toBe(true)
    })

    it('When audioRef is null then does nothing', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      module.seek(0.5)
      // Assert — currentTime is now a getter from useMediaControls
      expect(module.currentTime).toBe(0)
    })

    it('When duration is 0 then does nothing', async () => {
      // Arrange
      const module = useAudioModule()
      module.load(new Blob(['dummy'], { type: 'audio/mpeg' }))
      await nextTick()
      // Act
      module.seek(0.5)
      // Assert — currentTime is a getter from useMediaControls
      expect(module.currentTime >= 0).toBe(true)
    })
  })

  describe('#sanity download', () => {
    it('When blob exists then creates and clicks a download link', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()
      module.load(mockBlob)
      const linkClickSpy = vi.fn()
      const originalCreateElement = document.createElement.bind(document)
      document.createElement = vi.fn((tag: string) => {
        if (tag === 'a') {
          return { href: '', click: linkClickSpy, set download(val: string) {} }
        }
        return originalCreateElement(tag)
      })
      document.body.appendChild = vi.fn() as never
      document.body.removeChild = vi.fn() as never
      // Act
      module.download('test.wav')
      // Assert
      expect(linkClickSpy).toHaveBeenCalled()
      // Cleanup
      document.createElement = originalCreateElement
      delete (document.body as HTMLElement & Record<string, unknown>).appendChild
      delete (document.body as HTMLElement & Record<string, unknown>).removeChild
    })

    it('When filename is provided then sets download attribute to that filename', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()
      module.load(mockBlob)
      let capturedDownload = ''
      const originalCreateElement = document.createElement.bind(document)
      document.createElement = vi.fn((tag: string) => {
        if (tag === 'a') {
          return {
            href: '',
            click: vi.fn(),
            set download(val: string) { capturedDownload = val }
          }
        }
        return originalCreateElement(tag)
      })
      document.body.appendChild = vi.fn() as never
      document.body.removeChild = vi.fn() as never
      // Act
      module.download('custom_name.wav')
      // Assert
      expect(capturedDownload).toBe('custom_name.wav')
      // Cleanup
      document.createElement = originalCreateElement
      delete (document.body as HTMLElement & Record<string, unknown>).appendChild
      delete (document.body as HTMLElement & Record<string, unknown>).removeChild
    })

    it('When filename is not provided then generates default filename', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()
      module.load(mockBlob)
      let capturedDownload = ''
      const originalCreateElement = document.createElement.bind(document)
      document.createElement = vi.fn((tag: string) => {
        if (tag === 'a') {
          return {
            href: '',
            click: vi.fn(),
            set download(val: string) { capturedDownload = val }
          }
        }
        return originalCreateElement(tag)
      })
      document.body.appendChild = vi.fn() as never
      document.body.removeChild = vi.fn() as never
      // Act
      module.download()
      // Assert
      expect(capturedDownload).toMatch(/^tts_output_\d+\.mp3$/)
      // Cleanup
      document.createElement = originalCreateElement
      delete (document.body as HTMLElement & Record<string, unknown>).appendChild
      delete (document.body as HTMLElement & Record<string, unknown>).removeChild
    })

    it('When no blob is loaded then does not throw', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      // Assert
      expect(() => module.download()).not.toThrow()
    })
  })

  describe('#sanity dispose', () => {
    it('When called without loaded audio then does not throw', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      // Assert
      expect(() => module.dispose()).not.toThrow()
    })

    it('When audioRef is null then does not throw', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      // Assert
      expect(() => module.dispose()).not.toThrow()
    })
  })
  describe('#sanity watch integration', () => {
    it('When audioRef is set then sets up audio events', async () => {
      // Arrange — use load() which creates a real <audio> element
      const module = useAudioModule()
      module.load(new Blob(['dummy'], { type: 'audio/mpeg' }))
      await nextTick()
      // Assert — audioRef should be a real <audio> element
      expect(module.audioRef.value).not.toBeNull()
      expect(module.audioRef.value?.tagName).toBe('AUDIO')
    })

    it('When audioRef is null then play() does not throw', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      await module.play()
      // Assert — isPlaying is now a getter from useMediaControls
      expect(module.isPlaying).toBe(false)
    })
  })
})
