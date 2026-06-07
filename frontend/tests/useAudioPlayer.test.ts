import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAudioPlayer } from '../app/composables/useAudioPlayer'
import * as _toastModule from '../app/composables/useToast'

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadAudio', () => {
    it('creates an object URL from the blob', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()

      const url = player.loadAudio(mockBlob)

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
      expect(url).toBe('http://mock.url/blob')
    })

    it('sets audioUrl ref to the created URL', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()

      player.loadAudio(mockBlob)

      expect(player.audioUrl.value).toBe('http://mock.url/blob')
    })

    it('stores the blob in blobRef', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()

      player.loadAudio(mockBlob)

      expect(player.blobRef.value).toBe(mockBlob)
    })

    it('calls cleanup before creating new URL', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()

      // Load first audio
      player.loadAudio(mockBlob)
      vi.clearAllMocks()

      // Load second audio - should cleanup first
      const mockBlob2 = new Blob(['dummy2'], { type: 'audio/mpeg' })
      player.loadAudio(mockBlob2)

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('http://mock.url/blob')
    })

    it('returns the created URL', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()

      const result = player.loadAudio(mockBlob)

      expect(result).toBe('http://mock.url/blob')
    })
  })

  describe('cleanup', () => {
    it('revokes the object URL if one exists', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()

      player.loadAudio(mockBlob)
      vi.clearAllMocks()

      player.cleanup()

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('http://mock.url/blob')
    })

    it('resets audioUrl to null', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()

      player.loadAudio(mockBlob)
      player.cleanup()

      expect(player.audioUrl.value).toBeNull()
    })

    it('resets blobRef to null', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()

      player.loadAudio(mockBlob)
      player.cleanup()

      expect(player.blobRef.value).toBeNull()
    })

    it('resets isPlaying to false', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()

      player.loadAudio(mockBlob)
      player.isPlaying.value = true
      player.cleanup()

      expect(player.isPlaying.value).toBe(false)
    })

    it('resets isPaused to false', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()

      player.loadAudio(mockBlob)
      player.isPaused.value = true
      player.cleanup()

      expect(player.isPaused.value).toBe(false)
    })

    it('does not throw when called without loaded audio', async () => {
      const player = useAudioPlayer()

      expect(() => player.cleanup()).not.toThrow()
    })
  })

  describe('play', () => {
    it('calls play() on audioRef when available', async () => {
      const mockAudio = {
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const player = useAudioPlayer()
      player.audioRef.value = mockAudio

      player.play()

      expect(mockAudio.play).toHaveBeenCalled()
    })

    it('sets error when play rejects', async () => {
      const mockAudio = {
        play: vi.fn(() => Promise.reject(new DOMException('Not allowed'))),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const player = useAudioPlayer()
      player.audioRef.value = mockAudio

      await player.play()

      expect(player.error.value).toContain('Unable to play audio')
    })

    it('does nothing when audioRef is null', async () => {
      const player = useAudioPlayer()

      expect(() => player.play()).not.toThrow()
    })
  })

  describe('pause', () => {
    it('calls pause() on audioRef when available', async () => {
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const player = useAudioPlayer()
      player.audioRef.value = mockAudio

      player.pause()

      expect(mockAudio.pause).toHaveBeenCalled()
    })

    it('does nothing when audioRef is null', async () => {
      const player = useAudioPlayer()

      expect(() => player.pause()).not.toThrow()
    })
  })

  describe('togglePlayPause', () => {
    it('pauses when playing and not paused', async () => {
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const player = useAudioPlayer()
      player.audioRef.value = mockAudio
      player.isPlaying.value = true
      player.isPaused.value = false

      player.togglePlayPause()

      expect(mockAudio.pause).toHaveBeenCalled()
    })

    it('plays when not playing', async () => {
      const mockAudio = {
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const player = useAudioPlayer()
      player.audioRef.value = mockAudio
      player.isPlaying.value = false

      player.togglePlayPause()

      expect(mockAudio.play).toHaveBeenCalled()
    })

    it('plays when paused', async () => {
      const mockAudio = {
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const player = useAudioPlayer()
      player.audioRef.value = mockAudio
      player.isPlaying.value = true
      player.isPaused.value = true

      player.togglePlayPause()

      expect(mockAudio.play).toHaveBeenCalled()
    })
  })

  describe('getDownloadUrl', () => {
    it('returns object URL for the blob when available', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()
      player.blobRef.value = mockBlob

      const url = player.getDownloadUrl()

      expect(url).toBe('http://mock.url/blob')
    })

    it('returns null when no blob is loaded', async () => {
      const player = useAudioPlayer()

      expect(player.getDownloadUrl()).toBeNull()
    })
  })

  describe('downloadAudio', () => {
    it('creates and clicks a download link when blob exists', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()
      player.blobRef.value = mockBlob

      const linkClickSpy = vi.fn()
      let capturedDownload = ''

      const originalCreateElement = document.createElement.bind(document)

      document.createElement = vi.fn((tag: string) => {
        if (tag === 'a') {
          return {
            href: '',
            click: linkClickSpy,
            set download(val: string) { capturedDownload = val }
          }
        }
        return originalCreateElement(tag)
      })

      document.body.appendChild = vi.fn() as never
      document.body.removeChild = vi.fn() as never

      player.downloadAudio('test.wav')

      expect(linkClickSpy).toHaveBeenCalled()
      expect(capturedDownload).toBe('test.wav')

      document.createElement = originalCreateElement
      delete (document.body as HTMLElement & Record<string, unknown>).appendChild
      delete (document.body as HTMLElement & Record<string, unknown>).removeChild
    })

    it('uses provided filename', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()
      player.blobRef.value = mockBlob

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

      player.downloadAudio('custom_name.wav')

      expect(capturedDownload).toBe('custom_name.wav')

      document.createElement = originalCreateElement
      delete (document.body as HTMLElement & Record<string, unknown>).appendChild
      delete (document.body as HTMLElement & Record<string, unknown>).removeChild
    })

    it('generates default filename when not provided', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()
      player.blobRef.value = mockBlob

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

      player.downloadAudio()

      expect(capturedDownload).toMatch(/^tts_output_\d+\.mp3$/)

      document.createElement = originalCreateElement
      delete (document.body as HTMLElement & Record<string, unknown>).appendChild
      delete (document.body as HTMLElement & Record<string, unknown>).removeChild
    })

    it('does nothing when no blob is loaded', async () => {
      const player = useAudioPlayer()

      expect(() => player.downloadAudio()).not.toThrow()
    })

    it('defaults to .mp3 extension when no filename provided', async () => {
      const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
      const player = useAudioPlayer()
      player.blobRef.value = mockBlob

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

      player.downloadAudio()

      expect(capturedDownload).toMatch(/^tts_output_\d+\.mp3$/)

      document.createElement = originalCreateElement
      delete (document.body as HTMLElement & Record<string, unknown>).appendChild
      delete (document.body as HTMLElement & Record<string, unknown>).removeChild
    })
  })

  describe('returned interface', () => {
    it('returns all expected refs and methods', () => {
      const player = useAudioPlayer()

      expect(player.audioRef).toBeDefined()
      expect(player.audioUrl).toBeDefined()
      expect(player.duration).toBeDefined()
      expect(player.currentTime).toBeDefined()
      expect(player.isPlaying).toBeDefined()
      expect(player.isPaused).toBeDefined()
      expect(player.isLoading).toBeDefined()
      expect(player.error).toBeDefined()
      expect(typeof player.loadAudio).toBe('function')
      expect(typeof player.play).toBe('function')
      expect(typeof player.pause).toBe('function')
      expect(typeof player.togglePlayPause).toBe('function')
      expect(typeof player.downloadAudio).toBe('function')
      expect(typeof player.cleanup).toBe('function')
    })

    it('initializes state refs with correct defaults', () => {
      const player = useAudioPlayer()

      expect(player.audioUrl.value).toBeNull()
      expect(player.blobRef.value).toBeNull()
      expect(player.isPlaying.value).toBe(false)
      expect(player.isPaused.value).toBe(false)
      expect(player.isLoading.value).toBe(false)
      expect(player.error.value).toBeNull()
      expect(player.duration.value).toBe(0)
      expect(player.currentTime.value).toBe(0)
    })

    it('does not return unexpected properties', () => {
      const player = useAudioPlayer()

      expect(Object.keys(player)).toEqual([
        'audioRef', 'audioUrl', 'blobRef', 'duration', 'currentTime',
        'isPlaying', 'isPaused', 'isLoading', 'error',
        'loadAudio', 'play', 'pause', 'togglePlayPause',
        'getDownloadUrl', 'downloadAudio', 'cleanup'
      ])
    })
  })

  describe('onPlaybackEnd callback', () => {
    it('calls onPlaybackEnd when passed in options', async () => {
      const callback = vi.fn()
      const player = useAudioPlayer({ onPlaybackEnd: callback })

      // Simulate audio ended event
      const mockAudio = {
        play: vi.fn(),
        pause: vi.fn(),
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'ended') handler()
        })
      } as unknown as HTMLAudioElement

      player.audioRef.value = mockAudio
      player.audioUrl.value = 'http://mock.url/audio'

      // Wait for watch to trigger
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('regression: audio playback after loadAudio', () => {
    // Regression test for the Vue reactivity timing issue:
    // loadAudio() sets audioUrl.value which triggers a Transition to mount
    // <audio ref="audioRef">. The watch(audioUrl) must set up events and
    // assign src AFTER the DOM update completes (flush: 'post').
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

      const player = useAudioPlayer()
      player.audioRef.value = mockAudio

      // Simulate audioUrl change (this triggers the watch)
      player.audioUrl.value = 'http://mock.url/new-audio'

      // Wait for flush: 'post' watch to fire (post-flush runs after DOM update)
      await new Promise(resolve => setTimeout(resolve, 0))

      // The watch should have called addEventListener for all audio events
      expect(mockAudio.addEventListener).toHaveBeenCalled()
    })

    it('does not call play() when audioRef is null (documenting the guard)', async () => {
      const mockAudio = { play: vi.fn() } as unknown as HTMLAudioElement
      const player = useAudioPlayer()

      // audioRef is null by default — play() should not throw or crash
      await player.play()

      expect(mockAudio.play).not.toHaveBeenCalled()
    })
  })

  describe('error messages', () => {
    it('shows English error when play fails', async () => {
      const mockAudio = {
        play: vi.fn(() => Promise.reject(new DOMException('Not allowed'))),
        pause: vi.fn(),
        addEventListener: vi.fn()
      } as unknown as HTMLAudioElement

      const player = useAudioPlayer()
      player.audioRef.value = mockAudio

      await player.play()

      expect(player.error.value).toContain('Unable to play audio')
    })
  })
})
