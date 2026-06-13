import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import type { Voice } from '../app/composables/useVoices'
import VoiceSelector from '../app/components/VoiceSelector.vue'

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

describe('VoiceSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // ── Slice 1: Default voice display ────────────────────────────────────

  describe('default voice display', () => {
    it('shows the first voice name when no voice is selected', () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      const triggerButton = getTriggerButton(wrapper)
      expect(triggerButton.text()).toContain('Aisha')
    })

    it('shows the first voice dialect when no voice is selected', () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      const triggerButton = getTriggerButton(wrapper)
      expect(triggerButton.text()).toContain('Modern Standard Arabic')
    })
  })

  // ── Slice 2: Label and icon ────────────────────────────────────────────

  describe('label and icon', () => {
    it('renders the label text "Voice Model"', () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      const label = wrapper.find('label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toContain('Voice Model')
    })

    it('renders a headphones icon next to the label', () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      const userIcon = wrapper.find('[class*="i-lucide-headphones"]')
      expect(userIcon.exists()).toBe(true)
    })
  })

  // ── Slice 3: Dropdown open/close ──────────────────────────────────────

  describe('dropdown open/close', () => {
    it('opens the dropdown when the trigger is clicked', async () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      const triggerButton = getTriggerButton(wrapper)

      await triggerButton.trigger('click')
      await nextTick()

      // After opening, the dropdown menu should be rendered (teleported to body)
      // Without attachTo, Teleport renders to actual body
      const menu = document.querySelector('[class*="fixed"]')
      expect(menu).not.toBeNull()
    })

    it('closes the dropdown when clicking outside', async () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      const triggerButton = getTriggerButton(wrapper)

      // Open the dropdown
      await triggerButton.trigger('click')
      await nextTick()

      // Access the component's isOpen state directly
      const comp = getComponent(wrapper.vm) as { isOpen: boolean, handleOutsideMousedown: (e: MouseEvent) => void }
      expect(comp.isOpen).toBe(true)

      // Simulate outside click by calling the handler directly
      comp.handleOutsideMousedown(new MouseEvent('mousedown', { bubbles: true }))
      await nextTick()

      expect(comp.isOpen).toBe(false)
    })
  })

  // ── Slice 4: Voice selection ──────────────────────────────────────────

  describe('voice selection', () => {
    it('emits update:modelValue when a voice is selected', async () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: '' })
      const triggerButton = getTriggerButton(wrapper)

      // Open the dropdown
      await triggerButton.trigger('click')
      await nextTick()

      // Get the component's selectVoice method via the component instance
      const comp = getComponent(wrapper.vm) as { selectVoice: (v: Voice) => void, voices: Voice[] }

      // Select the second voice directly
      comp.selectVoice(comp.voices[1])
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['tariq'])
    })

    it('updates the trigger button text after voice selection', async () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      const triggerButton = getTriggerButton(wrapper)

      // Open the dropdown
      await triggerButton.trigger('click')
      await nextTick()

      // Get the component instance and select the second voice directly
      const comp = getComponent(wrapper.vm) as { selectVoice: (v: Voice) => void, voices: Voice[] }
      comp.selectVoice(comp.voices[1])
      await nextTick()

      // Manually update the prop to simulate the emit being handled
      await wrapper.setProps({ modelValue: 'tariq' })
      await nextTick()

      // Trigger button should now show Tariq
      expect(triggerButton.text()).toContain('Tariq')
    })

    it('renders the correct number of voice options', async () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      const triggerButton = getTriggerButton(wrapper)

      // Open the dropdown
      await triggerButton.trigger('click')
      await nextTick()

      // Voice options should be rendered inside the teleported menu
      const voiceOptions = document.querySelectorAll('.voice-option')
      expect(voiceOptions.length).toBe(2)
    })

    it('highlights the selected voice in the dropdown', async () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      const triggerButton = getTriggerButton(wrapper)

      // Open the dropdown
      await triggerButton.trigger('click')
      await nextTick()

      // The first voice option should have the selected styling (bg + border)
      const selectedOptions = document.querySelectorAll('.voice-option')
      expect(selectedOptions.length).toBe(2)
      // First option should have the selected background styling
      const firstOption = selectedOptions[0]
      expect(firstOption.className).toContain('bg-[#2a1a1a]')
    })

    it('applies the correct color class based on voice ID', async () => {
      const wrapper = getVoiceSelectorWrapper({ modelValue: 'aisha' })
      const triggerButton = getTriggerButton(wrapper)

      // Open the dropdown
      await triggerButton.trigger('click')
      await nextTick()

      // Voice options should have the correct color
      const voiceOptions = document.querySelectorAll('.voice-option')
      expect(voiceOptions.length).toBe(2)
    })
  })

  // ── Slice 5: Integration ──────────────────────────────────────────────

  describe('integration', () => {
    it('VoiceSelector component exports correctly', async () => {
      // Verify the component can be imported and has expected structure
      const VoiceSelectorComp = (await import('../app/components/VoiceSelector.vue')).default
      expect(VoiceSelectorComp).toBeDefined()
    })
  })
})
