import { onUnmounted } from 'vue'
import { useState } from '#app'

export type ToastType = 'success' | 'error' | 'info'

interface ToastEntry {
  id: number
  message: string
  type: ToastType
}

const DISMISS_DELAY = 5000

function dismissToast(toastState: Ref<ToastEntry[]>, dismissTimers: Map<string, ReturnType<typeof setTimeout>>, id: string) {
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

function scheduleDismiss(toastState: Ref<ToastEntry[]>, dismissTimers: Map<string, ReturnType<typeof setTimeout>>, entry: ToastEntry) {
  const timer = setTimeout(() => {
    dismissToast(toastState, dismissTimers, String(entry.id))
  }, DISMISS_DELAY)
  dismissTimers.set(String(entry.id), timer)
}

let nextId = 0

export function useToast() {
  const toastState = useState<ToastEntry[]>('toasts', () => [])
  const dismissTimers = useState<Map<string, ReturnType<typeof setTimeout>>>('toast-timers', () => new Map())

  onUnmounted(() => {
    for (const timer of dismissTimers.value.values()) {
      clearTimeout(timer)
    }
    dismissTimers.value.clear()
  })

  return toastState
}

export function showToast(message: string, type: ToastType = 'success') {
  const toastState = useState<ToastEntry[]>('toasts', () => [])
  const dismissTimers = useState<Map<string, ReturnType<typeof setTimeout>>>('toast-timers', () => new Map())
  const entry: ToastEntry = {
    id: ++nextId,
    message,
    type
  }
  toastState.value.push(entry)
  scheduleDismiss(toastState, dismissTimers.value, entry)
}
