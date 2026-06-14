import { computed, nextTick, ref, watch } from 'vue'

export type PanelName = 'control-deck' | 'canvas'

const BREAKPOINT_MOBILE = 768 // Below this = mobile/tablet

export function usePanelToggle() {
  const activePanel = ref<PanelName>('control-deck')

  const isMobile = computed(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < BREAKPOINT_MOBILE
  })

  function togglePanel() {
    activePanel.value = activePanel.value === 'control-deck' ? 'canvas' : 'control-deck'
  }

  async function focusFirstInteractiveElement(panel: PanelName) {
    await nextTick()
    const container = document.querySelector(`[data-panel="${panel}"]`)
    if (!container) return
    const firstInteractive = container.querySelector<HTMLElement>(
      'button, input, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (firstInteractive) {
      firstInteractive.focus()
    }
  }

  watch(activePanel, async (newPanel) => {
    if (isMobile.value) {
      await focusFirstInteractiveElement(newPanel)
    }
  })

  return {
    activePanel,
    isMobile,
    togglePanel,
    focusFirstInteractiveElement
  }
}
