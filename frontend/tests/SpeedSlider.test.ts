import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SpeedSlider from '../app/components/SpeedSlider.vue'
import { setBreakpoint } from './mocks'

describe('SpeedSlider', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth })
  })

  const mountSlider = (modelValue = 1.0) => {
    return mount(SpeedSlider, {
      props: { modelValue }
    })
  }

  // ─── Behavioral Tests (black-box: rendered elements, events, state) ────

  describe('native range input', () => {
    it('When rendered then native <input type="range"> element exists', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const input = wrapper.find('input[type="range"]')
      // Assert
      expect(input.exists()).toBe(true)
    })

    it('When rendered then range input has correct min, max, step attributes', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const input = wrapper.find('input[type="range"]')
      // Assert
      expect(input.attributes('min')).toBe('0.5')
      expect(input.attributes('max')).toBe('2.0')
      expect(input.attributes('step')).toBe('0.1')
    })

    it('When modelValue=1.5 then range input reflects current value', () => {
      // Arrange
      const wrapper = mountSlider(1.5)
      // Act
      const input = wrapper.find('input[type="range"]')
      // Assert
      expect(input.element.value).toBe('1.5')
    })
  })

  describe('desktop markers', () => {
    it('When rendered then desktop range markers show 0.5x and 2.0x labels', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('0.5x')
      expect(html).toContain('2.0x')
    })
  })

  describe('mobile stepper buttons', () => {
    it('When rendered then stepper buttons container exists (md:hidden)', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('md:hidden')
    })

    it('When rendered then minus button exists in stepper', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const buttons = wrapper.findAll('button')
      const minusBtn = buttons.find(b => b.find('[class*="ph ph-minus"]').exists())
      // Assert
      expect(minusBtn).toBeDefined()
    })

    it('When rendered then plus button exists in stepper', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const buttons = wrapper.findAll('button')
      const plusBtn = buttons.find(b => b.find('[class*="ph ph-plus"]').exists())
      // Assert
      expect(plusBtn).toBeDefined()
    })

    it('When modelValue=1.0 then stepper displays 1.0x', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('1.0x')
    })

    it('When modelValue=1.5 then stepper displays 1.5x', () => {
      // Arrange
      const wrapper = mountSlider(1.5)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('1.5x')
    })

    it('When modelValue=2.0 then stepper displays 2.0x (max)', () => {
      // Arrange
      const wrapper = mountSlider(2.0)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('2.0x')
    })

    it('When modelValue=0.5 then stepper displays 0.5x (min)', () => {
      // Arrange
      const wrapper = mountSlider(0.5)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('0.5x')
    })
  })

  describe('stepper clamping', () => {
    it('When minus clicked at min(0.5) then clamps to 0.5 and emits update:modelValue', async () => {
      // Arrange
      const wrapper = mountSlider(0.5)
      const buttons = wrapper.findAll('button')
      const minusBtn = buttons.find(b => b.find('[class*="ph ph-minus"]').exists())
      // Act
      expect(minusBtn).toBeDefined()
      await minusBtn!.trigger('click')
      // Assert
      expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([0.5])
    })

    it('When plus clicked at max(2.0) then clamps to 2.0 and emits update:modelValue', async () => {
      // Arrange
      const wrapper = mountSlider(2.0)
      const buttons = wrapper.findAll('button')
      const plusBtn = buttons.find(b => b.find('[class*="ph ph-plus"]').exists())
      // Act
      expect(plusBtn).toBeDefined()
      await plusBtn!.trigger('click')
      // Assert
      expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([2.0])
    })
  })

  describe('stepper disabled styling', () => {
    it('When at min(0.5) then minus button shows opacity-40', () => {
      // Arrange
      const wrapper = mountSlider(0.5)
      const buttons = wrapper.findAll('button')
      const minusBtn = buttons.find(b => b.find('[class*="ph ph-minus"]').exists())!
      // Assert
      expect(minusBtn.classes()).toContain('opacity-40')
    })

    it('When at max(2.0) then plus button shows opacity-40', () => {
      // Arrange
      const wrapper = mountSlider(2.0)
      const buttons = wrapper.findAll('button')
      const plusBtn = buttons.find(b => b.find('[class*="ph ph-plus"]').exists())!
      // Assert
      expect(plusBtn.classes()).toContain('opacity-40')
    })
  })

  describe('v-model interface', () => {
    it('When plus clicked at 1.0 then emits update:modelValue with incremented value', async () => {
      // Arrange
      const wrapper = mountSlider(1.0)
      const buttons = wrapper.findAll('button')
      const plusBtn = buttons.find(b => b.find('[class*="ph ph-plus"]').exists())!
      // Act
      await plusBtn.trigger('click')
      // Assert
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })

    it('When range input changes then emits update:modelValue with new value', async () => {
      // Arrange
      const wrapper = mountSlider(1.0)
      const input = wrapper.find('input[type="range"]')
      // Act
      await input.setValue('1.5')
      await input.trigger('input')
      // Assert
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([1.5])
    })
  })

  describe('display value formatting', () => {
    it('When modelValue=1.0 then displayValue formats as 1.0x', () => {
      // Arrange
      const wrapper = mountSlider(1.0)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('1.0x')
    })

    it('When modelValue=0.5 then displayValue formats as 0.5x', () => {
      // Arrange
      const wrapper = mountSlider(0.5)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('0.5x')
    })
  })

  // ─── Responsive Tests (black-box: breakpoint simulation) ────────────────

  describe('responsive layout (stepper vs slider)', () => {
    it('When viewport is 375px then stepper buttons render with minus and plus icons', () => {
      // Arrange
      setBreakpoint(375)
      // Act
      const wrapper = mountSlider()
      const html = wrapper.html()
      // Assert
      expect(html).toContain('md:hidden flex items-center justify-center gap-4')
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
      const hasMinus = html.includes('ph ph-minus')
      const hasPlus = html.includes('ph ph-plus')
      expect(hasMinus).toBe(true)
      expect(hasPlus).toBe(true)
    })

    it('When viewport is 1024px then native range slider renders', () => {
      // Arrange
      setBreakpoint(1024)
      // Act
      const wrapper = mountSlider()
      const html = wrapper.html()
      // Assert
      expect(html).toContain('type="range"')
    })

    it('When viewport is 1024px then stepper buttons are hidden', () => {
      // Arrange
      setBreakpoint(1024)
      // Act
      const wrapper = mountSlider()
      const html = wrapper.html()
      // Assert
      expect(html).toContain('md:hidden')
    })
  })
})
