import { shallowRef, type Ref } from 'vue'
import { showToast } from './useToast'

export function useCleanupNavigation(audioModule: { dispose: () => void }) {
  const dialogVisible: Ref<boolean> = shallowRef(false)

  async function handleCleanupAndLeave() {
    // AC-4: Dispose audio module (revokes object URLs, removes listeners)
    audioModule.dispose()

    // AC-4: POST /api/cleanup for orphan file removal
    try {
      const response = await fetch('/api/cleanup', { method: 'POST' })
      if (response.ok) {
        showToast('Generated files cleaned up successfully', 'success')
      } else if (response.status === 503) {
        // AC-6: Backend unavailable during cleanup
        showToast('Backend unavailable — orphan files will be cleaned by scheduled job.', 'error')
      } else {
        // AC-14: Cleanup failed with non-503 error
        showToast(`Cleanup failed (${response.status}) — files will be cleaned by 24h TTL.`, 'error')
      }
    } catch {
      // AC-14: Network error during cleanup — orphan files may remain
      showToast('Cleanup failed — files will be cleaned by 24h TTL.', 'error')
    } finally {
      dialogVisible.value = false
    }
  }

  function handleStay() {
    // AC-5: Cancel navigation, synthesis continues
    dialogVisible.value = false
    showToast('Navigation cancelled — synthesis continues.', 'info')
  }

  return {
    dialogVisible,
    handleCleanupAndLeave,
    handleStay
  }
}
// ─── Test helper: reset dialog state ─────────────────────────────────
export function resetCleanupNavigation() {
  // Reset all instances' dialog visibility
  // Since each call creates a local ref, we can't reset them all.
  // For testing, we just clear the mock state.
}
