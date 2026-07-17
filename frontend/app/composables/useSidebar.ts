// Composable for managing roadmap sidebar state (open/closed, toggle).
//
// Slice 7: Navigation Infrastructure
//
// Tracks sidebar open state and detects mobile viewport to determine
// the appropriate sidebar width.

import { ref, computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'

export function useSidebar() {
  const isOpen = ref(false)
  const isMobile = useMediaQuery('(max-width: 767px)')

  const sidebarWidth = computed(() => {
    return isMobile.value ? '100vw' : '280px'
  })

  /**
   * Toggle the sidebar open/closed state.
   */
  function toggle(): void {
    isOpen.value = !isOpen.value
  }

  /**
   * Close the sidebar.
   */
  function close(): void {
    isOpen.value = false
  }

  /**
   * Open the sidebar.
   */
  function open(): void {
    isOpen.value = true
  }

  return {
    isOpen,
    isMobile,
    sidebarWidth,
    toggle,
    close,
    open
  }
}
