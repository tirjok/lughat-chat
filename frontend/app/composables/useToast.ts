import { ref, onMounted } from 'vue'

const toastState = ref({
  message: '',
  visible: false
})

let dismissTimer: ReturnType<typeof setTimeout> | null = null

const DISMISS_DELAY = 5000

function dismissToast() {
  toastState.value.visible = false
  toastState.value.message = ''
}

function scheduleDismiss() {
  if (dismissTimer) {
    clearTimeout(dismissTimer)
  }
  dismissTimer = setTimeout(() => {
    dismissToast()
    dismissTimer = null
  }, DISMISS_DELAY)
}

export function useToast() {
  onMounted(() => {
    // Cleanup timer on component unmount
    if (dismissTimer) {
      clearTimeout(dismissTimer)
    }
  })

  return toastState
}

export function showToast(message: string) {
  toastState.value.message = message
  toastState.value.visible = true
  scheduleDismiss()
}
