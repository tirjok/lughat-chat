import { shallowRef, type Ref } from 'vue'
import { showToast } from '../common/useToast'

export function useCleanupNavigation(audioModule: { dispose: () => void }) {
  const dialogVisible: Ref<boolean> = shallowRef(false)

  async function handleCleanupAndLeave() {
    audioModule.dispose()

    try {
      const response = await fetch('/api/cleanup', { method: 'POST' })
      if (response.ok) {
        showToast('Generated files cleaned up successfully', 'success')
      } else if (response.status === 503) {
        showToast('Backend unavailable — orphan files will be cleaned by scheduled job.', 'error')
      } else {
        showToast(`Cleanup failed (${response.status}) — files will be cleaned by 24h TTL.`, 'error')
      }
    } catch {
      showToast('Cleanup failed — files will be cleaned by 24h TTL.', 'error')
    } finally {
      dialogVisible.value = false
    }
  }

  function handleStay() {
    dialogVisible.value = false
    showToast('Navigation cancelled — synthesis continues.', 'info')
  }

  return {
    dialogVisible,
    handleCleanupAndLeave,
    handleStay
  }
}

export const resetCleanupNavigation = () => {}
