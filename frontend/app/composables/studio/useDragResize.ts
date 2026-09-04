import { onMounted, onUnmounted, shallowRef } from 'vue'

interface UseDragResizeOptions {
  initialRatio?: number
  minRatio?: number
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

  let startY = 0
  let startRatio = 0

  function getClientY(e: TouchEvent | MouseEvent): number {
    if ('touches' in e) {
      return e.touches[0]!.clientY
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
