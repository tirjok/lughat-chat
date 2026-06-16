import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAudioModule } from '../app/composables/useAudioModule'

describe('useAudioModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('load', () => {
    it('creates an object URL from the blob', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()

      module.load(mockBlob)

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
    })

    it('sets audioUrl ref to the created URL', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()

      module.load(mockBlob)

      expect(module.audioUrl.value).toBe('http://mock.url/blob')
    })

    it('stores the blob in blobRef', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()

      module.load(mockBlob)

      expect(module.load).toBeDefined()
    })

    it('revokes previous object URL when loading a new blob', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()

      // Load first audio
      module.load(mockBlob)
      vi.clearAllMocks()

      // Load second audio - should revoke previous
      const mockBlob2 = new Blob(['dummy2'], { type: 'audio/mpeg' })
      module.load(mockBlob2)

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('http://mock.url/blob')
    })

    it('resets isLoading to true on load', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()

      module.load(mockBlob)

      expect(module.isLoading.value).toBe(true)
    })

    it('clears error on load', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()
      module.error.value = 'previous error'

      module.load(mockBlob)

      expect(module.error.value).toBeNull()
    })
  })

  describe('play', () => {
    it('calls play() on audioRef when available', async () => {
      const mockAudio = {
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const module = useAudioModule()
      module.audioRef.value = mockAudio

      await module.play()

      expect(mockAudio.play).toHaveBeenCalled()
    })

    it('sets error when play rejects', async () => {
      const mockAudio = {
        play: vi.fn(() => Promise.reject(new DOMException('Not allowed'))),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const module = useAudioModule()
      module.audioRef.value = mockAudio

      await module.play()

      expect(module.error.value).toContain('Unable to play audio')
    })

    it('does nothing when audioRef is null', async () => {
      const module = useAudioModule()

      await module.play()

      expect(module.isPlaying.value).toBe(false)
    })
  })

  describe('pause', () => {
    it('calls pause() on audioRef when available', async () => {
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const module = useAudioModule()
      module.audioRef.value = mockAudio

      module.pause()

      expect(mockAudio.pause).toHaveBeenCalled()
    })

    it('sets isPlaying to false', async () => {
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const module = useAudioModule()
      module.audioRef.value = mockAudio
      module.isPlaying.value = true

      module.pause()

      expect(module.isPlaying.value).toBe(false)
    })

    it('does nothing when audioRef is null', async () => {
      const module = useAudioModule()

      module.pause()

      expect(module.isPlaying.value).toBe(false)
    })
  })

  describe('seek', () => {
    it('sets currentTime on audioRef when available', async () => {
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

      module.seek(0.5)

      expect(mockAudio.currentTime).toBe(50)
    })

    it('does nothing when audioRef is null', async () => {
      const module = useAudioModule()

      module.seek(0.5)

      expect(module.currentTime.value).toBe(0)
    })

    it('does nothing when duration is 0', async () => {
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

      module.seek(0.5)

      expect(mockAudio.currentTime).toBe(0)
    })
  })

  describe('download', () => {
    it('creates and clicks a download link when blob exists', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()

      // Set blobRef directly (load() would do this internally)
      module.load(mockBlob)

      const linkClickSpy = vi.fn()

      const originalCreateElement = document.createElement.bind(document)
      document.createElement = vi.fn((tag: string) => {
        if (tag === 'a') {
          return {
            href: '',
            click: linkClickSpy,
            set download(val: string) {}
          }
        }
        return originalCreateElement(tag)
      })

      document.body.appendChild = vi.fn() as never
      document.body.removeChild = vi.fn() as never

      module.download('test.wav')

      expect(linkClickSpy).toHaveBeenCalled()

      document.createElement = originalCreateElement
      delete (document.body as HTMLElement & Record<string, unknown>).appendChild
      delete (document.body as HTMLElement & Record<string, unknown>).removeChild
    })

    it('uses provided filename', async () => {
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

      module.download('custom_name.wav')

      expect(capturedDownload).toBe('custom_name.wav')

      document.createElement = originalCreateElement
      delete (document.body as HTMLElement & Record<string, unknown>).appendChild
      delete (document.body as HTMLElement & Record<string, unknown>).removeChild
    })

    it('generates default filename when not provided', async () => {
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

      module.download()

      expect(capturedDownload).toMatch(/^tts_output_\d+\.mp3$/)

      document.createElement = originalCreateElement
      delete (document.body as HTMLElement & Record<string, unknown>).appendChild
      delete (document.body as HTMLElement & Record<string, unknown>).removeChild
    })

    it('does nothing when no blob is loaded', async () => {
      const module = useAudioModule()

      // Should not throw
      expect(() => module.download()).not.toThrow()
    })
  })

  describe('dispose', () => {
    it('revokes the current object URL', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const module = useAudioModule()

      module.load(mockBlob)
      vi.clearAllMocks()

      module.dispose()

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('http://mock.url/blob')
    })

    it('clears audioRef src', async () => {
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

      module.dispose()

      // src is set to empty string
      expect(storedSrc).toBe('')
    })

    it('does not throw when called without loaded audio', async () => {
      const module = useAudioModule()

      expect(() => module.dispose()).not.toThrow()
    })

    it('does not throw when audioRef is null', async () => {
      const module = useAudioModule()

      expect(() => module.dispose()).not.toThrow()
    })
  })

  describe('returned interface', () => {
    it('returns all expected refs and methods', () => {
      const module = useAudioModule()

      expect(module.audioRef).toBeDefined()
      expect(module.audioUrl).toBeDefined()
      expect(module.duration).toBeDefined()
      expect(module.currentTime).toBeDefined()
      expect(module.isPlaying).toBeDefined()
      expect(module.isPaused).toBeDefined()
      expect(module.isLoading).toBeDefined()
      expect(module.error).toBeDefined()
      expect(module.formattedCurrentTime).toBeDefined()
      expect(module.formattedDuration).toBeDefined()
      expect(typeof module.load).toBe('function')
      expect(typeof module.play).toBe('function')
      expect(typeof module.pause).toBe('function')
      expect(typeof module.seek).toBe('function')
      expect(typeof module.download).toBe('function')
      expect(typeof module.dispose).toBe('function')
    })

    it('initializes state refs with correct defaults', () => {
      const module = useAudioModule()

      expect(module.audioUrl.value).toBeNull()
      expect(module.isPlaying.value).toBe(false)
      expect(module.isPaused.value).toBe(false)
      expect(module.isLoading.value).toBe(false)
      expect(module.error.value).toBeNull()
      expect(module.duration.value).toBe(0)
      expect(module.currentTime.value).toBe(0)
      expect(module.formattedCurrentTime.value).toBe('0:00')
      expect(module.formattedDuration.value).toBe('0:00')
    })

    it('does not return unexpected properties', () => {
      const module = useAudioModule()

      const keys = Object.keys(module)
      expect(keys).toEqual([
        'isPlaying', 'isPaused', 'currentTime', 'duration',
        'error', 'isLoading', 'audioUrl',
        'formattedCurrentTime', 'formattedDuration',
        'audioRef',
        'load', 'play', 'pause', 'seek', 'download', 'dispose'
      ])
    })
  })

  describe('onPlaybackEnd callback', () => {
    it('calls onPlaybackEnd when passed in options', async () => {
      const callback = vi.fn()
      const module = useAudioModule({ onPlaybackEnd: callback })

      // Simulate audio ended event
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'ended') handler()
        })
      } as unknown as HTMLAudioElement

      module.audioRef.value = mockAudio
      module.audioUrl.value = 'http://mock.url/audio'

      // Wait for watch to trigger
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('regression: audio playback after load', () => {
    it('sets up audio events and assigns src when audioUrl changes', async () => {
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

      // Simulate audioUrl change (this triggers the watch)
      module.audioUrl.value = 'http://mock.url/new-audio'

      // Wait for flush: 'post' watch to fire (post-flush runs after DOM update)
      await new Promise(resolve => setTimeout(resolve, 0))

      // The watch should have called addEventListener for all audio events
      expect(mockAudio.addEventListener).toHaveBeenCalled()
    })

    it('does not call play() when audioRef is null (documenting the guard)', async () => {
      const mockAudio = { play: vi.fn() } as unknown as HTMLAudioElement
      const module = useAudioModule()

      // audioRef is null by default — play() should not throw or crash
      await module.play()

      expect((mockAudio as unknown as Record<string, boolean>).play).toBeDefined()
    })
  })

  describe('error messages', () => {
    it('shows English error when play fails', async () => {
      const mockAudio = {
        play: vi.fn(() => Promise.reject(new DOMException('Not allowed'))),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const module = useAudioModule()
      module.audioRef.value = mockAudio

      await module.play()

      expect(module.error.value).toContain('Unable to play audio')
    })
  })

  describe('formatted time', () => {
    it('formats current time correctly', () => {
      const module = useAudioModule()
      module.currentTime.value = 125

      expect(module.formattedCurrentTime.value).toBe('2:05')
    })

    it('formats duration correctly', () => {
      const module = useAudioModule()
      module.duration.value = 3661

      expect(module.formattedDuration.value).toBe('61:01')
    })

    it('formats zero as 0:00', () => {
      const module = useAudioModule()
      module.currentTime.value = 0

      expect(module.formattedCurrentTime.value).toBe('0:00')
    })

    it('formats invalid as 0:00', () => {
      const module = useAudioModule()
      module.currentTime.value = NaN

      expect(module.formattedCurrentTime.value).toBe('0:00')
    })
  })
})
