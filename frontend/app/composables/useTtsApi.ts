// API client for Arabic TTS backend

export interface SynthesisRequest {
  text: string
  language?: string
  voice?: string
}

export interface SynthesisResponse {
  audio_url: string
  duration_seconds: number
}

export interface HealthResponse {
  status: 'loading' | 'ready' | 'error'
  model_loaded: boolean
}

export interface UseTtsApiOptions {
  baseUrl?: string
}

// Composable for TTS API calls
export const useTtsApi = (options: UseTtsApiOptions = {}) => {
  // All API calls are relative - Nginx proxies them to backend
  const baseUrl = options.baseUrl || ''

  // Synthesize text to speech
  async function synthesize(request: SynthesisRequest): Promise<Blob> {
    let response
    try {
      response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: request.text,
          voice: request.voice,
          language: request.language ?? 'ar'
        })
      })
    } catch {
      throw new Error('Unable to connect to the server')
    }

    if (!response.ok) {
      const errorMessages: Record<number, string> = {
        400: 'Invalid text for synthesis',
        503: 'Server is currently unavailable',
        500: 'An error occurred on the server'
      }

      const errorData = await response.json().catch(() => ({}))
      const statusMessage = errorMessages[response.status]

      if (statusMessage) {
        throw new Error(statusMessage)
      }

      const detail = errorData?.detail
      if (detail) {
        throw new Error(`Server error: ${detail}`)
      }

      throw new Error('An error occurred on the server')
    }

    // Get audio blob from response
    const blob = await response.blob()
    return blob
  }

  // Health check - returns model load status
  async function healthCheck(): Promise<HealthResponse> {
    try {
      const response = await fetch('/health')

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.message.includes('Health check failed')) {
        throw error
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Unable to check health status: ${message}`, { cause: error })
    }
  }

  return {
    synthesize,
    healthCheck
  }
}
