import { shallowRef } from 'vue'
import { showToast } from './useToast'

export function useCleanupSettings() {
  const isLoading = shallowRef(false)
  const lastRemovedCount = shallowRef<number | null>(null)

  async function runCleanup(): Promise<void> {
    isLoading.value = true
    try {
      const response = await fetch('/api/cleanup', { method: 'POST' })

      if (response.ok) {
        const data = await response.json()
        lastRemovedCount.value = data.removed_count
        showToast(
          `Cleanup complete: ${data.removed_count} files removed`,
          'success'
        )
      } else if (response.status === 503) {
        showToast(
          'Backend unavailable — cleanup will run next scheduled cycle.',
          'info'
        )
      } else {
        showToast(
          `Cleanup failed (${response.status}) — files will be cleaned by 24h TTL.`,
          'error'
        )
      }
    } catch {
      showToast(
        'Cleanup failed — files will be cleaned by 24h TTL.',
        'error'
      )
    } finally {
      isLoading.value = false
    }
  }

  return { runCleanup, isLoading, lastRemovedCount }
}
