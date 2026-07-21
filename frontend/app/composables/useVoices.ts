export interface Voice {
  id: string
  name: string
  dialect: string
  tag: string
  icon: string
  speaker_wav: string
}

// Module-level flag ensures only one voice fetch is ever triggered,
// no matter how many components call useVoices().
let started = false

export const useVoices = () => {
  const voices = ref<Voice[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadVoices(): Promise<Voice[]> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('/api/voices')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      voices.value = await response.json()
      return voices.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load voices'
      console.error('Failed to load voices:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    if (started) return
    started = true
    loadVoices()
  })

  return { voices, loading, error, loadVoices }
}
/** Reset the singleton (for testing only). */
export function __resetVoicesState(): void {
  started = false
}
