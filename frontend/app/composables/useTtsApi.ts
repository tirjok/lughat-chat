// API client for Arabic TTS backend
// Supports both async (job-based) and sync (backwards-compatible) modes.

export interface SynthesisRequest {
  text: string
  speaker?: string
  speed?: number
  language?: string
  voice?: string
  pitch?: number
  seed?: number
}

export interface SynthesisResponse {
  audio_url: string
  duration_seconds: number
}

export interface JobResponse {
  job_id: string
  status: 'pending'
}

export interface JobStatusResponse {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'not_found'
  error?: string
  audio_url?: string
  filename?: string
}

export interface HealthResponse {
  status: 'loading' | 'ready' | 'error'
  model_loaded: boolean
}

export interface UseTtsApiOptions {
  baseUrl?: string
  /** Use async job-based API (default: true). Set to false for sync mode. */
  asyncMode?: boolean
}

// Composable for TTS API calls
export const useTtsApi = (options: UseTtsApiOptions = {}) => {
  const baseUrl = options.baseUrl || ''
  const asyncMode = options.asyncMode ?? true

  // -----------------------------------------------------------------------
  // Async mode (job-based) — new default
  // -----------------------------------------------------------------------

  /** Submit a synthesis job. Returns job_id immediately. */
  async function submitJob(request: SynthesisRequest): Promise<string> {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: request.text,
        speaker: request.speaker,
        voice: request.voice,
        speed: request.speed ?? 1.0,
        language: request.language ?? 'ar',
        pitch: request.pitch ?? 0.0,
        seed: request.seed
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const detail = errorData?.detail
      if (detail) {
        throw new Error(`Server error: ${detail}`)
      }
      throw new Error(`Generate failed: ${response.status}`)
    }

    const data = (await response.json()) as { job_id: string, status: string }
    return data.job_id
  }

  /** Poll job status. Returns { status, error?, audio_url?, filename? }. */
  async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${baseUrl}/api/jobs/${jobId}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const detail = errorData?.detail
      if (detail) {
        throw new Error(`Job error: ${detail}`)
      }
      throw new Error(`Status check failed: ${response.status}`)
    }

    return response.json() as Promise<JobStatusResponse>
  }

  /** Wait for a job to complete, then return the audio blob. */
  async function synthesize(request: SynthesisRequest): Promise<Blob> {
    if (asyncMode) {
      // Async mode: submit job, poll for completion, fetch audio
      const jobId = await submitJob(request)

      // Poll every 500ms until completed or failed
      while (true) {
        const status = await getJobStatus(jobId)

        if (status.status === 'completed') {
          if (status.audio_url) {
            // Fetch the actual audio file
            const audioResponse = await fetch(`${baseUrl}${status.audio_url}`)
            if (!audioResponse.ok) {
              throw new Error('Failed to retrieve generated audio')
            }
            return await audioResponse.blob()
          }
          throw new Error('Job completed but no audio URL available')
        }

        if (status.status === 'failed') {
          throw new Error(status.error || 'Generation failed')
        }

        if (status.status === 'not_found') {
          throw new Error('Job not found')
        }

        // Still pending/running — wait and poll again
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } else {
      // Sync mode (backwards-compatible): use the sync endpoint directly
      return _syncSynthesize(request)
    }
  }

  // -----------------------------------------------------------------------
  // Sync mode (backwards-compatible) — keeps old frontend working
  // -----------------------------------------------------------------------

  async function _syncSynthesize(request: SynthesisRequest): Promise<Blob> {
    const response = await fetch(`${baseUrl}/api/generate_sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: request.text,
        speaker: request.speaker,
        speed: request.speed ?? 1.0,
        language: request.language ?? 'ar',
        voice: request.voice,
        pitch: request.pitch ?? 0.0,
        seed: request.seed
      })
    })

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

    return response.blob()
  }

  // -----------------------------------------------------------------------
  // Health check (unchanged)
  // -----------------------------------------------------------------------

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
      throw new Error(`Unable to check health status: ${message}`)
    }
  }

  return {
    /** Submit a synthesis job and return job_id (async mode). */
    submitJob,
    /** Poll job status (async mode). */
    getJobStatus,
    /** Generate speech — auto-selects mode based on asyncMode option. */
    synthesize,
    /** Health check (unchanged). */
    healthCheck
  }
}
