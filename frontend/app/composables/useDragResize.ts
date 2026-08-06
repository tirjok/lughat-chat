// Composable: Drag-resize for mobile split-screen panels.
// Manages canvas ratio, drag state, and document-level event listeners.
// Returns reactive refs and handler functions for touch/mouse drag.

import { onMounted, onUnmounted, shallowRef } from 'vue'

interface UseDragResizeOptions {
  /** Initial canvas ratio (0.0–1.0) */
  initialRatio?: number
  /** Minimum canvas ratio */
  minRatio?: number
  /** Maximum canvas ratio */
  maxRatio?: number
}

export function useDragResize(options: UseDragResizeOptions = {}) {
  const {
    initialRatio = 0.55,
    minRatio = 0.25,
    maxRatio = 0.85
  } = options

  const canvasRatio = shallowRef(initialRatio)
  const isDragging = shallowRef(false)

  // Non-reactive drag state — only accessed during drag lifecycle.
  // Reset on drag end so a re-render doesn't corrupt it.
  let startY = 0
  let startRatio = 0

  function getClientY(e: TouchEvent | MouseEvent): number {
    if ('touches' in e) {
      return e.touches[0].clientY
    }
    return e.clientY
  }

  function onDragStart(e: TouchEvent | MouseEvent) {
    startY = getClientY(e)
    startRatio = canvasRatio.value
    isDragging.value = true
    document.body.classList.add('dragging')
  }

  function onDragMove(e: TouchEvent | MouseEvent) {
    if (!isDragging.value) return
    const clientY = getClientY(e)
    const delta = (startY - clientY) / window.innerHeight
    canvasRatio.value = Math.max(minRatio, Math.min(maxRatio, startRatio + delta))
  }

  function onDragEnd() {
    isDragging.value = false
    document.body.classList.remove('dragging')
  }

  // Reset drag state on window resize (prevents stale state after orientation change)
  function onResize() {
    if (isDragging.value) {
      onDragEnd()
    }
  }

  onMounted(() => {
    window.addEventListener('resize', onResize, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
  })

  return {
    canvasRatio,
    isDragging,
    onDragStart,
    onDragMove,
    onDragEnd
  }
}
