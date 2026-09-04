import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAudioModule } from '~/composables/common/useAudioModule'

describe('useAudioModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('load', () => {
    it('sets audioUrl when given a blob', async () => {
      const module = useAudioModule()
      const blob = new Blob(['dummy'], { type: 'audio/mpeg' })
      module.load(blob)
      expect(module.audioUrl.value).not.toBeNull()
      expect(typeof module.audioUrl.value).toBe('string')
    })

    it('updates audioUrl on second load, revoking the first', async () => {
      let urlCounter = 0
      const coSpy = vi.spyOn(global.URL, 'createObjectURL').mockImplementation(
        _blob => `http://mock.url/blob-${++urlCounter}`
      )
      const module = useAudioModule()
      const blob1 = new Blob(['dummy'], { type: 'audio/mpeg' })
      module.load(blob1)
      const firstUrl = module.audioUrl.value
      expect(firstUrl).not.toBeNull()

      const blob2 = new Blob(['dummy2'], { type: 'audio/mpeg' })
      module.load(blob2)

      expect(module.audioUrl.value).not.toBeNull()
      expect(module.audioUrl.value).not.toBe(firstUrl)
      coSpy.mockRestore()
    })

    it('When loading multiple blobs rapidly then revokes all previous object URLs', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      let urlCounter = 0
      const coSpy = vi.spyOn(global.URL, 'createObjectURL').mockImplementation(() => {
        return `http://mock.url/blob-${++urlCounter}`
      })
      const roSpy = vi.spyOn(global.URL, 'revokeObjectURL').mockImplementation(() => {})
      const module = useAudioModule()
      module.load(mockBlob)
      module.load(mockBlob)
      module.load(mockBlob)
      // Act
      const mockBlob4 = new Blob(['dummy4'], { type: 'audio/mpeg' })
      module.load(mockBlob4)
      // Assert: revoke was called once per prior load (3 loads, 3 revokes)
      expect(roSpy).toHaveBeenCalledTimes(3)
      // Cleanup: restore mocks even if assertion fails
      coSpy.mockRestore()
      roSpy.mockRestore()
    })
  })

  describe('play', () => {
    it('When audioRef is set then calls play() on the audio element', async () => {
      // Arrange
      const mockAudio = {
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement
      const module = useAudioModule()
      module.audioRef.value = mockAudio
      // Act
      await module.play()
      // Assert
      expect(mockAudio.play).toHaveBeenCalled()
    })

    it('When audioRef is null then does nothing', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      await module.play()
      // Assert
      expect(module.isPlaying.value).toBe(false)
    })
  })

  describe('pause', () => {
    it('When audioRef is set then calls pause() on the audio element', async () => {
      // Arrange
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement
      const module = useAudioModule()
      module.audioRef.value = mockAudio
      // Act
      module.pause()
      // Assert
      expect(mockAudio.pause).toHaveBeenCalled()
    })

    it('When audioRef is set then sets isPlaying to false', async () => {
      // Arrange
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement
      const module = useAudioModule()
      module.audioRef.value = mockAudio
      module.isPlaying.value = true
      // Act
      module.pause()
      // Assert
      expect(module.isPlaying.value).toBe(false)
    })

    it('When audioRef is null then does nothing', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      module.pause()
      // Assert
      expect(module.isPlaying.value).toBe(false)
    })
  })

  describe('seek', () => {
    it('When given a fraction then sets currentTime to fraction * duration', async () => {
      // Arrange
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        currentTime: 0,
        duration: 100
      } as unknown as HTMLAudioElement
      const module = useAudioModule()
      module.audioRef.value = mockAudio
      module.duration.value = 100
      // Act
      module.seek(0.5)
      // Assert
      expect(mockAudio.currentTime).toBe(50)
    })

    it('When audioRef is null then does nothing', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      module.seek(0.5)
      // Assert
      expect(module.currentTime.value).toBe(0)
    })

    it('When duration is 0 then does nothing', async () => {
      // Arrange
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        currentTime: 0,
        duration: 100
      } as unknown as HTMLAudioElement
      const module = useAudioModule()
      module.audioRef.value = mockAudio
      module.duration.value = 0
      // Act
      module.seek(0.5)
      // Assert
      expect(mockAudio.currentTime).toBe(0)
    })
  })

  describe('download', () => {
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

  describe('dispose', () => {
    it('When audio is loaded then revokes the current object URL', async () => {
      // Arrange
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()
      module.load(mockBlob)
      vi.clearAllMocks()
      // Act
      module.dispose()
      // Assert
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('http://mock.url/blob')
    })

    it('When disposed after download then revokes the download URL not yet cleaned by timeout', async () => {
      // Arrange
      const mockBlob = new Blob(['arabic-speech'], { type: 'audio/mpeg' })
      let urlCounter = 0
      const coSpy = vi.spyOn(global.URL, 'createObjectURL').mockImplementation(() => {
        return `blob:http://localhost/${++urlCounter}`
      })
      const roSpy = vi.spyOn(global.URL, 'revokeObjectURL').mockImplementation(() => {})
      const module = useAudioModule()
      module.load(mockBlob)
      const mainUrl = `blob:http://localhost/${urlCounter}`
      // Act: download creates a second URL; dispose before timeout fires
      module.download('recording.mp3')
      const downloadUrl = `blob:http://localhost/${urlCounter}`
      module.dispose()
      // Assert: both URLs were revoked (main + download, before timeout fires)
      expect(roSpy).toHaveBeenCalledWith(mainUrl)
      expect(roSpy).toHaveBeenCalledWith(downloadUrl)
      // Cleanup
      coSpy.mockRestore()
      roSpy.mockRestore()
    })

    it('When audio is loaded then clears audioRef src', async () => {
      // Arrange
      let storedSrc = ''
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        get src() { return storedSrc },
        set src(val: string) { storedSrc = val }
      } as unknown as HTMLAudioElement
      const module = useAudioModule()
      module.audioRef.value = mockAudio
      module.audioUrl.value = 'http://mock.url/audio'
      // Act
      module.dispose()
      // Assert
      expect(storedSrc).toBe('')
    })

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

  describe('onPlaybackEnd', () => {
    it('When audio ends then calls the onPlaybackEnd callback', async () => {
      // Arrange
      const callback = vi.fn()
      const module = useAudioModule({ onPlaybackEnd: callback })
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'ended') handler()
        })
      } as unknown as HTMLAudioElement
      module.audioRef.value = mockAudio
      module.audioUrl.value = 'http://mock.url/audio'
      // Act
      await new Promise(resolve => setTimeout(resolve, 50))
      // Assert
      expect(callback).toHaveBeenCalled()
    })
  })

  describe('watch integration', () => {
    it('When audioUrl changes then sets up audio events and assigns src', async () => {
      // Arrange
      const mockAudio = {
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        set src(_: string) {},
        get src() { return '' },
        duration: 0,
        currentTime: 0
      } as unknown as HTMLAudioElement
      const module = useAudioModule()
      module.audioRef.value = mockAudio
      // Act
      module.audioUrl.value = 'http://mock.url/new-audio'
      await new Promise(resolve => setTimeout(resolve, 0))
      // Assert
      expect(mockAudio.addEventListener).toHaveBeenCalled()
    })

    it('When audioRef is null then play() does not throw', async () => {
      // Arrange
      const module = useAudioModule()
      // Act
      await module.play()
      // Assert
      expect(module.isPlaying.value).toBe(false)
    })
  })

  describe('error exposure', () => {
    it('exposes an error ref that defaults to null', () => {
      const module = useAudioModule()
      expect('error' in module).toBe(true)
      expect(module.error.value).toBeNull()
    })

    it('sets error ref when play() throws', async () => {
      const mockAudio = {
        play: vi.fn(() => Promise.reject(new DOMException('NotAllowedError'))),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement
      const module = useAudioModule()
      module.audioRef.value = mockAudio
      await module.play()
      expect(module.error.value).toContain('Unable to play audio')
    })

    it('clears error when a new blob is loaded', async () => {
      const mockAudio = {
        play: vi.fn(() => Promise.reject(new Error('blocked'))),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        set src(_: string) {},
        get src() { return '' }
      } as unknown as HTMLAudioElement
      const module = useAudioModule()
      module.audioRef.value = mockAudio
      await module.play()
      expect(module.error.value).not.toBeNull()
      module.load(new Blob(['x'], { type: 'audio/mpeg' }))
      expect(module.error.value).toBeNull()
    })

    it('sets error string when audio element emits an error event', async () => {
      vi.useFakeTimers()
      const addEventSpy = vi.fn()
      const mockAudio = {
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
        addEventListener: addEventSpy as unknown as HTMLAudioElement['addEventListener'],
        set src(_: string) {},
        get src() { return '' },
        duration: 0,
        currentTime: 0
      } as unknown as HTMLAudioElement
      const module = useAudioModule()
      module.audioRef.value = mockAudio
      await vi.runAllTimersAsync()
      const call = addEventSpy.mock.calls.find(c => c[0] === 'error')
      expect(call).toBeDefined()
      const errorCb = call![1] as () => void
      errorCb()
      expect(module.error.value).toBe('Failed to load audio')
      vi.useRealTimers()
    })
  })
})
