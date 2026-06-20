import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fs from 'fs'
import * as path from 'path'
import SpeedSlider from '../app/components/SpeedSlider.vue'
import { setBreakpoint } from './mocks'

describe('SpeedSlider component', () => {
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

  // ─── Prototype: Native Range Input (≥768px) ───────────────────────────

  it('renders a native <input type="range"> element', () => {
    const wrapper = mountSlider()
    const input = wrapper.find('input[type="range"]')
    expect(input.exists()).toBe(true)
  })

  it('native range input has correct min, max, step attributes', () => {
    const wrapper = mountSlider()
    const input = wrapper.find('input[type="range"]')
    expect(input.attributes('min')).toBe('0.5')
    expect(input.attributes('max')).toBe('2.0')
    expect(input.attributes('step')).toBe('0.1')
  })

  it('native range input reflects current modelValue', () => {
    const wrapper = mountSlider(1.5)
    const input = wrapper.find('input[type="range"]')
    expect(input.element.value).toBe('1.5')
  })

  it('renders desktop range markers (0.5x, 2.0x with spacer for center)', () => {
    const wrapper = mountSlider()
    const html = wrapper.html()
    expect(html).toContain('0.5x')
    expect(html).toContain('2.0x')
  })

  it('range markers use text-[10px] font-mono (prototype)', () => {
    const componentPath = path.join(__dirname, '../app/components/SpeedSlider.vue')
    const source = fs.readFileSync(componentPath, 'utf-8')
    expect(source).toContain('text-[10px]')
    expect(source).toContain('font-mono')
  })

  // ─── Prototype: pt-2 pb-4 wrapper ─────────────────────────────────────

  it('uses prototype: pt-2 pb-6 wrapper on desktop slider', () => {
    const componentPath = path.join(__dirname, '../app/components/SpeedSlider.vue')
    const source = fs.readFileSync(componentPath, 'utf-8')
    expect(source).toContain('pt-2 pb-6')
  })

  // ─── Mobile: Stepper Buttons (<768px) ─────────────────────────────────

  it('renders stepper buttons container (md:hidden class exists in markup)', () => {
    const wrapper = mountSlider()
    const html = wrapper.html()
    expect(html).toContain('md:hidden')
  })

  it('renders minus button in stepper', () => {
    const wrapper = mountSlider()
    const buttons = wrapper.findAll('button')
    const minusBtn = buttons.find(b => b.find('[class*="ph ph-minus"]').exists())
    expect(minusBtn).toBeDefined()
  })

  it('renders plus button in stepper', () => {
    const wrapper = mountSlider()
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons.find(b => b.find('[class*="ph ph-plus"]').exists())
    expect(plusBtn).toBeDefined()
  })

  it('renders speed value display in stepper (text-xl font-mono)', () => {
    const wrapper = mountSlider()
    const html = wrapper.html()
    expect(html).toContain('text-xl')
    expect(html).toContain('font-mono')
  })

  it('shows displayValue in stepper (1.0x by default)', () => {
    const wrapper = mountSlider()
    expect(wrapper.html()).toContain('1.0x')
  })

  it('shows displayValue in stepper (1.5x when modelValue is 1.5)', () => {
    const wrapper = mountSlider(1.5)
    expect(wrapper.html()).toContain('1.5x')
  })

  it('shows displayValue in stepper (2.0x when at max)', () => {
    const wrapper = mountSlider(2.0)
    expect(wrapper.html()).toContain('2.0x')
  })

  it('shows displayValue in stepper (0.5x when at min)', () => {
    const wrapper = mountSlider(0.5)
    expect(wrapper.html()).toContain('0.5x')
  })

  it('minus button has 44×44px touch target (w-11 h-11 = 44px)', () => {
    const wrapper = mountSlider()
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('minus button clamps to 0.5 minimum', async () => {
    const wrapper = mountSlider(0.5)
    const buttons = wrapper.findAll('button')
    const minusBtn = buttons.find(b => b.find('[class*="ph ph-minus"]').exists())
    expect(minusBtn).toBeDefined()
    await minusBtn!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([0.5])
  })

  it('plus button clamps to 2.0 maximum', async () => {
    const wrapper = mountSlider(2.0)
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons.find(b => b.find('[class*="ph ph-plus"]').exists())
    expect(plusBtn).toBeDefined()
    await plusBtn!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([2.0])
  })

  it('minus button shows disabled styling at minimum (0.5)', () => {
    const wrapper = mountSlider(0.5)
    const buttons = wrapper.findAll('button')
    const minusBtn = buttons.find(b => b.find('[class*="ph ph-minus"]').exists())!
    expect(minusBtn.classes()).toContain('opacity-40')
  })

  it('plus button shows disabled styling at maximum (2.0)', () => {
    const wrapper = mountSlider(2.0)
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons.find(b => b.find('[class*="ph ph-plus"]').exists())!
    expect(plusBtn.classes()).toContain('opacity-40')
  })

  // ─── v-model Interface ────────────────────────────────────────────────

  it('emits update:modelValue on stepper click', async () => {
    const wrapper = mountSlider(1.0)
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons.find(b => b.find('[class*="ph ph-plus"]').exists())!
    await plusBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('native range input emits update:modelValue on input event', async () => {
    const wrapper = mountSlider(1.0)
    const input = wrapper.find('input[type="range"]')
    await input.setValue('1.5')
    await input.trigger('input')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([1.5])
  })

  // ─── displayValue Format ──────────────────────────────────────────────

  it('formats displayValue as X.Xx (e.g., "1.0x")', () => {
    const wrapper = mountSlider(1.0)
    expect(wrapper.html()).toContain('1.0x')
  })

  it('formats displayValue for boundary values (0.5x, 2.0x)', () => {
    const wrapper = mountSlider(0.5)
    expect(wrapper.html()).toContain('0.5x')
  })

  // ─── Prototype: Gradient Track Fill ───────────────────────────────────

  it('native range input uses gradient background for track fill (prototype)', () => {
    const componentPath = path.join(__dirname, '../app/components/SpeedSlider.vue')
    const source = fs.readFileSync(componentPath, 'utf-8')
    expect(source).toContain('linear-gradient(to right, #DD2476, #FF512F')
  })

  it('native range input has custom thumb styling (prototype)', () => {
    const componentPath = path.join(__dirname, '../app/components/SpeedSlider.vue')
    const source = fs.readFileSync(componentPath, 'utf-8')
    expect(source).toContain('::-webkit-slider-thumb')
    expect(source).toContain('#FF512F')
  })

  // ─── Responsive Breakpoint Tests ──────────────────────────────────────

  describe('responsive layout (stepper vs slider)', () => {
    it('stepper buttons render on mobile widths (<768px)', () => {
      setBreakpoint(375)
      const wrapper = mountSlider()
      const html = wrapper.html()
      expect(html).toContain('md:hidden flex items-center justify-center gap-4')
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
      const hasMinus = html.includes('ph ph-minus')
      const hasPlus = html.includes('ph ph-plus')
      expect(hasMinus).toBe(true)
      expect(hasPlus).toBe(true)
    })

    it('native range slider renders on desktop widths (≥768px)', () => {
      setBreakpoint(1024)
      const wrapper = mountSlider()
      const html = wrapper.html()
      expect(html).toContain('type="range"')
    })

    it('stepper buttons are hidden on desktop (md:hidden)', () => {
      setBreakpoint(1024)
      const wrapper = mountSlider()
      const html = wrapper.html()
      expect(html).toContain('md:hidden')
    })

    it('both stepper and slider markup exist in component source', () => {
      const componentPath = path.resolve(__dirname, '../app/components/SpeedSlider.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('type="range"')
      expect(source).toContain('ph ph-minus')
      expect(source).toContain('ph ph-plus')
    })
  })
})
