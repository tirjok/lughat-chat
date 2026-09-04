export interface Voice {
  id: string
  name: string
  dialect: string
  tag: string
  icon: string
  speaker_wav: string
}

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
    loadVoices()
  })

  return { voices, loading, error, loadVoices }
}
