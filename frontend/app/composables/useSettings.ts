// Composable for managing persistent settings (sidebar preference, theme, language).
//
// Slice 7: Navigation Infrastructure
// Uses Nuxt 4's useState for SSR-friendly persistence without external libraries.
// Settings are synced to localStorage on the client side only.

import { watch } from 'vue'

export interface Settings {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
}

export function useSettings() {
  const sidebarOpen = useState<boolean>('sidebarOpen', () => false)
  const theme = useState<'light' | 'dark' | 'system'>('theme', () => 'system')
  const language = useState<string>('language', () => 'ar')

  // Persist sidebar preference to localStorage (client only)
  watch(sidebarOpen, (value) => {
    if (import.meta.client) {
      try {
        localStorage.setItem('sidebarOpen', JSON.stringify(value))
      } catch {
        // localStorage not available (e.g., private browsing)
      }
    }
  })

  // Persist theme preference (client only)
  watch(theme, (value) => {
    if (import.meta.client) {
      try {
        localStorage.setItem('theme', JSON.stringify(value))
      } catch {
        // localStorage not available
      }
    }
  })

  // Persist language preference (client only)
  watch(language, (value) => {
    if (import.meta.client) {
      try {
        localStorage.setItem('language', JSON.stringify(value))
      } catch {
        // localStorage not available
      }
    }
  })

  return {
    sidebarOpen,
    theme,
    language
  }
}
