import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import LevelIndex from '../../app/pages/dashboard/level/[level]/index.vue'

function getWrapper() {
  return shallowMount(LevelIndex, {
    global: {
      components: {
        NuxtLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>'
        }
      }
    }
  })
}

// ─── Behavioral Tests ───────────────────────────────────────────────────

describe('dashboard/level/[level]/index.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Level index shell renders placeholder content', () => {
    it('LevelIndex | when mounted | renders the level heading', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert
      const heading = wrapper.find('[data-testid="level-heading"]')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).to.contain('Level')
    })

    it('LevelIndex | when mounted | renders the lesson content list', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert
      const list = wrapper.find('[data-testid="lesson-list"]')
      expect(list.exists()).toBe(true)
    })
  })

  describe('Navigation placeholder', () => {
    it('LevelIndex | when mounted | renders a header section', async () => {
      // Arrange
      const wrapper = getWrapper()

      // Act
      await nextTick()

      // Assert
      const header = wrapper.find('header')
      expect(header.exists()).toBe(true)
    })

    it('LevelIndex source | when rendered | includes a back-to-dashboard link', () => {
      // Arrange
      const filePath = resolve(__dirname, '../../app/pages/dashboard/level/[level]/index.vue')
      const content = readFileSync(filePath, 'utf-8')

      // Act & Assert
      expect(content).to.contain('Back to Dashboard')
      expect(content).to.contain('to="/dashboard"')
    })
  })

  describe('Restricted imports', () => {
    it('LevelIndex source | when scanned | does not import audio or voice composables', () => {
      // Arrange
      const filePath = resolve(__dirname, '../../app/pages/dashboard/level/[level]/index.vue')
      const content = readFileSync(filePath, 'utf-8')

      // Act & Assert
      expect(content).not.toMatch(/useAudioModule/)
      expect(content).not.toMatch(/useTtsApi/)
      expect(content).not.toMatch(/useInputValidation/)
      expect(content).not.toMatch(/usePanelToggle/)
      expect(content).not.toMatch(/useVoices/)
    })
  })
})
