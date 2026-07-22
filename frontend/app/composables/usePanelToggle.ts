import { nextTick, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'

export type PanelName = 'control-deck' | 'canvas'

export const BREAKPOINT_MOBILE = 768

export function usePanelToggle() {
  const activePanel = ref<PanelName>('control-deck')
  // VueUse: reactive mobile detection (no manual window.innerWidth check)
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINT_MOBILE - 1}px)`)

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
    await focusFirstInteractiveElement(newPanel)
  })

  return {
    activePanel,
    isMobile,
    togglePanel,
    focusFirstInteractiveElement
  }
}
