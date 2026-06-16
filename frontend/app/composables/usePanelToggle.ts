import { nextTick, ref, watch } from 'vue'

export type PanelName = 'control-deck' | 'canvas'

export function usePanelToggle() {
  const activePanel = ref<PanelName>('control-deck')

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
    togglePanel,
    focusFirstInteractiveElement
  }
}
