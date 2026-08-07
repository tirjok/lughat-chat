export interface UseHealthPollOptions {
  baseUrl?: string
  maxRetries?: number
}

// ─── Module-level singleton state ────────────────────────────────────
// Shared across ALL callers — one status, one interval, one lifecycle.
const sharedStatus = ref<'loading' | 'ready' | 'error'>('loading')
const sharedModelLoaded = computed(() => sharedStatus.value === 'ready')

let intervalId: ReturnType<typeof setInterval> | null = null
let retryCount = 0
let started = false
let mountCount = 0

// Single return object — every caller gets this exact reference.
const singletonInstance = {
  get status() { return sharedStatus },
  get modelLoaded() { return sharedModelLoaded }
}

export const useHealthPoll = (options: UseHealthPollOptions = {}) => {
  const baseUrl = options.baseUrl || ''
  const maxRetries = options.maxRetries ?? 150

  async function checkHealth() {
    try {
      const response = await fetch(`${baseUrl}/health`)

      if (!response.ok) {
        sharedStatus.value = 'error'
        retryCount = maxRetries
        if (intervalId !== null) {
          clearInterval(intervalId)
          intervalId = null
        }
        return
      }

      const data = await response.json()
      sharedStatus.value = data.status || 'loading'

      // Stop polling on terminal state
      if (sharedStatus.value === 'ready' || sharedStatus.value === 'error') {
        retryCount = maxRetries
        if (intervalId !== null) {
          clearInterval(intervalId)
          intervalId = null
        }
      }
    } catch {
      retryCount++
      if (retryCount >= maxRetries) {
        sharedStatus.value = 'error'
        if (intervalId !== null) {
          clearInterval(intervalId)
          intervalId = null
        }
      }
    }
  }

  function startPolling() {
    if (started) return
    started = true

    intervalId = setInterval(checkHealth, 2000)

    // Fire first check immediately
    void checkHealth()
  }

  onMounted(() => {
    mountCount++
    if (mountCount === 1) {
      startPolling()
    }
  })

  onUnmounted(() => {
    mountCount--
    if (mountCount === 0 && intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  })

  return singletonInstance
}

// ─── Test helper: reset singleton state ───────────────────────────────
// Exposed so tests can isolate between test cases.
// NOT used in production.
export const resetHealthPoll = () => {
  sharedStatus.value = 'loading'
  retryCount = 0
  started = false
  mountCount = 0
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}
