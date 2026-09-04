import { ref, onMounted } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

interface ToastEntry {
  id: number
  message: string
  type: ToastType
}

let nextId = 0

const toastState = ref<ToastEntry[]>([])

const dismissTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

const DISMISS_DELAY = 5000

function dismissToast(id: string) {
  const idx = toastState.value.findIndex(t => t.id === Number(id))
  if (idx !== -1) {
    toastState.value.splice(idx, 1)
  }
  const timer = dismissTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    dismissTimers.delete(id)
  }
}

function scheduleDismiss(entry: ToastEntry) {
  const timer = setTimeout(() => {
    dismissToast(String(entry.id))
  }, DISMISS_DELAY)
  dismissTimers.set(String(entry.id), timer)
}

export function useToast() {
  onMounted(() => {
    // Cleanup timers on component unmount
    for (const timer of dismissTimers.values()) {
      clearTimeout(timer)
    }
    dismissTimers.clear()
  })

  return toastState
}

export function showToast(message: string, type: ToastType = 'success') {
  const entry: ToastEntry = {
    id: ++nextId,
    message,
    type
  }
  toastState.value.push(entry)
  scheduleDismiss(entry)
}
