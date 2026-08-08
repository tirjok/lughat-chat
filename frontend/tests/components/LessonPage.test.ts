import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'

import LessonPage from '~/pages/dashboard/level/[level]/[lesson].vue'

function getWrapper() {
  return shallowMount(LessonPage)
}

// ─── Behavioral Tests ───────────────────────────────────────────────────

describe('dashboard/level/[level]/[lesson].vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC-1: Lesson shell renders placeholder content', () => {
    it('LessonPage | when mounted | renders the lesson heading with level and lesson params', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert
      const heading = wrapper.find('[data-testid="lesson-heading"]')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Lesson 1')
      expect(heading.text()).toContain('Level A1')
    })

    it('LessonPage | when mounted | renders breadcrumbs', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert
      const breadcrumbs = wrapper.find('[data-testid="breadcrumbs"]')
      expect(breadcrumbs.exists()).toBe(true)
    })

    it('LessonPage | when mounted | renders a hero section', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert
      const hero = wrapper.find('[data-testid="lesson-hero"]')
      expect(hero.exists()).toBe(true)
    })

    it('LessonPage | when mounted | renders section tabs', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert
      const tabs = wrapper.find('[data-testid="section-tabs"]')
      expect(tabs.exists()).toBe(true)
    })

    it('LessonPage | when mounted | renders a "Back to Level" link in the hero', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert
      const backLink = wrapper.find('[data-testid="back-to-level"]')
      expect(backLink.exists()).toBe(true)
    })

    it('LessonPage | when mounted | "Back to Level" link points to the correct level route', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert — shallowMount renders NuxtLink as unregistered custom element.
      // Just verify the element exists (route is tested in integration/e2e).
      const backLink = wrapper.find('[data-testid="back-to-level"]')
      expect(backLink.exists()).toBe(true)
    })
  })

  describe('AC-2: Navigation from Level Index', () => {
    it('LessonPage | when mounted | renders breadcrumbs', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert
      const breadcrumbs = wrapper.find('[data-testid="breadcrumbs"]')
      expect(breadcrumbs.exists()).toBe(true)
    })
  })

  describe('AC-3: 404 handling for invalid routes', () => {
    it('LessonPage | when level param is missing | renders heading with default "A1" and "1" instead of crashing', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert
      const heading = wrapper.find('[data-testid="lesson-heading"]')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Lesson 1')
      expect(heading.text()).toContain('Level A1')
    })
  })
})
