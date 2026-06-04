export interface UseHealthPollOptions {
  baseUrl?: string
  maxRetries?: number
}

export const useHealthPoll = (options: UseHealthPollOptions = {}) => {
  const status = ref<'loading' | 'ready' | 'error'>('loading')
  const modelLoaded = computed(() => status.value === 'ready')

  // Start polling immediately
  const baseUrl = options.baseUrl || ''
  const maxRetries = options.maxRetries ?? 10
  let intervalId: ReturnType<typeof setInterval> | null = null
  let retryCount = 0

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
      status.value = data.status || 'ready'

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

  onMounted(() => {
    intervalId = setInterval(checkHealth, 2000)

    // Fire first check immediately
    void checkHealth()
  })

  return {
    status,
    modelLoaded
  }
}
