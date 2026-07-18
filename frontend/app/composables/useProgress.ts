// Composable for fetching and managing user progress data.
//
// Slice 7: Navigation Infrastructure
//
// This composable fetches lesson progress from the backend API and
// exposes the result reactively. It uses Nuxt's `$fetch` for SSR-safe
// HTTP requests that forward cookies and headers.
//
// Usage:
//   const { progress, loading, error, fetchProgress } = useProgress()
//   await fetchProgress(lessonId)

import type { ActivityProgress } from '../shared/types'

export interface ProgressData {
  status: string
  activities: Record<string, ActivityProgress>
}

export type { ActivityProgress }

export interface UseProgressOptions {
  /** Base URL for the API. Defaults to runtime config public.apiBase. */
  baseUrl?: string
}

/**
 * Fetch and manage user progress for a given lesson.
 * @param options - Optional configuration (baseUrl override)
 * @returns Reactive progress state and fetch method
 */
export const useProgress = (options: UseProgressOptions = {}) => {
  // Use Nuxt runtime config for API base — supports env var override.
  // In test environments, useRuntimeConfig may return undefined;
  // fall back to a default path that works with registerEndpoint.
  const config = useRuntimeConfig()
  const apiBase = options.baseUrl
    ?? (typeof config?.public?.apiBase === 'string' ? config.public.apiBase : '/api')

  const progress = ref<ProgressData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch progress data for a specific lesson.
   * @param lessonId - The lesson identifier
   * @returns The progress data, or null on failure
   */
  async function fetchProgress(lessonId: number): Promise<ProgressData | null> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<{
        progress: ProgressData
      }>(`${apiBase}/lessons/${lessonId}`)
      progress.value = response.progress
      return progress.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      progress.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    progress,
    loading,
    error,
    fetchProgress
  }
}
