// Composable for managing persistent settings (sidebar preference, theme, language).
//
// Slice 7: Navigation Infrastructure
// Uses VueUse's useStorage for SSR-friendly persistence with automatic localStorage sync.

import { useStorage } from '@vueuse/core'

export interface Settings {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
}

export function useSettings() {
  const sidebarOpen = useStorage<boolean>('sidebarOpen', false)
  const theme = useStorage<'light' | 'dark' | 'system'>('theme', 'system')
  const language = useStorage<string>('language', 'ar')

  return {
    sidebarOpen,
    theme,
    language
  }
}
