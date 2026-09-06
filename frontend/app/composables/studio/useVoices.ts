import { useState } from '#app'

export interface Voice {
  id: string
  name: string
  dialect: string
  tag: string
  icon: string
  speaker_wav: string
}

export const useVoices = () => {
  const cachedVoices = useState<Voice[]>('voices', () => [])
  const cachedLoading = useState<boolean>('voices-loading', () => false)
  const cachedError = useState<string | null>('voices-error', () => null)

  async function loadVoices(): Promise<Voice[]> {
    if (cachedVoices.value.length > 0) return cachedVoices.value
    cachedLoading.value = true
    try {
      const response = await fetch('/api/voices')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      cachedVoices.value = await response.json()
      return cachedVoices.value
    } catch (e) {
      cachedError.value = e instanceof Error ? e.message : 'Failed to load voices'
      console.error('Failed to load voices:', e)
      return []
    } finally {
      cachedLoading.value = false
    }
  }

  return { voices: cachedVoices, loading: cachedLoading, error: cachedError, loadVoices }
}
