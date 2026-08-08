import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, type Ref } from 'vue'

import MobileStatusIndicator from '~/components/MobileStatusIndicator.vue'

// ─── Module-level mock factory ──────────────────────────────────────
// vi.mock() is hoisted to the module scope. We define a single mock
// that uses a shared ref, and each test sets the ref value before
// mounting the component.

const mockStatus: Ref<'loading' | 'ready' | 'error'> = ref('loading' as const)

vi.mock('~/composables/useHealthPoll', () => ({
  useHealthPoll: () => ({
    status: mockStatus,
    modelLoaded: computed(() => mockStatus.value === 'ready')
  })
}))

describe('MobileStatusIndicator', () => {
  beforeEach(() => {
    mockStatus.value = 'loading' as const
  })

  describe('light mode', () => {
    it('renders with light-mode outer shell classes when light=true', () => {
      const wrapper = mount(MobileStatusIndicator, { props: { light: true } })
      const outer = wrapper.find('div.ring-1')
      expect(outer.classes()).toContain('bg-stone-100')
      expect(outer.classes()).toContain('ring-stone-200')
    })

    it('renders with dark-mode outer shell classes when light=false (default)', () => {
      const wrapper = mount(MobileStatusIndicator)
      const outer = wrapper.find('div.ring-1')
      expect(outer.classes()).toContain('bg-white/[0.02]')
      expect(outer.classes()).toContain('ring-white/[0.06]')
    })

    it('renders with light-mode inner core classes when light=true', () => {
      const wrapper = mount(MobileStatusIndicator, { props: { light: true } })
      const inner = wrapper.find('div.rounded-full.bg-white')
      expect(inner.classes()).toContain('border-stone-200')
    })

    it('renders with dark-mode inner core classes when light=false (default)', () => {
      const wrapper = mount(MobileStatusIndicator)
      const inner = wrapper.find('div.rounded-full.bg-stone-900')
      expect(inner.classes()).toContain('shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]')
    })

    it('renders with light-mode text color when light=true', () => {
      const wrapper = mount(MobileStatusIndicator, { props: { light: true } })
      const textSpan = wrapper.find('span.text-\\[10px\\].font-medium')
      expect(textSpan.classes()).toContain('text-stone-700')
    })

    it('renders with dark-mode text color when light=false (default)', () => {
      const wrapper = mount(MobileStatusIndicator)
      const textSpan = wrapper.find('span.text-\\[10px\\].font-medium')
      expect(textSpan.classes()).toContain('text-gray-300')
    })

    it('omits glow shadows on status dots when light=true', () => {
      const wrapper = mount(MobileStatusIndicator, { props: { light: true } })
      const html = wrapper.html()
      expect(html).not.toContain('shadow-[0_0_8px_')
    })

    it('includes glow shadows on status dots when light=false (default)', () => {
      const wrapper = mount(MobileStatusIndicator)
      const html = wrapper.html()
      expect(html).toContain('shadow-[0_0_8px_')
    })
  })
})
