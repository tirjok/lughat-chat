import { ref, computed, onUnmounted } from 'vue'
import { useTimeoutPoll } from '@vueuse/core'

const status = ref<'loading' | 'ready' | 'error'>('loading')
const modelLoaded = computed(() => status.value === 'ready')

// Poll until the model is ready. On failure keep polling so the UI
// recovers automatically once the backend is reachable again.
const { pause, resume } = useTimeoutPoll(async () => {
  try {
    const response = await fetch('/health')
    if (!response.ok) {
      status.value = 'error'
      return
    }
    const data = (await response.json()).status || 'ready'
    status.value = data as 'loading' | 'ready' | 'error'
    if (status.value === 'ready') {
      pause()
    }
  } catch {
    status.value = 'error'
  }
}, 2000)

export function useBackendHealth() {
  resume()
  onUnmounted(pause)
  return { status, modelLoaded }
}

export function resetBackendHealth() {
  pause()
  status.value = 'loading'
  resume()
}
