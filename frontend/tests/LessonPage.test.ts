import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'

import LessonPage from '../app/pages/dashboard/level/[level]/[lesson].vue'

// Mutable route state so tests can switch between valid and missing-level scenarios.
const routeState: { params: Record<string, string>; path: string } = {
  params: { level: 'a1', lesson: '1' },
  path: '/dashboard/level/a1/1'
}

// Mock vue-router for shallowMount — the lesson page uses useRoute, useRouter,
// onBeforeRouteLeave. onBeforeRouteLeave is a lifecycle hook; mock it so the
// component's call during setup completes without error.
vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push: vi.fn() }),
  onBeforeRouteLeave: vi.fn()
}))

// ─── Behavioral Tests (black-box: rendered component tree, emitted events) ──

describe('dashboard/level/[level]/[lesson].vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = shallowMount(LessonPage)
  })

  afterEach(() => {
    wrapper.unmount()
  })

  describe('AC-1: Lesson shell renders placeholder content', () => {
    it('LessonPage | when mounted | renders the lesson heading with level and lesson params', async () => {
      // Assert
      await nextTick()

      const heading = wrapper.find('[data-testid="lesson-heading"]')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Lesson')
    })

    it('LessonPage | when mounted | renders breadcrumbs', async () => {
      // Assert
      await nextTick()

      const breadcrumbs = wrapper.find('[data-testid="breadcrumbs"]')
      expect(breadcrumbs.exists()).toBe(true)
    })

    it('LessonPage | when mounted | renders a hero section', async () => {
      // Assert
      await nextTick()

      const hero = wrapper.find('[data-testid="lesson-hero"]')
      expect(hero.exists()).toBe(true)
    })

    it('LessonPage | when mounted | renders section tabs', async () => {
      // Assert
      await nextTick()

      const tabs = wrapper.find('[data-testid="section-tabs"]')
      expect(tabs.exists()).toBe(true)
    })
  })

  describe('AC-2: Navigation from Level Index', () => {
    it('LessonPage | when mounted | renders a "Back to Level" link in the hero', async () => {
      // Assert
      await nextTick()

      const backLink = wrapper.find('[data-testid="lesson-hero"] a')
      expect(backLink.exists()).toBe(true)
      expect(backLink.text()).toContain('Back to Level')
    })

    it('LessonPage | when mounted | "Back to Level" link points to the correct level route', async () => {
      // Assert
      await nextTick()

      const backLink = wrapper.find('[data-testid="lesson-hero"] a')
      const href = backLink.attributes('href')
      expect(href).toBe('/dashboard/level/a1')
    })
  })

  describe('AC-3: 404 handling for invalid routes', () => {
    it('LessonPage | when level param is missing | renders heading with default "A1" and "1" instead of crashing', async () => {
      // Arrange — swap route state to simulate /dashboard/level/ with no level param
      routeState.params = { lesson: '1' }
      routeState.path = '/dashboard/level/'

      // Act — remount so computed values re-evaluate
      wrapper.unmount()
      wrapper = shallowMount(LessonPage)
      await nextTick()

      // Assert
      const heading = wrapper.find('[data-testid="lesson-heading"]')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Lesson 1')
      expect(heading.text()).toContain('Level A1')
    })
  })
})
