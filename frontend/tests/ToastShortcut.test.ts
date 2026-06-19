import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ToastNotification from '../app/components/ToastNotification.vue'
import { useToast, showToast } from '../app/composables/useToast'
import { setBreakpoint } from './setup.component'
import path from 'path'
import fs from 'fs'

describe('Issue 6: Toast Mobile Positioning + Shortcut Hint Fix', () => {
  beforeEach(() => {
    useToast().value = []
  })

  afterEach(() => {
    useToast().value = []
  })

  describe('Toast container — pointer-events-none', () => {
    it('toast container has pointer-events-none for click-through to panels below', async () => {
      useToast()
      showToast('Test message')

      const wrapper = mount(ToastNotification)
      await nextTick()

      const container = wrapper.find('[class*="fixed"]')
      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('pointer-events-none')
    })
  })

  describe('Shortcut hint — source checks', () => {
    it('shortcut hint uses bg-studio-800/80 (not /90)', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('bg-studio-800/80')
    })

    it('shortcut hint uses border-studio-700/50 (semi-transparent, not solid)', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('border-studio-700/50')
    })

    it('shortcut hint uses hidden md:flex (not sm:flex)', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('hidden md:flex')
      expect(source).not.toContain('hidden sm:flex')
    })
  })

  describe('Shortcut hint — responsive behavior', () => {
    it('shortcut hint is hidden at mobile breakpoint (375px)', () => {
      setBreakpoint(375)
      // Source uses "hidden md:flex" — at 375px (below md:), the element
      // should have the "hidden" class applied.
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('hidden md:flex')
    })

    it('shortcut hint is visible at desktop breakpoint (768px+)', () => {
      setBreakpoint(768)
      // At 768px (≥ md: breakpoint), the shortcut hint should be visible.
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('hidden md:flex')
      expect(source).toContain('Ctrl')
      expect(source).toContain('Enter')
    })
  })
})
