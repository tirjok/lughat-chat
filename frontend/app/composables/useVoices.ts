export interface Voice {
  id: string
  name: string
}

export const useVoices = () => {
  const voices = ref<Voice[]>([])

  onMounted(async () => {
    try {
      const response = await fetch('/api/voices')
      if (response.ok) {
        voices.value = await response.json()
      }
    } catch (error) {
      console.error('Failed to load voices:', error)
    }
  })

  return { voices }
}
