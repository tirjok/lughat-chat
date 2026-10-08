import { onMounted, onUnmounted, shallowRef } from 'vue'
import { animate, spring } from '@motionone/dom'

interface UseDragResizeOptions {
  initialRatio?: number
  minRatio?: number
  maxRatio?: number
  flickThreshold?: number // px/s — minimum velocity to trigger projection (default 30)
  decelerationRate?: number // (0, 1) — 0.998 = 99.8% per frame (default)
}

interface VelocityBufferEntry {
  clientY: number
  timestamp: number
}

export function useDragResize(options: UseDragResizeOptions = {}) {
  const {
    initialRatio = 0.55,
    minRatio = 0.25,
    maxRatio = 0.85,
    flickThreshold = 30,
    decelerationRate = 0.998
  } = options

  const canvasRatio = shallowRef(initialRatio)
  const isDragging = shallowRef(false)

  let startY = 0
  let startRatio = 0

  // Velocity tracking buffer (last 4 pointermove events)
  const velocityBuffer: VelocityBufferEntry[] = []
  const MAX_BUFFER = 4

  let currentVelocity = 0 // px/s
  let isAnimating = false

  function getClientY(e: TouchEvent | MouseEvent | PointerEvent): number {
    if ('touches' in e) {
      return e.touches[0]!.clientY
    }
    return 'clientY' in e ? (e as PointerEvent).clientY : 0
  }

  function pushVelocityBuffer(clientY: number) {
    const now = performance.now()
    velocityBuffer.push({ clientY, timestamp: now })
    if (velocityBuffer.length > MAX_BUFFER) {
      velocityBuffer.shift()
    }
  }

  function calculateVelocity(): number {
    if (velocityBuffer.length < 2) return 0
    const first = velocityBuffer[0]!
    const last = velocityBuffer[velocityBuffer.length - 1]!
    const dt = (last.timestamp - first.timestamp) / 1000 // seconds
    if (dt === 0) return 0
    return (last.clientY - first.clientY) / dt // px/s
  }

  function getVelocity(): number {
    return currentVelocity
  }

  function projectRatio(velocity: number): number {
    // Apple's formula: project(velocity, 0.998)
    // project(velocity, d) = (velocity / 1000) * d / (1 - d)
    const projectionDistance = (Math.abs(velocity) / 1000) * decelerationRate / (1 - decelerationRate)
    const direction = velocity > 0 ? 1 : -1
    const projected = startRatio + direction * (projectionDistance / window.innerHeight)
    return clamped(projected)
  }

  function clamped(ratio: number): number {
    return Math.max(minRatio, Math.min(maxRatio, ratio))
  }

  function onDragStart(e: PointerEvent) {
    e.preventDefault()
    startY = getClientY(e)
    startRatio = canvasRatio.value
    isDragging.value = true
    document.body.classList.add('dragging')
    velocityBuffer.length = 0
    isAnimating = false
    // Track the handle element for pointer capture
    const handle = (e.target as HTMLElement)?.closest('[data-drag-handle]')
    if (handle) {
      handle.setPointerCapture(e.pointerId)
    }
  }

  function onDragMove(e: PointerEvent) {
    if (!isDragging.value || isAnimating) return
    const clientY = getClientY(e)
    pushVelocityBuffer(clientY)
    const delta = (startY - clientY) / window.innerHeight
    canvasRatio.value = Math.max(minRatio, Math.min(maxRatio, startRatio + delta))
  }

  function onDragEnd() {
    isDragging.value = false
    document.body.classList.remove('dragging')

    const velocity = calculateVelocity()
    currentVelocity = velocity

    // If velocity exceeds flick threshold, project the ratio
    if (Math.abs(velocity) > flickThreshold) {
      const projected = projectRatio(velocity)
      // Use MotionOne to animate from current ratio to projected ratio with a spring
      const canvasEl = document.querySelector('[data-panel="canvas"]') as HTMLElement | null
      if (canvasEl) {
        isAnimating = true
        canvasRatio.value = projected
        const targetHeight = projected * window.innerHeight
        animate(canvasEl, { height: [`${canvasEl.style.height || canvasEl.offsetHeight + 'px'}`, `${targetHeight}px`] }, { duration: 0.5, easing: spring({ stiffness: 200, damping: 18 }) }).finished.then(() => {
          isAnimating = false
        })
      } else {
        canvasRatio.value = clamped(projected)
      }
    }
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
    onDragEnd,
    getVelocity
  }
}
