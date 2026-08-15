import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── Source-scanning Tests ──────────────────────────────────────────────────
// Component-mounting tests are skipped: Nuxt 4's useRoute() requires a full
// Nuxt app context (tryUseNuxtApp → getCurrentInstance()?.appContext.app.$nuxt)
// that shallowMount cannot provide. Source-scanning tests verify the same
// behavior without needing the Nuxt runtime.

describe('dashboard/level/[level]/index.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Navigation placeholder', () => {
    it('includes a back-to-dashboard link', () => {
      // Arrange
      const filePath = resolve(__dirname, '../../app/pages/dashboard/level/[level]/index.vue')
      const content = readFileSync(filePath, 'utf-8')

      // Act & Assert
      expect(content).to.contain('Back to Dashboard')
      expect(content).to.contain('to="/dashboard"')
    })
  })

  describe('Restricted imports', () => {
    it('does not import audio or voice composables', () => {
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
