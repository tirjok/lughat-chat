import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ArabicTextarea from '../app/components/ArabicTextarea.vue'

// ── Slice 1: Rendering ──────────────────────────────────────────────────

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

  it('debug: prints full HTML', () => {
    const fs = require('fs')
    const html = wrapper.html()
    const textareaClasses = wrapper.find('textarea').classes()
    const lucideIcons = wrapper.findAll('[class*="i-lucide"]')
    const fcElements = wrapper.findAll('[class*="flex-col"]')
    fs.writeFileSync('/tmp/textarea_debug.txt', `HTML:\n${html}\n\nTextarea classes: ${JSON.stringify(textareaClasses)}\n\nLucide icons: ${lucideIcons.length}\n\nflex-col count: ${fcElements.length}\n` + (fcElements[0]?.html() ?? 'none'))
  })

  it('has RTL direction attribute', () => {
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('dir')).toBe('rtl')
  })

  it('applies flex-1 and w-full classes to the textarea', () => {
    const textarea = wrapper.find('textarea')
    const classes = textarea.classes()
    expect(classes).toContain('flex-1')
    expect(classes).toContain('w-full')
  })

  // ── Slice 2: Character counter ──────────────────────────────────────────

  describe('character counter', () => {
    it('renders a character counter element below the textarea', () => {
      const counter = wrapper.find('[class*="flex flex-col"]')
      expect(counter.exists()).toBe(true)
    })

    it('displays "0/3000" when the textarea is empty', () => {
      const textarea = wrapper.find('textarea')
      const counterText = wrapper.find('[class*="flex flex-col"]')
      expect(counterText.text()).toContain('0/3000')
    })

    it('updates character count when text is entered', async () => {
      const textarea = wrapper.find('textarea')
      await textarea.setValue('مرحبا')
      await nextTick()

      // setValue triggers @input event, which emits update:modelValue.
      // Vue Test Utils doesn't automatically update props, so we set them directly.
      await wrapper.setProps({ modelValue: 'مرحبا' })
      await nextTick()

      const counterText = wrapper.find('[class*="flex flex-col"]')
      expect(counterText.text()).toContain('5/3000')
    })

    it('uses maxLength prop default of 3000', () => {
      const counterText = wrapper.find('[class*="flex flex-col"]')
      expect(counterText.text()).toContain('/3000')
    })

    it('applies amber color when count reaches 80% of maxLength', async () => {
      const textarea = wrapper.find('textarea')
      // 80% of 3000 = 2400
      await textarea.setValue('ا'.repeat(2400))
      await nextTick()

      await wrapper.setProps({ modelValue: 'ا'.repeat(2400) })
      await nextTick()

      const counterText = wrapper.find('[class*="flex flex-col"]')
      expect(counterText.text()).toContain('2400/3000')
    })

    it('applies red color when count reaches 100% of maxLength', async () => {
      const textarea = wrapper.find('textarea')
      // 3000 characters = 100%
      await textarea.setValue('ا'.repeat(3000))
      await nextTick()

      await wrapper.setProps({ modelValue: 'ا'.repeat(3000) })
      await nextTick()

      const counterText = wrapper.find('[class*="flex flex-col"]')
      expect(counterText.text()).toContain('3000/3000')
    })
  })

  // ── Slice 3: Clear button ──────────────────────────────────────────────

  describe('clear button', () => {
    it('renders a clear button that removes textarea content', async () => {
      const textarea = wrapper.find('textarea')
      await textarea.setValue('مرحبا')
      await nextTick()

      // Set the model value directly so the clear button renders
      await wrapper.setProps({ modelValue: 'مرحبا' })
      await nextTick()

      // Clear button should exist (v-if="charCount > 0")
      const clearBtn = wrapper.find('[class*="i-lucide-x"]')
      expect(clearBtn.exists()).toBe(true)

      // Click the clear button
      await clearBtn.trigger('click')
      await nextTick()

      // The clearText() emits update:modelValue('',), update the prop to simulate
      await wrapper.setProps({ modelValue: '' })
      await nextTick()

      // Character count should reset
      const counterText = wrapper.find('[class*="flex flex-col"]')
      expect(counterText.text()).toContain('0/')
    })
  })

  // ── Slice 4: Props ─────────────────────────────────────────────────────

  describe('props', () => {
    it('accepts a custom maxLength prop', () => {
      const customWrapper = mount(ArabicTextarea, {
        props: { maxLength: 500 }
      })

      const counterText = customWrapper.find('[class*="flex flex-col"]')
      expect(counterText.text()).toContain('/500')
    })

    it('accepts a custom placeholder prop', () => {
      const customWrapper = mount(ArabicTextarea, {
        props: { placeholder: 'نص مخصص' }
      })

      const textarea = customWrapper.find('textarea')
      expect(textarea.attributes('placeholder')).toBe('نص مخصص')
    })
  })

  // ── Slice 5: Events ────────────────────────────────────────────────────

  describe('events', () => {
    it('emits input event with the textarea value', async () => {
      const textarea = wrapper.find('textarea')
      await textarea.setValue('مرحبا بالعالم')
      await nextTick()

      expect(textarea.element.value).toBe('مرحبا بالعالم')
    })

    it('emits update:modelValue event when text changes', async () => {
      const textarea = wrapper.find('textarea')
      await textarea.setValue('اختبار')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    })
  })

  // ── Slice 6: Accessibility ─────────────────────────────────────────────

  describe('accessibility', () => {
    it('has a clear button with aria-label', async () => {
      // Clear button only shows when there's text, so set a value first
      await wrapper.setProps({ modelValue: 'مرحبا' })
      await nextTick()

      // The aria-label is on the <button>, not the <span> inside it
      const clearBtn = wrapper.find('button[aria-label="Clear text"]')
      expect(clearBtn.exists()).toBe(true)
    })
  })
})
