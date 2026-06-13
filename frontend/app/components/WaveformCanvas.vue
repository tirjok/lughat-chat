<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  isPlaying: boolean
  currentTime: number
  duration: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: ReturnType<typeof requestAnimationFrame> | null = null
const numBars = 60
interface Bar {
  targetHeight: number
  currentHeight: number
  phase: number
}
let bars: Bar[] = []

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  canvas.width = parent.clientWidth
  canvas.height = parent.clientHeight
  initBars()
  drawWaveform()
}

function initBars() {
  bars = []
  for (let i = 0; i < numBars; i++) {
    bars.push({
      targetHeight: Math.random() * 0.8 + 0.1,
      currentHeight: 0.1,
      phase: Math.random() * Math.PI * 2
    })
  }
}

function drawWaveform() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const barWidth = (canvas.width / numBars) - 2
  const centerY = canvas.height / 2

  bars.forEach((bar) => {
    // If playing, animate bars based on a sine wave + random noise to simulate audio
    if (props.isPlaying) {
      bar.phase += 0.1
      const noise = Math.sin(bar.phase) * 0.3
      bar.currentHeight = bar.targetHeight + noise
      bar.currentHeight = Math.max(0.1, Math.min(1.0, bar.currentHeight))
    } else {
      // Settle down to static height
      bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.1
    }

    const height = bar.currentHeight * canvas.height * 0.8
    const y = centerY - (height / 2)

    // Heatmap Color Logic: Taller bars are orange, shorter bars are magenta
    const ratio = bar.currentHeight

    // Interpolate between Magenta (#DD2476) and Orange (#FF512F)
    const r = Math.round(221 + (255 - 221) * ratio)
    const g = Math.round(36 + (81 - 36) * ratio)
    const b = Math.round(118 + (47 - 118) * ratio)

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`

    // Draw rounded rect
    ctx.beginPath()
    ctx.roundRect(0, y, barWidth, height, 4)
    ctx.fill()
  })

  if (props.isPlaying) {
    animationFrameId = requestAnimationFrame(drawWaveform)
  }
}

function startAnimation() {
  if (props.isPlaying) {
    animationFrameId = requestAnimationFrame(drawWaveform)
  }
}

function stopAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  // Draw static state
  drawWaveform()
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  // Initial static draw
  setTimeout(() => {
    drawWaveform()
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})

// Watch isPlaying to start/stop animation
watch(() => props.isPlaying, (val) => {
  if (val) {
    startAnimation()
  } else {
    stopAnimation()
  }
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 w-full h-full"
  />
</template>
