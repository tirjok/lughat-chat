import { ref, computed, onUnmounted } from 'vue'
import { useTimeoutPoll } from '@vueuse/core'

export function useBackendHealth() {
  const status = ref<'loading' | 'ready' | 'error'>('loading')
  const modelLoaded = computed(() => status.value === 'ready')

  let retryCount = 0
  const maxRetries = 10

  async function checkHealth() {
    try {
      const response = await fetch('/health')
      if (!response.ok) {
        status.value = 'error'
        retryCount = maxRetries
        return
      }
      const data = await (await response.json()).status || 'ready'
      status.value = data as 'loading' | 'ready' | 'error'
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

  onUnmounted(() => {
    pause()
  })

  return { status, modelLoaded }
}

export function resetBackendHealth() {}
