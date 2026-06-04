import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountedCallbacks } from '../../tests/setup'
import { useHealthPoll } from './useHealthPoll'

describe('useHealthPoll', () => {
  beforeEach(() => {
    mountedCallbacks.length = 0
    vi.clearAllMocks()
  })

  it('should not call setInterval during composable initialization (SSR-safe)', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    // Call the composable
    useHealthPoll()

    // setInterval should NOT be called during initialization
    expect(setIntervalSpy).not.toHaveBeenCalled()

    setIntervalSpy.mockRestore()
  })

  it('should start polling when onMounted callback is triggered', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    useHealthPoll()

    // No setInterval yet
    expect(setIntervalSpy).not.toHaveBeenCalled()

    // Trigger the mounted callback (simulating component mount)
    for (const cb of mountedCallbacks) {
      cb()
    }

    // Now setInterval should have been called once with 2000ms interval
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000)

    setIntervalSpy.mockRestore()
  })
})
