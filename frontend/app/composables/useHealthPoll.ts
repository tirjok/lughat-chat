/**
 * Singleton health poll composable.
 *
 * Multiple components (ModelStatusIndicator, MobileStatusIndicator, index page)
 * all need model status. Instead of each calling useHealthPoll() independently
 * (which creates duplicate intervals and redundant network requests), this
 * module provides a shared poller that all consumers subscribe to.
 *
 * The poller is started lazily on the first call to useHealthPoll().
 * Components that use this composable should call onMounted(() => {
 *   useHealthPoll().start()
 * }) to begin polling.
 */

import type { Ref, ComputedRef } from 'vue'
import { ref, computed } from 'vue'

export interface UseHealthPollOptions {
  baseUrl?: string
  maxRetries?: number
}

interface HealthState {
  status: Ref<'loading' | 'ready' | 'error'>
  modelLoaded: ComputedRef<boolean>
  start: () => void
  stop: () => void
}

// Lazy singleton — created on first useHealthPoll() call
let _poller: HealthState | null = null

function createPoller(options: UseHealthPollOptions = {}): HealthState {
  const status = ref<'loading' | 'ready' | 'error'>('loading')
  const modelLoaded = computed(() => status.value === 'ready')
  const baseUrl = options.baseUrl || ''
  const maxRetries = options.maxRetries ?? 10
  let intervalId: ReturnType<typeof setInterval> | null = null
  let retryCount = 0
  let started = false

  async function checkHealth() {
    try {
      const response = await fetch(`${baseUrl}/health`)

      if (!response.ok) {
        status.value = 'error'
        retryCount = maxRetries
        if (intervalId !== null) {
          clearInterval(intervalId)
          intervalId = null
        }
        return
      }

      const data = await response.json()
      status.value = (data.status as 'loading' | 'ready' | 'error') || 'ready'

      // Stop polling on terminal state
      if (status.value === 'ready') {
        retryCount = maxRetries
        if (intervalId !== null) {
          clearInterval(intervalId)
          intervalId = null
        }
      }
    } catch {
      retryCount++
      if (retryCount >= maxRetries) {
        status.value = 'error'
        if (intervalId !== null) {
          clearInterval(intervalId)
          intervalId = null
        }
      }
    }
  }

  function start() {
    if (started) return
    started = true
    intervalId = setInterval(checkHealth, 2000)
    // Fire first check immediately
    void checkHealth()
  }

  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return { status, modelLoaded, start, stop }
}

/**
 * Get or create the singleton health poller.
 *
 * Call this from components that need model status. The first call creates
 * the poller; subsequent calls return the same state, so only one interval
 * and one network request fire.
 *
 * Call .start() from onMounted to begin polling.
 */
export const useHealthPoll = (options: UseHealthPollOptions = {}): HealthState => {
  if (_poller === null) {
    _poller = createPoller(options)
  }
  return _poller
}

/**
 * Reset the singleton (for testing only).
 * Call this in beforeEach to ensure each test gets a fresh poller.
 */
export const _resetHealthPoll = () => {
  if (_poller !== null) {
    _poller.stop()
  }
  _poller = null
}
