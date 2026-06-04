import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ArabicTextarea from '../app/components/ArabicTextarea.vue'

describe('ArabicTextarea', () => {
  it('renders a label element associated with the textarea', () => {
    const wrapper = mount(ArabicTextarea)
    const label = wrapper.find('label')
    expect(label.exists()).toBe(true)

    const textarea = wrapper.find('textarea')
    expect(label.attributes('for')).toBe(textarea.attributes('id'))
  })

  it('renders a textarea element with dir="auto"', () => {
    const wrapper = mount(ArabicTextarea)
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('dir')).toBe('auto')
  })

  it('uses Arabic-optimized font stack', () => {
    const wrapper = mount(ArabicTextarea)
    const textarea = wrapper.find('textarea')
    const fontFamily = textarea.element.style.fontFamily
    expect(fontFamily).toContain('Noto Sans Arabic')
    expect(fontFamily).toContain('Amiri')
    expect(fontFamily).toContain('Scheherazade New')
  })

  it('sets font size to 1.35rem for Arabic readability', () => {
    const wrapper = mount(ArabicTextarea)
    const textarea = wrapper.find('textarea')
    expect(textarea.element.style.fontSize).toBe('1.35rem')
  })

  it('sets line-height to 2.1 for Arabic descenders', () => {
    const wrapper = mount(ArabicTextarea)
    const textarea = wrapper.find('textarea')
    expect(textarea.element.style.lineHeight).toBe('2.1')
  })

  it('aligns text right-to-left by default', () => {
    const wrapper = mount(ArabicTextarea)
    const textarea = wrapper.find('textarea')
    expect(textarea.element.style.textAlign).toBe('right')
  })

  it('displays English placeholder text with example sentence', () => {
    const wrapper = mount(ArabicTextarea)
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('placeholder')).toContain('Type text here... Example:')
  })

  it('auto-resizes vertically with min 6rem and max 20rem', () => {
    const wrapper = mount(ArabicTextarea)
    const textarea = wrapper.find('textarea')
    expect(textarea.element.style.minHeight).toBe('6rem')
    expect(textarea.element.style.maxHeight).toBe('20rem')
  })

  it('has border, rounded corners, and focus ring styling', () => {
    const wrapper = mount(ArabicTextarea)
    const textarea = wrapper.find('textarea')
    // Check border-radius (rounded corners)
    expect(textarea.element.style.borderRadius).toBeTruthy()
    // Check border exists (non-empty)
    expect(textarea.element.style.border).toBeTruthy()
  })

  it('binds v-model via modelValue and emits update:modelValue', async () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'مرحبا بالعالم'
      }
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toBe('مرحبا بالعالم')

    await textarea.setValue('نص جديد')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['نص جديد'])
  })

  it('accepts custom placeholder via prop', async () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        placeholder: 'اكتب شيئا هنا'
      }
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('placeholder')).toBe('اكتب شيئا هنا')
  })

  it('accepts custom modelValue via prop', async () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'نص مخصص'
      }
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toBe('نص مخصص')
  })

  it('hides the character counter ring when textarea is empty', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: ''
      }
    })
    const ring = wrapper.find('.tts-input__ring')
    expect(ring.exists()).toBe(false)
  })

  it('shows the character counter ring when textarea has content', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'مرحبا'
      }
    })
    const ring = wrapper.find('.tts-input__ring')
    expect(ring.exists()).toBe(true)
  })

  it('displays character counter in X/{maxLength} حرف format', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'مرحبا'
      }
    })
    const counter = wrapper.find('.tts-input__meta span')
    expect(counter.text()).toBe('5/2000 characters')
  })

  it('uses maxLength prop default of 2000', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'مرحبا'
      }
    })
    const counter = wrapper.find('.tts-input__meta span')
    expect(counter.text()).toContain('/2000 characters')
  })

  it('uses custom maxLength when provided', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'مرحبا',
        maxLength: 500
      }
    })
    const counter = wrapper.find('.tts-input__meta span')
    expect(counter.text()).toBe('5/500 characters')
  })

  it('turns ring amber when count is at or above 80% but below 100%', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'م'.repeat(401), // 401/500 = 80.2%
        maxLength: 500
      }
    })
    const ringFill = wrapper.find('.tts-input__ring-fill')
    expect(ringFill.classes()).toContain('text-amber-500')
  })

  it('keeps ring blue when count is below 80% of maxLength', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'م'.repeat(399), // 399/500 = 79.8%
        maxLength: 500
      }
    })
    const ringFill = wrapper.find('.tts-input__ring-fill')
    expect(ringFill.classes()).not.toContain('text-amber-500')
    expect(ringFill.classes()).not.toContain('text-red-500')
  })

  it('ring fill is proportional to character count', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'م'.repeat(1000) // 50% of 2000
      }
    })
    const ringFill = wrapper.find('.tts-input__ring-fill')
    // stroke-dashoffset should be 50% of circumference (339.24)
    const offset = parseFloat(ringFill.attributes('stroke-dashoffset'))
    expect(offset).toBeCloseTo(169.62, 1) // ~50% of 339.24
  })

  it('ring fill uses explicit CSS transition (not transition: all)', async () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'مرحبا'
      }
    })
    const ringFill = wrapper.find('.tts-input__ring-fill')
    // Verify no transition-all class is used
    expect(ringFill.classes()).not.toContain('transition-all')
    // Verify the element exists and has stroke-dashoffset for animation
    expect(ringFill.attributes('stroke-dashoffset')).toBeTruthy()
  })

  it('turns ring red when count reaches 100% of maxLength', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'م'.repeat(500), // 500/500 = 100%
        maxLength: 500
      }
    })
    const ringFill = wrapper.find('.tts-input__ring-fill')
    expect(ringFill.classes()).toContain('text-red-500')
  })

  it('counter text turns red when count reaches 100% of maxLength', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'م'.repeat(500), // 500/500 = 100%
        maxLength: 500
      }
    })
    const counter = wrapper.find('.tts-input__meta span')
    expect(counter.classes()).toContain('text-red-500')
  })

  it('counter text is normal color when count is below 80% of maxLength', () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: 'م'.repeat(399), // 399/500 = 79.8%
        maxLength: 500
      }
    })
    const counter = wrapper.find('.tts-input__meta span')
    expect(counter.classes()).not.toContain('text-amber-500')
    expect(counter.classes()).not.toContain('text-red-500')
  })

  it('emits update:modelValue when user types', async () => {
    const wrapper = mount(ArabicTextarea, {
      props: {
        modelValue: ''
      }
    })

    // Simulate user typing via textarea input event (v-model flow)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('مرحبا بالعالم')

    // Component should emit the new value
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['مرحبا بالعالم'])

    // Clear text via setValue
    await textarea.setValue('')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(2)
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([''])
  })
})
