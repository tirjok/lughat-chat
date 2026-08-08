<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps<{
  visible: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
}>()

// TODO: migrated from sunrise-orange/magenta gradient (see ISSUE-014)
const emit = defineEmits<{ (e: 'seek', ratio: number): void }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: ReturnType<typeof requestAnimationFrame> | null = null
const numBars = 60
interface Bar {
  targetHeight: number
  currentHeight: number
  phase: number
}
let bars: Bar[] = []
let isCanvasVisible = false

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (parent) {
    canvas.width = parent.clientWidth
    canvas.height = parent.clientHeight
  }
  isCanvasVisible = true
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
  if (!isCanvasVisible) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const barWidth = (canvas.width / numBars) - 2
  const centerY = canvas.height / 2

  const progress = props.duration > 0 ? props.currentTime / props.duration : 0

  bars.forEach((bar, index) => {
    const x = index * (barWidth + 2)
    const barProgress = index / numBars

    if (props.isPlaying) {
      bar.phase += 0.1
      const noise = Math.sin(bar.phase) * 0.3
      bar.currentHeight = bar.targetHeight + noise
      bar.currentHeight = Math.max(0.1, Math.min(1.0, bar.currentHeight))
    } else {
      bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.1
    }

    const height = bar.currentHeight * canvas.height * 0.8
    const y = centerY - (height / 2)

    const ratio = bar.currentHeight
    const r = Math.round(20 + (245 - 20) * ratio)
    const g = Math.round(184 + (158 - 184) * ratio)
    const b = Math.round(166 + (11 - 166) * ratio)

    // Color bars differently based on whether they've been played
    if (barProgress <= progress) {
      // Played portion: orange-to-magenta gradient
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    } else {
      // Unplayed portion: dim gray
      ctx.fillStyle = 'rgba(100, 100, 100, 0.3)'
    }

    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, height, 4)
    ctx.fill()
  })
}

function startAnimation() {
  if (props.isPlaying && isCanvasVisible) {
    animationFrameId = requestAnimationFrame(drawWaveform)
  }
}

function stopAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  drawWaveform()
}

async function ensureCanvasReady() {
  if (canvasRef.value) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    resizeCanvas()
  }
}

function handleCanvasClick(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const ratio = x / rect.width
  emit('seek', ratio)
}

onMounted(async () => {
  await ensureCanvasReady()
  window.addEventListener('resize', resizeCanvas)
  setTimeout(() => {
    drawWaveform()
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  isCanvasVisible = false
})

watch(() => props.isPlaying, async (val) => {
  await ensureCanvasReady()
  if (val) {
    startAnimation()
  } else {
    stopAnimation()
  }
})

watch(() => props.visible, async (val) => {
  if (val) {
    await ensureCanvasReady()
    drawWaveform()
  }
})

watch(() => props.currentTime, async () => {
  drawWaveform()
})
</script>

<template>
  <!-- Hit-area wrapper: 44px minimum touch target (WCAG) -->
  <div
    class="relative w-full min-h-[44px] min-w-[100px] cursor-pointer"
    @click="handleCanvasClick"
  >
    <canvas
      ref="canvasRef"
      class="w-full h-8 md:h-12 absolute inset-0"
    />
  </div>
</template>
