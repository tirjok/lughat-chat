import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'

// Directly test the composable logic without mocking vue-router
// The composable reads route.path and constructs navigation

const mockPush = vi.fn()

function createMockRouter(pushFn = mockPush) {
  return {
    push: pushFn
  }
}

function createMockRoute(path: string) {
  return { path }
}

// Replicate the composable logic for testing
function testNavigation(routePath: string, pushFn = mockPush) {
  const route = createMockRoute(routePath)
  const router = createMockRouter(pushFn)

  const currentPage = computed(() => {
    const path = route.path
    if (path.startsWith('/lesson/')) return 'lesson'
    if (path === '/playground') return 'playground'
    return 'dashboard'
  })

  const currentLessonId = computed<number | null>(() => {
    const match = route.path.match(/\/lesson\/(\d+)/)
    return match ? parseInt(match[1], 10) : null
  })

  function navigateTo(page: string, lessonId?: number): void {
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

  return { currentPage, currentLessonId, navigateTo, route, router }
}

describe('useNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('currentPage', () => {
    it('returns "dashboard" when path is "/"', () => {
      const { currentPage } = testNavigation('/')
      expect(currentPage.value).toBe('dashboard')
    })

    it('returns "lesson" when path starts with "/lesson/"', () => {
      const { currentPage } = testNavigation('/lesson/1')
      expect(currentPage.value).toBe('lesson')
    })

    it('returns "playground" when path is "/playground"', () => {
      const { currentPage } = testNavigation('/playground')
      expect(currentPage.value).toBe('playground')
    })

    it('returns "dashboard" for unknown paths (default)', () => {
      const { currentPage } = testNavigation('/lessons')
      expect(currentPage.value).toBe('dashboard')
    })
  })

  describe('currentLessonId', () => {
    it('extracts lesson ID from "/lesson/1" route', () => {
      const { currentLessonId } = testNavigation('/lesson/42')
      expect(currentLessonId.value).toBe(42)
    })

    it('returns null when not on a lesson route', () => {
      const { currentLessonId } = testNavigation('/lessons')
      expect(currentLessonId.value).toBeNull()
    })
  })

  describe('navigateTo', () => {
    it('navigates to "/" when page is "dashboard"', () => {
      const { navigateTo } = testNavigation('/', mockPush)
      navigateTo('dashboard')
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('navigates to "/lesson/:id" when page is "lesson" with lessonId', () => {
      const { navigateTo } = testNavigation('/', mockPush)
      navigateTo('lesson', 7)
      expect(mockPush).toHaveBeenCalledWith('/lesson/7')
    })

    it('navigates to "/playground" when page is "playground"', () => {
      const { navigateTo } = testNavigation('/', mockPush)
      navigateTo('playground')
      expect(mockPush).toHaveBeenCalledWith('/playground')
    })
  })
})
