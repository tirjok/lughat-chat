import { onMounted, shallowRef } from 'vue'
import { useTimeoutPoll } from '@vueuse/core'

export interface UseHealthPollOptions {
  baseUrl?: string
  maxRetries?: number
  retryAfterError?: boolean
  retryInterval?: number
}

export type HealthStatus = 'loading' | 'ready' | 'error' | 'retrying'

/**
 * Health-polling composable that abstracts away Vue reactivity internals.
 *
 * Returns **plain data** (not refs) so consumers never need to know about
 * `.value`, `ShallowRef`, or `ComputedRef`.  The composable manages its own
 * reactive state; the returned object exposes **getters** that always read
 * the latest internal values.
 *
 * Uses a module-level singleton so only one polling interval runs,
 * no matter how many components call useHealthPoll().  When a new
 * component mounts (e.g. after a route switch), it adopts the existing
 * poll instead of being stuck in 'loading' forever.
 */
export interface HealthPollResult {
  /** Current polling status */
  status: HealthStatus
  /** True when the model has finished loading */
  modelLoaded: boolean
  /** Name of the loaded model (empty string until known) */
  modelName: string
  /** Additional status detail (e.g. "initializing", "loading weights") */
  subStatus: string
  /** Stop all polling immediately */
  stop: () => void
  /** Restart fast polling when in "retrying" state */
  retry: () => void
  /** Start polling (called automatically onMounted; exposed for testing) */
  start: () => void
}

// ── Module-level singleton state ──────────────────────────────────────
// Shared across all component instances.  When navigating between routes,
// new instances read the same reactive state instead of being stuck on
// 'loading' forever.
let started = false
let retryCount = 0
let isRetrying = false

// Reactive refs that ALL instances share — updated by checkHealth,
// read by every instance's getters.
const status = shallowRef<HealthStatus>('loading')
const modelName = shallowRef<string>('')
const subStatus = shallowRef<string>('')

let pauseFn: (() => void) | null = null
let resumeFn: (() => void) | null = null

export const useHealthPoll = (options: UseHealthPollOptions = {}): HealthPollResult => {
  const baseUrl = options.baseUrl || ''
  const maxRetries = options.maxRetries ?? 60
  const retryAfterError = options.retryAfterError ?? true
  const retryInterval = options.retryInterval ?? 30000 // 30 seconds

  // ── Internal helpers (closure-local) ────────────────────────────────

  async function checkHealth() {
    try {
      const response = await fetch(`${baseUrl}/health`)

      if (!response.ok) {
        status.value = 'error'
        retryCount = maxRetries
        return
      }

      const data = await response.json()
      status.value = (data.status as HealthStatus) || 'ready'
      modelName.value = (data as Record<string, string>).model_name || ''
      subStatus.value = (data as Record<string, string>).sub_status || ''

      // Stop polling on terminal state (non-retrying)
      if (status.value === 'ready') {
        retryCount = maxRetries
        if (isRetrying) {
          // Recovery: transition from retrying → ready, resume 2s polling
          isRetrying = false
          resumeFn?.()
        } else {
          pauseFn?.()
        }
      }
    } catch {
      retryCount++
      if (retryCount >= maxRetries) {
        if (retryAfterError) {
          // Enter retrying state instead of error
          status.value = 'retrying'
          isRetrying = true
          // Switch to slow polling interval
          pauseFn?.()
          // Restart slow polling via new timeout poll
          _startSlowPoll(checkHealth, retryInterval)
        } else {
          status.value = 'error'
          pauseFn?.()
        }
      }
    }
  }

  function startFastPoll() {
    // Use VueUse's useTimeoutPoll for the core polling mechanism
    const { pause, resume } = useTimeoutPoll(checkHealth, 2000, { immediate: false })
    pauseFn = pause
    resumeFn = resume
  }

  // Slow retry poll (30s interval) — separate from fast poll
  let slowPoll: { pause: () => void } | null = null

  function _startSlowPoll(fn: () => Promise<void>, intervalMs: number) {
    const { pause } = useTimeoutPoll(fn, intervalMs, { immediate: true })
    slowPoll = { pause }
  }

  function startPolling() {
    if (started) return
    started = true
    startFastPoll()
    resumeFn?.()

    // Fire first check immediately
    void checkHealth()
  }

  onMounted(() => {
    startPolling()
  })

  function stop() {
    pauseFn?.()
    slowPoll?.pause()
    isRetrying = false
  }

  function retry() {
    if (isRetrying) {
      // Clear the slow retry poll
      slowPoll = null
      // Restart fast polling (2s)
      pauseFn?.()
      started = false // Reset singleton flag to allow fresh poll
      startFastPoll()
      resumeFn?.()
      // Trigger an immediate health check
      void checkHealth()
    }
  }

  return {
    /** Read the latest status via a getter — always in sync */
    get status(): HealthStatus { return status.value },
    /** Derived: true only when the model is fully loaded */
    get modelLoaded(): boolean { return status.value === 'ready' },
    /** Read the latest model name */
    get modelName(): string { return modelName.value },
    /** Read the latest sub-status */
    get subStatus(): string { return subStatus.value },
    stop,
    retry,
    start: startPolling
  }
}
