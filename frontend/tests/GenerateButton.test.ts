import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import GenerateButton from '../app/components/GenerateButton.vue'

// ─── Helpers ────────────────────────────────────────────────────────────
// GenerateButton is a pure UI component (no composables).
// Pattern 4: mount() from @vue/test-utils is sufficient.

describe('GenerateButton', () => {
  describe('ready state (model loaded, not generating)', () => {
    it('When model is ready and not generating then renders "Generate Speech" text', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'ready', disabled: false }
      })

      // Assert
      expect(wrapper.text()).toContain('Generate Speech')
      expect(wrapper.classes()).toContain('generate-btn')
    })

    it('When model is ready and not generating then renders play-circle icon', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'ready', disabled: false }
      })

      // Assert
      const playIcon = wrapper.find('.ph-fill.ph-play-circle')
      expect(playIcon.exists()).toBe(true)
    })

    it('When model is ready and not generating then renders trailing arrow-up-right icon', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'ready', disabled: false }
      })

      // Assert
      const trailingIcon = wrapper.find('.ph-arrow-up-right')
      expect(trailingIcon.exists()).toBe(true)
    })

    it('When model is ready and not generating then button is not disabled', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'ready', disabled: false }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('disabled')).toBeUndefined()
      expect(btn.attributes('aria-disabled')).toBe('false')
    })

    it('When model is ready and not generating then emits click event on button click', async () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'ready', disabled: false }
      })

      // Assert
      await wrapper.find('button').trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  describe('loading state (M-03: meaningful loading state)', () => {
    it('When modelStatus is loading then renders "Loading TTS Model..." text', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'loading', disabled: true }
      })

      // Assert
      expect(wrapper.text()).toContain('Loading TTS Model...')
    })

    it('When modelStatus is loading then renders a spinner loader', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'loading', disabled: true }
      })

      // Assert
      const loader = wrapper.find('.loader')
      expect(loader.exists()).toBe(true)
    })

    it('When modelStatus is loading then button is disabled (aria-disabled="true")', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'loading', disabled: true }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('disabled')).toBe('')
      expect(btn.attributes('aria-disabled')).toBe('true')
    })

    it('When modelStatus is loading then sets aria-busy="true" for accessibility', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'loading', disabled: true }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('aria-busy')).toBe('true')
    })

    it('When modelStatus is loading then renders clockwise arrows icon', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'loading', disabled: true }
      })

      // Assert
      const icon = wrapper.find('.ph-arrows-clockwise')
      expect(icon.exists()).toBe(true)
    })

    it('When modelStatus is loading then does NOT render play-circle icon', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'loading', disabled: true }
      })

      // Assert
      const playIcon = wrapper.find('.ph-play-circle')
      expect(playIcon.exists()).toBe(false)
    })
  })

  describe('retrying state', () => {
    it('When modelStatus is retrying then renders "Retrying..." text', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'retrying', disabled: true }
      })

      // Assert
      expect(wrapper.text()).toContain('Retrying...')
    })

    it('When modelStatus is retrying then renders a spinner loader', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'retrying', disabled: true }
      })

      // Assert
      const loader = wrapper.find('.loader')
      expect(loader.exists()).toBe(true)
    })

    it('When modelStatus is retrying then button is disabled', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'retrying', disabled: true }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('disabled')).toBe('')
      expect(btn.attributes('aria-disabled')).toBe('true')
    })

    it('When modelStatus is retrying then sets aria-busy="true"', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'retrying', disabled: true }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('aria-busy')).toBe('true')
    })
  })

  describe('error state', () => {
    it('When modelStatus is error then renders loading state (spinner + text)', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'error', disabled: true }
      })

      // Assert
      expect(wrapper.find('.loader').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading TTS Model...')
    })

    it('When modelStatus is error then button is disabled', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'error', disabled: true }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('disabled')).toBe('')
    })

    it('When modelStatus is error then sets aria-busy="true"', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'error', disabled: true }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('aria-busy')).toBe('true')
    })
  })

  describe('generating state (speech synthesis in progress)', () => {
    it('When isGenerating is true then renders loading state (spinner + text)', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: true, modelStatus: 'ready', disabled: true }
      })

      // Assert
      expect(wrapper.find('.loader').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading TTS Model...')
    })

    it('When isGenerating is true then button is disabled', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: true, modelStatus: 'ready', disabled: true }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('disabled')).toBe('')
    })

    it('When isGenerating is true then sets aria-busy="true"', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: true, modelStatus: 'ready', disabled: true }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('aria-busy')).toBe('true')
    })
  })

  describe('disabled prop (explicit)', () => {
    it('When disabled prop is true then button has disabled attribute regardless of modelStatus', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'ready', disabled: true }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('disabled')).toBe('')
      expect(btn.attributes('aria-disabled')).toBe('true')
    })

    it('When disabled prop is false then button is not disabled even when modelStatus is loading', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'loading', disabled: false }
      })

      // Assert
      const btn = wrapper.find('button')
      expect(btn.attributes('disabled')).toBeUndefined()
      expect(btn.attributes('aria-disabled')).toBe('false')
    })
  })

  describe('layout and styling', () => {
    it('When rendered then has generate-btn class', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'ready', disabled: false }
      })

      // Assert
      expect(wrapper.find('button').classes()).toContain('generate-btn')
    })

    it('When rendered then has btn-content class', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'ready', disabled: false }
      })

      // Assert
      const btnContent = wrapper.find('.btn-content')
      expect(btnContent.exists()).toBe(true)
    })

    it('When in loading state then has loading-state class on btn-content', () => {
      // Act
      const wrapper = mount(GenerateButton, {
        props: { isGenerating: false, modelStatus: 'loading', disabled: true }
      })

      // Assert
      const btnContent = wrapper.find('.btn-content.loading-state')
      expect(btnContent.exists()).toBe(true)
    })
  })
})
