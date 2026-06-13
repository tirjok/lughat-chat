/**
 * SpeedSlider — unit tests
 *
 * Tests the Vue 3 + TypeScript component in isolation.
 * Component tests use jsdom environment with mocked fetch/URL APIs.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpeedSlider from './SpeedSlider.vue'

// ── Tests ────────────────────────────────────────────────────────────

describe('SpeedSlider', () => {
  // ── Slice 1: Tracer Bullet ────────────────────────────────────────

  describe('default rendering', () => {
    it('renders with default value 1.0x', () => {
      const wrapper = mount(SpeedSlider)
      const badge = wrapper.find('.speed-badge')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('1.0x')
    })

    it('renders a gradient track fill', () => {
      const wrapper = mount(SpeedSlider)
      const trackFill = wrapper.find('.speed-track-fill')
      expect(trackFill.exists()).toBe(true)
    })
  })

  // ── Slice 2: Live Value Display ───────────────────────────────────

  describe('live value display', () => {
    it('shows the passed value as "X.Xx" in the badge', () => {
      const wrapper = mount(SpeedSlider, {
        props: { modelValue: 1.5 }
      })
      const badge = wrapper.find('.speed-badge')
      expect(badge.text()).toBe('1.5x')
    })

    it('shows "0.5x" at minimum and "2.0x" at maximum', () => {
      const minWrapper = mount(SpeedSlider, {
        props: { modelValue: 0.5 }
      })
      expect(minWrapper.find('.speed-badge').text()).toBe('0.5x')

      const maxWrapper = mount(SpeedSlider, {
        props: { modelValue: 2.0 }
      })
      expect(maxWrapper.find('.speed-badge').text()).toBe('2.0x')
    })
  })

  // ── Slice 3: Range Constraints ──────────────────────────────────────

  describe('range constraints', () => {
    it('clamps values below 0.5 to 0.5', () => {
      const wrapper = mount(SpeedSlider, {
        props: { modelValue: 0.1 }
      })
      // The badge should show 0.5x, not 0.1x
      expect(wrapper.find('.speed-badge').text()).toBe('0.5x')
    })

    it('clamps values above 2.0 to 2.0', () => {
      const wrapper = mount(SpeedSlider, {
        props: { modelValue: 3.0 }
      })
      // The badge should show 2.0x, not 3.0x
      expect(wrapper.find('.speed-badge').text()).toBe('2.0x')
    })
  })

  // ── Slice 5: Proportional Gradient Fill — Tracer Bullet ─────────────

  describe('proportional gradient fill', () => {
    it('fills 0% of the track at minimum value 0.5', () => {
      const wrapper = mount(SpeedSlider, {
        props: { modelValue: 0.5 }
      })
      const fill = wrapper.find<HTMLElement>('.speed-track-fill')
      expect(fill.attributes('style')).toContain('width: 0%')
    })

    it('fills 100% of the track at maximum value 2.0', () => {
      const wrapper = mount(SpeedSlider, {
        props: { modelValue: 2.0 }
      })
      const fill = wrapper.find<HTMLElement>('.speed-track-fill')
      expect(fill.attributes('style')).toContain('width: 100%')
    })

    it('fills 50% of the track at midpoint value 1.25', () => {
      const wrapper = mount(SpeedSlider, {
        props: { modelValue: 1.25 }
      })
      const fill = wrapper.find<HTMLElement>('.speed-track-fill')
      expect(fill.attributes('style')).toContain('width: 50%')
    })
  })

  // ── Slice 6: Slider Interaction ─────────────────────────────────────

  describe('slider interaction', () => {
    it('emits update:modelValue when slider thumb is moved', async () => {
      const wrapper = mount(SpeedSlider)
      const rangeInput = wrapper.find('input[type="range"]')

      await rangeInput.setValue(1.2)
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1.2])
    })
  })
})
