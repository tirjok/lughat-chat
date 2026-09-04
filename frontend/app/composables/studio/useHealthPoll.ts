import { ref, computed } from 'vue'
import { useTimeoutPoll } from '@vueuse/core'

export interface UseHealthPollOptions {
  baseUrl?: string
  maxRetries?: number
}

export const useHealthPoll = (options: UseHealthPollOptions = {}) => {
  const status = ref<'loading' | 'ready' | 'error'>('loading')
  const modelLoaded = computed(() => status.value === 'ready')

  const baseUrl = options.baseUrl || ''
  const maxRetries = options.maxRetries ?? 10
  let retryCount = 0

  async function checkHealth() {
    try {
      const response = await fetch(`${baseUrl}/health`)

      if (!response.ok) {
        status.value = 'error'
        retryCount = maxRetries
        return
      }

      const data = await response.json()
      status.value = data.status || 'ready'

      if (status.value === 'ready') {
        retryCount = maxRetries
        pause()
      }
    } catch {
      retryCount++
      if (retryCount >= maxRetries) {
        status.value = 'error'
        pause()
      }
    }
  }

  const { pause, resume } = useTimeoutPoll(checkHealth, 2000)
  resume()

  return {
    status,
    modelLoaded
  }
}


export function resetHealthPoll() {}
