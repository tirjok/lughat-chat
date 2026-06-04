// API client for Arabic TTS backend

export interface SynthesisRequest {
  text: string
  speaker?: 'female' | 'male'
  speed?: number
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
          speaker: request.speaker || 'default',
          speed: request.speed || 1.0,
          language: 'ar'
        })
      })
    } catch {
      throw new Error('تعذر الاتصال بالخادم')
    }

    if (!response.ok) {
      const arabicMessages: Record<number, string> = {
        400: 'نص غير صالح للتوليد',
        503: 'الخادم غير متاح حالياً',
        500: 'حدث خطأ في الخادم',
      }

      const errorData = await response.json().catch(() => ({}))
      const statusMessage = arabicMessages[response.status]

      if (statusMessage) {
        throw new Error(statusMessage)
      }

      const detail = errorData?.detail
      if (detail) {
        throw new Error(`خطأ في الخادم: ${detail}`)
      }

      throw new Error('حدث خطأ في الخادم')
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
        throw new Error(`فشل فحص الصحة: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.message.includes('فشل فحص الصحة')) {
        throw error
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`تعذر فحص حالة الصحة: ${message}`)
    }
  }

  return {
    synthesize,
    healthCheck
  }
}
