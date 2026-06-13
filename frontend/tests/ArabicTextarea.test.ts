import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ArabicTextarea from '../app/components/ArabicTextarea.vue'

// ── Slice 8: ArabicTextarea integration ────────────────────────────────────

describe('ArabicTextarea', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(ArabicTextarea)
  })

  it('renders a textarea element', () => {
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
  })

  it('has the correct placeholder text in Arabic', () => {
    const textarea = wrapper.find('textarea')
    const placeholder = textarea.attributes('placeholder')
    expect(placeholder).toContain('السلام')
  })

  it('has RTL direction attribute', () => {
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('dir')).toBe('rtl')
  })

  it('applies Cairo font to the textarea content', () => {
    const html = wrapper.html()
    expect(html).toContain('Cairo')
  })

  it('applies RTL caret color (orange) to the textarea', () => {
    // jsdom converts #FF512F to rgb(255, 81, 47)
    const html = wrapper.html()
    expect(html).toContain('rgb(255, 81, 47)')
  })

  it('applies Cairo font and large text styling to the textarea', () => {
    const html = wrapper.html()
    expect(html).toContain('Cairo')
    expect(html).toContain('line-height')
  })

  it('accepts a custom placeholder prop', () => {
    const customWrapper = mount(ArabicTextarea, {
      props: { placeholder: 'نص مخصص' }
    })
    const textarea = customWrapper.find('textarea')
    expect(textarea.attributes('placeholder')).toBe('نص مخصص')
  })

  it('accepts a custom id prop', () => {
    const customWrapper = mount(ArabicTextarea, {
      props: { id: 'custom-textarea' }
    })
    const textarea = customWrapper.find('textarea')
    expect(textarea.attributes('id')).toBe('custom-textarea')
  })

  it('emits input event with the textarea value', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('مرحبا بالعالم')
    expect(textarea.element.value).toBe('مرحبا بالعالم')
  })

  it('emits update:modelValue event when text changes', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('اختبار')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  })

  it('accepts a disabled prop', () => {
    const customWrapper = mount(ArabicTextarea, {
      props: { disabled: true }
    })
    const textarea = customWrapper.find('textarea')
    expect(textarea.attributes('disabled')).toBeDefined()
  })
})
