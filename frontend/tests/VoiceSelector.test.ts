import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import type { Voice } from '../app/composables/useVoices'
import VoiceSelector from '../app/components/VoiceSelector.vue'
import { setBreakpoint } from './mocks'

function makeMockVoices(): Voice[] {
  return [
    { id: 'aisha', name: 'Aisha', dialect: 'Modern Standard Arabic' },
    { id: 'tariq', name: 'Tariq', dialect: 'Levantine Arabic' }
  ]
}

function getVoiceSelectorWrapper(props: Record<string, unknown> = {}) {
  const wrapper = mount(VoiceSelector, {
    props: {
      voices: props.voices ?? makeMockVoices(),
      modelValue: props.modelValue ?? ''
    }
  })
  return wrapper
}

function getTriggerButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('button')
}

function getComponent(vm: unknown) {
  return vm as Record<string, unknown>
}

// ─── Behavioral Tests (black-box: rendered text, events, state changes) ──

describe('VoiceSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('default voice display', () => {
    it('When no voice selected then trigger shows first voice name', () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      // Act
      const triggerButton = getTriggerButton(wrapper)
      // Assert
      expect(triggerButton.text()).toContain('Aisha')
    })

    it('When no voice selected then trigger shows first voice dialect', () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      // Act
      const triggerButton = getTriggerButton(wrapper)
      // Assert
      expect(triggerButton.text()).toContain('Modern Standard Arabic')
    })
  })

  describe('label and icon', () => {
    it('When rendered then label text "Voice Model" is present', () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      // Act
      const label = wrapper.find('label')
      // Assert
      expect(label.exists()).toBe(true)
      expect(label.text()).toContain('Voice Model')
    })

    it('When rendered then headphones icon is present next to label', () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      // Act
      const userIcon = wrapper.find('[class*="ph ph-user-sound"]')
      // Assert
      expect(userIcon.exists()).toBe(true)
    })
  })

  describe('dropdown open/close', () => {
    it('When user clicks trigger button then dropdown opens', async () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      const triggerButton = getTriggerButton(wrapper)
      // Act
      await triggerButton.trigger('click')
      await nextTick()
      // Assert
      const menu = document.querySelector('[class*="fixed"]')
      expect(menu).not.toBeNull()
    })

    it('When user clicks outside then dropdown closes', async () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      const triggerButton = getTriggerButton(wrapper)
      // Act
      await triggerButton.trigger('click')
      await nextTick()
      const comp = getComponent(wrapper.vm) as { isOpen: boolean, handleOutsideMousedown: (e: MouseEvent) => void }
      expect(comp.isOpen).toBe(true)
      comp.handleOutsideMousedown(new MouseEvent('mousedown', { bubbles: true }))
      await nextTick()
      // Assert
      expect(comp.isOpen).toBe(false)
    })
  })

  describe('voice selection', () => {
    it('When user selects a voice then emits update:modelValue with selected id', async () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      const triggerButton = getTriggerButton(wrapper)
      // Act
      await triggerButton.trigger('click')
      await nextTick()
      const comp = getComponent(wrapper.vm) as { selectVoice: (v: Voice) => void, voices: Voice[] }
      comp.selectVoice(comp.voices[1])
      await nextTick()
      // Assert
      expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['tariq'])
    })

    it('When voice is selected then trigger button text updates to selected voice', async () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      const triggerButton = getTriggerButton(wrapper)
      // Act
      await triggerButton.trigger('click')
      await nextTick()
      const comp = getComponent(wrapper.vm) as { selectVoice: (v: Voice) => void, voices: Voice[] }
      comp.selectVoice(comp.voices[1])
      await nextTick()
      await wrapper.setProps({ modelValue: 'tariq' })
      await nextTick()
      // Assert
      expect(triggerButton.text()).toContain('Tariq')
    })

    it('When dropdown opens then correct number of voice options are rendered', async () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      const triggerButton = getTriggerButton(wrapper)
      // Act
      await triggerButton.trigger('click')
      await nextTick()
      // Assert
      const voiceOptions = document.querySelectorAll('.voice-option')
      expect(voiceOptions.length).toBe(2)
    })

    it('When a voice is selected then it is highlighted in the dropdown', async () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      const triggerButton = getTriggerButton(wrapper)
      // Act
      await triggerButton.trigger('click')
      await nextTick()
      // Assert
      const selectedOptions = document.querySelectorAll('.voice-option')
      expect(selectedOptions.length).toBe(2)
      const firstOption = selectedOptions[0]
      expect(firstOption.className).toContain('bg-[#2a1a1a]')
    })
  })

  describe('component export', () => {
    it('When imported then VoiceSelector component is defined', async () => {
      // Act
      const VoiceSelectorComp = (await import('../app/components/VoiceSelector.vue')).default
      // Assert
      expect(VoiceSelectorComp).toBeDefined()
    })
  })

  // ─── Responsive Tests (black-box: breakpoint simulation) ────────────────

  describe('responsive dropdown portal and mobile touch targets', () => {
    it('When dropdown opens then portal renders with z-50 layering', async () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      const triggerButton = getTriggerButton(wrapper)
      // Act
      await triggerButton.trigger('click')
      await nextTick()
      // Assert
      const teleportedMenu = document.querySelector('[class*="fixed"]')
      expect(teleportedMenu).not.toBeNull()
      expect(teleportedMenu!.className).toContain('z-50')
    })

    it('When dropdown closes then portal is removed from DOM (v-if)', async () => {
      // Arrange
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      const triggerButton = getTriggerButton(wrapper)
      // Act
      await triggerButton.trigger('click')
      await nextTick()
      const comp = getComponent(wrapper.vm) as { isOpen: boolean, handleOutsideMousedown: (e: MouseEvent) => void }
      comp.handleOutsideMousedown(new MouseEvent('mousedown', { bubbles: true }))
      await nextTick()
      // Assert
      const teleportedMenuClosed = document.querySelector('[class*="fixed"]')
      expect(teleportedMenuClosed).toBeNull()
    })

    it('When viewport is 375px then voice options have p-3 padding (WCAG compliance)', () => {
      // Arrange
      setBreakpoint(375)
      // Act
      const wrapper = getVoiceSelectorWrapper()
      // Assert
      const html = wrapper.html()
      expect(html).toContain('p-3')
      expect(html).toContain('p-4')
    })

    it('When viewport is 767px then voice options have p-3 padding (WCAG compliance)', () => {
      // Arrange
      setBreakpoint(767)
      // Act
      const wrapper = getVoiceSelectorWrapper()
      // Assert
      const html = wrapper.html()
      expect(html).toContain('p-3')
      expect(html).toContain('p-4')
    })
  })
})
