// Composable for managing navigation state (current page, current lesson ID).
//
// Slices 7: Navigation Infrastructure
//
// This composable reads the current route from vue-router and exposes
// the current page ('dashboard' | 'lesson' | 'playground') and the
// current lesson ID (extracted from the URL).

import { useRouter, useRoute } from '#imports'

export type PageType = 'dashboard' | 'lesson' | 'playground'

export function useNavigation() {
  const router = useRouter()
  const route = useRoute()

  const currentPage = computed<PageType>(() => {
    const path = route.path
    if (path.startsWith('/lesson/')) return 'lesson'
    if (path === '/playground') return 'playground'
    return 'dashboard' // default: /
  })

  const currentLessonId = computed<number | null>(() => {
    const match = route.path.match(/\/lesson\/(\d+)/)
    return match ? parseInt(match[1]!, 10) : null
  })

  function navigateTo(page: PageType, lessonId?: number): void {
    switch (page) {
      case 'dashboard':
        router.push('/')
        break
      case 'lesson':
        if (lessonId !== undefined) {
          router.push(`/lesson/${lessonId}`)
        }
        break
      case 'playground':
        router.push('/playground')
        break
    }
  }

  return {
    currentPage,
    currentLessonId,
    navigateTo
  }
}
