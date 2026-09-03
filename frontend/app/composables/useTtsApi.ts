// API client for Arabic TTS backend

export interface SynthesisRequest {
  text: string
  speaker?: string
  speed?: number
  seed?: number
  signal?: AbortSignal
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

export const useTtsApi = (options: UseTtsApiOptions = {}) => {
  // All API calls are relative - Nginx proxies them to backend
  const baseUrl = options.baseUrl || ''

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
          speaker: request.speaker,
          speed: request.speed || 1.0,
          seed: request.seed,
          language: 'ar',
          signal: request.signal
        }),
        signal: request.signal
      })
    } catch {
      throw new Error('Unable to connect to the server')
    }

    if (!response.ok) {
      const errorMessages: Record<number, string> = {
        400: 'Invalid text for synthesis',
        422: 'Validation error',
        503: 'Model is still loading',
        500: 'Failed to generate audio'
      }

      const errorData = await response.json().catch(() => ({}))
      const statusMessage = errorMessages[response.status]

      if (statusMessage) {
        throw new Error(statusMessage)
      }

      const detail = errorData?.detail
      if (detail) {
        throw new Error(detail)
      }

      throw new Error('An error occurred on the server')
    }

    const blob = await response.blob()
    return blob
  }

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
