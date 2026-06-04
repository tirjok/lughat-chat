// API composable for fetching available voices

export interface Voice {
  id: string
  name: string
  language: string
}

export interface UseVoicesOptions {
  baseUrl?: string
}

export const useVoices = (options: UseVoicesOptions = {}) => {
  const baseUrl = options.baseUrl || ''

  async function fetchVoices(): Promise<Voice[]> {
    const response = await fetch(`${baseUrl}/api/voices`)

    if (!response.ok) {
      throw new Error('Failed to fetch voices')
    }

    return response.json() as Promise<Voice[]>
  }

  return { fetchVoices }
}
