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

export const useHealthPoll = (options: UseHealthPollOptions = {}): HealthPollResult => {
  const status = shallowRef<HealthStatus>('loading')
  const modelName = shallowRef<string>('')
  const subStatus = shallowRef<string>('')

  const baseUrl = options.baseUrl || ''
  const maxRetries = options.maxRetries ?? 60
  const retryAfterError = options.retryAfterError ?? true
  const retryInterval = options.retryInterval ?? 30000 // 30 seconds

  let intervalId: ReturnType<typeof setInterval> | null = null
  let retryCount = 0
  let isRetrying = false

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
      status.value = (data.status as HealthStatus) || 'ready'
      modelName.value = (data as Record<string, string>).model_name || ''
      subStatus.value = (data as Record<string, string>).sub_status || ''

      // Stop polling on terminal state (non-retrying)
      if (status.value === 'ready') {
        retryCount = maxRetries
        if (isRetrying) {
          // Recovery: transition from retrying → ready, resume 2s polling
          isRetrying = false
          intervalId = setInterval(checkHealth, 2000)
        } else {
          if (intervalId !== null) {
            clearInterval(intervalId)
            intervalId = null
          }
        }
      }
    } catch {
      retryCount++
      if (retryCount >= maxRetries) {
        if (retryAfterError) {
          // Enter retrying state instead of error
          status.value = 'retrying'
          isRetrying = true
          // Stop the fast polling interval and restart at a slower one
          if (intervalId !== null) {
            clearInterval(intervalId)
            intervalId = null
          }
          intervalId = setInterval(checkHealth, retryInterval)
        } else {
          status.value = 'error'
          if (intervalId !== null) {
            clearInterval(intervalId)
            intervalId = null
          }
        }
      }
    }
  }

  function startPolling() {
    intervalId = setInterval(checkHealth, 2000)

    // Fire first check immediately
    void checkHealth()
  }

  onMounted(() => {
    startPolling()
  })

  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    isRetrying = false
  }

  function retry() {
    if (isRetrying) {
      // Clear the slow retry interval
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
      // Restart fast polling (2s)
      intervalId = setInterval(checkHealth, 2000)
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
