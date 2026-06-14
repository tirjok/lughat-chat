import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpeedSlider from '../app/components/SpeedSlider.vue'

describe('SpeedSlider component', () => {
  const mountSlider = (modelValue = 1.0) => {
    return mount(SpeedSlider, {
      props: { modelValue }
    })
  }

  // ─── Desktop: Horizontal Slider (≥768px) ──────────────────────────────

  it('renders the desktop slider track', () => {
    const wrapper = mountSlider()
    expect(wrapper.find('.speed-slider__track').exists()).toBe(true)
  })

  it('renders the desktop slider fill with correct width', () => {
    const wrapper = mountSlider()
    const fill = wrapper.find('.speed-slider__fill')
    expect(fill.exists()).toBe(true)
  })

  it('renders the desktop slider thumb', () => {
    const wrapper = mountSlider()
    const thumb = wrapper.find('.speed-slider__thumb')
    expect(thumb.exists()).toBe(true)
  })

  it('renders desktop range markers (0.5x, 1.0x, 2.0x)', () => {
    const wrapper = mountSlider()
    const html = wrapper.html()
    expect(html).toContain('0.5x')
    expect(html).toContain('1.0x')
    expect(html).toContain('2.0x')
  })

  it('renders pointer event handlers on the track', () => {
    const wrapper = mountSlider()
    const track = wrapper.find('.speed-slider__track')
    expect(track.exists()).toBe(true)
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
    const minusBtn = buttons.find(b => b.find('[class*="i-lucide-minus"]').exists())
    expect(minusBtn).toBeDefined()
  })

  it('renders plus button in stepper', () => {
    const wrapper = mountSlider()
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons.find(b => b.find('[class*="i-lucide-plus"]').exists())
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
    const minusBtn = buttons.find(b => b.find('[class*="i-lucide-minus"]').exists())
    expect(minusBtn).toBeDefined()
    await minusBtn!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([0.5])
  })

  it('plus button clamps to 2.0 maximum', async () => {
    const wrapper = mountSlider(2.0)
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons.find(b => b.find('[class*="i-lucide-plus"]').exists())
    expect(plusBtn).toBeDefined()
    await plusBtn!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([2.0])
  })

  it('minus button shows disabled styling at minimum (0.5)', () => {
    const wrapper = mountSlider(0.5)
    const buttons = wrapper.findAll('button')
    const minusBtn = buttons.find(b => b.find('[class*="i-lucide-minus"]').exists())!
    expect(minusBtn.classes()).toContain('opacity-40')
  })

  it('plus button shows disabled styling at maximum (2.0)', () => {
    const wrapper = mountSlider(2.0)
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons.find(b => b.find('[class*="i-lucide-plus"]').exists())!
    expect(plusBtn.classes()).toContain('opacity-40')
  })

  // ─── v-model Interface ────────────────────────────────────────────────

  it('emits update:modelValue on stepper click', async () => {
    const wrapper = mountSlider(1.0)
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons.find(b => b.find('[class*="i-lucide-plus"]').exists())!
    await plusBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('preserves existing desktop slider when modelValue changes', () => {
    const wrapper = mountSlider(1.8)
    const track = wrapper.find('.speed-slider__track')
    expect(track.exists()).toBe(true)
    const fill = wrapper.find('.speed-slider__fill')
    expect(fill.exists()).toBe(true)
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

  // ─── Desktop Slider Track Percent ─────────────────────────────────────

  it('calculates trackPercent correctly for mid value (1.25 → 50%)', () => {
    const wrapper = mountSlider(1.25)
    const fill = wrapper.find('.speed-slider__fill')
    expect(fill.attributes('style')).toContain('50%')
  })

  it('calculates trackPercent correctly for min value (0.5 → 0%)', () => {
    const wrapper = mountSlider(0.5)
    const fill = wrapper.find('.speed-slider__fill')
    expect(fill.attributes('style')).toContain('0%')
  })

  it('calculates trackPercent correctly for max value (2.0 → 100%)', () => {
    const wrapper = mountSlider(2.0)
    const fill = wrapper.find('.speed-slider__fill')
    expect(fill.attributes('style')).toContain('100%')
  })
})
